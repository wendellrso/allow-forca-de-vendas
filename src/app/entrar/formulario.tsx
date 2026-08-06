'use client'

import { useActionState, useState } from 'react'
import { entrar, type EstadoEntrada } from '@/lib/acoes-auth'
import { classeBotaoPrimario, classeEntrada, classeRotulo, MensagemErro } from '@/componentes/ui'

export function FormularioEntrada({ avisoInicial }: { avisoInicial?: string }) {
  const [estado, acao, pendente] = useActionState<EstadoEntrada, FormData>(entrar, {
    erro: avisoInicial,
  })
  const [senhaVisivel, definirSenhaVisivel] = useState(false)

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
        <div className="relative">
          <input
            id="senha"
            name="senha"
            type={senhaVisivel ? 'text' : 'password'}
            autoComplete="current-password"
            required
            className={`${classeEntrada} pr-20`}
          />
          <button
            type="button"
            onClick={() => definirSenhaVisivel((visivel) => !visivel)}
            className="text-marca-700 absolute top-1/2 right-2 -translate-y-1/2 rounded px-2 py-1 text-xs font-bold hover:underline"
          >
            {senhaVisivel ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </div>
      <button type="submit" disabled={pendente} className={`${classeBotaoPrimario} w-full`}>
        {pendente ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
