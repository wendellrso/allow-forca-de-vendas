'use client'

import { useActionState, useState } from 'react'
import {
  ROTULO_TIPO_DE_FORMA,
  TIPOS_DE_FORMA,
  type FormaDePagamento,
  type TipoDeForma,
} from '@/lib/tipos'
import {
  classeBotaoPrimario,
  classeEntrada,
  classeRotulo,
  Distintivo,
  MensagemErro,
} from '@/componentes/ui'
import { Modal } from '@/componentes/modal'
import {
  arquivarFormaDePagamento,
  salvarConfiguracaoDaForma,
  type EstadoConfiguracaoDaForma,
} from '../acoes'

const EMOJI_POR_TIPO: Record<TipoDeForma, string> = {
  dinheiro: '💵',
  pix: '⚡',
  cartao_debito: '💳',
  cartao_credito: '💳',
  boleto: '🧾',
  outro: '💠',
}

/** Linha da forma com a configuração que sustenta a automação de pagamento. */
export function FormaComConfiguracao({ forma }: { forma: FormaDePagamento }) {
  const [aberto, definirAberto] = useState(false)
  const [estado, acao, pendente] = useActionState<EstadoConfiguracaoDaForma, FormData>(
    salvarConfiguracaoDaForma,
    {},
  )
  const [tipo, definirTipo] = useState<TipoDeForma>(forma.kind)
  const [permiteParcelas, definirPermiteParcelas] = useState(forma.allows_installments)
  const [sucessoAplicado, definirSucessoAplicado] = useState<EstadoConfiguracaoDaForma>()

  // Configuração salva: a janela fecha sozinha. Ajuste durante a
  // renderização, comparando com o último estado aplicado.
  if (estado.sucesso === true && estado !== sucessoAplicado) {
    definirSucessoAplicado(estado)
    definirAberto(false)
  }

  return (
    <li className="group hover:border-marca-200 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition-all hover:shadow-md">
      <span
        aria-hidden
        className="bg-marca-50 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg"
      >
        {EMOJI_POR_TIPO[forma.kind]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-zinc-800">{forma.name}</p>
        <div className="mt-0.5 flex flex-wrap gap-1">
          <Distintivo tom="neutro">{ROTULO_TIPO_DE_FORMA[forma.kind]}</Distintivo>
          {forma.allows_installments ? (
            <Distintivo tom="info">até {forma.max_installments}×</Distintivo>
          ) : null}
          {forma.kind === 'boleto' ? <Distintivo tom="atencao">emissão simulada</Distintivo> : null}
        </div>
      </div>
      <button
        type="button"
        onClick={() => definirAberto(true)}
        className="text-marca-700 rounded-lg px-2 py-1 text-xs font-semibold hover:underline"
      >
        Configurar
      </button>
      <form action={arquivarFormaDePagamento}>
        <input type="hidden" name="id" value={forma.id} />
        <button
          type="submit"
          title="Arquivar"
          aria-label={`Arquivar ${forma.name}`}
          className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          Arquivar
        </button>
      </form>

      <Modal
        aberto={aberto}
        aoFechar={() => definirAberto(false)}
        titulo={`Configurar ${forma.name}`}
      >
        <form action={acao} className="space-y-4" noValidate>
          <input type="hidden" name="id" value={forma.id} />
          <MensagemErro mensagem={estado.erro} />

          <div>
            <label htmlFor="tipo" className={classeRotulo}>
              Tipo da forma
            </label>
            <select
              id="tipo"
              name="tipo"
              value={tipo}
              onChange={(evento) => definirTipo(evento.target.value as TipoDeForma)}
              className={classeEntrada}
            >
              {TIPOS_DE_FORMA.map((opcao) => (
                <option key={opcao} value={opcao}>
                  {ROTULO_TIPO_DE_FORMA[opcao]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-400">
              {tipo === 'boleto'
                ? 'Boleto sempre gera título com vencimento e prepara a emissão (hoje em simulação; um provedor real assume depois).'
                : 'O tipo diz ao sistema como esta forma se comporta na venda.'}
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              name="permiteParcelas"
              checked={permiteParcelas}
              onChange={(evento) => definirPermiteParcelas(evento.target.checked)}
              className="text-marca-700 focus:ring-marca-100 h-4 w-4 rounded border-zinc-300"
            />
            Permite parcelamento
          </label>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {permiteParcelas ? (
              <div>
                <label htmlFor="maximoParcelas" className={classeRotulo}>
                  Máx. de parcelas
                </label>
                <input
                  id="maximoParcelas"
                  name="maximoParcelas"
                  type="number"
                  min={1}
                  max={24}
                  step={1}
                  defaultValue={forma.max_installments}
                  className={classeEntrada}
                />
              </div>
            ) : null}
            <div>
              <label htmlFor="diasPrimeiroVencimento" className={classeRotulo}>
                Dias p/ 1º venc.
              </label>
              <input
                id="diasPrimeiroVencimento"
                name="diasPrimeiroVencimento"
                type="number"
                min={0}
                max={90}
                step={1}
                defaultValue={forma.first_due_days}
                className={classeEntrada}
              />
            </div>
            <div>
              <label htmlFor="intervaloDias" className={classeRotulo}>
                Intervalo (dias)
              </label>
              <input
                id="intervaloDias"
                name="intervaloDias"
                type="number"
                min={7}
                max={60}
                step={1}
                defaultValue={forma.installment_interval_days}
                className={classeEntrada}
              />
            </div>
          </div>
          <p className="text-xs text-zinc-400">
            Estes valores viram o padrão da Nova venda quando esta forma é escolhida.
          </p>

          <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
            {pendente ? 'Salvando…' : 'Salvar configuração'}
          </button>
        </form>
      </Modal>
    </li>
  )
}
