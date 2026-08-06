import Link from 'next/link'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { formatarCentavos } from '@/dominio/dinheiro'
import { lerOrdenacao, ordenarLinhas } from '@/dominio/ordenacao'
import { type CategoriaDeDespesa, type ContaAReceber, type Despesa } from '@/lib/tipos'
import { Distintivo, EstadoVazio, TituloPagina } from '@/componentes/ui'
import {
  Tabela,
  CabecalhoDaTabela,
  CabecalhoOrdenavel,
  CabecalhoFixo,
  Celula,
  LinhaDaTabela,
} from '@/componentes/tabela'
import {
  BotoesDespesa,
  FormularioDespesa,
  FormularioRecebimento,
  GerenciarCategorias,
} from './formularios'

export const dynamic = 'force-dynamic'

type DespesaComCategoria = Despesa & { categoria: string }

const CAMPOS_RECEBER = ['description', 'due_date', 'amount_cents', 'status'] as const
const CAMPOS_DESPESA = [
  'expense_date',
  'categoria',
  'description',
  'city',
  'status',
  'amount_cents',
] as const

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default async function PaginaFinanceiro({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; ordenar?: string; dir?: string }>
}) {
  const parametros = await searchParams
  const abaAtiva = parametros.aba === 'pagar' ? 'pagar' : 'receber'
  const supabase = await criarClienteServidor()

  const [{ data: linhasContas }, { data: linhasDespesas }, { data: linhasCategorias }] =
    await Promise.all([
      supabase.from('receivables').select('*').limit(500),
      supabase.from('expenses').select('*, expense_categories(name)').limit(500),
      supabase
        .from('expense_categories')
        .select('id, name, archived_at')
        .is('archived_at', null)
        .order('name'),
    ])

  const contas = (linhasContas ?? []) as ContaAReceber[]
  const despesas = (
    (linhasDespesas ?? []) as (Despesa & { expense_categories: { name: string } | null })[]
  ).map((linha): DespesaComCategoria => ({
    ...linha,
    categoria: linha.expense_categories?.name ?? '—',
  }))
  const categorias = (linhasCategorias ?? []) as CategoriaDeDespesa[]
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

  const parametrosBase: Record<string, string> = abaAtiva === 'pagar' ? { aba: 'pagar' } : {}

  return (
    <div>
      <TituloPagina titulo="Financeiro" />
      <nav aria-label="Abas do financeiro" className="mb-4 flex gap-1 overflow-x-auto">
        <Link
          href="/painel/financeiro"
          className={`rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap ${abaAtiva === 'receber' ? 'bg-marca-700 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
        >
          A receber ({formatarCentavos(totalAberto)})
        </Link>
        <Link
          href="/painel/financeiro?aba=pagar"
          className={`rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap ${abaAtiva === 'pagar' ? 'bg-marca-700 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
        >
          Despesas ({formatarCentavos(totalAPagar)} a pagar)
        </Link>
      </nav>

      {abaAtiva === 'receber' ? (
        <SecaoAReceber
          abertas={abertas}
          encerradas={encerradas}
          hoje={hoje}
          parametros={parametros}
        />
      ) : (
        <SecaoDespesas
          despesas={despesas}
          categorias={categorias}
          parametros={parametros}
          parametrosBase={parametrosBase}
        />
      )}
    </div>
  )
}

function SecaoAReceber({
  abertas,
  encerradas,
  hoje,
  parametros,
}: {
  abertas: ContaAReceber[]
  encerradas: ContaAReceber[]
  hoje: string
  parametros: { ordenar?: string; dir?: string }
}) {
  const ordenacao = lerOrdenacao(parametros, CAMPOS_RECEBER, 'due_date')
  const linhas = ordenarLinhas(abertas, ordenacao.campo, ordenacao.direcao)

  return (
    <section aria-label="Contas a receber">
      {linhas.length === 0 ? (
        <EstadoVazio
          titulo="Nada a receber"
          descricao="As vendas a prazo criam contas aqui automaticamente."
        />
      ) : (
        <Tabela>
          <CabecalhoDaTabela>
            <CabecalhoOrdenavel campo="description" rotulo="Descrição" ordenacao={ordenacao} />
            <CabecalhoOrdenavel campo="due_date" rotulo="Vencimento" ordenacao={ordenacao} />
            <CabecalhoOrdenavel campo="status" rotulo="Situação" ordenacao={ordenacao} />
            <CabecalhoOrdenavel
              campo="amount_cents"
              rotulo="Valor"
              ordenacao={ordenacao}
              alinhamento="direita"
            />
            <CabecalhoFixo rotulo="Falta" alinhamento="direita" />
            <CabecalhoFixo rotulo="Registrar recebimento" />
          </CabecalhoDaTabela>
          <tbody>
            {linhas.map((conta) => {
              const vencida = conta.due_date !== null && conta.due_date < hoje
              return (
                <LinhaDaTabela key={conta.id}>
                  <Celula destaque>{conta.description}</Celula>
                  <Celula>
                    {conta.due_date !== null
                      ? new Date(`${conta.due_date}T12:00:00`).toLocaleDateString('pt-BR')
                      : '—'}
                  </Celula>
                  <Celula>
                    <Distintivo
                      tom={vencida ? 'perigo' : conta.status === 'parcial' ? 'atencao' : 'info'}
                    >
                      {vencida ? 'Vencida' : conta.status === 'parcial' ? 'Parcial' : 'Em aberto'}
                    </Distintivo>
                  </Celula>
                  <Celula alinhamento="direita">{formatarCentavos(conta.amount_cents)}</Celula>
                  <Celula alinhamento="direita" destaque>
                    {formatarCentavos(conta.amount_cents - conta.received_cents)}
                  </Celula>
                  <Celula>
                    <FormularioRecebimento contaId={conta.id} />
                  </Celula>
                </LinhaDaTabela>
              )
            })}
          </tbody>
        </Tabela>
      )}
      {encerradas.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-zinc-500">
            Recebidas ({encerradas.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {encerradas.map((conta) => (
              <li
                key={conta.id}
                className="flex justify-between rounded-lg bg-zinc-50 px-3 py-1.5 text-sm text-zinc-500"
              >
                <span>{conta.description}</span>
                <span>{formatarCentavos(conta.amount_cents)}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  )
}

function SecaoDespesas({
  despesas,
  categorias,
  parametros,
  parametrosBase,
}: {
  despesas: DespesaComCategoria[]
  categorias: CategoriaDeDespesa[]
  parametros: { ordenar?: string; dir?: string }
  parametrosBase: Record<string, string>
}) {
  const ordenacao = lerOrdenacao(parametros, CAMPOS_DESPESA, 'expense_date')
  const direcao =
    parametros.ordenar === undefined && parametros.dir === undefined ? 'desc' : ordenacao.direcao
  const ordenacaoEfetiva = { campo: ordenacao.campo, direcao }
  const linhas = ordenarLinhas(despesas, ordenacaoEfetiva.campo, ordenacaoEfetiva.direcao)

  return (
    <section aria-label="Despesas" className="space-y-4">
      <FormularioDespesa categorias={categorias} />
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
              campo="city"
              rotulo="Cidade"
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
            {linhas.map((despesa) => (
              <LinhaDaTabela key={despesa.id}>
                <Celula>
                  {new Date(`${despesa.expense_date}T12:00:00`).toLocaleDateString('pt-BR')}
                </Celula>
                <Celula destaque>{despesa.categoria}</Celula>
                <Celula>{despesa.description ?? '—'}</Celula>
                <Celula>
                  {despesa.city !== null
                    ? `${despesa.city}${despesa.state !== null ? `/${despesa.state}` : ''}`
                    : '—'}
                </Celula>
                <Celula>
                  <Distintivo tom={despesa.status === 'a_pagar' ? 'atencao' : 'sucesso'}>
                    {despesa.status === 'a_pagar' ? 'A pagar' : 'Pago'}
                  </Distintivo>
                </Celula>
                <Celula alinhamento="direita" destaque>
                  {formatarCentavos(despesa.amount_cents)}
                </Celula>
                <Celula alinhamento="direita">
                  <BotoesDespesa despesaId={despesa.id} aPagar={despesa.status === 'a_pagar'} />
                </Celula>
              </LinhaDaTabela>
            ))}
          </tbody>
        </Tabela>
      )}
      <GerenciarCategorias categorias={categorias} />
    </section>
  )
}
