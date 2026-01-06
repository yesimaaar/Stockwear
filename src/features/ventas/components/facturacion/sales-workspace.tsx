"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  ShoppingCart,
  Search,
  Trash2,
  Receipt,
  Package,
  X,
  ChevronDown,
  Plus,
  ChevronRight,
  Minus,
  Banknote,
  ArrowLeftRight,
  Settings2,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ProductoService, type ProductoConStock } from "@/features/productos/services/producto-service"
import { type VentaConDetalles, VentaService } from "@/features/ventas/services/venta-service"
import { AuthService } from "@/features/auth/services/auth-service"
import { CajaService } from "@/features/caja/services/caja-service"
import { ClienteService } from "@/features/ventas/services/cliente-service"
import type { Usuario, MetodoPago, CajaSesion, Cliente } from "@/lib/types"
import { cn } from "@/lib/utils"
import { OPEN_QUICK_CART_EVENT, CAJA_SESSION_UPDATED } from "@/lib/events"
import { PaymentMethodSelector } from "@/components/domain/payment-method-selector"

export interface LineaVentaForm {
  stockId: number
  productoId: number
  nombre: string
  talla: string
  tallaId: number | null
  almacen: string
  almacenId: number | null
  almacenAbreviatura?: string
  disponible: number
  cantidad: number
  precioUnitario: number
  descuento: number
}
type SalesWorkspaceVariant = "page" | "dashboard"

interface HighlightSummary {
  id: number
  codigo?: string | null
  nombre: string
  categoria?: string | null
  precio?: number | null
  imagen?: string | null
  tag?: string | null
  etiqueta?: string | null
  totalVendidas?: number
  ingresos?: number
}

export interface SalesWorkspaceHighlights {
  destacados: HighlightSummary[]
}

export interface SalesWorkspacePreviewState {
  searchTerm?: string
  productos?: ProductoConStock[]
  lineas?: LineaVentaForm[]
  empleados?: Usuario[]
}

interface SalesWorkspaceProps {
  variant?: SalesWorkspaceVariant
  onSaleRegistered?: (venta: VentaConDetalles) => void
  highlights?: SalesWorkspaceHighlights
  disableInitialFetch?: boolean
  initialPreviewState?: SalesWorkspacePreviewState
  hideCartTrigger?: boolean
  title?: string
  description?: string
  searchPlaceholder?: string
  className?: string
  headerActions?: React.ReactNode
}

const priceFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

