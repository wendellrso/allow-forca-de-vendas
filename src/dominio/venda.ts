export const STATUS_VENDA = [
  'aguardando_confirmacao',
  'confirmada',
  'entregue',
  'cancelada',
] as const

export type StatusVenda = (typeof STATUS_VENDA)[number]

export const CONDICOES_PAGAMENTO = ['a_vista', 'a_prazo'] as const

export type CondicaoPagamento = (typeof CONDICOES_PAGAMENTO)[number]

/**
 * Máquina de estados da venda. Espelha o gatilho do banco: o que não está
 * aqui também é recusado pelo PostgreSQL.
 */
const TRANSICOES: Record<StatusVenda, readonly StatusVenda[]> = {
  aguardando_confirmacao: ['confirmada', 'cancelada'],
  confirmada: ['entregue', 'cancelada'],
  entregue: [],
  cancelada: [],
}

export function podeTransicionar(de: StatusVenda, para: StatusVenda): boolean {
  return TRANSICOES[de].includes(para)
}

export function transicoesDisponiveis(de: StatusVenda): readonly StatusVenda[] {
  return TRANSICOES[de]
}

export const ROTULO_STATUS: Record<StatusVenda, string> = {
  aguardando_confirmacao: 'Aguardando confirmação',
  confirmada: 'Confirmada',
  entregue: 'Entregue',
  cancelada: 'Cancelada',
}

export const ROTULO_CONDICAO: Record<CondicaoPagamento, string> = {
  a_vista: 'À vista',
  a_prazo: 'A prazo',
}

export interface ItemDeVenda {
  quantidade: number
  precoUnitarioCentavos: number
}

export function calcularSubtotalCentavos(item: ItemDeVenda): number {
  return item.quantidade * item.precoUnitarioCentavos
}

export function calcularTotalCentavos(itens: readonly ItemDeVenda[]): number {
  return itens.reduce((total, item) => total + calcularSubtotalCentavos(item), 0)
}
