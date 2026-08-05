'use server'

import { redirect } from 'next/navigation'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export interface EstadoEntrada {
  erro?: string
}

export async function entrar(_anterior: EstadoEntrada, dados: FormData): Promise<EstadoEntrada> {
  const email = String(dados.get('email') ?? '').trim()
  const senha = String(dados.get('senha') ?? '')

  if (email === '' || senha === '') {
    return { erro: 'Informe e-mail e senha.' }
  }

  const supabase = await criarClienteServidor()
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

  if (error !== null) {
    // Mensagem única para credencial inválida e conta inexistente: não
    // confirmamos a existência de contas.
    return { erro: 'Não foi possível entrar. Confira o e-mail e a senha.' }
  }

  redirect('/painel')
}

export async function sair(): Promise<void> {
  const supabase = await criarClienteServidor()
  await supabase.auth.signOut()
  redirect('/entrar')
}
