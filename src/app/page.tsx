import { redirect } from 'next/navigation'

export default function PaginaInicial() {
  // O middleware decide entre /entrar e /painel conforme a sessão.
  redirect('/painel')
}
