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

export function AcoesDaVenda({ vendaId, status }: { vendaId: string; status: StatusVenda }) {
  const [estadoConfirmar, acaoConfirmar, confirmando] = useActionState<EstadoAcaoVenda, FormData>(
    confirmarVenda,
    {},
  )
  const [estadoEntregar, acaoEntregar, entregando] = useActionState<EstadoAcaoVenda, FormData>(
    entregarVenda,
    {},
  )
  const [estadoCancelar, acaoCancelar, cancelando] = useActionState<EstadoAcaoVenda, FormData>(
    cancelarVenda,
    {},
  )
  const [condicao, definirCondicao] = useState('a_vista')
  const [confirmandoCancelamento, definirConfirmandoCancelamento] = useState(false)

  if (status === 'entregue' || status === 'cancelada') {
    return null
  }

  return (
    <div className="space-y-4">
      <MensagemErro mensagem={estadoConfirmar.erro ?? estadoEntregar.erro ?? estadoCancelar.erro} />

      {status === 'aguardando_confirmacao' ? (
        <form
          action={acaoConfirmar}
          className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4"
        >
          <input type="hidden" name="vendaId" value={vendaId} />
          <p className="font-medium text-zinc-800">
            Confirmar a venda baixa o estoque e cria o contas a receber.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="condicao" className={classeRotulo}>
                Pagamento *
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
            {confirmando ? 'Confirmando…' : 'Confirmar venda'}
          </button>
        </form>
      ) : null}

      {status === 'confirmada' ? (
        <form action={acaoEntregar}>
          <input type="hidden" name="vendaId" value={vendaId} />
          <button type="submit" disabled={entregando} className={classeBotaoPrimario}>
            {entregando ? 'Registrando…' : 'Marcar como entregue'}
          </button>
        </form>
      ) : null}

      {confirmandoCancelamento ? (
        <form
          action={acaoCancelar}
          className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4"
        >
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
              onClick={() => definirConfirmandoCancelamento(false)}
              className={classeBotaoSecundario}
            >
              Voltar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => definirConfirmandoCancelamento(true)}
          className="text-sm font-medium text-red-600 hover:text-red-800"
        >
          Cancelar venda
        </button>
      )}
    </div>
  )
}
