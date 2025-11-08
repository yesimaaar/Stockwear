"use client"

import Image from "next/image"
import Link from "next/link"
import { Fragment, type FormEvent, useCallback, useEffect, useMemo, useState } from "react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ProductoService, type ProductoConStock } from "@/lib/services/producto-service"
import type { Categoria } from "@/lib/types"
import { cn } from "@/lib/utils"

type EstadoFiltro = "todos" | "activo" | "inactivo"
type CategoriaFiltro = "todas" | string

const getDefaultFiltros = () => ({
  estado: "todos" as EstadoFiltro,
  categoria: "todas" as CategoriaFiltro,
})

type Filtros = ReturnType<typeof getDefaultFiltros>

const getDefaultNuevoProducto = () => ({
  codigo: "",
  nombre: "",
  categoriaId: "",
  precio: "",
  descuento: "0",
  proveedor: "",
  stockMinimo: "",
  descripcion: "",
  imagen: "",
})

type NuevoProductoForm = ReturnType<typeof getDefaultNuevoProducto>

export default function ProductosPage() {
  const { toast } = useToast()
  const [productos, setProductos] = useState<ProductoConStock[]>([])
  const [filteredProductos, setFilteredProductos] = useState<ProductoConStock[]>([])
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [filters, setFilters] = useState<Filtros>(getDefaultFiltros)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState<Filtros>(getDefaultFiltros)
  const [formOpen, setFormOpen] = useState(false)
  const [savingProducto, setSavingProducto] = useState(false)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loadingCategorias, setLoadingCategorias] = useState(true)
  const [nuevoProducto, setNuevoProducto] = useState<NuevoProductoForm>(getDefaultNuevoProducto)

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

  useEffect(() => {
    let active = true

    const loadCategorias = async () => {
      setLoadingCategorias(true)
      try {
        const data = await ProductoService.getCategoriasActivas()
        if (active) {
          setCategorias(data)
        }
      } catch (error) {
        if (active) {
          console.error("Error cargando categorías", error)
          toast({
            title: "No se pudieron cargar las categorías",
            description: "Refresca la página o inténtalo más tarde.",
            variant: "destructive",
          })
        }
      } finally {
        if (active) {
          setLoadingCategorias(false)
        }
      }
    }

    void loadCategorias()

    return () => {
      active = false
    }
  }, [toast])

  const ejecutarBusqueda = useCallback(() => {
    setSearchQuery(searchInput.trim())
  }, [searchInput])

  useEffect(() => {
    if (!filterSheetOpen) {
      setDraftFilters({ ...filters })
    }
  }, [filterSheetOpen, filters])

  useEffect(() => {
    const normalized = searchQuery.toLowerCase()

    const resultados = productos.filter((producto) => {
      if (filters.estado !== "todos" && producto.estado !== filters.estado) {
        return false
      }

      if (filters.categoria !== "todas" && producto.categoria !== filters.categoria) {
        return false
      }

      if (normalized.length === 0) {
        return true
      }

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
  }, [filters, productos, searchQuery])

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

  const availableCategories = useMemo(() => {
    const unique = new Set<string>()
    productos.forEach((producto) => {
      if (producto.categoria) {
        unique.add(producto.categoria)
      }
    })
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
  }, [productos])

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.estado !== "todos") count += 1
    if (filters.categoria !== "todas") count += 1
    return count
  }, [filters])

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

  const handleDialogOpenChange = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setSavingProducto(false)
      setNuevoProducto(getDefaultNuevoProducto())
    }
  }

  const onSubmitNuevoProducto = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!nuevoProducto.categoriaId) {
      toast({
        title: "Selecciona una categoría",
        description: "Todos los productos deben pertenecer a una categoría.",
        variant: "destructive",
      })
      return
    }

    const precio = Number(nuevoProducto.precio)
    const descuento = nuevoProducto.descuento ? Number(nuevoProducto.descuento) : 0
    const stockMinimo = Number(nuevoProducto.stockMinimo)
    const categoriaId = Number(nuevoProducto.categoriaId)

    if (Number.isNaN(precio) || precio <= 0) {
      toast({
        title: "Precio inválido",
        description: "Ingresa un precio mayor a cero.",
        variant: "destructive",
      })
      return
    }

    if (Number.isNaN(stockMinimo) || stockMinimo < 0) {
      toast({
        title: "Stock mínimo inválido",
        description: "El stock mínimo no puede ser negativo.",
        variant: "destructive",
      })
      return
    }

    setSavingProducto(true)
    try {
      const payload = {
        codigo: nuevoProducto.codigo.trim(),
        nombre: nuevoProducto.nombre.trim(),
        categoriaId,
        descripcion: nuevoProducto.descripcion.trim() || null,
        precio,
        descuento: Number.isNaN(descuento) ? 0 : descuento,
        proveedor: nuevoProducto.proveedor.trim() || null,
        imagen: nuevoProducto.imagen.trim() || null,
        stockMinimo,
        estado: "activo" as const,
      }

      const creado = await ProductoService.create(payload)

      if (!creado) {
        toast({
          title: "No se pudo guardar",
          description: "Supabase devolvió un error al crear el producto.",
          variant: "destructive",
        })
        setSavingProducto(false)
        return
      }

      toast({
        title: "Producto registrado",
        description: `${creado.nombre} se añadió al inventario`,
      })

      handleDialogOpenChange(false)
      await cargarProductos()
    } catch (error) {
      console.error("Error creando producto", error)
      toast({
        title: "Error inesperado",
        description: "Revisa la consola para más detalles.",
        variant: "destructive",
      })
    } finally {
      setSavingProducto(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
  <main className="mx-auto w-full max-w-[88rem] px-3 py-5 space-y-4 sm:px-4 sm:py-6 sm:space-y-5">
        <div className="rounded-2xl border border-border bg-card/70 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl border border-border bg-background/60 hover:bg-background"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Package className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Inventario
                  </p>
                  <h1 className="text-lg font-semibold text-foreground sm:text-xl">Productos y stock</h1>
                </div>
              </div>
            </div>
            <Button
              className="rounded-xl px-4"
              onClick={() => handleDialogOpenChange(true)}
              type="button"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo producto
            </Button>
          </div>

          <div className="border-t border-border/80 px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(event) => {
                      const value = event.target.value
                      setSearchInput(value)
                      if (value.trim().length === 0) {
                        setSearchQuery("")
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        ejecutarBusqueda()
                      }
                    }}
                    placeholder="Buscar por nombre, código o almacén..."
                    className="h-11 rounded-xl border-border bg-background/70 pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => ejecutarBusqueda()}
                  type="button"
                  className="h-11 rounded-xl border-border px-4"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Buscar
                </Button>
                <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                  <SheetTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-11 min-w-[120px] rounded-xl border-border px-4 font-medium gap-2",
                        activeFiltersCount > 0 && "border-primary text-primary",
                      )}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      Filtros
                      {activeFiltersCount > 0 && (
                        <Badge variant="secondary" className="ml-1 rounded-full px-2 text-xs">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="gap-0">
                    <SheetHeader>
                      <SheetTitle>Filtros</SheetTitle>
                      <SheetDescription>Refina la lista de productos según tu necesidad.</SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Estado</Label>
                        <Select
                          value={draftFilters.estado}
                          onValueChange={(value: EstadoFiltro) =>
                            setDraftFilters((prev) => ({ ...prev, estado: value }))
                          }
                        >
                          <SelectTrigger className="rounded-xl border-border bg-background/70">
                            <SelectValue placeholder="Selecciona un estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            <SelectItem value="activo">Solo activos</SelectItem>
                            <SelectItem value="inactivo">Solo inactivos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Categoría</Label>
                        <Select
                          value={draftFilters.categoria}
                          onValueChange={(value: CategoriaFiltro) =>
                            setDraftFilters((prev) => ({ ...prev, categoria: value }))
                          }
                        >
                          <SelectTrigger className="rounded-xl border-border bg-background/70">
                            <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todas">Todas</SelectItem>
                            {availableCategories.map((categoria) => (
                              <SelectItem key={categoria} value={categoria}>
                                {categoria}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {availableCategories.length === 0 && (
                          <p className="text-xs text-muted-foreground">No hay categorías registradas aún.</p>
                        )}
                      </div>
                    </div>
                    <SheetFooter className="flex flex-col gap-2 border-t border-border/80 bg-card/70 p-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDraftFilters(getDefaultFiltros())
                          setFilters(getDefaultFiltros())
                        }}
                        disabled={activeFiltersCount === 0}
                      >
                        Limpiar filtros
                      </Button>
                      <Button
                        onClick={() => {
                          setFilters({ ...draftFilters })
                          setFilterSheetOpen(false)
                        }}
                      >
                        Aplicar filtros
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
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
              <div key={index} className="animate-pulse rounded-md border border-border bg-card p-4">
                <div className="h-5 w-3/4 rounded bg-muted" />
                <div className="mt-3 h-4 w-full rounded bg-muted" />
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
                <TableHeader className="bg-card">
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
                          <TableRow className="bg-muted">
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
                                      className="flex items-center justify-between rounded-md border bg-background p-3"
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
      <Dialog open={formOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nuevo producto</DialogTitle>
            <DialogDescription>Registra un producto sin abandonar el listado actual.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmitNuevoProducto} className="space-y-5">
            <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
              <section className="space-y-4 rounded-xl border border-border bg-card/60 p-4">
                <header>
                  <p className="text-sm font-semibold text-foreground">Información básica</p>
                  <p className="text-xs text-muted-foreground">Completa los datos principales del producto.</p>
                </header>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nuevo-codigo">Código</Label>
                    <Input
                      id="nuevo-codigo"
                      value={nuevoProducto.codigo}
                      onChange={(event) => setNuevoProducto((prev) => ({ ...prev, codigo: event.target.value }))}
                      placeholder="ZAP-001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nuevo-nombre">Nombre</Label>
                    <Input
                      id="nuevo-nombre"
                      value={nuevoProducto.nombre}
                      onChange={(event) => setNuevoProducto((prev) => ({ ...prev, nombre: event.target.value }))}
                      placeholder="Nike Air Max 270"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nuevo-descripcion">Descripción</Label>
                  <Textarea
                    id="nuevo-descripcion"
                    value={nuevoProducto.descripcion}
                    onChange={(event) => setNuevoProducto((prev) => ({ ...prev, descripcion: event.target.value }))}
                    rows={3}
                    placeholder="Describe brevemente las características principales..."
                  />
                </div>
              </section>

              <section className="space-y-4 rounded-xl border border-border bg-card/60 p-4">
                <header>
                  <p className="text-sm font-semibold text-foreground">Categorización</p>
                  <p className="text-xs text-muted-foreground">Asigna categoría y proveedor para organizar el inventario.</p>
                </header>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select
                      value={nuevoProducto.categoriaId}
                      onValueChange={(value) => setNuevoProducto((prev) => ({ ...prev, categoriaId: value }))}
                      disabled={loadingCategorias}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingCategorias
                              ? "Cargando categorías..."
                              : categorias.length > 0
                                ? "Selecciona una categoría"
                                : "No hay categorías activas"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((categoria) => (
                          <SelectItem key={categoria.id} value={String(categoria.id)}>
                            {categoria.nombre}
                          </SelectItem>
                        ))}
                        {!loadingCategorias && categorias.length === 0 && (
                          <SelectItem value="" disabled>
                            No hay categorías activas disponibles
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {!loadingCategorias && categorias.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Crea una categoría desde la sección correspondiente antes de registrar nuevos productos.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nuevo-proveedor">Proveedor</Label>
                    <Input
                      id="nuevo-proveedor"
                      value={nuevoProducto.proveedor}
                      onChange={(event) => setNuevoProducto((prev) => ({ ...prev, proveedor: event.target.value }))}
                      placeholder="Nike, Adidas, Puma..."
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4 rounded-xl border border-border bg-card/60 p-4">
                <header>
                  <p className="text-sm font-semibold text-foreground">Precios y stock</p>
                  <p className="text-xs text-muted-foreground">Define los valores comerciales y de control.</p>
                </header>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="nuevo-precio">Precio (COP)</Label>
                    <Input
                      id="nuevo-precio"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="450000"
                      value={nuevoProducto.precio}
                      onChange={(event) => setNuevoProducto((prev) => ({ ...prev, precio: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nuevo-descuento">Descuento (%)</Label>
                    <Input
                      id="nuevo-descuento"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={nuevoProducto.descuento}
                      onChange={(event) => setNuevoProducto((prev) => ({ ...prev, descuento: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nuevo-stock-minimo">Stock mínimo</Label>
                    <Input
                      id="nuevo-stock-minimo"
                      type="number"
                      min="0"
                      placeholder="10"
                      value={nuevoProducto.stockMinimo}
                      onChange={(event) => setNuevoProducto((prev) => ({ ...prev, stockMinimo: event.target.value }))}
                      required
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-border bg-card/60 p-4">
                <header>
                  <p className="text-sm font-semibold text-foreground">Imagen opcional</p>
                  <p className="text-xs text-muted-foreground">Utiliza una URL pública para mostrar una vista previa.</p>
                </header>
                <div className="space-y-2">
                  <Label htmlFor="nuevo-imagen">URL de imagen</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="nuevo-imagen"
                      placeholder="https://..."
                      value={nuevoProducto.imagen}
                      onChange={(event) => setNuevoProducto((prev) => ({ ...prev, imagen: event.target.value }))}
                    />
                    {nuevoProducto.imagen && (
                      <div className="relative h-16 w-16 overflow-hidden rounded-md border border-border">
                        <Image
                          src={nuevoProducto.imagen}
                          alt="Vista previa"
                          fill
                          sizes="64px"
                          loading="lazy"
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sube la imagen a tu almacenamiento preferido y pega aquí la URL pública.
                  </p>
                </div>
              </section>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
                disabled={savingProducto}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  savingProducto ||
                  (!loadingCategorias && categorias.length === 0)
                }
              >
                {savingProducto ? "Guardando..." : "Guardar producto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
