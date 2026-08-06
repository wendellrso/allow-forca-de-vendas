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
      <div className={`${classeCartao} text-center`}>
        <p className="text-lg font-bold text-emerald-700">Pedido registrado!</p>
        <p className="mt-1 text-sm text-zinc-600">
          Agora é só enviar a mensagem que já está pronta no seu WhatsApp para concluir com a
          vendedora.
        </p>
        <a href={estado.urlWhatsApp} className={`${classeBotaoPrimario} mt-4`}>
          Abrir o WhatsApp
        </a>
      </div>
    )
  }

  return (
    <div>
      <ul className="space-y-2">
        {produtos.map((produto) => {
          const quantidade = quantidades[produto.id] ?? 0
          return (
            <li key={produto.id} className={classeCartao}>
              <div className="flex items-center justify-between gap-3">
                {produto.image_url !== null ? (
                  // eslint-disable-next-line @next/next/no-img-element -- imagem do Storage, sem otimizador no Worker
                  <img
                    src={produto.image_url}
                    alt={produto.name}
                    loading="lazy"
                    className="h-20 w-20 shrink-0 rounded-lg border border-zinc-100 object-cover"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-900">{produto.name}</p>
                  {produto.description !== null ? (
                    <p className="text-sm text-zinc-500">{produto.description}</p>
                  ) : null}
                  <p className="text-marca-700 mt-0.5 font-bold">
                    {formatarCentavos(produto.price_cents)}
                    <span className="text-xs font-normal text-zinc-400"> / {produto.unit}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => alterarQuantidade(produto.id, -1)}
                    aria-label={`Tirar um ${produto.name}`}
                    disabled={quantidade === 0}
                    className="h-9 w-9 rounded-full border border-zinc-300 text-lg font-bold text-zinc-700 disabled:opacity-40"
                  >
                    −
                  </button>
                  <span aria-live="polite" className="w-6 text-center font-semibold">
                    {quantidade}
                  </span>
                  <button
                    type="button"
                    onClick={() => alterarQuantidade(produto.id, 1)}
                    aria-label={`Adicionar um ${produto.name}`}
                    className="bg-marca-700 h-9 w-9 rounded-full text-lg font-bold text-white"
                  >
                    +
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {totalDeItens > 0 ? (
        <div className="bg-marca-800 fixed inset-x-0 bottom-0 p-4 shadow-lg">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e8c877] to-transparent" />
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <p className="font-bold text-white">
              {totalDeItens} {totalDeItens === 1 ? 'item' : 'itens'} ·{' '}
              <span className="text-dourado-300">{formatarCentavos(totalCentavos)}</span>
            </p>
            {!fechando ? (
              <button
                type="button"
                onClick={() => definirFechando(true)}
                className="bg-dourado-500 text-marca-900 focus:ring-dourado-300 inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-base font-bold hover:brightness-110 focus:ring-2 focus:outline-none"
              >
                Fechar pedido
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {fechando && totalDeItens > 0 ? (
        <form action={acao} className={`${classeCartao} mt-6 space-y-3`} noValidate>
          <p className="font-bold text-zinc-900">Seus dados para o pedido</p>
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
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
              {pendente ? 'Enviando…' : 'Enviar pedido pelo WhatsApp'}
            </button>
            <button
              type="button"
              onClick={() => definirFechando(false)}
              className={classeBotaoSecundario}
            >
              Voltar aos produtos
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
