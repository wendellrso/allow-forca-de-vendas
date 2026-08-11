import { type Metadata } from 'next'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { type CategoriaDeDespesa } from '@/lib/tipos'
import { criarCategoria, arquivarCategoria, restaurarCategoria } from '../../financeiro/acoes'
import { PaginaDeCadastroDeApoio } from '../lista'

export const metadata: Metadata = { title: 'Categorias de despesa' }
export const dynamic = 'force-dynamic'

function emojiDaCategoria(nome: string): string {
  const texto = nome.toLowerCase()
  if (texto.includes('hosped') || texto.includes('pousada') || texto.includes('hotel')) {
    return '🏨'
  }
  if (texto.includes('aliment') || texto.includes('comida') || texto.includes('refei')) {
    return '🍽️'
  }
  if (texto.includes('combust') || texto.includes('gasolina')) {
    return '⛽'
  }
  if (texto.includes('ped')) {
    return '🛣️'
  }
  return '🏷️'
}

export default async function PaginaCategoriasDeDespesa() {
  const supabase = await criarClienteServidor()
  const { data } = await supabase
    .from('expense_categories')
    .select('id, name, archived_at')
    .order('name')

  const todas = (data ?? []) as CategoriaDeDespesa[]

  return (
    <PaginaDeCadastroDeApoio
      titulo="Categorias de despesa"
      descricao="Onde o dinheiro vai. Organizam o financeiro e o resultado do período nas viagens."
      itens={todas.filter((categoria) => categoria.archived_at === null)}
      itensArquivados={todas.filter((categoria) => categoria.archived_at !== null)}
      emojiDoItem={emojiDaCategoria}
      acaoCriar={criarCategoria}
      acaoArquivar={arquivarCategoria}
      acaoRestaurar={restaurarCategoria}
      placeholder="Ex.: Pedágio"
      dica="Arquivar tira a categoria das novas despesas — as antigas continuam com ela."
      rotuloArquivadoSingular="categoria arquivada"
      rotuloArquivadoPlural="categorias arquivadas"
    />
  )
}
