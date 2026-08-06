/**
 * Avatar de iniciais com cor estável: a mesma pessoa tem sempre a mesma cor,
 * calculada do nome — identidade visual sem foto.
 */

const TONS = [
  'bg-rose-100 text-rose-800',
  'bg-amber-100 text-amber-800',
  'bg-emerald-100 text-emerald-800',
  'bg-sky-100 text-sky-800',
  'bg-violet-100 text-violet-800',
  'bg-teal-100 text-teal-800',
  'bg-orange-100 text-orange-800',
  'bg-fuchsia-100 text-fuchsia-800',
] as const

function indiceEstavel(texto: string): number {
  let soma = 0
  for (let posicao = 0; posicao < texto.length; posicao += 1) {
    soma = (soma * 31 + texto.charCodeAt(posicao)) % 997
  }
  return soma % TONS.length
}

export function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? '?'
  const ultima = partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : ''
  return `${primeira}${ultima}`.toLocaleUpperCase('pt-BR')
}

export function Avatar({ nome, tamanho = 'md' }: { nome: string; tamanho?: 'sm' | 'md' | 'lg' }) {
  const classes = {
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-12 w-12 text-base',
  }[tamanho]

  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-bold ${classes} ${TONS[indiceEstavel(nome)]}`}
    >
      {iniciaisDe(nome)}
    </span>
  )
}
