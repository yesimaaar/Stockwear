"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useTheme } from "next-themes"
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
  Eye,
  EyeOff,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { GoogleIcon } from "@/components/icons/google-icon"
import { AuthService } from "@/features/auth/services/auth-service"
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
    name: "Nike Air",
    category: "zapatillas",
    tag: "Más vendido",
    sales: "1 venta",
    revenue: "$ 450.000",
    price: "$ 450.000",
    image: "https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto/44db7a6c-b9f7-4ed4-82a7-fb0bc5287836/AIR+MONARCH+IV+SE.png",
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
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  const logoSrc = resolvedTheme === "dark" ? "/stockwear-icon-white.png" : "/stockwear-icon.png"

  useEffect(() => {
    setMounted(true)
  }, [])



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
    // Check for account switch request
    const switchEmail = sessionStorage.getItem('switch_to_account')
    if (switchEmail) {
      setEmail(switchEmail)
      sessionStorage.removeItem('switch_to_account')
    }

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-foreground/30 border-t-foreground" />
          <p className="text-sm font-medium text-muted-foreground">Verificando tu sesión…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(118,131,173,0.15),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.15),_transparent_55%)]" />

      <div className="relative mx-auto grid w-full max-w-[1420px] items-center justify-center gap-12 px-6 py-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.2fr)] lg:px-12">
        <section className="mx-auto flex w-full max-w-md flex-col justify-center gap-8 text-foreground lg:ml-0">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card">
              {mounted && <Image src={logoSrc} alt="StockWear" width={40} height={40} priority />}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">StockWear</p>
              <p className="text-3xl font-semibold text-foreground">Accede a tu panel</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
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
                className="h-12 rounded-[16px] border-border bg-card text-base text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={loading}
                  className="h-12 rounded-[16px] border-border bg-card text-base text-foreground placeholder:text-muted-foreground pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-[16px] border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  disabled={loading}
                />
                Recordar sesión
              </label>
              <Link href="/forgot-password" className="font-medium text-foreground hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Button
              type="submit"
              className="h-12 w-full rounded-full bg-slate-900 text-base font-semibold text-white shadow-[0_18px_35px_rgba(15,18,30,0.25)] hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
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
              className="mt-3 h-12 w-full rounded-full border-border bg-card text-base font-semibold text-foreground hover:bg-accent"
            >
              <GoogleIcon className="mr-2 h-5 w-5" />
              {googleLoading ? "Conectando con Google..." : "Continuar con Google"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground">
            ¿No tienes una cuenta?
            <Link href="/register" className="ml-1 font-semibold text-foreground hover:underline">
              Regístrate
            </Link>
          </p>
        </section>

        <section className="relative hidden h-[750px] overflow-hidden rounded-[44px] border border-border bg-card shadow-[0_55px_140px_rgba(15,23,42,0.18)] dark:shadow-[0_55px_140px_rgba(0,0,0,0.4)] lg:flex pointer-events-none select-none">
          <div className="flex w-full">
            <aside className="flex w-64 flex-col border-r border-border bg-card px-6 py-9">
              <div className="flex items-center gap-3">
                {mounted && <Image src={logoSrc} alt="StockWear" width={32} height={32} />}
                <span className="text-lg font-semibold text-foreground">StockWear</span>
              </div>

              <div className="mt-2 flex items-center gap-3 rounded-lg border border-border p-3">
                <Image
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80"
                  alt="Admin"
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">Admin</p>
                  <p className="text-xs text-muted-foreground">Panel de Control</p>
                </div>
              </div>

              <nav className="mt-8 flex flex-1 flex-col gap-2">
                {previewNavItems.map(({ icon: Icon, label, active }) => (
                  <button
                    key={label}
                    type="button"
                    className={`flex items-center gap-3.5 rounded-lg px-4 py-2.5 text-sm font-medium transition ${active ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-muted-foreground hover:bg-accent"
                      }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-white dark:text-slate-900" : "text-muted-foreground"}`} />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>

              <button
                type="button"
                className="flex items-center gap-3.5 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent"
                aria-label="Configuración"
              >
                <Settings className="h-5 w-5 text-muted-foreground" />
                <span>Configuración</span>
              </button>
            </aside>

            <div className="flex-1 bg-background px-10 py-9">
              <div className="rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white dark:from-slate-700 dark:to-slate-800">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">StockWear</p>
                <h3 className="mt-1 text-2xl font-semibold">Panel de Administración</h3>
                <p className="text-sm text-slate-300">Facturación rápida y seguimiento express sin salir del dashboard.</p>
              </div>

              <div className="mt-6 flex flex-col gap-6">
                <div className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
                  <div className="flex flex-col gap-2">
                    <p className="text-base font-semibold text-foreground">Facturación rápida</p>
                    <p className="text-sm text-muted-foreground">Busca productos y añade líneas de venta sin salir del panel principal.</p>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Input
                        id="quick-search"
                        type="search"
                        placeholder="Código o nombre del producto"
                        className="h-12 flex-1 rounded-2xl border-border bg-card text-sm text-foreground placeholder:text-muted-foreground"
                      />
                      <Button className="h-12 rounded-full bg-slate-900 px-6 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
                        Buscar
                      </Button>
                      <button
                        type="button"
                        className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Carrito
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">0</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
                    <div>
                      <p className="text-base font-semibold text-foreground">Más vendidos</p>
                      <p className="text-sm text-muted-foreground">Acceso rápido a los productos con mayor rotación.</p>
                    </div>
                    <div className="mt-5 space-y-4">
                      {quickBillingTopSellers.map((product) => (
                        <div key={product.id} className="flex flex-wrap items-center gap-5 rounded-[28px] border border-border bg-card p-5 shadow-sm">
                          <div className="relative aspect-square w-full min-w-[88px] max-w-[7.5rem] flex-shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
                            <img src={product.image} alt={product.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                          </div>
                          <div className="flex flex-1 flex-col gap-1 text-foreground">
                            <p className="text-base font-semibold">{product.name}</p>
                            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{product.category}</p>
                            <div className="text-xs text-muted-foreground">
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{product.tag}</span>
                              <span className="mx-2">•</span>
                              {product.sales}
                            </div>
                            <p className="text-lg font-semibold">{product.price}</p>
                          </div>
                          <Button variant="outline" className="rounded-full border-border px-5 text-sm font-semibold text-foreground">
                            Ver stock
                          </Button>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm">
                    <div>
                      <p className="text-base font-semibold text-foreground">Novedades</p>
                      <p className="text-sm text-muted-foreground">Productos recién agregados a tu catálogo.</p>
                    </div>
                    <div className="mt-5 space-y-4">
                      {quickBillingNewArrivals.map((product) => (
                        <div key={product.id} className="flex flex-wrap items-center gap-5 rounded-[28px] border border-dashed border-border bg-muted/50 p-5">
                          <div className="relative aspect-[4/3] w-full min-w-[80px] max-w-[6.5rem] flex-shrink-0 overflow-hidden rounded-2xl border border-border bg-card">
                            <img src={product.image} alt={product.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                          </div>
                          <div className="flex flex-1 flex-col gap-1">
                            <p className="text-base font-semibold text-foreground">{product.name}</p>
                            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{product.category}</p>
                            <div className="text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">{product.tag}</span>
                              <span className="mx-2">•</span>
                              {product.sales}
                            </div>
                            <p className="text-sm font-semibold text-foreground">{product.price}</p>
                          </div>
                          <Button className="rounded-full bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
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
