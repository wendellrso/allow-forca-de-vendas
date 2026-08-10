'use client'

import { useActionState, useState } from 'react'
import { type StatusVenda } from '@/dominio/venda'
import { type FormaDePagamento } from '@/lib/tipos'
import {
  classeBotaoPerigo,
  classeBotaoPrimario,
  classeBotaoSecundario,
  classeEntrada,
  classeRotulo,
  MensagemErro,
} from '@/componentes/ui'
import { cancelarVenda, confirmarVenda, entregarVenda, type EstadoAcaoVenda } from '../acoes'
import { CamposDePagamento } from '../campos-de-pagamento'

/** Ações que movem o pedido adiante: confirmar (com pagamento) e entregar. */
export function AcoesDaVenda({
  vendaId,
  status,
  formas,
  totalCentavos,
}: {
  vendaId: string
  status: StatusVenda
  formas: FormaDePagamento[]
  totalCentavos: number
}) {
  const [estadoConfirmar, acaoConfirmar, confirmando] = useActionState<EstadoAcaoVenda, FormData>(
    confirmarVenda,
    {},
  )
  const [estadoEntregar, acaoEntregar, entregando] = useActionState<EstadoAcaoVenda, FormData>(
    entregarVenda,
    {},
  )

  if (status === 'entregue' || status === 'cancelada') {
    return null
  }

  return (
    <div className="border-marca-100 bg-marca-50/60 rounded-xl border p-4">
      <MensagemErro mensagem={estadoConfirmar.erro ?? estadoEntregar.erro} />

      {status === 'aguardando_confirmacao' ? (
        <form action={acaoConfirmar} className="space-y-3">
          <p className="text-sm font-semibold text-zinc-800">
            Próximo passo: confirmar o pedido — o estoque baixa e o contas a receber é criado.
          </p>
          <input type="hidden" name="vendaId" value={vendaId} />
          <CamposDePagamento formas={formas} totalCentavos={totalCentavos} />
          <button type="submit" disabled={confirmando} className={classeBotaoPrimario}>
            {confirmando ? 'Confirmando…' : 'Confirmar pedido'}
          </button>
        </form>
      ) : (
        <form action={acaoEntregar} className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-sm font-semibold text-zinc-800">
            Próximo passo: marcar como entregue quando o pedido chegar ao cliente.
          </p>
          <input type="hidden" name="vendaId" value={vendaId} />
          <button type="submit" disabled={entregando} className={classeBotaoPrimario}>
            {entregando ? 'Registrando…' : 'Marcar como entregue'}
          </button>
        </form>
      )}
    </div>
  )
}

/** Cancelamento, isolado do fluxo feliz e com confirmação em duas etapas. */
export function ZonaDeRisco({ vendaId, status }: { vendaId: string; status: StatusVenda }) {
  const [estado, acao, cancelando] = useActionState<EstadoAcaoVenda, FormData>(cancelarVenda, {})
  const [confirmando, definirConfirmando] = useState(false)

  if (status === 'entregue' || status === 'cancelada') {
    return null
  }

  return (
    <div className="mt-8 rounded-xl border border-red-200 p-4">
      <p className="text-sm font-bold text-red-800">Zona de risco</p>
      <MensagemErro mensagem={estado.erro} />
      {confirmando ? (
        <form action={acao} className="mt-2 space-y-3">
          <input type="hidden" name="vendaId" value={vendaId} />
          <p className="text-sm text-red-800">
            {status === 'confirmada'
              ? 'O estoque será estornado e o contas a receber cancelado. Esta ação não pode ser desfeita.'
              : 'O pedido será cancelado. Esta ação não pode ser desfeita.'}
          </p>
          <div>
            <label htmlFor="motivo" className={classeRotulo}>
              Motivo
            </label>
            <input id="motivo" name="motivo" className={classeEntrada} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" disabled={cancelando} className={classeBotaoPerigo}>
              {cancelando ? 'Cancelando…' : 'Confirmar cancelamento'}
            </button>
            <button
              type="button"
              onClick={() => definirConfirmando(false)}
              className={classeBotaoSecundario}
            >
              Voltar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => definirConfirmando(true)}
          className="mt-1 text-sm font-medium text-red-600 hover:text-red-800"
        >
          Cancelar esta venda…
        </button>
      )}
    </div>
  )
}
