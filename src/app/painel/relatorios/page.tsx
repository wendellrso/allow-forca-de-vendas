import Link from 'next/link'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { formatarCentavos } from '@/dominio/dinheiro'
import {
  agruparVendasPorCidade,
  agruparVendasPorUf,
  calcularResultadoDoPeriodo,
  type DespesaParaRelatorio,
  type VendaParaRelatorio,
} from '@/dominio/relatorio'
import { serieDiaria } from '@/dominio/serie'
import {
  classeBotaoSecundario,
  classeCartao,
  classeEntrada,
  classeRotulo,
  EstadoVazio,
  TituloPagina,
} from '@/componentes/ui'
import { ChipDeCategoria } from '@/componentes/avatar'
import { GraficoDeBarrasDiario } from '@/componentes/graficos'

export const dynamic = 'force-dynamic'

const FUSO = 'America/Maceio'
const COR_DE_DADO = '#9c3660'

function hojeIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: FUSO })
}

function primeiroDiaDoMes(): string {
  return `${hojeIso().slice(0, 8)}01`
}

function deslocarDias(dia: string, dias: number): string {
  const data = new Date(`${dia}T12:00:00Z`)
  data.setUTCDate(data.getUTCDate() + dias)
  return data.toISOString().slice(0, 10)
}

function dataValida(texto: string | undefined): string | null {
  return texto !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null
}

function BarraProporcional({ valor, maximo }: { valor: number; maximo: number }) {
  const percentual = maximo <= 0 ? 0 : Math.max((valor / maximo) * 100, 2)
  return (
    <div aria-hidden className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-100 sm:w-36">
      <div
        className="h-full rounded-full"
        style={{ width: `${percentual}%`, backgroundColor: COR_DE_DADO }}
      />
    </div>
  )
}

