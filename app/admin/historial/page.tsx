import Link from "next/link"
import { History, ArrowLeft, Download, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function HistorialPage() {
  const movimientos = [
    {
      id: 1,
      fecha: "2025-01-20 14:30",
      tipo: "Entrada",
      producto: "Nike Air Max 270",
      talla: "38",
      almacen: "Almacén Principal",
      cantidad: 20,
      usuario: "Admin",
      motivo: "Compra a proveedor",
    },
    {
      id: 2,
      fecha: "2025-01-20 15:45",
      tipo: "Venta",
      producto: "Camiseta Adidas Running",
      talla: "M",
      almacen: "Sucursal Centro",
      cantidad: -2,
      usuario: "Empleado 1",
      motivo: "Venta al cliente",
    },
    {
      id: 3,
      fecha: "2025-01-20 16:20",
      tipo: "Ajuste",
      producto: "Puma RS-X",
      talla: "40",
      almacen: "Almacén Principal",
      cantidad: -3,
      usuario: "Admin",
      motivo: "Corrección de inventario",
    },
    {
      id: 4,
      fecha: "2025-01-21 09:15",
      tipo: "Salida",
      producto: "Nike Air Max 270",
      talla: "39",
      almacen: "Almacén Principal",
      cantidad: -5,
      usuario: "Admin",
      motivo: "Traslado a sucursal",
    },
  ]

  const getTipoBadge = (tipo: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      Entrada: "default",
      Salida: "destructive",
      Venta: "secondary",
      Ajuste: "secondary",
    }
    return variants[tipo] || "default"
  }

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
                <History className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Historial de Movimientos</h1>
                  <p className="text-sm text-muted-foreground">Trazabilidad de stock</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          {movimientos.map((mov) => (
            <Card key={mov.id}>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant={getTipoBadge(mov.tipo)}>{mov.tipo}</Badge>
                      <span className="text-sm text-muted-foreground">{mov.fecha}</span>
                    </div>
                    <h3 className="font-semibold">{mov.producto}</h3>
                    <p className="text-sm text-muted-foreground">
                      Talla {mov.talla} • {mov.almacen}
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="text-muted-foreground">Motivo:</span> {mov.motivo}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Cantidad</p>
                      <p className={`text-2xl font-bold ${mov.cantidad > 0 ? "text-green-600" : "text-red-600"}`}>
                        {mov.cantidad > 0 ? "+" : ""}
                        {mov.cantidad}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Usuario</p>
                      <p className="font-semibold">{mov.usuario}</p>
                    </div>
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
