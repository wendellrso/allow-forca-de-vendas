'use client'

import { useActionState, useRef, useState } from 'react'
import { ufsParaSelecao } from '@/dominio/estados'
import { type CategoriaDeDespesa } from '@/lib/tipos'
import {
  classeBotaoPrimario,
  classeBotaoSecundario,
  classeEntrada,
  classeRotulo,
  ErroDeCampo,
  MensagemErro,
} from '@/componentes/ui'
import {
  arquivarCategoria,
  criarCategoria,
  excluirDespesa,
  marcarDespesaPaga,
  registrarRecebimento,
  salvarDespesa,
  type EstadoCategoria,
  type EstadoDespesa,
  type EstadoRecebimento,
} from './acoes'

export function FormularioRecebimento({ contaId }: { contaId: string }) {
  const [estado, acao, pendente] = useActionState<EstadoRecebimento, FormData>(
    registrarRecebimento,
    {},
  )

  return (
    <form action={acao} className="flex items-start gap-2" noValidate>
      <input type="hidden" name="contaId" value={contaId} />
      <div>
        <label htmlFor={`valor-${contaId}`} className="sr-only">
          Valor recebido
        </label>
        <input
          id={`valor-${contaId}`}
          name="valor"
          inputMode="decimal"
          placeholder="Valor, ex.: 150,00"
          className={`${classeEntrada} w-40 py-1.5 text-sm`}
        />
        <ErroDeCampo mensagem={estado.erro} />
      </div>
      <button
        type="submit"
        disabled={pendente}
        className="text-xs font-semibold text-emerald-700 hover:underline disabled:opacity-60"
      >
        {pendente ? '…' : 'Receber'}
      </button>
    </form>
  )
}

export function FormularioDespesa({ categorias }: { categorias: CategoriaDeDespesa[] }) {
  const [estado, acao, pendente] = useActionState<EstadoDespesa, FormData>(salvarDespesa, {})
  const [estadoCategoria, acaoCategoria, criandoCategoria] = useActionState<
    EstadoCategoria,
    FormData
  >(criarCategoria, {})
  const [criandoNova, definirCriandoNova] = useState(false)
  const [categoriaEscolhida, definirCategoriaEscolhida] = useState('')
  const [criadaAplicada, definirCriadaAplicada] = useState<string | undefined>(undefined)
  const referenciaNome = useRef<HTMLInputElement>(null)
  const erros = estado.erros ?? {}
  const hoje = new Date().toISOString().slice(0, 10)

  // Categoria recém-criada já sai selecionada: ajuste durante a
  // renderização, comparando com a última aplicada.
  if (estadoCategoria.criadaId !== undefined && estadoCategoria.criadaId !== criadaAplicada) {
    definirCriadaAplicada(estadoCategoria.criadaId)
    definirCategoriaEscolhida(estadoCategoria.criadaId)
    definirCriandoNova(false)
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="mb-3 font-bold text-zinc-900">Nova despesa</p>
      <form action={acao} className="space-y-3" noValidate>
        <MensagemErro mensagem={erros.geral} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="categoriaId" className={classeRotulo}>
              Categoria *
            </label>
            <select
              id="categoriaId"
              name="categoriaId"
              value={categoriaEscolhida}
              onChange={(evento) => definirCategoriaEscolhida(evento.target.value)}
              className={classeEntrada}
            >
              <option value="">Escolha…</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.name}
                </option>
              ))}
            </select>
            <ErroDeCampo mensagem={erros.categoriaId} />
            <button
              type="button"
              onClick={() => {
                definirCriandoNova(true)
                setTimeout(() => referenciaNome.current?.focus(), 0)
              }}
              className="text-marca-700 mt-1 text-xs font-semibold hover:underline"
            >
              + Nova categoria
            </button>
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

      {criandoNova ? (
        <form action={acaoCategoria} className="mt-3 border-t border-zinc-100 pt-3" noValidate>
          <label htmlFor="nome" className={classeRotulo}>
            Nome da nova categoria
          </label>
          <div className="flex gap-2">
            <input
              id="nome"
              name="nome"
              ref={referenciaNome}
              placeholder="Ex.: Pedágio"
              className={classeEntrada}
            />
            <button
              type="submit"
              disabled={criandoCategoria}
              className={`${classeBotaoSecundario} w-auto`}
            >
              {criandoCategoria ? '…' : 'Criar'}
            </button>
            <button
              type="button"
              onClick={() => definirCriandoNova(false)}
              className="text-sm text-zinc-500 hover:text-zinc-800"
            >
              Cancelar
            </button>
          </div>
          <ErroDeCampo mensagem={estadoCategoria.erro} />
        </form>
      ) : null}
    </div>
  )
}

export function BotoesDespesa({ despesaId, aPagar }: { despesaId: string; aPagar: boolean }) {
  const [confirmandoExclusao, definirConfirmandoExclusao] = useState(false)

  if (confirmandoExclusao) {
    return (
      <form action={excluirDespesa} className="flex items-center justify-end gap-2">
        <input type="hidden" name="id" value={despesaId} />
        <span className="text-xs text-red-700">Excluir?</span>
        <button type="submit" className="text-xs font-semibold text-red-700 hover:underline">
          Sim
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
    <div className="flex items-center justify-end gap-3">
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

export function GerenciarCategorias({ categorias }: { categorias: CategoriaDeDespesa[] }) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-sm font-medium text-zinc-500">
        Gerenciar categorias ({categorias.length})
      </summary>
      <ul className="mt-2 space-y-1">
        {categorias.map((categoria) => (
          <li
            key={categoria.id}
            className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-1.5 text-sm"
          >
            <span>{categoria.name}</span>
            <form action={arquivarCategoria}>
              <input type="hidden" name="id" value={categoria.id} />
              <button
                type="submit"
                className="text-xs font-medium text-zinc-400 hover:text-red-700"
              >
                Arquivar
              </button>
            </form>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-zinc-400">
        Arquivar tira a categoria das novas despesas; as antigas continuam com ela.
      </p>
    </details>
  )
}
