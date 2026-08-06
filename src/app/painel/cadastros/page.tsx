import Link from 'next/link'
import { type Metadata } from 'next'
import { type ComponentType, type SVGProps } from 'react'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { IconeClientes, IconeFinanceiro, IconeProdutos, IconeVendas } from '@/componentes/icones'

export const metadata: Metadata = { title: 'Cadastros' }
export const dynamic = 'force-dynamic'

interface Modulo {
  href: string
  titulo: string
  descricao: string
  numero: number
  unidade: string
  icone: ComponentType<SVGProps<SVGSVGElement>>
  acaoRapida?: { href: string; rotulo: string }
}

function CartaoDeModulo({ modulo }: { modulo: Modulo }) {
  const Icone = modulo.icone
  return (
    <div className="group hover:border-marca-200 relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl">
      <span
        aria-hidden
        className="bg-marca-50 absolute -top-10 -right-10 h-32 w-32 rounded-full opacity-50 transition-transform duration-300 group-hover:scale-125"
      />
      <Link href={modulo.href} className="absolute inset-0 z-0" aria-label={modulo.titulo} />

      <div className="relative flex items-start justify-between">
        <span className="from-marca-600 to-marca-900 shadow-marca-900/20 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg">
          <Icone />
        </span>
        <span
          aria-hidden
          className="group-hover:text-marca-600 text-xl text-zinc-300 transition-all duration-200 group-hover:translate-x-1"
        >
          →
        </span>
      </div>

      <p className="font-marca relative mt-6 text-4xl font-bold text-zinc-900">
        {modulo.numero}
        <span className="ml-2 align-middle font-sans text-sm font-normal text-zinc-400">
          {modulo.unidade}
        </span>
      </p>
      <h2 className="relative mt-1 text-lg font-bold text-zinc-900">{modulo.titulo}</h2>
      <p className="relative mt-1 text-sm leading-relaxed text-zinc-500">{modulo.descricao}</p>

      {modulo.acaoRapida !== undefined ? (
        <Link
          href={modulo.acaoRapida.href}
          className="text-marca-700 hover:text-marca-900 relative z-10 mt-4 inline-flex items-center gap-1 text-sm font-semibold hover:underline"
        >
          {modulo.acaoRapida.rotulo}
        </Link>
      ) : null}
    </div>
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

  const modulos: Modulo[] = [
    {
      href: '/painel/clientes',
      titulo: 'Clientes',
      descricao: 'Quem compra de você: contato, cidade, ficha completa e histórico.',
      numero: totalClientes ?? 0,
      unidade: 'ativos',
      icone: IconeClientes,
      acaoRapida: { href: '/painel/clientes/novo', rotulo: '+ Cadastrar cliente' },
    },
    {
      href: '/painel/produtos',
      titulo: 'Produtos',
      descricao: 'O que você vende: preço, custo, margem, foto e estoque.',
      numero: totalProdutos ?? 0,
      unidade: 'no catálogo',
      icone: IconeProdutos,
      acaoRapida: { href: '/painel/produtos/novo', rotulo: '+ Cadastrar produto' },
    },
    {
      href: '/painel/cadastros/formas',
      titulo: 'Formas de pagamento',
      descricao: 'Como você recebe: Pix, cartões, dinheiro, boleto — do seu jeito.',
      numero: totalFormas ?? 0,
      unidade: 'em uso',
      icone: IconeVendas,
    },
    {
      href: '/painel/cadastros/categorias',
      titulo: 'Categorias de despesa',
      descricao: 'Onde o dinheiro vai: organizam o financeiro e o resultado.',
      numero: totalCategorias ?? 0,
      unidade: 'em uso',
      icone: IconeFinanceiro,
    },
  ]

  return (
    <div className="mx-auto max-w-4xl py-2">
      <header className="mb-8">
        <p className="text-marca-600 text-xs font-semibold tracking-[0.2em] uppercase">
          Base do sistema
        </p>
        <h1 className="font-marca mt-1 text-4xl font-bold text-zinc-900">Cadastros</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
          Tudo o que o aplicativo usa para trabalhar. Escolha um módulo para ver, criar e organizar.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {modulos.map((modulo) => (
          <CartaoDeModulo key={modulo.href} modulo={modulo} />
        ))}
      </div>
    </div>
  )
}
