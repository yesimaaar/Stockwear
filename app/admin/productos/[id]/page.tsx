"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProductoService, type ProductoConStock } from "@/lib/services/producto-service"

export default function ProductoDetallePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [producto, setProducto] = useState<ProductoConStock | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const idParam = params?.id
    if (!idParam) {
      setError("Identificador no válido")
      setLoading(false)
      return
    }

    const productoId = Number(idParam)
    if (Number.isNaN(productoId)) {
      setError("Identificador no válido")
      setLoading(false)
      return
    }

    let canceled = false
    const load = async () => {
      setLoading(true)
      try {
        const data = await ProductoService.getById(productoId)
        if (!canceled) {
          if (!data) {
            setError("Producto no encontrado")
          }
          setProducto(data)
        }
      } finally {
        if (!canceled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      canceled = true
    }
  }, [params])

  const stockBajo = useMemo(() => {
    if (!producto) return 0
    return producto.stockPorTalla.filter((detalle) => detalle.cantidad < producto.stockMinimo).length
  }, [producto])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Cargando información del producto…</p>
      </div>
    )
  }

  if (error || !producto) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="text-muted-foreground">{error ?? "Producto no encontrado"}</p>
        <Button onClick={() => router.push("/admin/productos")}>Regresar al listado</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin/productos">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Detalle del Producto</h1>
                <p className="text-sm text-muted-foreground">Código {producto.codigo}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Información del Producto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <img
                  src={producto.imagen || "/placeholder.svg"}
                  alt={producto.nombre}
                  className="w-full rounded-lg object-cover"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold">{producto.nombre}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={producto.estado === "activo" ? "default" : "secondary"}>
                      {producto.estado.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">{producto.categoria}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <p className="font-semibold text-foreground">Proveedor</p>
                    <p>{producto.proveedor || "No especificado"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Stock mínimo</p>
                    <p>{producto.stockMinimo} unidades</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Stock total</p>
                    <p>{producto.stockTotal} unidades</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Ubicaciones bajo mínimo</p>
                    <p>{stockBajo}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detalles Comerciales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Precio</p>
                    <p className="text-xl font-bold text-primary">${producto.precio.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Descuento</p>
                    <p className="font-semibold">{producto.descuento}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estado</p>
                    <p className="font-semibold">{producto.estado}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Creado</p>
                    <p className="font-semibold">
                      {new Date(producto.createdAt).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stock por Almacén y Talla</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {producto.stockPorTalla.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No hay unidades registradas para este producto.
                    </p>
                  )}
                  {producto.stockPorTalla.map((item, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{item.almacen}</p>
                        <p className="text-sm text-muted-foreground">Talla {item.talla}</p>
                      </div>
                      <Badge variant={item.cantidad < producto.stockMinimo ? "destructive" : "default"}>
                        {item.cantidad} unidades
                      </Badge>
                    </div>
                  ))}
                </div>
                <Link href="/admin/productos">
                  <Button variant="outline" className="mt-4 w-full bg-transparent">
                    Volver al listado
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
