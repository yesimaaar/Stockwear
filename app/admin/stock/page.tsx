import Link from "next/link"
import { ShoppingBag, Plus, ArrowLeft, Search, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function StockPage() {
  const stockItems = [
    {
      id: 1,
      producto: "Nike Air Max 270",
      codigo: "ZAP-001",
      almacen: "Almacén Principal",
      talla: "38",
      cantidad: 15,
      minimo: 10,
      imagen: "/athletic-shoes.png",
    },
    {
      id: 2,
      producto: "Nike Air Max 270",
      codigo: "ZAP-001",
      almacen: "Almacén Principal",
      talla: "39",
      cantidad: 8,
      minimo: 10,
      imagen: "/athletic-shoes.png",
    },
    {
      id: 3,
      producto: "Camiseta Adidas Running",
      codigo: "CAM-002",
      almacen: "Sucursal Centro",
      talla: "M",
      cantidad: 25,
      minimo: 15,
      imagen: "/adidas-shirt.jpg",
    },
    {
      id: 4,
      producto: "Puma RS-X",
      codigo: "ZAP-003",
      almacen: "Almacén Principal",
      talla: "40",
      cantidad: 5,
      minimo: 10,
      imagen: "/athletic-sneakers.png",
    },
  ]

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
                <ShoppingBag className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Control de Stock</h1>
                  <p className="text-sm text-muted-foreground">Inventario por almacén y talla</p>
                </div>
              </div>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Asignar Stock
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por producto, código o almacén..." className="pl-10" />
          </div>
        </div>

        <div className="mb-4 rounded-lg bg-yellow-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="font-semibold text-yellow-900">2 productos por debajo del stock mínimo</p>
          </div>
        </div>

        <div className="grid gap-4">
          {stockItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex gap-4">
                    <img
                      src={item.imagen || "/placeholder.svg"}
                      alt={item.producto}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <div>
                      <h3 className="font-semibold">{item.producto}</h3>
                      <p className="text-sm text-muted-foreground">Código: {item.codigo}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline">{item.almacen}</Badge>
                        <Badge variant="secondary">Talla {item.talla}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Stock Actual</p>
                      <p
                        className={`text-2xl font-bold ${
                          item.cantidad < item.minimo ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {item.cantidad}
                      </p>
                      <p className="text-xs text-muted-foreground">Mínimo: {item.minimo}</p>
                    </div>
                    <Button variant="outline">Actualizar</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
