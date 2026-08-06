import Link from 'next/link'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { formatarCentavos } from '@/dominio/dinheiro'
import { lerOrdenacao, ordenarLinhas } from '@/dominio/ordenacao'
import { type CategoriaDeDespesa, type ContaAReceber, type Despesa } from '@/lib/tipos'
import {
  BarraDeProgresso,
  classeCartao,
  Distintivo,
  EstadoVazio,
  TituloPagina,
} from '@/componentes/ui'
import { ChipDeCategoria } from '@/componentes/avatar'
import {
  Tabela,
  CabecalhoDaTabela,
  CabecalhoOrdenavel,
  CabecalhoFixo,
  Celula,
  LinhaDaTabela,
} from '@/componentes/tabela'
import {
  BotaoCategorias,
  BotaoNovaDespesa,
  BotoesDespesa,
  FormularioRecebimento,
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
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Maceio' })
}

export default async function PaginaFinanceiro({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; ver?: string; ordenar?: string; dir?: string }>
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
  const vencidas = abertas.filter((conta) => conta.due_date !== null && conta.due_date < hoje)
  const totalAberto = abertas.reduce(
    (soma, conta) => soma + conta.amount_cents - conta.received_cents,
    0,
  )
  const totalVencido = vencidas.reduce(
    (soma, conta) => soma + conta.amount_cents - conta.received_cents,
    0,
  )
  const totalAPagar = despesas
    .filter((despesa) => despesa.status === 'a_pagar')
    .reduce((soma, despesa) => soma + despesa.amount_cents, 0)

  const parametrosBase: Record<string, string> = abaAtiva === 'pagar' ? { aba: 'pagar' } : {}

  return (
    <div>
      <TituloPagina
        titulo="Financeiro"
        subtitulo="Quem ainda deve, o que já venceu e o custo das viagens."
      />

      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className={classeCartao}>
          <p className="text-lg font-bold text-zinc-900 sm:text-2xl">
            {formatarCentavos(totalAberto)}
          </p>
          <p className="text-xs text-zinc-500">A receber em aberto</p>
        </div>
        <div className={`${classeCartao} ${vencidas.length > 0 ? 'border-red-200 bg-red-50' : ''}`}>
          <p
            className={`text-lg font-bold sm:text-2xl ${vencidas.length > 0 ? 'text-red-700' : 'text-zinc-900'}`}
          >
            {formatarCentavos(totalVencido)}
          </p>
          <p className={`text-xs ${vencidas.length > 0 ? 'text-red-700' : 'text-zinc-500'}`}>
            Vencidas ({vencidas.length})
          </p>
        </div>
        <div className={classeCartao}>
          <p className="text-lg font-bold text-zinc-900 sm:text-2xl">
            {formatarCentavos(totalAPagar)}
          </p>
          <p className="text-xs text-zinc-500">Despesas a pagar</p>
        </div>
      </div>

      <nav aria-label="Abas do financeiro" className="mb-4 flex gap-1 overflow-x-auto">
        <Link
          href="/painel/financeiro"
          className={`rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap ${abaAtiva === 'receber' ? 'bg-marca-700 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
        >
          A receber
        </Link>
        <Link
          href="/painel/financeiro?aba=pagar"
          className={`rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap ${abaAtiva === 'pagar' ? 'bg-marca-700 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
        >
          Despesas
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
  parametros: { ver?: string; ordenar?: string; dir?: string }
}) {
  const verRecebidas = parametros.ver === 'recebidas'
  const ordenacao = lerOrdenacao(parametros, CAMPOS_RECEBER, 'due_date')
  const linhas = ordenarLinhas(abertas, ordenacao.campo, ordenacao.direcao)

  return (
    <section aria-label="Contas a receber">
      <div className="mb-3 flex gap-1.5">
        <Link
          href="/painel/financeiro"
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            !verRecebidas
              ? 'border-marca-700 bg-marca-700 text-white'
              : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          Abertas ({abertas.length})
        </Link>
        <Link
          href="/painel/financeiro?ver=recebidas"
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            verRecebidas
              ? 'border-marca-700 bg-marca-700 text-white'
              : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          Recebidas ({encerradas.length})
        </Link>
      </div>

      {verRecebidas ? (
        encerradas.length === 0 ? (
          <EstadoVazio
            titulo="Nenhuma conta recebida ainda"
            descricao="Quando um recebimento quitar uma conta, ela aparece aqui."
          />
        ) : (
          <Tabela>
            <CabecalhoDaTabela>
              <CabecalhoFixo rotulo="Descrição" />
              <CabecalhoFixo rotulo="Vencimento" />
              <CabecalhoFixo rotulo="Situação" />
              <CabecalhoFixo rotulo="Valor" alinhamento="direita" />
            </CabecalhoDaTabela>
            <tbody>
              {encerradas.map((conta) => (
                <LinhaDaTabela key={conta.id}>
                  <Celula destaque>{conta.description}</Celula>
                  <Celula>
                    {conta.due_date !== null
                      ? new Date(`${conta.due_date}T12:00:00`).toLocaleDateString('pt-BR')
                      : '—'}
                  </Celula>
                  <Celula>
                    <Distintivo tom="sucesso">Recebida</Distintivo>
                  </Celula>
                  <Celula alinhamento="direita" destaque>
                    {formatarCentavos(conta.amount_cents)}
                  </Celula>
                </LinhaDaTabela>
              ))}
            </tbody>
          </Tabela>
        )
      ) : linhas.length === 0 ? (
        <EstadoVazio
          titulo="Nada a receber — tudo em dia"
          descricao="As vendas a prazo criam contas aqui automaticamente."
        />
      ) : (
        <Tabela>
          <CabecalhoDaTabela>
            <CabecalhoOrdenavel campo="description" rotulo="Descrição" ordenacao={ordenacao} />
            <CabecalhoOrdenavel campo="due_date" rotulo="Vencimento" ordenacao={ordenacao} />
            <CabecalhoFixo rotulo="Recebido" />
            <CabecalhoFixo rotulo="Falta" alinhamento="direita" />
            <CabecalhoFixo rotulo="Registrar recebimento" />
          </CabecalhoDaTabela>
          <tbody>
            {linhas.map((conta) => {
              const vencida = conta.due_date !== null && conta.due_date < hoje
              return (
                <LinhaDaTabela key={conta.id}>
                  <Celula destaque>
                    <span className="flex items-center gap-2">
                      {conta.description}
                      {vencida ? <Distintivo tom="perigo">Vencida</Distintivo> : null}
                    </span>
                  </Celula>
                  <Celula>
                    <span className={vencida ? 'font-semibold text-red-700' : ''}>
                      {conta.due_date !== null
                        ? new Date(`${conta.due_date}T12:00:00`).toLocaleDateString('pt-BR')
                        : '—'}
                    </span>
                  </Celula>
                  <Celula>
                    <div className="w-36">
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
                    <FormularioRecebimento contaId={conta.id} />
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
                <Celula>
                  <ChipDeCategoria nome={despesa.categoria} />
                </Celula>
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
    </section>
  )
}
