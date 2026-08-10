import Link from 'next/link'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { formatarCentavos } from '@/dominio/dinheiro'
import { calcularDre } from '@/dominio/dre'
import { lerOrdenacao, ordenarLinhas } from '@/dominio/ordenacao'
import {
  CHAVES_DE_PERIODO,
  ehChaveDePeriodo,
  resolverPeriodo,
  ROTULO_PERIODO,
  type ChaveDePeriodo,
} from '@/dominio/periodo'
import { dataCurtaDeIso, hojeIso } from '@/dominio/tempo'
import { type CategoriaDeDespesa, type ContaAReceber, type Despesa } from '@/lib/tipos'
import {
  BarraDeProgresso,
  classeCartao,
  classeEntrada,
  Distintivo,
  EstadoVazio,
  TituloPagina,
} from '@/componentes/ui'
import { ChipDeCategoria } from '@/componentes/avatar'
import { CartaoClicavel, LinhaClicavel } from '@/componentes/linha-clicavel'
import {
  Tabela,
  CabecalhoDaTabela,
  CabecalhoOrdenavel,
  CabecalhoFixo,
  Celula,
  LinhaDaTabela,
} from '@/componentes/tabela'
import { BotaoCategorias, BotaoNovaDespesa, BotoesDespesa } from './formularios'

export const dynamic = 'force-dynamic'

type DespesaComCategoria = Despesa & { categoria: string }
type ContaComVenda = ContaAReceber & {
  sales: { sale_number: number; customer_name: string } | null
}

const CAMPOS_DESPESA = [
  'expense_date',
  'categoria',
  'description',
  'due_date',
  'status',
  'amount_cents',
] as const

interface ParametrosDaPagina {
  aba?: string
  periodo?: string
  de?: string
  ate?: string
  ver?: string
  ordenar?: string
  dir?: string
}

