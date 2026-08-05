import Link from 'next/link'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { formatarCentavos } from '@/dominio/dinheiro'
import { ROTULO_STATUS, STATUS_VENDA, type StatusVenda } from '@/dominio/venda'
import { type Venda } from '@/lib/tipos'
import {
  classeBotaoPrimario,
  classeCartao,
  Distintivo,
  EstadoVazio,
  TituloPagina,
} from '@/componentes/ui'
import { TOM_POR_STATUS } from './apresentacao'

export const dynamic = 'force-dynamic'

export default async function PaginaVendas({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const filtro = (STATUS_VENDA as readonly string[]).includes(status ?? '')
    ? (status as StatusVenda)
    : undefined

  const supabase = await criarClienteServidor()
  let consulta = supabase
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (filtro !== undefined) {
    consulta = consulta.eq('status', filtro)
  }
  const { data } = await consulta
  const vendas = (data ?? []) as Venda[]

  return (
    <div>
      <TituloPagina
        titulo="Vendas"
        acao={
          <Link href="/painel/vendas/nova" className={classeBotaoPrimario}>
            Nova venda
          </Link>
        }
      />
      <nav aria-label="Filtro por situação" className="mb-4 flex gap-1 overflow-x-auto">
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
        <ul className="space-y-2">
          {vendas.map((venda) => (
            <li key={venda.id}>
              <Link
                href={`/painel/vendas/${venda.id}`}
                className={`${classeCartao} hover:border-marca-600 block`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-zinc-900">{venda.customer_name}</p>
                  <p className="font-semibold text-zinc-900">
                    {formatarCentavos(venda.total_cents)}
                  </p>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                  <Distintivo tom={TOM_POR_STATUS[venda.status]}>
                    {ROTULO_STATUS[venda.status]}
                  </Distintivo>
                  <span>
                    {venda.city}/{venda.state}
                  </span>
                  <span>·</span>
                  <span>{venda.origin === 'catalogo' ? 'Catálogo' : 'Manual'}</span>
                  <span>·</span>
                  <span>{new Date(venda.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
