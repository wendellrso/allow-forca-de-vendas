import { notFound } from 'next/navigation'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { type Cliente } from '@/lib/tipos'
import { TituloPagina } from '@/componentes/ui'
import { FormularioCliente } from '../formulario'

export const dynamic = 'force-dynamic'

export default async function PaginaEditarCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await criarClienteServidor()
  const { data } = await supabase.from('customers').select('*').eq('id', id).maybeSingle()
  const cliente = data as Cliente | null

  if (cliente === null || cliente.archived_at !== null) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-lg">
      <TituloPagina titulo={cliente.name} />
      <FormularioCliente cliente={cliente} />
    </div>
  )
}
