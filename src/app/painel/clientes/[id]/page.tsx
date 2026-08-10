import Link from 'next/link'
import { notFound } from 'next/navigation'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { formatarCentavos } from '@/dominio/dinheiro'
import { dataCurta, hojeIso } from '@/dominio/tempo'
import { ROTULO_CONDICAO, ROTULO_STATUS } from '@/dominio/venda'
import { type Cliente, type ContaAReceber, type Venda } from '@/lib/tipos'
import { BarraDeProgresso, classeCartao, Distintivo, EstadoVazio } from '@/componentes/ui'
import { Avatar } from '@/componentes/avatar'
import { LinhaClicavel } from '@/componentes/linha-clicavel'
import {
  Tabela,
  CabecalhoDaTabela,
  CabecalhoFixo,
  Celula,
  LinhaDaTabela,
} from '@/componentes/tabela'
import { TOM_POR_STATUS } from '../../vendas/apresentacao'
import { FormularioCliente } from '../formulario'

export const dynamic = 'force-dynamic'

export default async function PaginaFichaDoCliente({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ aba?: string }>
}) {
  const { id } = await params
  const parametros = await searchParams
  const supabase = await criarClienteServidor()

  const [{ data: linhaCliente }, { data: linhasVendas }, { data: linhasContas }] =
    await Promise.all([
      supabase.from('customers').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('sales')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('receivables')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
        .limit(200),
    ])

  const cliente = linhaCliente as Cliente | null
  if (cliente === null || cliente.archived_at !== null) {
    notFound()
  }
  const vendas = (linhasVendas ?? []) as Venda[]
  const contas = ((linhasContas ?? []) as ContaAReceber[]).filter(
    (conta) => conta.status !== 'cancelado',
  )
  const hoje = hojeIso()

  const compras = vendas.filter(
    (venda) => venda.status === 'confirmada' || venda.status === 'entregue',
  )
  const totalGasto = compras.reduce((soma, venda) => soma + venda.total_cents, 0)
  const ticketMedio = compras.length === 0 ? 0 : Math.round(totalGasto / compras.length)
  const contasAbertas = contas.filter(
    (conta) => conta.status === 'aberto' || conta.status === 'parcial',
  )
  const emAberto = contasAbertas.reduce(
    (soma, conta) => soma + conta.amount_cents - conta.received_cents,
    0,
  )

  const abaAtiva =
    parametros.aba === 'crediario' ? 'crediario' : parametros.aba === 'dados' ? 'dados' : 'compras'

  const abas = [
    { chave: 'compras', rotulo: `Compras (${vendas.length})`, endereco: `/painel/clientes/${id}` },
    {
      chave: 'crediario',
      rotulo: `Crediário (${contasAbertas.length})`,
      endereco: `/painel/clientes/${id}?aba=crediario`,
    },
    { chave: 'dados', rotulo: 'Dados', endereco: `/painel/clientes/${id}?aba=dados` },
  ] as const

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/painel/clientes" className="hover:text-marca-700 text-sm text-zinc-500">
        ← Clientes
      </Link>

      <div className="mt-2 mb-4 flex flex-wrap items-center gap-3">
        <Avatar nome={cliente.name} tamanho="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="font-marca truncate text-2xl font-bold text-zinc-900">{cliente.name}</h1>
          <p className="text-sm text-zinc-500">
            {cliente.city}/{cliente.state} · cliente desde {dataCurta(cliente.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          {cliente.phone !== null ? (
            <a
              href={`https://wa.me/55${cliente.phone}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              💬 WhatsApp
            </a>
          ) : null}
          <Link
            href="/painel/vendas/nova"
            className="from-marca-600 to-marca-800 shadow-marca-800/20 inline-flex items-center rounded-lg bg-gradient-to-br px-3 py-2 text-sm font-bold text-white shadow-lg hover:brightness-110"
          >
            + Nova venda
          </Link>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className={classeCartao}>
          <p className="text-lg font-bold text-zinc-900 sm:text-2xl">
            {formatarCentavos(totalGasto)}
          </p>
          <p className="text-xs text-zinc-500">Total comprado</p>
        </div>
        <div className={classeCartao}>
          <p className="text-lg font-bold text-zinc-900 sm:text-2xl">{compras.length}</p>
          <p className="text-xs text-zinc-500">Compras confirmadas</p>
        </div>
        <div className={classeCartao}>
          <p className="text-lg font-bold text-zinc-900 sm:text-2xl">
            {formatarCentavos(ticketMedio)}
          </p>
          <p className="text-xs text-zinc-500">Ticket médio</p>
        </div>
        <div className={`${classeCartao} ${emAberto > 0 ? 'border-amber-200 bg-amber-50' : ''}`}>
          <p
            className={`text-lg font-bold sm:text-2xl ${emAberto > 0 ? 'text-amber-800' : 'text-zinc-900'}`}
          >
            {formatarCentavos(emAberto)}
          </p>
          <p className={`text-xs ${emAberto > 0 ? 'text-amber-800' : 'text-zinc-500'}`}>
            Em aberto no crediário
          </p>
        </div>
      </div>

      <nav aria-label="Abas da ficha do cliente" className="mb-4 flex gap-1 overflow-x-auto">
        {abas.map((aba) => (
          <Link
            key={aba.chave}
            href={aba.endereco}
            className={`rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap ${
              abaAtiva === aba.chave ? 'bg-marca-700 text-white' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {aba.rotulo}
          </Link>
        ))}
      </nav>

      {abaAtiva === 'compras' ? (
        <section aria-label="Compras do cliente">
          {vendas.length === 0 ? (
            <EstadoVazio
              titulo="Nenhuma compra ainda"
              descricao="Quando você registrar uma venda para este cliente, ela aparece aqui."
            />
          ) : (
            <Tabela>
              <CabecalhoDaTabela>
                <CabecalhoFixo rotulo="Nº" />
                <CabecalhoFixo rotulo="Data" />
                <CabecalhoFixo rotulo="Situação" />
                <CabecalhoFixo rotulo="Condição" />
                <CabecalhoFixo rotulo="Total" alinhamento="direita" />
              </CabecalhoDaTabela>
              <tbody>
                {vendas.map((venda) => (
                  <LinhaClicavel key={venda.id} href={`/painel/vendas/${venda.id}`}>
                    <Celula>
                      <span className="font-mono text-xs text-zinc-400">#{venda.sale_number}</span>
                    </Celula>
                    <Celula destaque>{dataCurta(venda.created_at)}</Celula>
                    <Celula>
                      <Distintivo tom={TOM_POR_STATUS[venda.status]}>
                        {ROTULO_STATUS[venda.status]}
                      </Distintivo>
                    </Celula>
                    <Celula>
                      {venda.payment_terms !== null ? ROTULO_CONDICAO[venda.payment_terms] : '—'}
                    </Celula>
                    <Celula alinhamento="direita" destaque>
                      {formatarCentavos(venda.total_cents)}
                    </Celula>
                  </LinhaClicavel>
                ))}
              </tbody>
            </Tabela>
          )}
        </section>
      ) : null}

      {abaAtiva === 'crediario' ? (
        <section aria-label="Crediário do cliente" className="space-y-3">
          {contas.length === 0 ? (
            <EstadoVazio
              titulo="Nada no crediário"
              descricao="As vendas a prazo deste cliente aparecem aqui, com o que falta receber."
            />
          ) : (
            <Tabela>
              <CabecalhoDaTabela>
                <CabecalhoFixo rotulo="Descrição" />
                <CabecalhoFixo rotulo="Vencimento" />
                <CabecalhoFixo rotulo="Recebido" />
                <CabecalhoFixo rotulo="Falta" alinhamento="direita" />
              </CabecalhoDaTabela>
              <tbody>
                {contas.map((conta) => {
                  const vencida =
                    conta.status !== 'recebido' && conta.due_date !== null && conta.due_date < hoje
                  return (
                    <LinhaDaTabela key={conta.id}>
                      <Celula destaque>
                        <span className="flex items-center gap-2">
                          {conta.description}
                          {conta.status === 'recebido' ? (
                            <Distintivo tom="sucesso">Recebida</Distintivo>
                          ) : vencida ? (
                            <Distintivo tom="perigo">Vencida</Distintivo>
                          ) : null}
                        </span>
                      </Celula>
                      <Celula>
                        <span className={vencida ? 'font-semibold text-red-700' : ''}>
                          {conta.due_date !== null
                            ? new Date(`${conta.due_date}T12:00:00`).toLocaleDateString('pt-BR')
                            : '—'}
                        </span>
                      </Celula>
                      <Celula>
                        <div className="w-36">
                          <BarraDeProgresso
                            valor={conta.received_cents}
                            maximo={conta.amount_cents}
                            tom={conta.received_cents > 0 ? 'verde' : 'vinho'}
                          />
                          <p className="mt-1 text-[11px] text-zinc-500">
                            {formatarCentavos(conta.received_cents)} de{' '}
                            {formatarCentavos(conta.amount_cents)}
                          </p>
                        </div>
                      </Celula>
                      <Celula alinhamento="direita" destaque>
                        {formatarCentavos(conta.amount_cents - conta.received_cents)}
                      </Celula>
                    </LinhaDaTabela>
                  )
                })}
              </tbody>
            </Tabela>
          )}
          {contasAbertas.length > 0 ? (
            <p className="text-sm text-zinc-500">
              Para registrar um recebimento, use o{' '}
              <Link
                href="/painel/financeiro"
                className="text-marca-700 font-semibold hover:underline"
              >
                Financeiro
              </Link>
              .
            </p>
          ) : null}
        </section>
      ) : null}

      {abaAtiva === 'dados' ? (
        <section aria-label="Dados do cliente" className="mx-auto max-w-lg">
          <FormularioCliente cliente={cliente} />
        </section>
      ) : null}
    </div>
  )
}
