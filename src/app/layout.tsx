import { type Metadata, type Viewport } from 'next'
import { Montserrat, Playfair_Display } from 'next/font/google'
import { type ReactNode } from 'react'
import './globals.css'

const fonteCorpo = Montserrat({
  subsets: ['latin'],
  variable: '--fonte-corpo',
  display: 'swap',
})

const fonteMarca = Playfair_Display({
  subsets: ['latin'],
  variable: '--fonte-marca',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Allow Beauty Hair',
    template: '%s — Allow Beauty Hair',
  },
  description: 'Cosméticos profissionais Allow Beauty Hair.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#491226',
}

export default function LayoutRaiz({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fonteCorpo.variable} ${fonteMarca.variable}`}>
      <body>{children}</body>
    </html>
  )
}
