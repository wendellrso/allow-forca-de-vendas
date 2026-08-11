import { centavosParaValorDoProvedor, descricaoDoBoleto, podeEmitirBoleto } from '@/dominio/boleto'
import { configuracaoAsaas, type ConfiguracaoAsaas } from '@/lib/env'
import type { criarClienteServidor } from '@/lib/supabase/servidor'

type ClienteSupabase = Awaited<ReturnType<typeof criarClienteServidor>>

/**
 * Provedor de boleto: Asaas (RD-074). Este módulo é o único que conversa com
 * o provedor. Sem a chave configurada, as emissões permanecem em simulação —
 * o restante do sistema não percebe diferença.
 */

interface RespostaDeErroAsaas {
  errors?: { description?: string }[]
}

async function chamarAsaas<T>(
  config: ConfiguracaoAsaas,
  caminho: string,
  inicializacao?: RequestInit,
): Promise<T> {
  const resposta = await fetch(`${config.baseUrl}${caminho}`, {
    ...inicializacao,
    headers: {
      'Content-Type': 'application/json',
      access_token: config.chaveApi,
      ...inicializacao?.headers,
    },
  })

  const corpo = (await resposta.json().catch(() => ({}))) as T & RespostaDeErroAsaas
  if (!resposta.ok) {
    const detalhe = corpo.errors?.[0]?.description
    throw new Error(detalhe ?? `O provedor respondeu ${resposta.status}.`)
  }
  return corpo
}

/** Encontra (pelo CPF/CNPJ) ou cria o pagador no Asaas. */
async function garantirPagador(
  config: ConfiguracaoAsaas,
  pagador: { nome: string; cpfCnpj: string; telefone: string | null },
): Promise<string> {
  const existentes = await chamarAsaas<{ data: { id: string }[] }>(
    config,
    `/customers?cpfCnpj=${encodeURIComponent(pagador.cpfCnpj)}&limit=1`,
  )
  const existente = existentes.data[0]
  if (existente !== undefined) {
    return existente.id
  }

  const criado = await chamarAsaas<{ id: string }>(config, '/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: pagador.nome,
      cpfCnpj: pagador.cpfCnpj,
      ...(pagador.telefone !== null ? { mobilePhone: pagador.telefone } : {}),
    }),
  })
  return criado.id
}

export interface PayloadDoBoletoEmitido {
  url_fatura: string
  url_pdf: string | null
  linha_digitavel: string | null
  pix_copia_e_cola: string | null
  pix_qr_base64: string | null
}

async function emitirCobranca(
  config: ConfiguracaoAsaas,
  cobranca: {
    pagadorAsaasId: string
    billingType: string
    valorCentavos: number
    vencimento: string
    descricao: string
    referencia: string
  },
): Promise<{ idCobranca: string; payload: PayloadDoBoletoEmitido }> {
  const criada = await chamarAsaas<{
    id: string
    invoiceUrl: string
    bankSlipUrl: string | null
  }>(config, '/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: cobranca.pagadorAsaasId,
      billingType: cobranca.billingType,
      value: centavosParaValorDoProvedor(cobranca.valorCentavos),
      dueDate: cobranca.vencimento,
      description: cobranca.descricao,
      externalReference: cobranca.referencia,
    }),
  })

  // Linha digitável só existe no boleto; o Pix copia-e-cola existe no
  // boleto híbrido e na cobrança Pix. O link de cartão vive na fatura.
  let linhaDigitavel: string | null = null
  if (cobranca.billingType === 'BOLETO') {
    try {
      const linha = await chamarAsaas<{ identificationField: string }>(
        config,
        `/payments/${criada.id}/identificationField`,
      )
      linhaDigitavel = linha.identificationField
    } catch {
      // Sem linha digitável ainda; o link da fatura cobre o cliente.
    }
  }

  // O Pix vem com o copia-e-cola e o QR code já desenhado (PNG em base64):
  // é o que o cliente escaneia na hora, sem sair do aplicativo.
  let pix: string | null = null
  let qrCode: string | null = null
  if (cobranca.billingType !== 'CREDIT_CARD') {
    try {
      const codigo = await chamarAsaas<{ payload: string; encodedImage?: string }>(
        config,
        `/payments/${criada.id}/pixQrCode`,
      )
      pix = codigo.payload
      qrCode = codigo.encodedImage ?? null
    } catch {
      // Cobrança sem Pix acoplado; segue válida.
    }
  }

  return {
    idCobranca: criada.id,
    payload: {
      url_fatura: criada.invoiceUrl,
      url_pdf: criada.bankSlipUrl,
      linha_digitavel: linhaDigitavel,
      pix_copia_e_cola: pix,
      pix_qr_base64: qrCode,
    },
  }
}

