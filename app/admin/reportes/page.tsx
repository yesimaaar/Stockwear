"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  FileSpreadsheet,
  CalendarDays,
  Loader2,
  Search,
} = LucideIcons
import { supabase } from "@/lib/supabase"
import { getCurrentTiendaId } from "@/lib/services/tenant-service"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useToast } from "@/hooks/use-toast"
import { ReconocimientoService } from "@/lib/services/reconocimiento-service"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format, endOfDay, startOfDay, subDays, startOfHour, eachHourOfInterval, isSameHour } from "date-fns"
import type { DateRange } from "react-day-picker"
import type { WorkSheet } from "xlsx"

type TimeRange = "90d" | "30d" | "7d" | "1d"

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
  usuarioId: string | null
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
  nombre: string | null
  rol: string | null
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

interface EmployeeSalesPoint {
  empleadoId: string
  nombre: string
  total: number
}

interface SalesReportRow {
  rowId: string
  fechaRegistro: string
  numeroDocumento: string
  tipoDocumento: string
  documentoCliente: string
  nombreCliente: string
  subTotalVenta: number
  impuestoTotalVenta: number
  totalVenta: number
  producto: string
  cantidad: number
  precio: number
  total: number
}

interface VentaDetalleQueryRow {
  id: number
  ventaId: number
  productoId: number
  cantidad: number
  precioUnitario: number | null
  subtotal: number | null
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
  weeklyTarget: number
  weeklyProgress: number
  monthlyTarget: number
  monthlyProgress: number
  yearlyTarget: number
  yearlyProgress: number
  lowStockCount: number
}

type GoalPeriod = "daily" | "weekly" | "monthly" | "yearly"

interface GoalState {
  target: number
  progress: number
}

const GOAL_METADATA: Record<
  GoalPeriod,
  {
    title: string
    subtitle: string
    dotColor: string
    helper: string
    targetPlaceholder: string
    progressPlaceholder: string
  }
> = {
  daily: {
    title: "Objetivo Diario",
    subtitle: "Actualiza metas",
    dotColor: "bg-sky-400",
    helper: "Controla los ingresos día a día",
    targetPlaceholder: "Ej: 650000",
    progressPlaceholder: "Ej: 450000",
  },
  weekly: {
    title: "Objetivo Semanal",
    subtitle: "Seguimiento de la semana",
    dotColor: "bg-emerald-400",
    helper: "Evalúa la suma de tus 7 días",
    targetPlaceholder: "Ej: 4200000",
    progressPlaceholder: "Ej: 3100000",
  },
  monthly: {
    title: "Objetivo Mensual",
    subtitle: "Meta principal",
    dotColor: "bg-amber-400",
    helper: "Alinea tu crecimiento mensual",
    targetPlaceholder: "Ej: 14500000",
    progressPlaceholder: "Ej: 11200000",
  },
  yearly: {
    title: "Objetivo Anual",
    subtitle: "Visión a largo plazo",
    dotColor: "bg-violet-400",
    helper: "Planifica el cierre del año",
    targetPlaceholder: "Ej: 175000000",
    progressPlaceholder: "Ej: 125000000",
  },
}

const GOAL_ORDER: GoalPeriod[] = ["daily", "weekly", "monthly", "yearly"]

const EMPLOYEE_CHART_CONFIG: ChartConfig = {
  ventas: {
    label: "Ventas",
    color: "hsl(var(--primary))",
  },
}

const REPORT_SHEET_NAMES: Record<GoalPeriod, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
  yearly: "Anual",
}

const REPORT_DATE_FORMATTER = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "full",
  timeStyle: "medium",
})

const REPORT_FILE_PREFIX = "stockwear-reporte"

function getInitialSalesRange(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 29)
  return { from: start, to: end }
}

function formatGoalCompletionLabel(value: number) {
  const normalized = Number.isFinite(value) ? value : 0
  const clamped = Math.max(Math.min(normalized, 999), -999)
  return `${clamped.toFixed(1)}%`
}

function getGoalStatusText(value: number) {
  if (value >= 100) return "Meta alcanzada"
  if (value >= 60) return "Meta en curso"
  if (value <= 0) return "Aún sin progreso"
  return "Meta en progreso"
}

