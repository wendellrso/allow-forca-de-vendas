'use client'

import { useActionState, useState } from 'react'
import { type PayloadDeBoleto } from '@/lib/tipos'
import {
  classeBotaoPerigo,
  classeBotaoPrimario,
  classeBotaoSecundario,
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

/** QR code, links e cópias da cobrança emitida — prontos para o cliente. */
export function BotoesDoBoleto({
  payload,
  telefoneDoCliente,
}: {
  payload: PayloadDeBoleto
  telefoneDoCliente: string | null
}) {
  const [copiado, definirCopiado] = useState<'linha' | 'pix' | null>(null)

  async function copiar(texto: string, qual: 'linha' | 'pix') {
    try {
      await navigator.clipboard.writeText(texto)
      definirCopiado(qual)
      setTimeout(() => definirCopiado(null), 2000)
    } catch {
      // Sem permissão de área de transferência: os links continuam disponíveis.
    }
  }

  const urlDoBoleto = payload.url_pdf ?? payload.url_fatura ?? null
  const mensagem =
    urlDoBoleto !== null ? `Olá! Segue o link para pagamento da sua compra: ${urlDoBoleto}` : null

  return (
    <>
      {payload.pix_qr_base64 !== null && payload.pix_qr_base64 !== undefined ? (
        <figure className="mt-3 flex flex-col items-center rounded-xl border border-zinc-200 bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagem do provedor em base64, sem otimizador no Worker */}
          <img
            src={`data:image/png;base64,${payload.pix_qr_base64}`}
            alt="QR code do Pix desta cobrança"
            className="h-44 w-44"
          />
          <figcaption className="mt-2 text-center text-xs text-zinc-500">
            O cliente aponta a câmera do banco para pagar na hora.
          </figcaption>
        </figure>
      ) : null}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {urlDoBoleto !== null ? (
          <a
            href={urlDoBoleto}
            target="_blank"
            rel="noreferrer"
            className={`${classeBotaoSecundario} w-auto`}
          >
            Abrir cobrança
          </a>
        ) : null}
        {payload.linha_digitavel !== null && payload.linha_digitavel !== undefined ? (
          <button
            type="button"
            onClick={() => void copiar(payload.linha_digitavel as string, 'linha')}
            className={`${classeBotaoSecundario} w-auto`}
          >
            {copiado === 'linha' ? 'Copiada!' : 'Copiar linha digitável'}
          </button>
        ) : null}
        {payload.pix_copia_e_cola !== null && payload.pix_copia_e_cola !== undefined ? (
          <button
            type="button"
            onClick={() => void copiar(payload.pix_copia_e_cola as string, 'pix')}
            className={`${classeBotaoSecundario} w-auto`}
          >
            {copiado === 'pix' ? 'Copiado!' : 'Copiar Pix'}
          </button>
        ) : null}
        {mensagem !== null ? (
          <a
            href={
              telefoneDoCliente !== null
                ? `https://wa.me/55${telefoneDoCliente}?text=${encodeURIComponent(mensagem)}`
                : `https://wa.me/?text=${encodeURIComponent(mensagem)}`
            }
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 sm:w-auto"
          >
            💬 Enviar no WhatsApp
          </a>
        ) : null}
      </div>
    </>
  )
}

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
