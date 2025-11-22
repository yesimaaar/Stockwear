"use client"

import { useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import * as LucideIcons from "lucide-react"
const {
  ArrowLeftRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar: CalendarIcon,
  Search,
  Filter,
  Plus,
  Download,
  Store,
} = LucideIcons

import { AdminSectionLayout } from "@/components/admin-section-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { InventarioService } from "@/lib/services/inventario-service"
import type { Almacen, Talla } from "@/lib/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { getCurrentTiendaId } from "@/lib/services/tenant-service"
import { CajaService } from "@/lib/services/caja-service"
import { AuthService } from "@/lib/services/auth-service"
import type { CajaSesion } from "@/lib/types"
import { OPEN_QUICK_CART_EVENT, CAJA_SESSION_UPDATED } from "@/lib/events"

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

  // Cash Register State
  const [sesionActual, setSesionActual] = useState<CajaSesion | null>(null)
  const [loadingSesion, setLoadingSesion] = useState(true)
  const [openCajaDialog, setOpenCajaDialog] = useState(false)
  const [openCierreDialog, setOpenCierreDialog] = useState(false)
  const [montoInicial, setMontoInicial] = useState("")
  const [montoFinal, setMontoFinal] = useState("")
  const [resumenCierre, setResumenCierre] = useState<{ totalVentas: number, totalGastos: number } | null>(null)

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

  // Load Session
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

  const resumenFinanciero = useMemo(() => {
    const ventas = filteredHistorial
      .filter(item => item.tipo === 'venta' || item.tipo === 'salida')
      .reduce((acc, item) => acc + (item.costoUnitario || 0) * item.cantidad, 0)

    const gastos = filteredHistorial
      .filter(item => item.tipo === 'entrada')
      .reduce((acc, item) => acc + (item.costoUnitario || 0) * item.cantidad, 0)

    return {
      ventas,
      gastos,
      balance: ventas - gastos
    }
  }, [filteredHistorial])

  const convertirId = (valor: string | undefined) => {
    if (!valor || valor === "none") {
      return null
    }
    const id = Number(valor)
    return Number.isFinite(id) ? id : null
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
    } catch (error) {
      toast({ title: "Error", description: "No se pudo cargar el resumen", variant: "destructive" })
    }
  }

  const handleCerrarCaja = async () => {
    if (!sesionActual || !resumenCierre) return
    try {
      const montoReal = parseFloat(montoFinal) || 0
      const montoEsperado = sesionActual.montoInicial + resumenCierre.totalVentas - resumenCierre.totalGastos
      await CajaService.cerrarCaja(sesionActual.id, montoEsperado, montoReal)
      setSesionActual(null)
      setOpenCierreDialog(false)
      setMontoFinal("")
      setResumenCierre(null)
      toast({ title: "Caja cerrada", description: "Turno finalizado." })
      window.dispatchEvent(new CustomEvent(CAJA_SESSION_UPDATED))
    } catch (error) {
      toast({ title: "Error", description: "No se pudo cerrar la caja", variant: "destructive" })
    }
  }

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
          <Button variant="outline" className="gap-2 bg-background">
            <Download className="h-4 w-4 text-amber-500" />
            Descargar reporte
          </Button>
        </div>
      }
    >
      <div className="space-y-6 p-6">

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
                    <span className="text-muted-foreground">Ventas</span>
                    <span>{currencyFormatter.format(resumenCierre.totalVentas)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-medium">
                    <span>Balance total esperado</span>
                    <span>{currencyFormatter.format(sesionActual.montoInicial + resumenCierre.totalVentas)}</span>
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
                    (parseFloat(montoFinal) - (sesionActual.montoInicial + resumenCierre.totalVentas)) < 0
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  )}>
                    Diferencia: {currencyFormatter.format(parseFloat(montoFinal) - (sesionActual.montoInicial + resumenCierre.totalVentas))}
                  </div>
                )}

                <Button className="w-full" onClick={handleCerrarCaja}>Confirmar cierre</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Main Content */}
        <Tabs defaultValue="transacciones" className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border bg-background p-1">
            <TabsList className="w-full justify-start bg-transparent p-0">
              <TabsTrigger
                value="transacciones"
                className="flex-1 rounded-md data-[state=active]:bg-slate-900 data-[state=active]:text-slate-50 md:flex-none md:px-8"
              >
                Transacciones
              </TabsTrigger>
              <TabsTrigger
                value="cierres"
                className="flex-1 rounded-md data-[state=active]:bg-slate-900 data-[state=active]:text-slate-50 md:flex-none md:px-8"
              >
                Cierres de caja
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="transacciones" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row">
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

              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar concepto..."
                  className="pl-9 bg-background"
                  value={filterTerm}
                  onChange={(e) => setFilterTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-none shadow-sm">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Balance</p>
                    <h3 className="text-2xl font-bold">{currencyFormatter.format(resumenFinanciero.balance)}</h3>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ventas totales</p>
                    <h3 className="text-2xl font-bold text-emerald-600">{currencyFormatter.format(resumenFinanciero.ventas)}</h3>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                    <TrendingDown className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Gastos totales</p>
                    <h3 className="text-2xl font-bold text-rose-600">{currencyFormatter.format(resumenFinanciero.gastos)}</h3>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sub-tabs & List */}
            <Tabs defaultValue="ingresos" className="space-y-4">
              <TabsList className="w-full justify-start border-b bg-transparent p-0 rounded-none h-auto">
                <TabsTrigger
                  value="ingresos"
                  className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900"
                >
                  Ingresos
                </TabsTrigger>
                <TabsTrigger
                  value="egresos"
                  className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900"
                >
                  Egresos
                </TabsTrigger>
                <TabsTrigger
                  value="por_cobrar"
                  className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900"
                >
                  Por cobrar
                </TabsTrigger>
                <TabsTrigger
                  value="por_pagar"
                  className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900"
                >
                  Por pagar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ingresos" className="min-h-[300px]">
                {filteredHistorial.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 rounded-full bg-slate-100 p-6">
                      <Wallet className="h-12 w-12 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground">Aún no tienes registros creados en esta fecha.</h3>
                    <p className="text-sm text-muted-foreground mb-6">Comienza registrando tus movimientos.</p>

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
                    {/* Transaction List Implementation */}
                    {filteredHistorial.map((item) => (
                      <div key={item.id} className="flex items-center justify-between border-b py-4 last:border-0">
                        <div>
                          <p className="font-medium">{item.producto?.nombre || "Producto desconocido"}</p>
                          <p className="text-sm text-muted-foreground">{item.motivo || "Sin motivo"}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn("font-bold", item.tipo === 'entrada' ? "text-rose-600" : "text-emerald-600")}>
                            {item.tipo === 'entrada' ? '-' : '+'}{currencyFormatter.format((item.costoUnitario || 0) * item.cantidad)}
                          </p>
                          <p className="text-xs text-muted-foreground">{format(new Date(item.createdAt), "PP p", { locale: es })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="egresos">
                <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                  Sección de egresos en construcción
                </div>
              </TabsContent>
              <TabsContent value="por_cobrar">
                <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                  Sección por cobrar en construcción
                </div>
              </TabsContent>
              <TabsContent value="por_pagar">
                <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                  Sección por pagar en construcción
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="cierres">
            <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
              <div className="text-center">
                <h3 className="text-lg font-medium">Cierres de caja</h3>
                <p className="text-sm text-muted-foreground">Próximamente podrás gestionar tus cierres aquí.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminSectionLayout>
  )
}
