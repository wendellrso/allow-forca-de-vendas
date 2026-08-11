/** Regras puras da emissão de boleto, independentes do provedor. */

/**
 * O Asaas fala em reais com duas casas; o aplicativo, em centavos inteiros.
 * A conversão é exata — nada de ponto flutuante acumulado.
 */
export function centavosParaValorDoProvedor(centavos: number): number {
  return Math.round(centavos) / 100
}

export function valorDoProvedorParaCentavos(valor: number): number {
  return Math.round(valor * 100)
}

/** Descrição da cobrança como o cliente dela verá no boleto. */
export function descricaoDoBoleto(descricaoDaConta: string, numeroDaVenda: number | null): string {
  return numeroDaVenda === null ? descricaoDaConta : `${descricaoDaConta} · Venda #${numeroDaVenda}`
}

/** CPF/CNPJ do pagador é exigência do boleto registrado. */
export function podeEmitirBoleto(cpfCnpjDoCliente: string | null): boolean {
  return cpfCnpjDoCliente !== null && cpfCnpjDoCliente.trim() !== ''
}
