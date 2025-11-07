"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  MonitorSmartphone,
  X,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Trend = "up" | "down" | "flat"

type MetricId = "ventasMes" | "ventasRegistradas" | "usuariosActivos" | "productosBajoStock"

const METRIC_STYLES: Record<MetricId, {
  title: string
  icon: typeof DollarSign
  bgColor: string
  iconColor: string
  description: string
}> = {
  ventasMes: {
    title: "Ventas del mes",
    icon: DollarSign,
    bgColor: "bg-emerald-100",
    iconColor: "text-emerald-700",
    description: "Ingresos registrados en movimientos de tipo venta",
  },
  ventasRegistradas: {
    title: "Ventas registradas",
    icon: ShoppingCart,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-700",
    description: "Cantidad de movimientos de venta en el mes",
  },
  usuariosActivos: {
    title: "Usuarios activos",
    icon: Users,
    bgColor: "bg-purple-100",
    iconColor: "text-purple-700",
    description: "Usuarios habilitados en la plataforma",
  },
  productosBajoStock: {
    title: "Productos bajo stock",
    icon: Package,
    bgColor: "bg-amber-100",
    iconColor: "text-amber-700",
    description: "Productos cuyo inventario está por debajo del mínimo",
  },
}

interface Metric {
  id: MetricId
  title: string
  value: string
  change: string
  trend: Trend
  icon: typeof DollarSign
  bgColor: string
  iconColor: string
  description: string
}

interface HistorialRow {
  tipo: string
  cantidad: number
  costoUnitario: number | null
  createdAt: string
}

interface ProductoRow {
  id: number
  estado: string
  stockMinimo: number
  createdAt: string
}

interface StockRow {
  productoId: number
  cantidad: number
}

interface UsuarioRow {
  id: string
  estado: string | null
  createdAt: string | null
}

const DASHBOARD_CACHE_KEY = "stockwear-dashboard-cache-v1"

interface CachedMetric {
  id: MetricId
  value: string
  change: string
  trend: Trend
}

interface DashboardCache {
  metrics: CachedMetric[]
  salesSeries: Array<{ date: string; value: number }>
  dailyTarget: number
  dailyProgress: number
  monthlyTarget: number
  monthlyProgress: number
  yearlyTarget: number
  yearlyProgress: number
  lowStockCount: number
}

const SalesChart = dynamic(() => import("@/components/dashboard/sales-chart"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      Cargando tendencias de ventas...
    </div>
  ),
})

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

const shortDateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
})

function computeTrend(current: number, previous: number): { change: string; trend: Trend } {
  if (previous === 0) {
    if (current === 0) {
      return { change: "0%", trend: "flat" }
    }
    return { change: "+100%", trend: "up" }
  }

  const variation = ((current - previous) / previous) * 100
  const rounded = Number.isFinite(variation) ? variation : 0
  if (rounded === 0) {
    return { change: "0%", trend: "flat" }
  }
  const formatted = `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`
  return { change: formatted, trend: rounded > 0 ? "up" : "down" }
}

function getDateParts(dateLike: string | Date) {
  const date = typeof dateLike === "string" ? new Date(dateLike) : dateLike
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
  }
}

