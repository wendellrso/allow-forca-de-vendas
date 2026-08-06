'use client'

import { useActionState, useState } from 'react'
import { converterParaCentavos, formatarCentavos } from '@/dominio/dinheiro'
import { type Produto } from '@/lib/tipos'
import {
  classeBotaoPrimario,
  classeEntrada,
  classeRotulo,
  ErroDeCampo,
  MensagemErro,
} from '@/componentes/ui'
import { salvarProduto, type EstadoFormularioProduto } from './acoes'

const MAIOR_LADO_DA_FOTO = 1000

/**
 * Redimensiona a foto no próprio aparelho antes do envio: fotos de celular
 * têm vários megabytes, e o catálogo precisa de imagens leves.
 */
async function redimensionarFoto(arquivo: File): Promise<string | null> {
  const enderecoLocal = URL.createObjectURL(arquivo)
  try {
    const imagem = await new Promise<HTMLImageElement>((resolver, rejeitar) => {
      const elemento = new Image()
      elemento.onload = () => resolver(elemento)
      elemento.onerror = () => rejeitar(new Error('Imagem ilegível.'))
      elemento.src = enderecoLocal
    })
    const escala = Math.min(1, MAIOR_LADO_DA_FOTO / Math.max(imagem.width, imagem.height))
    const tela = document.createElement('canvas')
    tela.width = Math.max(1, Math.round(imagem.width * escala))
    tela.height = Math.max(1, Math.round(imagem.height * escala))
    const contexto = tela.getContext('2d')
    if (contexto === null) {
      return null
    }
    contexto.drawImage(imagem, 0, 0, tela.width, tela.height)
    return tela.toDataURL('image/jpeg', 0.82)
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(enderecoLocal)
  }
}

function valorEmReais(centavos: number | null | undefined): string {
  return centavos === null || centavos === undefined
    ? ''
    : formatarCentavos(centavos).replace('R$', '').trim()
}

/** Lucro e margem calculados ao vivo enquanto preço e custo são digitados. */
function ResumoDeMargem({ preco, custo }: { preco: string; custo: string }) {
  const precoCentavos = converterParaCentavos(preco)
  const custoCentavos = converterParaCentavos(custo)
  if (
    precoCentavos === null ||
    precoCentavos === 0 ||
    custoCentavos === null ||
    custo.trim() === ''
  ) {
    return (
      <p className="text-xs text-zinc-400">
        Informe preço e custo para ver a margem de lucro por unidade.
      </p>
    )
  }
  const lucro = precoCentavos - custoCentavos
  const margem = Math.round((lucro / precoCentavos) * 100)
  if (lucro < 0) {
    return (
      <p className="text-xs font-semibold text-red-700">
        Atenção: o custo está {formatarCentavos(-lucro)} acima do preço de venda.
      </p>
    )
  }
  return (
    <p className="text-xs text-zinc-600">
      Lucro de <span className="font-semibold text-emerald-700">{formatarCentavos(lucro)}</span> por
      unidade — margem de <span className="font-semibold text-emerald-700">{margem}%</span>.
    </p>
  )
}

