import Link from 'next/link'
import { type Metadata } from 'next'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { type Cliente, type Produto } from '@/lib/tipos'
import { EstadoVazio, TituloPagina } from '@/componentes/ui'
import { FormularioVendaManual } from './formulario'

export const metadata: Metadata = { title: 'Nova venda' }
export const dynamic = 'force-dynamic'

export default async function PaginaNovaVenda() {
  const supabase = await criarClienteServidor()
  const [{ data: linhasClientes }, { data: linhasProdutos }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, city, state')
      .is('archived_at', null)
      .order('name')
      .limit(500),
    supabase
      .from('products')
      .select('id, name, price_cents, unit, stock_quantity')
      .eq('active', true)
      .order('name')
      .limit(500),
  ])

  const clientes = (linhasClientes ?? []) as Pick<Cliente, 'id' | 'name' | 'city' | 'state'>[]
  const produtos = (linhasProdutos ?? []) as Pick<
    Produto,
    'id' | 'name' | 'price_cents' | 'unit' | 'stock_quantity'
  >[]

  return (
    <div className="mx-auto max-w-lg">
      <TituloPagina titulo="Nova venda" />
      {clientes.length === 0 ? (
        <EstadoVazio
          titulo="Cadastre um cliente primeiro"
          descricao="Toda venda pertence a um cliente."
        />
      ) : produtos.length === 0 ? (
        <EstadoVazio
          titulo="Cadastre um produto primeiro"
          descricao="Sem produtos ativos não há o que vender."
        />
      ) : (
        <FormularioVendaManual clientes={clientes} produtos={produtos} />
      )}
      {clientes.length === 0 ? (
        <p className="mt-4 text-center text-sm">
          <Link href="/painel/clientes/novo" className="text-marca-700 font-medium hover:underline">
            Cadastrar cliente
          </Link>
        </p>
      ) : null}
    </div>
  )
}
