'use client'

import { useActionState, useState } from 'react'
import { formatarCentavos } from '@/dominio/dinheiro'
import { calcularTotalCentavos } from '@/dominio/venda'
import {
  classeBotaoPrimario,
  classeBotaoSecundario,
  classeEntrada,
  classeRotulo,
  MensagemErro,
} from '@/componentes/ui'
import { criarVendaManual, type EstadoAcaoVenda } from '../acoes'

interface ClienteOpcao {
  id: string
  name: string
  city: string
  state: string
}

interface ProdutoOpcao {
  id: string
  name: string
  price_cents: number
  unit: string
  stock_quantity: number
}

interface ItemEscolhido {
  produtoId: string
  quantidade: number
}

export function FormularioVendaManual({
  clientes,
  produtos,
}: {
  clientes: ClienteOpcao[]
  produtos: ProdutoOpcao[]
}) {
  const [estado, acao, pendente] = useActionState<EstadoAcaoVenda, FormData>(criarVendaManual, {})
  const [itens, definirItens] = useState<ItemEscolhido[]>([])
  const [produtoSelecionado, definirProdutoSelecionado] = useState('')
  const [quantidade, definirQuantidade] = useState('1')
  const [condicao, definirCondicao] = useState('a_vista')

  function adicionarItem() {
    const produto = produtos.find((opcao) => opcao.id === produtoSelecionado)
    const quantidadeNumerica = Number(quantidade)
    if (
      produto === undefined ||
      !Number.isInteger(quantidadeNumerica) ||
      quantidadeNumerica < 1 ||
      quantidadeNumerica > 999
    ) {
      return
    }
    definirItens((atuais) => {
      const existente = atuais.find((item) => item.produtoId === produto.id)
      if (existente !== undefined) {
        return atuais.map((item) =>
          item.produtoId === produto.id
            ? { ...item, quantidade: Math.min(item.quantidade + quantidadeNumerica, 999) }
            : item,
        )
      }
      return [...atuais, { produtoId: produto.id, quantidade: quantidadeNumerica }]
    })
    definirQuantidade('1')
  }

  function removerItem(produtoId: string) {
    definirItens((atuais) => atuais.filter((item) => item.produtoId !== produtoId))
  }

  const totalCentavos = calcularTotalCentavos(
    itens.map((item) => ({
      quantidade: item.quantidade,
      precoUnitarioCentavos:
        produtos.find((produto) => produto.id === item.produtoId)?.price_cents ?? 0,
    })),
  )

  return (
    <form action={acao} className="space-y-4" noValidate>
      <MensagemErro mensagem={estado.erro} />
      <input type="hidden" name="itens" value={JSON.stringify(itens)} />

      <div>
        <label htmlFor="clienteId" className={classeRotulo}>
          Cliente *
        </label>
        <select id="clienteId" name="clienteId" required className={classeEntrada}>
          <option value="">Escolha o cliente…</option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.name} — {cliente.city}/{cliente.state}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="rounded-xl border border-zinc-200 bg-white p-4">
        <legend className="px-1 text-sm font-medium text-zinc-700">Produtos</legend>
        <div className="flex gap-2">
          <select
            aria-label="Produto"
            value={produtoSelecionado}
            onChange={(evento) => definirProdutoSelecionado(evento.target.value)}
            className={classeEntrada}
          >
            <option value="">Escolha…</option>
            {produtos.map((produto) => (
              <option key={produto.id} value={produto.id}>
                {produto.name} ({formatarCentavos(produto.price_cents)} · {produto.stock_quantity}{' '}
                {produto.unit})
              </option>
            ))}
          </select>
          <input
            aria-label="Quantidade"
            type="number"
            min={1}
            max={999}
            value={quantidade}
            onChange={(evento) => definirQuantidade(evento.target.value)}
            className={`${classeEntrada} w-20`}
          />
          <button
            type="button"
            onClick={adicionarItem}
            className={`${classeBotaoSecundario} w-auto`}
          >
            +
          </button>
        </div>
        {itens.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Nenhum produto adicionado.</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {itens.map((item) => {
              const produto = produtos.find((opcao) => opcao.id === item.produtoId)
              if (produto === undefined) {
                return null
              }
              return (
                <li
                  key={item.produtoId}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm"
                >
                  <span>
                    {item.quantidade}x {produto.name}
                  </span>
                  <span className="flex items-center gap-3">
                    <strong>{formatarCentavos(item.quantidade * produto.price_cents)}</strong>
                    <button
                      type="button"
                      onClick={() => removerItem(item.produtoId)}
                      aria-label={`Remover ${produto.name}`}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remover
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        <p className="mt-3 text-right text-base font-bold text-zinc-900">
          Total: {formatarCentavos(totalCentavos)}
        </p>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="condicao" className={classeRotulo}>
            Pagamento *
          </label>
          <select
            id="condicao"
            name="condicao"
            value={condicao}
            onChange={(evento) => definirCondicao(evento.target.value)}
            className={classeEntrada}
          >
            <option value="a_vista">À vista</option>
            <option value="a_prazo">A prazo</option>
          </select>
        </div>
        {condicao === 'a_prazo' ? (
          <div>
            <label htmlFor="vencimento" className={classeRotulo}>
              Vencimento *
            </label>
            <input
              id="vencimento"
              name="vencimento"
              type="date"
              required
              className={classeEntrada}
            />
          </div>
        ) : null}
      </div>

      <div>
        <label htmlFor="observacao" className={classeRotulo}>
          Observação
        </label>
        <textarea id="observacao" name="observacao" rows={2} className={classeEntrada} />
      </div>

      <button
        type="submit"
        disabled={pendente || itens.length === 0}
        className={classeBotaoPrimario}
      >
        {pendente ? 'Registrando…' : 'Registrar venda'}
      </button>
      <p className="text-sm text-zinc-500">
        A venda entra confirmada: o estoque é baixado e o contas a receber é criado na hora.
      </p>
    </form>
  )
}
