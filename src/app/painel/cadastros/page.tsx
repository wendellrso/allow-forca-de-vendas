import Link from 'next/link'
import { type Metadata } from 'next'
import { type ComponentType, type SVGProps } from 'react'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { IconeClientes, IconeFinanceiro, IconeProdutos, IconeVendas } from '@/componentes/icones'

export const metadata: Metadata = { title: 'Cadastros' }
export const dynamic = 'force-dynamic'

interface ItemDeCadastro {
  href: string
  titulo: string
  detalhe: string
  icone: ComponentType<SVGProps<SVGSVGElement>>
  acaoRapida?: { href: string; rotulo: string }
}

function LinhaDeCadastro({ item }: { item: ItemDeCadastro }) {
  const Icone = item.icone
  return (
    <li className="group relative">
      <Link
        href={item.href}
        className="hover:border-marca-200 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition-all hover:shadow-md"
      >
        <span className="bg-marca-50 text-marca-700 grid h-10 w-10 shrink-0 place-items-center rounded-xl">
          <Icone />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-zinc-900">{item.titulo}</span>
          <span className="block text-xs text-zinc-500">{item.detalhe}</span>
        </span>
        <span
          aria-hidden
          className="group-hover:text-marca-600 text-zinc-300 transition-transform group-hover:translate-x-0.5"
        >
          ›
        </span>
      </Link>
      {item.acaoRapida !== undefined ? (
        <Link
          href={item.acaoRapida.href}
          className="text-marca-700 border-marca-100 bg-marca-50 hover:bg-marca-100 absolute top-1/2 right-10 -translate-y-1/2 rounded-full border px-2.5 py-1 text-xs font-bold"
        >
          {item.acaoRapida.rotulo}
        </Link>
      ) : null}
    </li>
  )
}

function Secao({ titulo, itens }: { titulo: string; itens: ItemDeCadastro[] }) {
  return (
    <section aria-label={titulo}>
      <h2 className="text-marca-600 mb-2 text-xs font-semibold tracking-[0.18em] uppercase">
        {titulo}
      </h2>
      <ul className="space-y-2">
        {itens.map((item) => (
          <LinhaDeCadastro key={item.href} item={item} />
        ))}
      </ul>
    </section>
  )
}

export default async function PaginaCadastros() {
  const supabase = await criarClienteServidor()

  const [
    { count: totalClientes },
    { count: totalProdutos },
    { count: totalFormas },
    { count: totalCategorias },
  ] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact', head: true }).is('archived_at', null),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase
      .from('payment_methods')
      .select('id', { count: 'exact', head: true })
      .is('archived_at', null),
    supabase
      .from('expense_categories')
      .select('id', { count: 'exact', head: true })
      .is('archived_at', null),
  ])

  return (
    <div className="mx-auto max-w-2xl py-2">
      <header className="mb-7">
        <p className="text-marca-600 text-xs font-semibold tracking-[0.2em] uppercase">
          Central de cadastros
        </p>
        <h1 className="font-marca mt-1 text-4xl font-bold text-zinc-900">Cadastros</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
          Tudo o que o sistema usa para trabalhar, organizado por área.
        </p>
      </header>

      <div className="space-y-7">
        <Secao
          titulo="Comercial"
          itens={[
            {
              href: '/painel/clientes',
              titulo: 'Clientes',
              detalhe: `${totalClientes ?? 0} ativos · contato, ficha e histórico de compras`,
              icone: IconeClientes,
              acaoRapida: { href: '/painel/clientes/novo', rotulo: '+ Novo' },
            },
            {
              href: '/painel/produtos',
              titulo: 'Produtos',
              detalhe: `${totalProdutos ?? 0} cadastrados · preço, custo, margem, foto e estoque`,
              icone: IconeProdutos,
              acaoRapida: { href: '/painel/produtos/novo', rotulo: '+ Novo' },
            },
          ]}
        />

        <Secao
          titulo="Financeiro"
          itens={[
            {
              href: '/painel/cadastros/formas',
              titulo: 'Formas de pagamento',
              detalhe: `${totalFormas ?? 0} em uso · tipo, parcelamento e vencimentos por forma`,
              icone: IconeVendas,
            },
            {
              href: '/painel/cadastros/categorias',
              titulo: 'Categorias de despesa',
              detalhe: `${totalCategorias ?? 0} em uso · organizam o financeiro e o resultado`,
              icone: IconeFinanceiro,
            },
          ]}
        />
      </div>

      <p className="mt-8 text-center text-xs text-zinc-400">
        Ajustes gerais do sistema vivem em{' '}
        <Link href="/painel/configuracoes" className="text-marca-600 font-semibold hover:underline">
          Configurações
        </Link>
        .
      </p>
    </div>
  )
}
