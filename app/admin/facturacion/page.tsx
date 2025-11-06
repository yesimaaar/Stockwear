"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart, Search, Trash2, Receipt, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { ProductoService, type ProductoConStock } from "@/lib/services/producto-service"
import { VentaService } from "@/lib/services/venta-service"

interface LineaVentaForm {
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

export default function FacturacionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [busqueda, setBusqueda] = useState("")
  const [buscando, setBuscando] = useState(false)
  const [productosEncontrados, setProductosEncontrados] = useState<ProductoConStock[]>([])
  const [lineas, setLineas] = useState<LineaVentaForm[]>([])
  const [registrando, setRegistrando] = useState(false)

  const realizarBusqueda = async () => {
    const termino = busqueda.trim()
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

  const registrarVenta = async () => {
    if (!lineas.length) {
      toast({
        title: "Agrega productos",
        description: "Necesitas al menos un producto para registrar la venta",
        variant: "destructive",
      })
      return
    }

    setRegistrando(true)
    try {
      const venta = await VentaService.create({
        usuarioId: null,
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
      router.push("/admin/historial")
    } catch (error) {
      console.error("Error al registrar venta", error)
      const mensaje = error instanceof Error ? error.message : 'No se pudo completar la venta'
      toast({
        title: "Error al registrar",
        description: mensaje,
        variant: "destructive",
      })
    } finally {
      setRegistrando(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Facturación y Ventas</h1>
          <p className="text-sm text-muted-foreground">Registra ventas y actualiza el inventario en tiempo real</p>
        </div>
        <Button onClick={registrarVenta} disabled={registrando || lineas.length === 0}>
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
            <Input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void realizarBusqueda()
                }
              }}
              placeholder="Código o nombre del producto"
            />
            <Button onClick={() => void realizarBusqueda()} disabled={buscando}>
              {buscando ? "Buscando..." : "Buscar"}
            </Button>
          </div>

          {productosEncontrados.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecciona el stock disponible que deseas añadir a la venta.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {productosEncontrados.map((producto) => (
                  <Card key={producto.id} className="border-muted">
                    <CardHeader className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{producto.nombre}</h3>
                          <p className="text-xs text-muted-foreground">Código: {producto.codigo}</p>
                        </div>
                        <Badge variant="outline">{producto.categoria}</Badge>
                      </div>
                      {producto.descripcion && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{producto.descripcion}</p>
                      )}
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
                              key={`${stock.stockId}`}
                              className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                            >
                              <div className="flex items-center gap-2 text-sm">
                                <Badge variant="secondary">{stock.almacen || "Sin almacén"}</Badge>
                                <Badge variant="outline">Talla {stock.talla || "N/A"}</Badge>
                                <Badge variant={stock.cantidad > 0 ? "default" : "destructive"}>
                                  {stock.cantidad} ud
                                </Badge>
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
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-4 w-4" /> Carrito de venta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineas.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Añade productos para comenzar la venta.
            </div>
          ) : (
            <div className="space-y-4">
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
                    const subtotal = VentaService.calcularSubtotal(
                      linea.precioUnitario,
                      linea.cantidad,
                      linea.descuento,
                    )
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
                            onChange={(event) =>
                              actualizarCantidad(linea.stockId, Number(event.target.value))
                            }
                          />
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            Disponible: {linea.disponible}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={linea.precioUnitario}
                            onChange={(event) =>
                              actualizarPrecio(linea.stockId, Number(event.target.value))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={linea.descuento}
                            onChange={(event) =>
                              actualizarDescuento(linea.stockId, Number(event.target.value))
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${subtotal.toLocaleString("es-CO")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => eliminarLinea(linea.stockId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-2 border-t pt-4 text-right">
                <p className="text-sm text-muted-foreground">
                  Total artículos: {lineas.reduce((sum, linea) => sum + linea.cantidad, 0)} unidades
                </p>
                <p className="text-lg font-semibold text-foreground">
                  Total a pagar: ${total.toLocaleString("es-CO", { minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
