import Link from 'next/link'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { formatarCentavos } from '@/dominio/dinheiro'
import { ROTULO_CATEGORIA } from '@/dominio/relatorio'
import { type ContaAReceber, type Despesa } from '@/lib/tipos'
import { classeCartao, Distintivo, EstadoVazio, TituloPagina } from '@/componentes/ui'
import { FormularioDespesa, FormularioRecebimento, BotoesDespesa } from './formularios'

export const dynamic = 'force-dynamic'

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default async function PaginaFinanceiro({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>
}) {
  const { aba } = await searchParams
  const abaAtiva = aba === 'pagar' ? 'pagar' : 'receber'
  const supabase = await criarClienteServidor()

  const [{ data: linhasContas }, { data: linhasDespesas }] = await Promise.all([
    supabase
      .from('receivables')
      .select('*')
      .order('status', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(300),
    supabase.from('expenses').select('*').order('expense_date', { ascending: false }).limit(300),
  ])

  const contas = (linhasContas ?? []) as ContaAReceber[]
  const despesas = (linhasDespesas ?? []) as Despesa[]
  const hoje = hojeIso()

  const abertas = contas.filter((conta) => conta.status === 'aberto' || conta.status === 'parcial')
  const encerradas = contas.filter((conta) => conta.status === 'recebido')
  const totalAberto = abertas.reduce(
    (soma, conta) => soma + conta.amount_cents - conta.received_cents,
    0,
  )
  const totalAPagar = despesas
    .filter((despesa) => despesa.status === 'a_pagar')
    .reduce((soma, despesa) => soma + despesa.amount_cents, 0)

  return (
    <div>
      <TituloPagina titulo="Financeiro" />
      <nav aria-label="Abas do financeiro" className="mb-4 flex gap-1">
        <Link
          href="/painel/financeiro"
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${abaAtiva === 'receber' ? 'bg-marca-700 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
        >
          A receber ({formatarCentavos(totalAberto)})
        </Link>
        <Link
          href="/painel/financeiro?aba=pagar"
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${abaAtiva === 'pagar' ? 'bg-marca-700 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
        >
          Despesas ({formatarCentavos(totalAPagar)} a pagar)
        </Link>
      </nav>

      {abaAtiva === 'receber' ? (
        <section aria-label="Contas a receber" className="space-y-2">
          {abertas.length === 0 ? (
            <EstadoVazio
              titulo="Nada a receber"
              descricao="As vendas a prazo criam contas aqui automaticamente."
            />
          ) : (
            abertas.map((conta) => {
              const vencida = conta.due_date !== null && conta.due_date < hoje
              return (
                <div key={conta.id} className={classeCartao}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-zinc-900">{conta.description}</p>
                    <Distintivo
                      tom={vencida ? 'perigo' : conta.status === 'parcial' ? 'atencao' : 'info'}
                    >
                      {vencida ? 'Vencida' : conta.status === 'parcial' ? 'Parcial' : 'Em aberto'}
                    </Distintivo>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    Falta {formatarCentavos(conta.amount_cents - conta.received_cents)} de{' '}
                    {formatarCentavos(conta.amount_cents)}
                    {conta.due_date !== null
                      ? ` · vence ${new Date(`${conta.due_date}T12:00:00`).toLocaleDateString('pt-BR')}`
                      : ''}
                  </p>
                  <FormularioRecebimento contaId={conta.id} />
                </div>
              )
            })
          )}
          {encerradas.length > 0 ? (
            <details className="pt-2">
              <summary className="cursor-pointer text-sm font-medium text-zinc-500">
                Recebidas ({encerradas.length})
              </summary>
              <ul className="mt-2 space-y-1.5">
                {encerradas.map((conta) => (
                  <li key={conta.id} className={`${classeCartao} py-2.5 text-sm text-zinc-500`}>
                    {conta.description} — {formatarCentavos(conta.amount_cents)}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ) : (
        <section aria-label="Despesas" className="space-y-4">
          <FormularioDespesa />
          {despesas.length === 0 ? (
            <EstadoVazio
              titulo="Nenhuma despesa registrada"
              descricao="Hospedagem, alimentação e combustível da viagem entram aqui."
            />
          ) : (
            <ul className="space-y-2">
              {despesas.map((despesa) => (
                <li key={despesa.id} className={classeCartao}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-zinc-900">
                      {ROTULO_CATEGORIA[despesa.category]}
                      {despesa.description !== null ? ` — ${despesa.description}` : ''}
                    </p>
                    <p className="font-semibold">{formatarCentavos(despesa.amount_cents)}</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-sm text-zinc-500">
                      {new Date(`${despesa.expense_date}T12:00:00`).toLocaleDateString('pt-BR')}
                      {despesa.city !== null
                        ? ` · ${despesa.city}${despesa.state !== null ? `/${despesa.state}` : ''}`
                        : ''}
                    </p>
                    <div className="flex items-center gap-2">
                      {despesa.status === 'a_pagar' ? (
                        <Distintivo tom="atencao">A pagar</Distintivo>
                      ) : null}
                      <BotoesDespesa despesaId={despesa.id} aPagar={despesa.status === 'a_pagar'} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
