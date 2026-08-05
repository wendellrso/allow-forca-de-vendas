import { type Metadata } from 'next'
import { TituloPagina } from '@/componentes/ui'
import { FormularioCliente } from '../formulario'

export const metadata: Metadata = { title: 'Novo cliente' }

export default function PaginaNovoCliente() {
  return (
    <div className="mx-auto max-w-lg">
      <TituloPagina titulo="Novo cliente" />
      <FormularioCliente />
    </div>
  )
}
