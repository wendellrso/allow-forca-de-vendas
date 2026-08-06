import Link from 'next/link'
import { headers } from 'next/headers'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { formatarCentavos } from '@/dominio/dinheiro'
import { type Produto, type Venda } from '@/lib/tipos'
import { classeCartao, TituloPagina } from '@/componentes/ui'
import { CompartilharCatalogo } from '@/componentes/compartilhar-catalogo'

export const dynamic = 'force-dynamic'

function inicioDoMes(): string {
  const agora = new Date()
  return new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()
}

export default async function PaginaInicio() {
  const cabecalhos = await headers()
  const urlDoCatalogo = `https://${cabecalhos.get('host') ?? ''}/catalogo`
  const supabase = await criarClienteServidor()

  const [aguardando, vendasDoMes, contasAbertas, produtos] = await Promise.all([
    supabase
      .from('sales')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'aguardando_confirmacao'),
    supabase
      .from('sales')
      .select('total_cents, status')
      .in('status', ['confirmada', 'entregue'])
      .gte('confirmed_at', inicioDoMes()),
    supabase
      .from('receivables')
      .select('amount_cents, received_cents')
      .in('status', ['aberto', 'parcial']),
    supabase.from('products').select('name, stock_quantity, min_stock, active').eq('active', true),
  ])

  const totalMes = ((vendasDoMes.data ?? []) as Pick<Venda, 'total_cents'>[]).reduce(
    (soma, venda) => soma + venda.total_cents,
    0,
  )
  const aReceber = (
    (contasAbertas.data ?? []) as { amount_cents: number; received_cents: number }[]
  ).reduce((soma, conta) => soma + conta.amount_cents - conta.received_cents, 0)
  const estoqueBaixo = ((produtos.data ?? []) as Produto[]).filter(
    (produto) => produto.min_stock !== null && produto.stock_quantity <= produto.min_stock,
  )

  const cartoes = [
    {
      rotulo: 'Pedidos aguardando confirmação',
      valor: String(aguardando.count ?? 0),
      rota: '/painel/vendas?status=aguardando_confirmacao',
    },
    { rotulo: 'Vendas do mês', valor: formatarCentavos(totalMes), rota: '/painel/relatorios' },
    {
      rotulo: 'A receber em aberto',
      valor: formatarCentavos(aReceber),
      rota: '/painel/financeiro',
    },
    {
      rotulo: 'Produtos com estoque baixo',
      valor: String(estoqueBaixo.length),
      rota: '/painel/produtos',
    },
  ]

  return (
    <div>
      <TituloPagina titulo="Início" />
      <div className={`${classeCartao} mb-4`}>
        <p className="mb-2 font-bold text-zinc-900">Catálogo dos clientes</p>
        <p className="mb-3 text-sm text-zinc-500">
          Mande este link para seus clientes: eles escolhem os produtos e o pedido chega no seu
          WhatsApp.
        </p>
        <CompartilharCatalogo url={urlDoCatalogo} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cartoes.map((cartao) => (
          <Link
            key={cartao.rotulo}
            href={cartao.rota}
            className={`${classeCartao} hover:border-marca-600 block`}
          >
            <p className="text-sm text-zinc-500">{cartao.rotulo}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{cartao.valor}</p>
          </Link>
        ))}
      </div>
      {estoqueBaixo.length > 0 ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            Estoque baixo: {estoqueBaixo.map((produto) => produto.name).join(', ')}.
          </p>
        </div>
      ) : null}
    </div>
  )
}
