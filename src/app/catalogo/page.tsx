import { type Metadata } from 'next'
import { listarProdutosDoCatalogo } from '@/servidor/catalogo'
import { EstadoVazio } from '@/componentes/ui'
import { MarcaAllow } from '@/componentes/marca'
import { Catalogo } from './catalogo'

export const metadata: Metadata = {
  title: 'Catálogo Allow Beauty Hair',
  description:
    'Cosméticos profissionais Allow. Escolha os produtos e feche o pedido pelo WhatsApp.',
}
export const dynamic = 'force-dynamic'

export default async function PaginaCatalogo() {
  const produtos = await listarProdutosDoCatalogo()

  return (
    <div className="min-h-dvh">
      <header className="bg-marca-800 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e8c877] to-transparent" />
        <div className="mx-auto max-w-2xl px-4 py-10 text-center">
          <div className="text-dourado-400 mb-3 tracking-[0.6em]" aria-hidden>
            •&nbsp;•&nbsp;•
          </div>
          <MarcaAllow tom="dourado" tamanho="lg" />
          <p className="text-marca-100 mx-auto mt-4 max-w-xs text-sm">
            Cosméticos profissionais para cabelos fortes, saudáveis e brilhantes.
          </p>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#e8c877] to-transparent" />
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 pb-40">
        <p className="mb-4 text-center text-sm text-zinc-500">
          Escolha os produtos e feche o pedido pelo WhatsApp.
        </p>
        {produtos.length === 0 ? (
          <EstadoVazio
            titulo="Catálogo em preparação"
            descricao="Os produtos aparecerão aqui em breve."
          />
        ) : (
          <Catalogo produtos={produtos} />
        )}
      </main>
    </div>
  )
}
