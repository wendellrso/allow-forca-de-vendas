import Link from 'next/link'
import { type Metadata } from 'next'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { type FormaDePagamento } from '@/lib/tipos'
import { criarFormaDePagamento } from '../acoes'
import { ComposerDeItem } from '../formularios'
import { FormaComConfiguracao } from './configurar'

export const metadata: Metadata = { title: 'Formas de pagamento' }
export const dynamic = 'force-dynamic'

export default async function PaginaFormasDePagamento() {
  const supabase = await criarClienteServidor()
  const { data } = await supabase
    .from('payment_methods')
    .select(
      'id, name, kind, allows_installments, max_installments, first_due_days, installment_interval_days, archived_at',
    )
    .is('archived_at', null)
    .order('name')

  const formas = (data ?? []) as FormaDePagamento[]

  return (
    <div className="mx-auto max-w-xl py-2">
      <Link href="/painel/cadastros" className="hover:text-marca-700 text-sm text-zinc-500">
        ← Cadastros
      </Link>

      <header className="mt-3 mb-6">
        <h1 className="font-marca text-3xl font-bold text-zinc-900">Formas de pagamento</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
          Como você recebe. Cada forma carrega a própria configuração: tipo, parcelamento e
          vencimentos — é daqui que a Nova venda puxa as regras.
        </p>
      </header>

      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <ComposerDeItem acaoCriar={criarFormaDePagamento} placeholder="Ex.: Pix parcelado" />
      </div>

      {formas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <p className="text-3xl" aria-hidden>
            ✨
          </p>
          <p className="mt-2 font-medium text-zinc-700">Nenhuma forma cadastrada</p>
          <p className="mt-1 text-sm text-zinc-500">Crie a primeira no campo acima.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {formas.map((forma) => (
            <FormaComConfiguracao key={forma.id} forma={forma} />
          ))}
        </ul>
      )}

      <p className="mt-5 text-center text-xs leading-relaxed text-zinc-400">
        Arquivar tira a forma das novas vendas — as vendas antigas continuam com ela.
      </p>
    </div>
  )
}
