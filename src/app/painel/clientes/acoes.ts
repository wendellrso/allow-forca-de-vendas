'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { esquemaCliente, errosPorCampo } from '@/dominio/validacao'
import { exigirSessao } from '@/lib/sessao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export interface EstadoFormularioCliente {
  erros?: Record<string, string>
}

export async function salvarCliente(
  _anterior: EstadoFormularioCliente,
  dados: FormData,
): Promise<EstadoFormularioCliente> {
  const sessao = await exigirSessao()

  const resultado = esquemaCliente.safeParse({
    nome: dados.get('nome'),
    telefone: dados.get('telefone') ?? '',
    cpfCnpj: dados.get('cpfCnpj') ?? '',
    cidade: dados.get('cidade'),
    uf: dados.get('uf'),
    endereco: dados.get('endereco') ?? '',
    observacoes: dados.get('observacoes') ?? '',
  })
  if (!resultado.success) {
    return { erros: errosPorCampo(resultado.error) }
  }

  const cliente = resultado.data
  const linha = {
    name: cliente.nome,
    phone: cliente.telefone ?? null,
    cpf_cnpj: cliente.cpfCnpj === '' || cliente.cpfCnpj === undefined ? null : cliente.cpfCnpj,
    city: cliente.cidade,
    state: cliente.uf,
    address: cliente.endereco === '' || cliente.endereco === undefined ? null : cliente.endereco,
    notes:
      cliente.observacoes === '' || cliente.observacoes === undefined ? null : cliente.observacoes,
  }

  const supabase = await criarClienteServidor()
  const id = dados.get('id')

  const { error } =
    typeof id === 'string' && id !== ''
      ? await supabase.from('customers').update(linha).eq('id', id)
      : await supabase.from('customers').insert({ ...linha, organization_id: sessao.organizacaoId })

  if (error !== null) {
    if (error.code === '23505') {
      return { erros: { telefone: 'Já existe um cliente ativo com este telefone.' } }
    }
    return { erros: { geral: 'Não foi possível salvar. Tente novamente.' } }
  }

  revalidatePath('/painel/clientes')
  redirect('/painel/clientes')
}

export async function arquivarCliente(dados: FormData): Promise<void> {
  await exigirSessao()
  const id = dados.get('id')
  if (typeof id !== 'string' || id === '') {
    return
  }

  const supabase = await criarClienteServidor()
  await supabase.from('customers').update({ archived_at: new Date().toISOString() }).eq('id', id)

  revalidatePath('/painel/clientes')
  redirect('/painel/clientes')
}
