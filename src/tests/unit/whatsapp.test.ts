import { describe, expect, it } from 'vitest'
import {
  montarLinkWhatsApp,
  montarMensagemPedido,
  normalizarTelefone,
  telefoneParaArmazenar,
} from '@/dominio/whatsapp'

describe('normalizarTelefone', () => {
  it('acrescenta o código do país a números brasileiros', () => {
    expect(normalizarTelefone('(82) 99999-0000')).toBe('5582999990000')
    expect(normalizarTelefone('8299990000')).toBe('558299990000')
  })

  it('preserva números que já têm o 55', () => {
    expect(normalizarTelefone('5582999990000')).toBe('5582999990000')
  })

  it('recusa números curtos, longos ou vazios', () => {
    expect(normalizarTelefone('999')).toBeNull()
    expect(normalizarTelefone('123456789012345')).toBeNull()
    expect(normalizarTelefone('')).toBeNull()
  })
})

describe('telefoneParaArmazenar', () => {
  it('guarda sem o código do país', () => {
    expect(telefoneParaArmazenar('(82) 99999-0000')).toBe('82999990000')
    expect(telefoneParaArmazenar('5582999990000')).toBe('82999990000')
  })
})

describe('montarMensagemPedido', () => {
  const pedido = {
    nomeCliente: 'Farmácia Central',
    cidade: 'Caruaru',
    uf: 'PE',
    itens: [
      { nome: 'Perfume 50ml', quantidade: 2, precoUnitarioCentavos: 5000 },
      { nome: 'Hidratante', quantidade: 1, precoUnitarioCentavos: 2500 },
    ],
    totalCentavos: 12500,
  }

  it('conta a mesma história do pedido registrado', () => {
    const mensagem = montarMensagemPedido(pedido)
    expect(mensagem).toContain('Farmácia Central')
    expect(mensagem).toContain('Caruaru/PE')
    expect(mensagem).toContain('2x Perfume 50ml')
    expect(mensagem).toContain('1x Hidratante')
    expect(mensagem.replace(/ /g, ' ')).toContain('Total: R$ 125,00')
    expect(mensagem).not.toContain('Observação')
  })

  it('inclui a observação apenas quando existe', () => {
    const mensagem = montarMensagemPedido({ ...pedido, observacao: 'Entregar de manhã' })
    expect(mensagem).toContain('Observação: Entregar de manhã')
  })
})

describe('montarLinkWhatsApp', () => {
  it('monta o link wa.me com a mensagem codificada', () => {
    const url = montarLinkWhatsApp('82999990000', 'Olá, tudo bem?')
    expect(url).toBe('https://wa.me/5582999990000?text=Ol%C3%A1%2C%20tudo%20bem%3F')
  })

  it('devolve nulo quando o número da vendedora é inválido', () => {
    expect(montarLinkWhatsApp('123', 'Olá')).toBeNull()
  })
})
