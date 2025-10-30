"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/services/auth-service"
import Link from "next/link"
import { Package, ShoppingBag, Warehouse, Users, BarChart3, History, Tag, Ruler } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const user = AuthService.getCurrentUser()

    if (!user) {
      router.push("/login")
    } else if (user.rol === "admin") {
      router.push("/admin")
    } else {
      router.push("/empleado")
    }
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </div>
  )
}

function DashboardPage() {
  const stats = [
    { title: "Total Productos", value: "1,234", icon: Package, color: "text-blue-600" },
    { title: "Categorías", value: "24", icon: Tag, color: "text-green-600" },
    { title: "Almacenes", value: "5", icon: Warehouse, color: "text-purple-600" },
    { title: "Stock Bajo", value: "12", icon: ShoppingBag, color: "text-red-600" },
  ]

  const quickActions = [
    { title: "Productos", href: "/productos", icon: Package, description: "Gestionar inventario" },
    { title: "Categorías", href: "/categorias", icon: Tag, description: "Organizar productos" },
    { title: "Tallas", href: "/tallas", icon: Ruler, description: "Gestionar tallas" },
    { title: "Almacenes", href: "/almacenes", icon: Warehouse, description: "Puntos de venta" },
    { title: "Stock", href: "/stock", icon: ShoppingBag, description: "Control de inventario" },
    { title: "Historial", href: "/historial", icon: History, description: "Movimientos de stock" },
    { title: "Usuarios", href: "/usuarios", icon: Users, description: "Gestionar accesos" },
    { title: "Reportes", href: "/reportes", icon: BarChart3, description: "Estadísticas" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Package className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">StockWear</h1>
                <p className="text-sm text-muted-foreground">Sistema de Gestión de Inventario</p>
              </div>
            </div>
            <Link
              href="/login"
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
            >
              Cerrar Sesión
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground">Bienvenido al panel de administración</p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <h3 className="mb-4 text-xl font-semibold text-foreground">Accesos Rápidos</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <Card className="transition-all hover:shadow-lg hover:border-primary">
                  <CardHeader>
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <action.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
