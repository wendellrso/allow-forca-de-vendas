import Link from 'next/link'
import { notFound } from 'next/navigation'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { formatarCentavos } from '@/dominio/dinheiro'
import { tempoRelativo } from '@/dominio/tempo'
import { type MovimentoEstoque, type Produto } from '@/lib/tipos'
import { BarraDeProgresso, classeCartao, Distintivo } from '@/componentes/ui'
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
  const estoqueBaixo = produto.min_stock !== null && produto.stock_quantity <= produto.min_stock

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/painel/produtos" className="hover:text-marca-700 text-sm text-zinc-500">
        ← Produtos
      </Link>

      <div className="mt-2 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-marca text-2xl font-bold text-zinc-900">{produto.name}</h1>
          <p className="text-sm text-zinc-500">
            {formatarCentavos(produto.price_cents)} / {produto.unit}
            {produto.cost_cents !== null && produto.price_cents > 0
              ? ` · custo ${formatarCentavos(produto.cost_cents)} · margem ${Math.round(
                  ((produto.price_cents - produto.cost_cents) / produto.price_cents) * 100,
                )}%`
              : ''}
          </p>
        </div>
        <Distintivo tom={!produto.active ? 'perigo' : estoqueBaixo ? 'atencao' : 'sucesso'}>
          {!produto.active ? 'Inativo' : estoqueBaixo ? 'Estoque baixo' : 'Ativo no catálogo'}
        </Distintivo>
      </div>

      <div className="grid gap-4 lg:grid-cols-[7fr_5fr]">
        <div className={classeCartao}>
          <h2 className="mb-3 font-bold text-zinc-900">Cadastro</h2>
          <FormularioProduto produto={produto} />
        </div>

        <div className="space-y-4">
          <div className={classeCartao}>
            <h2 className="mb-2 font-bold text-zinc-900">Estoque</h2>
            <div className="flex items-baseline gap-2">
              <p
                className={`text-4xl font-bold ${estoqueBaixo ? 'text-amber-700' : 'text-zinc-900'}`}
              >
                {produto.stock_quantity}
              </p>
              <p className="text-sm text-zinc-500">{produto.unit} em estoque</p>
            </div>
            {produto.min_stock !== null ? (
              <div className="mt-2">
                <BarraDeProgresso
                  valor={produto.stock_quantity}
                  maximo={Math.max(produto.min_stock * 2, 1)}
                  tom={estoqueBaixo ? 'ambar' : 'verde'}
                />
                <p className="mt-1 text-xs text-zinc-500">
                  mínimo definido: {produto.min_stock} {produto.unit}
                  {estoqueBaixo ? ' — hora de repor' : ''}
                </p>
              </div>
            ) : null}
            <div className="mt-3 border-t border-zinc-100 pt-3">
              <FormularioMovimento produtoId={produto.id} />
            </div>
          </div>

          <div className={classeCartao}>
            <h2 className="mb-2 font-bold text-zinc-900">Movimentos recentes</h2>
            {movimentos.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Nenhum movimento ainda. Registre a primeira entrada acima.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {movimentos.map((movimento) => (
                  <li key={movimento.id} className="flex items-center gap-3 py-2">
                    <span
                      aria-hidden
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${
                        movimento.delta > 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {movimento.delta > 0 ? '↑' : '↓'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-800">
                        {ROTULO_MOVIMENTO[movimento.kind]}
                        {movimento.reason !== null ? ` — ${movimento.reason}` : ''}
                      </p>
                      <p className="text-xs text-zinc-400">{tempoRelativo(movimento.created_at)}</p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-bold ${movimento.delta > 0 ? 'text-emerald-700' : 'text-red-700'}`}
                    >
                      {movimento.delta > 0 ? `+${movimento.delta}` : movimento.delta}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
