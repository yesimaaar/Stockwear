"use client"

import Image from "next/image"
import Link from "next/link"
import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import {
  Package,
  Plus,
  Search,
  ArrowLeft,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { ProductoService, type ProductoConStock } from "@/lib/services/producto-service"

export default function ProductosPage() {
  const [productos, setProductos] = useState<ProductoConStock[]>([])
  const [filteredProductos, setFilteredProductos] = useState<ProductoConStock[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<number | null>(null)

  const pageSize = 10

  const cargarProductos = useCallback(async () => {
    setLoading(true)
    try {
      const data = await ProductoService.getAll()
      setProductos(data)
      setFilteredProductos(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void cargarProductos()
  }, [cargarProductos])

  const ejecutarBusqueda = useCallback(
    (query: string) => {
      const trimmed = query.trim()
      if (trimmed.length === 0) {
        setFilteredProductos(productos)
        return
      }

      setSearching(true)
      const normalized = trimmed.toLowerCase()
      const resultados = productos.filter((producto) => {
        const nombre = producto.nombre.toLowerCase()
        const codigo = producto.codigo.toLowerCase()
        const categoria = producto.categoria.toLowerCase()
        const proveedor = (producto.proveedor ?? "").toLowerCase()
        const coincideStock = producto.stockPorTalla.some((detalle) => {
          const almacen = (detalle.almacen ?? "").toLowerCase()
          const talla = (detalle.talla ?? "").toLowerCase()
          return almacen.includes(normalized) || talla.includes(normalized)
        })

        return (
          nombre.includes(normalized) ||
          codigo.includes(normalized) ||
          categoria.includes(normalized) ||
          proveedor.includes(normalized) ||
          coincideStock
        )
      })

      setFilteredProductos(resultados)
      setSearching(false)
    },
    [productos],
  )

  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setFilteredProductos(productos)
    }
  }, [searchQuery, productos])

  useEffect(() => {
    setPage(1)
    setExpanded(null)
  }, [filteredProductos])

  const productosConInfo = useMemo(() => {
    return filteredProductos.map((producto) => {
      const stockBajo = producto.stockPorTalla.filter((detalle) => detalle.cantidad < producto.stockMinimo).length
      return { ...producto, stockBajo }
    })
  }, [filteredProductos])

  const totalStockBajo = useMemo(
    () => productosConInfo.reduce((sum, producto) => sum + producto.stockBajo, 0),
    [productosConInfo],
  )

  const pageCount = useMemo(() => {
    return Math.max(1, Math.ceil(productosConInfo.length / pageSize))
  }, [productosConInfo.length, pageSize])

  const paginatedProductos = useMemo(() => {
    const start = (page - 1) * pageSize
    return productosConInfo.slice(start, start + pageSize)
  }, [page, productosConInfo])

  const mostrarDesde = useMemo(() => {
    if (productosConInfo.length === 0) return 0
    return (page - 1) * pageSize + 1
  }, [page, productosConInfo.length])

  const mostrarHasta = useMemo(() => {
    return Math.min(page * pageSize, productosConInfo.length)
  }, [page, productosConInfo.length])

  const toggleExpand = (productoId: number) => {
    setExpanded((actual) => (actual === productoId ? null : productoId))
  }

  const irAPagina = (nuevaPagina: number) => {
    const paginaValida = Math.min(Math.max(1, nuevaPagina), pageCount)
    setPage(paginaValida)
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-4 border-b border-border/70 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Package className="h-7 w-7 text-primary" />
              <div>
                <h1 className="text-xl font-semibold text-foreground">Productos y Stock</h1>
                <p className="text-sm text-muted-foreground">Gestión completa de inventario</p>
              </div>
            </div>
          </div>
          <Link href="/admin/productos/nuevo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Button>
          </Link>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    void ejecutarBusqueda(searchQuery)
                  }
                }}
                placeholder="Buscar por nombre, código o almacén..."
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => void ejecutarBusqueda(searchQuery)}
              disabled={searching}
              type="button"
            >
              <Search className="mr-2 h-4 w-4" />
              {searching ? "Buscando..." : "Buscar"}
            </Button>
            <Button type="button" variant="outline" className="min-w-[120px] gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
            </Button>
          </div>
        </div>

        {totalStockBajo > 0 && (
          <div className="mb-6 rounded-lg bg-yellow-50 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="font-semibold text-yellow-900">
                {totalStockBajo} {totalStockBajo === 1 ? "ubicación" : "ubicaciones"} por debajo del stock mínimo
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-md border border-border bg-card/40 p-4">
                <div className="h-5 w-3/4 rounded bg-muted" />
                <div className="mt-3 h-4 w-full rounded bg-muted/70" />
              </div>
            ))}
          </div>
        ) : productosConInfo.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No hay productos registrados aún.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {mostrarDesde}-{mostrarHasta} de {productosConInfo.length} productos
              </p>
              <p className="text-xs text-muted-foreground">
                Haz clic en un producto para ver el detalle por almacén y talla.
              </p>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-card/60 backdrop-blur">
                  <TableRow>
                    <TableHead className="w-10" aria-label="Expandir" />
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Stock total</TableHead>
                    <TableHead>En alerta</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProductos.map((producto) => {
                    const esExpandido = expanded === producto.id
                    return (
                      <Fragment key={producto.id}>
                        <TableRow className="cursor-pointer" onClick={() => toggleExpand(producto.id)}>
                          <TableCell className="py-3">
                            <Button variant="ghost" size="icon" onClick={(event) => {
                              event.stopPropagation()
                              toggleExpand(producto.id)
                            }}>
                              {esExpandido ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-3">
                              <Image
                                src={producto.imagen || "/placeholder.svg"}
                                alt={producto.nombre}
                                width={48}
                                height={48}
                                loading="lazy"
                                className="h-12 w-12 shrink-0 rounded-md object-cover"
                              />
                              <div>
                                <p className="font-medium text-foreground">{producto.nombre}</p>
                                <p className="text-xs text-muted-foreground">Código: {producto.codigo}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="text-sm text-muted-foreground">{producto.categoria}</span>
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="font-semibold text-primary">
                              ${producto.precio.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="font-medium">{producto.stockTotal} u.</span>
                          </TableCell>
                          <TableCell className="py-3">
                            {producto.stockBajo > 0 ? (
                              <Badge variant="destructive">{producto.stockBajo}</Badge>
                            ) : (
                              <Badge variant="secondary">OK</Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge variant={producto.estado === "activo" ? "default" : "secondary"}>
                              {producto.estado.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Link href={`/admin/productos/${producto.id}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                  }}
                                >
                                  Ver detalle
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                        {esExpandido && (
                          <TableRow className="bg-muted/10">
                            <TableCell colSpan={8} className="p-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm font-semibold text-foreground">Detalle por almacén y talla</p>
                                <p className="text-xs text-muted-foreground">
                                  Stock mínimo configurado: {producto.stockMinimo} unidades
                                </p>
                              </div>
                              <div className="mt-3 grid gap-2 md:grid-cols-2">
                                {producto.stockPorTalla.map((detalle, index) => {
                                  const enRiesgo = detalle.cantidad < producto.stockMinimo
                                  return (
                                    <div
                                      key={`${producto.id}-${index}`}
                                      className="flex items-center justify-between rounded-md border bg-background/80 p-3"
                                    >
                                      <div className="flex flex-wrap items-center gap-2 text-sm">
                                        <Badge variant="outline">{detalle.almacen}</Badge>
                                        <Badge variant="secondary">Talla {detalle.talla}</Badge>
                                      </div>
                                      <div className="text-right">
                                        <p
                                          className={`text-base font-semibold ${
                                            enRiesgo ? "text-red-500" : "text-green-500"
                                          }`}
                                        >
                                          {detalle.cantidad}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Min: {producto.stockMinimo}</p>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {pageCount > 1 && (
              <div className="flex flex-col items-center gap-2 pt-2">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        aria-disabled={page === 1}
                        className={page === 1 ? "pointer-events-none opacity-50" : undefined}
                        onClick={(event) => {
                          event.preventDefault()
                          irAPagina(page - 1)
                        }}
                      />
                    </PaginationItem>
                    {Array.from({ length: pageCount }).map((_, index) => {
                      const pagina = index + 1
                      return (
                        <PaginationItem key={pagina}>
                          <PaginationLink
                            href="#"
                            isActive={pagina === page}
                            onClick={(event) => {
                              event.preventDefault()
                              irAPagina(pagina)
                            }}
                          >
                            {pagina}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    })}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        aria-disabled={page === pageCount}
                        className={page === pageCount ? "pointer-events-none opacity-50" : undefined}
                        onClick={(event) => {
                          event.preventDefault()
                          irAPagina(page + 1)
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
                <p className="text-xs text-muted-foreground">
                  Página {page} de {pageCount}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
