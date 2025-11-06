"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Package, Plus, Search, ArrowLeft, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProductoService, type ProductoConStock } from "@/lib/services/producto-service"

export default function ProductosPage() {
  const [productos, setProductos] = useState<ProductoConStock[]>([])
  const [filteredProductos, setFilteredProductos] = useState<ProductoConStock[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)

  const cargarProductos = useCallback(async () => {
    setLoading(true)
    try {
      const data = await ProductoService.getAll()
      setProductos(data)
      setFilteredProductos(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void cargarProductos()
  }, [cargarProductos])

  const ejecutarBusqueda = useCallback(
    async (query: string) => {
      const trimmed = query.trim()
      if (trimmed.length === 0) {
        setFilteredProductos(productos)
        return
      }

      setSearching(true)
      try {
        const results = await ProductoService.search(trimmed)
        setFilteredProductos(results)
      } finally {
        setSearching(false)
      }
    },
    [productos],
  )

  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setFilteredProductos(productos)
    }
  }, [searchQuery, productos])

  const productosConInfo = useMemo(() => {
    return filteredProductos.map((producto) => {
      const stockBajo = producto.stockPorTalla.filter((detalle) => detalle.cantidad < producto.stockMinimo).length
      return { ...producto, stockBajo }
    })
  }, [filteredProductos])

  const totalStockBajo = useMemo(
    () => productosConInfo.reduce((sum, producto) => sum + producto.stockBajo, 0),
    [productosConInfo],
  )

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
                <Package className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Productos y Stock</h1>
                  <p className="text-sm text-muted-foreground">Gestión completa de inventario</p>
                </div>
              </div>
            </div>
            <Link href="/admin/productos/nuevo">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Producto
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    void ejecutarBusqueda(searchQuery)
                  }
                }}
                placeholder="Buscar por nombre, código o almacén..."
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={() => void ejecutarBusqueda(searchQuery)} disabled={searching}>
              <Search className="mr-2 h-4 w-4" />
              {searching ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </div>

        {totalStockBajo > 0 && (
          <div className="mb-6 rounded-lg bg-yellow-50 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="font-semibold text-yellow-900">
                {totalStockBajo} {totalStockBajo === 1 ? "ubicación" : "ubicaciones"} por debajo del stock mínimo
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 w-56 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : productosConInfo.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No hay productos registrados aún.
          </div>
        ) : (
          <div className="grid gap-6">
            {productosConInfo.map((producto) => (
              <Card key={producto.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:gap-6">
                    <img
                      src={producto.imagen || "/placeholder.svg"}
                      alt={producto.nombre}
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{producto.nombre}</h3>
                            <Badge variant={producto.estado === "activo" ? "default" : "secondary"}>
                              {producto.estado.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Código: {producto.codigo}</p>
                          <p className="text-sm text-muted-foreground">Categoría: {producto.categoria}</p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-2xl font-bold text-primary">
                            ${producto.precio.toLocaleString()}
                          </p>
                          <p className="text-sm font-medium text-muted-foreground">
                            Stock Total: {producto.stockTotal} unidades
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                        <h4 className="text-sm font-semibold text-foreground">Detalle por Almacén y Talla</h4>
                        <div className="grid gap-2">
                          {producto.stockPorTalla.map((detalle, index) => (
                            <div key={index} className="flex items-center justify-between rounded-md bg-background p-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{detalle.almacen}</Badge>
                                <Badge variant="secondary">Talla {detalle.talla}</Badge>
                              </div>
                              <div className="text-right">
                                <p
                                  className={`text-lg font-bold ${
                                    detalle.cantidad < producto.stockMinimo ? "text-red-600" : "text-green-600"
                                  }`}
                                >
                                  {detalle.cantidad}
                                </p>
                                <p className="text-xs text-muted-foreground">Mín: {producto.stockMinimo}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="pt-3 text-right">
                          <Link href={`/admin/productos/${producto.id}`}>
                            <Button variant="outline" size="sm">
                              Ver detalle completo
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
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
