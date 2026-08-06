import Link from 'next/link'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { formatarCentavos } from '@/dominio/dinheiro'
import { lerOrdenacao, ordenarLinhas } from '@/dominio/ordenacao'
import { type Produto } from '@/lib/tipos'
import { classeBotaoPrimario, Distintivo, EstadoVazio, TituloPagina } from '@/componentes/ui'
import {
  Tabela,
  CabecalhoDaTabela,
  CabecalhoOrdenavel,
  CabecalhoFixo,
  Celula,
  LinhaDaTabela,
} from '@/componentes/tabela'

export const dynamic = 'force-dynamic'

const CAMPOS = ['name', 'price_cents', 'stock_quantity', 'active'] as const

function situacaoDoEstoque(produto: Produto): 'baixo' | 'ok' {
  return produto.min_stock !== null && produto.stock_quantity <= produto.min_stock ? 'baixo' : 'ok'
}

export default async function PaginaProdutos({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string; ordenar?: string; dir?: string }>
}) {
  const parametros = await searchParams
  const visao = parametros.ver === 'lista' ? 'lista' : 'grade'
  const ordenacao = lerOrdenacao(parametros, CAMPOS, 'name')

  const supabase = await criarClienteServidor()
  const { data } = await supabase.from('products').select('*').limit(500)
  const produtos = ordenarLinhas((data ?? []) as Produto[], ordenacao.campo, ordenacao.direcao)
  const parametrosBase: Record<string, string> = visao === 'lista' ? { ver: 'lista' } : {}

  return (
    <div>
      <TituloPagina
        titulo="Produtos"
        subtitulo={`${produtos.length} no catálogo · toque para editar preço, foto e estoque.`}
        acao={
          <div className="flex items-center gap-2">
            <div className="hidden rounded-lg border border-zinc-200 bg-white p-0.5 sm:flex">
              <Link
                href="/painel/produtos"
                aria-pressed={visao === 'grade'}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${visao === 'grade' ? 'bg-marca-700 text-white' : 'text-zinc-500 hover:text-zinc-800'}`}
              >
                Grade
              </Link>
              <Link
                href="/painel/produtos?ver=lista"
                aria-pressed={visao === 'lista'}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${visao === 'lista' ? 'bg-marca-700 text-white' : 'text-zinc-500 hover:text-zinc-800'}`}
              >
                Lista
              </Link>
            </div>
            <Link href="/painel/produtos/novo" className={classeBotaoPrimario}>
              Novo produto
            </Link>
          </div>
        }
      />

      {produtos.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum produto ainda"
          descricao="Cadastre o primeiro produto com foto — ele aparece no catálogo na hora."
        />
      ) : visao === 'grade' ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {produtos.map((produto) => {
            const baixo = situacaoDoEstoque(produto) === 'baixo'
            return (
              <li key={produto.id}>
                <Link
                  href={`/painel/produtos/${produto.id}`}
                  className="hover:border-marca-600 block overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-colors"
                >
                  {produto.image_url !== null ? (
                    // eslint-disable-next-line @next/next/no-img-element -- imagem do Storage, sem otimizador no Worker
                    <img
                      src={produto.image_url}
                      alt={produto.name}
                      loading="lazy"
                      className="aspect-square w-full bg-zinc-50 object-cover"
                    />
                  ) : (
                    <div className="grid aspect-square w-full place-items-center bg-zinc-50 text-xs text-zinc-400">
                      sem foto
                    </div>
                  )}
                  <div className="p-2.5">
                    <p className="truncate text-sm font-semibold text-zinc-900">{produto.name}</p>
                    <p className="text-marca-700 mt-0.5 font-bold">
                      {formatarCentavos(produto.price_cents)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <Distintivo tom={!produto.active ? 'perigo' : baixo ? 'atencao' : 'neutro'}>
                        {!produto.active ? 'Inativo' : `${produto.stock_quantity} ${produto.unit}`}
                      </Distintivo>
                      {produto.active && baixo ? (
                        <span className="text-[10px] font-bold text-amber-700">repor</span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <Tabela>
          <CabecalhoDaTabela>
            <CabecalhoFixo rotulo="" />
            <CabecalhoOrdenavel
              campo="name"
              rotulo="Produto"
              ordenacao={ordenacao}
              parametros={parametrosBase}
            />
            <CabecalhoOrdenavel
              campo="price_cents"
              rotulo="Preço"
              ordenacao={ordenacao}
              parametros={parametrosBase}
              alinhamento="direita"
            />
            <CabecalhoOrdenavel
              campo="stock_quantity"
              rotulo="Estoque"
              ordenacao={ordenacao}
              parametros={parametrosBase}
              alinhamento="direita"
            />
            <CabecalhoFixo rotulo="Mínimo" alinhamento="direita" />
            <CabecalhoOrdenavel
              campo="active"
              rotulo="Situação"
              ordenacao={ordenacao}
              parametros={parametrosBase}
            />
            <CabecalhoFixo rotulo="" />
          </CabecalhoDaTabela>
          <tbody>
            {produtos.map((produto) => {
              const baixo = situacaoDoEstoque(produto) === 'baixo'
              return (
                <LinhaDaTabela key={produto.id}>
                  <Celula>
                    {produto.image_url !== null ? (
                      // eslint-disable-next-line @next/next/no-img-element -- imagem do Storage, sem otimizador no Worker
                      <img
                        src={produto.image_url}
                        alt=""
                        loading="lazy"
                        className="h-9 w-9 rounded-md border border-zinc-100 object-cover"
                      />
                    ) : (
                      <span className="block h-9 w-9 rounded-md border border-dashed border-zinc-200" />
                    )}
                  </Celula>
                  <Celula destaque>
                    <Link href={`/painel/produtos/${produto.id}`} className="hover:text-marca-700">
                      {produto.name}
                    </Link>
                  </Celula>
                  <Celula alinhamento="direita" destaque>
                    {formatarCentavos(produto.price_cents)}
                  </Celula>
                  <Celula alinhamento="direita">
                    <span className={baixo ? 'font-semibold text-amber-700' : ''}>
                      {produto.stock_quantity} {produto.unit}
                    </span>
                  </Celula>
                  <Celula alinhamento="direita">{produto.min_stock ?? '—'}</Celula>
                  <Celula>
                    <Distintivo tom={produto.active ? 'sucesso' : 'perigo'}>
                      {produto.active ? 'Ativo' : 'Inativo'}
                    </Distintivo>
                  </Celula>
                  <Celula alinhamento="direita">
                    <Link
                      href={`/painel/produtos/${produto.id}`}
                      className="text-marca-700 text-xs font-semibold hover:underline"
                    >
                      Editar
                    </Link>
                  </Celula>
                </LinhaDaTabela>
              )
            })}
          </tbody>
        </Tabela>
      )}
    </div>
  )
}
