'use client'

import { useActionState, useState, type ReactNode } from 'react'
import { mascararDocumento, mascararTelefone } from '@/dominio/mascaras'
import { classeEntrada, ErroDeCampo } from '@/componentes/ui'
import { salvarConfiguracao, type EstadoConfiguracoes } from './acoes'

/**
 * Cartão de configuração no padrão dos SaaS de referência: título e campo
 * em cima, rodapé com a dica e o botão de salvar do próprio cartão.
 */
function CartaoDeAjuste({
  titulo,
  descricao,
  rodape,
  acao,
  pendente,
  estado,
  children,
}: {
  titulo: string
  descricao: string
  rodape: string
  acao: (dados: FormData) => void
  pendente: boolean
  estado: EstadoConfiguracoes
  children: ReactNode
}) {
  return (
    <form
      action={acao}
      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
      noValidate
    >
      <div className="p-6">
        <h2 className="font-bold text-zinc-900">{titulo}</h2>
        <p className="mt-1 mb-4 text-sm leading-relaxed text-zinc-500">{descricao}</p>
        {children}
        <ErroDeCampo mensagem={estado.erro} />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50/70 px-6 py-3">
        <p className="text-xs text-zinc-400">{rodape}</p>
        <span className="flex items-center gap-3">
          {estado.sucesso === true ? (
            <span role="status" className="text-xs font-semibold text-emerald-700">
              Salvo ✓
            </span>
          ) : null}
          <button
            type="submit"
            disabled={pendente}
            className="from-marca-600 to-marca-800 shadow-marca-800/20 rounded-lg bg-gradient-to-br px-4 py-1.5 text-sm font-bold text-white shadow hover:brightness-110 disabled:opacity-60"
          >
            {pendente ? 'Salvando…' : 'Salvar'}
          </button>
        </span>
      </div>
    </form>
  )
}

export function CartaoNomeDaEmpresa({ nome }: { nome: string }) {
  const [estado, acao, pendente] = useActionState<EstadoConfiguracoes, FormData>(
    salvarConfiguracao,
    {},
  )

  return (
    <CartaoDeAjuste
      titulo="Nome da empresa"
      descricao="Aparece no painel e nos relatórios."
      rodape="Use o nome pelo qual seus clientes conhecem você."
      acao={acao}
      pendente={pendente}
      estado={estado}
    >
      <input type="hidden" name="campo" value="nome" />
      <label htmlFor="nome" className="sr-only">
        Nome da empresa
      </label>
      <input id="nome" name="nome" required defaultValue={nome} className={classeEntrada} />
    </CartaoDeAjuste>
  )
}

export function CartaoDocumento({ documento }: { documento: string | null }) {
  const [estado, acao, pendente] = useActionState<EstadoConfiguracoes, FormData>(
    salvarConfiguracao,
    {},
  )
  const [valor, definirValor] = useState(mascararDocumento(documento ?? ''))

  return (
    <CartaoDeAjuste
      titulo="CPF ou CNPJ da empresa"
      descricao="Identifica a empresa nos documentos — e será os dados do beneficiário quando a emissão de boleto for integrada."
      rodape="Preparado para a integração de boleto; hoje nenhum documento é emitido."
      acao={acao}
      pendente={pendente}
      estado={estado}
    >
      <input type="hidden" name="campo" value="documento" />
      <label htmlFor="documento" className="sr-only">
        CPF ou CNPJ
      </label>
      <input
        id="documento"
        name="documento"
        inputMode="numeric"
        placeholder="00.000.000/0000-00"
        value={valor}
        onChange={(evento) => definirValor(mascararDocumento(evento.target.value))}
        className={classeEntrada}
      />
    </CartaoDeAjuste>
  )
}

export function CartaoWhatsapp({ whatsapp }: { whatsapp: string | null }) {
  const [estado, acao, pendente] = useActionState<EstadoConfiguracoes, FormData>(
    salvarConfiguracao,
    {},
  )
  const [valor, definirValor] = useState(mascararTelefone(whatsapp ?? ''))

  return (
    <CartaoDeAjuste
      titulo="WhatsApp do catálogo"
      descricao="É para este número que o cliente é levado ao fechar o pedido no catálogo."
      rodape="Número com DDD, ex.: (82) 99999-0000."
      acao={acao}
      pendente={pendente}
      estado={estado}
    >
      <input type="hidden" name="campo" value="whatsapp" />
      <label htmlFor="whatsapp" className="sr-only">
        WhatsApp que recebe os pedidos
      </label>
      <input
        id="whatsapp"
        name="whatsapp"
        type="tel"
        inputMode="tel"
        placeholder="(82) 99999-0000"
        value={valor}
        onChange={(evento) => definirValor(mascararTelefone(evento.target.value))}
        className={classeEntrada}
      />
    </CartaoDeAjuste>
  )
}
