'use client'

import { useActionState, useState } from 'react'
import { classeBotaoSecundario, classeEntrada, ErroDeCampo } from '@/componentes/ui'
import { type EstadoItemDeCadastro } from './acoes'

interface ItemGerenciavel {
  id: string
  name: string
}

/**
 * Lista de itens simples (nome + arquivar) com criação em linha. Serve para
 * formas de pagamento e categorias de despesa — cadastros de apoio.
 */
export function GerenciadorDeItens({
  itens,
  acaoCriar,
  acaoArquivar,
  rotuloDoItem,
  placeholder,
  dica,
}: {
  itens: ItemGerenciavel[]
  acaoCriar: (anterior: EstadoItemDeCadastro, dados: FormData) => Promise<EstadoItemDeCadastro>
  acaoArquivar: (dados: FormData) => Promise<void>
  rotuloDoItem: string
  placeholder: string
  dica: string
}) {
  const [estado, acao, criando] = useActionState<EstadoItemDeCadastro, FormData>(acaoCriar, {})
  const [nome, definirNome] = useState('')
  const [criadaAplicada, definirCriadaAplicada] = useState<string | undefined>(undefined)

  // Item recém-criado limpa o campo: ajuste durante a renderização,
  // comparando com o último aplicado.
  if (estado.criadaId !== undefined && estado.criadaId !== criadaAplicada) {
    definirCriadaAplicada(estado.criadaId)
    definirNome('')
  }

  return (
    <div>
      {itens.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum item cadastrado ainda.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {itens.map((item) => (
            <li
              key={item.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white py-1 pr-1.5 pl-3 text-sm text-zinc-700"
            >
              {item.name}
              <form action={acaoArquivar} className="grid">
                <input type="hidden" name="id" value={item.id} />
                <button
                  type="submit"
                  aria-label={`Arquivar ${rotuloDoItem} ${item.name}`}
                  title="Arquivar"
                  className="grid h-5 w-5 place-items-center rounded-full text-xs text-zinc-400 hover:bg-red-50 hover:text-red-700"
                >
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={acao} className="mt-3 flex gap-2" noValidate>
        <label htmlFor={`novo-${rotuloDoItem}`} className="sr-only">
          Nome
        </label>
        <input
          id={`novo-${rotuloDoItem}`}
          name="nome"
          placeholder={placeholder}
          value={nome}
          onChange={(evento) => definirNome(evento.target.value)}
          className={classeEntrada}
        />
        <button type="submit" disabled={criando} className={`${classeBotaoSecundario} w-auto`}>
          {criando ? '…' : 'Criar'}
        </button>
      </form>
      <ErroDeCampo mensagem={estado.erro} />
      <p className="mt-1.5 text-xs text-zinc-400">{dica}</p>
    </div>
  )
}
