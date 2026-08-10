import Link from 'next/link'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { formatarCentavos } from '@/dominio/dinheiro'
import { lerOrdenacao, ordenarLinhas } from '@/dominio/ordenacao'
import { ehChaveDePeriodo, resolverPeriodo, ROTULO_PERIODO } from '@/dominio/periodo'
import { hojeIso, tempoRelativo } from '@/dominio/tempo'
import { ROTULO_STATUS, STATUS_VENDA, type StatusVenda } from '@/dominio/venda'
import { type FormaDePagamento, type Venda } from '@/lib/tipos'
import {
  classeBotaoPrimario,
  classeEntrada,
  Distintivo,
  EstadoVazio,
  TituloPagina,
} from '@/componentes/ui'
import { Avatar } from '@/componentes/avatar'
import { CartaoClicavel, LinhaClicavel } from '@/componentes/linha-clicavel'
import {
  Tabela,
  CabecalhoDaTabela,
  CabecalhoOrdenavel,
  CabecalhoFixo,
  Celula,
} from '@/componentes/tabela'
import { TOM_POR_STATUS } from './apresentacao'

export const dynamic = 'force-dynamic'

const CAMPOS = ['sale_number', 'created_at', 'customer_name', 'city', 'total_cents'] as const

const PERIODOS_DA_LISTA = ['todos', 'hoje', 'este_mes', 'mes_anterior'] as const

/** Situações da operação dela: a entrega é da empresa, não do sistema. */
const STATUS_DA_OPERACAO = ['aguardando_confirmacao', 'confirmada', 'cancelada'] as const

interface ParametrosDaPagina {
  status?: string
  periodo?: string
  busca?: string
  forma?: string
  ordenar?: string
  dir?: string
}

