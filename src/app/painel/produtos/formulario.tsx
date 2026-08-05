'use client'

import { useActionState } from 'react'
import { formatarCentavos } from '@/dominio/dinheiro'
import { type Produto } from '@/lib/tipos'
import {
  classeBotaoPrimario,
  classeEntrada,
  classeRotulo,
  ErroDeCampo,
  MensagemErro,
} from '@/componentes/ui'
import { salvarProduto, type EstadoFormularioProduto } from './acoes'

export function FormularioProduto({ produto }: { produto?: Produto }) {
  const [estado, acao, pendente] = useActionState<EstadoFormularioProduto, FormData>(
    salvarProduto,
    {},
  )
  const erros = estado.erros ?? {}
  const precoInicial =
    produto === undefined ? '' : formatarCentavos(produto.price_cents).replace('R$', '').trim()

  return (
    <form action={acao} className="space-y-4" noValidate>
      <MensagemErro mensagem={erros.geral} />
      {produto !== undefined ? <input type="hidden" name="id" value={produto.id} /> : null}
      <div>
        <label htmlFor="nome" className={classeRotulo}>
          Nome *
        </label>
        <input
          id="nome"
          name="nome"
          required
          defaultValue={produto?.name}
          className={classeEntrada}
        />
        <ErroDeCampo mensagem={erros.nome} />
      </div>
      <div>
        <label htmlFor="descricao" className={classeRotulo}>
          Descrição (aparece no catálogo)
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={2}
          defaultValue={produto?.description ?? ''}
          className={classeEntrada}
        />
        <ErroDeCampo mensagem={erros.descricao} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="preco" className={classeRotulo}>
            Preço (R$) *
          </label>
          <input
            id="preco"
            name="preco"
            inputMode="decimal"
            placeholder="49,90"
            required
            defaultValue={precoInicial}
            className={classeEntrada}
          />
          <ErroDeCampo mensagem={erros.preco} />
        </div>
        <div>
          <label htmlFor="unidade" className={classeRotulo}>
            Unidade *
          </label>
          <input
            id="unidade"
            name="unidade"
            defaultValue={produto?.unit ?? 'un'}
            className={classeEntrada}
          />
          <ErroDeCampo mensagem={erros.unidade} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="estoqueMinimo" className={classeRotulo}>
            Estoque mínimo
          </label>
          <input
            id="estoqueMinimo"
            name="estoqueMinimo"
            type="number"
            min={0}
            step={1}
            defaultValue={produto?.min_stock ?? ''}
            className={classeEntrada}
          />
          <ErroDeCampo mensagem={erros.estoqueMinimo} />
        </div>
        <div>
          <label htmlFor="ncm" className={classeRotulo}>
            NCM (fiscal, opcional)
          </label>
          <input
            id="ncm"
            name="ncm"
            inputMode="numeric"
            placeholder="8 dígitos"
            defaultValue={produto?.ncm ?? ''}
            className={classeEntrada}
          />
          <ErroDeCampo mensagem={erros.ncm} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          name="ativo"
          defaultChecked={produto?.active ?? true}
          className="text-marca-700 focus:ring-marca-100 h-4 w-4 rounded border-zinc-300"
        />
        Ativo (visível no catálogo e nas vendas)
      </label>
      <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
        {pendente ? 'Salvando…' : 'Salvar produto'}
      </button>
    </form>
  )
}
