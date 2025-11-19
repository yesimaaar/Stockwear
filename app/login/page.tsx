"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Home,
  Users,
  Layers3,
  Box,
  ArrowLeftRight,
  Shirt,
  BarChart3,
  Clock3,
  Settings,
  CalendarDays,
  ChevronDown,
  Building2,
  FileText,
  ShoppingCart,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { GoogleIcon } from "@/components/icons/google-icon"
import { AuthService } from "@/lib/services/auth-service"
import { supabase } from "@/lib/supabase"
import type { Usuario } from "@/lib/types"

const previewQuickStats = [
  { label: "Ventas del día", value: "$128K", trend: "+12%", icon: BarChart3 },
  { label: "Tickets abiertos", value: "6", trend: "-2 hoy", icon: Building2 },
  { label: "Órdenes en ruta", value: "18", trend: "3 nuevas", icon: FileText },
]

const stockOptions = [
  { label: "CDMX Central", value: "cdmx" },
  { label: "Guadalajara Norte", value: "gdl" },
  { label: "Monterrey Hub", value: "mty" },
]

const previewTasks = [
  {
    time: "09:45",
    title: "Reposición Express",
    detail: "12 pares asignados",
    status: "Listo",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    time: "11:20",
    title: "Entrega Prime",
    detail: "Sucursal Reforma",
    status: "En ruta",
    color: "bg-blue-100 text-blue-700",
  },
  {
    time: "14:00",
    title: "Auditoría de stock",
    detail: "Zona norte",
    status: "Pendiente",
    color: "bg-yellow-100 text-yellow-700",
  },
]

const quickBillingTopSellers = [
  {
    id: "nike-coraline",
    name: "Nike Coraline",
    category: "zapatillas",
    tag: "Más vendido",
    sales: "1 venta",
    revenue: "$ 450.000",
    price: "$ 450.000",
    image: "https://images.unsplash.com/photo-1514986888952-8cd320577b68?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "adidas-street",
    name: "Adidas Street Pulse",
    category: "casual",
    tag: "Express",
    sales: "3 ventas",
    revenue: "$ 720.000",
    price: "$ 240.000",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80",
  },
]

const quickBillingNewArrivals = [
  {
    id: "puma-runner",
    name: "Puma Runner+",
    category: "performance",
    tag: "Nuevo",
    sales: "Disponible",
    revenue: "Stock 36 pares",
    price: "$ 310.000",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "reebok-studio",
    name: "Reebok Studio",
    category: "training",
    tag: "Lanzamiento",
    sales: "Disponible",
    revenue: "Stock 24 pares",
    price: "$ 285.000",
    image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=600&q=80",
  },
]

