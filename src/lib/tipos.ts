import { type CondicaoPagamento, type StatusVenda } from '@/dominio/venda'

/**
 * Formas das linhas do banco usadas pela aplicação. Escritas à mão, como no
 * Studio: um desvio entre estes tipos e o esquema é defeito, não detalhe.
 */

export interface Organizacao {
  id: string
  name: string
  whatsapp: string | null
  document: string | null
}

export interface Cliente {
  id: string
  organization_id: string
  name: string
  phone: string | null
  cpf_cnpj: string | null
  city: string
  state: string
  address: string | null
  notes: string | null
  archived_at: string | null
  created_at: string
}

export interface Produto {
  id: string
  organization_id: string
  name: string
  description: string | null
  unit: string
  price_cents: number
  ncm: string | null
  origin: number | null
  stock_quantity: number
  min_stock: number | null
  active: boolean
  image_url: string | null
  cost_cents: number | null
  barcode: string | null
  created_at: string
}

export interface MovimentoEstoque {
  id: string
  product_id: string
  delta: number
  kind: 'entrada' | 'saida' | 'ajuste'
  reason: string | null
  sale_id: string | null
  created_at: string
}

export interface Venda {
  id: string
  sale_number: number
  customer_id: string | null
  customer_name: string
  customer_phone: string | null
  city: string
  state: string
  origin: 'catalogo' | 'manual'
  status: StatusVenda
  payment_terms: CondicaoPagamento | null
  payment_method_id: string | null
  due_date: string | null
  total_cents: number
  note: string | null
  created_at: string
  confirmed_at: string | null
  delivered_at: string | null
  canceled_at: string | null
}

export interface ItemVenda {
  id: string
  sale_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price_cents: number
  subtotal_cents: number
  /** Custo do produto congelado no momento da venda; null quando desconhecido. */
  unit_cost_cents: number | null
}

export interface ContaAReceber {
  id: string
  sale_id: string | null
  customer_id: string | null
  description: string
  amount_cents: number
  received_cents: number
  due_date: string | null
  status: 'aberto' | 'parcial' | 'recebido' | 'cancelado'
  installment_number: number
  installment_count: number
  created_at: string
}

export interface Recibo {
  id: string
  receivable_id: string
  amount_cents: number
  note: string | null
  created_at: string
}

export type StatusBoleto = 'simulado' | 'solicitado' | 'emitido' | 'erro' | 'cancelado'

export interface EmissaoDeBoleto {
  id: string
  receivable_id: string
  status: StatusBoleto
  provider: string | null
  provider_ref: string | null
  created_at: string
}

export interface Despesa {
  id: string
  category_id: string
  description: string | null
  amount_cents: number
  expense_date: string
  due_date: string | null
  city: string | null
  state: string | null
  status: 'a_pagar' | 'pago'
  created_at: string
}

export interface CategoriaDeDespesa {
  id: string
  name: string
  archived_at: string | null
}

export const TIPOS_DE_FORMA = [
  'dinheiro',
  'pix',
  'cartao_debito',
  'cartao_credito',
  'boleto',
  'outro',
] as const

export type TipoDeForma = (typeof TIPOS_DE_FORMA)[number]

export const ROTULO_TIPO_DE_FORMA: Record<TipoDeForma, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_debito: 'Cartão de débito',
  cartao_credito: 'Cartão de crédito',
  boleto: 'Boleto',
  outro: 'Outra',
}

export interface FormaDePagamento {
  id: string
  name: string
  kind: TipoDeForma
  allows_installments: boolean
  max_installments: number
  first_due_days: number
  installment_interval_days: number
  archived_at: string | null
}
