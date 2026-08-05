'use client'

import { useActionState } from 'react'
import { classeBotaoSecundario, classeEntrada, classeRotulo, MensagemErro } from '@/componentes/ui'
import { movimentarEstoque, type EstadoMovimento } from '../acoes'

export function FormularioMovimento({ produtoId }: { produtoId: string }) {
  const [estado, acao, pendente] = useActionState<EstadoMovimento, FormData>(movimentarEstoque, {})

  return (
    <form
      action={acao}
      className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4"
      noValidate
    >
      <MensagemErro mensagem={estado.erro} />
      {estado.sucesso !== undefined ? (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {estado.sucesso}
        </p>
      ) : null}
      <input type="hidden" name="produtoId" value={produtoId} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="tipo" className={classeRotulo}>
            Movimento
          </label>
          <select id="tipo" name="tipo" className={classeEntrada}>
            <option value="entrada">Entrada (compra/reposição)</option>
            <option value="ajuste">Ajuste (correção +/-)</option>
          </select>
        </div>
        <div>
          <label htmlFor="quantidade" className={classeRotulo}>
            Quantidade
          </label>
          <input
            id="quantidade"
            name="quantidade"
            type="number"
            step={1}
            required
            className={classeEntrada}
          />
        </div>
      </div>
      <div>
        <label htmlFor="motivo" className={classeRotulo}>
          Motivo
        </label>
        <input
          id="motivo"
          name="motivo"
          placeholder="Ex.: reposição da fábrica"
          className={classeEntrada}
        />
      </div>
      <button type="submit" disabled={pendente} className={classeBotaoSecundario}>
        {pendente ? 'Registrando…' : 'Registrar movimento'}
      </button>
    </form>
  )
}