export default async function PaginaFinanceiro({
  searchParams,
}: {
  searchParams: Promise<ParametrosDaPagina>
}) {
  const parametros = await searchParams
  const abaAtiva =
    parametros.aba === 'pagar' ? 'pagar' : parametros.aba === 'resultado' ? 'resultado' : 'receber'
  const chavePeriodo: ChaveDePeriodo =
    parametros.periodo !== undefined && ehChaveDePeriodo(parametros.periodo)
      ? parametros.periodo
      : 'este_mes'
  const hoje = hojeIso()
  const periodo = resolverPeriodo(chavePeriodo, hoje, { de: parametros.de, ate: parametros.ate })
  // Alagoas não tem horário de verão: o deslocamento fixo é seguro.
  const inicioDoPeriodo = `${periodo.de}T00:00:00-03:00`
  const fimDoPeriodo = `${periodo.ate}T23:59:59-03:00`

  const supabase = await criarClienteServidor()

  const [
    { data: linhasContas },
    { data: linhasDespesas },
    { data: linhasCategorias },
    { data: linhasVendasDoPeriodo },
    { data: linhasRecibos },
  ] = await Promise.all([
    supabase
      .from('receivables')
      .select('*, sales(sale_number, customer_name)')
      .neq('status', 'cancelado')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(500),
    supabase.from('expenses').select('*, expense_categories(name)').limit(500),
    supabase
      .from('expense_categories')
      .select('id, name, archived_at')
      .is('archived_at', null)
      .order('name'),
    supabase
      .from('sales')
      .select('id, total_cents')
      .in('status', ['confirmada', 'entregue'])
      .gte('confirmed_at', inicioDoPeriodo)
      .lte('confirmed_at', fimDoPeriodo)
      .limit(2000),
    supabase
      .from('receipts')
      .select('amount_cents, created_at')
      .gte('created_at', inicioDoPeriodo)
      .lte('created_at', fimDoPeriodo)
      .limit(2000),
  ])

  const contas = (linhasContas ?? []) as unknown as ContaComVenda[]
  const despesas = (
    (linhasDespesas ?? []) as (Despesa & { expense_categories: { name: string } | null })[]
  ).map((linha): DespesaComCategoria => ({
    ...linha,
    categoria: linha.expense_categories?.name ?? '—',
  }))
  const categorias = (linhasCategorias ?? []) as CategoriaDeDespesa[]
  const vendasDoPeriodo = (linhasVendasDoPeriodo ?? []) as { id: string; total_cents: number }[]
  const recibos = (linhasRecibos ?? []) as { amount_cents: number }[]

  // Indicadores derivados de registros reais — nenhum número inventado.
  const faturamentoDoPeriodo = vendasDoPeriodo.reduce((soma, venda) => soma + venda.total_cents, 0)
  const recebidoNoPeriodo = recibos.reduce((soma, recibo) => soma + recibo.amount_cents, 0)
  const abertas = contas.filter((conta) => conta.status === 'aberto' || conta.status === 'parcial')
  const recebidas = contas.filter((conta) => conta.status === 'recebido')
  const vencidas = abertas.filter((conta) => conta.due_date !== null && conta.due_date < hoje)
  const totalAberto = abertas.reduce(
    (soma, conta) => soma + conta.amount_cents - conta.received_cents,
    0,
  )
  const totalVencido = vencidas.reduce(
    (soma, conta) => soma + conta.amount_cents - conta.received_cents,
    0,
  )
  const despesasDoPeriodo = despesas.filter(
    (despesa) => despesa.expense_date >= periodo.de && despesa.expense_date <= periodo.ate,
  )
  const totalDespesasDoPeriodo = despesasDoPeriodo.reduce(
    (soma, despesa) => soma + despesa.amount_cents,
    0,
  )
  const totalAPagar = despesas
    .filter((despesa) => despesa.status === 'a_pagar')
    .reduce((soma, despesa) => soma + despesa.amount_cents, 0)

  const parametrosBase: Record<string, string> = {}
  if (abaAtiva !== 'receber') {
    parametrosBase.aba = abaAtiva
  }
  if (chavePeriodo !== 'este_mes') {
    parametrosBase.periodo = chavePeriodo
  }
  if (chavePeriodo === 'personalizado') {
    parametrosBase.de = periodo.de
    parametrosBase.ate = periodo.ate
  }

  function endereco(mudancas: Record<string, string | undefined>): string {
    const consulta = new URLSearchParams(parametrosBase)
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor === undefined) {
        consulta.delete(chave)
      } else {
        consulta.set(chave, valor)
      }
    }
    const texto = consulta.toString()
    return texto === '' ? '/painel/financeiro' : `/painel/financeiro?${texto}`
  }

  const indicadores = [
    { rotulo: 'Faturamento no período', valor: faturamentoDoPeriodo, tom: 'normal' as const },
    { rotulo: 'Recebido no período', valor: recebidoNoPeriodo, tom: 'verde' as const },
    { rotulo: 'A receber em aberto', valor: totalAberto, tom: 'normal' as const },
    {
      rotulo: `Vencidas (${vencidas.length})`,
      valor: totalVencido,
      tom: totalVencido > 0 ? ('vermelho' as const) : ('normal' as const),
    },
    { rotulo: 'Despesas no período', valor: totalDespesasDoPeriodo, tom: 'normal' as const },
    {
      rotulo: 'Despesas a pagar',
      valor: totalAPagar,
      tom: totalAPagar > 0 ? ('ambar' as const) : ('normal' as const),
    },
  ]

  return (
    <div>
      <TituloPagina
        titulo="Financeiro"
        subtitulo="Quem deve, o que entrou, o que saiu e o resultado do período."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5" role="group" aria-label="Período">
          {CHAVES_DE_PERIODO.filter((chave) => chave !== 'personalizado').map((chave) => (
            <Link
              key={chave}
              href={endereco({
                periodo: chave === 'este_mes' ? undefined : chave,
                de: undefined,
                ate: undefined,
              })}
              className={`rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                chavePeriodo === chave
                  ? 'border-marca-700 bg-marca-700 text-white'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {ROTULO_PERIODO[chave]}
            </Link>
          ))}
        </div>
        <form action="/painel/financeiro" className="flex items-center gap-1.5">
          {abaAtiva !== 'receber' ? <input type="hidden" name="aba" value={abaAtiva} /> : null}
          <input type="hidden" name="periodo" value="personalizado" />
          <label htmlFor="de" className="sr-only">
            De
          </label>
          <input
            id="de"
            name="de"
            type="date"
            defaultValue={chavePeriodo === 'personalizado' ? periodo.de : ''}
            className={`${classeEntrada} w-auto py-1 text-xs`}
          />
          <span className="text-xs text-zinc-400">até</span>
          <label htmlFor="ate" className="sr-only">
            Até
          </label>
          <input
            id="ate"
            name="ate"
            type="date"
            defaultValue={chavePeriodo === 'personalizado' ? periodo.ate : ''}
            className={`${classeEntrada} w-auto py-1 text-xs`}
          />
          <button
            type="submit"
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              chavePeriodo === 'personalizado'
                ? 'border-marca-700 bg-marca-700 text-white'
                : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            Aplicar
          </button>
        </form>
        <p className="ml-auto text-xs text-zinc-400">
          {dataCurtaDeIso(periodo.de)} – {dataCurtaDeIso(periodo.ate)}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {indicadores.map((indicador) => (
          <div
            key={indicador.rotulo}
            className={`${classeCartao} ${
              indicador.tom === 'vermelho'
                ? 'border-red-200 bg-red-50'
                : indicador.tom === 'ambar'
                  ? 'border-amber-200 bg-amber-50'
                  : ''
            }`}
          >
            <p
              className={`text-base font-bold sm:text-lg ${
                indicador.tom === 'vermelho'
                  ? 'text-red-700'
                  : indicador.tom === 'ambar'
                    ? 'text-amber-800'
                    : indicador.tom === 'verde'
                      ? 'text-emerald-700'
                      : 'text-zinc-900'
              }`}
            >
              {formatarCentavos(indicador.valor)}
            </p>
            <p className="text-xs text-zinc-500">{indicador.rotulo}</p>
          </div>
        ))}
      </div>

      <nav aria-label="Abas do financeiro" className="mb-4 flex gap-1 overflow-x-auto">
        {(
          [
            { chave: 'receber', rotulo: 'A receber' },
            { chave: 'pagar', rotulo: 'Despesas' },
            { chave: 'resultado', rotulo: 'Resultado' },
          ] as const
        ).map((aba) => (
          <Link
            key={aba.chave}
            href={endereco({
              aba: aba.chave === 'receber' ? undefined : aba.chave,
              ver: undefined,
            })}
            className={`rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap ${
              abaAtiva === aba.chave ? 'bg-marca-700 text-white' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {aba.rotulo}
          </Link>
        ))}
      </nav>

      {abaAtiva === 'receber' ? (
        <SecaoAReceber
          abertas={abertas}
          vencidas={vencidas}
          recebidas={recebidas}
          hoje={hoje}
          ver={parametros.ver}
          endereco={endereco}
        />
      ) : null}

      {abaAtiva === 'pagar' ? (
        <SecaoDespesas
          despesas={despesas}
          categorias={categorias}
          parametros={parametros}
          parametrosBase={{ ...parametrosBase, aba: 'pagar' }}
          hoje={hoje}
        />
      ) : null}

      {abaAtiva === 'resultado' ? (
        <SecaoResultado
          periodo={periodo}
          vendasDoPeriodo={vendasDoPeriodo}
          despesasDoPeriodo={despesasDoPeriodo}
        />
      ) : null}
    </div>
  )
}

function SecaoAReceber({
  abertas,
  vencidas,
  recebidas,
  hoje,
  ver,
  endereco,
}: {
  abertas: ContaComVenda[]
  vencidas: ContaComVenda[]
  recebidas: ContaComVenda[]
  hoje: string
  ver: string | undefined
  endereco: (mudancas: Record<string, string | undefined>) => string
}) {
  const filtro = ver === 'vencidas' ? 'vencidas' : ver === 'recebidas' ? 'recebidas' : 'abertas'
  const linhas = filtro === 'vencidas' ? vencidas : filtro === 'recebidas' ? recebidas : abertas

  return (
    <section aria-label="Contas a receber">
      <div className="mb-3 flex gap-1.5">
        {(
          [
            { chave: 'abertas', rotulo: `Abertas (${abertas.length})` },
            { chave: 'vencidas', rotulo: `Vencidas (${vencidas.length})` },
            { chave: 'recebidas', rotulo: `Recebidas (${recebidas.length})` },
          ] as const
        ).map((opcao) => (
          <Link
            key={opcao.chave}
            href={endereco({ ver: opcao.chave === 'abertas' ? undefined : opcao.chave })}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              filtro === opcao.chave
                ? 'border-marca-700 bg-marca-700 text-white'
                : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            {opcao.rotulo}
          </Link>
        ))}
      </div>

      {linhas.length === 0 ? (
        <EstadoVazio
          titulo={
            filtro === 'recebidas'
              ? 'Nenhuma conta recebida ainda'
              : filtro === 'vencidas'
                ? 'Nenhuma conta vencida — tudo em dia'
                : 'Nada a receber — tudo em dia'
          }
          descricao="As vendas a prazo criam contas aqui automaticamente."
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Tabela>
              <CabecalhoDaTabela>
                <CabecalhoFixo rotulo="Cliente" />
                <CabecalhoFixo rotulo="Venda" />
                <CabecalhoFixo rotulo="Parcela" />
                <CabecalhoFixo rotulo="Vencimento" />
                <CabecalhoFixo rotulo="Recebido" />
                <CabecalhoFixo rotulo="Saldo" alinhamento="direita" />
                <CabecalhoFixo rotulo="Situação" />
              </CabecalhoDaTabela>
              <tbody>
                {linhas.map((conta) => {
                  const vencida =
                    conta.status !== 'recebido' && conta.due_date !== null && conta.due_date < hoje
                  return (
                    <LinhaClicavel key={conta.id} href={`/painel/financeiro/contas/${conta.id}`}>
                      <Celula destaque>{conta.sales?.customer_name ?? conta.description}</Celula>
                      <Celula>
                        {conta.sales !== null ? (
                          <span className="font-mono text-xs text-zinc-400">
                            #{conta.sales.sale_number}
                          </span>
                        ) : (
                          '—'
                        )}
                      </Celula>
                      <Celula>
                        {conta.installment_count > 1
                          ? `${conta.installment_number}/${conta.installment_count}`
                          : 'única'}
                      </Celula>
                      <Celula>
                        <span className={vencida ? 'font-semibold text-red-700' : ''}>
                          {conta.due_date !== null ? dataCurtaDeIso(conta.due_date) : '—'}
                        </span>
                      </Celula>
                      <Celula>
                        <div className="w-32">
                          <BarraDeProgresso
                            valor={conta.received_cents}
                            maximo={conta.amount_cents}
                            tom={conta.received_cents > 0 ? 'verde' : 'vinho'}
                          />
                          <p className="mt-1 text-[11px] text-zinc-500">
                            {formatarCentavos(conta.received_cents)} de{' '}
                            {formatarCentavos(conta.amount_cents)}
                          </p>
                        </div>
                      </Celula>
                      <Celula alinhamento="direita" destaque>
                        {formatarCentavos(conta.amount_cents - conta.received_cents)}
                      </Celula>
                      <Celula>
                        {conta.status === 'recebido' ? (
                          <Distintivo tom="sucesso">Recebida</Distintivo>
                        ) : vencida ? (
                          <Distintivo tom="perigo">Vencida</Distintivo>
                        ) : conta.status === 'parcial' ? (
                          <Distintivo tom="atencao">Parcial</Distintivo>
                        ) : (
                          <Distintivo tom="neutro">Aberta</Distintivo>
                        )}
                      </Celula>
                    </LinhaClicavel>
                  )
                })}
              </tbody>
            </Tabela>
          </div>

          <ul className="space-y-2 md:hidden">
            {linhas.map((conta) => {
              const vencida =
                conta.status !== 'recebido' && conta.due_date !== null && conta.due_date < hoje
              return (
                <li key={conta.id}>
                  <CartaoClicavel
                    href={`/painel/financeiro/contas/${conta.id}`}
                    rotulo={conta.description}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {conta.sales?.customer_name ?? conta.description}
                      </p>
                      <p className="shrink-0 text-sm font-bold text-zinc-900">
                        {formatarCentavos(conta.amount_cents - conta.received_cents)}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {conta.sales !== null ? `Venda #${conta.sales.sale_number} · ` : ''}
                      {conta.installment_count > 1
                        ? `parcela ${conta.installment_number}/${conta.installment_count} · `
                        : ''}
                      {conta.due_date !== null ? `vence ${dataCurtaDeIso(conta.due_date)}` : ''}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1">
                        <BarraDeProgresso
                          valor={conta.received_cents}
                          maximo={conta.amount_cents}
                          tom={conta.received_cents > 0 ? 'verde' : 'vinho'}
                        />
                      </div>
                      {conta.status === 'recebido' ? (
                        <Distintivo tom="sucesso">Recebida</Distintivo>
                      ) : vencida ? (
                        <Distintivo tom="perigo">Vencida</Distintivo>
                      ) : null}
                    </div>
                  </CartaoClicavel>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}

function SecaoDespesas({
  despesas,
  categorias,
  parametros,
  parametrosBase,
  hoje,
}: {
  despesas: DespesaComCategoria[]
  categorias: CategoriaDeDespesa[]
  parametros: { ordenar?: string; dir?: string }
  parametrosBase: Record<string, string>
  hoje: string
}) {
  const ordenacao = lerOrdenacao(parametros, CAMPOS_DESPESA, 'expense_date')
  const direcao =
    parametros.ordenar === undefined && parametros.dir === undefined ? 'desc' : ordenacao.direcao
  const ordenacaoEfetiva = { campo: ordenacao.campo, direcao }
  const linhas = ordenarLinhas(despesas, ordenacaoEfetiva.campo, ordenacaoEfetiva.direcao)

  return (
    <section aria-label="Despesas" className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <BotaoCategorias categorias={categorias} />
        <BotaoNovaDespesa categorias={categorias} />
      </div>

      {linhas.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma despesa registrada"
          descricao="Hospedagem, alimentação, combustível — e as categorias que você criar."
        />
      ) : (
        <Tabela>
          <CabecalhoDaTabela>
            <CabecalhoOrdenavel
              campo="expense_date"
              rotulo="Data"
              ordenacao={ordenacaoEfetiva}
              parametros={parametrosBase}
            />
            <CabecalhoOrdenavel
              campo="categoria"
              rotulo="Categoria"
              ordenacao={ordenacaoEfetiva}
              parametros={parametrosBase}
            />
            <CabecalhoOrdenavel
              campo="description"
              rotulo="Descrição"
              ordenacao={ordenacaoEfetiva}
              parametros={parametrosBase}
            />
            <CabecalhoOrdenavel
              campo="due_date"
              rotulo="Vencimento"
              ordenacao={ordenacaoEfetiva}
              parametros={parametrosBase}
            />
            <CabecalhoOrdenavel
              campo="status"
              rotulo="Situação"
              ordenacao={ordenacaoEfetiva}
              parametros={parametrosBase}
            />
            <CabecalhoOrdenavel
              campo="amount_cents"
              rotulo="Valor"
              ordenacao={ordenacaoEfetiva}
              parametros={parametrosBase}
              alinhamento="direita"
            />
            <CabecalhoFixo rotulo="" alinhamento="direita" />
          </CabecalhoDaTabela>
          <tbody>
            {linhas.map((despesa) => {
              const vencida =
                despesa.status === 'a_pagar' && despesa.due_date !== null && despesa.due_date < hoje
              return (
                <LinhaDaTabela key={despesa.id}>
                  <Celula>{dataCurtaDeIso(despesa.expense_date)}</Celula>
                  <Celula>
                    <ChipDeCategoria nome={despesa.categoria} />
                  </Celula>
                  <Celula>{despesa.description ?? '—'}</Celula>
                  <Celula>
                    <span className={vencida ? 'font-semibold text-red-700' : ''}>
                      {despesa.due_date !== null ? dataCurtaDeIso(despesa.due_date) : '—'}
                    </span>
                  </Celula>
                  <Celula>
                    <Distintivo
                      tom={despesa.status === 'pago' ? 'sucesso' : vencida ? 'perigo' : 'atencao'}
                    >
                      {despesa.status === 'pago' ? 'Paga' : vencida ? 'Vencida' : 'A pagar'}
                    </Distintivo>
                  </Celula>
                  <Celula alinhamento="direita" destaque>
                    {formatarCentavos(despesa.amount_cents)}
                  </Celula>
                  <Celula alinhamento="direita">
                    <BotoesDespesa despesaId={despesa.id} aPagar={despesa.status === 'a_pagar'} />
                  </Celula>
                </LinhaDaTabela>
              )
            })}
          </tbody>
        </Tabela>
      )}
    </section>
  )
}

async function SecaoResultado({
  periodo,
  vendasDoPeriodo,
  despesasDoPeriodo,
}: {
  periodo: { de: string; ate: string }
  vendasDoPeriodo: { id: string; total_cents: number }[]
  despesasDoPeriodo: DespesaComCategoria[]
}) {
  const supabase = await criarClienteServidor()
  const idsDasVendas = vendasDoPeriodo.map((venda) => venda.id)
  const { data: linhasItens } =
    idsDasVendas.length === 0
      ? { data: [] }
      : await supabase
          .from('sale_items')
          .select('quantity, unit_cost_cents, subtotal_cents')
          .in('sale_id', idsDasVendas)
          .limit(5000)

  const itens = (
    (linhasItens ?? []) as {
      quantity: number
      unit_cost_cents: number | null
      subtotal_cents: number
    }[]
  ).map((item) => ({
    quantidade: item.quantity,
    custoUnitarioCentavos: item.unit_cost_cents,
    subtotalCentavos: item.subtotal_cents,
  }))

  const dre = calcularDre(
    vendasDoPeriodo.map((venda) => ({ totalCentavos: venda.total_cents })),
    itens,
    despesasDoPeriodo.map((despesa) => ({
      categoria: despesa.categoria,
      valorCentavos: despesa.amount_cents,
    })),
  )

  const linhaDre = (
    rotulo: string,
    valor: number,
    opcoes?: { destaque?: boolean; negativo?: boolean; recuo?: boolean },
  ) => (
    <div
      className={`flex items-center justify-between gap-3 py-2 ${
        opcoes?.destaque === true ? 'border-t border-zinc-200 font-bold text-zinc-900' : ''
      } ${opcoes?.recuo === true ? 'pl-4 text-sm text-zinc-600' : 'text-zinc-800'}`}
    >
      <span>{rotulo}</span>
      <span className={opcoes?.negativo === true ? 'text-red-700' : ''}>
        {opcoes?.negativo === true && valor > 0 ? '− ' : ''}
        {formatarCentavos(Math.abs(valor))}
      </span>
    </div>
  )

  return (
    <section aria-label="Resultado do período" className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className={classeCartao}>
          <p className="text-lg font-bold text-zinc-900">{dre.quantidadeVendas}</p>
          <p className="text-xs text-zinc-500">Vendas no período</p>
        </div>
        <div className={classeCartao}>
          <p className="text-lg font-bold text-zinc-900">
            {formatarCentavos(dre.ticketMedioCentavos)}
          </p>
          <p className="text-xs text-zinc-500">Ticket médio</p>
        </div>
        <div className={classeCartao}>
          <p className="text-lg font-bold text-zinc-900">
            {dre.margemBrutaPercentual !== null ? `${dre.margemBrutaPercentual}%` : '—'}
          </p>
          <p className="text-xs text-zinc-500">Margem bruta</p>
        </div>
        <div className={classeCartao}>
          <p
            className={`text-lg font-bold ${
              dre.resultadoOperacionalCentavos >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {dre.margemOperacionalPercentual !== null ? `${dre.margemOperacionalPercentual}%` : '—'}
          </p>
          <p className="text-xs text-zinc-500">Margem gerencial</p>
        </div>
      </div>

      <div className={classeCartao}>
        <h2 className="mb-1 font-bold text-zinc-900">DRE Gerencial</h2>
        <p className="mb-3 text-xs text-zinc-500">
          De {dataCurtaDeIso(periodo.de)} a {dataCurtaDeIso(periodo.ate)}. Receita pela data de
          confirmação da venda; custo congelado no momento de cada venda; despesas pela data do
          gasto.
        </p>

        {linhaDre('Receita bruta (vendas confirmadas)', dre.receitaBrutaCentavos)}
        {linhaDre('(−) Custo dos produtos vendidos', dre.cpvCentavos, { negativo: true })}
        {linhaDre('= Lucro bruto', dre.lucroBrutoCentavos, { destaque: true })}
        {dre.despesasPorCategoria.map((linha) =>
          linhaDre(`(−) ${linha.categoria}`, linha.totalCentavos, {
            negativo: true,
            recuo: true,
          }),
        )}
        {linhaDre('(−) Despesas operacionais', dre.totalDespesasCentavos, { negativo: true })}
        <div
          className={`mt-1 flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-lg font-bold ${
            dre.resultadoOperacionalCentavos >= 0
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          <span>= Resultado gerencial do período</span>
          <span>{formatarCentavos(dre.resultadoOperacionalCentavos)}</span>
        </div>

        {dre.coberturaDoCpvPercentual < 100 ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            ⚠️ O custo é conhecido em {dre.coberturaDoCpvPercentual}% da receita deste período —
            itens vendidos sem custo cadastrado entram com custo zero, então o lucro real pode ser
            menor que o mostrado. Preencha o custo dos produtos em Cadastros → Produtos.
          </p>
        ) : null}
      </div>
    </section>
  )
}
