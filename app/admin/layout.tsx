"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AuthService } from "@/lib/services/auth-service"
import type { Usuario } from "@/lib/types"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await AuthService.getCurrentUser()
      if (!currentUser || currentUser.rol !== "admin") {
        router.push("/login")
        return
      }
      setUser(currentUser)
      setLoading(false)
    }

    void loadUser()
  }, [router])

  const handleLogout = async () => {
    await AuthService.logout()
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />

      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b bg-card">
          <div className="flex h-16 items-center justify-between px-4 lg:px-6">
            <div className="ml-12 lg:ml-0">
              <h2 className="text-base lg:text-lg font-semibold text-foreground">Panel de Administración</h2>
              <p className="hidden lg:block text-xs text-muted-foreground">Gestión de inventario y ventas</p>
            </div>
            <div className="flex items-center gap-2 lg:gap-4">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium">{user?.nombre}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button variant="destructive" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
