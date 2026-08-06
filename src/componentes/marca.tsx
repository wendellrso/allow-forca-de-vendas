/**
 * Assinatura da marca Allow Beauty Hair, recriada tipograficamente a partir
 * do catálogo oficial: "allow" em serifa elegante e "Beauty Hair" espaçado.
 */

export function MarcaAllow({
  tom = 'dourado',
  tamanho = 'md',
}: {
  /** dourado sobre fundos escuros; vinho sobre fundos claros. */
  tom?: 'dourado' | 'vinho'
  tamanho?: 'sm' | 'md' | 'lg'
}) {
  const classePrincipal = tom === 'dourado' ? 'texto-dourado' : 'text-marca-800'
  const classeSecundaria = tom === 'dourado' ? 'text-dourado-400' : 'text-marca-700'

  const tamanhos = {
    sm: { principal: 'text-2xl', secundaria: 'text-[0.55rem] tracking-[0.35em]' },
    md: { principal: 'text-4xl', secundaria: 'text-[0.65rem] tracking-[0.4em]' },
    lg: { principal: 'text-6xl', secundaria: 'text-xs tracking-[0.5em]' },
  }[tamanho]

  return (
    <span className="inline-flex flex-col items-center leading-none">
      <span className={`font-marca ${tamanhos.principal} font-medium ${classePrincipal}`}>
        allow
      </span>
      <span className={`mt-1 uppercase ${tamanhos.secundaria} ${classeSecundaria}`}>
        Beauty Hair
      </span>
    </span>
  )
}
