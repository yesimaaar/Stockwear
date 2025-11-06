"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Ruler, Plus, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { InventarioService } from "@/lib/services/inventario-service"
import type { Talla } from "@/lib/types"

const ESTADO_VARIANT: Record<string, "default" | "secondary"> = {
  activo: "default",
  inactivo: "secondary",
}

export default function TallasPage() {
  const [tallas, setTallas] = useState<Talla[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let canceled = false
    const load = async () => {
      setLoading(true)
      try {
        const data = await InventarioService.getTallas()
        if (!canceled) {
          setTallas(data)
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

  const tallasNumericas = useMemo(() => tallas.filter((t) => t.tipo === "numerico"), [tallas])
  const tallasAlfanumericas = useMemo(() => tallas.filter((t) => t.tipo === "alfanumerico"), [tallas])

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
                <Ruler className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Tallas</h1>
                  <p className="text-sm text-muted-foreground">Gestión de tallas disponibles</p>
                </div>
              </div>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Talla
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 w-32 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tallas.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No hay tallas registradas todavía.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tallas Numéricas</CardTitle>
              </CardHeader>
              <CardContent>
                {tallasNumericas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay tallas numéricas registradas.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {tallasNumericas.map((talla) => (
                      <div
                        key={talla.id}
                        className="flex flex-col items-center justify-center rounded-lg border-2 border-primary bg-primary/5 p-4 transition-all hover:bg-primary/10"
                      >
                        <span className="text-2xl font-bold text-primary">{talla.nombre}</span>
                        <Badge variant={ESTADO_VARIANT[talla.estado] ?? "default"} className="mt-2">
                          {talla.estado.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tallas Alfanuméricas</CardTitle>
              </CardHeader>
              <CardContent>
                {tallasAlfanumericas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay tallas alfanuméricas registradas.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {tallasAlfanumericas.map((talla) => (
                      <div
                        key={talla.id}
                        className="flex flex-col items-center justify-center rounded-lg border-2 border-green-600 bg-green-50 p-4 transition-all hover:bg-green-100"
                      >
                        <span className="text-2xl font-bold text-green-600">{talla.nombre}</span>
                        <Badge variant={ESTADO_VARIANT[talla.estado] ?? "default"} className="mt-2">
                          {talla.estado.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
