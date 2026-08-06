'use client'

import { useActionState, useState } from 'react'
import { mascararTelefone } from '@/dominio/mascaras'
import { type Organizacao } from '@/lib/tipos'
import {
  classeBotaoPrimario,
  classeEntrada,
  classeRotulo,
  ErroDeCampo,
  MensagemErro,
} from '@/componentes/ui'
import { salvarConfiguracoes, type EstadoConfiguracoes } from './acoes'

export function FormularioConfiguracoes({ organizacao }: { organizacao: Organizacao }) {
  const [estado, acao, pendente] = useActionState<EstadoConfiguracoes, FormData>(
    salvarConfiguracoes,
    {},
  )
  const [whatsapp, definirWhatsapp] = useState(mascararTelefone(organizacao.whatsapp ?? ''))
  const erros = estado.erros ?? {}

  return (
    <form action={acao} className="space-y-4" noValidate>
      <MensagemErro mensagem={erros.geral} />
      {estado.sucesso === true ? (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Configurações salvas ✓
        </p>
      ) : null}

      <div>
        <label htmlFor="nome" className={classeRotulo}>
          Nome da empresa *
        </label>
        <input
          id="nome"
          name="nome"
          required
          defaultValue={organizacao.name}
          className={classeEntrada}
        />
        <ErroDeCampo mensagem={erros.nome} />
      </div>

      <div>
        <label htmlFor="whatsapp" className={classeRotulo}>
          WhatsApp que recebe os pedidos do catálogo
        </label>
        <input
          id="whatsapp"
          name="whatsapp"
          type="tel"
          inputMode="tel"
          placeholder="(82) 99999-0000"
          value={whatsapp}
          onChange={(evento) => definirWhatsapp(mascararTelefone(evento.target.value))}
          className={classeEntrada}
        />
        <ErroDeCampo mensagem={erros.whatsapp} />
        <p className="mt-1 text-xs text-zinc-400">
          É para este número que o cliente é levado ao fechar o pedido no catálogo.
        </p>
      </div>

      <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
        {pendente ? 'Salvando…' : 'Salvar configurações'}
      </button>
    </form>
  )
}
