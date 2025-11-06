"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Warehouse, Plus, ArrowLeft, MapPin, Boxes } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { InventarioService, type AlmacenResumen } from "@/lib/services/inventario-service"

const ESTADO_VARIANT: Record<string, "default" | "secondary"> = {
  activo: "default",
  inactivo: "secondary",
}

export default function AlmacenesPage() {
  const [almacenes, setAlmacenes] = useState<AlmacenResumen[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let canceled = false

    const load = async () => {
      setLoading(true)
      try {
        const data = await InventarioService.getAlmacenesResumen()
        if (!canceled) {
          setAlmacenes(data)
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
                <Warehouse className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Almacenes</h1>
                  <p className="text-sm text-muted-foreground">Puntos de venta y almacenamiento</p>
                </div>
              </div>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Almacén
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 w-40 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : almacenes.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No hay almacenes registrados.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {almacenes.map((almacen) => (
              <Card key={almacen.id} className="transition-all hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Warehouse className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{almacen.nombre}</h3>
                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {almacen.direccion || "Sin dirección"}
                        </div>
                      </div>
                    </div>
                    <Badge variant={ESTADO_VARIANT[almacen.estado] ?? "default"}>
                      {almacen.estado.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo</p>
                      <p className="font-semibold capitalize">{almacen.tipo}</p>
                    </div>
                    <div className="text-right">
                      <p className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                        <Boxes className="h-4 w-4" /> Inventario total
                      </p>
                      <p className="text-2xl font-bold text-primary">{almacen.stockTotal}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Productos únicos: <span className="font-semibold text-foreground">{almacen.productosUnicos}</span>
                    </div>
                  </div>
                  <Button variant="outline" className="mt-4 w-full bg-transparent">
                    Ver Detalles
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
