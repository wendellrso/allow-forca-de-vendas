import Link from 'next/link'
import { notFound } from 'next/navigation'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { formatarCentavos } from '@/dominio/dinheiro'
import { dataCurta, dataCurtaDeIso, hojeIso } from '@/dominio/tempo'
import {
  ROTULO_TIPO_DE_COBRANCA,
  type ContaAReceber,
  type EmissaoDeBoleto,
  type Recibo,
  type StatusBoleto,
} from '@/lib/tipos'
import { configuracaoAsaas } from '@/lib/env'
import { BarraDeProgresso, classeCartao, Distintivo } from '@/componentes/ui'
import { BlocoDaCobranca } from '@/componentes/cobranca'
import { BotaoEstornar, BotaoGerarBoleto, FormularioReceber } from './acoes-da-conta'

export const dynamic = 'force-dynamic'

type ContaCompleta = ContaAReceber & {
  sales: {
    id: string
    sale_number: number
    customer_name: string
    customer_phone: string | null
    customer_id: string | null
  } | null
  boleto_emissions: EmissaoDeBoleto | null
}

const ROTULO_STATUS_DA_COBRANCA: Record<StatusBoleto, string> = {
  simulado: 'Preparada em simulação',
  solicitado: 'Solicitada ao provedor',
  emitido: 'Emitida',
  erro: 'Falha na emissão',
  cancelado: 'Cancelada',
}

