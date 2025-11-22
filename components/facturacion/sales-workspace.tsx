"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import * as LucideIcons from "lucide-react"
const { ShoppingCart, Search, Trash2, Receipt, Package, X, ChevronDown, Plus, ChevronRight } = LucideIcons
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CreditCard, Banknote, ArrowLeftRight } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ProductoService, type ProductoConStock } from "@/lib/services/producto-service"
import { type VentaConDetalles, VentaService } from "@/lib/services/venta-service"
import { AuthService } from "@/lib/services/auth-service"
import { CajaService } from "@/lib/services/caja-service"
import type { Usuario, MetodoPago, CajaSesion } from "@/lib/types"
import { cn } from "@/lib/utils"
import { OPEN_QUICK_CART_EVENT, CAJA_SESSION_UPDATED } from "@/lib/events"

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

  // Customer Data Form State
  const [isFormOpen, setIsFormOpen] = useState(false)
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
        const activos = lista.filter((usuario) => usuario.rol === "empleado" && usuario.estado !== "inactivo")
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
      try {
        const [metodos, user] = await Promise.all([
          CajaService.getMetodosPago(),
          AuthService.getCurrentUser()
        ])
        setMetodosPago(metodos)
        if (metodos.length > 0) {
          const efectivo = metodos.find(m => m.tipo === 'efectivo')
          setSelectedMetodoPagoId(String(efectivo?.id || metodos[0].id))
        }

        if (user) {
          const sesion = await CajaService.getSesionActual(user.id)
          setSesionActual(sesion)
        }
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
    const opciones: MetodoPago[] = metodosPago.length > 0 ? metodosPago : [
      { id: 1, nombre: "Efectivo", tipo: "efectivo", tiendaId: 0, estado: "activo" },
      { id: 2, nombre: "Transferencia", tipo: "banco", tiendaId: 0, estado: "activo" },
      { id: 3, nombre: "Tarjeta", tipo: "banco", tiendaId: 0, estado: "activo" }
    ]

    return (
      <div className="space-y-2">
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          Método de Pago
        </Label>
        <RadioGroup
          value={selectedMetodoPagoId ?? ""}
          onValueChange={(value) => setSelectedMetodoPagoId(value)}
          className="grid grid-cols-3 gap-2"
        >
          {opciones.map((metodo) => {
            let Icon = Banknote
            if (metodo.nombre.toLowerCase().includes("tarjeta")) Icon = CreditCard
            else if (metodo.nombre.toLowerCase().includes("transferencia")) Icon = ArrowLeftRight

            return (
              <div key={metodo.id}>
                <RadioGroupItem value={String(metodo.id)} id={`${id}-${metodo.id}`} className="peer sr-only" />
                <Label
                  htmlFor={`${id}-${metodo.id}`}
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Icon className="mb-2 h-5 w-5" />
                  <span className="text-xs font-medium">{metodo.nombre}</span>
                </Label>
              </div>
            )
          })}
        </RadioGroup>
        {!sesionActual && (
          <p className="text-xs text-amber-600 font-medium">
            ⚠️ No tienes una caja abierta.
          </p>
        )}
      </div>
    )
  }


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

    setRegistrando(true)
    try {
      const venta = await VentaService.create({
        usuarioId: selectedEmpleadoId,
        metodoPagoId: selectedMetodoPagoId ? Number(selectedMetodoPagoId) : undefined,
        cajaSesionId: sesionActual?.id,
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                          <LucideIcons.Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{linea.cantidad}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => actualizarCantidad(linea.stockId, linea.cantidad + 1)}
                          disabled={linea.cantidad >= linea.disponible}
                        >
                          <LucideIcons.Plus className="h-3 w-3" />
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
                    {lineas.length ? (
                      <ScrollArea className="h-full pr-3">
                        {renderCartContent({
                          emptyMessageClass:
                            "rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground",
                          showTotals: false,
                        })}
                      </ScrollArea>
                    ) : (
                      renderCartContent({
                        emptyMessageClass:
                          "rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground",
                        showTotals: false,
                      })
                    )}
                  </div>
                  <SheetFooter className="border-t px-6 py-5">
                    <div className="flex w-full flex-col gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        {renderEmpleadoSelector("venta-empleado-sheet")}
                        {renderMetodoPagoSelector("venta-metodo-sheet")}
                      </div>

                      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                        <button
                          onClick={() => setIsFormOpen(!isFormOpen)}
                          className="flex w-full items-center justify-between p-4 text-sm font-medium hover:bg-muted/50 transition-colors"
                        >
                          <span>Datos de compra</span>
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
                            <p className="text-[10px] text-muted-foreground italic">
                              * Estos datos son informativos y no se guardarán en la base de datos por ahora.
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-sm text-muted-foreground">Total artículos: {totalArticulos} ud</p>
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
                  <h3 className="text-base font-semibold text-foreground">Destacados</h3>
                  <p className="text-xs text-muted-foreground">Productos más vendidos y novedades recientes</p>
                </div>
              </header>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {highlights.destacados.map((producto) => (
                  <HighlightProductCard
                    key={`destacado-${producto.id}`}
                    producto={producto}
                    onQuickAdd={(detalle, stock) => agregarLinea(detalle, stock)}
                  />
                ))}
              </div>
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
      <div className="relative h-60 w-full overflow-hidden rounded-xl border border-border/50 bg-secondary/20">
        {hasImage ? (
          <Image
            src={producto.imagen as string}
            alt={producto.nombre}
            fill
            className="object-contain transition-transform duration-300 group-hover:scale-105"
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
            ) : !hasAvailableStock ? (
              <p className="text-center text-xs text-muted-foreground">Agotado</p>
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
