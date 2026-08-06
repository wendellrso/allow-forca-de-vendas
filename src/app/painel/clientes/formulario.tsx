'use client'

import { useActionState, useState } from 'react'
import { ufsParaSelecao } from '@/dominio/estados'
import { type Cliente } from '@/lib/tipos'
import {
  classeBotaoPerigo,
  classeBotaoPrimario,
  classeEntrada,
  classeRotulo,
  ErroDeCampo,
  MensagemErro,
} from '@/componentes/ui'
import { arquivarCliente, salvarCliente, type EstadoFormularioCliente } from './acoes'

/** Máscara visual de telefone: (82) 99999-0000 enquanto digita. */
function mascararTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11)
  if (digitos.length <= 2) {
    return digitos
  }
  if (digitos.length <= 6) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`
  }
  const corte = digitos.length === 11 ? 7 : 6
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, corte)}-${digitos.slice(corte)}`
}

/** Máscara visual de CPF/CNPJ conforme o tamanho. */
function mascararDocumento(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 14)
  if (digitos.length <= 11) {
    return digitos
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
  }
  return digitos
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5')
}

export function FormularioCliente({ cliente }: { cliente?: Cliente }) {
  const [estado, acao, pendente] = useActionState<EstadoFormularioCliente, FormData>(
    salvarCliente,
    {},
  )
  const [telefone, definirTelefone] = useState(mascararTelefone(cliente?.phone ?? ''))
  const [documento, definirDocumento] = useState(mascararDocumento(cliente?.cpf_cnpj ?? ''))
  const [confirmandoArquivar, definirConfirmandoArquivar] = useState(false)
  const erros = estado.erros ?? {}

  return (
    <div className="space-y-6">
      <form action={acao} className="space-y-5" noValidate>
        <MensagemErro mensagem={erros.geral} />
        {cliente !== undefined ? <input type="hidden" name="id" value={cliente.id} /> : null}

        <fieldset className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <legend className="px-1 text-sm font-bold text-zinc-900">Contato</legend>
          <div>
            <label htmlFor="nome" className={classeRotulo}>
              Nome ou empresa *
            </label>
            <input
              id="nome"
              name="nome"
              required
              defaultValue={cliente?.name}
              className={classeEntrada}
            />
            <ErroDeCampo mensagem={erros.nome} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="telefone" className={classeRotulo}>
                WhatsApp / telefone
              </label>
              <input
                id="telefone"
                name="telefone"
                type="tel"
                inputMode="tel"
                placeholder="(82) 99999-0000"
                value={telefone}
                onChange={(evento) => definirTelefone(mascararTelefone(evento.target.value))}
                className={classeEntrada}
              />
              <ErroDeCampo mensagem={erros.telefone} />
            </div>
            <div>
              <label htmlFor="cpfCnpj" className={classeRotulo}>
                CPF ou CNPJ
              </label>
              <input
                id="cpfCnpj"
                name="cpfCnpj"
                inputMode="numeric"
                placeholder="00.000.000/0000-00"
                value={documento}
                onChange={(evento) => definirDocumento(mascararDocumento(evento.target.value))}
                className={classeEntrada}
              />
              <ErroDeCampo mensagem={erros.cpfCnpj} />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <legend className="px-1 text-sm font-bold text-zinc-900">Endereço</legend>
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <div>
              <label htmlFor="cidade" className={classeRotulo}>
                Cidade *
              </label>
              <input
                id="cidade"
                name="cidade"
                required
                defaultValue={cliente?.city}
                className={classeEntrada}
              />
              <ErroDeCampo mensagem={erros.cidade} />
            </div>
            <div>
              <label htmlFor="uf" className={classeRotulo}>
                UF *
              </label>
              <select
                id="uf"
                name="uf"
                defaultValue={cliente?.state ?? 'AL'}
                className={classeEntrada}
              >
                {ufsParaSelecao().map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
              <ErroDeCampo mensagem={erros.uf} />
            </div>
          </div>
          <div>
            <label htmlFor="endereco" className={classeRotulo}>
              Endereço
            </label>
            <input
              id="endereco"
              name="endereco"
              placeholder="Rua, número, bairro"
              defaultValue={cliente?.address ?? ''}
              className={classeEntrada}
            />
            <ErroDeCampo mensagem={erros.endereco} />
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <legend className="px-1 text-sm font-bold text-zinc-900">Observações</legend>
          <div>
            <label htmlFor="observacoes" className="sr-only">
              Observações
            </label>
            <textarea
              id="observacoes"
              name="observacoes"
              rows={3}
              placeholder="Preferências, melhores horários, combinados…"
              defaultValue={cliente?.notes ?? ''}
              className={classeEntrada}
            />
            <ErroDeCampo mensagem={erros.observacoes} />
          </div>
        </fieldset>

        <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
          {pendente ? 'Salvando…' : 'Salvar cliente'}
        </button>
      </form>

      {cliente !== undefined ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          {confirmandoArquivar ? (
            <form action={arquivarCliente} className="space-y-2">
              <input type="hidden" name="id" value={cliente.id} />
              <p className="text-sm text-zinc-600">
                O cliente sai das listas e do catálogo, mas o histórico de vendas permanece.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="submit" className={classeBotaoPerigo}>
                  Confirmar arquivamento
                </button>
                <button
                  type="button"
                  onClick={() => definirConfirmandoArquivar(false)}
                  className="text-sm font-medium text-zinc-500 hover:text-zinc-800"
                >
                  Voltar
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => definirConfirmandoArquivar(true)}
              className="text-sm font-medium text-zinc-500 hover:text-red-700"
            >
              Arquivar este cliente…
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
