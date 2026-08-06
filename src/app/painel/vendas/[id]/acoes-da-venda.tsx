'use client'

import { useActionState, useState } from 'react'
import { type StatusVenda } from '@/dominio/venda'
import {
  classeBotaoPerigo,
  classeBotaoPrimario,
  classeBotaoSecundario,
  classeEntrada,
  classeRotulo,
  MensagemErro,
} from '@/componentes/ui'
import { cancelarVenda, confirmarVenda, entregarVenda, type EstadoAcaoVenda } from '../acoes'

interface FormaOpcao {
  id: string
  name: string
}

/** Ações que movem o pedido adiante: confirmar (com pagamento) e entregar. */
export function AcoesDaVenda({
  vendaId,
  status,
  formas,
}: {
  vendaId: string
  status: StatusVenda
  formas: FormaOpcao[]
}) {
  const [estadoConfirmar, acaoConfirmar, confirmando] = useActionState<EstadoAcaoVenda, FormData>(
    confirmarVenda,
    {},
  )
  const [estadoEntregar, acaoEntregar, entregando] = useActionState<EstadoAcaoVenda, FormData>(
    entregarVenda,
    {},
  )
  const [condicao, definirCondicao] = useState('a_vista')

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
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="condicao" className={classeRotulo}>
                Condição *
              </label>
              <select
                id="condicao"
                name="condicao"
                value={condicao}
                onChange={(evento) => definirCondicao(evento.target.value)}
                className={classeEntrada}
              >
                <option value="a_vista">À vista</option>
                <option value="a_prazo">A prazo</option>
              </select>
            </div>
            <div>
              <label htmlFor="formaId" className={classeRotulo}>
                Forma
              </label>
              <select id="formaId" name="formaId" defaultValue="" className={classeEntrada}>
                <option value="">Escolha…</option>
                {formas.map((forma) => (
                  <option key={forma.id} value={forma.id}>
                    {forma.name}
                  </option>
                ))}
              </select>
            </div>
            {condicao === 'a_prazo' ? (
              <div>
                <label htmlFor="vencimento" className={classeRotulo}>
                  Vencimento *
                </label>
                <input
                  id="vencimento"
                  name="vencimento"
                  type="date"
                  required
                  className={classeEntrada}
                />
              </div>
            ) : null}
          </div>
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
