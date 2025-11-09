import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

// Fonts are loaded via CSS fallback in globals.css to avoid build-time network issues
const fontVariables = "--font-sans --font-mono"

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
    <html lang="es" suppressHydrationWarning>
  <body className={`min-h-screen bg-background text-foreground antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
