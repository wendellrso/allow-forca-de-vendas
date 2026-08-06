'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const MENSAGENS: Record<string, string> = {
  'cliente-salvo': 'Cliente salvo.',
  'cliente-arquivado': 'Cliente arquivado.',
  'produto-salvo': 'Produto salvo.',
  'venda-registrada': 'Venda registrada.',
  'despesa-registrada': 'Despesa registrada.',
}

/**
 * Toast de confirmação após ações que redirecionam: a ação inclui `?feito=x`
 * no destino, o aviso aparece e o endereço é limpo em seguida.
 */
export function ToastDeNavegacao() {
  const parametros = useSearchParams()
  const caminho = usePathname()
  const roteador = useRouter()
  const [atual, definirAtual] = useState<{ chave: string; mensagem: string } | null>(null)

  const feito = parametros.get('feito')

  // Ajuste durante a renderização: o parâmetro novo vira o toast visível.
  if (feito !== null && (atual === null || atual.chave !== feito)) {
    definirAtual({ chave: feito, mensagem: MENSAGENS[feito] ?? 'Feito.' })
  }

  // Limpa o endereço assim que o parâmetro é consumido.
  useEffect(() => {
    if (feito === null) {
      return
    }
    const restantes = new URLSearchParams(parametros)
    restantes.delete('feito')
    const consulta = restantes.toString()
    roteador.replace(consulta === '' ? caminho : `${caminho}?${consulta}`, { scroll: false })
  }, [feito, caminho, parametros, roteador])

  // O toast se recolhe sozinho.
  useEffect(() => {
    if (atual === null) {
      return
    }
    const temporizador = setTimeout(() => definirAtual(null), 3200)
    return () => clearTimeout(temporizador)
  }, [atual])

  if (atual === null) {
    return null
  }

  return (
    <div
      role="status"
      className="bg-marca-900 fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-xl lg:bottom-6"
    >
      <span className="text-dourado-300 mr-2" aria-hidden>
        ✓
      </span>
      {atual.mensagem}
    </div>
  )
}
