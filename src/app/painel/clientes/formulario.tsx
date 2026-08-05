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

export function FormularioCliente({ cliente }: { cliente?: Cliente }) {
  const [estado, acao, pendente] = useActionState<EstadoFormularioCliente, FormData>(
    salvarCliente,
    {},
  )
  const [confirmandoArquivar, definirConfirmandoArquivar] = useState(false)
  const erros = estado.erros ?? {}

  return (
    <div className="space-y-6">
      <form action={acao} className="space-y-4" noValidate>
        <MensagemErro mensagem={erros.geral} />
        {cliente !== undefined ? <input type="hidden" name="id" value={cliente.id} /> : null}
        <div>
          <label htmlFor="nome" className={classeRotulo}>
            Nome *
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
            defaultValue={cliente?.phone ?? ''}
            className={classeEntrada}
          />
          <ErroDeCampo mensagem={erros.telefone} />
        </div>
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
          <label htmlFor="cpfCnpj" className={classeRotulo}>
            CPF ou CNPJ
          </label>
          <input
            id="cpfCnpj"
            name="cpfCnpj"
            inputMode="numeric"
            defaultValue={cliente?.cpf_cnpj ?? ''}
            className={classeEntrada}
          />
          <ErroDeCampo mensagem={erros.cpfCnpj} />
        </div>
        <div>
          <label htmlFor="endereco" className={classeRotulo}>
            Endereço
          </label>
          <input
            id="endereco"
            name="endereco"
            defaultValue={cliente?.address ?? ''}
            className={classeEntrada}
          />
          <ErroDeCampo mensagem={erros.endereco} />
        </div>
        <div>
          <label htmlFor="observacoes" className={classeRotulo}>
            Observações
          </label>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={3}
            defaultValue={cliente?.notes ?? ''}
            className={classeEntrada}
          />
          <ErroDeCampo mensagem={erros.observacoes} />
        </div>
        <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
          {pendente ? 'Salvando…' : 'Salvar cliente'}
        </button>
      </form>

      {cliente !== undefined ? (
        <div className="border-t border-zinc-200 pt-4">
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
              className="text-sm font-medium text-red-600 hover:text-red-800"
            >
              Arquivar cliente
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
