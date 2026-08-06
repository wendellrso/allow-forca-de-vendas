import { z } from 'zod'
import { ehUf } from './estados'
import { telefoneParaArmazenar } from './whatsapp'

const nome = z
  .string()
  .trim()
  .min(2, 'Informe um nome com pelo menos 2 letras.')
  .max(120, 'O nome pode ter no máximo 120 letras.')

const cidade = z
  .string()
  .trim()
  .min(2, 'Informe a cidade.')
  .max(80, 'A cidade pode ter no máximo 80 letras.')

const uf = z.string().refine(ehUf, 'Escolha um estado válido.')

const telefone = z
  .string()
  .trim()
  .transform((valor, contexto) => {
    const armazenavel = telefoneParaArmazenar(valor)
    if (armazenavel === null) {
      contexto.addIssue({
        code: 'custom',
        message: 'Informe um telefone com DDD, ex.: (82) 99999-0000.',
      })
      return z.NEVER
    }
    return armazenavel
  })

const cpfCnpj = z
  .string()
  .trim()
  .transform((valor) => valor.replace(/\D/g, ''))
  .refine(
    (digitos) => digitos === '' || digitos.length === 11 || digitos.length === 14,
    'CPF tem 11 dígitos e CNPJ tem 14.',
  )

export const esquemaCliente = z.object({
  nome,
  telefone: telefone.optional().or(z.literal('').transform(() => undefined)),
  cpfCnpj: cpfCnpj.optional(),
  cidade,
  uf,
  endereco: z.string().trim().max(200, 'O endereço pode ter no máximo 200 letras.').optional(),
  observacoes: z.string().trim().max(500, 'Use no máximo 500 letras.').optional(),
})

export type DadosCliente = z.infer<typeof esquemaCliente>

export const esquemaProduto = z.object({
  nome,
  descricao: z.string().trim().max(500, 'Use no máximo 500 letras.').optional(),
  precoCentavos: z
    .number()
    .int('O preço precisa ser um valor em centavos.')
    .min(0, 'O preço não pode ser negativo.')
    .max(100_000_000, 'Preço acima do limite do aplicativo.'),
  unidade: z.string().trim().min(1, 'Informe a unidade.').max(10, 'Use no máximo 10 letras.'),
  ncm: z
    .string()
    .trim()
    .transform((valor) => valor.replace(/\D/g, ''))
    .refine((digitos) => digitos === '' || digitos.length === 8, 'O NCM tem 8 dígitos.')
    .optional(),
  custoCentavos: z
    .number()
    .int('O custo precisa ser um valor em centavos.')
    .min(0, 'O custo não pode ser negativo.')
    .max(100_000_000, 'Custo acima do limite do aplicativo.')
    .optional(),
  codigoBarras: z
    .string()
    .trim()
    .transform((valor) => valor.replace(/\D/g, ''))
    .refine(
      (digitos) => digitos === '' || (digitos.length >= 8 && digitos.length <= 14),
      'O código de barras tem de 8 a 14 dígitos.',
    )
    .optional(),
  estoqueMinimo: z
    .number()
    .int('Use um número inteiro.')
    .min(0, 'O estoque mínimo não pode ser negativo.')
    .optional(),
  ativo: z.boolean(),
})

export type DadosProduto = z.infer<typeof esquemaProduto>

const itemDoPedido = z.object({
  produtoId: z.uuid('Produto inválido.'),
  quantidade: z
    .number()
    .int('A quantidade precisa ser um número inteiro.')
    .min(1, 'A quantidade mínima é 1.')
    .max(999, 'A quantidade máxima por item é 999.'),
})

export const esquemaPedidoCatalogo = z.object({
  nomeCliente: nome,
  telefone,
  cidade,
  uf,
  observacao: z.string().trim().max(500, 'Use no máximo 500 letras.').optional(),
  itens: z
    .array(itemDoPedido)
    .min(1, 'Escolha pelo menos um produto.')
    .max(50, 'O pedido pode ter no máximo 50 itens.'),
})

export type DadosPedidoCatalogo = z.infer<typeof esquemaPedidoCatalogo>

export const esquemaDespesa = z.object({
  categoriaId: z.uuid('Escolha a categoria.'),
  descricao: z.string().trim().max(200, 'Use no máximo 200 letras.').optional(),
  valorCentavos: z
    .number()
    .int('O valor precisa ser em centavos.')
    .min(1, 'Informe um valor maior que zero.'),
  data: z.iso.date('Informe a data da despesa.'),
  cidade: z.string().trim().max(80).optional(),
  uf: z
    .string()
    .refine((valor) => valor === '' || ehUf(valor), 'Escolha um estado válido.')
    .transform((valor) => (valor === '' ? undefined : valor))
    .optional(),
  situacao: z.enum(['a_pagar', 'pago']),
})

export type DadosDespesa = z.infer<typeof esquemaDespesa>

export const esquemaCategoriaDeDespesa = z.object({
  nome: z
    .string()
    .trim()
    .min(2, 'O nome precisa de pelo menos 2 letras.')
    .max(40, 'Use no máximo 40 letras.'),
})

/**
 * Traduz o resultado de um parse do zod para o formato de erro exibido nos
 * formulários: uma mensagem por campo, na língua da usuária.
 */
export function errosPorCampo(erro: z.ZodError): Record<string, string> {
  const erros: Record<string, string> = {}
  for (const problema of erro.issues) {
    const campo = problema.path.join('.') || 'geral'
    if (!(campo in erros)) {
      erros[campo] = problema.message
    }
  }
  return erros
}
