import Link from 'next/link'
import { type Metadata } from 'next'
import { configuracaoAsaas } from '@/lib/env'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { type Cliente, type FormaDePagamento, type Produto } from '@/lib/tipos'
import { classeBotaoPrimario, EstadoVazio, TituloPagina } from '@/componentes/ui'
import { FormularioVendaManual } from './formulario'

export const metadata: Metadata = { title: 'Nova venda' }
export const dynamic = 'force-dynamic'

export default async function PaginaNovaVenda() {
  const supabase = await criarClienteServidor()
  const [{ data: linhasClientes }, { data: linhasProdutos }, { data: linhasFormas }] =
    await Promise.all([
      supabase
        .from('customers')
        .select('id, name, city, state, phone')
        .is('archived_at', null)
        .order('name')
        .limit(500),
      supabase
        .from('products')
        .select('id, name, price_cents, unit, stock_quantity, image_url')
        .eq('active', true)
        .order('name')
        .limit(500),
      supabase
        .from('payment_methods')
        .select(
          'id, name, kind, allows_installments, max_installments, first_due_days, installment_interval_days, archived_at',
        )
        .is('archived_at', null)
        .order('name'),
    ])

  const clientes = (linhasClientes ?? []) as Pick<
    Cliente,
    'id' | 'name' | 'city' | 'state' | 'phone'
  >[]
  const produtos = (linhasProdutos ?? []) as Pick<
    Produto,
    'id' | 'name' | 'price_cents' | 'unit' | 'stock_quantity' | 'image_url'
  >[]
  const formas = (linhasFormas ?? []) as FormaDePagamento[]

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/painel/vendas" className="hover:text-marca-700 text-sm text-zinc-500">
        ← Vendas
      </Link>
      <TituloPagina
        titulo="Nova venda"
        subtitulo="Escolha o cliente, adicione os produtos e informe o pagamento."
      />
      {clientes.length === 0 ? (
        <EstadoVazio
          titulo="Cadastre um cliente primeiro"
          descricao="Toda venda pertence a um cliente."
        />
      ) : produtos.length === 0 ? (
        <EstadoVazio
          titulo="Cadastre um produto primeiro"
          descricao="Sem produtos ativos não há o que vender."
        />
      ) : (
        <FormularioVendaManual
          clientes={clientes}
          produtos={produtos}
          formas={formas}
          emissaoReal={configuracaoAsaas() !== null}
        />
      )}
      {clientes.length === 0 ? (
        <p className="mt-4 text-center">
          <Link href="/painel/clientes/novo" className={classeBotaoPrimario}>
            Cadastrar cliente
          </Link>
        </p>
      ) : null}
    </div>
  )
}
