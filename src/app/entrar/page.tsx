import { type Metadata } from 'next'
import { MarcaAllow } from '@/componentes/marca'
import { FormularioEntrada } from './formulario'

export const metadata: Metadata = { title: 'Entrar' }

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const { erro } = await searchParams
  const avisoDeVinculo =
    erro === 'sem-vinculo'
      ? 'Sua conta ainda não está vinculada à Allow. Fale com quem administra o aplicativo.'
      : undefined

  return (
    <main className="bg-marca-800 flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <div className="text-dourado-400 mb-3 tracking-[0.6em]" aria-hidden>
          •&nbsp;•&nbsp;•
        </div>
        <MarcaAllow tom="dourado" tamanho="lg" />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white p-6 shadow-xl">
        <p className="mb-4 text-center text-sm font-medium text-zinc-500">
          Que bom te ver! Entre para cuidar das suas vendas.
        </p>
        <FormularioEntrada avisoInicial={avisoDeVinculo} />
      </div>
    </main>
  )
}
