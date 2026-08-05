'use client'

import { useActionState } from 'react'
import { entrar, type EstadoEntrada } from '@/lib/acoes-auth'
import { classeBotaoPrimario, classeEntrada, classeRotulo, MensagemErro } from '@/componentes/ui'

export function FormularioEntrada({ avisoInicial }: { avisoInicial?: string }) {
  const [estado, acao, pendente] = useActionState<EstadoEntrada, FormData>(entrar, {
    erro: avisoInicial,
  })

  return (
    <form action={acao} className="space-y-4" noValidate>
      <MensagemErro mensagem={estado.erro} />
      <div>
        <label htmlFor="email" className={classeRotulo}>
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={classeEntrada}
        />
      </div>
      <div>
        <label htmlFor="senha" className={classeRotulo}>
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className={classeEntrada}
        />
      </div>
      <button type="submit" disabled={pendente} className={`${classeBotaoPrimario} w-full`}>
        {pendente ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
