import Link from 'next/link'
import { headers } from 'next/headers'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { formatarCentavos } from '@/dominio/dinheiro'
import { serieDiaria, variacaoPercentual } from '@/dominio/serie'
import { type Produto, type Venda } from '@/lib/tipos'
import { classeCartao, TituloPagina } from '@/componentes/ui'
import { CompartilharCatalogo } from '@/componentes/compartilhar-catalogo'
import { Avatar } from '@/componentes/avatar'
import { GraficoDeBarrasDiario, Sparkline } from '@/componentes/graficos'
import { IconeFinanceiro, IconeProdutos, IconeRelatorios, IconeVendas } from '@/componentes/icones'

export const dynamic = 'force-dynamic'

const FUSO = 'America/Maceio'

function diaLocal(instante: string | Date): string {
  return new Date(instante).toLocaleDateString('en-CA', { timeZone: FUSO })
}

function deslocarDias(dia: string, dias: number): string {
  const data = new Date(`${dia}T12:00:00Z`)
  data.setUTCDate(data.getUTCDate() + dias)
  return data.toISOString().slice(0, 10)
}

function saudacaoPorHora(): string {
  const hora = Number(
    new Date().toLocaleString('en-US', { timeZone: FUSO, hour: '2-digit', hour12: false }),
  )
  if (hora < 12) {
    return 'Bom dia'
  }
  return hora < 18 ? 'Boa tarde' : 'Boa noite'
}

function primeiroNome(email: string): string {
  const parte = email.split('@')[0]?.split(/[._-]/)[0] ?? ''
  return parte === '' ? '' : `, ${parte[0]?.toLocaleUpperCase('pt-BR')}${parte.slice(1)}`
}

interface Pendencia {
  chave: string
  titulo: string
  detalhe: string
  href: string
  acao: string
}

