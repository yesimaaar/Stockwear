import type React from "react"
import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/components/theme-provider"
import { CartProvider } from "@/hooks/useCart"
import { StoreGuard } from "@/features/auth/components/auth/StoreGuard"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

export const metadata: Metadata = {
  title: "StockWear - Sistema de Gestión de Inventario",
  description: "Sistema de gestión de inventario y ventas para calzado y ropa deportiva con reconocimiento visual",
  generator: "Next.js",
  icons: {
    icon: [
      { url: "/stockwear-icon.png", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/stockwear-icon.png",
    apple: "/stockwear-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`min-h-screen bg-background text-foreground antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <CartProvider>
            <StoreGuard>
              {children}
            </StoreGuard>
            <Analytics />
            <SpeedInsights />
            <Toaster />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
