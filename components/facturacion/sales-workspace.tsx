"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import * as LucideIcons from "lucide-react"
const { ShoppingCart, Search, Trash2, Receipt, Package, X, ChevronDown, Plus } = LucideIcons
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
import { ProductoService, type ProductoConStock } from "@/lib/services/producto-service"
import { type VentaConDetalles, VentaService } from "@/lib/services/venta-service"
import { AuthService } from "@/lib/services/auth-service"
import type { Usuario } from "@/lib/types"
import { cn } from "@/lib/utils"
import { OPEN_QUICK_CART_EVENT } from "@/lib/events"

export interface LineaVentaForm {
  stockId: number
  productoId: number
  nombre: string
  talla: string
  tallaId: number | null
  almacen: string
  almacenId: number | null
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
  top: HighlightSummary[]
  recent: HighlightSummary[]
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
          almacen: stock.almacen,
          almacenId: stock.almacenId,
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

  const registrarVenta = async () => {
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
        <p className="text-sm text-muted-foreground">Selecciona el stock disponible que deseas añadir a la venta.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {productosEncontrados.map((producto) => (
            <Card key={producto.id} className="border-muted/70">
              <CardHeader className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{producto.nombre}</h3>
                    <p className="text-xs text-muted-foreground">Código: {producto.codigo}</p>
                  </div>
                  <Badge variant="outline">{producto.categoria}</Badge>
                </div>
                {producto.descripcion ? (
                  <p className="text-xs text-muted-foreground line-clamp-2">{producto.descripcion}</p>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3">
                {producto.stockPorTalla.length === 0 ? (
                  <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                    No hay stock disponible para este producto.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {producto.stockPorTalla.map((stock) => (
                      <div
                        key={stock.stockId}
                        className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <Badge variant="secondary">{stock.almacen || "Sin almacén"}</Badge>
                          <Badge variant="outline">Talla {stock.talla || "N/A"}</Badge>
                          <Badge variant={stock.cantidad > 0 ? "default" : "destructive"}>{stock.cantidad} ud</Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => agregarLinea(producto, stock)}
                          disabled={stock.cantidad <= 0}
                        >
                          <ShoppingCart className="mr-2 h-4 w-4" /> Añadir
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead className="w-28 text-center">Cantidad</TableHead>
                <TableHead className="w-32 text-center">Precio (COP)</TableHead>
                <TableHead className="w-32 text-center">Descuento %</TableHead>
                <TableHead className="w-32 text-right">Subtotal</TableHead>
                <TableHead className="w-12" />
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
                      <span className="text-sm text-muted-foreground">{linea.almacen || "Sin almacén"}</span>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        max={linea.disponible}
                        value={linea.cantidad}
                        onChange={(event) => actualizarCantidad(linea.stockId, Number(event.target.value))}
                      />
                      <p className="mt-1 text-[10px] text-muted-foreground">Disponible: {linea.disponible}</p>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={linea.precioUnitario}
                        onChange={(event) => actualizarPrecio(linea.stockId, Number(event.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={linea.descuento}
                        onChange={(event) => actualizarDescuento(linea.stockId, Number(event.target.value))}
                      />
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

  const dashboardTitle = title ?? "Facturación rápida"
  const dashboardDescription =
    description ?? "Añade productos destacados rápidamente a tu carrito de facturación."
  const inputPlaceholder = searchPlaceholder ?? "Código o nombre del producto"

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
              <SheetContent side="right" className="flex h-full w-full max-w-full flex-col p-0 sm:max-w-xl">
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
                    {renderEmpleadoSelector("venta-empleado-sheet")}
                    <div className="space-y-1 text-right">
                      <p className="text-sm text-muted-foreground">Total artículos: {totalArticulos} ud</p>
                      <p className="text-lg font-semibold text-foreground">
                        Total a pagar: ${total.toLocaleString("es-CO", { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                    <Button onClick={registrarVenta} disabled={registerDisabled} className="self-end">
                      <Receipt className="mr-2 h-4 w-4" />
                      {registrando ? "Registrando..." : "Registrar venta"}
                    </Button>
                  </div>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {highlights && (highlights.top.length > 0 || highlights.recent.length > 0) ? (
          <div className="space-y-6">
            <section className="space-y-3">
              <header className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Más vendidos</h3>
                  <p className="text-xs text-muted-foreground">Acceso rápido a los productos con mayor rotación</p>
                </div>
              </header>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {highlights.top.length ? (
                  highlights.top.map((producto) => (
                    <HighlightProductCard
                      key={`top-${producto.id}`}
                      producto={producto}
                      onQuickAdd={(detalle, stock) => agregarLinea(detalle, stock)}
                    />
                  ))
                ) : (
                  <EmptyHighlightCard mensaje="Registra ventas para ver recomendaciones." />
                )}
              </div>
            </section>

            <section className="space-y-3">
              <header className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Novedades</h3>
                  <p className="text-xs text-muted-foreground">Productos recién agregados a tu catálogo</p>
                </div>
              </header>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {highlights.recent.length ? (
                  highlights.recent.map((producto) => (
                    <HighlightProductCard
                      key={`recent-${producto.id}`}
                      producto={producto}
                      onQuickAdd={(detalle, stock) => agregarLinea(detalle, stock)}
                    />
                  ))
                ) : (
                  <EmptyHighlightCard mensaje="Agrega nuevos productos para empezar a vender." />
                )}
              </div>
            </section>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Aún no hay recomendaciones para mostrar.</p>
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
          {renderEmpleadoSelector("venta-empleado-card")}
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
      <div className="relative h-40 w-full overflow-hidden rounded-xl border border-border/50 bg-secondary/20">
        {hasImage ? (
          <Image
            src={producto.imagen as string}
            alt={producto.nombre}
            fill
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
              {producto.totalVendidas ? (
                <span>
                  {producto.totalVendidas === 1 ? "1 venta" : `${producto.totalVendidas} ventas`}
                </span>
              ) : null}
              {producto.ingresos != null ? (
                <span>{priceFormatter.format(producto.ingresos)}</span>
              ) : null}
              {producto.etiqueta ? <span>{producto.etiqueta}</span> : null}
            </div>
          ) : null}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-base font-semibold text-foreground">
              {producto.precio != null ? priceFormatter.format(producto.precio) : "--"}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="inline-flex h-9 items-center justify-center gap-1 rounded-full px-3"
                onClick={handleToggle}
                aria-label={expanded ? "Ocultar tallas" : "Ver tallas disponibles"}
              >
                <ShoppingCart className="h-4 w-4" />
                {expanded ? <ChevronDown className="h-3.5 w-3.5 rotate-180" /> : <Plus className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          {expanded ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-3 text-xs">
              {loadingSizes ? (
                <p className="text-muted-foreground">Cargando tallas...</p>
              ) : stockError ? (
                <p className="text-destructive">{stockError}</p>
              ) : tallaGroups.length ? (
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Tallas</p>
                  <div className="grid grid-cols-2 gap-2">
                    {tallaGroups.map((group) => {
                      const almacenesTooltip = group.opciones
                        .map((option) => `${option.almacen || "Sin almacén"}: ${option.cantidad} ud`)
                        .join("\n")
                      return (
                        <button
                          key={group.talla}
                          type="button"
                          onClick={() => handleSelectGroup(group)}
                          className={cn(
                            "flex items-center justify-between rounded-xl border px-3 py-2 text-[0.72rem] font-medium transition",
                            isGroupSelected(group)
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/60 text-foreground hover:border-primary/40"
                          )}
                          title={almacenesTooltip}
                        >
                          <span>{group.talla}</span>
                          <span className="text-muted-foreground">{group.total} ud</span>
                        </button>
                      )
                    })}
                  </div>
                  {!hasAvailableStock ? (
                    <p className="text-[0.7rem] text-destructive">Sin stock disponible.</p>
                  ) : null}
                </div>
              ) : (
                <p className="text-muted-foreground">No hay tallas registradas.</p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function EmptyHighlightCard({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 bg-background/40 p-6 text-center text-sm text-muted-foreground">
      <Package className="h-6 w-6" />
      <p>{mensaje}</p>
    </div>
  )
}
