import Link from 'next/link'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { type Cliente } from '@/lib/tipos'
import {
  classeBotaoPrimario,
  classeCartao,
  classeEntrada,
  EstadoVazio,
  TituloPagina,
} from '@/componentes/ui'

export const dynamic = 'force-dynamic'

export default async function PaginaClientes({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>
}) {
  const { busca } = await searchParams
  const supabase = await criarClienteServidor()

  let consulta = supabase
    .from('customers')
    .select('*')
    .is('archived_at', null)
    .order('name')
    .limit(200)
  if (busca !== undefined && busca.trim() !== '') {
    consulta = consulta.ilike('name', `%${busca.trim()}%`)
  }
  const { data } = await consulta
  const clientes = (data ?? []) as Cliente[]

  return (
    <div>
      <TituloPagina
        titulo="Clientes"
        acao={
          <Link href="/painel/clientes/novo" className={classeBotaoPrimario}>
            Novo cliente
          </Link>
        }
      />
      <form className="mb-4" role="search">
        <label htmlFor="busca" className="sr-only">
          Buscar cliente
        </label>
        <input
          id="busca"
          name="busca"
          type="search"
          placeholder="Buscar por nome…"
          defaultValue={busca ?? ''}
          className={classeEntrada}
        />
      </form>
      {clientes.length === 0 ? (
        <EstadoVazio
          titulo={busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda'}
          descricao={
            busca
              ? 'Tente outro nome ou limpe a busca.'
              : 'Cadastre o primeiro cliente para começar a vender.'
          }
        />
      ) : (
        <ul className="space-y-2">
          {clientes.map((cliente) => (
            <li key={cliente.id}>
              <Link
                href={`/painel/clientes/${cliente.id}`}
                className={`${classeCartao} hover:border-marca-600 block`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-zinc-900">{cliente.name}</p>
                  <p className="text-sm text-zinc-500">
                    {cliente.city}/{cliente.state}
                  </p>
                </div>
                {cliente.phone !== null ? (
                  <p className="mt-0.5 text-sm text-zinc-500">{cliente.phone}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
