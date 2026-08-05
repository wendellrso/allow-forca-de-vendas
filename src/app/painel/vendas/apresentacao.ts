import { type StatusVenda } from '@/dominio/venda'
import { type TomDistintivo } from '@/componentes/ui'

export const TOM_POR_STATUS: Record<StatusVenda, TomDistintivo> = {
  aguardando_confirmacao: 'atencao',
  confirmada: 'info',
  entregue: 'sucesso',
  cancelada: 'perigo',
}
