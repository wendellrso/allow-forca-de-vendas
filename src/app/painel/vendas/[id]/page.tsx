import Link from 'next/link'
import { notFound } from 'next/navigation'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { formatarCentavos } from '@/dominio/dinheiro'
import { ROTULO_CONDICAO, ROTULO_STATUS } from '@/dominio/venda'
import { type ContaAReceber, type ItemVenda, type Venda } from '@/lib/tipos'
import { BarraDeProgresso, classeCartao, Distintivo } from '@/componentes/ui'
import { Avatar } from '@/componentes/avatar'
import { TimelineDoPedido, type EtapaDaTimeline } from '@/componentes/timeline'
import { TOM_POR_STATUS } from '../apresentacao'
import { AcoesDaVenda, ZonaDeRisco } from './acoes-da-venda'

export const dynamic = 'force-dynamic'

type ItemComFoto = ItemVenda & { products: { image_url: string | null } | null }

function etapasDoPedido(venda: Venda): EtapaDaTimeline[] {
  if (venda.status === 'cancelada') {
    return [
      { rotulo: 'Pedido criado', data: venda.created_at, estado: 'feita' },
      ...(venda.confirmed_at !== null
        ? [{ rotulo: 'Confirmado', data: venda.confirmed_at, estado: 'feita' as const }]
        : []),
      { rotulo: 'Cancelado', data: venda.canceled_at, estado: 'cancelada' },
    ]
  }
  return [
    { rotulo: 'Pedido criado', data: venda.created_at, estado: 'feita' },
    {
      rotulo: 'Confirmado',
      data: venda.confirmed_at,
      estado: venda.confirmed_at !== null ? 'feita' : 'atual',
    },
    {
      rotulo: 'Entregue',
      data: venda.delivered_at,
      estado:
        venda.delivered_at !== null
          ? 'feita'
          : venda.status === 'confirmada'
            ? 'atual'
            : 'pendente',
    },
  ]
}

export default async function PaginaVenda({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await criarClienteServidor()

  const [{ data: linhaVenda }, { data: linhasItens }, { data: linhasContas }] = await Promise.all([
    supabase.from('sales').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('sale_items')
      .select('*, products(image_url)')
      .eq('sale_id', id)
      .order('product_name'),
    supabase.from('receivables').select('*').eq('sale_id', id),
  ])

  const venda = linhaVenda as Venda | null
  if (venda === null) {
    notFound()
  }
  const itens = (linhasItens ?? []) as ItemComFoto[]
  const contas = (linhasContas ?? []) as ContaAReceber[]
  const conta = contas.find((linha) => linha.status !== 'cancelado')

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/painel/vendas" className="hover:text-marca-700 text-sm text-zinc-500">
        ← Vendas
      </Link>

      <div className="mt-2 mb-4 flex flex-wrap items-center gap-3">
        <Avatar nome={venda.customer_name} tamanho="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="font-marca truncate text-2xl font-bold text-zinc-900">
            Pedido de {venda.customer_name}
          </h1>
          <p className="text-sm text-zinc-500">
            {venda.origin === 'catalogo' ? 'Chegou pelo catálogo' : 'Registrado por você'} ·{' '}
            {new Date(venda.created_at).toLocaleString('pt-BR', {
              timeZone: 'America/Maceio',
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="text-right">
          <Distintivo tom={TOM_POR_STATUS[venda.status]}>{ROTULO_STATUS[venda.status]}</Distintivo>
          <p className="mt-1 text-2xl font-bold text-zinc-900">
            {formatarCentavos(venda.total_cents)}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <AcoesDaVenda vendaId={venda.id} status={venda.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[7fr_5fr]">
        <div className="space-y-4">
          <div className={classeCartao}>
            <h2 className="mb-2 font-bold text-zinc-900">Itens do pedido</h2>
            <ul className="divide-y divide-zinc-100">
              {itens.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2.5">
                  {item.products !== null && item.products.image_url !== null ? (
                    // eslint-disable-next-line @next/next/no-img-element -- imagem do Storage, sem otimizador no Worker
                    <img
                      src={item.products.image_url}
                      alt=""
                      loading="lazy"
                      className="h-11 w-11 shrink-0 rounded-lg border border-zinc-100 object-cover"
                    />
                  ) : (
                    <span className="block h-11 w-11 shrink-0 rounded-lg border border-dashed border-zinc-200" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-800">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {item.quantity} × {formatarCentavos(item.unit_price_cents)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-zinc-900">
                    {formatarCentavos(item.subtotal_cents)}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex justify-between border-t border-zinc-200 pt-2 font-bold">
              <span>Total</span>
              <span>{formatarCentavos(venda.total_cents)}</span>
            </p>
            {venda.note !== null ? (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                📝 {venda.note}
              </p>
            ) : null}
          </div>

          {conta !== undefined ? (
            <div className={classeCartao}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-bold text-zinc-900">Recebimento</h2>
                {venda.payment_terms !== null ? (
                  <span className="text-xs text-zinc-500">
                    {ROTULO_CONDICAO[venda.payment_terms]}
                    {venda.due_date !== null
                      ? ` · vence ${new Date(`${venda.due_date}T12:00:00`).toLocaleDateString('pt-BR')}`
                      : ''}
                  </span>
                ) : null}
              </div>
              <BarraDeProgresso
                valor={conta.received_cents}
                maximo={conta.amount_cents}
                tom={conta.received_cents === conta.amount_cents ? 'verde' : 'vinho'}
              />
              <p className="mt-2 text-sm text-zinc-600">
                {conta.status === 'recebido' ? (
                  <span className="font-semibold text-emerald-700">Recebido por completo ✓</span>
                ) : (
                  <>
                    Recebido {formatarCentavos(conta.received_cents)} de{' '}
                    {formatarCentavos(conta.amount_cents)} —{' '}
                    <Link
                      href="/painel/financeiro"
                      className="text-marca-700 font-semibold hover:underline"
                    >
                      registrar recebimento
                    </Link>
                  </>
                )}
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className={classeCartao}>
            <h2 className="mb-3 font-bold text-zinc-900">Andamento</h2>
            <TimelineDoPedido etapas={etapasDoPedido(venda)} />
          </div>

          <div className={classeCartao}>
            <h2 className="mb-2 font-bold text-zinc-900">Cliente</h2>
            <div className="flex items-center gap-3">
              <Avatar nome={venda.customer_name} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-800">
                  {venda.customer_name}
                </p>
                <p className="text-xs text-zinc-500">
                  {venda.city}/{venda.state}
                </p>
              </div>
            </div>
            {venda.customer_phone !== null ? (
              <a
                href={`https://wa.me/55${venda.customer_phone}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                💬 Chamar no WhatsApp
              </a>
            ) : null}
            {venda.customer_id !== null ? (
              <Link
                href={`/painel/clientes/${venda.customer_id}`}
                className="text-marca-700 mt-2 block text-center text-xs font-semibold hover:underline"
              >
                Ver cadastro completo
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <ZonaDeRisco vendaId={venda.id} status={venda.status} />
    </div>
  )
}