export default async function PaginaInicio() {
  const cabecalhos = await headers()
  const urlDoCatalogo = `https://${cabecalhos.get('host') ?? ''}/catalogo`
  const supabase = await criarClienteServidor()

  const hoje = diaLocal(new Date())
  const inicioDaJanela = deslocarDias(hoje, -62)

  const [
    {
      data: { user },
    },
    { data: vendasRecentes },
    { data: pedidosAguardando },
    { data: contasAbertas },
    { data: produtosAtivos },
    totalDeProdutos,
    totalDeVendas,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('sales')
      .select('total_cents, confirmed_at')
      .in('status', ['confirmada', 'entregue'])
      .gte('confirmed_at', `${inicioDaJanela}T00:00:00-03:00`),
    supabase
      .from('sales')
      .select('id, customer_name, total_cents, created_at')
      .eq('status', 'aguardando_confirmacao')
      .order('created_at', { ascending: true })
      .limit(4),
    supabase
      .from('receivables')
      .select('id, description, due_date, amount_cents, received_cents')
      .in('status', ['aberto', 'parcial']),
    supabase.from('products').select('id, name, stock_quantity, min_stock').eq('active', true),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('sales').select('id', { count: 'exact', head: true }),
  ])

  // Série diária e comparação de período, tudo no fuso da vendedora.
  const registros = ((vendasRecentes ?? []) as Pick<Venda, 'total_cents' | 'confirmed_at'>[])
    .filter((venda) => venda.confirmed_at !== null)
    .map((venda) => ({
      dia: diaLocal(venda.confirmed_at as string),
      valorCentavos: venda.total_cents,
    }))

  const serie14 = serieDiaria(registros, deslocarDias(hoje, -13), hoje)
  const inicioDoMes = `${hoje.slice(0, 8)}01`
  const diaDoMes = Number(hoje.slice(8, 10))
  const fimDoMesAnterior = deslocarDias(inicioDoMes, -1)
  const inicioDoMesAnterior = `${fimDoMesAnterior.slice(0, 8)}01`
  const equivalenteNoMesAnterior = deslocarDias(
    inicioDoMesAnterior,
    Math.min(diaDoMes, Number(fimDoMesAnterior.slice(8, 10))) - 1,
  )

  const somaEntre = (inicio: string, fim: string) =>
    registros
      .filter((registro) => registro.dia >= inicio && registro.dia <= fim)
      .reduce((soma, registro) => soma + registro.valorCentavos, 0)

  const totalDoMes = somaEntre(inicioDoMes, hoje)
  const totalDoMesAnterior = somaEntre(inicioDoMesAnterior, equivalenteNoMesAnterior)
  const variacao = variacaoPercentual(totalDoMes, totalDoMesAnterior)

  const contas = (contasAbertas ?? []) as {
    id: string
    description: string
    due_date: string | null
    amount_cents: number
    received_cents: number
  }[]
  const aReceber = contas.reduce(
    (soma, conta) => soma + conta.amount_cents - conta.received_cents,
    0,
  )
  const vencidas = contas.filter((conta) => conta.due_date !== null && conta.due_date < hoje)

  const baixoEstoque = (
    (produtosAtivos ?? []) as Pick<Produto, 'id' | 'name' | 'stock_quantity' | 'min_stock'>[]
  ).filter((produto) => produto.min_stock !== null && produto.stock_quantity <= produto.min_stock)

  const aguardando = (pedidosAguardando ?? []) as Pick<
    Venda,
    'id' | 'customer_name' | 'total_cents' | 'created_at'
  >[]

  // A lista do "agora": pedidos parados, contas vencidas, estoque no limite.
  const pendencias: Pendencia[] = [
    ...aguardando.map((pedido) => ({
      chave: `pedido-${pedido.id}`,
      titulo: `Pedido de ${pedido.customer_name}`,
      detalhe: `${formatarCentavos(pedido.total_cents)} · aguardando confirmação`,
      href: `/painel/vendas/${pedido.id}`,
      acao: 'Confirmar',
    })),
    ...vencidas.slice(0, 3).map((conta) => ({
      chave: `conta-${conta.id}`,
      titulo: conta.description,
      detalhe: `venceu em ${new Date(`${conta.due_date}T12:00:00`).toLocaleDateString('pt-BR')} · falta ${formatarCentavos(conta.amount_cents - conta.received_cents)}`,
      href: '/painel/financeiro',
      acao: 'Cobrar',
    })),
    ...baixoEstoque.slice(0, 3).map((produto) => ({
      chave: `estoque-${produto.id}`,
      titulo: produto.name,
      detalhe: `estoque no limite: ${produto.stock_quantity} restando`,
      href: `/painel/produtos/${produto.id}`,
      acao: 'Repor',
    })),
  ]

  const appVazio = (totalDeProdutos.count ?? 0) === 0 || (totalDeVendas.count ?? 0) === 0

  const dataDeHoje = new Date().toLocaleDateString('pt-BR', {
    timeZone: FUSO,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div>
      <TituloPagina
        titulo={`${saudacaoPorHora()}${primeiroNome(user?.email ?? '')}`}
        subtitulo={dataDeHoje[0]?.toLocaleUpperCase('pt-BR') + dataDeHoje.slice(1)}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={classeCartao}>
          <div className="flex items-center justify-between">
            <span className="bg-marca-50 text-marca-700 grid h-9 w-9 place-items-center rounded-xl">
              <IconeRelatorios />
            </span>
            {variacao !== null ? (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${variacao >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}
              >
                {variacao >= 0 ? '+' : ''}
                {variacao}%
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-2xl font-bold text-zinc-900">{formatarCentavos(totalDoMes)}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Vendas do mês{variacao !== null ? ' vs. mês passado' : ''}
          </p>
          <div className="mt-2">
            <Sparkline pontos={serie14.map((ponto) => ponto.totalCentavos)} />
          </div>
        </div>

        <Link
          href="/painel/vendas?status=aguardando_confirmacao"
          className={`${classeCartao} hover:border-marca-600 block`}
        >
          <div className="flex items-center justify-between">
            <span className="bg-marca-50 text-marca-700 grid h-9 w-9 place-items-center rounded-xl">
              <IconeVendas />
            </span>
            {aguardando.length > 0 ? (
              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                agir
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-2xl font-bold text-zinc-900">{aguardando.length}</p>
          <p className="mt-0.5 text-xs text-zinc-500">Pedidos aguardando confirmação</p>
        </Link>

        <Link href="/painel/financeiro" className={`${classeCartao} hover:border-marca-600 block`}>
          <div className="flex items-center justify-between">
            <span className="bg-marca-50 text-marca-700 grid h-9 w-9 place-items-center rounded-xl">
              <IconeFinanceiro />
            </span>
            {vencidas.length > 0 ? (
              <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                {vencidas.length} vencida{vencidas.length > 1 ? 's' : ''}
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-2xl font-bold text-zinc-900">{formatarCentavos(aReceber)}</p>
          <p className="mt-0.5 text-xs text-zinc-500">A receber em aberto</p>
        </Link>

        <Link
          href="/painel/produtos?ordenar=stock_quantity&dir=asc"
          className={`${classeCartao} hover:border-marca-600 block`}
        >
          <div className="flex items-center justify-between">
            <span className="bg-marca-50 text-marca-700 grid h-9 w-9 place-items-center rounded-xl">
              <IconeProdutos />
            </span>
            {baixoEstoque.length > 0 ? (
              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                repor
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-2xl font-bold text-zinc-900">{baixoEstoque.length}</p>
          <p className="mt-0.5 text-xs text-zinc-500">Produtos com estoque baixo</p>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[5fr_7fr]">
        {appVazio ? (
          <div className={classeCartao}>
            <p className="mb-1 font-bold text-zinc-900">Primeiros passos</p>
            <p className="mb-3 text-sm text-zinc-500">
              Três passos e o aplicativo está pronto para vender.
            </p>
            <ol className="space-y-2">
              <PassoDoChecklist
                feito={(totalDeProdutos.count ?? 0) > 0}
                titulo="Cadastre um produto com foto e estoque"
                href="/painel/produtos/novo"
              />
              <PassoDoChecklist
                feito={(totalDeVendas.count ?? 0) > 0}
                titulo="Faça um pedido de teste pelo catálogo"
                href="/catalogo"
              />
              <PassoDoChecklist
                feito={false}
                titulo="Compartilhe o link do catálogo com um cliente"
                href="#catalogo"
              />
            </ol>
          </div>
        ) : (
          <div className={classeCartao}>
            <p className="mb-3 font-bold text-zinc-900">Precisa de você agora</p>
            {pendencias.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-2xl" aria-hidden>
                  ✨
                </p>
                <p className="mt-1 font-medium text-zinc-700">Tudo em dia!</p>
                <p className="text-sm text-zinc-500">
                  Nenhum pedido parado, nenhuma conta vencida.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {pendencias.map((pendencia) => (
                  <li key={pendencia.chave} className="flex items-center gap-3 py-2.5">
                    <Avatar nome={pendencia.titulo} tamanho="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-800">
                        {pendencia.titulo}
                      </p>
                      <p className="truncate text-xs text-zinc-500">{pendencia.detalhe}</p>
                    </div>
                    <Link
                      href={pendencia.href}
                      className="text-marca-700 shrink-0 text-xs font-bold hover:underline"
                    >
                      {pendencia.acao}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className={classeCartao}>
          <div className="mb-3 flex items-center justify-between">
            <p className="font-bold text-zinc-900">Vendas por dia</p>
            <span className="text-xs text-zinc-400">últimos 14 dias</span>
          </div>
          <GraficoDeBarrasDiario pontos={serie14} />
        </div>
      </div>

      <div id="catalogo" className={`${classeCartao} mt-4`}>
        <p className="mb-2 font-bold text-zinc-900">Catálogo dos clientes</p>
        <p className="mb-3 text-sm text-zinc-500">
          Mande este link para seus clientes: eles escolhem os produtos e o pedido chega no seu
          WhatsApp.
        </p>
        <CompartilharCatalogo url={urlDoCatalogo} />
      </div>
    </div>
  )
}

function PassoDoChecklist({
  feito,
  titulo,
  href,
}: {
  feito: boolean
  titulo: string
  href: string
}) {
  return (
    <li>
      <Link
        href={href}
        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${feito ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'hover:border-marca-600 border-zinc-200 text-zinc-700'}`}
      >
        <span
          aria-hidden
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${feito ? 'bg-emerald-500 text-white' : 'border border-zinc-300 text-transparent'}`}
        >
          ✓
        </span>
        <span className={feito ? 'line-through opacity-70' : 'font-medium'}>{titulo}</span>
      </Link>
    </li>
  )
}
