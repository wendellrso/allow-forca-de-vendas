import { criarClienteAdministrativo } from '@/lib/supabase/admin'

/**
 * Fotos de produto vivem no balde público `produtos` do Storage. O navegador
 * redimensiona antes de enviar; aqui só entra JPEG pequeno, e a escrita é
 * exclusiva do servidor.
 */

const PREFIXO_JPEG = 'data:image/jpeg;base64,'
const TAMANHO_MAXIMO_BYTES = 900_000

export async function enviarImagemDeProduto(dataUrl: string): Promise<string | null> {
  if (!dataUrl.startsWith(PREFIXO_JPEG)) {
    return null
  }
  const bytes = Buffer.from(dataUrl.slice(PREFIXO_JPEG.length), 'base64')
  if (bytes.byteLength === 0 || bytes.byteLength > TAMANHO_MAXIMO_BYTES) {
    return null
  }

  const supabase = criarClienteAdministrativo()
  const caminho = `${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage
    .from('produtos')
    .upload(caminho, bytes, { contentType: 'image/jpeg' })
  if (error !== null) {
    return null
  }
  return supabase.storage.from('produtos').getPublicUrl(caminho).data.publicUrl
}

/** Remoção de melhor esforço: a foto órfã não pode impedir o salvamento. */
export async function removerImagemDeProduto(url: string): Promise<void> {
  const marcador = '/storage/v1/object/public/produtos/'
  const posicao = url.indexOf(marcador)
  if (posicao === -1) {
    return
  }
  const caminho = decodeURIComponent(url.slice(posicao + marcador.length))
  const supabase = criarClienteAdministrativo()
  await supabase.storage.from('produtos').remove([caminho])
}
