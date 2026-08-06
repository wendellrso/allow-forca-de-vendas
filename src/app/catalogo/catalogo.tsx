'use client'

import { useActionState, useMemo, useState } from 'react'
import { formatarCentavos } from '@/dominio/dinheiro'
import { ufsParaSelecao } from '@/dominio/estados'
import {
  classeBotaoPrimario,
  classeBotaoSecundario,
  classeCartao,
  classeEntrada,
  classeRotulo,
  ErroDeCampo,
  MensagemErro,
} from '@/componentes/ui'
import { fecharPedido, type EstadoPedido } from './acoes'

interface ProdutoDoCatalogo {
  id: string
  name: string
  description: string | null
  price_cents: number
  unit: string
  image_url: string | null
}

function EtapasDoFechamento({ atual }: { atual: 1 | 2 | 3 }) {
  const etapas = ['Sacola', 'Seus dados', 'WhatsApp'] as const
  return (
    <ol className="mb-4 flex items-center justify-center gap-1 text-[11px]">
      {etapas.map((rotulo, indice) => {
        const numero = (indice + 1) as 1 | 2 | 3
        const feita = numero < atual
        const ativa = numero === atual
        return (
          <li key={rotulo} className="flex items-center gap-1">
            {indice > 0 ? <span className="w-5 border-t border-zinc-300" aria-hidden /> : null}
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${
                ativa
                  ? 'bg-marca-700 text-white'
                  : feita
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-zinc-100 text-zinc-400'
              }`}
            >
              <span aria-hidden>{feita ? '✓' : numero}</span>
              {rotulo}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function Catalogo({ produtos }: { produtos: ProdutoDoCatalogo[] }) {
  const [quantidades, definirQuantidades] = useState<Record<string, number>>({})
  const [fechando, definirFechando] = useState(false)
  const [estado, acao, pendente] = useActionState<EstadoPedido, FormData>(fecharPedido, {})
  const erros = estado.erros ?? {}

  const itens = useMemo(
    () =>
      Object.entries(quantidades)
        .filter(([, quantidade]) => quantidade > 0)
        .map(([produtoId, quantidade]) => ({ produtoId, quantidade })),
    [quantidades],
  )
  const totalCentavos = itens.reduce((soma, item) => {
    const produto = produtos.find((linha) => linha.id === item.produtoId)
    return soma + (produto?.price_cents ?? 0) * item.quantidade
  }, 0)
  const totalDeItens = itens.reduce((soma, item) => soma + item.quantidade, 0)

  function alterarQuantidade(produtoId: string, delta: number) {
    definirQuantidades((atuais) => {
      const nova = Math.min(Math.max((atuais[produtoId] ?? 0) + delta, 0), 999)
      return { ...atuais, [produtoId]: nova }
    })
  }

  if (estado.urlWhatsApp !== undefined) {
    return (
      <div className={`${classeCartao} mx-auto max-w-md p-6 text-center`}>
        <EtapasDoFechamento atual={3} />
        <span
          aria-hidden
          className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700"
        >
          ✓
        </span>
        <p className="font-marca mt-3 text-2xl font-bold text-zinc-900">Pedido registrado!</p>
        <p className="mt-1 text-sm text-zinc-600">
          Falta só um passo: enviar a mensagem que já está pronta no seu WhatsApp para concluir com
          a vendedora.
        </p>
        <a
          href={estado.urlWhatsApp}
          className="bg-dourado-500 text-marca-900 focus:ring-dourado-300 mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-bold hover:brightness-110 focus:ring-2 focus:outline-none"
        >
          💬 Abrir o WhatsApp
        </a>
        <p className="mt-3 text-xs text-zinc-400">
          Se o WhatsApp não abrir, toque no botão de novo.
        </p>
      </div>
    )
  }

  return (
    <div>
      {!fechando ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {produtos.map((produto) => {
            const quantidade = quantidades[produto.id] ?? 0
            return (
              <li
                key={produto.id}
                className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-colors ${quantidade > 0 ? 'border-marca-600' : 'border-zinc-200'}`}
              >
                {produto.image_url !== null ? (
                  // eslint-disable-next-line @next/next/no-img-element -- imagem do Storage, sem otimizador no Worker
                  <img
                    src={produto.image_url}
                    alt={produto.name}
                    loading="lazy"
                    className="aspect-square w-full bg-zinc-50 object-cover"
                  />
                ) : (
                  <div
                    aria-hidden
                    className="from-marca-50 grid aspect-square w-full place-items-center bg-gradient-to-br to-zinc-50"
                  >
                    <span className="font-marca texto-dourado text-3xl">a</span>
                  </div>
                )}
                <div className="p-2.5">
                  <p className="line-clamp-2 min-h-10 text-sm font-semibold text-zinc-900">
                    {produto.name}
                  </p>
                  {produto.description !== null ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                      {produto.description}
                    </p>
                  ) : null}
                  <p className="text-marca-700 mt-1 font-bold">
                    {formatarCentavos(produto.price_cents)}
                    <span className="text-[10px] font-normal text-zinc-400"> /{produto.unit}</span>
                  </p>
                  <div className="mt-2">
                    {quantidade === 0 ? (
                      <button
                        type="button"
                        onClick={() => alterarQuantidade(produto.id, 1)}
                        className="border-marca-600 text-marca-700 hover:bg-marca-50 w-full rounded-lg border py-1.5 text-sm font-bold"
                      >
                        Adicionar
                      </button>
                    ) : (
                      <div className="border-marca-600 flex items-center justify-between rounded-lg border">
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(produto.id, -1)}
                          aria-label={`Tirar um ${produto.name}`}
                          className="text-marca-700 h-8 w-9 text-lg font-bold"
                        >
                          −
                        </button>
                        <span aria-live="polite" className="text-sm font-bold text-zinc-900">
                          {quantidade}
                        </span>
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(produto.id, 1)}
                          aria-label={`Adicionar um ${produto.name}`}
                          className="bg-marca-700 h-8 w-9 rounded-r-[7px] text-lg font-bold text-white"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      {totalDeItens > 0 && !fechando ? (
        <div className="bg-marca-800 fixed inset-x-0 bottom-0 z-10 p-4 shadow-lg">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e8c877] to-transparent" />
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <p className="font-bold text-white">
              {totalDeItens} {totalDeItens === 1 ? 'item' : 'itens'} ·{' '}
              <span className="text-dourado-300">{formatarCentavos(totalCentavos)}</span>
            </p>
            <button
              type="button"
              onClick={() => definirFechando(true)}
              className="bg-dourado-500 text-marca-900 focus:ring-dourado-300 inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-base font-bold hover:brightness-110 focus:ring-2 focus:outline-none"
            >
              Fechar pedido
            </button>
          </div>
        </div>
      ) : null}

      {fechando && totalDeItens > 0 ? (
        <div className={`${classeCartao} mx-auto max-w-md`}>
          <EtapasDoFechamento atual={2} />
          <div className="mb-4 rounded-lg bg-zinc-50 p-3">
            <p className="mb-1.5 text-xs font-bold tracking-wide text-zinc-500 uppercase">
              Sua sacola
            </p>
            <ul className="space-y-1 text-sm text-zinc-700">
              {itens.map((item) => {
                const produto = produtos.find((linha) => linha.id === item.produtoId)
                if (produto === undefined) {
                  return null
                }
                return (
                  <li key={item.produtoId} className="flex justify-between gap-2">
                    <span className="truncate">
                      {item.quantidade}x {produto.name}
                    </span>
                    <span className="shrink-0 font-semibold">
                      {formatarCentavos(item.quantidade * produto.price_cents)}
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className="mt-2 flex justify-between border-t border-zinc-200 pt-2 text-sm font-bold text-zinc-900">
              <span>Total</span>
              <span>{formatarCentavos(totalCentavos)}</span>
            </p>
          </div>

          <form action={acao} className="space-y-3" noValidate>
            <MensagemErro mensagem={erros.geral ?? erros.itens} />
            <input type="hidden" name="itens" value={JSON.stringify(itens)} />
            <div>
              <label htmlFor="nome" className={classeRotulo}>
                Nome ou empresa *
              </label>
              <input id="nome" name="nome" required className={classeEntrada} />
              <ErroDeCampo mensagem={erros.nomeCliente} />
            </div>
            <div>
              <label htmlFor="telefone" className={classeRotulo}>
                Seu WhatsApp *
              </label>
              <input
                id="telefone"
                name="telefone"
                type="tel"
                inputMode="tel"
                placeholder="(82) 99999-0000"
                required
                className={classeEntrada}
              />
              <ErroDeCampo mensagem={erros.telefone} />
            </div>
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <div>
                <label htmlFor="cidade" className={classeRotulo}>
                  Cidade *
                </label>
                <input id="cidade" name="cidade" required className={classeEntrada} />
                <ErroDeCampo mensagem={erros.cidade} />
              </div>
              <div>
                <label htmlFor="uf" className={classeRotulo}>
                  UF *
                </label>
                <select id="uf" name="uf" defaultValue="AL" className={classeEntrada}>
                  {ufsParaSelecao().map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
                <ErroDeCampo mensagem={erros.uf} />
              </div>
            </div>
            <div>
              <label htmlFor="observacao" className={classeRotulo}>
                Observação
              </label>
              <textarea id="observacao" name="observacao" rows={2} className={classeEntrada} />
              <ErroDeCampo mensagem={erros.observacao} />
            </div>
            <div className="flex flex-col gap-2">
              <button type="submit" disabled={pendente} className={`${classeBotaoPrimario} w-full`}>
                {pendente ? 'Enviando…' : 'Enviar pedido pelo WhatsApp'}
              </button>
              <button
                type="button"
                onClick={() => definirFechando(false)}
                className={`${classeBotaoSecundario} w-full`}
              >
                ← Voltar aos produtos
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
