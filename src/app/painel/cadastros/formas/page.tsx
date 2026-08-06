import { type Metadata } from 'next'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { type FormaDePagamento } from '@/lib/tipos'
import { criarFormaDePagamento, arquivarFormaDePagamento } from '../acoes'
import { PaginaDeCadastroDeApoio } from '../lista'

export const metadata: Metadata = { title: 'Formas de pagamento' }
export const dynamic = 'force-dynamic'

function emojiDaForma(nome: string): string {
  const texto = nome.toLowerCase()
  if (texto.includes('pix')) {
    return '⚡'
  }
  if (texto.includes('dinheiro')) {
    return '💵'
  }
  if (texto.includes('cart')) {
    return '💳'
  }
  if (texto.includes('boleto')) {
    return '🧾'
  }
  return '💠'
}

export default async function PaginaFormasDePagamento() {
  const supabase = await criarClienteServidor()
  const { data } = await supabase
    .from('payment_methods')
    .select('id, name, archived_at')
    .is('archived_at', null)
    .order('name')

  const formas = (data ?? []) as FormaDePagamento[]

  return (
    <PaginaDeCadastroDeApoio
      titulo="Formas de pagamento"
      descricao="Como você recebe. Elas aparecem na hora de fechar a venda e na confirmação do pedido."
      itens={formas}
      emojiDoItem={emojiDaForma}
      acaoCriar={criarFormaDePagamento}
      acaoArquivar={arquivarFormaDePagamento}
      placeholder="Ex.: Pix parcelado"
      dica="Arquivar tira a forma das novas vendas — as vendas antigas continuam com ela."
    />
  )
}
