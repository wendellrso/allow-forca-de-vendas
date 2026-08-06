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

export default async function PaginaProdutos({
  searchParams,
}: {
  searchParams: Promise<{ ordenar?: string; dir?: string }>
}) {
  const parametros = await searchParams
  const ordenacao = lerOrdenacao(parametros, CAMPOS, 'name')

  const supabase = await criarClienteServidor()
  const { data } = await supabase.from('products').select('*').limit(500)
  const produtos = ordenarLinhas((data ?? []) as Produto[], ordenacao.campo, ordenacao.direcao)

  return (
    <div>
      <TituloPagina
        titulo={`Produtos (${produtos.length})`}
        acao={
          <Link href="/painel/produtos/novo" className={classeBotaoPrimario}>
            Novo produto
          </Link>
        }
      />
      {produtos.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum produto ainda"
          descricao="Cadastre os produtos para montar o catálogo e controlar o estoque."
        />
      ) : (
        <Tabela>
          <CabecalhoDaTabela>
            <CabecalhoFixo rotulo="" />
            <CabecalhoOrdenavel campo="name" rotulo="Produto" ordenacao={ordenacao} />
            <CabecalhoOrdenavel
              campo="price_cents"
              rotulo="Preço"
              ordenacao={ordenacao}
              alinhamento="direita"
            />
            <CabecalhoOrdenavel
              campo="stock_quantity"
              rotulo="Estoque"
              ordenacao={ordenacao}
              alinhamento="direita"
            />
            <CabecalhoFixo rotulo="Mínimo" alinhamento="direita" />
            <CabecalhoOrdenavel campo="active" rotulo="Situação" ordenacao={ordenacao} />
            <CabecalhoFixo rotulo="" />
          </CabecalhoDaTabela>
          <tbody>
            {produtos.map((produto) => {
              const estoqueBaixo =
                produto.min_stock !== null && produto.stock_quantity <= produto.min_stock
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
                    <span className={estoqueBaixo ? 'font-semibold text-amber-700' : ''}>
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
