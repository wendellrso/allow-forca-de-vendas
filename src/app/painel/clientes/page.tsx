import Link from 'next/link'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { lerOrdenacao, ordenarLinhas } from '@/dominio/ordenacao'
import { type Cliente } from '@/lib/tipos'
import { classeBotaoPrimario, classeEntrada, EstadoVazio, TituloPagina } from '@/componentes/ui'
import { Avatar } from '@/componentes/avatar'
import {
  Tabela,
  CabecalhoDaTabela,
  CabecalhoOrdenavel,
  CabecalhoFixo,
  Celula,
  LinhaDaTabela,
} from '@/componentes/tabela'

export const dynamic = 'force-dynamic'

const CAMPOS = ['name', 'city', 'state', 'phone', 'created_at'] as const

export default async function PaginaClientes({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; ordenar?: string; dir?: string }>
}) {
  const parametros = await searchParams
  const busca = parametros.busca?.trim() ?? ''
  const ordenacao = lerOrdenacao(parametros, CAMPOS, 'name')

  const supabase = await criarClienteServidor()
  let consulta = supabase.from('customers').select('*').is('archived_at', null).limit(500)
  if (busca !== '') {
    consulta = consulta.ilike('name', `%${busca}%`)
  }
  const { data } = await consulta
  const clientes = ordenarLinhas((data ?? []) as Cliente[], ordenacao.campo, ordenacao.direcao)
  const parametrosBase: Record<string, string> = busca !== '' ? { busca } : {}

  return (
    <div>
      <TituloPagina
        titulo={`Clientes (${clientes.length})`}
        acao={
          <Link href="/painel/clientes/novo" className={classeBotaoPrimario}>
            Novo cliente
          </Link>
        }
      />
      <form className="mb-3" role="search">
        <label htmlFor="busca" className="sr-only">
          Buscar cliente
        </label>
        <input
          id="busca"
          name="busca"
          type="search"
          placeholder="Buscar por nome…"
          defaultValue={busca}
          className={classeEntrada}
        />
      </form>
      {clientes.length === 0 ? (
        <EstadoVazio
          titulo={busca !== '' ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda'}
          descricao={
            busca !== ''
              ? 'Tente outro nome ou limpe a busca.'
              : 'Cadastre o primeiro cliente para começar a vender.'
          }
        />
      ) : (
        <Tabela>
          <CabecalhoDaTabela>
            <CabecalhoOrdenavel
              campo="name"
              rotulo="Nome"
              ordenacao={ordenacao}
              parametros={parametrosBase}
            />
            <CabecalhoOrdenavel
              campo="city"
              rotulo="Cidade"
              ordenacao={ordenacao}
              parametros={parametrosBase}
            />
            <CabecalhoOrdenavel
              campo="state"
              rotulo="UF"
              ordenacao={ordenacao}
              parametros={parametrosBase}
            />
            <CabecalhoOrdenavel
              campo="phone"
              rotulo="WhatsApp"
              ordenacao={ordenacao}
              parametros={parametrosBase}
            />
            <CabecalhoOrdenavel
              campo="created_at"
              rotulo="Cadastro"
              ordenacao={ordenacao}
              parametros={parametrosBase}
            />
            <CabecalhoFixo rotulo="" />
          </CabecalhoDaTabela>
          <tbody>
            {clientes.map((cliente) => (
              <LinhaDaTabela key={cliente.id}>
                <Celula destaque>
                  <Link
                    href={`/painel/clientes/${cliente.id}`}
                    className="hover:text-marca-700 flex items-center gap-2.5"
                  >
                    <Avatar nome={cliente.name} tamanho="sm" />
                    {cliente.name}
                  </Link>
                </Celula>
                <Celula>{cliente.city}</Celula>
                <Celula>{cliente.state}</Celula>
                <Celula>
                  {cliente.phone !== null ? (
                    <a href={`https://wa.me/55${cliente.phone}`} className="hover:text-marca-700">
                      {cliente.phone}
                    </a>
                  ) : (
                    '—'
                  )}
                </Celula>
                <Celula>{new Date(cliente.created_at).toLocaleDateString('pt-BR')}</Celula>
                <Celula alinhamento="direita">
                  <Link
                    href={`/painel/clientes/${cliente.id}`}
                    className="text-marca-700 text-xs font-semibold hover:underline"
                  >
                    Editar
                  </Link>
                </Celula>
              </LinhaDaTabela>
            ))}
          </tbody>
        </Tabela>
      )}
    </div>
  )
}
