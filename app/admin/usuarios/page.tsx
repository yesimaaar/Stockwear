"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Users, Plus, ArrowLeft, Mail, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AuthService } from "@/lib/services/auth-service"
import type { Usuario } from "@/lib/types"

const ROL_LABEL: Record<Usuario["rol"], string> = {
  admin: "Administrador",
  empleado: "Empleado",
}

const ESTADO_VARIANT: Record<Usuario["estado"], "default" | "secondary"> = {
  activo: "default",
  inactivo: "secondary",
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let canceled = false
    const load = async () => {
      setLoading(true)
      try {
        const data = await AuthService.getAll()
        if (!canceled) {
          setUsuarios(data)
        }
      } finally {
        if (!canceled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      canceled = true
    }
  }, [])

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
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 w-32 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : usuarios.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No hay usuarios registrados todavía.
          </div>
        ) : (
          <div className="grid gap-4">
            {usuarios.map((usuario) => (
              <Card key={usuario.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <span className="text-2xl font-bold">
                          {usuario.nombre.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{usuario.nombre}</h3>
                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {usuario.email}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{ROL_LABEL[usuario.rol]}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge variant={ESTADO_VARIANT[usuario.estado]}>{usuario.estado.toUpperCase()}</Badge>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Creado: {new Date(usuario.createdAt).toLocaleString("es-CO")}
                        </p>
                      </div>
                      <Button variant="outline">Editar</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