export function SalesWorkspace({
  variant = "dashboard",
  onSaleRegistered,
  highlights,
  disableInitialFetch = false,
  initialPreviewState,
  hideCartTrigger = false,
  title,
  description,
  searchPlaceholder,
  className,
  headerActions,
}: SalesWorkspaceProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [busqueda, setBusqueda] = useState(initialPreviewState?.searchTerm ?? "")
  const [buscando, setBuscando] = useState(false)
  const [visibleHighlights, setVisibleHighlights] = useState(8)
  const [productosEncontrados, setProductosEncontrados] = useState<ProductoConStock[]>(initialPreviewState?.productos ?? [])
  const [lineas, setLineas] = useState<LineaVentaForm[]>(initialPreviewState?.lineas ?? [])
  const [registrando, setRegistrando] = useState(false)
  const [cartOpen, setCartOpen] = useState(variant === "page")
  const initialEmpleados = initialPreviewState?.empleados ?? []
  const [empleados, setEmpleados] = useState<Usuario[]>(initialEmpleados)
  const [empleadosLoading, setEmpleadosLoading] = useState(initialEmpleados.length === 0)
  const [empleadosError, setEmpleadosError] = useState<string | null>(null)
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<string | null>(initialEmpleados[0]?.id ?? null)

  // Cash Register State
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([])
  const [selectedMetodoPagoId, setSelectedMetodoPagoId] = useState<string | null>(null)
  const [sesionActual, setSesionActual] = useState<CajaSesion | null>(null)

  // Client State
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null)
  const [clienteSearch, setClienteSearch] = useState("")

  const [loadingClientes, setLoadingClientes] = useState(false)

  // Credit Details State
  const [tipoVenta, setTipoVenta] = useState<'contado' | 'credito'>('contado')

  // Customer Data Form State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(true) // Default open for quick access
  const [formData, setFormData] = useState({
    name: "",
    identification: "",
    phone: "",
    address: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCreateClient = async () => {
    if (!formData.name) {
      toast({
        title: "Nombre requerido",
        description: "Ingresa el nombre del cliente para guardarlo.",
        variant: "destructive",
      })
      return
    }

    if (formData.identification) {
      try {
        const existingClient = await ClienteService.getByDocument(formData.identification)
        if (existingClient) {
          toast({
            title: "Cliente ya existe",
            description: `El cliente con documento ${formData.identification} ya está registrado como ${existingClient.nombre}.`,
            variant: "destructive",
          })

          // Optional: Select the existing client automatically
          if (!clientes.some(c => c.id === existingClient.id)) {
            setClientes(prev => [...prev, existingClient])
          }
          setSelectedClienteId(String(existingClient.id))
          setIsFormOpen(false)

          return
        }
      } catch (error) {
        console.error("Error verificando cliente existente", error)
      }
    }

    try {
      const nuevoCliente = await ClienteService.create({
        nombre: formData.name,
        documento: formData.identification,
        telefono: formData.phone,
        direccion: formData.address,
      })

      if (nuevoCliente) {
        setClientes((prev) => [...prev, nuevoCliente])
        setSelectedClienteId(String(nuevoCliente.id))
        toast({
          title: "Cliente creado",
          description: `Se ha registrado a ${nuevoCliente.nombre} correctamente.`,
        })
        // Close form or keep open? Maybe close to indicate success
        setIsFormOpen(false)
      }
    } catch (error) {
      console.error("Error creando cliente", error)
      toast({
        title: "Error",
        description: "No se pudo crear el cliente.",
        variant: "destructive",
      })
    }
  }

  const dashboardTitle = title ?? "Facturación rápida"
  const dashboardDescription = description ?? "Añade productos destacados rápidamente a tu carrito de facturación."
  const inputPlaceholder = searchPlaceholder ?? "Código o nombre del producto"

  const clearBusqueda = () => {
    setBusqueda("")
    setProductosEncontrados([])
  }

  useEffect(() => {
    if (disableInitialFetch || initialEmpleados.length > 0) {
      setEmpleadosLoading(false)
      return
    }
    let active = true

    const loadEmpleados = async () => {
      setEmpleadosLoading(true)
      setEmpleadosError(null)
      try {
        const lista = await AuthService.getAll()
        if (!active) {
          return
        }
        const activos = lista.filter((usuario) => ["empleado", "admin", "propietario"].includes(usuario.rol) && usuario.estado !== "inactivo")
        setEmpleados(activos)
        setSelectedEmpleadoId((prev) => {
          if (prev && activos.some((empleado) => empleado.id === prev)) {
            return prev
          }
          return null
        })
      } catch (error) {
        console.error("Error al cargar empleados", error)
        if (active) {
          setEmpleadosError("No pudimos cargar la lista de empleados.")
        }
      } finally {
        if (active) {
          setEmpleadosLoading(false)
        }
      }
    }

    void loadEmpleados()

    if (busqueda && productosEncontrados.length === 0) {
      void realizarBusqueda(busqueda)
    }

    return () => {
      active = false
    }
  }, [disableInitialFetch, initialEmpleados.length])

  useEffect(() => {
    const handleOpenCart = () => {
      setCartOpen(true)
    }

    window.addEventListener(OPEN_QUICK_CART_EVENT, handleOpenCart)
    return () => {
      window.removeEventListener(OPEN_QUICK_CART_EVENT, handleOpenCart)
    }
    return () => {
      window.removeEventListener(OPEN_QUICK_CART_EVENT, handleOpenCart)
    }
  }, [])

  // Load Payment Methods and Session
  useEffect(() => {
    const loadData = async () => {
      console.log("loadData: Starting")
      try {
        // 1. Get User first
        let user = null
        try {
          console.log("loadData: Fetching user...")
          user = await AuthService.getCurrentUser()
          console.log("loadData: User fetched", user ? user.id : "null")

          if (!user) {
            console.warn("loadData: No user found, aborting data load")
            return
          }
        } catch (error) {
          console.error("Error loading user", error)
          return
        }

        // 2. Get Payment Methods
        try {
          console.log("loadData: Fetching payment methods...")
          // Ensure defaults exist first
          await CajaService.ensureDefaults()

          const metodos = await CajaService.getMetodosPago()
          console.log("loadData: Payment methods fetched", Array.isArray(metodos) ? metodos.length : "not array")

          if (Array.isArray(metodos)) {
            console.log("loadData: metodos is array, length", metodos.length)
            try {
              // Deep copy to ensure no references cause issues
              const safeMetodos = JSON.parse(JSON.stringify(metodos))
              setMetodosPago(safeMetodos)
            } catch (e) {
              console.error("loadData: CRITICAL ERROR setting metodosPago", e)
            }

            if (metodos.length > 0) {
              const efectivo = metodos.find(m => m.tipo === 'efectivo')
              const defaultId = efectivo?.id ?? metodos[0]?.id
              if (defaultId) {
                try {
                  setSelectedMetodoPagoId(String(defaultId))
                } catch (e) {
                  console.error("loadData: CRITICAL ERROR setting selectedMetodoPagoId", e)
                }
              }
            }
          } else {
            console.warn("getMetodosPago did not return an array", metodos)
            setMetodosPago([])
          }
        } catch (error) {
          console.error("Error loading payment methods", error)
        }

        // 3. Get Session if user exists
        if (user) {
          try {
            console.log("loadData: Fetching session for user", user.id)
            const sesion = await CajaService.getSesionActual(user.id)
            console.log("loadData: Session fetched", sesion ? sesion.id : "null")
            setSesionActual(sesion)
          } catch (error) {
            console.error("Error loading session", error)
          }
        } else {
          console.log("loadData: No user, skipping session fetch")
        }
        console.log("loadData: Completed successfully")
      } catch (error) {
        console.error("Error loading sales data", error)
      }
    }

    loadData()

    const handleSessionUpdate = () => {
      loadData()
    }

    const handleFocus = () => {
      loadData()
    }

    window.addEventListener(CAJA_SESSION_UPDATED, handleSessionUpdate)
    window.addEventListener("focus", handleFocus)

    return () => {
      window.removeEventListener(CAJA_SESSION_UPDATED, handleSessionUpdate)
      window.removeEventListener("focus", handleFocus)
    }
  }, [])

  // Load Clients on search
  useEffect(() => {
    const searchClientes = async () => {
      setLoadingClientes(true)
      try {
        const results = await ClienteService.search(clienteSearch)
        setClientes(results)
      } catch (error) {
        console.error("Error searching clients", error)
      } finally {
        setLoadingClientes(false)
      }
    }

    const timeoutId = setTimeout(() => {
      void searchClientes()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [clienteSearch])

  const selectedEmpleado = useMemo(
    () => empleados.find((empleado) => empleado.id === selectedEmpleadoId) ?? null,
    [empleados, selectedEmpleadoId],
  )

  const realizarBusqueda = async (override?: string) => {
    const terminoInput = override ?? busqueda
    const termino = terminoInput.trim()
    if (override !== undefined) {
      setBusqueda(override)
    }
    if (!termino) {
      setProductosEncontrados([])
      return
    }

    setBuscando(true)
    try {
      const resultados = await ProductoService.search(termino)
      setProductosEncontrados(resultados)
    } catch (error) {
      console.error("Error buscando productos", error)
      toast({
        title: "No se pudo buscar",
        description: "Ocurrió un error al consultar los productos",
        variant: "destructive",
      })
    } finally {
      setBuscando(false)
    }
  }

  const agregarLinea = (producto: ProductoConStock, stock: ProductoConStock["stockPorTalla"][number]) => {
    if (stock.cantidad <= 0) {
      toast({
        title: "Sin inventario",
        description: "Este stock no tiene unidades disponibles",
        variant: "destructive",
      })
      return
    }

    setLineas((prev) => {
      const existente = prev.find((linea) => linea.stockId === stock.stockId)
      if (existente) {
        const nuevaCantidad = Math.min(existente.cantidad + 1, stock.cantidad)
        return prev.map((linea) =>
          linea.stockId === stock.stockId
            ? { ...linea, cantidad: nuevaCantidad }
            : linea,
        )
      }

      return [
        ...prev,
        {
          stockId: stock.stockId,
          productoId: producto.id,
          nombre: producto.nombre,
          talla: stock.talla,
          tallaId: stock.tallaId,
          almacen: stock.almacen || "Almacén desconocido",
          almacenId: stock.almacenId,
          almacenAbreviatura: stock.almacenAbreviatura,
          disponible: stock.cantidad,
          cantidad: 1,
          precioUnitario: producto.precio,
          descuento: producto.descuento ?? 0,
        },
      ]
    })

    if (variant === "dashboard") {
      setCartOpen(true)
    }

    toast({
      title: "Producto añadido",
      description: `${producto.nombre} se añadió al carrito de venta`,
    })
  }

  const actualizarCantidad = (stockId: number, cantidad: number) => {
    setLineas((prev) =>
      prev.map((linea) => {
        if (linea.stockId !== stockId) return linea
        const segura = Math.max(1, Math.min(cantidad, linea.disponible))
        return { ...linea, cantidad: segura }
      }),
    )
  }

  const actualizarPrecio = (stockId: number, precio: number) => {
    setLineas((prev) =>
      prev.map((linea) => {
        if (linea.stockId !== stockId) return linea
        const precioSeguro = Math.max(0, precio)
        return { ...linea, precioUnitario: precioSeguro }
      }),
    )
  }

  const actualizarDescuento = (stockId: number, descuento: number) => {
    setLineas((prev) =>
      prev.map((linea) => {
        if (linea.stockId !== stockId) return linea
        const descuentoSeguro = Math.min(Math.max(descuento, 0), 100)
        return { ...linea, descuento: descuentoSeguro }
      }),
    )
  }

  const eliminarLinea = (stockId: number) => {
    setLineas((prev) => prev.filter((linea) => linea.stockId !== stockId))
  }

  const total = useMemo(() => {
    return lineas.reduce((sum, linea) => {
      const subtotal = VentaService.calcularSubtotal(linea.precioUnitario, linea.cantidad, linea.descuento)
      return sum + subtotal
    }, 0)
  }, [lineas])

  const totalArticulos = useMemo(() => {
    return lineas.reduce((sum, linea) => sum + linea.cantidad, 0)
  }, [lineas])

  const registerDisabled = registrando || lineas.length === 0 || !selectedEmpleadoId

  const renderEmpleadoSelector = (id: string) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        Venta registrada por
      </Label>
      <Select
        value={selectedEmpleadoId ?? ""}
        onValueChange={(value) => setSelectedEmpleadoId(value)}
        disabled={empleadosLoading || empleados.length === 0}
      >
        <SelectTrigger id={id} aria-label="Seleccionar empleado para la venta">
          <SelectValue
            placeholder={empleadosLoading ? "Cargando empleados..." : "Selecciona un empleado"}
          />
        </SelectTrigger>
        <SelectContent>
          {empleados.map((empleado) => (
            <SelectItem key={empleado.id} value={empleado.id}>
              {empleado.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {empleadosError ? (
        <p className="text-xs text-destructive">{empleadosError}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {selectedEmpleado
            ? `Asignada a ${selectedEmpleado.nombre}.`
            : empleadosLoading
              ? "Cargando personal disponible..."
              : empleados.length
                ? "Elige quién atendió la venta."
                : "No hay empleados activos disponibles."}
        </p>
      )}
    </div>

  )



  const renderMetodoPagoSelector = (id: string) => {
    const opciones: MetodoPago[] = metodosPago.filter(m => !['crédito', 'credito', 'por cobrar'].includes(m.nombre.toLowerCase()))

    // Ensure Tarjeta is visible if it exists in DB, or add it if missing and needed
    // The user wants "Tarjeta de crédito" explicitly.
    // If it's not in the DB list, we might want to inject it or just show what's there.
    // Assuming standard behavior is to show all active methods.
    // We will NOT filter out "Tarjeta" anymore.

    // We also do NOT add the virtual "Cuotas" option anymore.

    return (
      <div className="space-y-4">
        {/* Toggle Switch for Pagada / A crédito */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
          <button
            type="button"
            onClick={() => {
              setTipoVenta('contado')
              // Auto-select first non-credit method (usually Efectivo)
              const efectivo = metodosPago.find(m => m.tipo === 'efectivo')
              if (efectivo) {
                setSelectedMetodoPagoId(String(efectivo.id))
              } else if (metodosPago.length > 0) {
                // Fallback to first available if no cash
                setSelectedMetodoPagoId(String(metodosPago[0].id))
              }
            }}
            className={cn(
              "flex items-center justify-center py-2 text-sm font-medium rounded-md transition-all",
              tipoVenta === 'contado'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Pagada
          </button>
          <button
            type="button"
            onClick={() => {
              setTipoVenta('credito')
              // Auto-select "Crédito" or "Por Cobrar" method
              const credito = metodosPago.find(m =>
                m.nombre === 'Crédito' ||
                m.nombre === 'Por Cobrar' ||
                m.nombre.toLowerCase() === 'credito'
              )
              if (credito) {
                setSelectedMetodoPagoId(String(credito.id))
              }
            }}
            className={cn(
              "flex items-center justify-center py-2 text-sm font-medium rounded-md transition-all",
              tipoVenta === 'credito'
                ? "bg-red-700 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            A crédito
          </button>
        </div>

        {tipoVenta === 'contado' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
            <Label htmlFor={id} className="text-sm font-medium text-foreground">
              Método de Pago
            </Label>
            <PaymentMethodSelector
              methods={opciones}
              selectedMethodId={selectedMetodoPagoId}
              onSelect={setSelectedMetodoPagoId}
              disabled={opciones.length === 0}
            />
            {(() => {
              const selected = metodosPago.find(m => String(m.id) === selectedMetodoPagoId)
              if (selected?.comisionPorcentaje) {
                return (
                  <div className="p-2 rounded-md bg-blue-50 text-blue-700 text-xs border border-blue-100">
                    <p>ℹ️ Este método aplica una comisión del <strong>{selected.comisionPorcentaje}%</strong>.</p>
                  </div>
                )
              }
              return null
            })()}
          </div>
        )}

        {tipoVenta === 'credito' && (
          <div className="p-3 rounded-md border bg-amber-50 text-amber-900 text-sm">
            <p>La venta se registrará como <strong>pendiente de cobro</strong>.</p>
          </div>
        )}

        {!sesionActual && (
          <p className="text-xs text-amber-600 font-medium">
            ⚠️ No tienes una caja abierta.
          </p>
        )}
      </div>
    )
  }


  const renderClienteSelector = (id: string) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        Cliente
      </Label>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={clienteSearch}
          onChange={(e) => setClienteSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      <Select
        value={selectedClienteId ?? "anonimo"}
        onValueChange={(value) => setSelectedClienteId(value === "anonimo" ? null : value)}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="Seleccionar cliente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="anonimo">Cliente General</SelectItem>
          {clientes.map((cliente) => (
            <SelectItem key={cliente.id} value={String(cliente.id)}>
              {cliente.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedClienteId && (
        <p className="text-xs text-muted-foreground">
          Saldo actual: ${clientes.find(c => String(c.id) === selectedClienteId)?.saldoActual.toLocaleString() ?? 0}
        </p>
      )}
    </div>
  )



  const registrarVenta = async () => {
    if (!sesionActual) {
      toast({
        title: "Caja cerrada",
        description: "Debes abrir la caja antes de registrar una venta.",
        variant: "destructive",
      })
      return
    }

    if (!lineas.length) {
      toast({
        title: "Agrega productos",
        description: "Necesitas al menos un producto para registrar la venta",
        variant: "destructive",
      })
      return
    }

    if (!selectedEmpleadoId) {
      toast({
        title: "Asigna un empleado",
        description: "Selecciona quién realizó la venta antes de registrarla.",
        variant: "destructive",
      })
      return
    }

    const isCredito = tipoVenta === 'credito'
    let clienteIdParaVenta = selectedClienteId && selectedClienteId !== 'anonimo' ? Number(selectedClienteId) : null

    // Si es crédito y no hay cliente seleccionado, intentamos usar los datos del formulario
    if (isCredito && !clienteIdParaVenta) {
      if (formData.name && formData.identification) {
        try {
          // Check if client exists first
          const existingClient = await ClienteService.getByDocument(formData.identification)

          if (existingClient) {
            clienteIdParaVenta = existingClient.id
            // Update local state
            if (!clientes.some(c => c.id === existingClient.id)) {
              setClientes(prev => [...prev, existingClient])
            }
            setSelectedClienteId(String(existingClient.id))
            toast({
              title: "Cliente existente encontrado",
              description: `Se usará el cliente ${existingClient.nombre} para esta venta.`,
            })
          } else {
            // Intentar crear el cliente al vuelo
            const nuevoCliente = await ClienteService.create({
              nombre: formData.name,
              documento: formData.identification,
              telefono: formData.phone,
              direccion: formData.address,
            })

            if (nuevoCliente) {
              clienteIdParaVenta = nuevoCliente.id
              // Actualizar estado local para que se refleje en la UI
              setClientes((prev) => [...prev, nuevoCliente])
              setSelectedClienteId(String(nuevoCliente.id))
              toast({
                title: "Cliente registrado",
                description: `Se creó el cliente ${nuevoCliente.nombre} automáticamente.`,
              })
            } else {
              toast({
                title: "Error al crear cliente",
                description: "No se pudo registrar el cliente con los datos proporcionados.",
                variant: "destructive",
              })
              return
            }
          }
        } catch (error) {
          console.error("Error creando cliente desde venta", error)
          toast({
            title: "Error al crear cliente",
            description: "Verifica que el documento no esté ya registrado.",
            variant: "destructive",
          })
          return
        }
      } else {
        toast({
          title: "Cliente requerido",
          description: "Para ventas a crédito debes seleccionar un cliente o llenar los Datos de Compra (Nombre e ID).",
          variant: "destructive",
        })
        return
      }
    }

    setRegistrando(true)
    try {
      // Validate payment method
      if (tipoVenta === 'contado' && !selectedMetodoPagoId) {
        toast({
          title: "Método de pago requerido",
          description: "Selecciona un método de pago para la venta de contado.",
          variant: "destructive",
        })
        setRegistrando(false)
        return
      }

      if (tipoVenta === 'credito') {
        // Ensure we have the credit method selected
        const creditoMethod = metodosPago.find(m =>
          m.nombre === 'Crédito' ||
          m.nombre === 'Por Cobrar' ||
          m.nombre.toLowerCase() === 'credito'
        )
        if (!creditoMethod) {
          toast({
            title: "Error de configuración",
            description: "No se encontró el método de pago 'Crédito'. Contacta a soporte.",
            variant: "destructive",
          })
          setRegistrando(false)
          return
        }
        // Force selection of credit method just in case
        if (selectedMetodoPagoId !== String(creditoMethod.id)) {
          setSelectedMetodoPagoId(String(creditoMethod.id))
        }
      }

      const venta = await VentaService.create({
        usuarioId: selectedEmpleadoId,
        metodoPagoId: selectedMetodoPagoId ? Number(selectedMetodoPagoId) : undefined,
        cajaSesionId: sesionActual?.id,
        clienteId: clienteIdParaVenta,
        tipoVenta: isCredito ? 'credito' : 'contado',
        items: lineas.map((linea) => ({
          stockId: linea.stockId,
          cantidad: linea.cantidad,
          precioUnitario: linea.precioUnitario,
          descuento: linea.descuento,
        })),
      })

      if (!venta) {
        toast({
          title: "No se registró la venta",
          description: "Ocurrió un error desconocido",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Venta registrada",
        description: `Folio ${venta.folio}`,
      })

      setLineas([])
      setProductosEncontrados([])
      setBusqueda("")
      setCartOpen(variant === "page")

      if (variant === "page") {
        router.push("/admin/historial")
      }

      onSaleRegistered?.(venta)
    } catch (error) {
      console.error("Error al registrar venta", error)
      const mensaje = error instanceof Error ? error.message : "No se pudo completar la venta"
      toast({
        title: "Error al registrar",
        description: mensaje,
        variant: "destructive",
      })
    } finally {
      setRegistrando(false)
    }
  }

  const renderResultados = () => {
    if (!productosEncontrados.length) {
      return null
    }

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Resultados de la búsqueda</p>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {productosEncontrados.map((producto) => (
            <HighlightProductCard
              key={producto.id}
              producto={{
                id: producto.id,
                nombre: producto.nombre,
                codigo: producto.codigo,
                categoria: producto.categoria,
                precio: producto.precio,
                imagen: producto.imagen,
                tag: producto.stockPorTalla.reduce((acc, s) => acc + s.cantidad, 0) > 0 ? "Disponible" : "Agotado"
              }}
              onQuickAdd={(detalle, stock) => agregarLinea(detalle, stock)}
            />
          ))}
        </div>
      </div>
    )
  }

  const renderCartContent = (options?: { emptyMessageClass?: string; showTotals?: boolean }) => {
    const { emptyMessageClass, showTotals = true } = options ?? {}
    if (!lineas.length) {
      return (
        <div
          className={
            emptyMessageClass ??
            "rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground"
          }
        >
          Añade productos para comenzar la venta.
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[20%]">Producto</TableHead>
                <TableHead className="text-center">Cantidad</TableHead>
                <TableHead className="text-right w-[150px]">Precio</TableHead>
                <TableHead className="text-right w-[100px]">Desc %</TableHead>
                <TableHead className="text-right w-[100px]">Subtotal</TableHead>
                <TableHead className="w-[20px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineas.map((linea) => {
                const subtotal = VentaService.calcularSubtotal(linea.precioUnitario, linea.cantidad, linea.descuento)
                return (
                  <TableRow key={linea.stockId}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{linea.nombre}</span>
                        <span className="text-xs text-muted-foreground">Talla {linea.talla || "N/A"}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => actualizarCantidad(linea.stockId, linea.cantidad - 1)}
                          disabled={linea.cantidad <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{linea.cantidad}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => actualizarCantidad(linea.stockId, linea.cantidad + 1)}
                          disabled={linea.cantidad >= linea.disponible}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="mt-1 text-center text-[10px] text-muted-foreground">Max: {linea.disponible}</p>
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          type="number"
                          min={0}
                          className="pl-6 text-right"
                          value={linea.precioUnitario}
                          onChange={(event) => actualizarPrecio(linea.stockId, Number(event.target.value))}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="pr-6 text-right"
                          value={linea.descuento}
                          onChange={(event) => actualizarDescuento(linea.stockId, Number(event.target.value))}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">${subtotal.toLocaleString("es-CO")}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => eliminarLinea(linea.stockId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {showTotals ? (
          <div className="flex flex-col gap-2 border-t pt-4 text-right">
            <p className="text-sm text-muted-foreground">Total artículos: {totalArticulos} unidades</p>
            <p className="text-lg font-semibold text-foreground">
              Total a pagar: ${total.toLocaleString("es-CO", { minimumFractionDigits: 0 })}
            </p>
          </div>
        ) : null}
      </div>
    )
  }

  if (variant === "dashboard") {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="rounded-3xl border border-border/60 bg-background/60 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-1 flex-col gap-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{dashboardTitle}</h2>
                <p className="text-sm text-muted-foreground">{dashboardDescription}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Gestiona tus ventas destacadas sin necesidad de buscar manualmente.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {sesionActual ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Caja Abierta #{sesionActual.id}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  Caja Cerrada
                </Badge>
              )}
              {headerActions}
              <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                {hideCartTrigger ? null : (
                  <SheetTrigger asChild>
                    <Button variant="secondary" className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      <span>Carrito</span>
                      <Badge variant="outline" className="ml-1">
                        {lineas.length}
                      </Badge>
                    </Button>
                  </SheetTrigger>
                )}
                <SheetContent side="right" className="flex h-full w-full max-w-full flex-col p-0 sm:max-w-2xl">
                  <SheetHeader className="space-y-1 border-b px-6 py-5">
                    <SheetTitle className="flex items-center gap-2 text-lg">
                      <Package className="h-4 w-4" /> Carrito de venta
                    </SheetTitle>
                    <SheetDescription>
                      Revisa los productos y confirma la venta cuando estés listo.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-hidden px-6 py-4">
                    <ScrollArea className="h-full pr-3">
                      {lineas.length ? (
                        renderCartContent({
                          emptyMessageClass:
                            "rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground",
                          showTotals: false,
                        })
                      ) : (
                        renderCartContent({
                          emptyMessageClass:
                            "rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground",
                          showTotals: false,
                        })
                      )}

                      <div className="mt-6 space-y-4 border-t pt-6">
                        {/* Configuration Section */}
                        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                          <button
                            onClick={() => setIsConfigOpen(!isConfigOpen)}
                            className="flex w-full items-center justify-between p-4 text-sm font-medium hover:bg-muted/50 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <Settings2 className="h-4 w-4" />
                              Configuración de Venta
                            </span>
                            <ChevronRight
                              className={`h-4 w-4 transition-transform duration-200 ${isConfigOpen ? "rotate-90" : ""}`}
                            />
                          </button>
                          {isConfigOpen && (
                            <div className="border-t p-4 animate-in slide-in-from-top-2 duration-200">
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {renderEmpleadoSelector("venta-empleado-sheet")}
                                {renderClienteSelector("venta-cliente-sheet")}
                                <div className="sm:col-span-2">
                                  {renderMetodoPagoSelector("venta-metodo-sheet")}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Customer Data Form */}
                        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                          <button
                            onClick={() => setIsFormOpen(!isFormOpen)}
                            className="flex w-full items-center justify-between p-4 text-sm font-medium hover:bg-muted/50 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Datos de compra (Opcional)
                            </span>
                            <ChevronRight
                              className={`h-4 w-4 transition-transform duration-200 ${isFormOpen ? "rotate-90" : ""}`}
                            />
                          </button>
                          {isFormOpen && (
                            <div className="border-t p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                              <div className="space-y-1">
                                <Label htmlFor="name" className="text-xs">Nombre completo</Label>
                                <Input
                                  id="name"
                                  name="name"
                                  value={formData.name}
                                  onChange={handleInputChange}
                                  placeholder="Ej: Juan Pérez"
                                  className="h-8"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="identification" className="text-xs">Identificación (CC/NIT)</Label>
                                <Input
                                  id="identification"
                                  name="identification"
                                  value={formData.identification}
                                  onChange={handleInputChange}
                                  placeholder="Ej: 123456789"
                                  className="h-8"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="phone" className="text-xs">Teléfono de contacto</Label>
                                <Input
                                  id="phone"
                                  name="phone"
                                  value={formData.phone}
                                  onChange={handleInputChange}
                                  placeholder="Ej: 3001234567"
                                  className="h-8"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="address" className="text-xs">Dirección de envío</Label>
                                <Input
                                  id="address"
                                  name="address"
                                  value={formData.address}
                                  onChange={handleInputChange}
                                  placeholder="Ej: Calle 123 # 45-67"
                                  className="h-8"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="w-full mt-2"
                                onClick={handleCreateClient}
                              >
                                Guardar como Cliente
                              </Button>
                              <p className="text-[10px] text-muted-foreground italic">
                                * Puedes guardar estos datos como un nuevo cliente para futuras ventas.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                  <SheetFooter className="border-t px-6 py-5">
                    <div className="w-full space-y-4">
                      <div className="space-y-1 text-right">
                        <p className="text-sm text-muted-foreground">Total artículos: {totalArticulos} ud</p>
                        
                        {(() => {
                           if (!selectedMetodoPagoId) return null
                           const method = metodosPago.find(m => String(m.id) === selectedMetodoPagoId)
                           if (!method) return null
                           
                           const name = method.nombre.toLowerCase()
                           let rate = 0
                           let label = ''

                           // Simplificamos la detección para ser más tolerantes
                           const isAddi = name.includes('addi')
                           const isCard = name.includes('tarjeta') || 
                                         (name.includes('banco') && !name.includes('transferencia')) || 
                                         name === 'tc' || 
                                         name === 'datafono'

                           if (isAddi) {
                               rate = 0.1071
                               label = 'Comisión Addi'
                           } else if (isCard) {
                               rate = 0.0361
                               label = 'Comisión Datáfono'
                           }

                           if (rate > 0) {
                               const amount = total * rate
                               const net = total - amount
                               return (
                                   <div className="my-2 text-xs text-muted-foreground bg-slate-50 p-2 rounded border border-slate-100 dark:bg-slate-900/50 dark:border-slate-800">
                                       <div className="flex justify-between text-rose-500">
                                           <span>- {label} ({(rate * 100).toFixed(2)}%):</span>
                                           <span>-${amount.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                                       </div>
                                       <div className="flex justify-between font-medium text-emerald-600 mt-1">
                                           <span>Neto a recibir:</span>
                                           <span>${net.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                                       </div>
                                       <div className="text-[10px] text-slate-400 mt-1 text-center">
                                           {isAddi ? 'Disponible en 8 días' : 'Disponible mañana'}
                                       </div>
                                   </div>
                               )
                           } 
                           // Debug para entender por qué no sale
                           /* else {
                             return <div className="text-[10px] text-gray-300">Método: {name} (Sin comisión)</div>
                           } */
                           return null
                        })()}

                        <p className="text-lg font-semibold text-foreground">
                          Total a pagar: ${total.toLocaleString("es-CO", { minimumFractionDigits: 0 })}
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setLineas([])}
                          disabled={lineas.length === 0 || registrando}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Vaciar
                        </Button>
                        <Button onClick={registrarVenta} disabled={registerDisabled}>
                          <Receipt className="mr-2 h-4 w-4" />
                          {registrando ? "Registrando..." : "Registrar venta"}
                        </Button>
                      </div>
                    </div>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        {buscando && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Buscando productos...
          </div>
        )}

        {!buscando && productosEncontrados.length > 0 && (
          <div className="animate-in fade-in slide-in-from-top-2">
            {renderResultados()}
          </div>
        )}

        {!busqueda && !productosEncontrados.length && highlights && highlights.destacados.length > 0 ? (
          <div className="space-y-6">
            <section className="space-y-3">
              <header className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Todos los productos</h3>
                  <p className="text-xs text-muted-foreground">{highlights.destacados.length} productos disponibles</p>
                </div>
              </header>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                {highlights.destacados.slice(0, visibleHighlights).map((producto) => (
                  <HighlightProductCard
                    key={`destacado-${producto.id}`}
                    producto={producto}
                    onQuickAdd={(detalle, stock) => agregarLinea(detalle, stock)}
                  />
                ))}
              </div>
              {highlights.destacados.length > visibleHighlights && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleHighlights(prev => prev + 12)}
                  >
                    Ver más productos
                  </Button>
                </div>
              )}
            </section>
          </div>
        ) : (
          !busqueda && !productosEncontrados.length ? (
            <p className="text-xs text-muted-foreground">Aún no hay recomendaciones para mostrar.</p>
          ) : null
        )}
      </div>
    )
  }

  const defaultTitle = title ?? "Facturación y Ventas"
  const defaultDescription =
    description ?? "Registra ventas y actualiza el inventario en tiempo real"

  return (
    <div className={cn("space-y-6", className)}>
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{defaultTitle}</h1>
          <p className="text-sm text-muted-foreground">{defaultDescription}</p>
        </div>
        <Button onClick={registrarVenta} disabled={registerDisabled}>
          <Receipt className="mr-2 h-4 w-4" />
          {registrando ? "Registrando..." : "Registrar venta"}
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-4 w-4" /> Buscar productos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row">
            <div className="relative w-full md:flex-1">
              <Input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    void realizarBusqueda()
                  }
                }}
                placeholder={inputPlaceholder}
                className="pr-10"
              />
              {busqueda ? (
                <button
                  type="button"
                  onClick={clearBusqueda}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <Button onClick={() => void realizarBusqueda()} disabled={buscando}>
              {buscando ? "Buscando..." : "Buscar"}
            </Button>
          </div>

          {renderResultados()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-4 w-4" /> Carrito de venta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderCartContent()}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderEmpleadoSelector("venta-empleado-card")}
            {renderClienteSelector("venta-cliente-card")}
            {renderMetodoPagoSelector("venta-metodo-card")}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

type TallaGroup = {
  talla: string
  total: number
  opciones: ProductoConStock["stockPorTalla"]
}

interface HighlightProductCardProps {
  producto: HighlightSummary
  onQuickAdd: (producto: ProductoConStock, stock: ProductoConStock["stockPorTalla"][number]) => void
}

function HighlightProductCard({ producto, onQuickAdd }: HighlightProductCardProps) {
  const hasImage = Boolean(producto.imagen)
  const [expanded, setExpanded] = useState(false)
  const [loadingSizes, setLoadingSizes] = useState(false)
  const [productoDetalle, setProductoDetalle] = useState<ProductoConStock | null>(null)
  const [selectedStockId, setSelectedStockId] = useState<number | null>(null)
  const [stockError, setStockError] = useState<string | null>(null)

  const availableStock = productoDetalle?.stockPorTalla ?? []
  const tallaGroups = useMemo<TallaGroup[]>(() => {
    if (!productoDetalle) {
      return []
    }
    const map = new Map<string, TallaGroup>()
    for (const stock of productoDetalle.stockPorTalla) {
      const key = stock.talla || "Única"
      const entry = map.get(key)
      if (entry) {
        entry.total += stock.cantidad
        entry.opciones.push(stock)
      } else {
        map.set(key, {
          talla: key,
          total: stock.cantidad,
          opciones: [stock],
        })
      }
    }
    return Array.from(map.values()).map((group) => ({
      ...group,
      opciones: group.opciones.sort((a, b) => (b.cantidad ?? 0) - (a.cantidad ?? 0)),
    }))
  }, [productoDetalle])

  const selectedStock = availableStock.find((stock) => stock.stockId === selectedStockId) ?? null
  const hasAvailableStock = tallaGroups.some((group) => group.total > 0)
  const quickAddDisabled = !selectedStock || selectedStock.cantidad <= 0 || loadingSizes

  const ensureStockLoaded = useCallback(async () => {
    if (productoDetalle || loadingSizes) {
      return
    }
    setLoadingSizes(true)
    setStockError(null)
    try {
      const detalle = await ProductoService.getById(producto.id)
      if (!detalle) {
        setStockError("No se pudo cargar el inventario")
        return
      }
      setProductoDetalle(detalle)
      const firstAvailable =
        detalle.stockPorTalla.find((item) => item.cantidad > 0) ?? detalle.stockPorTalla[0] ?? null
      setSelectedStockId(firstAvailable?.stockId ?? null)
    } catch (error) {
      console.error("Error cargando tallas para destacado", error)
      setStockError("No pudimos cargar las tallas")
    } finally {
      setLoadingSizes(false)
    }
  }, [producto.id, productoDetalle, loadingSizes])

  const handleToggle = () => {
    if (!expanded) {
      void ensureStockLoaded()
    }
    setExpanded((value) => !value)
  }

  const handleAddToCart = () => {
    if (!productoDetalle || !selectedStock || selectedStock.cantidad <= 0) {
      return
    }
    onQuickAdd(productoDetalle, selectedStock)
  }

  const handleSelectGroup = (group: TallaGroup) => {
    const preferred = group.opciones.find((stock) => stock.cantidad > 0) ?? group.opciones[0] ?? null
    setSelectedStockId(preferred?.stockId ?? null)

    if (preferred && preferred.cantidad > 0 && productoDetalle) {
      onQuickAdd(productoDetalle, preferred)
    }
  }

  const isGroupSelected = (group: TallaGroup) =>
    group.opciones.some((stock) => stock.stockId === selectedStockId)

  return (
    <div className="group flex h-full flex-col gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
      <div className="relative h-48 w-full overflow-hidden rounded-xl border border-border/50 bg-secondary/20">
        {hasImage ? (
          <Image
            src={producto.imagen as string}
            alt={producto.nombre}
            fill
            loading="lazy"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(min-width: 1280px) 240px, (min-width: 768px) 200px, 160px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-secondary-foreground/60">
            <Package className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between gap-3 text-sm">
        <div className="space-y-1">
          <p className="font-semibold text-foreground line-clamp-1" title={producto.nombre}>
            {producto.nombre}
          </p>
          {producto.categoria ? (
            <p className="text-xs text-muted-foreground">{producto.categoria}</p>
          ) : null}
          {(producto.tag || producto.totalVendidas || producto.etiqueta || producto.ingresos) ? (
            <div className="flex flex-wrap items-center gap-2 text-[0.7rem] text-muted-foreground">
              {producto.tag ? (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground/80">
                  {producto.tag}
                </span>
              ) : null}
              {producto.etiqueta ? <span>{producto.etiqueta}</span> : null}
              {producto.totalVendidas ? <span>{producto.totalVendidas} vendidas</span> : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between">
          <p className="font-medium text-foreground">
            {producto.precio ? priceFormatter.format(producto.precio) : "Sin precio"}
          </p>
          <Button
            size="sm"
            variant={expanded ? "secondary" : "outline"}
            className="h-8 px-3"
            onClick={handleToggle}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span className="sr-only">Ver tallas</span>
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="space-y-3 rounded-xl border border-border/50 bg-background/50 p-3">
            {loadingSizes ? (
              <div className="flex justify-center py-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : stockError ? (
              <p className="text-center text-xs text-destructive">{stockError}</p>
            ) : tallaGroups.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground">Sin stock configurado</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {tallaGroups.map((group) => {
                    const isSelected = isGroupSelected(group)
                    const isAvailable = group.total > 0
                    return (
                      <button
                        key={group.talla}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => handleSelectGroup(group)}
                        className={cn(
                          "flex min-w-[2rem] items-center justify-center rounded-md border px-2 py-1 text-xs transition-colors",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : isAvailable
                              ? "border-border bg-background hover:bg-secondary"
                              : "cursor-not-allowed border-border/50 bg-muted text-muted-foreground opacity-50",
                        )}
                        title={`${group.total} disponibles`}
                      >
                        {group.talla}
                      </button>
                    )
                  })}
                </div>

              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyHighlightCard({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
      <Package className="h-8 w-8 opacity-20" />
      <p>{mensaje}</p>
    </div>
  )
}
