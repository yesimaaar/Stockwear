"use client"

import Image from "next/image"
import Link from "next/link"
import { Fragment, type FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import * as LucideIcons from "lucide-react"
const {
  Package,
  Plus,
  Search,
  ArrowLeft,
  TriangleAlert,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Edit,
  Trash2,
  X,
} = LucideIcons
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
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProductoConStock | null>(null)
  const [deletingProducto, setDeletingProducto] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<NuevoProductoForm | null>(null)
  const [editTarget, setEditTarget] = useState<ProductoConStock | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

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

  const handleDeleteDialogChange = (open: boolean) => {
    setDeleteConfirmOpen(open)
    if (!open) {
      setDeleteTarget(null)
      setDeletingProducto(false)
    }
  }

  const abrirConfirmacionEliminar = (producto: ProductoConStock) => {
    setDeleteTarget(producto)
    setDeleteConfirmOpen(true)
  }

  const confirmarEliminarProducto = async () => {
    if (!deleteTarget) return
    const producto = deleteTarget
    setDeletingProducto(true)
    const exito = await ProductoService.delete(producto.id)
    setDeletingProducto(false)
    if (!exito) {
      toast({
        title: "No se pudo eliminar",
        description: "Ocurrió un error al actualizar el estado del producto",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Producto actualizado",
      description: `${producto.nombre} fue marcado como inactivo`,
    })

    handleDeleteDialogChange(false)
    await cargarProductos()
  }

  const handleEditDialogChange = (open: boolean) => {
    setEditDialogOpen(open)
    if (!open) {
      setEditForm(null)
      setEditTarget(null)
      setSavingEdit(false)
    }
  }

  const mapProductoToForm = (producto: ProductoConStock): NuevoProductoForm => ({
    codigo: producto.codigo,
    nombre: producto.nombre,
    categoriaId: String(producto.categoriaId),
    precio: String(producto.precio),
    descuento: String(producto.descuento ?? 0),
    proveedor: producto.proveedor ?? "",
    stockMinimo: String(producto.stockMinimo),
    descripcion: producto.descripcion ?? "",
    imagen: producto.imagen ?? "",
  })

  const buildPayloadFromForm = (form: NuevoProductoForm) => {
    if (!form.categoriaId) {
      toast({
        title: "Selecciona una categoría",
        description: "Todos los productos deben pertenecer a una categoría.",
        variant: "destructive",
      })
      return null
    }

    const precio = Number(form.precio)
    const descuento = form.descuento ? Number(form.descuento) : 0
    const stockMinimo = Number(form.stockMinimo)
    const categoriaId = Number(form.categoriaId)

    if (Number.isNaN(precio) || precio <= 0) {
      toast({
        title: "Precio inválido",
        description: "Ingresa un precio mayor a cero.",
        variant: "destructive",
      })
      return null
    }

    if (Number.isNaN(stockMinimo) || stockMinimo < 0) {
      toast({
        title: "Stock mínimo inválido",
        description: "El stock mínimo no puede ser negativo.",
        variant: "destructive",
      })
      return null
    }

    return {
      codigo: form.codigo.trim(),
      nombre: form.nombre.trim(),
      categoriaId,
      descripcion: form.descripcion.trim() || null,
      precio,
      descuento: Number.isNaN(descuento) ? 0 : descuento,
      proveedor: form.proveedor.trim() || null,
      imagen: form.imagen.trim() || null,
      stockMinimo,
    }
  }

  const abrirEdicionProducto = (producto: ProductoConStock) => {
    setEditTarget(producto)
    setEditForm(mapProductoToForm(producto))
    setEditDialogOpen(true)
  }

  const updateEditFormField = <K extends keyof NuevoProductoForm>(field: K, value: NuevoProductoForm[K]) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

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

  const clearSearchInput = () => {
    setSearchInput("")
    setSearchQuery("")
  }

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

    const payload = buildPayloadFromForm(nuevoProducto)
    if (!payload) return

    setSavingProducto(true)
    try {
      const creado = await ProductoService.create({ ...payload, estado: "activo" as const })

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

  const onSubmitEditarProducto = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editForm || !editTarget) return

    const payload = buildPayloadFromForm(editForm)
    if (!payload) return

    setSavingEdit(true)
    try {
      const actualizado = await ProductoService.update(editTarget.id, payload)
      if (!actualizado) {
        toast({
          title: "No se pudo actualizar",
          description: "Supabase devolvió un error al guardar los cambios.",
          variant: "destructive",
        })
        setSavingEdit(false)
        return
      }

      toast({
        title: "Producto actualizado",
        description: `${payload.nombre} se guardó correctamente`,
      })

      handleEditDialogChange(false)
      await cargarProductos()
    } catch (error) {
      console.error("Error actualizando producto", error)
      toast({
        title: "Error inesperado",
        description: "Revisa la consola para más detalles.",
        variant: "destructive",
      })
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
  <main className="mx-auto w-full max-w-[88rem] px-3 py-3 space-y-4 sm:px-4 sm:py-4 sm:space-y-5">
        <div className="rounded-2xl border border-border bg-card/70 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-5 sm:py-3">
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

          <div className="border-t border-border/80 px-4 py-2 sm:px-5 sm:py-3">
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
                    className="h-11 rounded-xl border-border bg-background/70 pl-10 pr-11"
                  />
                  {searchInput ? (
                    <button
                      type="button"
                      onClick={clearSearchInput}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      aria-label="Limpiar búsqueda"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
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
              <TriangleAlert className="h-5 w-5 text-yellow-600" />
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
                              <div className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                                <Image
                                  src={producto.imagen || "/placeholder.svg"}
                                  alt={producto.nombre}
                                  fill
                                  sizes="48px"
                                  className="object-cover transition-transform duration-200 group-hover:scale-110"
                                />
                              </div>
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
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-lg"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  abrirEdicionProducto(producto)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Editar</span>
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-9 w-9 rounded-lg"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  abrirConfirmacionEliminar(producto)
                                }}
                                disabled={deletingProducto && deleteTarget?.id === producto.id}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Eliminar</span>
                              </Button>
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
                              <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                                <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card/70 p-4 sm:flex-row">
                                  <div className="relative h-28 w-full overflow-hidden rounded-md bg-muted sm:h-32 sm:w-40">
                                    <Image
                                      src={producto.imagen || "/placeholder.svg"}
                                      alt={producto.nombre}
                                      fill
                                      sizes="(min-width: 640px) 160px, 100vw"
                                      className="object-cover"
                                    />
                                  </div>
                                  <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>
                                      <span className="font-semibold text-foreground">Descripción: </span>
                                      {producto.descripcion ? producto.descripcion : "Sin descripción"}
                                    </p>
                                    <p>
                                      <span className="font-semibold text-foreground">Proveedor: </span>
                                      {producto.proveedor ? producto.proveedor : "No especificado"}
                                    </p>
                                    <p>
                                      <span className="font-semibold text-foreground">Creado: </span>
                                      {new Date(producto.createdAt).toLocaleDateString("es-CO")}
                                    </p>
                                  </div>
                                </div>
                                <div className="grid gap-2 rounded-lg border border-border/70 bg-card/70 p-4 text-sm">
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Precio base</span>
                                    <span className="font-semibold text-foreground">
                                      ${producto.precio.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Descuento</span>
                                    <span className="font-semibold text-foreground">{producto.descuento}%</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Estado</span>
                                    <Badge variant={producto.estado === "activo" ? "default" : "secondary"}>
                                      {producto.estado.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Stock total</span>
                                    <span className="font-semibold text-foreground">{producto.stockTotal} u.</span>
                                  </div>
                                </div>
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
      <Dialog open={editDialogOpen} onOpenChange={handleEditDialogChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
            <DialogDescription>Realiza cambios sin salir del listado.</DialogDescription>
          </DialogHeader>
          {editForm ? (
            <form onSubmit={onSubmitEditarProducto} className="space-y-5">
              <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
                <section className="space-y-4 rounded-xl border border-border bg-card/60 p-4">
                  <header>
                    <p className="text-sm font-semibold text-foreground">Información básica</p>
                    <p className="text-xs text-muted-foreground">Actualiza los datos principales del producto.</p>
                  </header>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="editar-codigo">Código</Label>
                      <Input
                        id="editar-codigo"
                        value={editForm.codigo}
                        onChange={(event) => updateEditFormField("codigo", event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editar-nombre">Nombre</Label>
                      <Input
                        id="editar-nombre"
                        value={editForm.nombre}
                        onChange={(event) => updateEditFormField("nombre", event.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editar-descripcion">Descripción</Label>
                    <Textarea
                      id="editar-descripcion"
                      value={editForm.descripcion}
                      onChange={(event) => updateEditFormField("descripcion", event.target.value)}
                      rows={3}
                    />
                  </div>
                </section>

                <section className="space-y-4 rounded-xl border border-border bg-card/60 p-4">
                  <header>
                    <p className="text-sm font-semibold text-foreground">Categorización</p>
                    <p className="text-xs text-muted-foreground">Gestiona la categoría y proveedor.</p>
                  </header>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Categoría</Label>
                      <Select
                        value={editForm.categoriaId}
                        onValueChange={(value) => updateEditFormField("categoriaId", value)}
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
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editar-proveedor">Proveedor</Label>
                      <Input
                        id="editar-proveedor"
                        value={editForm.proveedor}
                        onChange={(event) => updateEditFormField("proveedor", event.target.value)}
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-4 rounded-xl border border-border bg-card/60 p-4">
                  <header>
                    <p className="text-sm font-semibold text-foreground">Precios y stock</p>
                    <p className="text-xs text-muted-foreground">Ajusta los valores comerciales.</p>
                  </header>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="editar-precio">Precio (COP)</Label>
                      <Input
                        id="editar-precio"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.precio}
                        onChange={(event) => updateEditFormField("precio", event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editar-descuento">Descuento (%)</Label>
                      <Input
                        id="editar-descuento"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.descuento}
                        onChange={(event) => updateEditFormField("descuento", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editar-stock-minimo">Stock mínimo</Label>
                      <Input
                        id="editar-stock-minimo"
                        type="number"
                        min="0"
                        value={editForm.stockMinimo}
                        onChange={(event) => updateEditFormField("stockMinimo", event.target.value)}
                        required
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-3 rounded-xl border border-border bg-card/60 p-4">
                  <header>
                    <p className="text-sm font-semibold text-foreground">Imagen</p>
                    <p className="text-xs text-muted-foreground">Actualiza la vista previa del producto.</p>
                  </header>
                  <div className="space-y-2">
                    <Label htmlFor="editar-imagen">URL de imagen</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="editar-imagen"
                        value={editForm.imagen}
                        onChange={(event) => updateEditFormField("imagen", event.target.value)}
                      />
                      {editForm.imagen && (
                        <div className="relative h-16 w-16 overflow-hidden rounded-md border border-border">
                          <Image
                            src={editForm.imagen}
                            alt="Vista previa"
                            fill
                            sizes="64px"
                            loading="lazy"
                            className="object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => handleEditDialogChange(false)} disabled={savingEdit}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingEdit || (!loadingCategorias && categorias.length === 0)}>
                  {savingEdit ? "Guardando..." : "Guardar cambios"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este producto?</AlertDialogTitle>
            <AlertDialogDescription>
              El producto se marcará como inactivo y dejará de mostrarse en el inventario activo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingProducto}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive"
              disabled={deletingProducto}
              onClick={(event) => {
                event.preventDefault()
                void confirmarEliminarProducto()
              }}
            >
              {deletingProducto ? "Eliminando…" : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
