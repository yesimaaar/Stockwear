import Link from "next/link"
import { Users, Plus, ArrowLeft, Mail, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function UsuariosPage() {
  const usuarios = [
    {
      id: 1,
      nombre: "Juan Pérez",
      email: "juan.perez@stockwear.com",
      rol: "Administrador",
      estado: "Activo",
      ultimoAcceso: "2025-01-21 10:30",
    },
    {
      id: 2,
      nombre: "María García",
      email: "maria.garcia@stockwear.com",
      rol: "Empleado",
      estado: "Activo",
      ultimoAcceso: "2025-01-21 09:15",
    },
    {
      id: 3,
      nombre: "Carlos Rodríguez",
      email: "carlos.rodriguez@stockwear.com",
      rol: "Empleado",
      estado: "Activo",
      ultimoAcceso: "2025-01-20 18:45",
    },
    {
      id: 4,
      nombre: "Ana Martínez",
      email: "ana.martinez@stockwear.com",
      rol: "Empleado",
      estado: "Inactivo",
      ultimoAcceso: "2025-01-15 14:20",
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
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
                  <p className="text-sm text-muted-foreground">Gestión de accesos y roles</p>
                </div>
              </div>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Usuario
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-4">
          {usuarios.map((usuario) => (
            <Card key={usuario.id}>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-2xl font-bold text-primary">{usuario.nombre.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{usuario.nombre}</h3>
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        {usuario.email}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{usuario.rol}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Badge variant={usuario.estado === "Activo" ? "default" : "secondary"}>{usuario.estado}</Badge>
                      <p className="mt-2 text-xs text-muted-foreground">Último acceso: {usuario.ultimoAcceso}</p>
                    </div>
                    <Button variant="outline">Editar</Button>
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