export default async function PaginaConta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await criarClienteServidor()

  const [{ data: linhaConta }, { data: linhasRecibos }] = await Promise.all([
    supabase
      .from('receivables')
      .select(
        '*, sales(id, sale_number, customer_name, customer_phone, customer_id), boleto_emissions(*)',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('receipts')
      .select('id, receivable_id, amount_cents, note, created_at')
      .eq('receivable_id', id)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const conta = linhaConta as unknown as ContaCompleta | null
  if (conta === null) {
    notFound()
  }
  const recibos = (linhasRecibos ?? []) as Recibo[]
  const asaasConfigurado = configuracaoAsaas() !== null
  const hoje = hojeIso()
  const saldo = conta.amount_cents - conta.received_cents
  const vencida = conta.status !== 'recebido' && conta.due_date !== null && conta.due_date < hoje
  const emAberto = conta.status === 'aberto' || conta.status === 'parcial'

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/painel/financeiro" className="hover:text-marca-700 text-sm text-zinc-500">
        ← Financeiro
      </Link>

      <div className="mt-2 mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-marca text-2xl font-bold text-zinc-900">
            {conta.installment_count > 1
              ? `Parcela ${conta.installment_number}/${conta.installment_count}`
              : 'Conta a receber'}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {conta.sales !== null ? (
              <>
                {conta.sales.customer_name} ·{' '}
                <Link
                  href={`/painel/vendas/${conta.sales.id}`}
                  className="text-marca-700 font-semibold hover:underline"
                >
                  Venda #{conta.sales.sale_number}
                </Link>
              </>
            ) : (
              conta.description
            )}
          </p>
        </div>
        {conta.status === 'recebido' ? (
          <Distintivo tom="sucesso">Recebida</Distintivo>
        ) : conta.status === 'cancelado' ? (
          <Distintivo tom="neutro">Cancelada</Distintivo>
        ) : vencida ? (
          <Distintivo tom="perigo">Vencida</Distintivo>
        ) : conta.status === 'parcial' ? (
          <Distintivo tom="atencao">Parcial</Distintivo>
        ) : (
          <Distintivo tom="neutro">Aberta</Distintivo>
        )}
      </div>

      <div className={`${classeCartao} mb-4`}>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-zinc-900">
              {formatarCentavos(conta.amount_cents)}
            </p>
            <p className="text-xs text-zinc-500">Valor</p>
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-700">
              {formatarCentavos(conta.received_cents)}
            </p>
            <p className="text-xs text-zinc-500">Recebido</p>
          </div>
          <div>
            <p className={`text-lg font-bold ${saldo > 0 ? 'text-zinc-900' : 'text-emerald-700'}`}>
              {formatarCentavos(saldo)}
            </p>
            <p className="text-xs text-zinc-500">Saldo</p>
          </div>
        </div>
        <div className="mt-3">
          <BarraDeProgresso
            valor={conta.received_cents}
            maximo={conta.amount_cents}
            tom={conta.status === 'recebido' ? 'verde' : 'vinho'}
          />
        </div>
        {conta.due_date !== null ? (
          <p
            className={`mt-2 text-center text-sm ${vencida ? 'font-semibold text-red-700' : 'text-zinc-500'}`}
          >
            {vencida ? 'Venceu em' : 'Vence em'} {dataCurtaDeIso(conta.due_date)}
          </p>
        ) : null}
      </div>

      {conta.boleto_emissions !== null ? (
        <div className={`${classeCartao} mb-4`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-zinc-900">
              🧾 {ROTULO_TIPO_DE_COBRANCA[conta.boleto_emissions.billing_type]}
            </h2>
            <Distintivo
              tom={
                conta.boleto_emissions.status === 'emitido'
                  ? 'sucesso'
                  : conta.boleto_emissions.status === 'erro'
                    ? 'perigo'
                    : 'info'
              }
            >
              {ROTULO_STATUS_DA_COBRANCA[conta.boleto_emissions.status]}
            </Distintivo>
          </div>
          {conta.boleto_emissions.status === 'emitido' ? (
            <BlocoDaCobranca
              payload={conta.boleto_emissions.payload}
              telefoneDoCliente={conta.sales?.customer_phone ?? null}
            />
          ) : null}

          {conta.boleto_emissions.status === 'erro' ? (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {conta.boleto_emissions.payload.motivo ?? 'A emissão falhou.'}
            </p>
          ) : null}

          {conta.boleto_emissions.status === 'solicitado' ? (
            <p className="mt-2 text-sm text-zinc-600">
              A emissão foi enviada ao provedor e ainda não concluiu. Se demorar, tente de novo.
            </p>
          ) : null}

          {conta.boleto_emissions.status === 'simulado' && !asaasConfigurado ? (
            <p className="mt-2 text-sm text-zinc-600">
              Esta cobrança foi <span className="font-semibold">preparada em modo simulação</span> —
              nada foi emitido de verdade. Configure a chave do provedor para a emissão real.
            </p>
          ) : null}

          {conta.boleto_emissions.status !== 'emitido' &&
          conta.boleto_emissions.status !== 'cancelado' &&
          asaasConfigurado &&
          emAberto ? (
            <BotaoGerarBoleto emissaoId={conta.boleto_emissions.id} contaId={conta.id} />
          ) : null}
        </div>
      ) : null}

      {emAberto ? (
        <div className={`${classeCartao} mb-4`}>
          <h2 className="mb-3 font-bold text-zinc-900">Registrar recebimento</h2>
          <FormularioReceber contaId={conta.id} saldoFormatado={formatarCentavos(saldo)} />
        </div>
      ) : null}

      <div className={classeCartao}>
        <h2 className="mb-2 font-bold text-zinc-900">Histórico de recebimentos</h2>
        {recibos.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum recebimento registrado ainda.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {recibos.map((recibo) => (
              <li key={recibo.id} className="flex items-center gap-3 py-2">
                <span
                  aria-hidden
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${
                    recibo.amount_cents > 0
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {recibo.amount_cents > 0 ? '↓' : '↩'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-800">
                    {recibo.amount_cents > 0 ? 'Recebimento' : 'Estorno'}
                    {recibo.note !== null ? ` — ${recibo.note}` : ''}
                  </p>
                  <p className="text-xs text-zinc-400">{dataCurta(recibo.created_at)}</p>
                </div>
                <span
                  className={`shrink-0 text-sm font-bold ${
                    recibo.amount_cents > 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {formatarCentavos(recibo.amount_cents)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {conta.received_cents > 0 && conta.status !== 'cancelado' ? (
          <div className="mt-3 border-t border-zinc-100 pt-3">
            <BotaoEstornar contaId={conta.id} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
