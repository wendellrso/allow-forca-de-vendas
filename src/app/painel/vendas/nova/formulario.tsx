'use client'

import Link from 'next/link'
import { useActionState, useMemo, useState } from 'react'
import { formatarCentavos } from '@/dominio/dinheiro'
import { calcularTotalCentavos } from '@/dominio/venda'
import { type FormaDePagamento } from '@/lib/tipos'
import { classeBotaoPrimario, classeEntrada, classeRotulo, MensagemErro } from '@/componentes/ui'
import { Avatar } from '@/componentes/avatar'
import { criarVendaManual, type EstadoAcaoVenda } from '../acoes'
import { CamposDePagamento } from '../campos-de-pagamento'

interface ClienteOpcao {
  id: string
  name: string
  city: string
  state: string
  phone: string | null
}

interface ProdutoOpcao {
  id: string
  name: string
  price_cents: number
  unit: string
  stock_quantity: number
  image_url: string | null
}

function normalizar(texto: string): string {
  return texto.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function FormularioVendaManual({
  clientes,
  produtos,
  formas,
}: {
  clientes: ClienteOpcao[]
  produtos: ProdutoOpcao[]
  formas: FormaDePagamento[]
}) {
  const [estado, acao, pendente] = useActionState<EstadoAcaoVenda, FormData>(criarVendaManual, {})
  const [clienteId, definirClienteId] = useState('')
  const [buscaCliente, definirBuscaCliente] = useState('')
  const [buscaProduto, definirBuscaProduto] = useState('')
  const [quantidades, definirQuantidades] = useState<Record<string, number>>({})

  const clienteEscolhido = clientes.find((cliente) => cliente.id === clienteId)

  const clientesFiltrados = useMemo(() => {
    const termo = normalizar(buscaCliente.trim())
    const lista =
      termo === ''
        ? clientes
        : clientes.filter(
            (cliente) =>
              normalizar(cliente.name).includes(termo) || normalizar(cliente.city).includes(termo),
          )
    return lista.slice(0, 6)
  }, [buscaCliente, clientes])

  const produtosFiltrados = useMemo(() => {
    const termo = normalizar(buscaProduto.trim())
    return termo === ''
      ? produtos
      : produtos.filter((produto) => normalizar(produto.name).includes(termo))
  }, [buscaProduto, produtos])

  const itens = useMemo(
    () =>
      Object.entries(quantidades)
        .filter(([, quantidade]) => quantidade > 0)
        .map(([produtoId, quantidade]) => ({ produtoId, quantidade })),
    [quantidades],
  )

  function alterarQuantidade(produtoId: string, delta: number) {
    definirQuantidades((atuais) => {
      const nova = Math.min(Math.max((atuais[produtoId] ?? 0) + delta, 0), 999)
      return { ...atuais, [produtoId]: nova }
    })
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
      <input type="hidden" name="clienteId" value={clienteId} />

      {/* Passo 1 — Cliente, com busca de verdade */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <p className="mb-2 text-sm font-bold text-zinc-900">1 · Cliente</p>
        {clienteEscolhido !== undefined ? (
          <div className="bg-marca-50 border-marca-100 flex items-center gap-3 rounded-lg border p-3">
            <Avatar nome={clienteEscolhido.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-900">
                {clienteEscolhido.name}
              </p>
              <p className="text-xs text-zinc-500">
                {clienteEscolhido.city}/{clienteEscolhido.state}
                {clienteEscolhido.phone !== null ? ` · ${clienteEscolhido.phone}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                definirClienteId('')
                definirBuscaCliente('')
              }}
              className="text-marca-700 shrink-0 text-xs font-bold hover:underline"
            >
              Trocar
            </button>
          </div>
        ) : (
          <div>
            <label htmlFor="buscaCliente" className="sr-only">
              Buscar cliente
            </label>
            <input
              id="buscaCliente"
              type="search"
              placeholder="Busque por nome ou cidade…"
              value={buscaCliente}
              onChange={(evento) => definirBuscaCliente(evento.target.value)}
              className={classeEntrada}
            />
            <ul className="mt-2 divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200">
              {clientesFiltrados.length === 0 ? (
                <li className="px-3 py-3 text-sm text-zinc-500">
                  Nenhum cliente com esse nome.{' '}
                  <Link
                    href="/painel/clientes/novo"
                    className="text-marca-700 font-semibold hover:underline"
                  >
                    Cadastrar novo
                  </Link>
                </li>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <li key={cliente.id}>
                    <button
                      type="button"
                      onClick={() => definirClienteId(cliente.id)}
                      className="hover:bg-marca-50 flex w-full items-center gap-3 px-3 py-2 text-left"
                    >
                      <Avatar nome={cliente.name} tamanho="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-800">
                          {cliente.name}
                        </span>
                        <span className="block text-xs text-zinc-500">
                          {cliente.city}/{cliente.state}
                        </span>
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </section>

      {/* Passo 2 — Produtos, como no caixa do ERP */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <p className="mb-2 text-sm font-bold text-zinc-900">2 · Produtos</p>
        <label htmlFor="buscaProduto" className="sr-only">
          Buscar produto
        </label>
        <input
          id="buscaProduto"
          type="search"
          placeholder="Busque um produto…"
          value={buscaProduto}
          onChange={(evento) => definirBuscaProduto(evento.target.value)}
          className={`${classeEntrada} mb-3`}
        />
        <ul className="grid max-h-96 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {produtosFiltrados.map((produto) => {
            const quantidade = quantidades[produto.id] ?? 0
            return (
              <li
                key={produto.id}
                className={`overflow-hidden rounded-lg border transition-colors ${quantidade > 0 ? 'border-marca-600' : 'border-zinc-200'}`}
              >
                <button
                  type="button"
                  onClick={() => alterarQuantidade(produto.id, 1)}
                  className="w-full text-left"
                >
                  {produto.image_url !== null ? (
                    // eslint-disable-next-line @next/next/no-img-element -- imagem do Storage, sem otimizador no Worker
                    <img
                      src={produto.image_url}
                      alt=""
                      loading="lazy"
                      className="h-20 w-full bg-zinc-50 object-cover"
                    />
                  ) : (
                    <div className="grid h-20 w-full place-items-center bg-zinc-50 text-[10px] text-zinc-400">
                      sem foto
                    </div>
                  )}
                  <div className="p-2">
                    <p className="line-clamp-2 min-h-8 text-xs font-semibold text-zinc-800">
                      {produto.name}
                    </p>
                    <p className="text-marca-700 text-sm font-bold">
                      {formatarCentavos(produto.price_cents)}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {produto.stock_quantity} {produto.unit} em estoque
                    </p>
                  </div>
                </button>
                {quantidade > 0 ? (
                  <div className="bg-marca-700 flex items-center justify-between text-white">
                    <button
                      type="button"
                      onClick={() => alterarQuantidade(produto.id, -1)}
                      aria-label={`Tirar um ${produto.name}`}
                      className="h-8 w-10 text-lg font-bold hover:bg-white/10"
                    >
                      −
                    </button>
                    <span className="text-sm font-bold">{quantidade}</span>
                    <button
                      type="button"
                      onClick={() => alterarQuantidade(produto.id, 1)}
                      aria-label={`Adicionar um ${produto.name}`}
                      className="h-8 w-10 text-lg font-bold hover:bg-white/10"
                    >
                      +
                    </button>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>

        {itens.length > 0 ? (
          <div className="mt-3 rounded-lg bg-zinc-50 p-3">
            <p className="mb-1.5 text-[11px] font-bold tracking-wide text-zinc-500 uppercase">
              Resumo
            </p>
            <ul className="space-y-1 text-sm text-zinc-700">
              {itens.map((item) => {
                const produto = produtos.find((linha) => linha.id === item.produtoId)
                if (produto === undefined) {
                  return null
                }
                return (
                  <li key={item.produtoId} className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      {item.quantidade}x {produto.name}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-semibold">
                        {formatarCentavos(item.quantidade * produto.price_cents)}
                      </span>
                      <button
                        type="button"
                        onClick={() => alterarQuantidade(item.produtoId, -item.quantidade)}
                        aria-label={`Remover ${produto.name}`}
                        className="text-zinc-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className="mt-2 flex justify-between border-t border-zinc-200 pt-2 font-bold text-zinc-900">
              <span>Total</span>
              <span>{formatarCentavos(totalCentavos)}</span>
            </p>
          </div>
        ) : null}
      </section>

      {/* Passo 3 — Pagamento, com parcelas e boleto preparado (simulação) */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <p className="mb-2 text-sm font-bold text-zinc-900">3 · Pagamento</p>
        <CamposDePagamento formas={formas} totalCentavos={totalCentavos} />
        <div className="mt-3">
          <label htmlFor="observacao" className={classeRotulo}>
            Observação
          </label>
          <textarea id="observacao" name="observacao" rows={2} className={classeEntrada} />
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {itens.length === 0
            ? 'Adicione produtos para continuar.'
            : `${itens.length} ${itens.length === 1 ? 'produto' : 'produtos'} · ${formatarCentavos(totalCentavos)}`}
        </p>
        <button
          type="submit"
          disabled={pendente || itens.length === 0 || clienteId === ''}
          className={classeBotaoPrimario}
        >
          {pendente ? 'Registrando…' : 'Registrar venda'}
        </button>
      </div>
      <p className="text-xs text-zinc-400">
        A venda entra confirmada: o estoque baixa e o contas a receber é criado na hora.
      </p>
    </form>
  )
}
