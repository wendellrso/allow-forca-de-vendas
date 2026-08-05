'use client'

import { useActionState, useState } from 'react'
import { ufsParaSelecao } from '@/dominio/estados'
import { CATEGORIAS_DESPESA, ROTULO_CATEGORIA } from '@/dominio/relatorio'
import {
  classeBotaoPrimario,
  classeBotaoSecundario,
  classeEntrada,
  classeRotulo,
  ErroDeCampo,
  MensagemErro,
} from '@/componentes/ui'
import {
  excluirDespesa,
  marcarDespesaPaga,
  registrarRecebimento,
  salvarDespesa,
  type EstadoDespesa,
  type EstadoRecebimento,
} from './acoes'

export function FormularioRecebimento({ contaId }: { contaId: string }) {
  const [estado, acao, pendente] = useActionState<EstadoRecebimento, FormData>(
    registrarRecebimento,
    {},
  )

  return (
    <form action={acao} className="mt-2 flex items-start gap-2" noValidate>
      <input type="hidden" name="contaId" value={contaId} />
      <div className="flex-1">
        <label htmlFor={`valor-${contaId}`} className="sr-only">
          Valor recebido
        </label>
        <input
          id={`valor-${contaId}`}
          name="valor"
          inputMode="decimal"
          placeholder="Valor recebido, ex.: 150,00"
          className={classeEntrada}
        />
        <ErroDeCampo mensagem={estado.erro} />
      </div>
      <button type="submit" disabled={pendente} className={`${classeBotaoSecundario} w-auto`}>
        {pendente ? '…' : 'Receber'}
      </button>
    </form>
  )
}

export function FormularioDespesa() {
  const [estado, acao, pendente] = useActionState<EstadoDespesa, FormData>(salvarDespesa, {})
  const erros = estado.erros ?? {}
  const hoje = new Date().toISOString().slice(0, 10)

  return (
    <form
      action={acao}
      className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4"
      noValidate
    >
      <p className="font-medium text-zinc-800">Nova despesa</p>
      <MensagemErro mensagem={erros.geral} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="categoria" className={classeRotulo}>
            Categoria *
          </label>
          <select id="categoria" name="categoria" className={classeEntrada}>
            {CATEGORIAS_DESPESA.map((categoria) => (
              <option key={categoria} value={categoria}>
                {ROTULO_CATEGORIA[categoria]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="valor" className={classeRotulo}>
            Valor (R$) *
          </label>
          <input
            id="valor"
            name="valor"
            inputMode="decimal"
            placeholder="85,50"
            required
            className={classeEntrada}
          />
          <ErroDeCampo mensagem={erros.valor} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="data" className={classeRotulo}>
            Data *
          </label>
          <input
            id="data"
            name="data"
            type="date"
            defaultValue={hoje}
            required
            className={classeEntrada}
          />
          <ErroDeCampo mensagem={erros.data} />
        </div>
        <div>
          <label htmlFor="situacao" className={classeRotulo}>
            Situação *
          </label>
          <select id="situacao" name="situacao" className={classeEntrada}>
            <option value="pago">Pago</option>
            <option value="a_pagar">A pagar</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <div>
          <label htmlFor="cidade" className={classeRotulo}>
            Cidade
          </label>
          <input id="cidade" name="cidade" className={classeEntrada} />
          <ErroDeCampo mensagem={erros.cidade} />
        </div>
        <div>
          <label htmlFor="uf" className={classeRotulo}>
            UF
          </label>
          <select id="uf" name="uf" defaultValue="" className={classeEntrada}>
            <option value="">—</option>
            {ufsParaSelecao().map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="descricao" className={classeRotulo}>
          Descrição
        </label>
        <input
          id="descricao"
          name="descricao"
          placeholder="Ex.: pousada em Caruaru"
          className={classeEntrada}
        />
        <ErroDeCampo mensagem={erros.descricao} />
      </div>
      <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
        {pendente ? 'Salvando…' : 'Registrar despesa'}
      </button>
    </form>
  )
}

export function BotoesDespesa({ despesaId, aPagar }: { despesaId: string; aPagar: boolean }) {
  const [confirmandoExclusao, definirConfirmandoExclusao] = useState(false)

  if (confirmandoExclusao) {
    return (
      <form action={excluirDespesa} className="flex items-center gap-2">
        <input type="hidden" name="id" value={despesaId} />
        <span className="text-xs text-red-700">Excluir mesmo?</span>
        <button type="submit" className="text-xs font-semibold text-red-700 hover:underline">
          Sim, excluir
        </button>
        <button
          type="button"
          onClick={() => definirConfirmandoExclusao(false)}
          className="text-xs font-medium text-zinc-500 hover:underline"
        >
          Não
        </button>
      </form>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {aPagar ? (
        <form action={marcarDespesaPaga}>
          <input type="hidden" name="id" value={despesaId} />
          <button type="submit" className="text-xs font-semibold text-emerald-700 hover:underline">
            Marcar pago
          </button>
        </form>
      ) : null}
      <button
        type="button"
        onClick={() => definirConfirmandoExclusao(true)}
        className="text-xs font-medium text-zinc-400 hover:text-red-700"
      >
        Excluir
      </button>
    </div>
  )
}
