import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({
  subsets: ["latin"],
  display: "swap",
  preload: true,
})
const _geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: true,
})

export const metadata: Metadata = {
  title: "StockWear - Sistema de Gestión de Inventario",
  description: "Sistema de gestión de inventario y ventas para calzado y ropa deportiva con reconocimiento visual",
  generator: "Next.js",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  icons: {
    // ruta relativa a la carpeta `public/`
    icon: '/favicon.svg',
    // Puedes añadir más variantes si las tienes, por ejemplo:
    // apple: '/apple-touch-icon.png'
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
