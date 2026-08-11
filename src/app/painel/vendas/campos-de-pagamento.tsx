'use client'

import { useState } from 'react'
import { formatarCentavos } from '@/dominio/dinheiro'
import { montarParcelas, somarDias } from '@/dominio/parcelas'
import { dataCurtaDeIso, hojeIso } from '@/dominio/tempo'
import { formaGeraCobranca, type FormaDePagamento } from '@/lib/tipos'
import { classeEntrada, classeRotulo } from '@/componentes/ui'

/**
 * Condição, forma, parcelas e vencimentos — o mesmo bloco na Nova venda e na
 * confirmação do pedido. Boleto força a condição a prazo. Nas formas que o
 * provedor cobra (Pix, cartão de crédito, boleto), a venda à vista ainda
 * pergunta o essencial: gerar a cobrança ou o dinheiro já está com ela.
 */
export function CamposDePagamento({
  formas,
  totalCentavos,
  emissaoReal,
}: {
  formas: FormaDePagamento[]
  totalCentavos: number
  emissaoReal: boolean
}) {
  const [condicao, definirCondicao] = useState<'a_vista' | 'a_prazo'>('a_vista')
  const [formaId, definirFormaId] = useState('')
  const [parcelas, definirParcelas] = useState(1)
  const [vencimento, definirVencimento] = useState('')
  const [intervalo, definirIntervalo] = useState(30)
  const [cobrar, definirCobrar] = useState(true)

  const forma = formas.find((opcao) => opcao.id === formaId)
  const ehBoleto = forma?.kind === 'boleto'
  const geraCobranca = forma !== undefined && formaGeraCobranca(forma.kind)
  const permiteParcelas = condicao === 'a_prazo' && (forma?.allows_installments ?? false)
  const maximoDeParcelas = forma?.max_installments ?? 1

  // À vista só cobra quando a forma tem cobrança no provedor; fora disso, o
  // dinheiro já entrou e a venda nasce quitada.
  const cobrarAVista = condicao === 'a_vista' && geraCobranca && cobrar

  function aoEscolherForma(id: string) {
    definirFormaId(id)
    const escolhida = formas.find((opcao) => opcao.id === id)
    if (escolhida === undefined) {
      definirParcelas(1)
      return
    }
    if (escolhida.kind === 'boleto') {
      definirCondicao('a_prazo')
    }
    definirIntervalo(escolhida.installment_interval_days)
    if (vencimento === '') {
      definirVencimento(somarDias(hojeIso(), escolhida.first_due_days))
    }
    if (parcelas > escolhida.max_installments || !escolhida.allows_installments) {
      definirParcelas(1)
    }
  }

  const previa =
    condicao === 'a_prazo' && vencimento !== ''
      ? montarParcelas(totalCentavos, parcelas, vencimento, intervalo)
      : []

  const notaDaCobranca = emissaoReal ? (
    <>
      🧾 {previa.length > 1 ? 'As cobranças (uma por parcela) serão' : 'A cobrança será'}{' '}
      <span className="font-semibold">emitida{previa.length > 1 ? 's' : ''} no Asaas</span> na
      confirmação — com link, QR code do Pix e baixa automática quando o cliente pagar.
    </>
  ) : (
    <>
      🧾 {previa.length > 1 ? 'As cobranças serão' : 'A cobrança será'}{' '}
      <span className="font-semibold">preparada{previa.length > 1 ? 's' : ''} em simulação</span> —
      nada é emitido de verdade nesta etapa.
    </>
  )

  return (
    <div className="space-y-3">
      <input type="hidden" name="condicao" value={condicao} />
      <input type="hidden" name="intervaloDias" value={intervalo} />
      <input type="hidden" name="cobrar" value={cobrarAVista ? 'sim' : 'nao'} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className={classeRotulo}>Condição *</span>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1" role="group">
            <button
              type="button"
              onClick={() => {
                if (!ehBoleto) {
                  definirCondicao('a_vista')
                  definirParcelas(1)
                }
              }}
              aria-pressed={condicao === 'a_vista'}
              disabled={ehBoleto}
              className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                condicao === 'a_vista'
                  ? 'text-marca-800 bg-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              À vista
            </button>
            <button
              type="button"
              onClick={() => {
                definirCondicao('a_prazo')
                if (vencimento === '') {
                  definirVencimento(somarDias(hojeIso(), forma?.first_due_days ?? 30))
                }
              }}
              aria-pressed={condicao === 'a_prazo'}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                condicao === 'a_prazo'
                  ? 'text-marca-800 bg-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              A prazo
            </button>
          </div>
          {ehBoleto ? (
            <p className="mt-1 text-xs text-zinc-400">Boleto sempre gera título com vencimento.</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="formaId" className={classeRotulo}>
            Forma de pagamento
          </label>
          <select
            id="formaId"
            name="formaId"
            value={formaId}
            onChange={(evento) => aoEscolherForma(evento.target.value)}
            className={classeEntrada}
          >
            <option value="">Escolha…</option>
            {formas.map((opcao) => (
              <option key={opcao.id} value={opcao.id}>
                {opcao.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {condicao === 'a_vista' && geraCobranca ? (
        <div>
          <span className={classeRotulo}>Recebimento *</span>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1" role="group">
            <button
              type="button"
              onClick={() => definirCobrar(true)}
              aria-pressed={cobrar}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                cobrar ? 'text-marca-800 bg-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Gerar cobrança
            </button>
            <button
              type="button"
              onClick={() => definirCobrar(false)}
              aria-pressed={!cobrar}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                !cobrar ? 'text-marca-800 bg-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Já recebi
            </button>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {cobrar
              ? 'A conta fica em aberto até o cliente pagar — nada entra no caixa antes disso.'
              : 'O dinheiro já está com você: a venda nasce quitada e nenhuma cobrança é gerada.'}
          </p>
        </div>
      ) : null}

      {condicao === 'a_prazo' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="vencimento" className={classeRotulo}>
              1º vencimento *
            </label>
            <input
              id="vencimento"
              name="vencimento"
              type="date"
              required
              value={vencimento}
              onChange={(evento) => definirVencimento(evento.target.value)}
              className={classeEntrada}
            />
          </div>
          {permiteParcelas ? (
            <>
              <div>
                <label htmlFor="parcelas" className={classeRotulo}>
                  Parcelas
                </label>
                <select
                  id="parcelas"
                  name="parcelas"
                  value={parcelas}
                  onChange={(evento) => definirParcelas(Number(evento.target.value))}
                  className={classeEntrada}
                >
                  {Array.from({ length: maximoDeParcelas }, (_, indice) => indice + 1).map(
                    (numero) => (
                      <option key={numero} value={numero}>
                        {numero}×
                        {totalCentavos > 0
                          ? ` de ${formatarCentavos(Math.floor(totalCentavos / numero))}`
                          : ''}
                      </option>
                    ),
                  )}
                </select>
              </div>
              {parcelas > 1 ? (
                <div>
                  <label htmlFor="intervalo" className={classeRotulo}>
                    Intervalo (dias)
                  </label>
                  <input
                    id="intervalo"
                    type="number"
                    min={7}
                    max={60}
                    step={1}
                    value={intervalo}
                    onChange={(evento) => {
                      const valor = Number(evento.target.value)
                      if (Number.isInteger(valor)) {
                        definirIntervalo(Math.min(Math.max(valor, 7), 60))
                      }
                    }}
                    className={classeEntrada}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <input type="hidden" name="parcelas" value={1} />
          )}
        </div>
      ) : null}

      {previa.length > 0 && totalCentavos > 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <ul className="space-y-1">
            {previa.map((parcela) => (
              <li key={parcela.numero} className="flex justify-between text-sm text-zinc-700">
                <span>
                  Parcela {parcela.numero}/{previa.length} · vence{' '}
                  {dataCurtaDeIso(parcela.vencimento)}
                </span>
                <span className="font-semibold">{formatarCentavos(parcela.valorCentavos)}</span>
              </li>
            ))}
          </ul>
          {geraCobranca ? (
            <p className="mt-2 border-t border-zinc-200 pt-2 text-xs text-zinc-500">
              {notaDaCobranca}
            </p>
          ) : null}
        </div>
      ) : cobrarAVista ? (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-500">
          {notaDaCobranca}
        </p>
      ) : null}
    </div>
  )
}
