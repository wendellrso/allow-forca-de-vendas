import { type SVGProps } from 'react'

/** Ícones de traço no estilo do Stok ERP, embutidos para não depender de CDN. */

function Base({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-5 w-5 shrink-0"
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconeInicio(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </Base>
  )
}

export function IconeVendas(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="9" cy="19" r="1.6" />
      <circle cx="17" cy="19" r="1.6" />
      <path d="M3 4h2l2.6 11h10.2l2.2-8H6.2" />
    </Base>
  )
}

export function IconeClientes(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M16 5.5a3 3 0 010 5.6" />
      <path d="M17.5 15.2c1.7.6 2.7 2 3 4.3" />
    </Base>
  )
}

export function IconeProdutos(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path d="M12 12l8-4.5" />
      <path d="M12 12v9" />
      <path d="M12 12L4 7.5" />
    </Base>
  )
}

export function IconeFinanceiro(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6.5 9.5h.01M17.5 14.5h.01" />
    </Base>
  )
}

export function IconeRelatorios(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </Base>
  )
}

export function IconeCatalogo(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 5.5C10.5 4 8.5 3.5 6 3.5c-1 0-2 .2-3 .5v15c1-.3 2-.5 3-.5 2.5 0 4.5.5 6 2 1.5-1.5 3.5-2 6-2 1 0 2 .2 3 .5v-15c-1-.3-2-.5-3-.5-2.5 0-4.5.5-6 2z" />
      <path d="M12 5.5V20.5" />
    </Base>
  )
}

export function IconeSair(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M14 8V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h7a2 2 0 002-2v-2" />
      <path d="M9 12h12" />
      <path d="M18 9l3 3-3 3" />
    </Base>
  )
}
