export interface EtapaDaTimeline {
  rotulo: string
  data: string | null
  estado: 'feita' | 'atual' | 'pendente' | 'cancelada'
}

/** Timeline vertical do pedido: onde ele está e por onde já passou. */
export function TimelineDoPedido({ etapas }: { etapas: EtapaDaTimeline[] }) {
  return (
    <ol className="space-y-0">
      {etapas.map((etapa, indice) => {
        const ultima = indice === etapas.length - 1
        const bolinha = {
          feita: 'bg-emerald-500 text-white',
          atual: 'bg-marca-700 text-white ring-4 ring-marca-100',
          pendente: 'border border-zinc-300 bg-white',
          cancelada: 'bg-red-500 text-white',
        }[etapa.estado]
        const trilho =
          etapa.estado === 'feita' || etapa.estado === 'cancelada'
            ? 'bg-emerald-200'
            : 'bg-zinc-200'

        return (
          <li key={etapa.rotulo} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                aria-hidden
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${bolinha}`}
              >
                {etapa.estado === 'feita' ? '✓' : etapa.estado === 'cancelada' ? '✕' : ''}
              </span>
              {!ultima ? <span className={`w-0.5 flex-1 ${trilho}`} /> : null}
            </div>
            <div className={`pb-5 ${ultima ? 'pb-0' : ''}`}>
              <p
                className={`text-sm leading-6 ${
                  etapa.estado === 'pendente'
                    ? 'text-zinc-400'
                    : etapa.estado === 'cancelada'
                      ? 'font-semibold text-red-700'
                      : 'font-semibold text-zinc-800'
                }`}
              >
                {etapa.rotulo}
              </p>
              {etapa.data !== null ? (
                <p className="text-xs text-zinc-400">
                  {new Date(etapa.data).toLocaleString('pt-BR', {
                    timeZone: 'America/Maceio',
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
