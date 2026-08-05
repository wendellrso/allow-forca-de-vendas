import { type Metadata } from 'next'
import { TituloPagina } from '@/componentes/ui'
import { FormularioProduto } from '../formulario'

export const metadata: Metadata = { title: 'Novo produto' }

export default function PaginaNovoProduto() {
  return (
    <div className="mx-auto max-w-lg">
      <TituloPagina titulo="Novo produto" />
      <FormularioProduto />
    </div>
  )
}
