import Link from 'next/link'
import { type EstadoItemDeCadastro } from './acoes'
import { SecaoDeArquivados } from './arquivados'
import { ComposerDeItem } from './formularios'

interface ItemDeApoio {
  id: string
  name: string
}

/**
 * Página de cadastro de apoio no padrão do hub: cabeçalho com respiro,
 * criação em um gesto e lista de linhas elegantes — nada de tabela.
 */
export function PaginaDeCadastroDeApoio({
  titulo,
  descricao,
  itens,
  itensArquivados,
  emojiDoItem,
  acaoCriar,
  acaoArquivar,
  acaoRestaurar,
  placeholder,
  dica,
  rotuloArquivadoSingular,
  rotuloArquivadoPlural,
}: {
  titulo: string
  descricao: string
  itens: ItemDeApoio[]
  itensArquivados: ItemDeApoio[]
  emojiDoItem: (nome: string) => string
  acaoCriar: (anterior: EstadoItemDeCadastro, dados: FormData) => Promise<EstadoItemDeCadastro>
  acaoArquivar: (dados: FormData) => Promise<void>
  acaoRestaurar: (dados: FormData) => Promise<void>
  placeholder: string
  dica: string
  rotuloArquivadoSingular: string
  rotuloArquivadoPlural: string
}) {
  return (
    <div className="mx-auto max-w-xl py-2">
      <Link href="/painel/cadastros" className="hover:text-marca-700 text-sm text-zinc-500">
        ← Cadastros
      </Link>

      <header className="mt-3 mb-6">
        <h1 className="font-marca text-3xl font-bold text-zinc-900">{titulo}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{descricao}</p>
      </header>

      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <ComposerDeItem acaoCriar={acaoCriar} placeholder={placeholder} />
      </div>

      {itens.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <p className="text-3xl" aria-hidden>
            ✨
          </p>
          <p className="mt-2 font-medium text-zinc-700">Nada por aqui ainda</p>
          <p className="mt-1 text-sm text-zinc-500">Crie o primeiro item no campo acima.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {itens.map((item) => (
            <li
              key={item.id}
              className="group hover:border-marca-200 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition-all hover:shadow-md"
            >
              <span
                aria-hidden
                className="bg-marca-50 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg"
              >
                {emojiDoItem(item.name)}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-zinc-800">{item.name}</span>
              <form action={acaoArquivar}>
                <input type="hidden" name="id" value={item.id} />
                <button
                  type="submit"
                  title="Arquivar"
                  aria-label={`Arquivar ${item.name}`}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  Arquivar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <SecaoDeArquivados
        itens={itensArquivados}
        acaoRestaurar={acaoRestaurar}
        rotuloSingular={rotuloArquivadoSingular}
        rotuloPlural={rotuloArquivadoPlural}
      />

      <p className="mt-5 text-center text-xs leading-relaxed text-zinc-400">{dica}</p>
    </div>
  )
}
