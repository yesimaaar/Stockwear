"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Head from "next/head"
import { UserPlus, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Toggle } from "@/components/ui/toggle"
import { AuthService } from "@/lib/services/auth-service"

export default function RegisterPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [rol, setRol] = useState<"admin" | "empleado">("empleado")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    setLoading(true)

  const result = await AuthService.register({ nombre: nombre.trim(), email: email.trim(), password, rol })

    if (!result.success) {
      setError(result.message || "No se pudo registrar al usuario")
      setLoading(false)
      return
    }

    setSuccess("Registro exitoso. Redirigiendo al inicio de sesión...")
    setLoading(false)

    setTimeout(() => {
      router.push("/login")
    }, 1500)
  }

  return (
    <>
      <Head>
        <title>Crear cuenta | StockWear</title>
      </Head>

      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-lg">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserPlus className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Crear cuenta</h1>
            <p className="text-sm text-gray-600">Registra un nuevo usuario para gestionar StockWear.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Ana Martínez"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nombre@stockwear.com"
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de cuenta</Label>
              <div className="flex gap-3">
                <Toggle
                  pressed={rol === "empleado"}
                  onPressedChange={(pressed) => {
                    if (pressed) setRol("empleado")
                  }}
                  disabled={loading}
                  className="flex-1"
                >
                  <span className="flex items-center justify-center gap-2 text-sm font-medium">
                    <UserPlus className="h-4 w-4" /> Empleado
                  </span>
                </Toggle>
                <Toggle
                  pressed={rol === "admin"}
                  onPressedChange={(pressed) => {
                    if (pressed) setRol("admin")
                  }}
                  disabled={loading}
                  className="flex-1"
                >
                  <span className="flex items-center justify-center gap-2 text-sm font-medium">
                    <ShieldCheck className="h-4 w-4" /> Administrador
                  </span>
                </Toggle>
              </div>
            </div>

            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            {success && <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Registrando..." : "Crear cuenta"}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-600">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
