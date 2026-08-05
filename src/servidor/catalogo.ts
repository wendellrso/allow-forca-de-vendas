import { criarClienteAdministrativo } from '@/lib/supabase/admin'
import { type Produto } from '@/lib/tipos'

export type ProdutoDoCatalogo = Pick<
  Produto,
  'id' | 'name' | 'description' | 'price_cents' | 'unit'
>

/**
 * Produtos visíveis no catálogo público. Somente colunas públicas: o
 * catálogo nunca expõe estoque, saldo ou dados fiscais.
 */
export async function listarProdutosDoCatalogo(): Promise<ProdutoDoCatalogo[]> {
  const supabase = criarClienteAdministrativo()
  const { data } = await supabase
    .from('products')
    .select('id, name, description, price_cents, unit')
    .eq('active', true)
    .order('name')
    .limit(500)

  return (data ?? []) as ProdutoDoCatalogo[]
}
