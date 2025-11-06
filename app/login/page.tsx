"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Scan, ShoppingBag } from "lucide-react"
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
  const [isAdmin, setIsAdmin] = useState(false)
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

    const expectedRole = isAdmin ? "admin" : "empleado"
    if (result.user?.rol !== expectedRole) {
      setError(`Este usuario no tiene permisos de ${expectedRole}`)
      setLoading(false)
      return
    }

    if (result.user?.rol === "admin") {
      router.push("/admin")
    } else {
      router.push("/empleado")
    }
  }

  const toggleLoginType = () => {
    setIsAdmin(!isAdmin)
    setEmail("")
    setPassword("")
    setError("")
  }

  return (
    <>
      <Head>
        <title>StockWear - Sistema de Gestión</title>
        <link rel="icon" href="/stockwear-icon.png" />
      </Head>
      
      <div className="flex min-h-screen">
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 to-gray-800 p-12 items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="relative z-10 text-white max-w-md">
            <div className="flex items-center gap-3 mb-8">
              <Image
                src="/stockwear-icon.png"
                alt="StockWear"
                width={140}
                height={140}
                className="brightness-0 invert"
              />
              <span className="text-2xl font-bold">StockWear</span>
            </div>

            <h1 className="text-5xl font-bold mb-4 leading-tight">Bienvenido de Vuelta</h1>
            <p className="text-xl text-gray-300 mb-8">Gestiona tu inventario de calzado y ropa deportiva con StockWear</p>

            {/* Ilustración */}
            <div className="relative mt-12">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
                <div className="flex items-center justify-center gap-8">
                  <div className="relative">
                    <div className="h-32 w-32 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      {isAdmin ? (
                        <ShoppingBag className="h-16 w-16 text-white" />
                      ) : (
                        <Scan className="h-16 w-16 text-white" />
                      )}
                    </div>
                    <div className="absolute -top-2 -right-2 h-8 w-8 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="absolute -bottom-2 -left-2 h-6 w-6 bg-gray-500 rounded-full animate-pulse delay-75"></div>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-300">
                    {isAdmin ? "Panel de administración completo" : "Reconocimiento visual de productos"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-md">
            {/* Logo móvil */}
            <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
              <Image
                src="/stockwear-icon.png"
                alt="StockWear"
                width={100}
                height={100}
                className="brightness-0 invert"
              />
              <span className="text-xl font-bold">StockWear</span>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Iniciar Sesión</h2>
              <p className="text-gray-600">
                {isAdmin ? (
                  <>
                    Ingresa tus credenciales de <strong>Administrador</strong>.
                  </>
                ) : (
                  <>
                    Ingresa tus credenciales de <strong>Empleado</strong>.
                  </>
                )}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
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
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
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
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>
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
                  <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                    Recordar contraseña
                  </label>
                </div>
                <button type="button" className="text-sm text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200 space-y-3">
              <button onClick={toggleLoginType} className="text-sm text-gray-600 hover:text-primary transition-colors">
                {isAdmin ? "Iniciar sesión como Empleado" : "Iniciar sesión como Administrador"}
              </button>
              <p className="text-center text-sm text-gray-600">
                ¿No tienes una cuenta?{' '}
                <Link href="/register" className="font-semibold text-primary hover:underline">
                  Regístrate
                </Link>
              </p>
            </div>

            {/* Credenciales de prueba */}
            <div className="mt-6 rounded-lg bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-700 mb-2">Credenciales de prueba:</p>
              <div className="space-y-1 text-xs text-gray-600">
                {isAdmin ? (
                  <>
                    <p>Email: admin@stockwear.com</p>
                    <p>Contraseña: admin123</p>
                  </>
                ) : (
                  <>
                    <p>Email: empleado@stockwear.com</p>
                    <p>Contraseña: empleado123</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}