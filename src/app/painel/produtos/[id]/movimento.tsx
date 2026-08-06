'use client'

import { useActionState, useState } from 'react'
import { classeBotaoPrimario, classeEntrada, classeRotulo, MensagemErro } from '@/componentes/ui'
import { movimentarEstoque, type EstadoMovimento } from '../acoes'

const ATALHOS = [1, 5, 10, 20] as const

export function FormularioMovimento({ produtoId }: { produtoId: string }) {
  const [estado, acao, pendente] = useActionState<EstadoMovimento, FormData>(movimentarEstoque, {})
  const [tipo, definirTipo] = useState<'entrada' | 'ajuste'>('entrada')
  const [quantidade, definirQuantidade] = useState('')

  const numero = Number(quantidade)
  const quantidadeValida =
    quantidade !== '' &&
    Number.isInteger(numero) &&
    numero !== 0 &&
    (tipo === 'ajuste' || numero > 0)

  function somar(delta: number) {
    const atual = Number(quantidade)
    const base = Number.isInteger(atual) ? atual : 0
    const proximo = base + delta
    definirQuantidade(String(tipo === 'entrada' ? Math.max(proximo, 1) : proximo))
  }

  return (
    <form action={acao} className="space-y-3" noValidate>
      <MensagemErro mensagem={estado.erro} />
      {estado.sucesso !== undefined ? (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {estado.sucesso} ✓
        </p>
      ) : null}
      <input type="hidden" name="produtoId" value={produtoId} />
      <input type="hidden" name="tipo" value={tipo} />

      <div>
        <span className={classeRotulo}>O que aconteceu?</span>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1" role="group">
          <button
            type="button"
            onClick={() => {
              definirTipo('entrada')
              if (Number(quantidade) < 0) {
                definirQuantidade('')
              }
            }}
            aria-pressed={tipo === 'entrada'}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              tipo === 'entrada'
                ? 'text-marca-800 bg-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            📦 Entrada
          </button>
          <button
            type="button"
            onClick={() => definirTipo('ajuste')}
            aria-pressed={tipo === 'ajuste'}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              tipo === 'ajuste'
                ? 'text-marca-800 bg-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            ✏️ Ajuste
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          {tipo === 'entrada'
            ? 'Chegou mercadoria: compra ou reposição da fábrica.'
            : 'Correção de contagem — aceita valor negativo, ex.: -2.'}
        </p>
      </div>

      <div>
        <label htmlFor="quantidade" className={classeRotulo}>
          Quantidade *
        </label>
        <div className="flex items-stretch gap-2">
          <button
            type="button"
            onClick={() => somar(-1)}
            aria-label="Diminuir quantidade"
            className="w-11 shrink-0 rounded-lg border border-zinc-300 bg-white text-lg font-bold text-zinc-600 hover:bg-zinc-100"
          >
            −
          </button>
          <input
            id="quantidade"
            name="quantidade"
            type="number"
            step={1}
            required
            value={quantidade}
            onChange={(evento) => definirQuantidade(evento.target.value)}
            placeholder="0"
            className={`${classeEntrada} text-center text-lg font-bold`}
          />
          <button
            type="button"
            onClick={() => somar(1)}
            aria-label="Aumentar quantidade"
            className="w-11 shrink-0 rounded-lg border border-zinc-300 bg-white text-lg font-bold text-zinc-600 hover:bg-zinc-100"
          >
            +
          </button>
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {ATALHOS.map((atalho) => (
            <button
              key={atalho}
              type="button"
              onClick={() => somar(atalho)}
              className="hover:border-marca-300 hover:text-marca-700 rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-zinc-500"
            >
              +{atalho}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="motivo" className={classeRotulo}>
          Motivo
        </label>
        <input
          id="motivo"
          name="motivo"
          placeholder={tipo === 'entrada' ? 'Ex.: reposição da fábrica' : 'Ex.: contagem da mala'}
          className={classeEntrada}
        />
      </div>

      <button
        type="submit"
        disabled={pendente || !quantidadeValida}
        className={classeBotaoPrimario}
      >
        {pendente ? 'Registrando…' : tipo === 'entrada' ? 'Registrar entrada' : 'Registrar ajuste'}
      </button>
    </form>
  )
}
