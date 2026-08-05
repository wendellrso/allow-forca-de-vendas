/**
 * Acesso às variáveis de ambiente com falha clara e imediata. Nenhum valor é
 * lido no momento do import: páginas estáticas não podem depender de ambiente
 * que só existe em execução.
 */

export function ambientePublico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const chaveAnonima = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !chaveAnonima) {
    throw new Error(
      'Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no ambiente.',
    )
  }
  return { url, chaveAnonima }
}

export function ambienteServidor() {
  const { url } = ambientePublico()
  const chaveServico = process.env.SUPABASE_SERVICE_ROLE_KEY
  const whatsappVendedora = process.env.ALLOW_WHATSAPP_VENDEDORA
  if (!chaveServico) {
    throw new Error('Configure SUPABASE_SERVICE_ROLE_KEY no ambiente do servidor.')
  }
  if (!whatsappVendedora) {
    throw new Error('Configure ALLOW_WHATSAPP_VENDEDORA com o número que recebe os pedidos.')
  }
  return { url, chaveServico, whatsappVendedora }
}
