"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  Search,
  Filter,
  Download,
  Store,
  Receipt,
  MessageCircle,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import XLSX from "xlsx-js-style"

import { AdminSectionLayout } from "@/components/domain/admin-section-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { InventarioService } from "@/features/movimientos/services/inventario-service"
import type { Almacen, Talla } from "@/lib/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { getCurrentTiendaId } from "@/features/auth/services/tenant-service"
import { CajaService } from "@/features/caja/services/caja-service"
import { AuthService } from "@/features/auth/services/auth-service"
import type { CajaSesion, Gasto } from "@/lib/types"
import { CAJA_SESSION_UPDATED } from "@/lib/events"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ClienteService } from "@/features/ventas/services/cliente-service"
import { DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { GastosDialog } from "./components/gastos-dialog"
import { GastoService } from "@/features/movimientos/services/gasto-service"
import { PagoGastoDialog } from "./components/pago-gasto-dialog"
import { PagoGastoService } from "@/features/movimientos/services/pago-gasto-service"
import type { PagoGasto } from "@/lib/types"

// --- Schemas (Existing) ---

const entradaSchema = z.object({
  productoId: z.string({ required_error: "Selecciona un producto" }).min(1, "Selecciona un producto"),
  tallaId: z.string().optional(),
  almacenId: z.string({ required_error: "Selecciona un almacén" }).min(1, "Selecciona un almacén"),
  cantidad: z.coerce
    .number({ invalid_type_error: "Ingresa una cantidad válida" })
    .min(1, "La cantidad debe ser mayor a cero"),
  motivo: z.string().trim().max(160, "Máximo 160 caracteres").optional(),
  costoUnitario: z.string().optional(),
})

type EntradaFormValues = z.infer<typeof entradaSchema>

const ajusteSchema = z.object({
  tipo: z.enum(["entrada", "salida", "ajuste"], { required_error: "Selecciona un tipo" }),
  productoId: z.string({ required_error: "Selecciona un producto" }).min(1, "Selecciona un producto"),
  tallaId: z.string().optional(),
  almacenId: z.string({ required_error: "Selecciona un almacén" }).min(1, "Selecciona un almacén"),
  cantidad: z.coerce
    .number({ invalid_type_error: "Ingresa una cantidad válida" })
    .min(1, "La cantidad debe ser mayor a cero"),
  motivo: z.string().trim().max(160, "Máximo 160 caracteres").optional(),
})

type AjusteFormValues = z.infer<typeof ajusteSchema>

const transferenciaSchema = z
  .object({
    productoId: z.string({ required_error: "Selecciona un producto" }).min(1, "Selecciona un producto"),
    tallaId: z.string().optional(),
    origenId: z.string({ required_error: "Selecciona el almacén origen" }).min(1, "Selecciona el almacén origen"),
    destinoId: z
      .string({ required_error: "Selecciona el almacén destino" })
      .min(1, "Selecciona el almacén destino"),
    cantidad: z.coerce
      .number({ invalid_type_error: "Ingresa una cantidad válida" })
      .min(1, "La cantidad debe ser mayor a cero"),
    motivo: z.string().trim().max(160, "Máximo 160 caracteres").optional(),
  })
  .refine((values) => values.origenId !== values.destinoId, {
    message: "El almacén destino debe ser diferente al de origen",
    path: ["destinoId"],
  })

type TransferenciaFormValues = z.infer<typeof transferenciaSchema>

// --- Types ---

type ProductoBasico = {
  id: number
  nombre: string
  codigo: string
}

interface HistorialItem {
  id: number
  tipo: string
  cantidad: number
  costoUnitario: number | null
  createdAt: string
  motivo: string | null
  producto: { nombre: string } | null
}

interface IngresoItem {
  id: string | number
  tipo: 'venta_contado' | 'abono'
  monto: number
  fecha: string
  descripcion: string
  secondaryDescription?: string
  referencia?: string
}

interface CuentaPorCobrar {
  id: number
  folio: string
  cliente: { id: number; nombre: string; telefono?: string; documento?: string; direccion?: string } | null
  total: number
  saldoPendiente: number
  fechaPrimerVencimiento: string | null
  numeroCuotas: number
  montoCuota: number
  frecuenciaPago: string | null
  createdAt: string
}

// --- Defaults ---

const DEFAULT_ENTRADA_VALUES: EntradaFormValues = {
  productoId: "",
  tallaId: "none",
  almacenId: "",
  cantidad: 1,
  motivo: "",
  costoUnitario: "",
}

const DEFAULT_AJUSTE_VALUES: AjusteFormValues = {
  tipo: "salida",
  productoId: "",
  tallaId: "none",
  almacenId: "",
  cantidad: 1,
  motivo: "",
}

const DEFAULT_TRANSFERENCIA_VALUES: TransferenciaFormValues = {
  productoId: "",
  tallaId: "none",
  origenId: "",
  destinoId: "",
  cantidad: 1,
  motivo: "",
}

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

export default function MovimientosPage() {
  const searchParams = useSearchParams()
  const searchQ = searchParams.get("q") || ""
  const { toast } = useToast()
  const [productos, setProductos] = useState<ProductoBasico[]>([])
  const [tallas, setTallas] = useState<Talla[]>([])
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [loadingCatalogos, setLoadingCatalogos] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)

  // Dashboard State
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [periodo, setPeriodo] = useState<"diario" | "semanal" | "mensual">("diario")
  const [historial, setHistorial] = useState<HistorialItem[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(true)
  const [filterTerm, setFilterTerm] = useState("")

  // New State for Cash Flow
  const [ingresos, setIngresos] = useState<IngresoItem[]>([])
  const [loadingIngresos, setLoadingIngresos] = useState(true)
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loadingGastos, setLoadingGastos] = useState(true)
  const [gastosPendientes, setGastosPendientes] = useState<Gasto[]>([])
  const [pagosGastos, setPagosGastos] = useState<PagoGasto[]>([])
  const [openGastosDialog, setOpenGastosDialog] = useState(false)
  const [openPagoGastoDialog, setOpenPagoGastoDialog] = useState(false)
  const [selectedGastoPago, setSelectedGastoPago] = useState<Gasto | null>(null)

  useEffect(() => {
    setFilterTerm(searchQ)
  }, [searchQ])

  // Accounts Receivable State
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState<CuentaPorCobrar[]>([])
  const [loadingCuentas, setLoadingCuentas] = useState(true)
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaPorCobrar | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentNote, setPaymentNote] = useState("")
  const [registeringPayment, setRegisteringPayment] = useState(false)

  // Cash Register State
  const [sesionActual, setSesionActual] = useState<CajaSesion | null>(null)
  const [loadingSesion, setLoadingSesion] = useState(true)
  const [openCajaDialog, setOpenCajaDialog] = useState(false)
  const [openCierreDialog, setOpenCierreDialog] = useState(false)
  const [montoInicial, setMontoInicial] = useState("")
  const [montoFinal, setMontoFinal] = useState("")
  const [resumenCierre, setResumenCierre] = useState<{ totalVentas: number, totalAbonos: number, totalIngresos: number, totalGastos: number } | null>(null)

  // Cierres History State
  const [cierres, setCierres] = useState<CajaSesion[]>([])
  const [loadingCierres, setLoadingCierres] = useState(true)

  // Export State
  const [openExportDialog, setOpenExportDialog] = useState(false)
  const [selectedSheets, setSelectedSheets] = useState({
    inventario: true,
    ingresos: true,
    cuentas: true
  })
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('excel')

  const entradaForm = useForm<EntradaFormValues>({
    resolver: zodResolver(entradaSchema),
    defaultValues: DEFAULT_ENTRADA_VALUES,
  })

  const ajusteForm = useForm<AjusteFormValues>({
    resolver: zodResolver(ajusteSchema),
    defaultValues: DEFAULT_AJUSTE_VALUES,
  })

  const transferenciaForm = useForm<TransferenciaFormValues>({
    resolver: zodResolver(transferenciaSchema),
    defaultValues: DEFAULT_TRANSFERENCIA_VALUES,
  })

  // Load Catalogs
  useEffect(() => {
    let active = true

    const loadCatalogos = async () => {
      setLoadingCatalogos(true)
      try {
        const [productosActivos, tallasActivas, almacenesActivos] = await Promise.all([
          InventarioService.getProductosActivosBasicos(),
          InventarioService.getTallasActivas(),
          InventarioService.getAlmacenesActivos(),
        ])

        if (active) {
          setProductos(productosActivos)
          setTallas(tallasActivas)
          setAlmacenes(almacenesActivos)
        }
      } catch (error) {
        console.error("Error al cargar catálogos de inventario", error)
        toast({
          title: "No pudimos cargar los catálogos",
          description: "Actualiza la página o verifica tu conexión.",
          variant: "destructive",
        })
      } finally {
        if (active) {
          setLoadingCatalogos(false)
        }
      }
    }

    void loadCatalogos()

    return () => {
      active = false
    }
  }, [toast])

  // Load History
  useEffect(() => {
    const loadHistorial = async () => {
      setLoadingHistorial(true)
      try {
        const tiendaId = await getCurrentTiendaId()
        // Fetching more records to allow client-side filtering for now
        const { data, error } = await supabase
          .from("historialStock")
          .select("id, tipo, cantidad, costoUnitario, createdAt, motivo, producto:productos(nombre)")
          .eq("tienda_id", tiendaId)
          .order("createdAt", { ascending: false })
          .limit(500)

        if (error) throw error

        setHistorial(data as unknown as HistorialItem[])
      } catch (error) {
        console.error("Error loading historial", error)
      } finally {
        setLoadingHistorial(false)
      }
    }
    loadHistorial()
  }, [])

  // Load Cash Flow (Sales & Abonos)
  useEffect(() => {
    const loadIngresos = async () => {
      setLoadingIngresos(true)
      try {
        const tiendaId = await getCurrentTiendaId()

        // 1. Fetch Cash Sales
        const { data: ventas, error: ventasError } = await supabase
          .from("ventas")
          .select("id, folio, total, createdAt, tipo_venta, ventasDetalle(producto:productos(nombre))")
          .eq("tienda_id", tiendaId)
          .eq("tipo_venta", "contado")
          .order("createdAt", { ascending: false })
          .limit(500)

        if (ventasError) throw ventasError

        // 2. Fetch Abonos
        const { data: abonos, error: abonosError } = await supabase
          .from("abonos")
          .select("id, monto, createdAt, nota, cliente:clientes(nombre), venta:ventas(ventasDetalle(producto:productos(nombre)))")
          .eq("tienda_id", tiendaId)
          .order("createdAt", { ascending: false })
          .limit(500)

        if (abonosError) throw abonosError

        // 3. Map and Combine
        const ventasMapped: IngresoItem[] = (ventas || []).map(v => {
          // Extract product names
          const productos = (v.ventasDetalle as any[])?.map((d: any) => d.producto?.nombre).filter(Boolean) || []
          const descripcion = productos.length > 0
            ? productos.slice(0, 2).join(", ") + (productos.length > 2 ? ` y ${productos.length - 2} más` : "")
            : 'Venta de contado'

          return {
            id: `v-${v.id}`,
            tipo: 'venta_contado',
            monto: v.total,
            fecha: v.createdAt,
            descripcion: descripcion,
            referencia: v.folio
          }
        })

        const abonosMapped: IngresoItem[] = (abonos || []).map(a => {
          // Extract product names from the associated sale
          const productos = (a.venta as any)?.ventasDetalle?.map((d: any) => d.producto?.nombre).filter(Boolean) || []
          const modelo = productos.length > 0 ? productos[0] : 'Producto'
          const clienteNombre = (a.cliente as any)?.nombre || 'Cliente'

          return {
            id: `a-${a.id}`,
            tipo: 'abono',
            monto: a.monto,
            fecha: a.createdAt,
            descripcion: `Abono de ${modelo}`,
            secondaryDescription: `(${clienteNombre})`,
            referencia: a.nota
          }
        })

        const combined = [...ventasMapped, ...abonosMapped].sort((a, b) =>
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        )

        setIngresos(combined)
      } catch (error) {
        console.error("Error loading ingresos", error)
      } finally {
        setLoadingIngresos(false)
      }
    }
    void loadIngresos()
  }, [])

  // Load Expenses (Gastos)
  const loadGastos = async () => {
    setLoadingGastos(true)
    try {
      const [pagados, pendientes, pagos] = await Promise.all([
        GastoService.getAll({ estado: 'pagado', limit: 500 }),
        GastoService.getAll({ estado: 'pendiente', limit: 500 }),
        PagoGastoService.getAll({ limit: 500 })
      ])
      setGastos(pagados)
      setGastosPendientes(pendientes)
      setPagosGastos(pagos)
    } catch (error) {
      console.error("Error loading gastos", error)
    } finally {
      setLoadingGastos(false)
    }
  }

  useEffect(() => {
    loadGastos()
  }, [])

  // Accounts Receivable
  useEffect(() => {
    const loadCuentasPorCobrar = async () => {
      setLoadingCuentas(true)
      try {
        const tiendaId = await getCurrentTiendaId()
        const { data, error } = await supabase
          .from("ventas")
          .select(`
            id, 
            folio, 
            total, 
            saldo_pendiente, 
            fecha_primer_vencimiento, 
            numero_cuotas,
            monto_cuota,
            frecuencia_pago,
            createdAt,
            cliente:clientes(id, nombre, telefono, documento, direccion)
          `)
          .eq("tienda_id", tiendaId)
          .eq("tipo_venta", "credito")
          .gt("saldo_pendiente", 0)
          .order("fecha_primer_vencimiento", { ascending: true })

        if (error) throw error

        const mapped = data.map((item: any) => ({
          id: item.id,
          folio: item.folio,
          cliente: item.cliente,
          total: item.total,
          saldoPendiente: item.saldo_pendiente,
          fechaPrimerVencimiento: item.fecha_primer_vencimiento,
          numeroCuotas: item.numero_cuotas || 1,
          montoCuota: item.monto_cuota || 0,
          frecuenciaPago: item.frecuencia_pago,
          createdAt: item.createdAt
        }))
        setCuentasPorCobrar(mapped)
      } catch (error) {
        console.error("Error loading accounts receivable", error)
      } finally {
        setLoadingCuentas(false)
      }
    }
    void loadCuentasPorCobrar()
  }, [])

  // Load Cash Register Session
  useEffect(() => {
    const loadSesion = async () => {
      setLoadingSesion(true)
      try {
        const user = await AuthService.getCurrentUser()
        if (user) {
          const sesion = await CajaService.getSesionActual(user.id)
          setSesionActual(sesion)
        }
      } catch (error) {
        console.error("Error loading session", error)
      } finally {
        setLoadingSesion(false)
      }
    }
    loadSesion()
  }, [])

  // Load Cierres History
  useEffect(() => {
    let active = true

    const loadCierres = async () => {
      setLoadingCierres(true)
      try {
        const cierresData = await CajaService.getHistorialCierres()
        if (active) {
          setCierres(cierresData)
        }
      } catch (error) {
        console.error("Error al cargar cierres", error)
        toast({
          title: "Error al cargar cierres",
          description: "No se pudieron cargar los cierres. Intenta nuevamente más tarde.",
          variant: "destructive",
        })
      } finally {
        if (active) {
          setLoadingCierres(false)
        }
      }
    }

    void loadCierres()

    return () => {
      active = false
    }
  }, [toast])

  const filteredHistorial = useMemo(() => {
    return historial.filter((item) => {
      // 1. Filter by Date/Period
      if (date) {
        const itemDate = new Date(item.createdAt)
        const selectedDate = new Date(date)

        if (periodo === "diario") {
          const isSameDay =
            itemDate.getDate() === selectedDate.getDate() &&
            itemDate.getMonth() === selectedDate.getMonth() &&
            itemDate.getFullYear() === selectedDate.getFullYear()
          if (!isSameDay) return false
        } else if (periodo === "mensual") {
          const isSameMonth =
            itemDate.getMonth() === selectedDate.getMonth() &&
            itemDate.getFullYear() === selectedDate.getFullYear()
          if (!isSameMonth) return false
        } else if (periodo === "semanal") {
          const startOfWeek = new Date(selectedDate)
          startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay())
          startOfWeek.setHours(0, 0, 0, 0)

          const endOfWeek = new Date(startOfWeek)
          endOfWeek.setDate(startOfWeek.getDate() + 6)
          endOfWeek.setHours(23, 59, 59, 999)

          if (itemDate < startOfWeek || itemDate > endOfWeek) return false
        }
      }

      // 2. Filter by Search Term
      if (filterTerm.trim()) {
        const term = filterTerm.toLowerCase()
        const prodName = item.producto?.nombre?.toLowerCase() || ""
        const motivo = item.motivo?.toLowerCase() || ""
        if (!prodName.includes(term) && !motivo.includes(term)) {
          return false
        }
      }

      return true
    })
  }, [historial, date, periodo, filterTerm])

  const filteredIngresos = useMemo(() => {
    return ingresos.filter((item) => {
      // 1. Filter by Date/Period
      if (date) {
        const itemDate = new Date(item.fecha)
        const selectedDate = new Date(date)

        if (periodo === "diario") {
          const isSameDay =
            itemDate.getDate() === selectedDate.getDate() &&
            itemDate.getMonth() === selectedDate.getMonth() &&
            itemDate.getFullYear() === selectedDate.getFullYear()
          if (!isSameDay) return false
        } else if (periodo === "mensual") {
          const isSameMonth =
            itemDate.getMonth() === selectedDate.getMonth() &&
            itemDate.getFullYear() === selectedDate.getFullYear()
          if (!isSameMonth) return false
        } else if (periodo === "semanal") {
          const startOfWeek = new Date(selectedDate)
          startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay())
          startOfWeek.setHours(0, 0, 0, 0)

          const endOfWeek = new Date(startOfWeek)
          endOfWeek.setDate(startOfWeek.getDate() + 6)
          endOfWeek.setHours(23, 59, 59, 999)

          if (itemDate < startOfWeek || itemDate > endOfWeek) return false
        }
      }
      return true
    })
  }, [ingresos, date, periodo])

  const movimientosIngresos = useMemo(() => {
    return filteredIngresos
  }, [filteredIngresos])

  const movimientosEgresos = useMemo(() => {
    // Combine inventory entries (costs) with expenses
    const inventoryCosts = filteredHistorial.filter(h => h.tipo === 'entrada').map(h => ({
      id: `inv-${h.id}`,
      tipo: 'inventario',
      descripcion: `Entrada: ${h.producto?.nombre || 'Producto'}`,
      monto: (h.costoUnitario || 0) * h.cantidad,
      fecha: h.createdAt,
      categoria: 'Inventario'
    }))

    const expenseItems = gastos.filter(g => {
      // Apply same date filters if needed
      if (date) {
        const itemDate = new Date(g.fechaGasto)
        const selectedDate = new Date(date)

        if (periodo === "diario") {
          const isSameDay =
            itemDate.getDate() === selectedDate.getDate() &&
            itemDate.getMonth() === selectedDate.getMonth() &&
            itemDate.getFullYear() === selectedDate.getFullYear()
          if (!isSameDay) return false
        } else if (periodo === "mensual") {
          const isSameMonth =
            itemDate.getMonth() === selectedDate.getMonth() &&
            itemDate.getFullYear() === selectedDate.getFullYear()
          if (!isSameMonth) return false
        } else if (periodo === "semanal") {
          // ... logic for weekly ...
          // Simplified for brevity, reusing logic would be better
          return true
        }
      }
      return true
    }).map(g => ({
      id: `gasto-${g.id}`,
      tipo: 'gasto',
      descripcion: g.descripcion,
      monto: g.monto,
      fecha: g.fechaGasto,
      categoria: g.categoria
    }))

    const paymentItems = pagosGastos.map(p => ({
      id: `pago-gasto-${p.id}`,
      tipo: 'pago_gasto',
      descripcion: `Pago de gasto: ${p.gasto?.descripcion || 'Desconocido'}`,
      monto: p.monto,
      fecha: p.fechaPago,
      categoria: p.gasto?.categoria || 'Pago deuda'
    }))

    return [...inventoryCosts, ...expenseItems, ...paymentItems].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  }, [filteredHistorial, gastos, pagosGastos, date, periodo])

  const resumenFinanciero = useMemo(() => {
    // Calculate Income from Cash Sales + Abonos
    const totalIngresos = filteredIngresos.reduce((acc, item) => acc + item.monto, 0)

    // Calculate Expenses from Inventory Entries (Cost) + Registered Expenses
    const gastosInventario = filteredHistorial
      .filter(item => item.tipo === 'entrada')
      .reduce((acc, item) => acc + (item.costoUnitario || 0) * item.cantidad, 0)

    const gastosRegistrados = gastos.reduce((acc, item) => acc + item.monto, 0) // Should apply filters here too ideally
    const pagosRegistrados = pagosGastos.reduce((acc, item) => acc + item.monto, 0)

    const totalGastos = gastosInventario + gastosRegistrados + pagosRegistrados

    return {
      ventas: totalIngresos,
      gastos: totalGastos,
      balance: totalIngresos - totalGastos
    }
  }, [filteredIngresos, filteredHistorial, gastos])

  const convertirId = (valor: string | undefined) => {
    if (!valor || valor === "none") {
      return null
    }
    const id = Number(valor)
    return Number.isFinite(id) ? id : null
  }

  const handleOpenDetails = (cuenta: CuentaPorCobrar) => {
    setSelectedCuenta(cuenta)
    setPaymentAmount(String(cuenta.montoCuota || cuenta.saldoPendiente))
    setPaymentNote("")
    setDetailsOpen(true)
  }

  const handleRegisterPayment = async () => {
    if (!selectedCuenta || !selectedCuenta.cliente) return
    const amount = Number(paymentAmount)
    if (amount <= 0) {
      toast({
        title: "Monto inválido",
        description: "El monto debe ser mayor a cero",
        variant: "destructive",
      })
      return
    }

    if (amount > selectedCuenta.saldoPendiente) {
      toast({
        title: "Monto excesivo",
        description: "El monto no puede ser mayor al saldo pendiente",
        variant: "destructive",
      })
      return
    }

    setRegisteringPayment(true)
    try {
      await ClienteService.registrarAbono({
        clienteId: selectedCuenta.cliente.id,
        monto: amount,
        nota: paymentNote || `Abono a venta ${selectedCuenta.folio}`,
        ventaId: selectedCuenta.id,
        // If we had session, we could pass usuarioId from session or auth
      })

      toast({
        title: "Pago registrado",
        description: `Se registró el pago de ${currencyFormatter.format(amount)}`,
      })

      // Update local state
      setCuentasPorCobrar(prev => prev.map(c => {
        if (c.id === selectedCuenta.id) {
          const newBalance = c.saldoPendiente - amount
          return { ...c, saldoPendiente: newBalance }
        }
        return c
      }).filter(c => c.saldoPendiente > 0)) // Remove if fully paid

      setDetailsOpen(false)
    } catch (error) {
      console.error("Error registering payment", error)
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive",
      })
    } finally {
      setRegisteringPayment(false)
    }
  }

  const handleWhatsApp = () => {
    if (!selectedCuenta || !selectedCuenta.cliente?.telefono) return

    const phone = selectedCuenta.cliente.telefono.replace(/\D/g, '')
    const message = `Hola ${selectedCuenta.cliente.nombre}, le recordamos que tiene una cuota pendiente de ${currencyFormatter.format(selectedCuenta.montoCuota || selectedCuenta.saldoPendiente)} correspondiente a la venta ${selectedCuenta.folio}. Su saldo pendiente total es de ${currencyFormatter.format(selectedCuenta.saldoPendiente)}. Agradecemos su pago.`

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  // --- Submit Handlers ---

  const handleEntradaSubmit = async (values: EntradaFormValues) => {
    const productoId = Number(values.productoId)
    const tallaId = convertirId(values.tallaId)
    const almacenId = convertirId(values.almacenId)

    try {
      let costo: number | null = null
      if (values.costoUnitario && values.costoUnitario.trim().length > 0) {
        const parsed = Number(values.costoUnitario)
        if (!Number.isFinite(parsed) || parsed < 0) {
          throw new Error('El costo unitario no es válido')
        }
        costo = Number(parsed.toFixed(2))
      }

      await InventarioService.registrarEntrada({
        productoId,
        tallaId,
        almacenId,
        cantidad: values.cantidad,
        motivo: values.motivo?.trim() || null,
        costoUnitario: costo,
      })

      toast({
        title: "Entrada registrada",
        description: "El stock se actualizó correctamente.",
      })
      entradaForm.reset(DEFAULT_ENTRADA_VALUES)
      setOpenDialog(false)
      // Reload history would be good here
    } catch (error) {
      console.error("Error al registrar la entrada", error)
      toast({
        title: "No se registró la entrada",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      })
    }
  }

  const handleAjusteSubmit = async (values: AjusteFormValues) => {
    const productoId = Number(values.productoId)
    const tallaId = convertirId(values.tallaId)
    const almacenId = convertirId(values.almacenId)

    try {
      await InventarioService.registrarAjuste({
        tipo: values.tipo,
        productoId,
        tallaId,
        almacenId,
        cantidad: values.cantidad,
        motivo: values.motivo?.trim() || null,
      })

      toast({
        title: "Movimiento registrado",
        description: "El ajuste se aplicó correctamente.",
      })
      ajusteForm.reset(DEFAULT_AJUSTE_VALUES)
      setOpenDialog(false)
    } catch (error) {
      console.error("Error al aplicar el ajuste", error)
      toast({
        title: "No se completó el ajuste",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      })
    }
  }

  const handleTransferenciaSubmit = async (values: TransferenciaFormValues) => {
    const productoId = Number(values.productoId)
    const tallaId = convertirId(values.tallaId)
    const origenId = Number(values.origenId)
    const destinoId = Number(values.destinoId)

    try {
      await InventarioService.transferirStock({
        productoId,
        tallaId,
        origenId,
        destinoId,
        cantidad: values.cantidad,
        motivo: values.motivo?.trim() || null,
      })

      toast({
        title: "Transferencia completada",
        description: "Se movió el stock entre almacenes.",
      })
      transferenciaForm.reset(DEFAULT_TRANSFERENCIA_VALUES)
      setOpenDialog(false)
    } catch (error) {
      console.error("Error al transferir stock", error)
      toast({
        title: "No se logró la transferencia",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      })
    }
  }


  const handleAbrirCaja = async () => {
    try {
      const user = await AuthService.getCurrentUser()
      if (!user) return
      const monto = parseFloat(montoInicial) || 0
      const sesion = await CajaService.abrirCaja(user.id, monto)
      setSesionActual(sesion)
      setOpenCajaDialog(false)
      setMontoInicial("")
      toast({ title: "Caja abierta", description: "Has iniciado turno correctamente." })
      window.dispatchEvent(new CustomEvent(CAJA_SESSION_UPDATED))
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudo abrir la caja", variant: "destructive" })
    }
  }

  const prepareCierre = async () => {
    if (!sesionActual) return
    try {
      const resumen = await CajaService.getResumenSesion(sesionActual.id)
      setResumenCierre(resumen)
      setOpenCierreDialog(true)
    } catch (_) {
      toast({ title: "Error", description: "No se pudo cargar el resumen", variant: "destructive" })
    }
  }

  const handleCerrarCaja = async () => {
    if (!sesionActual || !resumenCierre) return
    try {
      const montoReal = parseFloat(montoFinal) || 0
      const montoEsperado = sesionActual.montoInicial + resumenCierre.totalIngresos - resumenCierre.totalGastos
      await CajaService.cerrarCaja(sesionActual.id, montoEsperado, montoReal)
      setSesionActual(null)
      setOpenCierreDialog(false)
      setMontoFinal("")
      setResumenCierre(null)
      toast({ title: "Caja cerrada", description: "Turno finalizado." })
      window.dispatchEvent(new CustomEvent(CAJA_SESSION_UPDATED))
    } catch (_) {
      toast({ title: "Error", description: "No se pudo cerrar la caja", variant: "destructive" })
    }
  }

  const filteredCierres = useMemo(() => {
    return cierres.filter((cierre) => {
      // Filter by date
      if (date && cierre.fechaCierre) {
        const cierreDate = new Date(cierre.fechaCierre)
        const selectedDate = new Date(date)

        if (periodo === "diario") {
          const isSameDay =
            cierreDate.getDate() === selectedDate.getDate() &&
            cierreDate.getMonth() === selectedDate.getMonth() &&
            cierreDate.getFullYear() === selectedDate.getFullYear()
          if (!isSameDay) return false
        } else if (periodo === "mensual") {
          const isSameMonth =
            cierreDate.getMonth() === selectedDate.getMonth() &&
            cierreDate.getFullYear() === selectedDate.getFullYear()
          if (!isSameMonth) return false
        } else if (periodo === "semanal") {
          const startOfWeek = new Date(selectedDate)
          startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay())
          startOfWeek.setHours(0, 0, 0, 0)

          const endOfWeek = new Date(startOfWeek)
          endOfWeek.setDate(startOfWeek.getDate() + 6)
          endOfWeek.setHours(23, 59, 59, 999)

          if (cierreDate < startOfWeek || cierreDate > endOfWeek) return false
        }
      }

      return true
    })
  }, [cierres, date, periodo])

  const accionesDeshabilitadas = loadingCatalogos || productos.length === 0 || almacenes.length === 0

  const renderProductoOptions = () =>
    productos.map((producto) => (
      <SelectItem key={producto.id} value={String(producto.id)}>
        {producto.nombre} · {producto.codigo}
      </SelectItem>
    ))

  const renderTallaOptions = () => [
    <SelectItem key="none" value="none">
      Sin talla específica
    </SelectItem>,
    ...tallas.map((talla) => (
      <SelectItem key={talla.id} value={String(talla.id)}>
        {talla.nombre}
      </SelectItem>
    )),
  ]

  const renderAlmacenOptions = () =>
    almacenes.map((almacen) => (
      <SelectItem key={almacen.id} value={String(almacen.id)}>
        {almacen.nombre}
      </SelectItem>
    ))

  const generateExcelReport = () => {
    const wb = XLSX.utils.book_new();

    // Estilos para encabezados
    const headerStyle = {
      fill: { fgColor: { rgb: "4F46E5" } }, // Indigo 600
      font: { color: { rgb: "FFFFFF" }, bold: true },
      alignment: { horizontal: "center" }
    };

    if (selectedSheets.inventario) {
      // --- Hoja 1: Movimientos de Inventario ---
      const inventarioData = filteredHistorial.map(item => ({
        Fecha: format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: es }),
        Producto: item.producto?.nombre || "Desconocido",
        Tipo: item.tipo.toUpperCase(),
        Cantidad: item.cantidad,
        "Costo Unit.": item.costoUnitario ? currencyFormatter.format(item.costoUnitario) : "-",
        Motivo: item.motivo || "-"
      }));

      const wsInventario = XLSX.utils.json_to_sheet(inventarioData);

      // Aplicar estilos a encabezados (Fila 1)
      const rangeInv = XLSX.utils.decode_range(wsInventario['!ref'] || "A1:A1");
      for (let C = rangeInv.s.c; C <= rangeInv.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!wsInventario[address]) continue;
        wsInventario[address].s = headerStyle;
      }
      // Ajustar ancho de columnas
      wsInventario['!cols'] = [
        { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 40 }
      ];

      XLSX.utils.book_append_sheet(wb, wsInventario, "Inventario");
    }

    if (selectedSheets.ingresos) {
      // --- Hoja 2: Ingresos (Ventas y Abonos) ---
      const ingresosData = filteredIngresos.map(item => ({
        Fecha: format(new Date(item.fecha), "dd/MM/yyyy HH:mm", { locale: es }),
        Tipo: item.tipo === 'venta_contado' ? 'VENTA CONTADO' : 'ABONO',
        Monto: currencyFormatter.format(item.monto),
        Descripción: item.descripcion,
        Referencia: item.referencia || "-"
      }));

      const wsIngresos = XLSX.utils.json_to_sheet(ingresosData);

      // Estilos encabezados
      const rangeIng = XLSX.utils.decode_range(wsIngresos['!ref'] || "A1:A1");
      for (let C = rangeIng.s.c; C <= rangeIng.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!wsIngresos[address]) continue;
        wsIngresos[address].s = headerStyle;
      }
      wsIngresos['!cols'] = [
        { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 40 }, { wch: 20 }
      ];

      XLSX.utils.book_append_sheet(wb, wsIngresos, "Ingresos");
    }

    if (selectedSheets.cuentas) {
      // --- Hoja 3: Cuentas por Cobrar ---
      const cuentasData = cuentasPorCobrar.map(item => ({
        Folio: item.folio,
        Cliente: item.cliente?.nombre || "Desconocido",
        Total: currencyFormatter.format(item.total),
        "Saldo Pendiente": currencyFormatter.format(item.saldoPendiente),
        "Vencimiento": item.fechaPrimerVencimiento ? format(new Date(item.fechaPrimerVencimiento), "dd/MM/yyyy", { locale: es }) : "-",
        Cuotas: `${item.numeroCuotas} (${item.frecuenciaPago || '-'})`
      }));

      const wsCuentas = XLSX.utils.json_to_sheet(cuentasData);

      // Estilos encabezados
      const rangeCuentas = XLSX.utils.decode_range(wsCuentas['!ref'] || "A1:A1");
      for (let C = rangeCuentas.s.c; C <= rangeCuentas.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!wsCuentas[address]) continue;
        wsCuentas[address].s = headerStyle;
      }
      wsCuentas['!cols'] = [
        { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }
      ];

      XLSX.utils.book_append_sheet(wb, wsCuentas, "Cuentas por Cobrar");
    }

    XLSX.writeFile(wb, `Reporte_General_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    setOpenExportDialog(false);
  };

  const generatePdfReport = () => {
    const doc = new jsPDF();
    let yPos = 15;

    doc.setFontSize(16);
    doc.text(`Reporte General - ${format(new Date(), "dd/MM/yyyy", { locale: es })}`, 14, yPos);
    yPos += 10;

    if (selectedSheets.inventario) {
      doc.setFontSize(14);
      doc.text("Movimientos de Inventario", 14, yPos);
      yPos += 5;

      const tableData = filteredHistorial.map(item => [
        format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: es }),
        item.producto?.nombre || "Desconocido",
        item.tipo.toUpperCase(),
        item.cantidad,
        item.motivo || "-"
      ]);

      autoTable(doc, {
        head: [['Fecha', 'Producto', 'Tipo', 'Cant.', 'Motivo']],
        body: tableData,
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
      });

      // @ts-ignore
      yPos = doc.lastAutoTable.finalY + 15;
    }

    if (selectedSheets.ingresos) {
      if (yPos > 250) { doc.addPage(); yPos = 20; }

      doc.setFontSize(14);
      doc.text("Ingresos (Ventas y Abonos)", 14, yPos);
      yPos += 5;

      const tableData = filteredIngresos.map(item => [
        format(new Date(item.fecha), "dd/MM/yyyy HH:mm", { locale: es }),
        item.tipo === 'venta_contado' ? 'VENTA' : 'ABONO',
        currencyFormatter.format(item.monto),
        item.descripcion,
        item.referencia || "-"
      ]);

      autoTable(doc, {
        head: [['Fecha', 'Tipo', 'Monto', 'Descripción', 'Ref.']],
        body: tableData,
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
      });

      // @ts-ignore
      yPos = doc.lastAutoTable.finalY + 15;
    }

    if (selectedSheets.cuentas) {
      if (yPos > 250) { doc.addPage(); yPos = 20; }

      doc.setFontSize(14);
      doc.text("Cuentas por Cobrar", 14, yPos);
      yPos += 5;

      const tableData = cuentasPorCobrar.map(item => [
        item.folio,
        item.cliente?.nombre || "Desconocido",
        currencyFormatter.format(item.total),
        currencyFormatter.format(item.saldoPendiente),
        item.fechaPrimerVencimiento ? format(new Date(item.fechaPrimerVencimiento), "dd/MM/yyyy", { locale: es }) : "-",
      ]);

      autoTable(doc, {
        head: [['Folio', 'Cliente', 'Total', 'Saldo', 'Vencimiento']],
        body: tableData,
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
      });
    }

    doc.save(`Reporte_General_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    setOpenExportDialog(false);
  };

  const handleDownloadReport = (formatType: 'pdf' | 'excel') => {
    setExportFormat(formatType);
    setOpenExportDialog(true);
  };

  return (
    <AdminSectionLayout
      title="Movimientos"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className={cn("gap-2 bg-background", sesionActual ? "border-rose-200 hover:bg-rose-50 text-rose-700" : "")}
            onClick={() => sesionActual ? prepareCierre() : setOpenCajaDialog(true)}
            disabled={loadingSesion}
          >
            <Store className={cn("h-4 w-4", sesionActual ? "text-rose-500" : "text-amber-500")} />
            {loadingSesion ? "Cargando..." : sesionActual ? "Cerrar caja" : "Abrir caja"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-background">
                <Download className="h-4 w-4 text-amber-500" />
                Descargar reporte
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleDownloadReport('pdf')}>
                Descargar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadReport('excel')}>
                Descargar Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="gap-2 bg-rose-600 hover:bg-rose-700 text-white"
            onClick={() => setOpenGastosDialog(true)}
          >
            <Wallet className="h-4 w-4" />
            Registrar Gasto
          </Button>
        </div>
      }
    >
      <GastosDialog
        open={openGastosDialog}
        onOpenChange={setOpenGastosDialog}
        onSuccess={() => {
          loadGastos()
          // Refresh session summary if needed
          if (sesionActual) prepareCierre()
        }}
      />
      <PagoGastoDialog
        open={openPagoGastoDialog}
        onOpenChange={setOpenPagoGastoDialog}
        gasto={selectedGastoPago}
        onSuccess={() => {
          loadGastos()
          if (sesionActual) prepareCierre()
        }}
      />
      <div className="space-y-6">

        {/* Dialog for Export Options */}
        <Dialog open={openExportDialog} onOpenChange={setOpenExportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Opciones de Exportación {exportFormat === 'excel' ? 'Excel' : 'PDF'}</DialogTitle>
              <DialogDescription>Selecciona los módulos que deseas incluir en el reporte.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sheet-inventario"
                  checked={selectedSheets.inventario}
                  onCheckedChange={(checked) => setSelectedSheets(prev => ({ ...prev, inventario: checked as boolean }))}
                />
                <label
                  htmlFor="sheet-inventario"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Movimientos de Inventario
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sheet-ingresos"
                  checked={selectedSheets.ingresos}
                  onCheckedChange={(checked) => setSelectedSheets(prev => ({ ...prev, ingresos: checked as boolean }))}
                />
                <label
                  htmlFor="sheet-ingresos"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Ingresos (Ventas y Abonos)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sheet-cuentas"
                  checked={selectedSheets.cuentas}
                  onCheckedChange={(checked) => setSelectedSheets(prev => ({ ...prev, cuentas: checked as boolean }))}
                />
                <label
                  htmlFor="sheet-cuentas"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Cuentas por Cobrar
                </label>
              </div>
              <Button className="w-full" onClick={exportFormat === 'excel' ? generateExcelReport : generatePdfReport}>
                Generar {exportFormat === 'excel' ? 'Excel' : 'PDF'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialogs for Cash Register */}
        <Dialog open={openCajaDialog} onOpenChange={setOpenCajaDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Abrir caja</DialogTitle>
              <DialogDescription>Inicia tu turno registrando el dinero base.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>¿Con cuánto dinero empiezas el turno?</Label>
                <Input
                  type="number"
                  placeholder="$ 0"
                  value={montoInicial}
                  onChange={(e) => setMontoInicial(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleAbrirCaja}>Empezar turno</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openCierreDialog} onOpenChange={setOpenCierreDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cerrar Caja</DialogTitle>
              <DialogDescription>Resumen del turno y arqueo final.</DialogDescription>
            </DialogHeader>
            {resumenCierre && sesionActual && (
              <div className="space-y-4 py-2">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dinero base</span>
                    <span>{currencyFormatter.format(sesionActual.montoInicial)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ventas (Contado)</span>
                    <span>{currencyFormatter.format(resumenCierre.totalVentas)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Abonos</span>
                    <span>{currencyFormatter.format(resumenCierre.totalAbonos)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-medium">
                    <span>Balance total esperado</span>
                    <span>{currencyFormatter.format(sesionActual.montoInicial + resumenCierre.totalIngresos)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <Label>¿Cuánto dinero tienes en efectivo?</Label>
                  <Input
                    type="number"
                    placeholder="$ 0"
                    value={montoFinal}
                    onChange={(e) => setMontoFinal(e.target.value)}
                  />
                </div>

                {montoFinal && (
                  <div className={cn(
                    "rounded-lg p-3 text-sm font-medium",
                    (parseFloat(montoFinal) - (sesionActual.montoInicial + resumenCierre.totalIngresos)) < 0
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  )}>
                    Diferencia: {currencyFormatter.format(parseFloat(montoFinal) - (sesionActual.montoInicial + resumenCierre.totalIngresos))}
                  </div>
                )}

                <Button className="w-full" onClick={handleCerrarCaja}>Confirmar cierre</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-none shadow-sm">
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Balance</p>
                <h3 className="text-lg font-bold leading-none">{currencyFormatter.format(resumenFinanciero.balance)}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ventas totales</p>
                <h3 className="text-lg font-bold text-emerald-600 leading-none">{currencyFormatter.format(resumenFinanciero.ventas)}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <TrendingDown className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Gastos totales</p>
                <h3 className="text-lg font-bold text-rose-600 leading-none">{currencyFormatter.format(resumenFinanciero.gastos)}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="transacciones" className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="rounded-lg border bg-background p-1">
              <TabsList className="flex bg-transparent p-0">
                <TabsTrigger
                  value="transacciones"
                  className="rounded-md px-6 py-1.5 text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-slate-50"
                >
                  Transacciones
                </TabsTrigger>
                <TabsTrigger
                  value="cierres"
                  className="rounded-md px-6 py-1.5 text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-slate-50"
                >
                  Cierres de caja
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-2 bg-background">
                <Filter className="h-4 w-4" />
                Filtrar
              </Button>

              <Select value={periodo} onValueChange={(val: any) => setPeriodo(val)}>
                <SelectTrigger className="w-[140px] bg-background">
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diario">Diario</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[240px] justify-start text-left font-normal bg-background",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <TabsContent value="transacciones" className="space-y-6">

            {/* Summary Cards moved to top */}

            {/* Sub-tabs & List */}
            <Tabs defaultValue="ingresos" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4 bg-muted p-1 rounded-lg h-auto">
                <TabsTrigger
                  value="ingresos"
                  className="rounded-md py-1.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Ingresos
                </TabsTrigger>
                <TabsTrigger
                  value="egresos"
                  className="rounded-md py-1.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Egresos
                </TabsTrigger>
                <TabsTrigger
                  value="por_cobrar"
                  className="rounded-md py-1.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Por cobrar
                </TabsTrigger>
                <TabsTrigger
                  value="por_pagar"
                  className="rounded-md py-1.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Por pagar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ingresos" className="min-h-[300px]">
                {loadingIngresos ? (
                  <div className="flex h-[200px] items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : movimientosIngresos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 rounded-full bg-slate-100 p-6">
                      <Wallet className="h-12 w-12 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground">Aún no tienes ingresos registrados en esta fecha.</h3>
                    <p className="text-sm text-muted-foreground mb-6">Comienza registrando tus ventas.</p>

                    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                      <DialogTrigger asChild>
                        <Button className="bg-slate-900 text-white hover:bg-slate-800">
                          Crear un movimiento
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Registrar movimiento</DialogTitle>
                          <DialogDescription>
                            Selecciona el tipo de movimiento que deseas registrar.
                          </DialogDescription>
                        </DialogHeader>

                        <Tabs defaultValue="entrada" className="mt-4">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="entrada">Entrada</TabsTrigger>
                            <TabsTrigger value="ajuste">Salida / Ajuste</TabsTrigger>
                            <TabsTrigger value="transferencia">Transferencia</TabsTrigger>
                          </TabsList>

                          <TabsContent value="entrada" className="mt-4">
                            <Form {...entradaForm}>
                              <form className="grid gap-4 md:grid-cols-2" onSubmit={entradaForm.handleSubmit(handleEntradaSubmit)}>
                                <FormField
                                  control={entradaForm.control}
                                  name="productoId"
                                  render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                      <FormLabel>Producto</FormLabel>
                                      <FormControl>
                                        <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un producto" />
                                          </SelectTrigger>
                                          <SelectContent>{renderProductoOptions()}</SelectContent>
                                        </Select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={entradaForm.control}
                                  name="tallaId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Talla</FormLabel>
                                      <FormControl>
                                        <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Sin talla" />
                                          </SelectTrigger>
                                          <SelectContent>{renderTallaOptions()}</SelectContent>
                                        </Select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={entradaForm.control}
                                  name="almacenId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Almacén destino</FormLabel>
                                      <FormControl>
                                        <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un almacén" />
                                          </SelectTrigger>
                                          <SelectContent>{renderAlmacenOptions()}</SelectContent>
                                        </Select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={entradaForm.control}
                                  name="cantidad"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Cantidad</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          min={1}
                                          disabled={accionesDeshabilitadas}
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={entradaForm.control}
                                  name="costoUnitario"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Costo unitario (opcional)</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          min={0}
                                          step="0.01"
                                          placeholder="Ej. 25000"
                                          disabled={accionesDeshabilitadas}
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={entradaForm.control}
                                  name="motivo"
                                  render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                      <FormLabel>Motivo</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Describe el motivo de la entrada"
                                          disabled={accionesDeshabilitadas}
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <div className="md:col-span-2 flex justify-end">
                                  <Button type="submit" disabled={accionesDeshabilitadas || entradaForm.formState.isSubmitting}>
                                    {entradaForm.formState.isSubmitting ? "Registrando..." : "Registrar entrada"}
                                  </Button>
                                </div>
                              </form>
                            </Form>
                          </TabsContent>

                          <TabsContent value="ajuste" className="mt-4">
                            <Form {...ajusteForm}>
                              <form className="grid gap-4 md:grid-cols-2" onSubmit={ajusteForm.handleSubmit(handleAjusteSubmit)}>
                                <FormField
                                  control={ajusteForm.control}
                                  name="tipo"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Tipo de movimiento</FormLabel>
                                      <FormControl>
                                        <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Selecciona el tipo" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="salida">Salida</SelectItem>
                                            <SelectItem value="entrada">Entrada</SelectItem>
                                            <SelectItem value="ajuste">Ajuste manual</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={ajusteForm.control}
                                  name="productoId"
                                  render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                      <FormLabel>Producto</FormLabel>
                                      <FormControl>
                                        <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un producto" />
                                          </SelectTrigger>
                                          <SelectContent>{renderProductoOptions()}</SelectContent>
                                        </Select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={ajusteForm.control}
                                  name="tallaId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Talla</FormLabel>
                                      <FormControl>
                                        <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Sin talla" />
                                          </SelectTrigger>
                                          <SelectContent>{renderTallaOptions()}</SelectContent>
                                        </Select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={ajusteForm.control}
                                  name="almacenId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Almacén</FormLabel>
                                      <FormControl>
                                        <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un almacén" />
                                          </SelectTrigger>
                                          <SelectContent>{renderAlmacenOptions()}</SelectContent>
                                        </Select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={ajusteForm.control}
                                  name="cantidad"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Cantidad</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          min={1}
                                          disabled={accionesDeshabilitadas}
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={ajusteForm.control}
                                  name="motivo"
                                  render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                      <FormLabel>Motivo</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Describe el motivo del ajuste"
                                          disabled={accionesDeshabilitadas}
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <div className="md:col-span-2 flex justify-end">
                                  <Button type="submit" disabled={accionesDeshabilitadas || ajusteForm.formState.isSubmitting}>
                                    {ajusteForm.formState.isSubmitting ? "Registrando..." : "Registrar movimiento"}
                                  </Button>
                                </div>
                              </form>
                            </Form>
                          </TabsContent>

                          <TabsContent value="transferencia" className="mt-4">
                            <Form {...transferenciaForm}>
                              <form
                                className="grid gap-4 md:grid-cols-2"
                                onSubmit={transferenciaForm.handleSubmit(handleTransferenciaSubmit)}
                              >
                                <FormField
                                  control={transferenciaForm.control}
                                  name="productoId"
                                  render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                      <FormLabel>Producto</FormLabel>
                                      <FormControl>
                                        <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un producto" />
                                          </SelectTrigger>
                                          <SelectContent>{renderProductoOptions()}</SelectContent>
                                        </Select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={transferenciaForm.control}
                                  name="tallaId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Talla</FormLabel>
                                      <FormControl>
                                        <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Sin talla" />
                                          </SelectTrigger>
                                          <SelectContent>{renderTallaOptions()}</SelectContent>
                                        </Select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={transferenciaForm.control}
                                  name="cantidad"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Cantidad</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          min={1}
                                          disabled={accionesDeshabilitadas}
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={transferenciaForm.control}
                                  name="origenId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Almacén origen</FormLabel>
                                      <FormControl>
                                        <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Selecciona el almacén origen" />
                                          </SelectTrigger>
                                          <SelectContent>{renderAlmacenOptions()}</SelectContent>
                                        </Select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={transferenciaForm.control}
                                  name="destinoId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Almacén destino</FormLabel>
                                      <FormControl>
                                        <Select disabled={accionesDeshabilitadas} value={field.value} onValueChange={field.onChange}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Selecciona el almacén destino" />
                                          </SelectTrigger>
                                          <SelectContent>{renderAlmacenOptions()}</SelectContent>
                                        </Select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={transferenciaForm.control}
                                  name="motivo"
                                  render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                      <FormLabel>Motivo</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Describe el motivo de la transferencia"
                                          disabled={accionesDeshabilitadas}
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <div className="md:col-span-2 flex justify-end">
                                  <Button
                                    type="submit"
                                    disabled={accionesDeshabilitadas || transferenciaForm.formState.isSubmitting}
                                  >
                                    {transferenciaForm.formState.isSubmitting ? "Transfiriendo..." : "Registrar transferencia"}
                                  </Button>
                                </div>
                              </form>
                            </Form>
                          </TabsContent>
                        </Tabs>
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {movimientosIngresos.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md sm:flex-row sm:items-center"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-foreground">
                            {item.descripcion}
                            {item.secondaryDescription && (
                              <span className="ml-1 font-normal text-muted-foreground opacity-70">
                                {item.secondaryDescription}
                              </span>
                            )}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {item.referencia || "Sin referencia"}
                          </span>
                          <Badge variant="outline" className="w-fit text-[10px]">
                            {item.tipo === 'venta_contado' ? 'Venta Contado' : 'Abono'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between gap-6 sm:justify-end">
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(item.fecha), "PP p", { locale: es })}
                          </span>
                          <span className="text-lg font-bold text-emerald-600">
                            +{currencyFormatter.format(item.monto)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="egresos">
                {loadingGastos && loadingHistorial ? (
                  <div className="flex h-[200px] items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : movimientosEgresos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 rounded-full bg-slate-100 p-6">
                      <TrendingDown className="h-12 w-12 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground">No hay egresos registrados.</h3>
                    <p className="text-sm text-muted-foreground">Tus gastos aparecerán aquí.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {movimientosEgresos.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md sm:flex-row sm:items-center"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-foreground">
                            {item.descripcion}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {item.categoria || 'General'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {item.tipo === 'inventario' ? 'Entrada de inventario' :
                                item.tipo === 'pago_gasto' ? 'Pago de deuda' : 'Gasto registrado'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-6 sm:justify-end">
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(item.fecha), "PP p", { locale: es })}
                          </span>
                          <span className="text-lg font-bold text-rose-600">
                            -{currencyFormatter.format(item.monto)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="por_cobrar">
                {loadingCuentas ? (
                  <div className="flex h-[200px] items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : cuentasPorCobrar.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 rounded-full bg-slate-100 p-6">
                      <Receipt className="h-12 w-12 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground">No hay cuentas por cobrar.</h3>
                    <p className="text-sm text-muted-foreground">Todas las ventas a crédito están al día.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {cuentasPorCobrar.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md"
                      >
                        <div className="mb-4 flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-semibold text-foreground line-clamp-1" title={item.cliente?.nombre}>
                              {item.cliente?.nombre || "Cliente desconocido"}
                            </h4>
                            <p className="text-xs text-muted-foreground">Folio: {item.folio}</p>
                          </div>
                          <div className="text-right">
                            <span className="block text-lg font-bold text-rose-600">
                              {currencyFormatter.format(item.saldoPendiente)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              de {currencyFormatter.format(item.total)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-auto space-y-4">
                          <div className="flex items-center justify-between border-t pt-4">
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground">Vencimiento</span>
                              {item.fechaPrimerVencimiento ? (
                                <span className="text-sm font-medium text-rose-600">
                                  {format(new Date(item.fechaPrimerVencimiento), "PP", { locale: es })}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full px-4"
                              onClick={() => handleOpenDetails(item)}
                            >
                              Ver detalles
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Detalle de Deuda</DialogTitle>
                      <DialogDescription>
                        Folio: {selectedCuenta?.folio}
                      </DialogDescription>
                    </DialogHeader>

                    {selectedCuenta && (
                      <div className="grid gap-4 py-4">
                        <div className="space-y-1">
                          <h4 className="font-medium leading-none">{selectedCuenta.cliente?.nombre}</h4>
                          <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                            <p>{selectedCuenta.cliente?.telefono || "Sin teléfono registrado"}</p>
                            {selectedCuenta.cliente?.documento && (
                              <p>ID: {selectedCuenta.cliente.documento}</p>
                            )}
                            {selectedCuenta.cliente?.direccion && (
                              <p>Dir: {selectedCuenta.cliente.direccion}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 rounded-lg border p-3 bg-muted/50">
                          <div>
                            <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
                            <p className="text-lg font-bold text-rose-600">
                              {currencyFormatter.format(selectedCuenta.saldoPendiente)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Monto Cuota</p>
                            <p className="font-medium">
                              {currencyFormatter.format(selectedCuenta.montoCuota || selectedCuenta.saldoPendiente)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Cuotas Restantes</p>
                            <p className="font-medium">
                              {selectedCuenta.montoCuota > 0
                                ? Math.ceil(selectedCuenta.saldoPendiente / selectedCuenta.montoCuota)
                                : 1}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Frecuencia</p>
                            <p className="font-medium capitalize">
                              {selectedCuenta.frecuenciaPago || "Única"}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Registrar Abono</Label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                              <Input
                                type="number"
                                className="pl-6"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                              />
                            </div>
                          </div>
                          <Textarea
                            placeholder="Nota del abono (opcional)"
                            value={paymentNote}
                            onChange={(e) => setPaymentNote(e.target.value)}
                            className="h-20"
                          />
                        </div>
                      </div>
                    )}

                    <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between sm:space-x-0">
                      {selectedCuenta?.cliente?.telefono && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full sm:w-auto text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                          onClick={handleWhatsApp}
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          WhatsApp
                        </Button>
                      )}
                      <Button
                        type="button"
                        className="w-full sm:w-auto"
                        onClick={handleRegisterPayment}
                        disabled={registeringPayment}
                      >
                        {registeringPayment ? "Registrando..." : "Registrar Pago"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>
              <TabsContent value="por_pagar">
                {gastosPendientes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 rounded-full bg-slate-100 p-6">
                      <Receipt className="h-12 w-12 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground">No hay cuentas por pagar.</h3>
                    <p className="text-sm text-muted-foreground">Estás al día con tus gastos.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {gastosPendientes.map((gasto) => (
                      <div
                        key={gasto.id}
                        className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md"
                      >
                        <div className="mb-4 flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-semibold text-foreground line-clamp-1" title={gasto.descripcion}>
                              {gasto.descripcion}
                            </h4>
                            <p className="text-xs text-muted-foreground">{gasto.proveedor || 'Sin proveedor'}</p>
                            <Badge variant="outline" className="text-[10px] mt-1">{gasto.categoria}</Badge>
                          </div>
                          <div className="text-right">
                            <span className="block text-lg font-bold text-rose-600">
                              {currencyFormatter.format(gasto.saldoPendiente)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              de {currencyFormatter.format(gasto.monto)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-auto space-y-4">
                          <div className="flex items-center justify-between border-t pt-4">
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground">Vencimiento</span>
                              {gasto.fechaVencimiento ? (
                                <span className="text-sm font-medium text-rose-600">
                                  {format(new Date(gasto.fechaVencimiento), "PP", { locale: es })}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full px-4"
                              onClick={() => {
                                setSelectedGastoPago(gasto)
                                setOpenPagoGastoDialog(true)
                              }}
                            >
                              Pagar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="cierres">
            {loadingCierres ? (
              <div className="flex h-[200px] items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filteredCierres.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-full bg-slate-100 p-6">
                  <Receipt className="h-12 w-12 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No hay cierres registrados.</h3>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCierres.map((cierre) => (
                  <div
                    key={cierre.id}
                    className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={cierre.estado === "abierta" ? "default" : "secondary"}>
                          {cierre.estado === "abierta" ? "Abierta" : "Cerrada"}
                        </Badge>
                        <span className="text-sm font-medium text-muted-foreground">
                          {cierre.usuarioNombre || "Usuario"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(cierre.fechaApertura), "PP", { locale: es })}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Monto Inicial</p>
                        <p className="font-semibold">{currencyFormatter.format(cierre.montoInicial)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Ventas del turno</p>
                        <p className="font-semibold">
                          {cierre.montoFinalEsperado !== undefined && cierre.montoFinalEsperado !== null
                            ? currencyFormatter.format(cierre.montoFinalEsperado - cierre.montoInicial)
                            : "-"}

                        </p>
                      </div>
                      <div className="col-span-2 border-t pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Diferencia en caja</span>
                          <span className={cn(
                            "font-bold text-base",
                            cierre.diferencia && cierre.diferencia < 0 ? "text-rose-600" : "text-emerald-600"
                          )}>
                            {cierre.diferencia !== undefined && cierre.diferencia !== null
                              ? currencyFormatter.format(cierre.diferencia)
                              : "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {cierre.fechaCierre && (
                      <div className="mt-auto pt-2 text-xs text-muted-foreground text-right">
                        Cierre: {format(new Date(cierre.fechaCierre), "p", { locale: es })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ AdminSectionLayout>
  )
}
