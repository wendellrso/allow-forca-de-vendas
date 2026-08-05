import { type Metadata } from 'next'
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
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <p className="text-marca-700 text-3xl font-black tracking-tight">Allow</p>
        <p className="mt-1 text-sm text-zinc-500">Força de vendas externa</p>
      </div>
      <FormularioEntrada avisoInicial={avisoDeVinculo} />
    </main>
  )
}
