/** Esqueletos de carregamento: a tela chega com a forma certa antes do dado. */

export function Esqueleto({ classe }: { classe: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-zinc-200/70 ${classe}`} />
}

export function EsqueletoDePagina() {
  return (
    <div aria-busy="true" aria-label="Carregando">
      <Esqueleto classe="mb-2 h-8 w-48" />
      <Esqueleto classe="mb-5 h-4 w-72" />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Esqueleto classe="h-28" />
        <Esqueleto classe="h-28" />
        <Esqueleto classe="hidden h-28 lg:block" />
        <Esqueleto classe="hidden h-28 lg:block" />
      </div>
      <Esqueleto classe="mb-2 h-10" />
      <Esqueleto classe="h-64" />
    </div>
  )
}
