import { type Metadata } from 'next'
import { headers } from 'next/headers'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { whatsappDaVendedora } from '@/lib/env'
import { type Organizacao } from '@/lib/tipos'
import { classeCartao, TituloPagina } from '@/componentes/ui'
import { CompartilharCatalogo } from '@/componentes/compartilhar-catalogo'
import { FormularioConfiguracoes } from './formulario'

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
    <div className="mx-auto max-w-2xl">
      <TituloPagina
        titulo="Configurações"
        subtitulo="Dados da empresa e o funcionamento do catálogo."
      />

      {semWhatsapp ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          ⚠️ Sem um WhatsApp configurado, o cliente não consegue fechar o pedido no catálogo.
          Preencha o campo abaixo.
        </p>
      ) : null}

      <div className="space-y-4">
        <section className={classeCartao} aria-label="Dados da empresa">
          <h2 className="mb-3 font-bold text-zinc-900">Empresa</h2>
          <FormularioConfiguracoes organizacao={organizacao} />
        </section>

        <section className={classeCartao} aria-label="Catálogo público">
          <h2 className="mb-1 font-bold text-zinc-900">Catálogo público</h2>
          <p className="mb-3 text-sm text-zinc-500">
            Este é o link que você envia para os clientes. Não precisa de senha.
          </p>
          <CompartilharCatalogo url={urlDoCatalogo} />
        </section>

        <section className={classeCartao} aria-label="Conta">
          <h2 className="mb-1 font-bold text-zinc-900">Conta</h2>
          <p className="text-sm text-zinc-600">
            Você está conectada como{' '}
            <span className="font-semibold">{usuario.user?.email ?? '—'}</span>.
          </p>
        </section>
      </div>
    </div>
  )
}
