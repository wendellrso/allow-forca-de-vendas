import { describe, expect, it } from 'vitest'
import {
  errosPorCampo,
  esquemaCliente,
  esquemaDespesa,
  esquemaOrganizacao,
  esquemaPedidoCatalogo,
  esquemaProduto,
} from '@/dominio/validacao'

describe('esquemaCliente', () => {
  it('aceita um cliente completo e normaliza o telefone', () => {
    const resultado = esquemaCliente.safeParse({
      nome: '  Mercadinho São José  ',
      telefone: '(82) 99999-0001',
      cpfCnpj: '12.345.678/0001-95',
      cidade: 'Arapiraca',
      uf: 'AL',
    })
    expect(resultado.success).toBe(true)
    if (resultado.success) {
      expect(resultado.data.nome).toBe('Mercadinho São José')
      expect(resultado.data.telefone).toBe('82999990001')
      expect(resultado.data.cpfCnpj).toBe('12345678000195')
    }
  })

  it('aceita cliente sem telefone', () => {
    const resultado = esquemaCliente.safeParse({
      nome: 'Ana',
      telefone: '',
      cidade: 'Recife',
      uf: 'PE',
    })
    expect(resultado.success).toBe(true)
    if (resultado.success) {
      expect(resultado.data.telefone).toBeUndefined()
    }
  })

  it('recusa UF inventada e documento de tamanho errado', () => {
    expect(esquemaCliente.safeParse({ nome: 'Ana', cidade: 'Recife', uf: 'XX' }).success).toBe(
      false,
    )
    expect(
      esquemaCliente.safeParse({ nome: 'Ana', cidade: 'Recife', uf: 'PE', cpfCnpj: '123' }).success,
    ).toBe(false)
  })
})

describe('esquemaProduto', () => {
  it('aceita produto válido', () => {
    expect(
      esquemaProduto.safeParse({
        nome: 'Perfume 50ml',
        precoCentavos: 4990,
        unidade: 'un',
        ativo: true,
      }).success,
    ).toBe(true)
  })

  it('recusa preço negativo ou quebrado e NCM de tamanho errado', () => {
    expect(
      esquemaProduto.safeParse({ nome: 'P', precoCentavos: -1, unidade: 'un', ativo: true })
        .success,
    ).toBe(false)
    expect(
      esquemaProduto.safeParse({ nome: 'Perfume', precoCentavos: 10.5, unidade: 'un', ativo: true })
        .success,
    ).toBe(false)
    expect(
      esquemaProduto.safeParse({
        nome: 'Perfume',
        precoCentavos: 100,
        unidade: 'un',
        ncm: '1234',
        ativo: true,
      }).success,
    ).toBe(false)
  })
})

describe('esquemaPedidoCatalogo', () => {
  const itemValido = { produtoId: '5a3febc8-6a5a-4e3e-9b57-8f9a1d2c3b4a', quantidade: 2 }

  it('exige pelo menos um item e telefone válido', () => {
    expect(
      esquemaPedidoCatalogo.safeParse({
        nomeCliente: 'Farmácia Central',
        telefone: '(87) 98888-7777',
        cidade: 'Caruaru',
        uf: 'PE',
        itens: [itemValido],
      }).success,
    ).toBe(true)
    expect(
      esquemaPedidoCatalogo.safeParse({
        nomeCliente: 'Farmácia Central',
        telefone: '123',
        cidade: 'Caruaru',
        uf: 'PE',
        itens: [itemValido],
      }).success,
    ).toBe(false)
    expect(
      esquemaPedidoCatalogo.safeParse({
        nomeCliente: 'Farmácia Central',
        telefone: '(87) 98888-7777',
        cidade: 'Caruaru',
        uf: 'PE',
        itens: [],
      }).success,
    ).toBe(false)
  })

  it('recusa quantidade fora de 1 a 999', () => {
    for (const quantidade of [0, -1, 1000, 2.5]) {
      expect(
        esquemaPedidoCatalogo.safeParse({
          nomeCliente: 'Cliente',
          telefone: '(87) 98888-7777',
          cidade: 'Caruaru',
          uf: 'PE',
          itens: [{ ...itemValido, quantidade }],
        }).success,
      ).toBe(false)
    }
  })
})

describe('esquemaDespesa', () => {
  it('aceita despesa válida', () => {
    expect(
      esquemaDespesa.safeParse({
        categoriaId: '5a3febc8-6a5a-4e3e-9b57-8f9a1d2c3b4a',
        valorCentavos: 8550,
        data: '2026-08-05',
        situacao: 'pago',
      }).success,
    ).toBe(true)
  })

  it('recusa categoria inválida e valor zero', () => {
    expect(
      esquemaDespesa.safeParse({
        categoriaId: 'nao-e-uuid',
        valorCentavos: 100,
        data: '2026-08-05',
        situacao: 'pago',
      }).success,
    ).toBe(false)
    expect(
      esquemaDespesa.safeParse({
        categoriaId: '5a3febc8-6a5a-4e3e-9b57-8f9a1d2c3b4a',
        valorCentavos: 0,
        data: '2026-08-05',
        situacao: 'pago',
      }).success,
    ).toBe(false)
  })
})

describe('errosPorCampo', () => {
  it('devolve a primeira mensagem de cada campo', () => {
    const resultado = esquemaCliente.safeParse({ nome: '', cidade: '', uf: 'XX' })
    expect(resultado.success).toBe(false)
    if (!resultado.success) {
      const erros = errosPorCampo(resultado.error)
      expect(erros.nome).toBeDefined()
      expect(erros.cidade).toBeDefined()
      expect(erros.uf).toBeDefined()
    }
  })
})

describe('esquemaOrganizacao', () => {
  it('aceita nome e normaliza o WhatsApp para dígitos', () => {
    const resultado = esquemaOrganizacao.safeParse({
      nome: 'Allow Beauty Hair',
      whatsapp: '(82) 99999-0000',
    })
    expect(resultado.success).toBe(true)
    if (resultado.success) {
      expect(resultado.data.whatsapp).toBe('82999990000')
    }
  })

  it('aceita WhatsApp vazio como ausente e recusa número sem DDD', () => {
    const semNumero = esquemaOrganizacao.safeParse({ nome: 'Allow', whatsapp: '' })
    expect(semNumero.success).toBe(true)
    if (semNumero.success) {
      expect(semNumero.data.whatsapp).toBeUndefined()
    }
    expect(esquemaOrganizacao.safeParse({ nome: 'Allow', whatsapp: '999' }).success).toBe(false)
  })
})
