import Link from "next/link"
import { Package, Plus, Search, Filter, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function ProductosPage() {
  const productos = [
    {
      id: 1,
      codigo: "ZAP-001",
      nombre: "Nike Air Max 270",
      categoria: "Calzado Deportivo",
      precio: 450000,
      stock: 45,
      estado: "Activo",
      imagen: "/athletic-shoes.png",
    },
    {
      id: 2,
      codigo: "CAM-002",
      nombre: "Camiseta Adidas Running",
      categoria: "Ropa Deportiva",
      precio: 120000,
      stock: 120,
      estado: "Activo",
      imagen: "/adidas-shirt.jpg",
    },
    {
      id: 3,
      codigo: "ZAP-003",
      nombre: "Puma RS-X",
      categoria: "Calzado Deportivo",
      precio: 380000,
      stock: 8,
      estado: "Activo",
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
                <Package className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Productos</h1>
                  <p className="text-sm text-muted-foreground">Gestión de inventario</p>
                </div>
              </div>
            </div>
            <Link href="/productos/nuevo">
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
              <Input placeholder="Buscar por nombre o código..." className="pl-10" />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {productos.map((producto) => (
            <Card key={producto.id}>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex gap-4">
                    <img
                      src={producto.imagen || "/placeholder.svg"}
                      alt={producto.nombre}
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{producto.nombre}</h3>
                        <Badge variant={producto.estado === "Activo" ? "default" : "secondary"}>
                          {producto.estado}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Código: {producto.codigo}</p>
                      <p className="text-sm text-muted-foreground">Categoría: {producto.categoria}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 md:flex-row md:items-center md:gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">${producto.precio.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Stock: {producto.stock} unidades</p>
                    </div>
                    <Link href={`/productos/${producto.id}`}>
                      <Button variant="outline">Ver Detalles</Button>
                    </Link>
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
