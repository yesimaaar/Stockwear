"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { useEffect, useMemo, useRef, useState } from "react"
import * as LucideIcons from "lucide-react"
const {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  Target,
  MonitorSmartphone,
  X,
  Eye,
  Boxes,
} = LucideIcons
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ReconocimientoService } from "@/lib/services/reconocimiento-service"

type Trend = "up" | "down" | "flat"

type MetricId = "ventasMes" | "ventasRegistradas" | "usuariosActivos" | "productosBajoStock"
const METRIC_STYLES: Record<
  MetricId,
  {
    title: string
    icon: typeof DollarSign
    bgColor: string
    iconColor: string
    description: string
  }
> = {
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
  nombre: string | null
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

interface InventorySummary {
  productosActivos: number
  productosInactivos: number
  stockTotal: number
  totalProductos: number
  almacenes: number
}

interface TopConsultedProduct {
  id: number
  nombre: string
  consultas: number
}

interface LowStockProduct {
  id: number
  nombre: string
  stockMinimo: number
  stockTotal: number
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

const SalesPerformanceChart = dynamic(
  () => import("@/components/dashboard/sales-performance-chart").then((mod) => mod.SalesPerformanceChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
        Cargando tendencias de ventas...
      </div>
    ),
  },
)

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
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

export default function ReportesPage() {
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
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([])
  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null)
  const [topConsulted, setTopConsulted] = useState<TopConsultedProduct[]>([])
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
        const [historialResp, productosResp, stockResp, usuariosResp, almacenesResp, masConsultadosResp] =
          await Promise.all([
            supabase
              .from("historialStock")
              .select("tipo,cantidad,\"costoUnitario\",\"createdAt\"")
              .order("createdAt", { ascending: false })
              .limit(500),
            supabase.from("productos").select("id,estado,\"stockMinimo\",\"createdAt\",nombre").limit(500),
            supabase.from("stock").select("\"productoId\",cantidad").limit(2000),
            supabase.from("usuarios").select("id,estado,\"createdAt\"").limit(500),
            supabase.from("almacenes").select("id").limit(200),
            ReconocimientoService.getProductosMasConsultados(5),
          ])

        if (canceled) return

        const historial = (historialResp.data as HistorialRow[]) || []
        const productos = (productosResp.data as ProductoRow[]) || []
        const stock = (stockResp.data as StockRow[]) || []
        const usuarios = (usuariosResp.data as UsuarioRow[]) || []
        const almacenes = (almacenesResp.data as Array<{ id: number }> | null) ?? []
        const consultados = (masConsultadosResp ?? []).filter((item) => item.producto)

        const stockByProduct = stock.reduce<Record<number, number>>((acc, item) => {
          acc[item.productoId] = (acc[item.productoId] || 0) + (item.cantidad || 0)
          return acc
        }, {})

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

        const lowStock = productos
          .filter((producto) => producto.estado === "activo")
          .map<LowStockProduct | null>((producto) => {
            const total = stockByProduct[producto.id] || 0
            if (total >= producto.stockMinimo) {
              return null
            }

            return {
              id: producto.id,
              nombre: producto.nombre ?? `Producto ${producto.id}`,
              stockMinimo: producto.stockMinimo,
              stockTotal: total,
            }
          })
          .filter((item): item is LowStockProduct => Boolean(item))

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
          const isoKey = date.toISOString().slice(0, 10)
          const value = salesMap.get(isoKey) || 0
          return {
            date: isoKey,
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
            value: lowStock.length.toString(),
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

        const productosActivos = productos.filter((producto) => producto.estado === "activo").length
        const productosInactivos = productos.length - productosActivos
        const stockTotal = stock.reduce((sum, item) => sum + (item.cantidad || 0), 0)

        const consultadosFormatted: TopConsultedProduct[] = consultados.map((item) => ({
          id: item.producto!.id,
          nombre: item.producto!.nombre ?? item.producto!.codigo ?? `Producto ${item.producto!.id}`,
          consultas: item.consultas,
        }))

        setMetrics(metricsPayload)
        setLowStockCount(lowStock.length)
        setLowStockProducts(lowStock)
        setSalesSeries(series)
        setDailyProgress(computedDailyProgress)
        setMonthlyProgress(computedMonthlyProgress)
        setYearlyProgress(computedYearlyProgress)
        setDailyTarget(computedDailyTarget)
        setMonthlyTarget(computedMonthlyTarget)
        setYearlyTarget(computedYearlyTarget)
        setInventorySummary({
          productosActivos,
          productosInactivos,
          stockTotal,
          totalProductos: productos.length,
          almacenes: almacenes.length,
        })
        setTopConsulted(consultadosFormatted)

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
            lowStockCount: lowStock.length,
          }

          window.localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(payload))
        }
      } catch (error) {
        console.error("Error al cargar los reportes", error)
      } finally {
        if (!canceled) {
          setLoading(false)
        }
      }
    }

    void loadDashboard()

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

  const totalConsultas = useMemo(
    () => topConsulted.reduce((sum, item) => sum + item.consultas, 0),
    [topConsulted],
  )

  const salesTargetSparkline = useMemo(() => {
    if (salesSeries.length === 0) {
      return [0.3, 0.5, 0.4, 0.65, 0.45, 0.7]
    }
    const lastPoints = salesSeries.slice(-6)
    const maxValue = Math.max(...lastPoints.map((item) => item.value), 1)
    if (maxValue === 0) {
      return lastPoints.map(() => 0)
    }
    return lastPoints.map((item) => item.value / maxValue)
  }, [salesSeries])

  const monthlyCompletion = useMemo(() => {
    if (monthlyTarget === 0) return 0
    return (monthlyProgress / monthlyTarget) * 100
  }, [monthlyProgress, monthlyTarget])

  const monthlyCompletionLabel = useMemo(() => {
    const normalized = Number.isFinite(monthlyCompletion) ? monthlyCompletion : 0
    const clamped = Math.max(Math.min(normalized, 999), -999)
    const formatted = clamped.toFixed(1)
    return `${clamped >= 0 ? "+" : ""}${formatted}%`
  }, [monthlyCompletion])

  const monthlyStatusText = useMemo(() => {
    if (monthlyCompletion >= 100) return "Meta alcanzada"
    if (monthlyCompletion === 0) return "Aún sin progreso"
    return "Meta en progreso"
  }, [monthlyCompletion])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reportes y estadísticas</h1>
          <p className="text-sm text-muted-foreground">Analiza el desempeño del negocio y ajusta tus metas.</p>
        </div>
        {loading && <span className="text-sm text-muted-foreground">Actualizando datos…</span>}
      </div>

      {showMobileNotice && (
        <div className="relative w-full overflow-hidden rounded-2xl border border-primary bg-secondary p-4 text-sm text-muted-foreground shadow-sm">
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <MonitorSmartphone className="h-4 w-4" />
            </span>
            <div className="flex-1 text-[0.92rem] leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">Optimiza tu experiencia</p>
              <p>
                StockWear recomienda revisar los reportes desde un equipo de escritorio para aprovechar todo el espacio
                disponible. Puedes continuar en tu dispositivo móvil cuando lo necesites.
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

      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const TrendIcon = metric.trend === "up" ? TrendingUp : metric.trend === "down" ? TrendingDown : null
          const trendLabel =
            metric.trend === "up"
              ? "Tendencia al alza"
              : metric.trend === "down"
                ? "Tendencia a la baja"
                : "Actividad estable"

          return (
            <Card key={metric.title} className="@container/card border-none" data-slot="card">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardDescription className="text-xs text-muted-foreground">Últimos 30 días</CardDescription>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-medium text-foreground">{metric.title}</CardTitle>
                      <span className={`rounded-full p-1.5 ${metric.bgColor}`}>
                        <metric.icon className={`h-4 w-4 ${metric.iconColor}`} />
                      </span>
                    </div>
                    <div className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{metric.value}</div>
                  </div>
                  <CardAction>
                    <Badge variant="outline" className="flex items-center gap-1 text-xs font-semibold">
                      {TrendIcon ? <TrendIcon className="h-3.5 w-3.5" /> : null}
                      {metric.change}
                    </Badge>
                  </CardAction>
                </div>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  {trendLabel}
                  {TrendIcon ? <TrendIcon className="size-4" /> : null}
                </div>
                <div className="text-muted-foreground">{metric.description}</div>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SalesPerformanceChart
          className="border-none shadow-sm lg:col-span-2"
          data={salesSeries}
          formatter={(value) => currencyFormatter.format(value)}
          title="Ventas recientes"
          description="Filtra la tendencia y compara el ingreso acumulado por rango de fecha"
        />

        <Card className="border-none bg-gradient-to-b from-card via-muted/40 to-muted text-foreground shadow-sm dark:from-[#161616] dark:via-[#111] dark:to-[#0e0e0e] dark:text-white">
          <CardHeader className="space-y-1">
            <CardDescription className="text-sm text-muted-foreground">Objetivo de ventas</CardDescription>
            <CardTitle className="text-2xl font-semibold text-foreground dark:text-white">Seguimiento mensual</CardTitle>
            <p className="text-sm text-muted-foreground">Comparativa frente a la meta definida</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Últimos 6 registros</span>
              <span>{monthlyStatusText}</span>
            </div>
            <div className="flex h-24 items-end gap-2 rounded-2xl bg-[hsl(var(--foreground)/0.08)] p-4 dark:bg-white/5">
              {salesTargetSparkline.map((value, index) => (
                <div
                  key={`spark-${index}`}
                  className="flex-1 h-full overflow-hidden rounded-full bg-[hsl(var(--foreground)/0.12)] dark:bg-white/10"
                >
                  <div
                    className="w-full rounded-full bg-emerald-600/80 dark:bg-emerald-300/90"
                    style={{ height: `${Math.max(value * 100, 8)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-4 text-foreground sm:flex-row sm:items-end sm:justify-between dark:text-white">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Progreso actual</p>
                <p className="text-3xl font-semibold text-foreground dark:text-white">
                  {currencyFormatter.format(monthlyProgress)}
                </p>
                <p className="text-xs text-muted-foreground">Meta mensual: {currencyFormatter.format(monthlyTarget)}</p>
              </div>
              <div className="text-left sm:text-right">
                <p
                  className={`text-2xl font-semibold ${monthlyCompletion >= 100 ? "text-emerald-600 dark:text-emerald-300" : "text-emerald-500 dark:text-emerald-400"}`}
                >
                  {monthlyCompletionLabel}
                </p>
                <p className="text-xs text-muted-foreground">avance frente al objetivo</p>
              </div>
            </div>
            <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-3 dark:border-white/10 dark:bg-white/5">
                <div className="mb-1 flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="uppercase tracking-wide">Diario</span>
                </div>
                <p className="text-lg font-semibold text-foreground dark:text-white">{Math.round(dailyPercentage)}%</p>
                <p className="text-sm text-muted-foreground">{currencyFormatter.format(dailyProgress)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-3 dark:border-white/10 dark:bg-white/5">
                <div className="mb-1 flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="uppercase tracking-wide">Mensual</span>
                </div>
                <p className="text-lg font-semibold text-foreground dark:text-white">{Math.round(monthlyPercentage)}%</p>
                <p className="text-sm text-muted-foreground">{currencyFormatter.format(monthlyProgress)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-3 dark:border-white/10 dark:bg-white/5">
                <div className="mb-1 flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="uppercase tracking-wide">Anual</span>
                </div>
                <p className="text-lg font-semibold text-foreground dark:text-white">{Math.round(yearlyPercentage)}%</p>
                <p className="text-sm text-muted-foreground">{currencyFormatter.format(yearlyProgress)}</p>
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
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-4 rounded-2xl border border-border/50 bg-background/40 p-5 shadow-sm ring-1 ring-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                  <h3 className="font-semibold">Objetivo Diario</h3>
                </div>
                <span className="text-xs text-muted-foreground">Actualiza metas</span>
              </div>
              <div className="grid gap-4 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="daily-target">Meta (COP)</Label>
                  <Input
                    id="daily-target"
                    type="number"
                    value={dailyTarget}
                    onChange={(e) => setDailyTarget(Number(e.target.value) || 0)}
                    placeholder="Ej: 650000"
                    className="bg-background/60"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="daily-progress">Progreso</Label>
                  <Input
                    id="daily-progress"
                    type="number"
                    value={dailyProgress}
                    onChange={(e) => setDailyProgress(Number(e.target.value) || 0)}
                    placeholder="Ej: 450000"
                    className="bg-background/60"
                  />
                </div>
              </div>
              <div className="rounded-xl bg-primary/5 px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground">Porcentaje</p>
                <p className="text-2xl font-semibold text-primary">{Math.round(dailyPercentage)}%</p>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-border/50 bg-background/40 p-5 shadow-sm ring-1 ring-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <h3 className="font-semibold">Objetivo Mensual</h3>
                </div>
                <span className="text-xs text-muted-foreground">Meta principal</span>
              </div>
              <div className="grid gap-4 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="monthly-target">Meta (COP)</Label>
                  <Input
                    id="monthly-target"
                    type="number"
                    value={monthlyTarget}
                    onChange={(e) => setMonthlyTarget(Number(e.target.value) || 0)}
                    placeholder="Ej: 14500000"
                    className="bg-background/60"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="monthly-progress">Progreso</Label>
                  <Input
                    id="monthly-progress"
                    type="number"
                    value={monthlyProgress}
                    onChange={(e) => setMonthlyProgress(Number(e.target.value) || 0)}
                    placeholder="Ej: 11200000"
                    className="bg-background/60"
                  />
                </div>
              </div>
              <div className="rounded-xl bg-primary/5 px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground">Porcentaje</p>
                <p className="text-2xl font-semibold text-primary">{Math.round(monthlyPercentage)}%</p>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-border/50 bg-background/40 p-5 shadow-sm ring-1 ring-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
                  <h3 className="font-semibold">Objetivo Anual</h3>
                </div>
                <span className="text-xs text-muted-foreground">Visión a largo plazo</span>
              </div>
              <div className="grid gap-4 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="yearly-target">Meta (COP)</Label>
                  <Input
                    id="yearly-target"
                    type="number"
                    value={yearlyTarget}
                    onChange={(e) => setYearlyTarget(Number(e.target.value) || 0)}
                    placeholder="Ej: 175000000"
                    className="bg-background/60"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="yearly-progress">Progreso</Label>
                  <Input
                    id="yearly-progress"
                    type="number"
                    value={yearlyProgress}
                    onChange={(e) => setYearlyProgress(Number(e.target.value) || 0)}
                    placeholder="Ej: 125000000"
                    className="bg-background/60"
                  />
                </div>
              </div>
              <div className="rounded-xl bg-primary/5 px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground">Porcentaje</p>
                <p className="text-2xl font-semibold text-primary">{Math.round(yearlyPercentage)}%</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/5 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>Los cambios se guardan de inmediato y afectan el seguimiento del dashboard.</p>
            <Button className="px-6" type="button">
              Guardar cambios
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50">
              <Package className="h-7 w-7 text-blue-600" />
            </div>
            <CardTitle className="text-xl">Estado general de inventario</CardTitle>
            <CardDescription className="text-base">
              Resumen de productos activos e inventario disponible en los almacenes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="text-foreground">Productos totales: {inventorySummary?.totalProductos ?? 0}</p>
            <p className="text-green-600">Activos: {inventorySummary?.productosActivos ?? 0}</p>
            <p className="text-red-600">Inactivos: {inventorySummary?.productosInactivos ?? 0}</p>
            <p className="flex items-center gap-2">
              <Boxes className="h-4 w-4" /> Stock total disponible: {inventorySummary?.stockTotal ?? 0}
            </p>
            <p>Almacenes registrados: {inventorySummary?.almacenes ?? 0}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50">
              <Eye className="h-7 w-7 text-emerald-600" />
            </div>
            <CardTitle className="text-xl">Productos más consultados</CardTitle>
            <CardDescription className="text-base">
              Registros basados en consultas exitosas mediante reconocimiento visual
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && topConsulted.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cargando consultas…</p>
            ) : topConsulted.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay consultas registradas.</p>
            ) : (
              <div className="space-y-2">
                {topConsulted.map((producto) => (
                  <div key={producto.id} className="flex items-center justify-between rounded-lg border bg-muted px-3 py-2">
                    <span className="text-sm font-medium">{producto.nombre}</span>
                    <span className="text-sm text-muted-foreground">{producto.consultas} consultas</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Total de consultas: {totalConsultas}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Productos con stock bajo</CardTitle>
          <CardDescription>Listado de productos cuya disponibilidad está por debajo del mínimo configurado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && lowStockProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Calculando niveles de stock…</p>
          ) : lowStockProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todos los productos cumplen con el stock mínimo establecido.</p>
          ) : (
            <div className="grid gap-3">
              {lowStockProducts.map((producto) => (
                <div key={producto.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{producto.nombre}</p>
                    <p className="text-xs text-muted-foreground">Stock total: {producto.stockTotal}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-red-600">Mínimo requerido: {producto.stockMinimo}</p>
                    <Link href={`/admin/productos/${producto.id}`}>
                      <Button variant="outline" size="sm" className="mt-2">
                        Revisar
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
