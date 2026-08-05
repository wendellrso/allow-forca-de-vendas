import { formatarCentavos } from './dinheiro'

/**
 * Normaliza um telefone brasileiro para o formato aceito pelo wa.me:
 * apenas dígitos, com o código do país. Devolve null quando o número não
 * tem um formato reconhecível.
 */
export function normalizarTelefone(entrada: string): string | null {
  const digitos = entrada.replace(/\D/g, '')

  if (/^55\d{10,11}$/.test(digitos)) {
    return digitos
  }
  if (/^\d{10,11}$/.test(digitos)) {
    return `55${digitos}`
  }
  return null
}

/** Telefone como fica guardado no banco: DDD + número, sem código do país. */
export function telefoneParaArmazenar(entrada: string): string | null {
  const normalizado = normalizarTelefone(entrada)
  return normalizado === null ? null : normalizado.slice(2)
}

export interface ItemDoPedido {
  nome: string
  quantidade: number
  precoUnitarioCentavos: number
}

export interface DadosDoPedido {
  nomeCliente: string
  cidade: string
  uf: string
  itens: readonly ItemDoPedido[]
  totalCentavos: number
  observacao?: string
}

/**
 * Monta a mensagem que o cliente envia à vendedora ao fechar o pedido no
 * catálogo. O texto é a confirmação humana do pedido já registrado no
 * aplicativo — os dois precisam contar a mesma história.
 */
export function montarMensagemPedido(pedido: DadosDoPedido): string {
  const linhas = [
    `Olá! Quero fechar um pedido pelo catálogo Allow.`,
    ``,
    `Cliente: ${pedido.nomeCliente}`,
    `Cidade: ${pedido.cidade}/${pedido.uf}`,
    ``,
    `Itens:`,
  ]

  for (const item of pedido.itens) {
    const subtotal = formatarCentavos(item.quantidade * item.precoUnitarioCentavos)
    linhas.push(`- ${item.quantidade}x ${item.nome} — ${subtotal}`)
  }

  linhas.push(``, `Total: ${formatarCentavos(pedido.totalCentavos)}`)

  if (pedido.observacao !== undefined && pedido.observacao.trim() !== '') {
    linhas.push(``, `Observação: ${pedido.observacao.trim()}`)
  }

  return linhas.join('\n')
}

export function montarLinkWhatsApp(telefoneVendedora: string, mensagem: string): string | null {
  const telefone = normalizarTelefone(telefoneVendedora)
  if (telefone === null) {
    return null
  }
  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`
}
