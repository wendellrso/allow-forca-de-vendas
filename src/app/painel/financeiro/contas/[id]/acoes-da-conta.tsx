'use client'

import { useActionState, useState } from 'react'
import {
  classeBotaoPerigo,
  classeBotaoPrimario,
  classeEntrada,
  classeRotulo,
  MensagemErro,
} from '@/componentes/ui'
import {
  estornarRecebimento,
  gerarBoleto,
  registrarRecebimento,
  type EstadoEmissao,
  type EstadoRecebimento,
} from '../../acoes'

/** Nova tentativa de emissão quando a solicitação está pendente ou falhou. */
export function BotaoGerarBoleto({ emissaoId, contaId }: { emissaoId: string; contaId: string }) {
  const [estado, acao, pendente] = useActionState<EstadoEmissao, FormData>(gerarBoleto, {})

  return (
    <form action={acao} className="mt-3">
      <input type="hidden" name="emissaoId" value={emissaoId} />
      <input type="hidden" name="contaId" value={contaId} />
      <MensagemErro mensagem={estado.erro} />
      <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
        {pendente ? 'Emitindo…' : 'Gerar cobrança agora'}
      </button>
    </form>
  )
}

/** Registrar recebimento — só aparece quando a conta está em aberto. */
export function FormularioReceber({
  contaId,
  saldoFormatado,
}: {
  contaId: string
  saldoFormatado: string
}) {
  const [estado, acao, pendente] = useActionState<EstadoRecebimento, FormData>(
    registrarRecebimento,
    {},
  )

  return (
    <form action={acao} className="space-y-3" noValidate>
      <input type="hidden" name="contaId" value={contaId} />
      <MensagemErro mensagem={estado.erro} />
      <div>
        <label htmlFor="valor" className={classeRotulo}>
          Valor recebido (R$) *
        </label>
        <input
          id="valor"
          name="valor"
          inputMode="decimal"
          placeholder={`Saldo: ${saldoFormatado}`}
          required
          className={classeEntrada}
        />
      </div>
      <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
        {pendente ? 'Registrando…' : 'Registrar recebimento'}
      </button>
    </form>
  )
}

/** Estorno integral, com confirmação em duas etapas. */
export function BotaoEstornar({ contaId }: { contaId: string }) {
  const [estado, acao, pendente] = useActionState<EstadoRecebimento, FormData>(
    estornarRecebimento,
    {},
  )
  const [confirmando, definirConfirmando] = useState(false)

  if (!confirmando) {
    return (
      <div>
        <MensagemErro mensagem={estado.erro} />
        <button
          type="button"
          onClick={() => definirConfirmando(true)}
          className="text-sm font-medium text-zinc-500 hover:text-red-700"
        >
          Estornar recebimento…
        </button>
      </div>
    )
  }

  return (
    <form action={acao} className="space-y-2" noValidate>
      <input type="hidden" name="contaId" value={contaId} />
      <MensagemErro mensagem={estado.erro} />
      <p className="text-sm text-red-800">
        Todo o valor recebido volta para o saldo em aberto e o estorno fica registrado no histórico.
        Esta ação não pode ser desfeita.
      </p>
      <div>
        <label htmlFor="motivo" className={classeRotulo}>
          Motivo
        </label>
        <input id="motivo" name="motivo" className={classeEntrada} />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" disabled={pendente} className={classeBotaoPerigo}>
          {pendente ? 'Estornando…' : 'Confirmar estorno'}
        </button>
        <button
          type="button"
          onClick={() => definirConfirmando(false)}
          className="text-sm font-medium text-zinc-500 hover:text-zinc-800"
        >
          Voltar
        </button>
      </div>
    </form>
  )
}
