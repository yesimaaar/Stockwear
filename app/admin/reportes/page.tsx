"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { BarChart3, ArrowLeft, Package, Eye, Boxes } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { ProductoService, type ProductoConStock } from "@/lib/services/producto-service"
import { ReconocimientoService } from "@/lib/services/reconocimiento-service"

interface ResumenInventario {
  productosActivos: number
  productosInactivos: number
  stockTotal: number
  totalProductos: number
  almacenes: number
}

interface ProductoConsultado {
  id: number
  nombre: string
  consultas: number
}

export default function ReportesPage() {
  const [resumen, setResumen] = useState<ResumenInventario | null>(null)
  const [productosStockBajo, setProductosStockBajo] = useState<ProductoConStock[]>([])
  const [productosConsultados, setProductosConsultados] = useState<ProductoConsultado[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let canceled = false

    const load = async () => {
      setLoading(true)
      try {
        const [productosResp, stockResp, almacenesResp, masConsultadosResp, stockBajoResp] = await Promise.all([
          supabase.from("productos").select("id,estado"),
          supabase.from("stock").select("cantidad"),
          supabase.from("almacenes").select("id"),
          ReconocimientoService.getProductosMasConsultados(5),
          ProductoService.getStockBajo(),
        ])

        if (canceled) return

        const productosData = (productosResp.data as Array<{ id: number; estado: string }> | null) ?? []
        const stockData = (stockResp.data as Array<{ cantidad: number | null }> | null) ?? []
        const almacenesCount = (almacenesResp.data as Array<{ id: number }> | null)?.length ?? 0

        const activos = productosData.filter((producto) => producto.estado === "activo").length
        const inactivos = productosData.length - activos
        const stockTotal = stockData.reduce((sum, item) => sum + (item.cantidad ?? 0), 0)

        const consultados = masConsultadosResp
          .filter((item) => item.producto)
          .map((item) => ({
            id: item.producto!.id,
            nombre: item.producto!.nombre,
            consultas: item.consultas,
          }))

        setResumen({
          productosActivos: activos,
          productosInactivos: inactivos,
          stockTotal,
          totalProductos: productosData.length,
          almacenes: almacenesCount,
        })
        setProductosConsultados(consultados)
        setProductosStockBajo(stockBajoResp)
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
  }, [])

  const totalConsultas = useMemo(
    () => productosConsultados.reduce((sum, item) => sum + item.consultas, 0),
    [productosConsultados],
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Reportes y Estadísticas</h1>
                <p className="text-sm text-muted-foreground">Análisis de datos del negocio</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading && !resumen ? (
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 w-48 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="transition-all hover:shadow-lg">
              <CardHeader>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                  <Package className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Estado general de inventario</CardTitle>
                <CardDescription className="text-base">
                  Resumen de productos activos e inventario disponible en los almacenes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Productos totales: {resumen?.totalProductos ?? 0}</p>
                <p className="text-sm text-green-600">Activos: {resumen?.productosActivos ?? 0}</p>
                <p className="text-sm text-red-600">Inactivos: {resumen?.productosInactivos ?? 0}</p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Boxes className="h-4 w-4" /> Stock total disponible: {resumen?.stockTotal ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Almacenes registrados: {resumen?.almacenes ?? 0}</p>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-lg">
              <CardHeader>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
                  <Eye className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl">Productos más consultados</CardTitle>
                <CardDescription className="text-base">
                  Registros basados en consultas exitosas mediante reconocimiento visual
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {productosConsultados.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aún no hay consultas registradas.</p>
                ) : (
                  <div className="space-y-2">
                    {productosConsultados.map((producto) => (
                      <div
                        key={producto.id}
                        className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
                      >
                        <span className="text-sm font-medium">{producto.nombre}</span>
                        <span className="text-sm text-muted-foreground">{producto.consultas} consultas</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Total de consultas: {totalConsultas}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Productos con stock bajo</CardTitle>
            <CardDescription>Listado de productos cuya disponibilidad está por debajo del mínimo configurado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && productosStockBajo.length === 0 ? (
              <p className="text-sm text-muted-foreground">Calculando niveles de stock…</p>
            ) : productosStockBajo.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todos los productos cumplen con el stock mínimo establecido.</p>
            ) : (
              <div className="grid gap-3">
                {productosStockBajo.map((producto) => (
                  <div key={producto.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{producto.nombre}</p>
                      <p className="text-xs text-muted-foreground">Stock total: {producto.stockTotal}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-red-600">
                        Mínimo requerido: {producto.stockMinimo}
                      </p>
                      <Link href={`/admin/productos/${producto.id}`}>
                        <Button variant="outline" size="sm" className="mt-2">
                          Revisar
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
