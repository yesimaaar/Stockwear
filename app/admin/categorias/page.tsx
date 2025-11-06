"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Tag, Plus, ArrowLeft, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { InventarioService, type CategoriaResumen } from "@/lib/services/inventario-service"

const ESTADO_VARIANT: Record<string, "default" | "secondary"> = {
  activo: "default",
  inactivo: "secondary",
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<CategoriaResumen[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let canceled = false

    const load = async () => {
      setLoading(true)
      try {
        const data = await InventarioService.getCategoriasResumen()
        if (!canceled) {
          setCategorias(data)
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
                <Tag className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Categorías</h1>
                  <p className="text-sm text-muted-foreground">Organización de productos</p>
                </div>
              </div>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Categoría
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 w-40 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : categorias.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No se encontraron categorías.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categorias.map((categoria) => (
              <Card key={categoria.id} className="transition-all hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Tag className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant={ESTADO_VARIANT[categoria.estado] ?? "default"}>
                      {categoria.estado.toUpperCase()}
                    </Badge>
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{categoria.nombre}</h3>
                  <p className="mb-4 text-sm text-muted-foreground">{categoria.descripcion ?? "Sin descripción"}</p>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Productos activos</span>
                    <span className="text-lg font-bold text-primary">{categoria.productosActivos}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
