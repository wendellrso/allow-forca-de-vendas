'use client'

import { useActionState, useState } from 'react'
import { classeBotaoPrimario, classeEntrada, ErroDeCampo } from '@/componentes/ui'
import { type EstadoItemDeCadastro } from './acoes'

/**
 * Criação rápida no estilo de produto SaaS: um campo, uma ação, o item
 * aparece na lista. Limpa o campo a cada criação.
 */
export function ComposerDeItem({
  acaoCriar,
  placeholder,
}: {
  acaoCriar: (anterior: EstadoItemDeCadastro, dados: FormData) => Promise<EstadoItemDeCadastro>
  placeholder: string
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
    <form action={acao} noValidate>
      <div className="flex gap-2">
        <label htmlFor="novo-item" className="sr-only">
          Nome do novo item
        </label>
        <input
          id="novo-item"
          name="nome"
          placeholder={placeholder}
          value={nome}
          onChange={(evento) => definirNome(evento.target.value)}
          className={classeEntrada}
        />
        <button
          type="submit"
          disabled={criando || nome.trim().length < 2}
          className={`${classeBotaoPrimario} w-auto shrink-0`}
        >
          {criando ? '…' : 'Adicionar'}
        </button>
      </div>
      <ErroDeCampo mensagem={estado.erro} />
    </form>
  )
}
