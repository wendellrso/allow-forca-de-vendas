import { valorDoProvedorParaCentavos } from '@/dominio/boleto'
import { tokenDoWebhookAsaas } from '@/lib/env'
import { criarClienteAdministrativo } from '@/lib/supabase/admin'

/**
 * Baixa automática: o Asaas avisa que a cobrança foi paga e a conta a
 * receber é quitada aqui, sem a vendedora digitar nada. O webhook é
 * autenticado por um token combinado entre o Asaas e o aplicativo.
 */

const EVENTOS_DE_PAGAMENTO = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED']

interface EventoAsaas {
  event?: string
  payment?: {
    id?: string
    value?: number
    /** Valor que o provedor credita de fato: bruto menos a tarifa dele. */
    netValue?: number
    externalReference?: string
  }
}

export async function processarWebhookAsaas(requisicao: Request): Promise<Response> {
  const tokenEsperado = tokenDoWebhookAsaas()
  if (tokenEsperado === null) {
    return Response.json({ erro: 'Webhook não configurado.' }, { status: 503 })
  }
  const tokenRecebido = requisicao.headers.get('asaas-access-token')
  if (tokenRecebido !== tokenEsperado) {
    return Response.json({ erro: 'Não autorizado.' }, { status: 401 })
  }

  const evento = (await requisicao.json().catch(() => ({}))) as EventoAsaas
  if (
    evento.event === undefined ||
    !EVENTOS_DE_PAGAMENTO.includes(evento.event) ||
    evento.payment?.id === undefined
  ) {
    // Evento que não interessa: confirma o recebimento para o Asaas não reenviar.
    return Response.json({ ignorado: true })
  }

  const supabase = criarClienteAdministrativo()

  // A cobrança aponta a conta duas vezes: pela referência externa (id da
  // conta) e pela emissão registrada. As duas precisam concordar.
  const { data: linhaEmissao } = await supabase
    .from('boleto_emissions')
    .select('receivable_id')
    .eq('provider_ref', evento.payment.id)
    .maybeSingle()
  const emissao = linhaEmissao as { receivable_id: string } | null

  const contaId = emissao?.receivable_id ?? null
  if (contaId === null || (evento.payment.externalReference ?? contaId) !== contaId) {
    return Response.json({ ignorado: true })
  }

  const { data: linhaConta } = await supabase
    .from('receivables')
    .select('id, amount_cents, received_cents, status')
    .eq('id', contaId)
    .maybeSingle()
  const conta = linhaConta as {
    id: string
    amount_cents: number
    received_cents: number
    status: string
  } | null

  if (conta === null || (conta.status !== 'aberto' && conta.status !== 'parcial')) {
    // Já recebida ou cancelada: reentrega do evento não duplica baixa.
    return Response.json({ ignorado: true })
  }

  const saldo = conta.amount_cents - conta.received_cents
  const valorPago =
    evento.payment.value !== undefined ? valorDoProvedorParaCentavos(evento.payment.value) : saldo
  const valor = Math.min(Math.max(valorPago, 0), saldo)
  if (valor === 0) {
    return Response.json({ ignorado: true })
  }

  const { error } = await supabase.rpc('registrar_recebimento', {
    p_conta: conta.id,
    p_valor_centavos: valor,
  })
  if (error !== null) {
    // O Asaas reenvia depois; melhor do que perder a baixa.
    return Response.json({ erro: 'Falha ao registrar.' }, { status: 500 })
  }

  await registrarTarifa(supabase, conta.id, evento.payment.value, evento.payment.netValue)

  return Response.json({ recebido: true })
}

/**
 * A tarifa retida pelo provedor é custo da venda e vira despesa, para a
 * margem na DRE ser a real. Falhar aqui não desfaz a baixa — o dinheiro
 * entrou de qualquer jeito, e a despesa pode ser lançada à mão depois.
 */
async function registrarTarifa(
  supabase: ReturnType<typeof criarClienteAdministrativo>,
  contaId: string,
  valorBruto: number | undefined,
  valorLiquido: number | undefined,
): Promise<void> {
  if (valorBruto === undefined || valorLiquido === undefined) {
    return
  }
  const tarifa = valorDoProvedorParaCentavos(valorBruto) - valorDoProvedorParaCentavos(valorLiquido)
  if (tarifa <= 0) {
    return
  }
  try {
    await supabase.rpc('registrar_tarifa_de_cobranca', {
      p_conta: contaId,
      p_tarifa_centavos: tarifa,
    })
  } catch {
    // Despesa da tarifa não registrada; a baixa do recebimento está feita.
  }
}
