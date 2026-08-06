import Link from 'next/link'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { formatarCentavos } from '@/dominio/dinheiro'
import { lerOrdenacao, ordenarLinhas } from '@/dominio/ordenacao'
import { ROTULO_STATUS, STATUS_VENDA, type StatusVenda } from '@/dominio/venda'
import { type Venda } from '@/lib/tipos'
import { classeBotaoPrimario, Distintivo, EstadoVazio, TituloPagina } from '@/componentes/ui'
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

const CAMPOS = ['created_at', 'customer_name', 'city', 'origin', 'status', 'total_cents'] as const

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
  const direcaoPadrao =
    parametros.ordenar === undefined && parametros.dir === undefined ? 'desc' : ordenacao.direcao
  const ordenacaoEfetiva = { campo: ordenacao.campo, direcao: direcaoPadrao }

  const supabase = await criarClienteServidor()
  let consulta = supabase.from('sales').select('*').limit(500)
  if (filtro !== undefined) {
    consulta = consulta.eq('status', filtro)
  }
  const { data } = await consulta
  const vendas = ordenarLinhas(
    (data ?? []) as Venda[],
    ordenacaoEfetiva.campo,
    ordenacaoEfetiva.direcao,
  )
  const parametrosBase: Record<string, string> = filtro !== undefined ? { status: filtro } : {}

  return (
    <div>
      <TituloPagina
        titulo={`Vendas (${vendas.length})`}
        acao={
          <Link href="/painel/vendas/nova" className={classeBotaoPrimario}>
            Nova venda
          </Link>
        }
      />
      <nav aria-label="Filtro por situação" className="mb-3 flex gap-1 overflow-x-auto">
        <Link
          href="/painel/vendas"
          className={`rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap ${filtro === undefined ? 'bg-marca-700 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
        >
          Todas
        </Link>
        {STATUS_VENDA.map((situacao) => (
          <Link
            key={situacao}
            href={`/painel/vendas?status=${situacao}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap ${filtro === situacao ? 'bg-marca-700 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
          >
            {ROTULO_STATUS[situacao]}
          </Link>
        ))}
      </nav>
      {vendas.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma venda aqui"
          descricao="As vendas do catálogo e as registradas por você aparecem nesta lista."
        />
      ) : (
        <Tabela>
          <CabecalhoDaTabela>
            <CabecalhoOrdenavel
              campo="created_at"
              rotulo="Data"
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
            <CabecalhoOrdenavel
              campo="status"
              rotulo="Situação"
              ordenacao={ordenacaoEfetiva}
              parametros={parametrosBase}
            />
            <CabecalhoOrdenavel
              campo="total_cents"
              rotulo="Total"
              ordenacao={ordenacaoEfetiva}
              parametros={parametrosBase}
              alinhamento="direita"
            />
            <CabecalhoFixo rotulo="" />
          </CabecalhoDaTabela>
          <tbody>
            {vendas.map((venda) => (
              <LinhaDaTabela key={venda.id}>
                <Celula>{new Date(venda.created_at).toLocaleDateString('pt-BR')}</Celula>
                <Celula destaque>
                  <Link href={`/painel/vendas/${venda.id}`} className="hover:text-marca-700">
                    {venda.customer_name}
                  </Link>
                </Celula>
                <Celula>
                  {venda.city}/{venda.state}
                </Celula>
                <Celula>{venda.origin === 'catalogo' ? 'Catálogo' : 'Manual'}</Celula>
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
                    className="text-marca-700 text-xs font-semibold hover:underline"
                  >
                    Abrir
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