export default async function PaginaRelatorios({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>
}) {
  const parametros = await searchParams
  const hoje = hojeIso()
  const de = dataValida(parametros.de) ?? primeiroDiaDoMes()
  const ate = dataValida(parametros.ate) ?? hoje

  const supabase = await criarClienteServidor()
  const [{ data: linhasVendas }, { data: linhasDespesas }] = await Promise.all([
    supabase
      .from('sales')
      .select('city, state, total_cents, confirmed_at')
      .in('status', ['confirmada', 'entregue'])
      .gte('confirmed_at', `${de}T00:00:00-03:00`)
      .lte('confirmed_at', `${ate}T23:59:59-03:00`),
    supabase
      .from('expenses')
      .select('amount_cents, expense_categories(name)')
      .gte('expense_date', de)
      .lte('expense_date', ate),
  ])

  const brutas = (linhasVendas ?? []) as {
    city: string
    state: string
    total_cents: number
    confirmed_at: string | null
  }[]
  const vendas = brutas.map((linha): VendaParaRelatorio => ({
    cidade: linha.city,
    uf: linha.state,
    totalCentavos: linha.total_cents,
  }))
  const despesas = (
    (linhasDespesas ?? []) as unknown as {
      amount_cents: number
      expense_categories: { name: string } | null
    }[]
  ).map((linha): DespesaParaRelatorio => ({
    categoria: linha.expense_categories?.name ?? 'Sem categoria',
    valorCentavos: linha.amount_cents,
  }))

  const porCidade = agruparVendasPorCidade(vendas)
  const porUf = agruparVendasPorUf(vendas)
  const resultado = calcularResultadoDoPeriodo(vendas, despesas)
  const maiorCidade = porCidade[0]?.totalCentavos ?? 0
  const maiorUf = porUf[0]?.totalCentavos ?? 0

  const duracaoEmDias =
    (new Date(`${ate}T12:00:00Z`).getTime() - new Date(`${de}T12:00:00Z`).getTime()) / 86_400_000 +
    1
  const seriePeriodo =
    duracaoEmDias >= 2 && duracaoEmDias <= 35
      ? serieDiaria(
          brutas
            .filter((linha) => linha.confirmed_at !== null)
            .map((linha) => ({
              dia: new Date(linha.confirmed_at as string).toLocaleDateString('en-CA', {
                timeZone: FUSO,
              }),
              valorCentavos: linha.total_cents,
            })),
          de,
          ate,
        )
      : null

  const esteMes = primeiroDiaDoMes()
  const trintaDias = deslocarDias(hoje, -29)
  const periodoAtivo =
    de === esteMes && ate === hoje ? 'mes' : de === trintaDias && ate === hoje ? '30' : 'outro'

  return (
    <div>
      <TituloPagina
        titulo="Relatórios"
        subtitulo="Onde as vendas acontecem e quanto sobra depois da estrada."
      />

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <Link
          href="/painel/relatorios"
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${periodoAtivo === 'mes' ? 'bg-marca-700 text-white' : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50'}`}
        >
          Este mês
        </Link>
        <Link
          href={`/painel/relatorios?de=${trintaDias}&ate=${hoje}`}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${periodoAtivo === '30' ? 'bg-marca-700 text-white' : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50'}`}
        >
          Últimos 30 dias
        </Link>
        <details className="relative" open={periodoAtivo === 'outro'}>
          <summary
            className={`cursor-pointer list-none rounded-full px-3.5 py-1.5 text-sm font-medium select-none ${periodoAtivo === 'outro' ? 'bg-marca-700 text-white' : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50'}`}
          >
            Personalizado
          </summary>
          <form className="mt-2 flex flex-wrap items-end gap-2" role="search">
            <div>
              <label htmlFor="de" className={classeRotulo}>
                De
              </label>
              <input id="de" name="de" type="date" defaultValue={de} className={classeEntrada} />
            </div>
            <div>
              <label htmlFor="ate" className={classeRotulo}>
                Até
              </label>
              <input id="ate" name="ate" type="date" defaultValue={ate} className={classeEntrada} />
            </div>
            <button type="submit" className={`${classeBotaoSecundario} w-auto`}>
              Aplicar
            </button>
          </form>
        </details>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={classeCartao}>
          <p className="text-2xl font-bold text-zinc-900">
            {formatarCentavos(resultado.totalVendidoCentavos)}
          </p>
          <p className="text-xs text-zinc-500">Vendas confirmadas no período</p>
        </div>
        <div className={classeCartao}>
          <p className="text-2xl font-bold text-zinc-900">
            {formatarCentavos(resultado.totalDespesasCentavos)}
          </p>
          <p className="text-xs text-zinc-500">Despesas da viagem</p>
          {resultado.despesasPorCategoria.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {resultado.despesasPorCategoria.slice(0, 3).map((linha) => (
                <span key={linha.categoria} className="inline-flex items-center gap-1 text-[11px]">
                  <ChipDeCategoria nome={linha.categoria} />
                  <span className="text-zinc-500">{formatarCentavos(linha.totalCentavos)}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div
          className={`${classeCartao} ${resultado.resultadoCentavos >= 0 ? 'border-emerald-200 bg-emerald-50/60' : 'border-red-200 bg-red-50/60'}`}
        >
          <p
            className={`text-2xl font-bold ${resultado.resultadoCentavos >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
          >
            {formatarCentavos(resultado.resultadoCentavos)}
          </p>
          <p className="text-xs text-zinc-500">Resultado (vendas − despesas)</p>
        </div>
      </div>

      {seriePeriodo !== null ? (
        <div className={`${classeCartao} mb-4`}>
          <p className="mb-3 font-bold text-zinc-900">Vendas por dia</p>
          <GraficoDeBarrasDiario pontos={seriePeriodo} />
        </div>
      ) : null}

      {porUf.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma venda no período"
          descricao="Confirme vendas para vê-las nos relatórios."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-labelledby="titulo-uf" className={classeCartao}>
            <h2 id="titulo-uf" className="mb-3 font-bold text-zinc-900">
              Por estado
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] tracking-wide text-zinc-400 uppercase">
                  <th scope="col" className="pb-2 font-semibold">
                    UF
                  </th>
                  <th scope="col" className="pb-2 font-semibold" aria-label="Proporção" />
                  <th scope="col" className="pb-2 text-right font-semibold">
                    Vendas
                  </th>
                  <th scope="col" className="pb-2 text-right font-semibold">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {porUf.map((linha) => (
                  <tr key={linha.uf} className="border-t border-zinc-100">
                    <td className="py-2 font-semibold text-zinc-800">{linha.uf}</td>
                    <td className="py-2">
                      <BarraProporcional valor={linha.totalCentavos} maximo={maiorUf} />
                    </td>
                    <td className="py-2 text-right text-zinc-600">{linha.quantidadeVendas}</td>
                    <td className="py-2 text-right font-semibold text-zinc-900">
                      {formatarCentavos(linha.totalCentavos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section aria-labelledby="titulo-cidade" className={classeCartao}>
            <h2 id="titulo-cidade" className="mb-3 font-bold text-zinc-900">
              Por cidade
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] tracking-wide text-zinc-400 uppercase">
                  <th scope="col" className="pb-2 font-semibold">
                    Cidade
                  </th>
                  <th scope="col" className="pb-2 font-semibold" aria-label="Proporção" />
                  <th scope="col" className="pb-2 text-right font-semibold">
                    Vendas
                  </th>
                  <th scope="col" className="pb-2 text-right font-semibold">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {porCidade.map((linha) => (
                  <tr key={`${linha.uf}-${linha.cidade}`} className="border-t border-zinc-100">
                    <td className="py-2 font-semibold text-zinc-800">
                      {linha.cidade}
                      <span className="ml-1 text-xs font-normal text-zinc-400">{linha.uf}</span>
                    </td>
                    <td className="py-2">
                      <BarraProporcional valor={linha.totalCentavos} maximo={maiorCidade} />
                    </td>
                    <td className="py-2 text-right text-zinc-600">{linha.quantidadeVendas}</td>
                    <td className="py-2 text-right font-semibold text-zinc-900">
                      {formatarCentavos(linha.totalCentavos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-zinc-400">
              Ticket médio geral:{' '}
              {formatarCentavos(
                vendas.length === 0
                  ? 0
                  : Math.round(resultado.totalVendidoCentavos / vendas.length),
              )}
            </p>
          </section>
        </div>
      )}
    </div>
  )
}