const previewNavItems = [
  { icon: Home, label: "Inicio", active: true },
  { icon: Users, label: "Equipo" },
  { icon: Layers3, label: "Catálogo" },
  { icon: Box, label: "Inventario" },
  { icon: ArrowLeftRight, label: "Movimientos" },
  { icon: Shirt, label: "Productos" },
  { icon: BarChart3, label: "Reportes" },
  { icon: Clock3, label: "Agenda" },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)



  const navigateByRole = useCallback((user?: Usuario) => {
    if (!user) return

    if (user.rol === "admin") {
      if (!user.tiendaId) {
        router.push("/register-store")
      } else {
        router.push("/admin")
      }
    } else if (user.rol === "empleado") {
      router.push("/empleado")
    } else {
      router.push("/")
    }
  }, [router])

  const syncSession = useCallback(async () => {
    const currentUser = await AuthService.getCurrentUser()
    if (currentUser) {
      navigateByRole(currentUser)
      setCheckingSession(false)
      return
    }
    setCheckingSession(false)
  }, [navigateByRole])

  useEffect(() => {
    void syncSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setCheckingSession(true)
        void syncSession()
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [syncSession])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 800))

      const result = await AuthService.login(email.trim(), password)

      if (!result.success) {
        setError(result.message || "Error al iniciar sesión")
        return
      }

      navigateByRole(result.user)
    } catch (_error) {
      setError("Ocurrió un problema al iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (googleLoading) return
    setError("")
    setGoogleLoading(true)
    const result = await AuthService.signInWithGoogle()
    if (!result.success) {
      setError(result.message || "No se pudo iniciar sesión con Google")
      setGoogleLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="force-light flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f8faff] via-[#f2f4fb] to-[#edf0f7]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-900/30 border-t-slate-900" />
          <p className="text-sm font-medium text-slate-600">Verificando tu sesión…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="force-light relative flex min-h-screen items-center overflow-hidden bg-gradient-to-br from-[#f8faff] via-[#f2f4fb] to-[#edf0f7]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(118,131,173,0.25),_transparent_55%)]" />

      <div className="relative mx-auto grid w-full max-w-[1420px] items-center justify-center gap-12 px-6 py-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.2fr)] lg:px-12">
        <section className="mx-auto flex w-full max-w-md flex-col justify-center gap-8 text-slate-900 lg:ml-0">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50">
              <Image src="/stockwear-icon.png" alt="StockWear" width={40} height={40} priority />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">StockWear</p>
              <p className="text-3xl font-semibold text-slate-900">Accede a tu panel</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-600">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu-email@stockwear.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={loading}
                className="h-12 rounded-[16px] border-slate-200 bg-white/80 text-base text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-600">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={loading}
                className="h-12 rounded-[16px] border-slate-200 bg-white/80 text-base text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {error ? (
              <div className="rounded-[16px] border border-red-200 bg-red-50/80 p-3 text-sm text-red-600">{error}</div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  disabled={loading}
                />
                Recordar sesión
              </label>
              <Link href="/forgot-password" className="font-medium text-slate-900 hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Button
              type="submit"
              className="h-12 w-full rounded-full bg-slate-900 text-base font-semibold text-white shadow-[0_18px_35px_rgba(15,18,30,0.25)]"
              disabled={loading || googleLoading}
            >
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              className="mt-3 h-12 w-full rounded-full border-slate-200 bg-white/80 text-base font-semibold text-slate-700 hover:bg-white"
            >
              <GoogleIcon className="mr-2 h-5 w-5" />
              {googleLoading ? "Conectando con Google..." : "Continuar con Google"}
            </Button>
          </form>

          <p className="text-sm text-slate-500">
            ¿No tienes una cuenta?
            <Link href="/register" className="ml-1 font-semibold text-slate-900 hover:underline">
              Regístrate
            </Link>
          </p>
        </section>

        <section className="relative hidden h-[750px] overflow-hidden rounded-[44px] border border-white/80 bg-white shadow-[0_55px_140px_rgba(15,23,42,0.18)] lg:flex">
          <div className="flex w-full">
            <aside className="flex w-64 flex-col border-r border-slate-100 bg-white px-6 py-9">
              <div className="flex items-center gap-3">
                <Image src="/stockwear-icon.png" alt="StockWear" width={32} height={32} />
                <span className="text-lg font-semibold text-slate-900">StockWear</span>
              </div>

              <div className="mt-2 flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                <Image
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80"
                  alt="Admin"
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Admin</p>
                  <p className="text-xs text-slate-500">Panel de Control</p>
                </div>
              </div>

              <nav className="mt-8 flex flex-1 flex-col gap-2">
                {previewNavItems.map(({ icon: Icon, label, active }) => (
                  <button
                    key={label}
                    type="button"
                    className={`flex items-center gap-3.5 rounded-lg px-4 py-2.5 text-sm font-medium transition ${active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                      }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-white" : "text-slate-500"}`} />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>

              <button
                type="button"
                className="flex items-center gap-3.5 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                aria-label="Configuración"
              >
                <Settings className="h-5 w-5 text-slate-500" />
                <span>Configuración</span>
              </button>
            </aside>

            <div className="flex-1 bg-[#f9fafe] px-10 py-9">
              <div className="rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">StockWear</p>
                <h3 className="mt-1 text-2xl font-semibold">Panel de Administración</h3>
                <p className="text-sm text-slate-300">Facturación rápida y seguimiento express sin salir del dashboard.</p>
              </div>

              <div className="mt-6 flex flex-col gap-6">
                <div className="rounded-[32px] border border-white/80 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-2">
                    <p className="text-base font-semibold text-slate-900">Facturación rápida</p>
                    <p className="text-sm text-slate-500">Busca productos y añade líneas de venta sin salir del panel principal.</p>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Input
                        id="quick-search"
                        type="search"
                        placeholder="Código o nombre del producto"
                        className="h-12 flex-1 rounded-2xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400"
                      />
                      <Button className="h-12 rounded-full bg-slate-900 px-6 text-sm font-semibold text-white hover:bg-slate-800">
                        Buscar
                      </Button>
                      <button
                        type="button"
                        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Carrito
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">0</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <section className="rounded-[32px] border border-white/80 bg-white p-6 shadow-sm">
                    <div>
                      <p className="text-base font-semibold text-slate-900">Más vendidos</p>
                      <p className="text-sm text-slate-500">Acceso rápido a los productos con mayor rotación.</p>
                    </div>
                    <div className="mt-5 space-y-4">
                      {quickBillingTopSellers.map((product) => (
                        <div key={product.id} className="flex flex-wrap items-center gap-5 rounded-[28px] border border-slate-100 bg-white/80 p-5 shadow-sm">
                          <div className="relative aspect-square w-full min-w-[88px] max-w-[7.5rem] flex-shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                            <img src={product.image} alt={product.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                          </div>
                          <div className="flex flex-1 flex-col gap-1 text-slate-900">
                            <p className="text-base font-semibold">{product.name}</p>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{product.category}</p>
                            <div className="text-xs text-slate-500">
                              <span className="font-semibold text-emerald-600">{product.tag}</span>
                              <span className="mx-2">•</span>
                              {product.sales}
                            </div>
                            <p className="text-lg font-semibold">{product.price}</p>
                          </div>
                          <Button variant="outline" className="rounded-full border-slate-200 px-5 text-sm font-semibold text-slate-700">
                            Ver stock
                          </Button>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[32px] border border-white/80 bg-white p-6 shadow-sm">
                    <div>
                      <p className="text-base font-semibold text-slate-900">Novedades</p>
                      <p className="text-sm text-slate-500">Productos recién agregados a tu catálogo.</p>
                    </div>
                    <div className="mt-5 space-y-4">
                      {quickBillingNewArrivals.map((product) => (
                        <div key={product.id} className="flex flex-wrap items-center gap-5 rounded-[28px] border border-dashed border-slate-200 bg-slate-50/80 p-5">
                          <div className="relative aspect-[4/3] w-full min-w-[80px] max-w-[6.5rem] flex-shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-white">
                            <img src={product.image} alt={product.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                          </div>
                          <div className="flex flex-1 flex-col gap-1">
                            <p className="text-base font-semibold text-slate-900">{product.name}</p>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{product.category}</p>
                            <div className="text-xs text-slate-500">
                              <span className="font-semibold text-slate-900">{product.tag}</span>
                              <span className="mx-2">•</span>
                              {product.sales}
                            </div>
                            <p className="text-sm font-semibold text-slate-900">{product.price}</p>
                          </div>
                          <Button className="rounded-full bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800">
                            Agregar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