export default function AdminDashboard() {
  const dismissedRef = useRef(false)
  const [showMobileNotice, setShowMobileNotice] = useState(false)
  const [metrics, setMetrics] = useState<Metric[]>(() =>
    (Object.keys(METRIC_STYLES) as MetricId[]).map((id) => ({
      id,
      ...METRIC_STYLES[id],
      value: id === "ventasMes" ? "$0" : "0",
      change: "--",
      trend: "flat",
    })),
  )

  const [salesSeries, setSalesSeries] = useState<Array<{ date: string; value: number }>>([])
  const [dailyTarget, setDailyTarget] = useState(0)
  const [dailyProgress, setDailyProgress] = useState(0)
  const [monthlyTarget, setMonthlyTarget] = useState(0)
  const [monthlyProgress, setMonthlyProgress] = useState(0)
  const [yearlyTarget, setYearlyTarget] = useState(0)
  const [yearlyProgress, setYearlyProgress] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const cached = window.localStorage.getItem(DASHBOARD_CACHE_KEY)
    if (!cached) {
      return
    }

    try {
      const parsed = JSON.parse(cached) as DashboardCache
      const hydratedMetrics = parsed.metrics.map((metric) => ({
        id: metric.id,
        ...METRIC_STYLES[metric.id],
        value: metric.value,
        change: metric.change,
        trend: metric.trend,
      }))

      setMetrics(hydratedMetrics)
      setSalesSeries(parsed.salesSeries)
      setDailyTarget(parsed.dailyTarget)
      setDailyProgress(parsed.dailyProgress)
      setMonthlyTarget(parsed.monthlyTarget)
      setMonthlyProgress(parsed.monthlyProgress)
      setYearlyTarget(parsed.yearlyTarget)
      setYearlyProgress(parsed.yearlyProgress)
      setLowStockCount(parsed.lowStockCount)
      setLoading(false)
    } catch (error) {
      console.warn("No se pudo restaurar la caché del dashboard", error)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const storageKey = "stockwear-mobile-notice-dismissed"
    const dismissed = window.localStorage.getItem(storageKey) === "true"
    if (dismissed) {
      dismissedRef.current = true
      return
    }

    const mediaQuery = window.matchMedia("(max-width: 768px)")
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      if (dismissedRef.current) return
      const matches = (event as MediaQueryList).matches
      setShowMobileNotice(matches)
    }

    handleChange(mediaQuery)

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange)
    } else {
      mediaQuery.addListener(handleChange)
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleChange)
      } else {
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [])

  const dismissMobileNotice = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("stockwear-mobile-notice-dismissed", "true")
    }
    dismissedRef.current = true
    setShowMobileNotice(false)
  }

  useEffect(() => {
    let canceled = false
    const loadDashboard = async () => {
      setLoading(true)
      try {
        const [historialResp, productosResp, stockResp, usuariosResp] = await Promise.all([
          supabase
            .from("historialStock")
            .select("tipo,cantidad,\"costoUnitario\",\"createdAt\"")
            .order("createdAt", { ascending: false })
            .limit(500),
          supabase.from("productos").select("id,estado,\"stockMinimo\",\"createdAt\"").limit(500),
          supabase.from("stock").select("\"productoId\",cantidad").limit(2000),
          supabase.from("usuarios").select("id,estado,\"createdAt\"").limit(500),
        ])

        if (canceled) return

        const historial = (historialResp.data as HistorialRow[]) || []
        const productos = (productosResp.data as ProductoRow[]) || []
        const stock = (stockResp.data as StockRow[]) || []
        const usuarios = (usuariosResp.data as UsuarioRow[]) || []

        const ventas = historial.filter((item) => item.tipo === "venta")
        const now = new Date()
        const { month: currentMonth, year: currentYear } = getDateParts(now)
        const previousMonthDate = new Date(currentYear, currentMonth - 1, 1)
        const { month: previousMonth, year: previousMonthYear } = getDateParts(previousMonthDate)

        const monthSales = ventas.filter((v) => {
          const { month, year } = getDateParts(v.createdAt)
          return month === currentMonth && year === currentYear
        })
        const previousMonthSales = ventas.filter((v) => {
          const { month, year } = getDateParts(v.createdAt)
          return month === previousMonth && year === previousMonthYear
        })

        const monthSalesValue = monthSales.reduce((sum, item) => sum + (item.costoUnitario || 0) * item.cantidad, 0)
        const previousMonthSalesValue = previousMonthSales.reduce(
          (sum, item) => sum + (item.costoUnitario || 0) * item.cantidad,
          0,
        )

        const monthSalesCount = monthSales.length
        const previousMonthSalesCount = previousMonthSales.length

        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const salesToday = ventas.filter((v) => new Date(v.createdAt) >= today)
        const dailySalesValue = salesToday.reduce((sum, item) => sum + (item.costoUnitario || 0) * item.cantidad, 0)

        const yearlySales = ventas.filter((v) => {
          const { year } = getDateParts(v.createdAt)
          return year === currentYear
        })
        const yearlySalesValue = yearlySales.reduce((sum, item) => sum + (item.costoUnitario || 0) * item.cantidad, 0)

        const activeUsers = usuarios.filter((u) => (u.estado ?? "activo") === "activo")
        const usersCurrentMonth = usuarios.filter((u) => {
          const createdAt = u.createdAt ? new Date(u.createdAt) : null
          if (!createdAt) return false
          const { month, year } = getDateParts(createdAt)
          return month === currentMonth && year === currentYear
        })
        const usersPreviousMonth = usuarios.filter((u) => {
          const createdAt = u.createdAt ? new Date(u.createdAt) : null
          if (!createdAt) return false
          const { month, year } = getDateParts(createdAt)
          return month === previousMonth && year === previousMonthYear
        })

        const stockByProduct = stock.reduce<Record<number, number>>((acc, item) => {
          acc[item.productoId] = (acc[item.productoId] || 0) + (item.cantidad || 0)
          return acc
        }, {})

        const lowStockProducts = productos.filter((producto) => {
          if (producto.estado !== "activo") return false
          const total = stockByProduct[producto.id] || 0
          return total < producto.stockMinimo
        })

        const activeProducts = productos.filter((producto) => producto.estado === "activo")
        const productsCreatedCurrentMonth = activeProducts.filter((p) => {
          const createdAt = new Date(p.createdAt)
          const { month, year } = getDateParts(createdAt)
          return month === currentMonth && year === currentYear
        })
        const productsCreatedPreviousMonth = activeProducts.filter((p) => {
          const createdAt = new Date(p.createdAt)
          const { month, year } = getDateParts(createdAt)
          return month === previousMonth && year === previousMonthYear
        })

        const salesMap = new Map<string, number>()
        const lastSevenDays: Date[] = []
        for (let i = 6; i >= 0; i--) {
          lastSevenDays.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i))
        }

        for (const date of lastSevenDays) {
          const key = date.toISOString().slice(0, 10)
          salesMap.set(key, 0)
        }

        ventas.forEach((venta) => {
          const key = new Date(venta.createdAt).toISOString().slice(0, 10)
          if (!salesMap.has(key)) return
          const previous = salesMap.get(key) || 0
          salesMap.set(key, previous + (venta.costoUnitario || 0) * venta.cantidad)
        })

        const series = lastSevenDays.map((date) => {
          const key = date.toISOString().slice(0, 10)
          const value = salesMap.get(key) || 0
          return {
            date: shortDateFormatter.format(date),
            value,
          }
        })

        const monthSalesTrend = computeTrend(monthSalesValue, previousMonthSalesValue)
        const monthSalesCountTrend = computeTrend(monthSalesCount, previousMonthSalesCount)
        const usersTrend = computeTrend(usersCurrentMonth.length, usersPreviousMonth.length)
        const productsTrend = computeTrend(productsCreatedCurrentMonth.length, productsCreatedPreviousMonth.length)

        const metricsPayload: Metric[] = [
          {
            id: "ventasMes",
            ...METRIC_STYLES.ventasMes,
            value: currencyFormatter.format(monthSalesValue),
            change: monthSalesTrend.change,
            trend: monthSalesTrend.trend,
          },
          {
            id: "ventasRegistradas",
            ...METRIC_STYLES.ventasRegistradas,
            value: monthSalesCount.toString(),
            change: monthSalesCountTrend.change,
            trend: monthSalesCountTrend.trend,
          },
          {
            id: "usuariosActivos",
            ...METRIC_STYLES.usuariosActivos,
            value: activeUsers.length.toString(),
            change: usersTrend.change,
            trend: usersTrend.trend,
          },
          {
            id: "productosBajoStock",
            ...METRIC_STYLES.productosBajoStock,
            value: lowStockProducts.length.toString(),
            change: productsTrend.change,
            trend: productsTrend.trend,
          },
        ]

        const computedDailyProgress = Math.round(dailySalesValue)
        const computedMonthlyProgress = Math.round(monthSalesValue)
        const computedYearlyProgress = Math.round(yearlySalesValue)
        const computedDailyTarget = Math.max(Math.round(dailySalesValue * 1.2), 1)
        const computedMonthlyTarget = Math.max(Math.round(monthSalesValue * 1.15), 1)
        const computedYearlyTarget = Math.max(Math.round(yearlySalesValue * 1.1), 1)

        setMetrics(metricsPayload)
        setLowStockCount(lowStockProducts.length)
        setSalesSeries(series)
        setDailyProgress(computedDailyProgress)
        setMonthlyProgress(computedMonthlyProgress)
        setYearlyProgress(computedYearlyProgress)
        setDailyTarget(computedDailyTarget)
        setMonthlyTarget(computedMonthlyTarget)
        setYearlyTarget(computedYearlyTarget)

        if (typeof window !== "undefined") {
          const payload: DashboardCache = {
            metrics: metricsPayload.map((metric) => ({
              id: metric.id,
              value: metric.value,
              change: metric.change,
              trend: metric.trend,
            })),
            salesSeries: series,
            dailyTarget: computedDailyTarget,
            dailyProgress: computedDailyProgress,
            monthlyTarget: computedMonthlyTarget,
            monthlyProgress: computedMonthlyProgress,
            yearlyTarget: computedYearlyTarget,
            yearlyProgress: computedYearlyProgress,
            lowStockCount: lowStockProducts.length,
          }

          window.localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(payload))
        }
      } catch (error) {
        console.error("Error loading dashboard", error)
      } finally {
        if (!canceled) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      canceled = true
    }
  }, [])

  const dailyPercentage = useMemo(() => {
    if (dailyTarget === 0) return 0
    return (dailyProgress / dailyTarget) * 100
  }, [dailyProgress, dailyTarget])

  const monthlyPercentage = useMemo(() => {
    if (monthlyTarget === 0) return 0
    return (monthlyProgress / monthlyTarget) * 100
  }, [monthlyProgress, monthlyTarget])

  const yearlyPercentage = useMemo(() => {
    if (yearlyTarget === 0) return 0
    return (yearlyProgress / yearlyTarget) * 100
  }, [yearlyProgress, yearlyTarget])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-foreground">Resumen General</h2>
        {loading && <span className="text-sm text-muted-foreground">Actualizando datos…</span>}
      </div>

      {showMobileNotice && (
        <div className="relative w-full overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground shadow-sm">
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MonitorSmartphone className="h-4 w-4" />
            </span>
            <div className="flex-1 text-[0.92rem] leading-relaxed text-foreground/80">
              <p className="font-medium text-foreground">Optimiza tu experiencia</p>
              <p>
                StockWear recomienda gestionar el panel desde un equipo de escritorio para aprovechar todo el
                espacio disponible. Puedes continuar en tu dispositivo móvil cuando lo necesites.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissMobileNotice}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition hover:border-border hover:text-foreground"
          >
            <span className="sr-only">Ocultar aviso</span>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {lowStockCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5" />
          {lowStockCount === 1
            ? "Hay 1 producto con inventario por debajo del mínimo."
            : `Hay ${lowStockCount} productos con inventario por debajo del mínimo.`}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const TrendIcon =
            metric.trend === "up" ? TrendingUp : metric.trend === "down" ? TrendingDown : null
          const changeColor =
            metric.trend === "up"
              ? "text-green-600"
              : metric.trend === "down"
                ? "text-red-600"
                : "text-muted-foreground"

          return (
            <Card key={metric.title} className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardDescription className="text-xs text-muted-foreground">Últimos 30 días</CardDescription>
                  <CardTitle className="mt-1 text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </CardTitle>
                </div>
                <div className={`rounded-full p-2 ${metric.bgColor}`}>
                  <metric.icon className={`h-5 w-5 ${metric.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-bold">{metric.value}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{metric.description}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {TrendIcon ? <TrendIcon className={`h-4 w-4 ${changeColor}`} /> : null}
                    <span className={`text-sm font-medium ${changeColor}`}>{metric.change}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Ventas de los últimos 7 días</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesChart data={salesSeries} formatter={(value) => currencyFormatter.format(value)} />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Objetivo de Ventas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-6">
            <div className="relative h-56 w-56">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="85" stroke="hsl(var(--muted))" strokeWidth="20" fill="none" opacity="0.3" />
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  stroke="hsl(0, 0%, 60%)"
                  strokeWidth="20"
                  fill="none"
                  strokeDasharray={`${(yearlyPercentage / 100) * 534} 534`}
                  strokeLinecap="round"
                />

                <circle cx="100" cy="100" r="60" stroke="hsl(var(--muted))" strokeWidth="18" fill="none" opacity="0.3" />
                <circle
                  cx="100"
                  cy="100"
                  r="60"
                  stroke="hsl(0, 0%, 40%)"
                  strokeWidth="18"
                  fill="none"
                  strokeDasharray={`${(monthlyPercentage / 100) * 377} 377`}
                  strokeLinecap="round"
                />

                <circle cx="100" cy="100" r="37" stroke="hsl(var(--muted))" strokeWidth="16" fill="none" opacity="0.3" />
                <circle
                  cx="100"
                  cy="100"
                  r="37"
                  stroke="hsl(0, 0%, 20%)"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${(dailyPercentage / 100) * 232} 232`}
                  strokeLinecap="round"
                />
              </svg>

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    {Math.round((dailyPercentage + monthlyPercentage + yearlyPercentage) / 3)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Promedio</div>
                </div>
              </div>
            </div>

            <div className="w-full space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-800" />
                  <span className="text-sm text-muted-foreground">Objetivo Diario</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4 text-gray-800" />
                  <span className="text-base font-bold">
                    {currencyFormatter.format(dailyProgress)}/{currencyFormatter.format(dailyTarget)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-600" />
                  <span className="text-sm text-muted-foreground">Objetivo Mensual</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4 text-gray-600" />
                  <span className="text-base font-bold">
                    {currencyFormatter.format(monthlyProgress)}/{currencyFormatter.format(monthlyTarget)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-400" />
                  <span className="text-sm text-muted-foreground">Objetivo Anual</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4 text-gray-400" />
                  <span className="text-base font-bold">
                    {currencyFormatter.format(yearlyProgress)}/{currencyFormatter.format(yearlyTarget)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Configuración de Objetivos</CardTitle>
          </div>
          <CardDescription>Define y actualiza tus objetivos de ventas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-4 rounded-lg border border-border p-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-800" />
                <h3 className="font-semibold">Objetivo Diario</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily-target">Meta (COP)</Label>
                <Input
                  id="daily-target"
                  type="number"
                  value={dailyTarget}
                  onChange={(e) => setDailyTarget(Number(e.target.value) || 0)}
                  placeholder="Ej: 650000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily-progress">Progreso</Label>
                <Input
                  id="daily-progress"
                  type="number"
                  value={dailyProgress}
                  onChange={(e) => setDailyProgress(Number(e.target.value) || 0)}
                  placeholder="Ej: 450000"
                />
              </div>
              <div className="pt-2">
                <div className="text-sm text-muted-foreground">Porcentaje</div>
                <div className="text-2xl font-bold">{Math.round(dailyPercentage)}%</div>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-border p-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-600" />
                <h3 className="font-semibold">Objetivo Mensual</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly-target">Meta (COP)</Label>
                <Input
                  id="monthly-target"
                  type="number"
                  value={monthlyTarget}
                  onChange={(e) => setMonthlyTarget(Number(e.target.value) || 0)}
                  placeholder="Ej: 14500000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly-progress">Progreso</Label>
                <Input
                  id="monthly-progress"
                  type="number"
                  value={monthlyProgress}
                  onChange={(e) => setMonthlyProgress(Number(e.target.value) || 0)}
                  placeholder="Ej: 11200000"
                />
              </div>
              <div className="pt-2">
                <div className="text-sm text-muted-foreground">Porcentaje</div>
                <div className="text-2xl font-bold">{Math.round(monthlyPercentage)}%</div>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-border p-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-400" />
                <h3 className="font-semibold">Objetivo Anual</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearly-target">Meta (COP)</Label>
                <Input
                  id="yearly-target"
                  type="number"
                  value={yearlyTarget}
                  onChange={(e) => setYearlyTarget(Number(e.target.value) || 0)}
                  placeholder="Ej: 175000000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearly-progress">Progreso</Label>
                <Input
                  id="yearly-progress"
                  type="number"
                  value={yearlyProgress}
                  onChange={(e) => setYearlyProgress(Number(e.target.value) || 0)}
                  placeholder="Ej: 125000000"
                />
              </div>
              <div className="pt-2">
                <div className="text-sm text-muted-foreground">Porcentaje</div>
                <div className="text-2xl font-bold">{Math.round(yearlyPercentage)}%</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button className="px-6" type="button">
              Guardar cambios
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