export default async function PaginaVendas({
  searchParams,
}: {
  searchParams: Promise<ParametrosDaPagina>
}) {
  const parametros = await searchParams
  const filtroStatus = (STATUS_VENDA as readonly string[]).includes(parametros.status ?? '')
    ? (parametros.status as StatusVenda)
    : undefined
  const chavePeriodo =
    parametros.periodo !== undefined && ehChaveDePeriodo(parametros.periodo)
      ? parametros.periodo
      : undefined
  const busca = (parametros.busca ?? '').trim().slice(0, 80)
  const filtroForma = (parametros.forma ?? '').trim()

  const ordenacao = lerOrdenacao(parametros, CAMPOS, 'created_at')
  const direcao =
    parametros.ordenar === undefined && parametros.dir === undefined ? 'desc' : ordenacao.direcao
  const ordenacaoEfetiva = { campo: ordenacao.campo, direcao }

  const hoje = hojeIso()
  const periodo = chavePeriodo !== undefined ? resolverPeriodo(chavePeriodo, hoje) : undefined
  // Alagoas não tem horário de verão: o deslocamento fixo é seguro.
  const inicioDoPeriodo = periodo !== undefined ? `${periodo.de}T00:00:00-03:00` : undefined
  const fimDoPeriodo = periodo !== undefined ? `${periodo.ate}T23:59:59-03:00` : undefined

  const supabase = await criarClienteServidor()

  let consulta = supabase.from('sales').select('*').limit(500)
  if (filtroStatus !== undefined) {
    consulta = consulta.eq('status', filtroStatus)
  }
  if (inicioDoPeriodo !== undefined && fimDoPeriodo !== undefined) {
    consulta = consulta.gte('created_at', inicioDoPeriodo).lte('created_at', fimDoPeriodo)
  }
  if (busca !== '') {
    consulta = consulta.ilike('customer_name', `%${busca}%`)
  }
  if (filtroForma !== '') {
    consulta = consulta.eq('payment_method_id', filtroForma)
  }

  let consultaFaturamento = supabase
    .from('sales')
    .select('total_cents')
    .in('status', ['confirmada', 'entregue'])
    .limit(2000)
  if (inicioDoPeriodo !== undefined && fimDoPeriodo !== undefined) {
    consultaFaturamento = consultaFaturamento
      .gte('confirmed_at', inicioDoPeriodo)
      .lte('confirmed_at', fimDoPeriodo)
  }

  const [{ data }, { data: linhasFaturamento }, { data: linhasFormas }, ...contagens] =
    await Promise.all([
      consulta,
      consultaFaturamento,
      supabase
        .from('payment_methods')
        .select(
          'id, name, kind, allows_installments, max_installments, first_due_days, installment_interval_days, archived_at',
        )
        .is('archived_at', null)
        .order('name'),
      ...STATUS_VENDA.map((situacao) =>
        supabase.from('sales').select('id', { count: 'exact', head: true }).eq('status', situacao),
      ),
    ])

  const totalPorStatus = Object.fromEntries(
    STATUS_VENDA.map((situacao, indice) => [situacao, contagens[indice]?.count ?? 0]),
  ) as Record<StatusVenda, number>
  const faturamento = ((linhasFaturamento ?? []) as { total_cents: number }[]).reduce(
    (soma, linha) => soma + linha.total_cents,
    0,
  )
  const formas = (linhasFormas ?? []) as FormaDePagamento[]

  const vendas = ordenarLinhas(
    (data ?? []) as Venda[],
    ordenacaoEfetiva.campo,
    ordenacaoEfetiva.direcao,
  )

  const parametrosBase: Record<string, string> = {}
  if (filtroStatus !== undefined) {
    parametrosBase.status = filtroStatus
  }
  if (chavePeriodo !== undefined) {
    parametrosBase.periodo = chavePeriodo
  }
  if (busca !== '') {
    parametrosBase.busca = busca
  }
  if (filtroForma !== '') {
    parametrosBase.forma = filtroForma
  }

  function enderecoComParametros(mudancas: Record<string, string | undefined>): string {
    const consulta = new URLSearchParams(parametrosBase)
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor === undefined) {
        consulta.delete(chave)
      } else {
        consulta.set(chave, valor)
      }
    }
    const texto = consulta.toString()
    return texto === '' ? '/painel/vendas' : `/painel/vendas?${texto}`
  }

  return (
    <div>
      <TituloPagina
        titulo="Vendas"
        subtitulo="Confirme os pedidos que chegaram e acompanhe os recebimentos."
        acao={
          <Link href="/painel/vendas/nova" className={classeBotaoPrimario}>
            + Nova venda
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {STATUS_DA_OPERACAO.map((situacao) => {
          const ativo = filtroStatus === situacao
          const destaque = situacao === 'aguardando_confirmacao' && totalPorStatus[situacao] > 0
          return (
            <Link
              key={situacao}
              href={enderecoComParametros({ status: ativo ? undefined : situacao })}
              aria-pressed={ativo}
              className={`rounded-xl border p-3 transition-colors ${
                ativo
                  ? 'border-marca-600 bg-marca-50'
                  : destaque
                    ? 'border-amber-300 bg-amber-50 hover:border-amber-400'
                    : 'hover:border-marca-600 border-zinc-200 bg-white'
              }`}
            >
              <p className="text-xl font-bold text-zinc-900">{totalPorStatus[situacao]}</p>
              <p className="text-xs text-zinc-500">{ROTULO_STATUS[situacao]}</p>
            </Link>
          )
        })}
        <div className="from-marca-700 to-marca-900 rounded-xl bg-gradient-to-br p-3 text-white">
          <p className="text-xl font-bold">{formatarCentavos(faturamento)}</p>
          <p className="text-marca-100/80 text-xs">
            Faturamento{' '}
            {chavePeriodo !== undefined ? ROTULO_PERIODO[chavePeriodo].toLowerCase() : 'total'}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5" role="group" aria-label="Período">
          {PERIODOS_DA_LISTA.map((chave) => {
            const ativo = chave === 'todos' ? chavePeriodo === undefined : chavePeriodo === chave
            return (
              <Link
                key={chave}
                href={enderecoComParametros({ periodo: chave === 'todos' ? undefined : chave })}
                className={`rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                  ativo
                    ? 'border-marca-700 bg-marca-700 text-white'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {chave === 'todos' ? 'Tudo' : ROTULO_PERIODO[chave]}
              </Link>
            )
          })}
        </div>

        <form action="/painel/vendas" className="ml-auto flex flex-wrap items-center gap-2">
          {filtroStatus !== undefined ? (
            <input type="hidden" name="status" value={filtroStatus} />
          ) : null}
          {chavePeriodo !== undefined ? (
            <input type="hidden" name="periodo" value={chavePeriodo} />
          ) : null}
          <label htmlFor="forma" className="sr-only">
            Forma de pagamento
          </label>
          <select
            id="forma"
            name="forma"
            defaultValue={filtroForma}
            className={`${classeEntrada} w-auto py-1.5 text-sm`}
          >
            <option value="">Todas as formas</option>
            {formas.map((forma) => (
              <option key={forma.id} value={forma.id}>
                {forma.name}
              </option>
            ))}
          </select>
          <label htmlFor="busca" className="sr-only">
            Buscar por cliente
          </label>
          <input
            id="busca"
            name="busca"
            type="search"
            placeholder="Buscar cliente…"
            defaultValue={busca}
            className={`${classeEntrada} w-44 py-1.5 text-sm`}
          />
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Filtrar
          </button>
        </form>
      </div>

      {vendas.length === 0 ? (
        <EstadoVazio
          titulo={
            filtroStatus !== undefined || busca !== '' || chavePeriodo !== undefined
              ? 'Nenhuma venda com estes filtros'
              : 'Nenhuma venda ainda'
          }
          descricao={
            filtroStatus !== undefined || busca !== '' || chavePeriodo !== undefined
              ? 'Ajuste os filtros acima para ver outras vendas.'
              : 'Registre a primeira venda ou compartilhe o catálogo para receber pedidos.'
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Tabela>
              <CabecalhoDaTabela>
                <CabecalhoOrdenavel
                  campo="sale_number"
                  rotulo="Nº"
                  ordenacao={ordenacaoEfetiva}
                  parametros={parametrosBase}
                />
                <CabecalhoOrdenavel
                  campo="customer_name"
                  rotulo="Cliente"
                  ordenacao={ordenacaoEfetiva}
                  parametros={parametrosBase}
                />
                <CabecalhoOrdenavel
                  campo="created_at"
                  rotulo="Quando"
                  ordenacao={ordenacaoEfetiva}
                  parametros={parametrosBase}
                />
                <CabecalhoOrdenavel
                  campo="city"
                  rotulo="Cidade"
                  ordenacao={ordenacaoEfetiva}
                  parametros={parametrosBase}
                />
                <CabecalhoFixo rotulo="Situação" />
                <CabecalhoOrdenavel
                  campo="total_cents"
                  rotulo="Total"
                  ordenacao={ordenacaoEfetiva}
                  parametros={parametrosBase}
                  alinhamento="direita"
                />
              </CabecalhoDaTabela>
              <tbody>
                {vendas.map((venda) => (
                  <LinhaClicavel key={venda.id} href={`/painel/vendas/${venda.id}`}>
                    <Celula>
                      <span className="font-mono text-xs text-zinc-400">#{venda.sale_number}</span>
                    </Celula>
                    <Celula destaque>
                      <span className="flex items-center gap-2.5">
                        <Avatar nome={venda.customer_name} tamanho="sm" />
                        {venda.customer_name}
                      </span>
                    </Celula>
                    <Celula>{tempoRelativo(venda.created_at)}</Celula>
                    <Celula>
                      {venda.city}/{venda.state}
                    </Celula>
                    <Celula>
                      <Distintivo tom={TOM_POR_STATUS[venda.status]}>
                        {ROTULO_STATUS[venda.status]}
                      </Distintivo>
                    </Celula>
                    <Celula alinhamento="direita" destaque>
                      {formatarCentavos(venda.total_cents)}
                    </Celula>
                  </LinhaClicavel>
                ))}
              </tbody>
            </Tabela>
          </div>

          <ul className="space-y-2 md:hidden">
            {vendas.map((venda) => (
              <li key={venda.id}>
                <CartaoClicavel
                  href={`/painel/vendas/${venda.id}`}
                  rotulo={`Venda ${venda.sale_number} de ${venda.customer_name}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar nome={venda.customer_name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {venda.customer_name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        #{venda.sale_number} · {venda.city}/{venda.state} ·{' '}
                        {tempoRelativo(venda.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-zinc-900">
                        {formatarCentavos(venda.total_cents)}
                      </p>
                      <Distintivo tom={TOM_POR_STATUS[venda.status]}>
                        {ROTULO_STATUS[venda.status]}
                      </Distintivo>
                    </div>
                  </div>
                </CartaoClicavel>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
