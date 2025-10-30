import Link from "next/link"
import { Warehouse, Plus, ArrowLeft, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function AlmacenesPage() {
  const almacenes = [
    {
      id: 1,
      nombre: "Almacén Principal",
      direccion: "Calle 15 #10-25, Valledupar",
      tipo: "Almacén",
      productos: 234,
      estado: "Activo",
    },
    {
      id: 2,
      nombre: "Sucursal Centro",
      direccion: "Carrera 9 #16-30, Centro",
      tipo: "Punto de Venta",
      productos: 156,
      estado: "Activo",
    },
    {
      id: 3,
      nombre: "Sucursal Norte",
      direccion: "Avenida Simón Bolívar #45-12",
      tipo: "Punto de Venta",
      productos: 98,
      estado: "Activo",
    },
    {
      id: 4,
      nombre: "Bodega Temporal",
      direccion: "Zona Industrial, Bodega 7",
      tipo: "Almacén",
      productos: 67,
      estado: "Inactivo",
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
                        {almacen.direccion}
                      </div>
                    </div>
                  </div>
                  <Badge variant={almacen.estado === "Activo" ? "default" : "secondary"}>{almacen.estado}</Badge>
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <p className="font-semibold">{almacen.tipo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Productos</p>
                    <p className="text-2xl font-bold text-primary">{almacen.productos}</p>
                  </div>
                </div>
                <Button variant="outline" className="mt-4 w-full bg-transparent">
                  Ver Detalles
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