interface EmissaoPendente {
  id: string
  status: string
  billing_type: string
  receivables: {
    id: string
    sale_id: string | null
    amount_cents: number
    due_date: string | null
    description: string
    status: string
    sales: {
      sale_number: number
      customer_id: string | null
      customer_name: string
      customer_phone: string | null
    } | null
  }
}

export interface ResultadoDasEmissoes {
  emitidos: number
  falhas: number
}

/**
 * Assume as solicitações pendentes (simuladas ou com erro) e tenta emitir no
 * provedor. Falha de emissão nunca derruba a venda: fica registrada na
 * própria solicitação, com direito a nova tentativa.
 */
export async function emitirBoletosPendentes(
  supabase: ClienteSupabase,
  filtro: { vendaId?: string; emissaoId?: string },
): Promise<ResultadoDasEmissoes> {
  const config = configuracaoAsaas()
  if (config === null) {
    return { emitidos: 0, falhas: 0 }
  }

  let consulta = supabase
    .from('boleto_emissions')
    .select(
      'id, status, billing_type, receivables!inner(id, sale_id, amount_cents, due_date, description, status, sales(sale_number, customer_id, customer_name, customer_phone))',
    )
    .in('status', ['simulado', 'erro'])
    .limit(30)
  if (filtro.emissaoId !== undefined) {
    consulta = consulta.eq('id', filtro.emissaoId)
  }
  if (filtro.vendaId !== undefined) {
    consulta = consulta.eq('receivables.sale_id', filtro.vendaId)
  }

  const { data } = await consulta
  const pendentes = ((data ?? []) as unknown as EmissaoPendente[]).filter(
    (emissao) => emissao.receivables.status !== 'cancelado',
  )
  if (pendentes.length === 0) {
    return { emitidos: 0, falhas: 0 }
  }

  // CPF/CNPJ dos pagadores, numa consulta só.
  const idsDeClientes = [
    ...new Set(
      pendentes
        .map((emissao) => emissao.receivables.sales?.customer_id ?? null)
        .filter((id): id is string => id !== null),
    ),
  ]
  const { data: linhasClientes } =
    idsDeClientes.length === 0
      ? { data: [] }
      : await supabase.from('customers').select('id, cpf_cnpj').in('id', idsDeClientes)
  const documentoPorCliente = new Map(
    ((linhasClientes ?? []) as { id: string; cpf_cnpj: string | null }[]).map((linha) => [
      linha.id,
      linha.cpf_cnpj,
    ]),
  )

  let emitidos = 0
  let falhas = 0

  for (const emissao of pendentes) {
    const conta = emissao.receivables
    const venda = conta.sales
    const documento =
      venda?.customer_id !== null && venda?.customer_id !== undefined
        ? (documentoPorCliente.get(venda.customer_id) ?? null)
        : null

    if (venda === null || conta.due_date === null) {
      falhas += 1
      await supabase
        .from('boleto_emissions')
        .update({
          status: 'erro',
          provider: 'asaas',
          payload: { motivo: 'Solicitação sem venda ou sem vencimento.' },
        })
        .eq('id', emissao.id)
      continue
    }

    if (!podeEmitirBoleto(documento)) {
      falhas += 1
      await supabase
        .from('boleto_emissions')
        .update({
          status: 'erro',
          provider: 'asaas',
          payload: {
            motivo:
              'A cobrança exige o CPF ou CNPJ do cliente. Preencha na ficha do cliente e tente de novo.',
          },
        })
        .eq('id', emissao.id)
      continue
    }

    await supabase
      .from('boleto_emissions')
      .update({ status: 'solicitado', provider: 'asaas' })
      .eq('id', emissao.id)

    try {
      const pagadorAsaasId = await garantirPagador(config, {
        nome: venda.customer_name,
        cpfCnpj: documento as string,
        telefone: venda.customer_phone,
      })
      const resultado = await emitirCobranca(config, {
        pagadorAsaasId,
        billingType: emissao.billing_type,
        valorCentavos: conta.amount_cents,
        vencimento: conta.due_date,
        descricao: descricaoDoBoleto(conta.description, venda.sale_number),
        referencia: conta.id,
      })

      await supabase
        .from('boleto_emissions')
        .update({
          status: 'emitido',
          provider: 'asaas',
          provider_ref: resultado.idCobranca,
          payload: resultado.payload,
        })
        .eq('id', emissao.id)
      emitidos += 1
    } catch (erro) {
      falhas += 1
      await supabase
        .from('boleto_emissions')
        .update({
          status: 'erro',
          provider: 'asaas',
          payload: {
            motivo: erro instanceof Error ? erro.message.slice(0, 300) : 'Falha na emissão.',
          },
        })
        .eq('id', emissao.id)
    }
  }

  return { emitidos, falhas }
}