export function FormularioProduto({ produto }: { produto?: Produto }) {
  const [estado, acao, pendente] = useActionState<EstadoFormularioProduto, FormData>(
    salvarProduto,
    {},
  )
  const [fotoNova, definirFotoNova] = useState('')
  const [erroDaFoto, definirErroDaFoto] = useState<string | undefined>(undefined)
  const [removerFoto, definirRemoverFoto] = useState(false)
  const [preco, definirPreco] = useState(valorEmReais(produto?.price_cents))
  const [custo, definirCusto] = useState(valorEmReais(produto?.cost_cents))
  const erros = estado.erros ?? {}
  const fotoExibida = fotoNova !== '' ? fotoNova : removerFoto ? null : (produto?.image_url ?? null)

  async function aoEscolherFoto(arquivo: File | undefined) {
    definirErroDaFoto(undefined)
    if (arquivo === undefined) {
      return
    }
    const redimensionada = await redimensionarFoto(arquivo)
    if (redimensionada === null) {
      definirErroDaFoto('Não deu para ler essa imagem. Tente uma foto JPG ou PNG.')
      return
    }
    definirFotoNova(redimensionada)
    definirRemoverFoto(false)
  }

  return (
    <form action={acao} className="space-y-5" noValidate>
      <MensagemErro mensagem={erros.geral} />
      {produto !== undefined ? <input type="hidden" name="id" value={produto.id} /> : null}
      <input type="hidden" name="imagemDataUrl" value={fotoNova} />
      <input type="hidden" name="imagemAtual" value={produto?.image_url ?? ''} />
      {removerFoto ? <input type="hidden" name="removerImagem" value="on" /> : null}

      <fieldset className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <legend className="px-1 text-sm font-bold text-zinc-900">Apresentação no catálogo</legend>
        <div>
          <span className={classeRotulo}>Foto</span>
          <div className="flex items-center gap-3">
            {fotoExibida !== null ? (
              // eslint-disable-next-line @next/next/no-img-element -- foto local/do Storage, sem otimizador no Worker
              <img
                src={fotoExibida}
                alt="Foto do produto"
                className="h-24 w-24 rounded-xl border border-zinc-200 object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-zinc-300 text-center text-xs text-zinc-400">
                sem foto
              </div>
            )}
            <div className="space-y-1">
              <label className="text-marca-700 inline-block cursor-pointer text-sm font-medium hover:underline">
                {fotoExibida !== null ? 'Trocar foto' : 'Adicionar foto'}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(evento) => void aoEscolherFoto(evento.target.files?.[0])}
                />
              </label>
              {fotoExibida !== null ? (
                <button
                  type="button"
                  onClick={() => {
                    definirFotoNova('')
                    definirRemoverFoto(true)
                  }}
                  className="block text-sm text-zinc-500 hover:text-red-700"
                >
                  Remover foto
                </button>
              ) : null}
              <p className="text-xs text-zinc-400">Uma foto boa vende mais no catálogo.</p>
            </div>
          </div>
          <ErroDeCampo mensagem={erroDaFoto ?? erros.imagem} />
        </div>
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
            Descrição
          </label>
          <textarea
            id="descricao"
            name="descricao"
            rows={2}
            placeholder="Como usar, benefícios, tamanho da embalagem…"
            defaultValue={produto?.description ?? ''}
            className={classeEntrada}
          />
          <ErroDeCampo mensagem={erros.descricao} />
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <legend className="px-1 text-sm font-bold text-zinc-900">Preço e custo</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="preco" className={classeRotulo}>
              Preço de venda (R$) *
            </label>
            <input
              id="preco"
              name="preco"
              inputMode="decimal"
              placeholder="49,90"
              required
              value={preco}
              onChange={(evento) => definirPreco(evento.target.value)}
              className={classeEntrada}
            />
            <ErroDeCampo mensagem={erros.preco} />
          </div>
          <div>
            <label htmlFor="custo" className={classeRotulo}>
              Custo (R$)
            </label>
            <input
              id="custo"
              name="custo"
              inputMode="decimal"
              placeholder="25,00"
              value={custo}
              onChange={(evento) => definirCusto(evento.target.value)}
              className={classeEntrada}
            />
            <ErroDeCampo mensagem={erros.custo} />
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
        <div className="rounded-lg bg-zinc-50 px-3 py-2">
          <ResumoDeMargem preco={preco} custo={custo} />
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <legend className="px-1 text-sm font-bold text-zinc-900">Estoque e códigos</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
              placeholder="Ex.: 5"
              defaultValue={produto?.min_stock ?? ''}
              className={classeEntrada}
            />
            <ErroDeCampo mensagem={erros.estoqueMinimo} />
          </div>
          <div>
            <label htmlFor="codigoBarras" className={classeRotulo}>
              Código de barras
            </label>
            <input
              id="codigoBarras"
              name="codigoBarras"
              inputMode="numeric"
              placeholder="EAN, 8 a 14 dígitos"
              defaultValue={produto?.barcode ?? ''}
              className={classeEntrada}
            />
            <ErroDeCampo mensagem={erros.codigoBarras} />
          </div>
          <div>
            <label htmlFor="ncm" className={classeRotulo}>
              NCM (fiscal)
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
        <p className="text-xs text-zinc-400">
          O alerta de reposição aparece quando o estoque chega ao mínimo. Código de barras e NCM são
          opcionais e ficam prontos para a etapa fiscal.
        </p>
      </fieldset>

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
