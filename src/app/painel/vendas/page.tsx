import Link from 'next/link'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { formatarCentavos } from '@/dominio/dinheiro'
import { lerOrdenacao, ordenarLinhas } from '@/dominio/ordenacao'
import { tempoRelativo } from '@/dominio/tempo'
import { ROTULO_STATUS, STATUS_VENDA, type StatusVenda } from '@/dominio/venda'
import { type Venda } from '@/lib/tipos'
import { classeBotaoPrimario, Distintivo, EstadoVazio, TituloPagina } from '@/componentes/ui'
import { Avatar } from '@/componentes/avatar'
import {
  Tabela,
  CabecalhoDaTabela,
  CabecalhoOrdenavel,
  CabecalhoFixo,
  Celula,
  LinhaDaTabela,
} from '@/componentes/tabela'
import { TOM_POR_STATUS } from './apresentacao'

export const dynamic = 'force-dynamic'

const CAMPOS = ['created_at', 'customer_name', 'city', 'origin', 'total_cents'] as const

const ACAO_POR_STATUS: Record<StatusVenda, string> = {
  aguardando_confirmacao: 'Confirmar',
  confirmada: 'Entregar',
  entregue: 'Ver',
  cancelada: 'Ver',
}

export default async function PaginaVendas({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; ordenar?: string; dir?: string }>
}) {
  const parametros = await searchParams
  const filtro = (STATUS_VENDA as readonly string[]).includes(parametros.status ?? '')
    ? (parametros.status as StatusVenda)
    : undefined
  const ordenacao = lerOrdenacao(parametros, CAMPOS, 'created_at')
  const direcao =
    parametros.ordenar === undefined && parametros.dir === undefined ? 'desc' : ordenacao.direcao
  const ordenacaoEfetiva = { campo: ordenacao.campo, direcao }

  const supabase = await criarClienteServidor()
  let consulta = supabase.from('sales').select('*').limit(500)
  if (filtro !== undefined) {
    consulta = consulta.eq('status', filtro)
  }
  const [{ data }, ...contagens] = await Promise.all([
    consulta,
    ...STATUS_VENDA.map((situacao) =>
      supabase.from('sales').select('id', { count: 'exact', head: true }).eq('status', situacao),
    ),
  ])
  const totalPorStatus = Object.fromEntries(
    STATUS_VENDA.map((situacao, indice) => [situacao, contagens[indice]?.count ?? 0]),
  ) as Record<StatusVenda, number>

  const vendas = ordenarLinhas(
    (data ?? []) as Venda[],
    ordenacaoEfetiva.campo,
    ordenacaoEfetiva.direcao,
  )
  const parametrosBase: Record<string, string> = filtro !== undefined ? { status: filtro } : {}

  return (
    <div>
      <TituloPagina
        titulo="Vendas"
        subtitulo="Confirme os pedidos que chegaram e acompanhe as entregas."
        acao={
          <Link href="/painel/vendas/nova" className={classeBotaoPrimario}>
            Nova venda
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {STATUS_VENDA.map((situacao) => {
          const ativo = filtro === situacao
          const destaque = situacao === 'aguardando_confirmacao' && totalPorStatus[situacao] > 0
          return (
            <Link
              key={situacao}
              href={ativo ? '/painel/vendas' : `/painel/vendas?status=${situacao}`}
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
      </div>

      {vendas.length === 0 ? (
        <EstadoVazio
          titulo={filtro !== undefined ? 'Nenhuma venda nesta situação' : 'Nenhuma venda ainda'}
          descricao={
            filtro !== undefined
              ? 'Clique no cartão de novo para ver todas.'
              : 'Registre a primeira venda ou compartilhe o catálogo para receber pedidos.'
          }
        />
      ) : (
        <Tabela>
          <CabecalhoDaTabela>
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
            <CabecalhoOrdenavel
              campo="origin"
              rotulo="Origem"
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
            <CabecalhoFixo rotulo="" alinhamento="direita" />
          </CabecalhoDaTabela>
          <tbody>
            {vendas.map((venda) => (
              <LinhaDaTabela key={venda.id}>
                <Celula destaque>
                  <Link
                    href={`/painel/vendas/${venda.id}`}
                    className="hover:text-marca-700 flex items-center gap-2.5"
                  >
                    <Avatar nome={venda.customer_name} tamanho="sm" />
                    {venda.customer_name}
                  </Link>
                </Celula>
                <Celula>{tempoRelativo(venda.created_at)}</Celula>
                <Celula>
                  {venda.city}/{venda.state}
                </Celula>
                <Celula>
                  <span className="inline-flex items-center gap-1">
                    <span aria-hidden>{venda.origin === 'catalogo' ? '🛍️' : '✍️'}</span>
                    {venda.origin === 'catalogo' ? 'Catálogo' : 'Manual'}
                  </span>
                </Celula>
                <Celula>
                  <Distintivo tom={TOM_POR_STATUS[venda.status]}>
                    {ROTULO_STATUS[venda.status]}
                  </Distintivo>
                </Celula>
                <Celula alinhamento="direita" destaque>
                  {formatarCentavos(venda.total_cents)}
                </Celula>
                <Celula alinhamento="direita">
                  <Link
                    href={`/painel/vendas/${venda.id}`}
                    className={
                      venda.status === 'aguardando_confirmacao'
                        ? 'bg-marca-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white hover:brightness-110'
                        : 'text-marca-700 text-xs font-semibold hover:underline'
                    }
                  >
                    {ACAO_POR_STATUS[venda.status]}
                  </Link>
                </Celula>
              </LinhaDaTabela>
            ))}
          </tbody>
        </Tabela>
      )}
    </div>
  )
}
