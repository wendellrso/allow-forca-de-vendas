import Link from 'next/link'
import { headers } from 'next/headers'
import { type ComponentType, type SVGProps } from 'react'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { formatarCentavos } from '@/dominio/dinheiro'
import { type Produto, type Venda } from '@/lib/tipos'
import { classeCartao, TituloPagina } from '@/componentes/ui'
import { CompartilharCatalogo } from '@/componentes/compartilhar-catalogo'
import { IconeFinanceiro, IconeProdutos, IconeRelatorios, IconeVendas } from '@/componentes/icones'

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

  interface Cartao {
    rotulo: string
    valor: string
    rota: string
    icone: ComponentType<SVGProps<SVGSVGElement>>
    alerta?: boolean
  }

  const cartoes: Cartao[] = [
    {
      rotulo: 'Vendas do mês',
      valor: formatarCentavos(totalMes),
      rota: '/painel/relatorios',
      icone: IconeRelatorios,
    },
    {
      rotulo: 'Pedidos aguardando',
      valor: String(aguardando.count ?? 0),
      rota: '/painel/vendas?status=aguardando_confirmacao',
      icone: IconeVendas,
      alerta: (aguardando.count ?? 0) > 0,
    },
    {
      rotulo: 'A receber em aberto',
      valor: formatarCentavos(aReceber),
      rota: '/painel/financeiro',
      icone: IconeFinanceiro,
    },
    {
      rotulo: 'Estoque baixo',
      valor: String(estoqueBaixo.length),
      rota: '/painel/produtos?ordenar=stock_quantity&dir=asc',
      icone: IconeProdutos,
      alerta: estoqueBaixo.length > 0,
    },
  ]

  return (
    <div>
      <TituloPagina titulo="Início" subtitulo="O resumo do seu dia de vendas." />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cartoes.map((cartao) => {
          const Icone = cartao.icone
          return (
            <Link
              key={cartao.rotulo}
              href={cartao.rota}
              className={`${classeCartao} hover:border-marca-600 block transition-colors`}
            >
              <div className="flex items-center justify-between">
                <span className="bg-marca-50 text-marca-700 grid h-9 w-9 place-items-center rounded-xl">
                  <Icone />
                </span>
                {cartao.alerta === true ? (
                  <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    atenção
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-2xl font-bold text-zinc-900">{cartao.valor}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{cartao.rotulo}</p>
            </Link>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={classeCartao}>
          <p className="mb-2 font-bold text-zinc-900">Catálogo dos clientes</p>
          <p className="mb-3 text-sm text-zinc-500">
            Mande este link para seus clientes: eles escolhem os produtos e o pedido chega no seu
            WhatsApp.
          </p>
          <CompartilharCatalogo url={urlDoCatalogo} />
        </div>

        {estoqueBaixo.length > 0 ? (
          <div className={classeCartao}>
            <p className="mb-2 font-bold text-zinc-900">Reposição de estoque</p>
            <ul className="space-y-1.5">
              {estoqueBaixo.slice(0, 6).map((produto) => (
                <li key={produto.name} className="flex justify-between text-sm">
                  <span className="text-zinc-600">{produto.name}</span>
                  <span className="font-semibold text-amber-700">
                    {produto.stock_quantity} restando
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}
