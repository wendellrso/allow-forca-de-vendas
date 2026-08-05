import { type Metadata, type Viewport } from 'next'
import { type ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Allow',
    template: '%s — Allow',
  },
  description: 'Força de vendas externa da Allow.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function LayoutRaiz({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
