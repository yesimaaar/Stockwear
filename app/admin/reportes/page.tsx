import Link from "next/link"
import { BarChart3, ArrowLeft, TrendingUp, Package, Eye, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ReportesPage() {
  const reportes = [
    {
      id: 1,
      titulo: "Estado General de Inventario",
      descripcion: "Reporte completo del inventario actual por almacén y categoría",
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      id: 2,
      titulo: "Productos Más Consultados",
      descripcion: "Productos con mayor número de consultas mediante reconocimiento visual",
      icon: Eye,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      id: 3,
      titulo: "Rotación de Inventario",
      descripcion: "Análisis de rotación de productos basado en movimientos de stock",
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      id: 4,
      titulo: "Productos con Stock Bajo",
      descripcion: "Listado de productos que requieren reposición urgente",
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ]

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
        <div className="grid gap-6 md:grid-cols-2">
          {reportes.map((reporte) => (
            <Card key={reporte.id} className="transition-all hover:shadow-lg">
              <CardHeader>
                <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${reporte.bgColor}`}>
                  <reporte.icon className={`h-8 w-8 ${reporte.color}`} />
                </div>
                <CardTitle className="text-xl">{reporte.titulo}</CardTitle>
                <CardDescription className="text-base">{reporte.descripcion}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Generar Reporte</Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Configuración de Reportes</CardTitle>
            <CardDescription>Personaliza el periodo y formato de los reportes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium">Fecha Inicio</label>
                <input type="date" className="w-full rounded-md border border-input bg-background px-3 py-2" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Fecha Fin</label>
                <input type="date" className="w-full rounded-md border border-input bg-background px-3 py-2" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Formato</label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2">
                  <option>PDF</option>
                  <option>Excel</option>
                  <option>CSV</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
