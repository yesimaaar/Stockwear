"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { History, ArrowLeft, Download, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { InventarioService, type MovimientoDetallado } from "@/lib/services/inventario-service"

const BADGE_VARIANT: Record<MovimientoDetallado["tipo"], "default" | "secondary" | "destructive"> = {
  entrada: "default",
  salida: "destructive",
  venta: "secondary",
  ajuste: "secondary",
}

const formatTipo = (tipo: MovimientoDetallado["tipo"]) => tipo.charAt(0).toUpperCase() + tipo.slice(1)

export default function HistorialPage() {
  const [movimientos, setMovimientos] = useState<MovimientoDetallado[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let canceled = false

    const load = async () => {
      setLoading(true)
      try {
        const data = await InventarioService.getHistorialDetallado(50)
        if (!canceled) {
          setMovimientos(data)
        }
      } finally {
        if (!canceled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      canceled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <History className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Historial de Movimientos</h1>
                  <p className="text-sm text-muted-foreground">Trazabilidad de stock</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 w-48 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : movimientos.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No se registran movimientos recientes.
          </div>
        ) : (
          <div className="space-y-4">
            {movimientos.map((mov) => {
              const variant = BADGE_VARIANT[mov.tipo] ?? "default"
              const cantidad = mov.cantidad
              const isPositive = cantidad >= 0
              return (
                <Card key={mov.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant={variant}>{formatTipo(mov.tipo)}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(mov.createdAt).toLocaleString("es-CO")}
                          </span>
                        </div>
                        <h3 className="font-semibold">{mov.productoNombre}</h3>
                        <p className="text-sm text-muted-foreground">
                          Talla {mov.tallaNombre} • {mov.almacenNombre}
                        </p>
                        {mov.motivo && (
                          <p className="mt-1 text-sm">
                            <span className="text-muted-foreground">Motivo:</span> {mov.motivo}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Cantidad</p>
                          <p className={`text-2xl font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                            {isPositive ? "+" : ""}
                            {cantidad}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Usuario</p>
                          <p className="font-semibold">{mov.usuarioNombre}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