function truncateLabel(value: string, maxLength = 16) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1)}…`
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
  const { toast } = useToast()
  const dismissedRef = useRef(false)
  const productosMapRef = useRef<Record<number, { nombre: string | null; codigo?: string | null }>>({})
  const usuariosMapRef = useRef<Record<string, { nombre: string | null }>>({})
  const initialSalesRangeRef = useRef<DateRange>(getInitialSalesRange())
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
  const [allSales, setAllSales] = useState<HistorialRow[]>([])
  const [chartRange, setChartRange] = useState<TimeRange>("7d")
  const [salesSeries, setSalesSeries] = useState<Array<{ date: string; value: number }>>([])
  const [goals, setGoals] = useState<Record<GoalPeriod, GoalState>>({
    daily: { target: 0, progress: 0 },
    weekly: { target: 0, progress: 0 },
    monthly: { target: 0, progress: 0 },
    yearly: { target: 0, progress: 0 },
  })
  const [selectedGoal, setSelectedGoal] = useState<GoalPeriod>("daily")
  const [selectedTrackingPeriod, setSelectedTrackingPeriod] = useState<GoalPeriod>("monthly")
  const [selectedEmployeePeriod, setSelectedEmployeePeriod] = useState<GoalPeriod>("weekly")
  const [employeeSales, setEmployeeSales] = useState<Record<GoalPeriod, EmployeeSalesPoint[]>>({
    daily: [],
    weekly: [],
    monthly: [],
    yearly: [],
  })
  const [exportingReport, setExportingReport] = useState(false)
  const [lowStockCount, setLowStockCount] = useState(0)

  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null)
  const [topConsulted, setTopConsulted] = useState<TopConsultedProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [salesPickerRange, setSalesPickerRange] = useState<DateRange | undefined>(initialSalesRangeRef.current)
  const [appliedSalesRange, setAppliedSalesRange] = useState<DateRange | undefined>(initialSalesRangeRef.current)
  const [salesReportRows, setSalesReportRows] = useState<SalesReportRow[]>([])
  const [salesReportLoading, setSalesReportLoading] = useState(false)

  const dailyGoal = goals.daily
  const weeklyGoal = goals.weekly
  const monthlyGoal = goals.monthly
  const yearlyGoal = goals.yearly

  const dailyTarget = dailyGoal.target
  const dailyProgress = dailyGoal.progress
  const weeklyTarget = weeklyGoal.target
  const weeklyProgress = weeklyGoal.progress
  const monthlyTarget = monthlyGoal.target
  const monthlyProgress = monthlyGoal.progress
  const yearlyTarget = yearlyGoal.target
  const yearlyProgress = yearlyGoal.progress

  const handleGoalInputChange = (period: GoalPeriod, field: keyof GoalState, value: number) => {
    setGoals((prev) => ({
      ...prev,
      [period]: {
        ...prev[period],
        [field]: value,
      },
    }))
  }

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
      setGoals((prev) => ({
        daily: {
          target: parsed.dailyTarget ?? prev.daily.target,
          progress: parsed.dailyProgress ?? prev.daily.progress,
        },
        weekly: {
          target: parsed.weeklyTarget ?? prev.weekly.target,
          progress: parsed.weeklyProgress ?? prev.weekly.progress,
        },
        monthly: {
          target: parsed.monthlyTarget ?? prev.monthly.target,
          progress: parsed.monthlyProgress ?? prev.monthly.progress,
        },
        yearly: {
          target: parsed.yearlyTarget ?? prev.yearly.target,
          progress: parsed.yearlyProgress ?? prev.yearly.progress,
        },
      }))
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
        const tiendaId = await getCurrentTiendaId()
        const [historialResp, productosResp, stockResp, usuariosResp, almacenesResp, masConsultadosResp] =
          await Promise.all([
            supabase
              .from("historialStock")
              .select("tipo,cantidad,\"costoUnitario\",\"createdAt\",\"usuarioId\"")
              .eq("tienda_id", tiendaId)
              .gte("createdAt", subDays(new Date(), 90).toISOString())
              .order("createdAt", { ascending: false }),
            supabase
              .from("productos")
              .select("id,estado,\"stockMinimo\",\"createdAt\",nombre")
              .eq("tienda_id", tiendaId)
              .limit(500),
            supabase
              .from("stock")
              .select("\"productoId\",cantidad")
              .eq("tienda_id", tiendaId)
              .limit(2000),
            supabase
              .from("usuarios")
              .select("id,estado,\"createdAt\",nombre,rol")
              .eq("tienda_id", tiendaId)
              .limit(500),
            supabase
              .from("almacenes")
              .select("id")
              .eq("tienda_id", tiendaId)
              .limit(200),
            ReconocimientoService.getProductosMasConsultados(5, { tiendaId }),
          ])

        if (canceled) return

        const historial = (historialResp.data as HistorialRow[]) || []
        const productos = (productosResp.data as ProductoRow[]) || []
        const stock = (stockResp.data as StockRow[]) || []
        const usuarios = (usuariosResp.data as UsuarioRow[]) || []
        const almacenes = (almacenesResp.data as Array<{ id: number }> | null) ?? []
        const consultados = (masConsultadosResp ?? []).filter((item) => item.producto)

        productosMapRef.current = productos.reduce<
          Record<number, { nombre: string | null; codigo?: string | null }>
        >((acc, producto) => {
          acc[producto.id] = { nombre: producto.nombre ?? null }
          return acc
        }, {})

        const stockByProduct = stock.reduce<Record<number, number>>((acc, item) => {
          acc[item.productoId] = (acc[item.productoId] || 0) + (item.cantidad || 0)
          return acc
        }, {})

        const usuariosById = usuarios.reduce<Record<string, UsuarioRow>>((acc, usuario) => {
          acc[usuario.id] = usuario
          return acc
        }, {})
        usuariosMapRef.current = Object.entries(usuariosById).reduce<
          Record<string, { nombre: string | null; documentoIdentidad?: string | null }>
        >((acc, [key, value]) => {
          acc[key] = { nombre: value.nombre ?? null }
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
        const dayOfWeek = (now.getDay() + 6) % 7 // Monday-based week start
        const weekStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)
        const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1)
        const yearStartDate = new Date(now.getFullYear(), 0, 1)
        const salesToday = ventas.filter((v) => new Date(v.createdAt) >= today)
        const dailySalesValue = salesToday.reduce((sum, item) => sum + (item.costoUnitario || 0) * item.cantidad, 0)
        const weeklySales = ventas.filter((v) => new Date(v.createdAt) >= weekStartDate)
        const weeklySalesValue = weeklySales.reduce((sum, item) => sum + (item.costoUnitario || 0) * item.cantidad, 0)
        const yearlySales = ventas.filter((v) => {
          const { year } = getDateParts(v.createdAt)
          return year === currentYear
        })
        const yearlySalesValue = yearlySales.reduce((sum, item) => sum + (item.costoUnitario || 0) * item.cantidad, 0)

        const employeeTotals: Record<GoalPeriod, Record<string, number>> = {
          daily: {},
          weekly: {},
          monthly: {},
          yearly: {},
        }

        const sumEmployeeSale = (period: GoalPeriod, empleadoId: string, amount: number) => {
          if (!employeeTotals[period][empleadoId]) {
            employeeTotals[period][empleadoId] = 0
          }
          employeeTotals[period][empleadoId] += amount
        }

        ventas.forEach((venta) => {
          if (!venta.usuarioId) return
          const empleado = usuariosById[venta.usuarioId]
          if (!empleado || empleado.rol !== "empleado") return
          const saleDate = new Date(venta.createdAt)
          const amount = (venta.costoUnitario || 0) * venta.cantidad
          if (saleDate >= today) sumEmployeeSale("daily", venta.usuarioId, amount)
          if (saleDate >= weekStartDate) sumEmployeeSale("weekly", venta.usuarioId, amount)
          if (saleDate >= monthStartDate) sumEmployeeSale("monthly", venta.usuarioId, amount)
          if (saleDate >= yearStartDate) sumEmployeeSale("yearly", venta.usuarioId, amount)
        })
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

        setAllSales(ventas)



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
        const computedWeeklyProgress = Math.round(weeklySalesValue)
        const computedMonthlyProgress = Math.round(monthSalesValue)
        const computedYearlyProgress = Math.round(yearlySalesValue)
        const computedDailyTarget = Math.max(Math.round(dailySalesValue * 1.2), 1)
        const computedWeeklyTarget = Math.max(Math.round(weeklySalesValue * 1.18), 1)
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

        const employeeSalesPayload: Record<GoalPeriod, EmployeeSalesPoint[]> = GOAL_ORDER.reduce(
          (acc, period) => {
            const entries = Object.entries(employeeTotals[period])
              .map(([empleadoId, total]) => ({
                empleadoId,
                nombre: usuariosById[empleadoId]?.nombre ?? "Empleado",
                total,
              }))
              .sort((a, b) => b.total - a.total)
              .slice(0, 6)
            acc[period] = entries
            return acc
          },
          {
            daily: [],
            weekly: [],
            monthly: [],
            yearly: [],
          } as Record<GoalPeriod, EmployeeSalesPoint[]>,
        )

        setMetrics(metricsPayload)
        setLowStockCount(lowStock.length)

        // setSalesSeries is now handled by useEffect depending on chartRange
        setGoals({
          daily: { target: computedDailyTarget, progress: computedDailyProgress },
          weekly: { target: computedWeeklyTarget, progress: computedWeeklyProgress },
          monthly: { target: computedMonthlyTarget, progress: computedMonthlyProgress },
          yearly: { target: computedYearlyTarget, progress: computedYearlyProgress },
        })
        setEmployeeSales(employeeSalesPayload)
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
            salesSeries: [],
            dailyTarget: computedDailyTarget,
            dailyProgress: computedDailyProgress,
            weeklyTarget: computedWeeklyTarget,
            weeklyProgress: computedWeeklyProgress,
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

  useEffect(() => {
    if (allSales.length === 0) {
      setSalesSeries([])
      return
    }

    const now = new Date()
    let filteredSales = allSales

    if (chartRange === "1d") {
      const startOfToday = startOfDay(now)
      filteredSales = allSales.filter((sale) => new Date(sale.createdAt) >= startOfToday)

      const hours = eachHourOfInterval({
        start: startOfToday,
        end: endOfDay(now),
      })

      const salesMap = new Map<string, number>()
      hours.forEach((hour) => {
        salesMap.set(hour.toISOString(), 0)
      })

      filteredSales.forEach((sale) => {
        const saleDate = new Date(sale.createdAt)
        const hourKey = startOfHour(saleDate).toISOString()
        if (salesMap.has(hourKey)) {
          const current = salesMap.get(hourKey) || 0
          salesMap.set(hourKey, current + (sale.costoUnitario || 0) * sale.cantidad)
        }
      })

      const series = hours.map((hour) => ({
        date: hour.toISOString(),
        value: salesMap.get(hour.toISOString()) || 0,
      }))
      setSalesSeries(series)
    } else {
      let daysToSubtract = 90
      if (chartRange === "30d") daysToSubtract = 30
      if (chartRange === "7d") daysToSubtract = 7

      const startDate = subDays(startOfDay(now), daysToSubtract - 1) // Include today
      filteredSales = allSales.filter((sale) => new Date(sale.createdAt) >= startDate)

      const salesMap = new Map<string, number>()
      const dates: Date[] = []
      for (let i = 0; i < daysToSubtract; i++) {
        const date = subDays(now, daysToSubtract - 1 - i)
        const key = format(date, "yyyy-MM-dd")
        salesMap.set(key, 0)
        dates.push(date)
      }

      filteredSales.forEach((sale) => {
        const key = format(new Date(sale.createdAt), "yyyy-MM-dd")
        if (salesMap.has(key)) {
          const current = salesMap.get(key) || 0
          salesMap.set(key, current + (sale.costoUnitario || 0) * sale.cantidad)
        }
      })

      const series = dates.map((date) => {
        const key = format(date, "yyyy-MM-dd")
        return {
          date: key,
          value: salesMap.get(key) || 0,
        }
      })
      setSalesSeries(series)
    }
  }, [allSales, chartRange])

  const dailyPercentage = useMemo(() => {
    if (dailyTarget === 0) return 0
    return (dailyProgress / dailyTarget) * 100
  }, [dailyProgress, dailyTarget])

  const weeklyPercentage = useMemo(() => {
    if (weeklyTarget === 0) return 0
    return (weeklyProgress / weeklyTarget) * 100
  }, [weeklyProgress, weeklyTarget])

  const monthlyPercentage = useMemo(() => {
    if (monthlyTarget === 0) return 0
    return (monthlyProgress / monthlyTarget) * 100
  }, [monthlyProgress, monthlyTarget])

  const yearlyPercentage = useMemo(() => {
    if (yearlyTarget === 0) return 0
    return (yearlyProgress / yearlyTarget) * 100
  }, [yearlyProgress, yearlyTarget])

  const goalPercentages = useMemo<Record<GoalPeriod, number>>(
    () => ({
      daily: dailyPercentage,
      weekly: weeklyPercentage,
      monthly: monthlyPercentage,
      yearly: yearlyPercentage,
    }),
    [dailyPercentage, weeklyPercentage, monthlyPercentage, yearlyPercentage],
  )

  const currentGoal = goals[selectedGoal]
  const currentGoalMetadata = GOAL_METADATA[selectedGoal]
  const currentGoalPercentage = goalPercentages[selectedGoal]
  const trackingGoal = goals[selectedTrackingPeriod]
  const trackingGoalMetadata = GOAL_METADATA[selectedTrackingPeriod]
  const trackingGoalPercentage = goalPercentages[selectedTrackingPeriod]
  const trackingStatusText = getGoalStatusText(trackingGoalPercentage)
  const trackingCompletionLabel = formatGoalCompletionLabel(trackingGoalPercentage)
  const employeeChartMetadata = GOAL_METADATA[selectedEmployeePeriod]
  const employeeChartData = useMemo(() => {
    return employeeSales[selectedEmployeePeriod].map((item) => ({
      ...item,
      label: truncateLabel(item.nombre ?? "Empleado", 14),
    }))
  }, [employeeSales, selectedEmployeePeriod])
  const employeeChartHasData = employeeChartData.length > 0

  const buildPeriodReportTables = useCallback(
    (period: GoalPeriod, generatedAtLabel: string) => {
      const metadata = GOAL_METADATA[period]
      const goal = goals[period]
      const percent = Number(goalPercentages[period].toFixed(2))
      const status = getGoalStatusText(percent)
      const pending = Math.max(goal.target - goal.progress, 0)
      const employees = employeeSales[period]
      const totalEmployeeSales = employees.reduce((sum, employee) => sum + employee.total, 0)
      const avgPerEmployee = employees.length > 0 ? totalEmployeeSales / employees.length : 0

      const summaryTable = {
        header: ["Indicador", "Descripción", "Valor", "Observaciones"],
        rows: [
          ["Meta", "Meta configurada (COP)", goal.target || 0, ""],
          ["Meta", "Progreso acumulado (COP)", goal.progress || 0, ""],
          ["Meta", "Cumplimiento (%)", percent, "Porcentaje de avance"],
          ["Meta", "Pendiente por alcanzar (COP)", pending > 0 ? pending : 0, ""],
          ["Estado", "Situación actual", status, status],
          ["Ingresos", "Ventas totales analizadas (COP)", totalEmployeeSales, ""],
          ["Ingresos", "Promedio por colaborador (COP)", Number(avgPerEmployee.toFixed(2)), ""],
        ],
      }

      const employeeTable = {
        header: ["#", "Colaborador", "Ventas (COP)", "Participación (%)"],
        rows:
          employees.length === 0
            ? [[1, "Sin registros", 0, 0]]
            : employees.map((employee, index) => {
              const share = totalEmployeeSales > 0 ? Number(((employee.total / totalEmployeeSales) * 100).toFixed(2)) : 0
              return [index + 1, employee.nombre, Number(employee.total.toFixed(2)), share]
            }),
      }

      const notesTable = {
        header: ["Notas", "Detalle"],
        rows: [
          ["Periodo", REPORT_SHEET_NAMES[period]],
          ["Generado el", generatedAtLabel],
          ["Meta / Progreso", `${currencyFormatter.format(goal.progress)} / ${currencyFormatter.format(goal.target)}`],
        ],
      }

      return {
        metadata,
        summaryTable,
        employeeTable,
        notesTable,
      }
    },
    [employeeSales, goalPercentages, goals],
  )

  const fetchSalesReport = useCallback(
    async (range?: DateRange) => {
      if (!range?.from || !range?.to) {
        toast({
          variant: "destructive",
          title: "Selecciona un rango válido",
          description: "Debes escoger ambas fechas para consultar el reporte.",
        })
        return
      }

      setSalesReportLoading(true)
      try {
        const fromISO = startOfDay(range.from).toISOString()
        const toISO = endOfDay(range.to).toISOString()

        const { data: ventasData, error: ventasError } = await supabase
          .from("ventas")
          .select('id,folio,total,"usuarioId","createdAt"')
          .gte("createdAt", fromISO)
          .lte("createdAt", toISO)
          .order("createdAt", { ascending: false })
          .limit(300)

        if (ventasError) throw ventasError

        const ventaIds = (ventasData ?? []).map((venta) => venta.id)
        let detallesData: VentaDetalleQueryRow[] = []

        if (ventaIds.length > 0) {
          const { data: detalles, error: detallesError } = await supabase
            .from("ventasDetalle")
            .select('id,"ventaId","productoId",cantidad,"precioUnitario",subtotal')
            .in("ventaId", ventaIds)

          if (detallesError) throw detallesError
          detallesData = detalles ?? []
        }

        const productoIds = Array.from(new Set(detallesData.map((detalle) => detalle.productoId))).filter(Boolean)
        if (productoIds.length > 0) {
          const { data: productosSnapshot, error: productosError } = await supabase
            .from("productos")
            .select("id,nombre,codigo")
            .in("id", productoIds)

          if (productosError) throw productosError

          productosSnapshot?.forEach((producto) => {
            productosMapRef.current[producto.id] = {
              nombre: producto.nombre ?? null,
              codigo: (producto as { codigo?: string | null }).codigo ?? undefined,
            }
          })
        }

        const usuarioIds = Array.from(
          new Set(
            (ventasData ?? [])
              .map((venta) => venta.usuarioId)
              .filter((id): id is string => Boolean(id)),
          ),
        )

        if (usuarioIds.length > 0) {
          const { data: usuariosSnapshot, error: usuariosError } = await supabase
            .from("usuarios")
            .select("id,nombre")
            .in("id", usuarioIds)

          if (usuariosError) throw usuariosError

          usuariosSnapshot?.forEach((usuario) => {
            usuariosMapRef.current[usuario.id] = {
              nombre: usuario.nombre ?? null,
            }
          })
        }

        const detallesPorVenta = detallesData.reduce<Record<number, VentaDetalleQueryRow[]>>((acc, detalle) => {
          if (!acc[detalle.ventaId]) {
            acc[detalle.ventaId] = []
          }
          acc[detalle.ventaId]!.push(detalle)
          return acc
        }, {})

        const rows: SalesReportRow[] = (ventasData ?? []).flatMap((venta) => {
          const detalles = detallesPorVenta[venta.id] ?? []
          const cliente = venta.usuarioId ? usuariosMapRef.current[venta.usuarioId] : null

          if (detalles.length === 0) {
            return [
              {
                rowId: `${venta.id}-general`,
                fechaRegistro: venta.createdAt,
                numeroDocumento: venta.folio,
                tipoDocumento: "Venta",
                documentoCliente: cliente?.nombre ?? "N/A",
                nombreCliente: cliente?.nombre ?? "Cliente mostrador",
                subTotalVenta: Number(venta.total) || 0,
                impuestoTotalVenta: Number((Number(venta.total || 0) * 0.19).toFixed(2)),
                totalVenta: Number(venta.total) || 0,
                producto: "Sin detalles registrados",
                cantidad: 0,
                precio: 0,
                total: Number(venta.total) || 0,
              },
            ]
          }

          return detalles.map((detalle) => {
            const producto = productosMapRef.current[detalle.productoId]
            const subtotal = Number(detalle.subtotal ?? (detalle.precioUnitario || 0) * detalle.cantidad)
            return {
              rowId: `${venta.id}-${detalle.id}`,
              fechaRegistro: venta.createdAt,
              numeroDocumento: venta.folio,
              tipoDocumento: "Venta",
              documentoCliente: cliente?.nombre ?? "N/A",
              nombreCliente: cliente?.nombre ?? "Cliente mostrador",
              subTotalVenta: subtotal,
              impuestoTotalVenta: Number((subtotal * 0.19).toFixed(2)),
              totalVenta: Number(venta.total) || subtotal,
              producto: producto?.nombre ?? `Producto ${detalle.productoId}`,
              cantidad: detalle.cantidad,
              precio: Number(detalle.precioUnitario || 0),
              total: subtotal,
            }
          })
        })

        setSalesReportRows(rows)
        setAppliedSalesRange(range)
      } catch (error) {
        console.error("Error consultando el reporte de ventas", error)
        toast({
          variant: "destructive",
          title: "No se pudo consultar el reporte",
          description: "Intenta nuevamente en unos segundos.",
        })
      } finally {
        setSalesReportLoading(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    void fetchSalesReport(initialSalesRangeRef.current)
  }, [fetchSalesReport])

  const handleSalesSearch = useCallback(() => {
    void fetchSalesReport(salesPickerRange)
  }, [fetchSalesReport, salesPickerRange])

  const handleExportSalesReport = useCallback(async () => {
    if (salesReportRows.length === 0) {
      toast({
        title: "Sin datos para exportar",
        description: "Aplica un filtro con resultados para descargar el archivo.",
      })
      return
    }

    try {
      const XLSX = await import("xlsx")
      const worksheetData = salesReportRows.map((row) => ({
        "Fecha registro": format(new Date(row.fechaRegistro), "dd/MM/yyyy HH:mm"),
        "Numero venta": row.numeroDocumento,
        "Tipo documento": row.tipoDocumento,
        Cliente: row.nombreCliente,
        Producto: row.producto,
        Cantidad: row.cantidad,
        "Precio unitario": row.precio,
        Subtotal: row.subTotalVenta,
        "Total venta": row.totalVenta,
      }))

      const worksheet = XLSX.utils.json_to_sheet(worksheetData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas filtradas")

      const fromLabel = appliedSalesRange?.from ? format(appliedSalesRange.from, "yyyyMMdd") : "inicio"
      const toLabel = appliedSalesRange?.to ? format(appliedSalesRange.to, "yyyyMMdd") : "fin"

      XLSX.writeFile(workbook, `stockwear-ventas-${fromLabel}-${toLabel}.xlsx`)
      toast({ title: "Exportación completada", description: "El archivo de ventas se descargó correctamente." })
    } catch (error) {
      console.error("Error exportando reporte de ventas", error)
      toast({
        variant: "destructive",
        title: "No se pudo exportar",
        description: "Intenta nuevamente en unos segundos.",
      })
    }
  }, [appliedSalesRange, salesReportRows, toast])

  const handleGenerateReport = useCallback(async () => {
    if (exportingReport) return
    if (typeof window === "undefined") return
    setExportingReport(true)

    try {
      const XLSX = await import("xlsx")
      const generatedAtLabel = REPORT_DATE_FORMATTER.format(new Date())
      const workbook = XLSX.utils.book_new()

      const sheetAddTable = ((XLSX.utils as unknown as { sheet_add_table?: (ws: WorkSheet, opts: any) => void }).sheet_add_table)

      GOAL_ORDER.forEach((period, index) => {
        const { metadata, summaryTable, employeeTable, notesTable } = buildPeriodReportTables(period, generatedAtLabel)
        const maxColumns = Math.max(summaryTable.header.length, employeeTable.header.length, notesTable.header.length, 4)

        const worksheet = XLSX.utils.aoa_to_sheet([
          [`${metadata.title} - Reporte integral`],
          [`Generado el: ${generatedAtLabel}`],
          [""],
        ])

        worksheet["!merges"] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: maxColumns - 1 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: maxColumns - 1 } },
        ]

        worksheet["!rows"] = [{ hpt: 24 }, { hpt: 18 }]
        worksheet["!cols"] = [
          { wch: 18 },
          { wch: 36 },
          { wch: 22 },
          { wch: 28 },
        ]

        let currentRow = 4

        const addTableWithStyle = (
          name: string,
          header: Array<string>,
          rows: Array<Array<string | number>>,
          theme: string,
          refRow: number,
        ) => {
          if (!sheetAddTable) {
            XLSX.utils.sheet_add_aoa(worksheet, [header, ...rows], { origin: `A${refRow}` })
            return rows.length + 1
          }

          sheetAddTable(worksheet, {
            name,
            ref: `A${refRow}`,
            header,
            data: rows,
            tableId: index * 10 + refRow,
            style: {
              theme,
              showRowStripes: true,
              showColumnStripes: false,
            },
          })
          const lastRow = refRow + rows.length
          return lastRow - refRow + 1
        }

        currentRow += addTableWithStyle(
          `${REPORT_SHEET_NAMES[period]}_Resumen`,
          summaryTable.header,
          summaryTable.rows,
          "TableStyleMedium2",
          currentRow,
        )

        currentRow += 1
        const collaboratorsTitleRow = currentRow
        XLSX.utils.sheet_add_aoa(worksheet, [["Top colaboradores"]], { origin: `A${collaboratorsTitleRow}` })
        worksheet["!merges"]?.push({ s: { r: collaboratorsTitleRow - 1, c: 0 }, e: { r: collaboratorsTitleRow - 1, c: maxColumns - 1 } })
        currentRow = collaboratorsTitleRow + 1

        currentRow += addTableWithStyle(
          `${REPORT_SHEET_NAMES[period]}_Colaboradores`,
          employeeTable.header,
          employeeTable.rows,
          "TableStyleMedium9",
          currentRow,
        )

        currentRow += 1
        const notesTitleRow = currentRow
        XLSX.utils.sheet_add_aoa(worksheet, [["Notas"]], { origin: `A${notesTitleRow}` })
        worksheet["!merges"]?.push({ s: { r: notesTitleRow - 1, c: 0 }, e: { r: notesTitleRow - 1, c: maxColumns - 1 } })
        currentRow = notesTitleRow + 1

        currentRow += addTableWithStyle(
          `${REPORT_SHEET_NAMES[period]}_Notas`,
          notesTable.header,
          notesTable.rows,
          "TableStyleMedium4",
          currentRow,
        )

        XLSX.utils.book_append_sheet(workbook, worksheet, REPORT_SHEET_NAMES[period])
      })

      const arrayBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
      const blob = new Blob([arrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${REPORT_FILE_PREFIX}-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast({ title: "Reporte generado", description: "Tu archivo .XLS se descargó correctamente." })
    } catch (error) {
      console.error("Error generando reporte XLS", error)
      toast({
        variant: "destructive",
        title: "No se pudo generar el reporte",
        description: "Vuelve a intentarlo en unos segundos.",
      })
    } finally {
      setExportingReport(false)
    }
  }, [buildPeriodReportTables, exportingReport, toast])

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

  const salesReportTotals = useMemo(() => {
    const detalleTotal = salesReportRows.reduce((sum, row) => sum + row.total, 0)
    const uniqueSales = salesReportRows.reduce<Record<string, number>>((acc, row) => {
      if (!acc[row.numeroDocumento]) {
        acc[row.numeroDocumento] = row.totalVenta
      }
      return acc
    }, {})
    const totalVentas = Object.values(uniqueSales).reduce((sum, value) => sum + value, 0)
    return {
      registros: salesReportRows.length,
      detalle: detalleTotal,
      ventas: totalVentas,
    }
  }, [salesReportRows])

  const salesRangeLabel = useMemo(() => {
    if (!salesPickerRange?.from) {
      return "Selecciona rango"
    }
    if (!salesPickerRange.to) {
      return format(salesPickerRange.from, "dd MMM yyyy")
    }
    const sameYear = salesPickerRange.from.getFullYear() === salesPickerRange.to.getFullYear()
    const formatString = sameYear ? "dd MMM" : "dd MMM yyyy"
    return `${format(salesPickerRange.from, formatString)} – ${format(salesPickerRange.to, "dd MMM yyyy")}`
  }, [salesPickerRange])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reportes y estadísticas</h1>
          <p className="text-sm text-muted-foreground">Analiza el desempeño del negocio y ajusta tus metas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {loading && <span className="text-sm text-muted-foreground">Actualizando datos…</span>}
          <Button
            type="button"
            variant="destructive"
            className="gap-2 whitespace-nowrap"
            onClick={handleGenerateReport}
            disabled={loading || exportingReport}
            aria-busy={exportingReport}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exportingReport ? "Generando…" : "Generar reporte .XLS"}
          </Button>
        </div>
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

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="empleado">Empleado</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
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
              key={chartRange}
              className="border-none shadow-sm lg:col-span-2"
              data={salesSeries}
              formatter={(value) => currencyFormatter.format(value)}
              title="Ventas recientes"
              description="Filtra la tendencia y compara el ingreso acumulado por rango de fecha"
              timeRange={chartRange}
              onTimeRangeChange={setChartRange}
            />

            <Card className="border-none bg-gradient-to-b from-card via-muted/40 to-muted text-foreground shadow-sm dark:from-[#161616] dark:via-[#111] dark:to-[#0e0e0e] dark:text-white">
              <CardHeader className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardDescription className="text-sm text-muted-foreground">Objetivo de ventas</CardDescription>
                    <CardTitle className="text-2xl font-semibold text-foreground dark:text-white">
                      Seguimiento {trackingGoalMetadata.title.replace("Objetivo ", "").toLowerCase()}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Compara tu progreso vs. la meta definida</p>
                  </div>
                  <div className="w-full max-w-[180px]">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Periodo
                    </Label>
                    <Select
                      value={selectedTrackingPeriod}
                      onValueChange={(value) => setSelectedTrackingPeriod(value as GoalPeriod)}
                    >
                      <SelectTrigger className="bg-background/60">
                        <SelectValue placeholder="Selecciona periodo" />
                      </SelectTrigger>
                      <SelectContent>
                        {GOAL_ORDER.map((period) => (
                          <SelectItem key={`tracking-${period}`} value={period}>
                            {GOAL_METADATA[period].title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Últimos 6 registros</span>
                  <span>{trackingStatusText}</span>
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
                      {currencyFormatter.format(trackingGoal.progress)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Meta {trackingGoalMetadata.title.replace("Objetivo ", "").toLowerCase()}: {currencyFormatter.format(trackingGoal.target)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p
                      className={`text-2xl font-semibold ${trackingGoalPercentage >= 100 ? "text-emerald-600 dark:text-emerald-300" : "text-emerald-500 dark:text-emerald-400"}`}
                    >
                      {trackingCompletionLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">avance frente al objetivo</p>
                  </div>
                </div>
                <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                  {GOAL_ORDER.map((period) => (
                    <div
                      key={`summary-${period}`}
                      className={`rounded-2xl border border-border bg-card/70 p-3 dark:border-white/10 dark:bg-white/5 ${period === selectedTrackingPeriod ? "ring-1 ring-primary/40" : ""}`}
                    >
                      <div className="mb-1 flex items-center justify-between text-foreground">
                        <div className="flex items-center gap-2">
                          <Target className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="uppercase tracking-wide text-[0.7rem]">
                            {GOAL_METADATA[period].title.replace("Objetivo ", "")}
                          </span>
                        </div>
                        <span className="text-[0.7rem] uppercase text-muted-foreground">{Math.round(goalPercentages[period])}%</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground dark:text-white">
                        {currencyFormatter.format(goals[period].progress)}
                      </p>
                      <p className="text-muted-foreground">Meta: {currencyFormatter.format(goals[period].target)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle>Configuración de Objetivos</CardTitle>
                </div>
                <CardDescription>Define y ajusta tus metas según el periodo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 rounded-xl border border-border/50 bg-background/50 p-4 shadow-sm ring-1 ring-white/5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${currentGoalMetadata.dotColor}`} />
                      <div>
                        <h3 className="font-semibold">{currentGoalMetadata.title}</h3>
                        <p className="text-xs text-muted-foreground">{currentGoalMetadata.subtitle}</p>
                      </div>
                    </div>
                    <div className="w-full max-w-xs space-y-2">
                      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Tipo de objetivo
                      </Label>
                      <Select value={selectedGoal} onValueChange={(value) => setSelectedGoal(value as GoalPeriod)}>
                        <SelectTrigger className="bg-background/60">
                          <SelectValue placeholder="Selecciona un objetivo" />
                        </SelectTrigger>
                        <SelectContent>
                          {GOAL_ORDER.map((period) => (
                            <SelectItem key={period} value={period}>
                              {GOAL_METADATA[period].title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor={`${selectedGoal}-target`}>Meta (COP)</Label>
                      <Input
                        id={`${selectedGoal}-target`}
                        type="number"
                        value={currentGoal.target}
                        onChange={(e) => handleGoalInputChange(selectedGoal, "target", Number(e.target.value) || 0)}
                        placeholder={currentGoalMetadata.targetPlaceholder}
                        className="bg-background/60"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`${selectedGoal}-progress`}>Progreso</Label>
                      <Input
                        id={`${selectedGoal}-progress`}
                        type="number"
                        value={currentGoal.progress}
                        onChange={(e) => handleGoalInputChange(selectedGoal, "progress", Number(e.target.value) || 0)}
                        placeholder={currentGoalMetadata.progressPlaceholder}
                        className="bg-background/60"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-dashed border-border/70 bg-primary/5 px-4 py-3 text-sm">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{currentGoalMetadata.helper}</p>
                    <div className="mt-2 flex flex-wrap items-end justify-between gap-4 text-foreground">
                      <div>
                        <p className="text-3xl font-semibold text-primary">{Math.round(currentGoalPercentage)}%</p>
                        <p className="text-xs text-muted-foreground">Porcentaje alcanzado</p>
                      </div>
                      <div className="text-right text-muted-foreground">
                        <p>Progreso: {currencyFormatter.format(currentGoal.progress)}</p>
                        <p>Meta: {currencyFormatter.format(currentGoal.target)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                    {GOAL_ORDER.map((period) => {
                      const metadata = GOAL_METADATA[period]
                      const isActive = selectedGoal === period
                      return (
                        <div
                          key={period}
                          className={`rounded-xl border border-border bg-card/60 p-3 ${isActive ? "ring-1 ring-primary/40" : ""}`}
                        >
                          <div className="mb-1 flex items-center gap-2 text-foreground">
                            <span className={`h-2 w-2 rounded-full ${metadata.dotColor}`} />
                            <span className="font-semibold">{metadata.title.replace("Objetivo ", "")}</span>
                          </div>
                          <p className="text-lg font-semibold text-foreground">{Math.round(goalPercentages[period])}%</p>
                          <p className="text-muted-foreground">{currencyFormatter.format(goals[period].progress)}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/5 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <p>Los cambios se guardan de inmediato y afectan el seguimiento del dashboard.</p>
                  <Button className="px-6" type="button">
                    Guardar cambios
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

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
        </TabsContent>

        <TabsContent value="empleado">
          <Card className="border-none shadow-sm">
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardDescription className="text-sm text-muted-foreground">Ventas por empleado</CardDescription>
                  <CardTitle>Impacto del equipo</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Visualiza las ventas acumuladas por cada colaborador según el periodo seleccionado.
                  </p>
                </div>
                <div className="w-full max-w-[180px] space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Periodo
                  </Label>
                  <Select value={selectedEmployeePeriod} onValueChange={(value) => setSelectedEmployeePeriod(value as GoalPeriod)}>
                    <SelectTrigger className="bg-background/60">
                      <SelectValue placeholder="Selecciona periodo" />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_ORDER.map((period) => (
                        <SelectItem key={`employee-${period}`} value={period}>
                          {GOAL_METADATA[period].title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {employeeChartHasData ? (
                <ChartContainer config={EMPLOYEE_CHART_CONFIG} className="h-[320px] w-full">
                  <BarChart data={employeeChartData} barCategoryGap="20%">
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={12}
                      className="text-xs"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => currencyFormatter.format(value as number).replace(/\u00a0/g, " ")}
                      className="text-xs"
                    />
                    <ChartTooltip
                      content={({ content, ...contentProps }) => (
                        <ChartTooltipContent
                          {...contentProps}
                          labelFormatter={(_, items = []) => {
                            const entry = items[0]?.payload as { nombre?: string } | undefined
                            return entry?.nombre ?? employeeChartMetadata.title
                          }}
                          formatter={(value) => currencyFormatter.format(value as number)}
                        />
                      )}
                    />
                    <Bar dataKey="total" radius={[8, 8, 4, 4]} fill="var(--color-ventas)" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[320px] flex-col items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                  Aún no hay ventas registradas para este periodo.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>




    </div>
  )
}
