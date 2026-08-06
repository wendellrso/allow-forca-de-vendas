import Link from 'next/link'
import { type Metadata } from 'next'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { type CategoriaDeDespesa, type FormaDePagamento } from '@/lib/tipos'
import { classeCartao, TituloPagina } from '@/componentes/ui'
import { IconeClientes, IconeProdutos } from '@/componentes/icones'
import { criarCategoria, arquivarCategoria } from '../financeiro/acoes'
import { criarFormaDePagamento, arquivarFormaDePagamento } from './acoes'
import { GerenciadorDeItens } from './formularios'

export const metadata: Metadata = { title: 'Cadastros' }
export const dynamic = 'force-dynamic'

export default async function PaginaCadastros() {
  const supabase = await criarClienteServidor()

  const [
    { count: totalClientes },
    { count: totalProdutos },
    { data: linhasFormas },
    { data: linhasCategorias },
  ] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact', head: true }).is('archived_at', null),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase
      .from('payment_methods')
      .select('id, name, archived_at')
      .is('archived_at', null)
      .order('name'),
    supabase
      .from('expense_categories')
      .select('id, name, archived_at')
      .is('archived_at', null)
      .order('name'),
  ])

  const formas = (linhasFormas ?? []) as FormaDePagamento[]
  const categorias = (linhasCategorias ?? []) as CategoriaDeDespesa[]

  return (
    <div className="mx-auto max-w-4xl">
      <TituloPagina
        titulo="Cadastros"
        subtitulo="Tudo o que o sistema usa para trabalhar, num lugar só."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/painel/clientes"
          className={`${classeCartao} hover:border-marca-300 group flex items-center gap-4 transition-colors`}
        >
          <span className="bg-marca-50 text-marca-700 grid h-12 w-12 shrink-0 place-items-center rounded-xl">
            <IconeClientes />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-zinc-900">Clientes</span>
            <span className="block text-sm text-zinc-500">
              {totalClientes ?? 0} ativos — cadastro, busca e ficha completa
            </span>
          </span>
          <span aria-hidden className="group-hover:text-marca-600 text-zinc-300">
            ›
          </span>
        </Link>

        <Link
          href="/painel/produtos"
          className={`${classeCartao} hover:border-marca-300 group flex items-center gap-4 transition-colors`}
        >
          <span className="bg-marca-50 text-marca-700 grid h-12 w-12 shrink-0 place-items-center rounded-xl">
            <IconeProdutos />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-zinc-900">Produtos</span>
            <span className="block text-sm text-zinc-500">
              {totalProdutos ?? 0} cadastrados — preço, custo, foto e estoque
            </span>
          </span>
          <span aria-hidden className="group-hover:text-marca-600 text-zinc-300">
            ›
          </span>
        </Link>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className={classeCartao} aria-label="Formas de pagamento">
          <h2 className="mb-1 font-bold text-zinc-900">Formas de pagamento</h2>
          <p className="mb-3 text-sm text-zinc-500">
            Aparecem na venda e na confirmação do pedido.
          </p>
          <GerenciadorDeItens
            itens={formas}
            acaoCriar={criarFormaDePagamento}
            acaoArquivar={arquivarFormaDePagamento}
            rotuloDoItem="a forma de pagamento"
            placeholder="Ex.: Pix parcelado"
            dica="Arquivar tira a forma das novas vendas; as antigas continuam com ela."
          />
        </section>

        <section className={classeCartao} aria-label="Categorias de despesa">
          <h2 className="mb-1 font-bold text-zinc-900">Categorias de despesa</h2>
          <p className="mb-3 text-sm text-zinc-500">
            Organizam o financeiro e o resultado do período.
          </p>
          <GerenciadorDeItens
            itens={categorias}
            acaoCriar={criarCategoria}
            acaoArquivar={arquivarCategoria}
            rotuloDoItem="a categoria"
            placeholder="Ex.: Pedágio"
            dica="Arquivar tira a categoria das novas despesas; as antigas continuam com ela."
          />
        </section>
      </div>
    </div>
  )
}
