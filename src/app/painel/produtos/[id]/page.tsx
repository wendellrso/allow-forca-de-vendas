import { notFound } from 'next/navigation'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { formatarCentavos } from '@/dominio/dinheiro'
import { type MovimentoEstoque, type Produto } from '@/lib/tipos'
import { classeCartao, TituloPagina } from '@/componentes/ui'
import { FormularioProduto } from '../formulario'
import { FormularioMovimento } from './movimento'

export const dynamic = 'force-dynamic'

const ROTULO_MOVIMENTO: Record<MovimentoEstoque['kind'], string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  ajuste: 'Ajuste',
}

export default async function PaginaProduto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await criarClienteServidor()

  const [{ data: linhaProduto }, { data: linhasMovimentos }] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const produto = linhaProduto as Produto | null
  if (produto === null) {
    notFound()
  }
  const movimentos = (linhasMovimentos ?? []) as MovimentoEstoque[]

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <TituloPagina titulo={produto.name} />
        <FormularioProduto produto={produto} />
      </div>

      <section aria-labelledby="titulo-estoque" className="space-y-3">
        <h2 id="titulo-estoque" className="text-lg font-bold text-zinc-900">
          Estoque — saldo atual: {produto.stock_quantity} {produto.unit}
        </h2>
        <FormularioMovimento produtoId={produto.id} />
        {movimentos.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum movimento registrado.</p>
        ) : (
          <ul className="space-y-1.5">
            {movimentos.map((movimento) => (
              <li key={movimento.id} className={`${classeCartao} py-2.5`}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-zinc-800">
                    {ROTULO_MOVIMENTO[movimento.kind]}
                    {movimento.reason !== null ? ` — ${movimento.reason}` : ''}
                  </span>
                  <span
                    className={
                      movimento.delta > 0
                        ? 'font-semibold text-emerald-700'
                        : 'font-semibold text-red-700'
                    }
                  >
                    {movimento.delta > 0 ? `+${movimento.delta}` : movimento.delta}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  {new Date(movimento.created_at).toLocaleString('pt-BR')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-zinc-500">
        Preço atual: {formatarCentavos(produto.price_cents)}. Saídas por venda acontecem na
        confirmação da venda.
      </p>
    </div>
  )
}
