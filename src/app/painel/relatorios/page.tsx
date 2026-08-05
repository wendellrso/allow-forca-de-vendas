import { criarClienteServidor } from '@/lib/supabase/servidor'
import { formatarCentavos } from '@/dominio/dinheiro'
import {
  agruparVendasPorCidade,
  agruparVendasPorUf,
  calcularResultadoDoPeriodo,
  CATEGORIAS_DESPESA,
  ROTULO_CATEGORIA,
  type DespesaParaRelatorio,
  type VendaParaRelatorio,
} from '@/dominio/relatorio'
import {
  classeBotaoSecundario,
  classeCartao,
  classeEntrada,
  classeRotulo,
  EstadoVazio,
  TituloPagina,
} from '@/componentes/ui'

export const dynamic = 'force-dynamic'

function primeiroDiaDoMes(): string {
  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-01`
}

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function dataValida(texto: string | undefined): string | null {
  return texto !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null
}

export default async function PaginaRelatorios({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>
}) {
  const parametros = await searchParams
  const de = dataValida(parametros.de) ?? primeiroDiaDoMes()
  const ate = dataValida(parametros.ate) ?? hojeIso()

  const supabase = await criarClienteServidor()
  const [{ data: linhasVendas }, { data: linhasDespesas }] = await Promise.all([
    supabase
      .from('sales')
      .select('city, state, total_cents')
      .in('status', ['confirmada', 'entregue'])
      .gte('confirmed_at', `${de}T00:00:00-03:00`)
      .lte('confirmed_at', `${ate}T23:59:59-03:00`),
    supabase
      .from('expenses')
      .select('category, amount_cents')
      .gte('expense_date', de)
      .lte('expense_date', ate),
  ])

  const vendas = (
    (linhasVendas ?? []) as { city: string; state: string; total_cents: number }[]
  ).map((linha): VendaParaRelatorio => ({
    cidade: linha.city,
    uf: linha.state,
    totalCentavos: linha.total_cents,
  }))
  const despesas = (
    (linhasDespesas ?? []) as {
      category: DespesaParaRelatorio['categoria']
      amount_cents: number
    }[]
  ).map((linha): DespesaParaRelatorio => ({
    categoria: linha.category,
    valorCentavos: linha.amount_cents,
  }))

  const porCidade = agruparVendasPorCidade(vendas)
  const porUf = agruparVendasPorUf(vendas)
  const resultado = calcularResultadoDoPeriodo(vendas, despesas)

  return (
    <div>
      <TituloPagina titulo="Relatórios" />

      <form className="mb-5 flex flex-wrap items-end gap-3" role="search">
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

      <section aria-labelledby="titulo-resultado" className="mb-6">
        <h2 id="titulo-resultado" className="mb-2 text-lg font-bold text-zinc-900">
          Resultado do período
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className={classeCartao}>
            <p className="text-sm text-zinc-500">Vendas confirmadas</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">
              {formatarCentavos(resultado.totalVendidoCentavos)}
            </p>
          </div>
          <div className={classeCartao}>
            <p className="text-sm text-zinc-500">Despesas da viagem</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">
              {formatarCentavos(resultado.totalDespesasCentavos)}
            </p>
          </div>
          <div className={classeCartao}>
            <p className="text-sm text-zinc-500">Resultado</p>
            <p
              className={`mt-1 text-xl font-bold ${resultado.resultadoCentavos >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
            >
              {formatarCentavos(resultado.resultadoCentavos)}
            </p>
          </div>
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Despesas:{' '}
          {CATEGORIAS_DESPESA.map(
            (categoria) =>
              `${ROTULO_CATEGORIA[categoria]} ${formatarCentavos(resultado.despesasPorCategoria[categoria])}`,
          ).join(' · ')}
        </p>
      </section>

      <section aria-labelledby="titulo-uf" className="mb-6">
        <h2 id="titulo-uf" className="mb-2 text-lg font-bold text-zinc-900">
          Vendas por estado
        </h2>
        {porUf.length === 0 ? (
          <EstadoVazio
            titulo="Nenhuma venda no período"
            descricao="Confirme vendas para vê-las nos relatórios."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th scope="col" className="px-4 py-2 font-medium">
                    UF
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Vendas
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Total
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Ticket médio
                  </th>
                </tr>
              </thead>
              <tbody>
                {porUf.map((linha) => (
                  <tr key={linha.uf} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-2 font-medium">{linha.uf}</td>
                    <td className="px-4 py-2 text-right">{linha.quantidadeVendas}</td>
                    <td className="px-4 py-2 text-right font-semibold">
                      {formatarCentavos(linha.totalCentavos)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {formatarCentavos(linha.ticketMedioCentavos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="titulo-cidade">
        <h2 id="titulo-cidade" className="mb-2 text-lg font-bold text-zinc-900">
          Vendas por cidade
        </h2>
        {porCidade.length === 0 ? (
          <p className="text-sm text-zinc-500">Sem dados no período.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th scope="col" className="px-4 py-2 font-medium">
                    Cidade
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Vendas
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Total
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Ticket médio
                  </th>
                </tr>
              </thead>
              <tbody>
                {porCidade.map((linha) => (
                  <tr
                    key={`${linha.uf}-${linha.cidade}`}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-4 py-2 font-medium">
                      {linha.cidade}/{linha.uf}
                    </td>
                    <td className="px-4 py-2 text-right">{linha.quantidadeVendas}</td>
                    <td className="px-4 py-2 text-right font-semibold">
                      {formatarCentavos(linha.totalCentavos)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {formatarCentavos(linha.ticketMedioCentavos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
