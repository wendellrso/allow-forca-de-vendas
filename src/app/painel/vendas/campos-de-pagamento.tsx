'use client'

import { useState } from 'react'
import { formatarCentavos } from '@/dominio/dinheiro'
import { montarParcelas, somarDias } from '@/dominio/parcelas'
import { dataCurtaDeIso, hojeIso } from '@/dominio/tempo'
import { type FormaDePagamento } from '@/lib/tipos'
import { classeEntrada, classeRotulo } from '@/componentes/ui'

/**
 * Condição, forma, parcelas e vencimentos — o mesmo bloco na Nova venda e na
 * confirmação do pedido. Boleto força a condição a prazo e declara se a
 * emissão será real (provedor configurado) ou simulada.
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

  const forma = formas.find((opcao) => opcao.id === formaId)
  const ehBoleto = forma?.kind === 'boleto'
  const permiteParcelas = condicao === 'a_prazo' && (forma?.allows_installments ?? false)
  const maximoDeParcelas = forma?.max_installments ?? 1

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

  return (
    <div className="space-y-3">
      <input type="hidden" name="condicao" value={condicao} />
      <input type="hidden" name="intervaloDias" value={intervalo} />

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
          {ehBoleto ? (
            <p className="mt-2 border-t border-zinc-200 pt-2 text-xs text-zinc-500">
              {emissaoReal ? (
                <>
                  🧾 Os boletos serão <span className="font-semibold">emitidos no Asaas</span> na
                  confirmação — prontos para enviar ao cliente.
                </>
              ) : (
                <>
                  🧾 Os boletos serão <span className="font-semibold">preparados em simulação</span>{' '}
                  — nenhuma cobrança bancária real é emitida nesta etapa.
                </>
              )}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
