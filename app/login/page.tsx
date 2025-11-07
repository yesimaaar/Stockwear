"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Scan } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthService } from "@/lib/services/auth-service"
import Head from "next/head"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    await new Promise((resolve) => setTimeout(resolve, 800))

    const result = await AuthService.login(email.trim(), password)

    if (!result.success) {
      setError(result.message || "Error al iniciar sesión")
      setLoading(false)
      return
    }

    const role = result.user?.rol

    if (role === "admin") {
      router.push("/admin")
      return
    }

    if (role === "empleado") {
      router.push("/empleado")
      return
    }

    setError("Tu usuario no tiene un rol asignado válido.")
    setLoading(false)
  }

  return (
    <>
      <Head>
        <title>StockWear - Sistema de Gestión</title>
        <link rel="icon" href="/stockwear-icon.png" />
      </Head>
      
  <div className="relative grid min-h-screen w-full grid-cols-1 overflow-y-auto bg-background text-foreground lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="relative hidden items-center justify-center overflow-hidden bg-[#050507] text-primary-foreground lg:flex">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.25),transparent_55%)] opacity-80" />
          <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
          <div className="relative z-10 w-full max-w-md space-y-8 px-12 py-16">
            <div className="flex items-center gap-3">
              <Image
                src="/stockwear-icon.png"
                alt="StockWear"
                width={90}
                height={90}
              />
              <span className="text-2xl font-semibold">StockWear</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl font-semibold leading-tight text-balance">Bienvenido de Vuelta</h1>
              <p className="text-lg text-primary-foreground/80">
                Gestiona tu inventario de calzado y ropa deportiva con StockWear
              </p>
            </div>

            {/* Ilustración */}
            <div className="relative mt-12">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-8 backdrop-blur-md">
                <div className="flex items-center justify-center gap-8">
                  <div className="relative">
                    <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                      <Scan className="h-16 w-16" />
                    </div>
                    <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white/30 blur-[1px]"></div>
                    <div className="absolute -bottom-2 -left-2 h-6 w-6 rounded-full bg-white/20"></div>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <p className="text-sm text-primary-foreground/75">Flujos inteligentes para administradores y empleados</p>
                </div>
              </div>
            </div>
          </div>
        </div>

  <div className="flex h-full w-full items-center justify-center bg-background px-6 py-12 lg:px-12">
          <div className="w-full max-w-md space-y-8">
            {/* Logo móvil */}
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <Image
                src="/stockwear-icon.png"
                alt="StockWear"
                width={100}
                height={100}
              />
              <span className="text-xl font-bold">StockWear</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-semibold text-foreground">Iniciar Sesión</h2>
              <p className="text-sm text-muted-foreground">
                Ingresa tus credenciales y te llevaremos al panel correcto según tu rol.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-muted-foreground">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu-email@stockwear.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-muted-foreground">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading}>
                {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <label htmlFor="remember" className="cursor-pointer text-sm text-muted-foreground">
                    Recordar contraseña
                  </label>
                </div>
                <button type="button" className="text-sm text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </form>

            <div className="space-y-3 border-t border-border/60 pt-6">
              <p className="text-center text-sm text-muted-foreground">
                ¿No tienes una cuenta?{' '}
                <Link href="/register" className="font-semibold text-primary hover:underline">
                  Regístrate
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}