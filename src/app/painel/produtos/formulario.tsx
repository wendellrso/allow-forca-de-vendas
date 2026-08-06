'use client'

import { useActionState, useState } from 'react'
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

export function FormularioProduto({ produto }: { produto?: Produto }) {
  const [estado, acao, pendente] = useActionState<EstadoFormularioProduto, FormData>(
    salvarProduto,
    {},
  )
  const [fotoNova, definirFotoNova] = useState('')
  const [erroDaFoto, definirErroDaFoto] = useState<string | undefined>(undefined)
  const [removerFoto, definirRemoverFoto] = useState(false)
  const erros = estado.erros ?? {}
  const precoInicial =
    produto === undefined ? '' : formatarCentavos(produto.price_cents).replace('R$', '').trim()
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
    <form action={acao} className="space-y-4" noValidate>
      <MensagemErro mensagem={erros.geral} />
      {produto !== undefined ? <input type="hidden" name="id" value={produto.id} /> : null}
      <input type="hidden" name="imagemDataUrl" value={fotoNova} />
      <input type="hidden" name="imagemAtual" value={produto?.image_url ?? ''} />
      {removerFoto ? <input type="hidden" name="removerImagem" value="on" /> : null}

      <div>
        <span className={classeRotulo}>Foto (aparece no catálogo)</span>
        <div className="flex items-center gap-3">
          {fotoExibida !== null ? (
            // eslint-disable-next-line @next/next/no-img-element -- foto local/do Storage, sem otimizador no Worker
            <img
              src={fotoExibida}
              alt="Foto do produto"
              className="h-20 w-20 rounded-lg border border-zinc-200 object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-xs text-zinc-400">
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
