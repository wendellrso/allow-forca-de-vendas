interface ItemArquivado {
  id: string
  name: string
}

/**
 * O que foi arquivado continua acessível e volta com um clique. Arquivar é
 * tirar de circulação, não apagar — e o caminho de volta precisa existir na
 * tela, senão o item some sem explicação.
 */
export function SecaoDeArquivados({
  itens,
  acaoRestaurar,
  rotuloSingular,
  rotuloPlural,
}: {
  itens: ItemArquivado[]
  acaoRestaurar: (dados: FormData) => Promise<void>
  rotuloSingular: string
  rotuloPlural: string
}) {
  if (itens.length === 0) {
    return null
  }

  return (
    <details className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium text-zinc-500 hover:text-zinc-800">
        {itens.length} {itens.length === 1 ? rotuloSingular : rotuloPlural}
      </summary>
      <ul className="mt-3 space-y-2">
        {itens.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2"
          >
            <span className="min-w-0 flex-1 truncate text-sm text-zinc-500">{item.name}</span>
            <form action={acaoRestaurar}>
              <input type="hidden" name="id" value={item.id} />
              <button
                type="submit"
                aria-label={`Restaurar ${item.name}`}
                className="text-marca-700 rounded-lg px-2 py-1 text-xs font-semibold hover:underline"
              >
                Restaurar
              </button>
            </form>
          </li>
        ))}
      </ul>
    </details>
  )
}
