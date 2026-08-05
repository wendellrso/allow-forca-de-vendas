import Link from 'next/link'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { formatarCentavos } from '@/dominio/dinheiro'
import { type Produto } from '@/lib/tipos'
import {
  classeBotaoPrimario,
  classeCartao,
  Distintivo,
  EstadoVazio,
  TituloPagina,
} from '@/componentes/ui'

export const dynamic = 'force-dynamic'

export default async function PaginaProdutos() {
  const supabase = await criarClienteServidor()
  const { data } = await supabase.from('products').select('*').order('name').limit(500)
  const produtos = (data ?? []) as Produto[]

  return (
    <div>
      <TituloPagina
        titulo="Produtos"
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
        <ul className="space-y-2">
          {produtos.map((produto) => {
            const estoqueBaixo =
              produto.min_stock !== null && produto.stock_quantity <= produto.min_stock
            return (
              <li key={produto.id}>
                <Link
                  href={`/painel/produtos/${produto.id}`}
                  className={`${classeCartao} hover:border-marca-600 block`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-zinc-900">{produto.name}</p>
                    <p className="font-semibold text-zinc-900">
                      {formatarCentavos(produto.price_cents)}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Distintivo tom={estoqueBaixo ? 'atencao' : 'neutro'}>
                      Estoque: {produto.stock_quantity} {produto.unit}
                    </Distintivo>
                    {!produto.active ? <Distintivo tom="perigo">Inativo</Distintivo> : null}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
