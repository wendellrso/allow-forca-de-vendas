import { type Metadata } from 'next'
import { headers } from 'next/headers'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { whatsappDaVendedora } from '@/lib/env'
import { type Organizacao } from '@/lib/tipos'
import { IconeCatalogo } from '@/componentes/icones'
import { CompartilharCatalogo } from '@/componentes/compartilhar-catalogo'
import { CartaoNomeDaEmpresa, CartaoWhatsapp } from './formulario'

export const metadata: Metadata = { title: 'Configurações' }
export const dynamic = 'force-dynamic'

export default async function PaginaConfiguracoes() {
  const supabase = await criarClienteServidor()
  const cabecalhos = await headers()

  const [{ data: linhasOrganizacao }, { data: usuario }] = await Promise.all([
    supabase.from('organizations').select('id, name, whatsapp').limit(1),
    supabase.auth.getUser(),
  ])

  const organizacao = (linhasOrganizacao ?? [])[0] as Organizacao | undefined
  if (organizacao === undefined) {
    return null
  }

  const urlDoCatalogo = `https://${cabecalhos.get('host') ?? ''}/catalogo`
  const semWhatsapp = organizacao.whatsapp === null && whatsappDaVendedora() === null

  return (
    <div className="mx-auto max-w-2xl py-2">
      <header className="mb-8">
        <p className="text-marca-600 text-xs font-semibold tracking-[0.2em] uppercase">
          Ajustes do aplicativo
        </p>
        <h1 className="font-marca mt-1 text-4xl font-bold text-zinc-900">Configurações</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
          Dados da empresa e o funcionamento do catálogo. Cada cartão salva sozinho.
        </p>
      </header>

      {semWhatsapp ? (
        <p className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900">
          ⚠️ Sem um WhatsApp configurado, o cliente não consegue fechar o pedido no catálogo.
          Preencha o cartão abaixo.
        </p>
      ) : null}

      <div className="space-y-5">
        <CartaoNomeDaEmpresa nome={organizacao.name} />
        <CartaoWhatsapp whatsapp={organizacao.whatsapp} />

        <section
          aria-label="Catálogo público"
          className="from-marca-800 to-marca-900 overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-lg"
        >
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10">
              <IconeCatalogo />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-marca text-xl font-bold">Catálogo público</h2>
              <p className="text-marca-100/80 mt-1 mb-4 text-sm leading-relaxed">
                O link que você envia para os clientes. Abre sem senha, direto nos produtos.
              </p>
              <div className="rounded-xl bg-white/95 p-3">
                <CompartilharCatalogo url={urlDoCatalogo} />
              </div>
            </div>
          </div>
        </section>

        <section
          aria-label="Conta"
          className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div>
            <h2 className="font-bold text-zinc-900">Conta</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Conectada como{' '}
              <span className="font-semibold text-zinc-700">{usuario.user?.email ?? '—'}</span>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
