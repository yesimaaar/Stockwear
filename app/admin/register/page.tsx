"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/services/auth-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function RegisterEmployeePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [tiendaId, setTiendaId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    password: "",
    confirmPassword: "",
    telefono: "",
    rol: "empleado" as "admin" | "empleado",
  })

  useEffect(() => {
    const loadCurrentUser = async () => {
      const user = await AuthService.getCurrentUser()
      if (user?.tiendaId) {
        setTiendaId(user.tiendaId)
      } else {
        toast({
          title: "Error",
          description: "No se pudo identificar tu tienda. Reinicia sesión.",
          variant: "destructive"
        })
        router.push("/admin/usuarios")
      }
    }
    loadCurrentUser()
  }, [router, toast])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive"
      })
      return
    }

    if (!tiendaId) {
      toast({
        title: "Error",
        description: "No tienes una tienda asignada para registrar usuarios.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      const result = await AuthService.register({
        nombre: formData.nombre,
        email: formData.email,
        password: formData.password,
        rol: formData.rol,
        telefono: formData.telefono,
        tiendaId: tiendaId // Critical: Assign to current store
      })

      if (result.success) {
        toast({
          title: "Usuario registrado",
          description: "El usuario ha sido creado exitosamente.",
        })
        router.push("/admin/usuarios")
      } else {
        toast({
          title: "Error al registrar",
          description: result.message || "Ocurrió un error inesperado.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Error de conexión.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (!tiendaId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-10">
      <div className="mb-6">
        <Button variant="ghost" asChild className="pl-0 hover:bg-transparent">
          <Link href="/admin/usuarios" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Volver a usuarios
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar nuevo usuario</CardTitle>
          <CardDescription>
            Agrega un nuevo administrador o empleado a tu tienda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => handleChange("nombre", e.target.value)}
                placeholder="Ej. Juan Pérez"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="juan@ejemplo.com"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono (Opcional)</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => handleChange("telefono", e.target.value)}
                  placeholder="+52..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rol">Rol</Label>
                <Select
                  value={formData.rol}
                  onValueChange={(val) => handleChange("rol", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empleado">Empleado</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar usuario
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
