import Link from "next/link"
import { ArrowLeft, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function ProductoDetallePage() {
  const producto = {
    id: 1,
    codigo: "ZAP-001",
    nombre: "Nike Air Max 270",
    categoria: "Calzado Deportivo",
    precio: 450000,
    descuento: 10,
    proveedor: "Nike Inc.",
    stockMinimo: 10,
    estado: "Activo",
    descripcion: "Zapatillas deportivas de alta calidad con tecnología Air Max para máximo confort.",
    imagen: "/product-1.png",
    fechaCreacion: "2025-01-15",
  }

  const stockPorAlmacen = [
    { almacen: "Almacén Principal", talla: "38", cantidad: 15 },
    { almacen: "Almacén Principal", talla: "39", cantidad: 20 },
    { almacen: "Almacén Principal", talla: "40", cantidad: 10 },
    { almacen: "Sucursal Centro", talla: "38", cantidad: 8 },
    { almacen: "Sucursal Centro", talla: "39", cantidad: 12 },
  ]

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
                <p className="text-sm text-muted-foreground">{producto.codigo}</p>
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
                    <Badge variant="default">{producto.estado}</Badge>
                    <Badge variant="outline">{producto.categoria}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Descripción</p>
                  <p className="mt-1">{producto.descripcion}</p>
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
                    <p className="text-sm text-muted-foreground">Código</p>
                    <p className="font-semibold">{producto.codigo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Proveedor</p>
                    <p className="font-semibold">{producto.proveedor}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Precio</p>
                    <p className="text-xl font-bold text-primary">${producto.precio.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Descuento</p>
                    <p className="font-semibold">{producto.descuento}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stock Mínimo</p>
                    <p className="font-semibold">{producto.stockMinimo} unidades</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                    <p className="font-semibold">{producto.fechaCreacion}</p>
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
                  {stockPorAlmacen.map((item, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{item.almacen}</p>
                        <p className="text-sm text-muted-foreground">Talla {item.talla}</p>
                      </div>
                      <Badge variant={item.cantidad < 10 ? "destructive" : "default"}>{item.cantidad} unidades</Badge>
                    </div>
                  ))}
                </div>
                <Link href="/admin/stock">
                  <Button variant="outline" className="mt-4 w-full bg-transparent">
                    Ver Todo el Stock
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
