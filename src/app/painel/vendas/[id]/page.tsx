import { notFound } from 'next/navigation'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { formatarCentavos } from '@/dominio/dinheiro'
import { ROTULO_CONDICAO, ROTULO_STATUS } from '@/dominio/venda'
import { type ContaAReceber, type ItemVenda, type Venda } from '@/lib/tipos'
import { classeCartao, Distintivo, TituloPagina } from '@/componentes/ui'
import { TOM_POR_STATUS } from '../apresentacao'
import { AcoesDaVenda } from './acoes-da-venda'

export const dynamic = 'force-dynamic'

export default async function PaginaVenda({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await criarClienteServidor()

  const [{ data: linhaVenda }, { data: linhasItens }, { data: linhasContas }] = await Promise.all([
    supabase.from('sales').select('*').eq('id', id).maybeSingle(),
    supabase.from('sale_items').select('*').eq('sale_id', id).order('product_name'),
    supabase.from('receivables').select('*').eq('sale_id', id),
  ])

  const venda = linhaVenda as Venda | null
  if (venda === null) {
    notFound()
  }
  const itens = (linhasItens ?? []) as ItemVenda[]
  const contas = (linhasContas ?? []) as ContaAReceber[]

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <TituloPagina
        titulo={`Venda — ${venda.customer_name}`}
        acao={
          <Distintivo tom={TOM_POR_STATUS[venda.status]}>{ROTULO_STATUS[venda.status]}</Distintivo>
        }
      />

      <div className={classeCartao}>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Cidade</dt>
            <dd className="font-medium">
              {venda.city}/{venda.state}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Origem</dt>
            <dd className="font-medium">{venda.origin === 'catalogo' ? 'Catálogo' : 'Manual'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Criada em</dt>
            <dd className="font-medium">{new Date(venda.created_at).toLocaleString('pt-BR')}</dd>
          </div>
          {venda.payment_terms !== null ? (
            <div className="flex justify-between">
              <dt className="text-zinc-500">Pagamento</dt>
              <dd className="font-medium">
                {ROTULO_CONDICAO[venda.payment_terms]}
                {venda.due_date !== null
                  ? ` — vence ${new Date(`${venda.due_date}T12:00:00`).toLocaleDateString('pt-BR')}`
                  : ''}
              </dd>
            </div>
          ) : null}
          {venda.customer_phone !== null ? (
            <div className="flex justify-between">
              <dt className="text-zinc-500">WhatsApp</dt>
              <dd>
                <a
                  href={`https://wa.me/55${venda.customer_phone}`}
                  className="text-marca-700 font-medium hover:underline"
                >
                  {venda.customer_phone}
                </a>
              </dd>
            </div>
          ) : null}
          {venda.note !== null ? (
            <div className="pt-1">
              <dt className="text-zinc-500">Observação</dt>
              <dd className="font-medium">{venda.note}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className={classeCartao}>
        <h2 className="mb-2 font-bold text-zinc-900">Itens</h2>
        <ul className="divide-y divide-zinc-100">
          {itens.map((item) => (
            <li key={item.id} className="flex justify-between py-2 text-sm">
              <span>
                {item.quantity}x {item.product_name}
              </span>
              <span className="font-medium">{formatarCentavos(item.subtotal_cents)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 border-t border-zinc-200 pt-2 text-right text-base font-bold">
          Total: {formatarCentavos(venda.total_cents)}
        </p>
      </div>

      {contas.length > 0 ? (
        <div className={classeCartao}>
          <h2 className="mb-2 font-bold text-zinc-900">Recebimento</h2>
          {contas.map((conta) => (
            <p key={conta.id} className="text-sm text-zinc-600">
              {conta.description}: {formatarCentavos(conta.received_cents)} de{' '}
              {formatarCentavos(conta.amount_cents)} —{' '}
              {conta.status === 'recebido'
                ? 'recebido'
                : conta.status === 'cancelado'
                  ? 'cancelado'
                  : 'em aberto'}
            </p>
          ))}
        </div>
      ) : null}

      <AcoesDaVenda vendaId={venda.id} status={venda.status} />
    </div>
  )
}
