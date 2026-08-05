import { type Metadata } from 'next'
import { listarProdutosDoCatalogo } from '@/servidor/catalogo'
import { EstadoVazio } from '@/componentes/ui'
import { Catalogo } from './catalogo'

export const metadata: Metadata = {
  title: 'Catálogo Allow',
  description: 'Escolha os produtos e feche o pedido pelo WhatsApp.',
}
export const dynamic = 'force-dynamic'

export default async function PaginaCatalogo() {
  const produtos = await listarProdutosDoCatalogo()

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-40">
      <header className="mb-6 text-center">
        <p className="text-marca-700 text-3xl font-black tracking-tight">Allow</p>
        <p className="mt-1 text-sm text-zinc-500">
          Escolha os produtos e feche o pedido pelo WhatsApp.
        </p>
      </header>
      {produtos.length === 0 ? (
        <EstadoVazio
          titulo="Catálogo em preparação"
          descricao="Os produtos aparecerão aqui em breve."
        />
      ) : (
        <Catalogo produtos={produtos} />
      )}
    </main>
  )
}
