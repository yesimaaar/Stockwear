"use client"

import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Fragment, type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { AdminSectionLayout } from "@/components/domain/admin-section-layout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Package,
  Plus,
  TriangleAlert,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ProductoService, type ProductoConStock } from "@/features/productos/services/producto-service"
import { InventarioService } from "@/features/movimientos/services/inventario-service"
import { uploadProductImage } from "@/features/productos/services/product-image-service"
import {
  deleteReferenceImage,
  regenerateProductEmbeddings,
  uploadReferenceImage,
} from "@/features/productos/services/product-reference-service"
import type { Almacen, Categoria, ProductoReferenceImage, Talla } from "@/lib/types"
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
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group"
import { PRODUCT_COLORS } from "@/lib/colors"

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
  precio_base: "",
  descuento: "0",
  proveedor: "",
  marca: "",
  stockMinimo: "",
  descripcion: "",
  imagen: "",
  color: "",
})

type NuevoProductoForm = ReturnType<typeof getDefaultNuevoProducto>

type ReferenceDraft = { file: File; preview: string }

type DeleteMode = "inactive" | "hard"

const STOCK_ALMACEN_NONE_VALUE = "none" as const
const STOCK_TALLA_NONE_VALUE = "none" as const

type StockFormEntry = {
  almacenId: string
  tallaId: string
  cantidad: string
}

const createEmptyStockEntry = (): StockFormEntry => ({
  almacenId: "",
  tallaId: STOCK_TALLA_NONE_VALUE,
  cantidad: "",
})

export default function ProductosPage() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [productos, setProductos] = useState<ProductoConStock[]>([])
  const [filteredProductos, setFilteredProductos] = useState<ProductoConStock[]>([])
  const [searchQuery, setSearchQuery] = useState(() => (searchParams.get("q") ?? "").trim())
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [filters] = useState<Filtros>(getDefaultFiltros)
  const [formOpen, setFormOpen] = useState(false)
  const [savingProducto, setSavingProducto] = useState(false)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loadingCategorias, setLoadingCategorias] = useState(true)
  const [almacenesActivos, setAlmacenesActivos] = useState<Almacen[]>([])
  const [tallasActivas, setTallasActivas] = useState<Talla[]>([])
  const [loadingStockCatalogos, setLoadingStockCatalogos] = useState(true)
  const [nuevoProducto, setNuevoProducto] = useState<NuevoProductoForm>(getDefaultNuevoProducto)
  const [nuevoStockEntries, setNuevoStockEntries] = useState<StockFormEntry[]>([])
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProductoConStock | null>(null)
  const [deleteMode, setDeleteMode] = useState<DeleteMode>("inactive")
  const [deletingProducto, setDeletingProducto] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<NuevoProductoForm | null>(null)
  const [editTarget, setEditTarget] = useState<ProductoConStock | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [uploadingEditImage, setUploadingEditImage] = useState(false)
  const [uploadingNewImage, setUploadingNewImage] = useState(false)
  const [newReferenceDrafts, setNewReferenceDrafts] = useState<ReferenceDraft[]>([])
  const [uploadingNewReferences, setUploadingNewReferences] = useState(false)
  const [editReferenceDrafts, setEditReferenceDrafts] = useState<ReferenceDraft[]>([])
  const [uploadingEditReferences, setUploadingEditReferences] = useState(false)
  const [editReferenceImages, setEditReferenceImages] = useState<ProductoReferenceImage[]>([])
  const [editStockEntries, setEditStockEntries] = useState<StockFormEntry[]>([])
  const [removingReferenceId, setRemovingReferenceId] = useState<number | null>(null)
  const [regeneratingEmbeddings, setRegeneratingEmbeddings] = useState(false)
  const [lowStockDismissed, setLowStockDismissed] = useState(false)
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
      setDeleteMode("inactive")
    }
  }

  const abrirConfirmacionEliminar = (producto: ProductoConStock) => {
    setDeleteTarget(producto)
    setDeleteMode("inactive")
    setDeleteConfirmOpen(true)
  }

  const confirmarEliminarProducto = async () => {
    if (!deleteTarget) return
    const producto = deleteTarget
    setDeletingProducto(true)
    const exito = await ProductoService.delete(producto.id, {
      mode: deleteMode,
    })
    setDeletingProducto(false)
    if (!exito) {
      toast({
        title: "No se pudo eliminar",
        description:
          deleteMode === "hard"
            ? "No fue posible eliminar el producto de forma definitiva."
            : "Ocurrió un error al actualizar el estado del producto.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: deleteMode === "hard" ? "Producto eliminado" : "Producto actualizado",
      description:
        deleteMode === "hard"
          ? `${producto.nombre} se eliminó definitivamente del inventario.`
          : `${producto.nombre} fue marcado como inactivo`,
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
      editReferenceDrafts.forEach((draft) => URL.revokeObjectURL(draft.preview))
      setEditReferenceDrafts([])
      setEditReferenceImages([])
      setUploadingEditReferences(false)
      setRemovingReferenceId(null)
      setRegeneratingEmbeddings(false)
      setEditStockEntries([])
    }
  }

  const mapProductoToForm = useCallback((producto: ProductoConStock): NuevoProductoForm => ({
    codigo: producto.codigo,
    nombre: producto.nombre,
    categoriaId: String(producto.categoriaId),
    precio: String(producto.precio),
    precio_base: String(producto.precio_base ?? 0),
    descuento: String(producto.descuento ?? 0),
    proveedor: producto.proveedor ?? "",
    marca: producto.marca ?? "",
    stockMinimo: String(producto.stockMinimo),
    descripcion: producto.descripcion ?? "",
    imagen: producto.imagen ?? "",
    color: producto.color ?? "",
  }), [])

  const mapReferenceRecord = (record: any): ProductoReferenceImage | null => {
    const rawId = record?.id
    const parsedId =
      typeof rawId === "number"
        ? rawId
        : typeof rawId === "string"
          ? Number(rawId)
          : Number.NaN

    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      console.warn("Referencia recibida sin identificador válido", record)
      return null
    }

    const productIdCandidate =
      typeof record?.productoId === "number"
        ? record.productoId
        : typeof record?.productoId === "string"
          ? Number(record.productoId)
          : undefined

    return {
      id: parsedId,
      productoId: productIdCandidate && Number.isFinite(productIdCandidate) ? productIdCandidate : editTarget?.id ?? 0,
      url: record?.url ?? "",
      path: record?.path ?? "",
      bucket: record?.bucket ?? null,
      filename: record?.filename ?? null,
      mimeType: record?.mimeType ?? null,
      size:
        typeof record?.size === "number"
          ? record.size
          : record?.size != null
            ? Number(record.size)
            : null,
      createdAt: record?.createdAt ?? new Date().toISOString(),
      updatedAt: record?.updatedAt ?? new Date().toISOString(),
    }
  }

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
      precio_base: Number(form.precio_base) || 0,
      descuento: Number.isNaN(descuento) ? 0 : descuento,
      proveedor: form.proveedor.trim() || null,
      marca: form.marca.trim() || null,
      imagen: form.imagen.trim() || null,
      stockMinimo,
      color: form.color || null,
    }
  }

  const getAlmacenNombre = (almacenId: number | null) => {
    if (almacenId == null) return "Sin almacén específico"
    return (
      almacenesActivos.find((almacen) => almacen.id === almacenId)?.nombre ??
      `Almacén #${almacenId}`
    )
  }

  const getTallaNombre = (tallaId: number | null) => {
    if (tallaId == null) return "Sin talla asignada"
    return tallasActivas.find((talla) => talla.id === tallaId)?.nombre ?? `Talla #${tallaId}`
  }

  const describeStockDestino = (almacenId: number | null, tallaId: number | null) => {
    const almacen = getAlmacenNombre(almacenId)
    const talla = getTallaNombre(tallaId)
    return tallaId == null ? almacen : `${almacen} · ${talla}`
  }

  const normalizeStockEntries = (
    entries: StockFormEntry[],
    options: { allowZero: boolean },
  ): Array<{ almacenId: number | null; tallaId: number | null; cantidad: number }> | null => {
    const aggregated = new Map<string, { almacenId: number | null; tallaId: number | null; cantidad: number }>()

    for (const entry of entries) {
      const rawCantidad = entry.cantidad.trim()
      const hasCantidad = rawCantidad.length > 0
      const hasAlmacen = entry.almacenId.trim().length > 0
      const tallaSeleccionada = entry.tallaId && entry.tallaId !== STOCK_TALLA_NONE_VALUE

      if (!hasCantidad && !hasAlmacen && !tallaSeleccionada) {
        continue
      }

      if (!hasAlmacen) {
        toast({
          title: "Selecciona un almacén",
          description: "Elige dónde se ubicará este stock.",
          variant: "destructive",
        })
        return null
      }

      if (!hasCantidad) {
        toast({
          title: "Cantidad requerida",
          description: "Escribe cuántas unidades registrarás para el producto.",
          variant: "destructive",
        })
        return null
      }

      const cantidad = Number(rawCantidad)
      if (!Number.isFinite(cantidad) || cantidad < 0) {
        toast({
          title: "Cantidad inválida",
          description: "Las unidades deben ser un número mayor o igual a cero.",
          variant: "destructive",
        })
        return null
      }

      if (!Number.isInteger(cantidad)) {
        toast({
          title: "Cantidad inválida",
          description: "Las unidades deben ser un número entero.",
          variant: "destructive",
        })
        return null
      }

      if (!options.allowZero && cantidad === 0) {
        continue
      }

      let almacenId: number | null
      if (entry.almacenId === STOCK_ALMACEN_NONE_VALUE) {
        almacenId = null
      } else {
        const parsedAlmacen = Number(entry.almacenId)
        if (!Number.isFinite(parsedAlmacen) || parsedAlmacen <= 0) {
          toast({
            title: "Almacén inválido",
            description: "Selecciona un almacén válido para registrar el stock.",
            variant: "destructive",
          })
          return null
        }
        almacenId = parsedAlmacen
      }

      let tallaId: number | null
      if (!entry.tallaId || entry.tallaId === STOCK_TALLA_NONE_VALUE) {
        tallaId = null
      } else {
        const parsedTalla = Number(entry.tallaId)
        if (!Number.isFinite(parsedTalla) || parsedTalla <= 0) {
          toast({
            title: "Talla inválida",
            description: "Selecciona una talla válida o deja la opción sin talla.",
            variant: "destructive",
          })
          return null
        }
        tallaId = parsedTalla
      }

      const key = `${almacenId ?? "none"}-${tallaId ?? "none"}`
      const current = aggregated.get(key)
      if (current) {
        aggregated.set(key, {
          almacenId,
          tallaId,
          cantidad: current.cantidad + cantidad,
        })
      } else {
        aggregated.set(key, { almacenId, tallaId, cantidad })
      }
    }

    return Array.from(aggregated.values())
  }

  const addNuevoStockEntry = () => {
    setNuevoStockEntries((prev) => [...prev, createEmptyStockEntry()])
  }

  const updateNuevoStockEntry = (index: number, field: keyof StockFormEntry, value: string) => {
    setNuevoStockEntries((prev) =>
      prev.map((entry, idx) => (idx === index ? { ...entry, [field]: value } : entry)),
    )
  }

  const removeNuevoStockEntry = (index: number) => {
    setNuevoStockEntries((prev) => prev.filter((_, idx) => idx !== index))
  }

  const addEditStockEntry = () => {
    setEditStockEntries((prev) => [...prev, createEmptyStockEntry()])
  }

  const updateEditStockEntry = (index: number, field: keyof StockFormEntry, value: string) => {
    setEditStockEntries((prev) =>
      prev.map((entry, idx) => (idx === index ? { ...entry, [field]: value } : entry)),
    )
  }

  const removeEditStockEntry = (index: number) => {
    setEditStockEntries((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleNewReferenceFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) {
      return
    }

    const drafts = files.map<ReferenceDraft>((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))

    setNewReferenceDrafts((prev) => [...prev, ...drafts])
    event.target.value = ""
  }

  const handleRemoveNewReferenceDraft = (index: number) => {
    setNewReferenceDrafts((prev) => {
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      if (removed) {
        URL.revokeObjectURL(removed.preview)
      }
      return next
    })
  }

  const handleEditReferenceFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) {
      return
    }

    const drafts = files.map<ReferenceDraft>((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))

    setEditReferenceDrafts((prev) => [...prev, ...drafts])
    event.target.value = ""
  }

  const handleRemoveEditReferenceDraft = (index: number) => {
    setEditReferenceDrafts((prev) => {
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      if (removed) {
        URL.revokeObjectURL(removed.preview)
      }
      return next
    })
  }

  const handleDeleteReference = async (referenceId: number) => {
    try {
      const safeId = Number(referenceId)
      if (!Number.isFinite(safeId) || safeId <= 0) {
        toast({
          title: "No se pudo eliminar la referencia",
          description: "El identificador de la imagen no es válido.",
          variant: "destructive",
        })
        return
      }
      setRemovingReferenceId(safeId)
      await deleteReferenceImage(safeId)
      setEditReferenceImages((prev) => prev.filter((item) => item.id !== safeId))
      setEditTarget((prev) =>
        prev
          ? {
            ...prev,
            referenceImages: prev.referenceImages?.filter((item) => item.id !== safeId),
          }
          : prev,
      )
      toast({
        title: "Referencia eliminada",
        description: "La imagen de referencia se eliminó correctamente.",
      })
    } catch (error) {
      console.error("Error eliminando imagen de referencia", error)
      toast({
        title: "No se pudo eliminar la referencia",
        description: error instanceof Error ? error.message : "Intenta nuevamente",
        variant: "destructive",
      })
    } finally {
      setRemovingReferenceId(null)
    }
  }

  const handleRegenerateEmbeddings = async () => {
    if (!editTarget) return
    try {
      setRegeneratingEmbeddings(true)
      const result = await regenerateProductEmbeddings(editTarget.id)
      toast({
        title: "Embeddings regenerados",
        description:
          result.processed === 0
            ? "No se generaron embeddings porque no hay referencias."
            : `${result.processed} referencia${result.processed === 1 ? "" : "s"} procesada${result.processed === 1 ? "" : "s"
            } correctamente`,
      })
      if (Array.isArray((result as any)?.failures) && (result as any).failures.length > 0) {
        const failures = (result as any).failures as Array<{ id: number; reason: string }>
        toast({
          title: "Algunas referencias no generaron embeddings",
          description: failures
            .slice(0, 3)
            .map((failure) => `Referencia ${failure.id}: ${failure.reason}`)
            .join(" | "),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error regenerando embeddings", error)
      toast({
        title: "No se pudieron regenerar los embeddings",
        description: error instanceof Error ? error.message : "Intenta nuevamente",
        variant: "destructive",
      })
    } finally {
      setRegeneratingEmbeddings(false)
    }
  }

  const abrirEdicionProducto = useCallback((producto: ProductoConStock) => {
    setEditTarget(producto)
    setEditForm(mapProductoToForm(producto))
    setEditReferenceImages(producto.referenceImages ?? [])
    setEditReferenceDrafts((prev) => {
      prev.forEach((draft) => URL.revokeObjectURL(draft.preview))
      return []
    })
    setEditStockEntries(
      (producto.stockPorTalla ?? []).map((detalle) => ({
        almacenId:
          detalle.almacenId == null
            ? STOCK_ALMACEN_NONE_VALUE
            : String(detalle.almacenId),
        tallaId:
          detalle.tallaId == null
            ? STOCK_TALLA_NONE_VALUE
            : String(detalle.tallaId),
        cantidad: String(detalle.cantidad ?? 0),
      }))
    )
    setRemovingReferenceId(null)
    setRegeneratingEmbeddings(false)
    setEditDialogOpen(true)
  }, [mapProductoToForm])

  const updateEditFormField = <K extends keyof NuevoProductoForm>(field: K, value: NuevoProductoForm[K]) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  useEffect(() => {
    void cargarProductos()
  }, [cargarProductos])

  useEffect(() => {
    return () => {
      newReferenceDrafts.forEach((draft) => URL.revokeObjectURL(draft.preview))
    }
  }, [newReferenceDrafts])

  useEffect(() => {
    return () => {
      editReferenceDrafts.forEach((draft) => URL.revokeObjectURL(draft.preview))
    }
  }, [editReferenceDrafts])

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

  useEffect(() => {
    let active = true

    const loadStockCatalogos = async () => {
      setLoadingStockCatalogos(true)
      try {
        const [tallas, almacenes] = await Promise.all([
          InventarioService.getTallasActivas(),
          InventarioService.getAlmacenesActivos(),
        ])
        if (!active) return
        setTallasActivas(tallas)
        setAlmacenesActivos(almacenes)
      } catch (error) {
        if (active) {
          console.error("Error cargando catálogos de inventario", error)
          toast({
            title: "No se cargaron los catálogos",
            description: "Actualiza la página e inténtalo nuevamente.",
            variant: "destructive",
          })
        }
      } finally {
        if (active) {
          setLoadingStockCatalogos(false)
        }
      }
    }

    void loadStockCatalogos()

    return () => {
      active = false
    }
  }, [toast])

  useEffect(() => {
    const nextQuery = (searchParams.get("q") ?? "").trim()
    setSearchQuery((current) => (current === nextQuery ? current : nextQuery))
  }, [searchParams])

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
      const marca = (producto.marca ?? "").toLowerCase()
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
        marca.includes(normalized) ||
        coincideStock
      )
    })

    setFilteredProductos(resultados)
  }, [filters, productos, searchQuery])

  // Reset page only when filters or search query change
  useEffect(() => {
    setPage(1)
  }, [filters, searchQuery])

  useEffect(() => {
    const idParam = searchParams.get("id")
    if (idParam && filteredProductos.length > 0) {
      const id = Number(idParam)
      const target = filteredProductos.find((p) => p.id === id)
      if (target) {
        setExpanded(id)
        const index = filteredProductos.indexOf(target)
        setPage(Math.floor(index / pageSize) + 1)
      }
    }
  }, [filteredProductos, searchParams, pageSize])

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

  useEffect(() => {
    if (totalStockBajo > 0) {
      setLowStockDismissed(false)
    }
  }, [totalStockBajo])

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
      newReferenceDrafts.forEach((draft) => URL.revokeObjectURL(draft.preview))
      setNewReferenceDrafts([])
      setUploadingNewReferences(false)
      setNuevoStockEntries([])
    }
  }

  const onSubmitNuevoProducto = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const payload = buildPayloadFromForm(nuevoProducto)
    if (!payload) return

    const normalizedNewStock = normalizeStockEntries(nuevoStockEntries, { allowZero: false })
    if (normalizedNewStock === null) {
      return
    }

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

      let referenceSuccess = 0
      const referenceErrors: Array<{ name: string; message: string }> = []
      let stockSuccess = 0
      const stockErrors: string[] = []
      if (newReferenceDrafts.length > 0) {
        setUploadingNewReferences(true)
        try {
          for (const draft of newReferenceDrafts) {
            try {
              const response = await uploadReferenceImage(creado.id, draft.file, {
                productCode: nuevoProducto.codigo,
              })
              if (!response?.embedding) {
                referenceErrors.push({
                  name: draft.file.name,
                  message:
                    response?.embeddingError ??
                    response?.message ??
                    "La imagen se guardó, pero no se pudo generar el embedding automáticamente.",
                })
              }
              referenceSuccess += 1
            } catch (uploadError) {
              console.error("Error subiendo imagen de referencia", uploadError)
              referenceErrors.push({
                name: draft.file.name,
                message:
                  uploadError instanceof Error ? uploadError.message : "No se pudo procesar la imagen de referencia",
              })
            } finally {
              URL.revokeObjectURL(draft.preview)
            }
          }
        } finally {
          setNewReferenceDrafts([])
          setUploadingNewReferences(false)
        }
      }

      toast({
        title: "Producto registrado",
        description: `${creado.nombre} se añadió al inventario`,
      })

      if (normalizedNewStock.length > 0) {
        for (const entry of normalizedNewStock) {
          try {
            await InventarioService.registrarEntrada({
              productoId: creado.id,
              tallaId: entry.tallaId,
              almacenId: entry.almacenId,
              cantidad: entry.cantidad,
              motivo: "Registro inicial desde producto",
            })
            stockSuccess += 1
          } catch (stockError) {
            console.error("Error registrando stock inicial", stockError)
            stockErrors.push(
              `${describeStockDestino(entry.almacenId, entry.tallaId)}: ${stockError instanceof Error ? stockError.message : "No se pudo guardar el stock inicial"
              }`,
            )
          }
        }
      }

      if (referenceSuccess > 0) {
        toast({
          title: referenceSuccess === 1 ? "Imagen de referencia registrada" : "Imágenes de referencia registradas",
          description: `${referenceSuccess} referencia${referenceSuccess > 1 ? "s" : ""} procesada${referenceSuccess > 1 ? "s" : ""
            } correctamente`,
        })
      }

      if (stockSuccess > 0) {
        toast({
          title: stockSuccess === 1 ? "Stock inicial registrado" : "Stock inicial registrado",
          description: `${stockSuccess} asignación${stockSuccess === 1 ? "" : "es"} de inventario aplicada correctamente`,
        })
      }

      if (referenceErrors.length > 0) {
        toast({
          title: "Algunas referencias no se procesaron",
          description: referenceErrors
            .map((item) => `${item.name}: ${item.message}`)
            .slice(0, 3)
            .join(" | "),
          variant: "destructive",
        })
      }

      if (stockErrors.length > 0) {
        toast({
          title: "No se registró parte del stock",
          description: stockErrors.slice(0, 3).join(" | "),
          variant: "destructive",
        })
      }

      handleDialogOpenChange(false)
      await cargarProductos()
    } catch (error) {
      console.error("Error creando producto", error)
      toast({
        title: "Error al crear producto",
        description: error instanceof Error ? error.message : "Revisa la consola para más detalles.",
        variant: "destructive",
      })
    } finally {
      setSavingProducto(false
      )
    }
  }

  const onSubmitEditarProducto = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editForm || !editTarget) return

    const payload = buildPayloadFromForm(editForm)
    if (!payload) return
    const normalizedEditStock = normalizeStockEntries(editStockEntries, { allowZero: true })
    if (normalizedEditStock === null) {
      return
    }

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

      let referenceSuccess = 0
      const referenceErrors: Array<{ name: string; message: string }> = []
      const newReferenceRecords: ProductoReferenceImage[] = []
      let stockAdjustSuccess = 0
      const stockAdjustErrors: string[] = []

      if (editReferenceDrafts.length > 0) {
        setUploadingEditReferences(true)
        try {
          for (const draft of editReferenceDrafts) {
            try {
              const response = await uploadReferenceImage(editTarget.id, draft.file, {
                productCode: editForm.codigo,
              })
              if (response?.referenceImage) {
                const mapped = mapReferenceRecord(response.referenceImage)
                if (mapped) {
                  newReferenceRecords.push(mapped)
                } else {
                  referenceErrors.push({
                    name: draft.file.name,
                    message: "La referencia se registró pero no devolvió un identificador válido.",
                  })
                }
              }
              if (!response?.embedding) {
                referenceErrors.push({
                  name: draft.file.name,
                  message:
                    response?.embeddingError ??
                    response?.message ??
                    "La imagen se guardó, pero no se pudo generar el embedding automáticamente.",
                })
              }
              referenceSuccess += 1
            } catch (uploadError) {
              console.error("Error subiendo imagen de referencia", uploadError)
              referenceErrors.push({
                name: draft.file.name,
                message:
                  uploadError instanceof Error ? uploadError.message : "No se pudo procesar la imagen de referencia",
              })
            } finally {
              URL.revokeObjectURL(draft.preview)
            }
          }
        } finally {
          setEditReferenceDrafts([])
          setUploadingEditReferences(false)
        }
      }

      if (newReferenceRecords.length > 0) {
        setEditReferenceImages((prev) => [...prev, ...newReferenceRecords])
        setEditTarget((prev) =>
          prev
            ? {
              ...prev,
              referenceImages: [...(prev.referenceImages ?? []), ...newReferenceRecords],
            }
            : prev,
        )
      }

      toast({
        title: "Producto actualizado",
        description: `${payload.nombre} se guardó correctamente`,
      })

      if (referenceSuccess > 0) {
        toast({
          title: referenceSuccess === 1 ? "Referencia registrada" : "Referencias registradas",
          description: `${referenceSuccess} referencia${referenceSuccess === 1 ? "" : "s"} procesada${referenceSuccess === 1 ? "" : "s"
            } correctamente`,
        })
      }

      if (referenceErrors.length > 0) {
        toast({
          title: "Algunas referencias no se procesaron",
          description: referenceErrors
            .map((item) => `${item.name}: ${item.message}`)
            .slice(0, 3)
            .join(" | "),
          variant: "destructive",
        })
      }

      if (normalizedEditStock.length > 0 || (editTarget.stockPorTalla?.length ?? 0) > 0) {
        const existingMap = new Map<string, { almacenId: number | null; tallaId: number | null; cantidad: number }>()
        for (const detalle of editTarget.stockPorTalla ?? []) {
          const key = `${detalle.almacenId ?? "none"}-${detalle.tallaId ?? "none"}`
          existingMap.set(key, {
            almacenId: detalle.almacenId ?? null,
            tallaId: detalle.tallaId ?? null,
            cantidad: detalle.cantidad ?? 0,
          })
        }

        const desiredMap = new Map<string, { almacenId: number | null; tallaId: number | null; cantidad: number }>()
        for (const entry of normalizedEditStock) {
          const key = `${entry.almacenId ?? "none"}-${entry.tallaId ?? "none"}`
          desiredMap.set(key, entry)
        }

        for (const [key, existing] of existingMap.entries()) {
          const desired = desiredMap.get(key)
          const desiredCantidad = desired?.cantidad ?? 0
          const diff = desiredCantidad - existing.cantidad
          if (diff === 0) {
            desiredMap.delete(key)
            continue
          }
          try {
            await InventarioService.registrarAjuste({
              tipo: diff > 0 ? "entrada" : "salida",
              productoId: editTarget.id,
              tallaId: existing.tallaId,
              almacenId: existing.almacenId,
              cantidad: Math.abs(diff),
              motivo: "Ajuste desde formulario de producto",
            })
            stockAdjustSuccess += 1
          } catch (stockError) {
            console.error("Error ajustando stock del producto", stockError)
            stockAdjustErrors.push(
              `${describeStockDestino(existing.almacenId, existing.tallaId)}: ${stockError instanceof Error ? stockError.message : "No se pudo aplicar el ajuste"
              }`,
            )
          }
          desiredMap.delete(key)
        }

        for (const entry of desiredMap.values()) {
          if (entry.cantidad === 0) {
            continue
          }
          try {
            await InventarioService.registrarAjuste({
              tipo: "entrada",
              productoId: editTarget.id,
              tallaId: entry.tallaId,
              almacenId: entry.almacenId,
              cantidad: entry.cantidad,
              motivo: "Ajuste desde formulario de producto",
            })
            stockAdjustSuccess += 1
          } catch (stockError) {
            console.error("Error registrando nuevo stock", stockError)
            stockAdjustErrors.push(
              `${describeStockDestino(entry.almacenId, entry.tallaId)}: ${stockError instanceof Error ? stockError.message : "No se pudo aplicar el ajuste"
              }`,
            )
          }
        }
      }

      if (stockAdjustSuccess > 0) {
        toast({
          title: stockAdjustSuccess === 1 ? "Stock actualizado" : "Stock actualizado",
          description: `${stockAdjustSuccess} ajuste${stockAdjustSuccess === 1 ? "" : "s"} de inventario aplicado${stockAdjustSuccess === 1 ? "" : "s"
            } correctamente`,
        })
      }

      if (stockAdjustErrors.length > 0) {
        toast({
          title: "No se actualizaron todos los ajustes",
          description: stockAdjustErrors.slice(0, 3).join(" | "),
          variant: "destructive",
        })
      }

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

  useEffect(() => {
    if (expanded) {
      setTimeout(() => {
        const element = document.getElementById(`row-${expanded}`)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" })
          element.classList.add("bg-muted/50")
          setTimeout(() => element.classList.remove("bg-muted/50"), 2000)
        }
      }, 100)
    }
  }, [expanded, page])

  return (
    <>
      <AdminSectionLayout
        title="Stock"
        description="Gestión de productos y existencias"
        icon={<Package className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              className="rounded-xl px-4"
              onClick={() => handleDialogOpenChange(true)}
              type="button"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo producto
            </Button>
          </div>
        }
      >

        {totalStockBajo > 0 && !lowStockDismissed && (
          <Alert
            variant="destructive"
            className="flex items-start gap-3 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
          >
            <TriangleAlert className="mt-0.5 h-4 w-4 !text-amber-600 dark:!text-amber-400" />
            <div className="flex-1">
              <AlertTitle>
                {totalStockBajo} {totalStockBajo === 1 ? "ubicación" : "ubicaciones"} por debajo del stock mínimo
              </AlertTitle>
              <AlertDescription className="text-amber-800/90 dark:text-amber-300/90">
                Revisa el stock de los productos en alerta para reabastecerlos cuanto antes.
              </AlertDescription>
            </div>
            <button
              type="button"
              onClick={() => setLowStockDismissed(true)}
              className="absolute right-4 top-4 inline-flex h-6 w-6 items-center justify-center rounded-full text-amber-700 transition hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/50"
              aria-label="Cerrar alerta de stock"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </Alert>
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
                    <TableHead>Marca</TableHead>
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
                        <TableRow
                          id={`row-${producto.id}`}
                          className={`cursor-pointer ${esExpandido ? "bg-muted/50" : ""}`}
                          onClick={() => toggleExpand(producto.id)}
                        >
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
                            <span className="text-sm text-muted-foreground">{producto.marca || "—"}</span>
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
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Switch
                                checked={producto.estado === "activo"}
                                onCheckedChange={async (checked) => {
                                  const nuevoEstado = checked ? "activo" : "inactivo"
                                  // Optimistic update
                                  setProductos(prev => prev.map(p => p.id === producto.id ? { ...p, estado: nuevoEstado } : p))
                                  setFilteredProductos(prev => prev.map(p => p.id === producto.id ? { ...p, estado: nuevoEstado } : p))

                                  try {
                                    await ProductoService.update(producto.id, { estado: nuevoEstado })
                                    toast({
                                      title: `Producto ${nuevoEstado}`,
                                      description: `El producto se ha marcado como ${nuevoEstado}.`
                                    })
                                  } catch (error) {
                                    // Revert on error
                                    setProductos(prev => prev.map(p => p.id === producto.id ? { ...p, estado: producto.estado } : p))
                                    setFilteredProductos(prev => prev.map(p => p.id === producto.id ? { ...p, estado: producto.estado } : p))
                                    toast({
                                      title: "Error al actualizar estado",
                                      variant: "destructive"
                                    })
                                  }
                                }}
                              />
                              <span className="text-xs text-muted-foreground capitalize">{producto.estado}</span>
                            </div>
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
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                      <Switch
                                        checked={producto.estado === "activo"}
                                        onCheckedChange={async (checked) => {
                                          const nuevoEstado = checked ? "activo" : "inactivo"
                                          // Optimistic update
                                          setProductos(prev => prev.map(p => p.id === producto.id ? { ...p, estado: nuevoEstado } : p))
                                          setFilteredProductos(prev => prev.map(p => p.id === producto.id ? { ...p, estado: nuevoEstado } : p))

                                          try {
                                            await ProductoService.update(producto.id, { estado: nuevoEstado })
                                            toast({
                                              title: `Producto ${nuevoEstado}`,
                                              description: `El producto se ha marcado como ${nuevoEstado}.`
                                            })
                                          } catch (error) {
                                            // Revert on error
                                            setProductos(prev => prev.map(p => p.id === producto.id ? { ...p, estado: producto.estado } : p))
                                            setFilteredProductos(prev => prev.map(p => p.id === producto.id ? { ...p, estado: producto.estado } : p))
                                            toast({
                                              title: "Error al actualizar estado",
                                              variant: "destructive"
                                            })
                                          }
                                        }}
                                      />
                                      <span className="text-xs text-muted-foreground capitalize">{producto.estado}</span>
                                    </div>
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
                                          className={`text-base font-semibold ${enRiesgo ? "text-red-500" : "text-green-500"
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
      </AdminSectionLayout>
      <Dialog open={editDialogOpen} onOpenChange={handleEditDialogChange}>
        <DialogContent className="max-w-[90vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
            <DialogDescription>Realiza cambios sin salir del listado.</DialogDescription>
          </DialogHeader>
          {editForm ? (
            <form onSubmit={onSubmitEditarProducto} className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-3">
                <section className="space-y-4 rounded-xl border border-border bg-card/60 p-4 lg:col-span-2">
                  <header>
                    <p className="text-sm font-semibold text-foreground">Información básica</p>
                    <p className="text-xs text-muted-foreground">Actualiza los datos principales del producto.</p>
                  </header>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2 sm:col-span-1">
                      <Label htmlFor="editar-codigo">Código</Label>
                      <Input
                        id="editar-codigo"
                        value={editForm.codigo}
                        onChange={(event) => updateEditFormField("codigo", event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="editar-nombre">Nombre</Label>
                      <Input
                        id="editar-nombre"
                        value={editForm.nombre}
                        onChange={(event) => updateEditFormField("nombre", event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-3">
                      <Label htmlFor="editar-descripcion">Descripción</Label>
                      <Textarea
                        id="editar-descripcion"
                        value={editForm.descripcion}
                        onChange={(event) => updateEditFormField("descripcion", event.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-4 rounded-xl border border-border bg-card/60 p-4 lg:col-span-1">
                  <header>
                    <p className="text-sm font-semibold text-foreground">Categorización</p>
                    <p className="text-xs text-muted-foreground">Gestiona la categoría y proveedor.</p>
                  </header>
                  <div className="grid gap-4">
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
                      <Label htmlFor="editar-marca">Marca</Label>
                      <Input
                        id="editar-marca"
                        value={editForm.marca}
                        onChange={(event) => updateEditFormField("marca", event.target.value)}
                        placeholder="Nike, Adidas..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editar-proveedor">Proveedor</Label>
                      <Input
                        id="editar-proveedor"
                        value={editForm.proveedor}
                        onChange={(event) => updateEditFormField("proveedor", event.target.value)}
                        placeholder="Nombre del proveedor"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <Select
                        value={editForm.color || "none"}
                        onValueChange={(value) => updateEditFormField("color", value === "none" ? "" : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un color" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin color</SelectItem>
                          {PRODUCT_COLORS.map((color) => (
                            <SelectItem key={color.name} value={color.name}>
                              <div className="flex items-center gap-2">
                                <div className={`h-4 w-4 rounded-full border border-border ${color.class}`} />
                                <span>{color.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </section>
              </div>

              <div className="space-y-5">

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
                      <Label htmlFor="editar-precio-base">Costo Base (COP)</Label>
                      <Input
                        id="editar-precio-base"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.precio_base}
                        onChange={(event) => updateEditFormField("precio_base", event.target.value)}
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

                <section className="space-y-4 rounded-xl border border-border bg-card/60 p-4">
                  <header>
                    <p className="text-sm font-semibold text-foreground">Inventario por almacén</p>
                    <p className="text-xs text-muted-foreground">
                      Actualiza las unidades disponibles por almacén y talla desde este formulario.
                    </p>
                  </header>
                  {almacenesActivos.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/70 bg-background/40 p-4 text-xs text-muted-foreground">
                      No hay almacenes activos. Regístralos en la sección de Almacenes para gestionar el stock desde aquí.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {editStockEntries.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border/60 bg-background/30 p-4 text-xs text-muted-foreground">
                          Este producto no tiene unidades asignadas desde el formulario. Puedes agregarlas o gestionarlas más tarde en
                          Movimientos.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {editStockEntries.map((entry, index) => (
                            <div
                              key={`edit-stock-${index}`}
                              className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_auto]"
                            >
                              <div className="space-y-2">
                                <Label>Almacén</Label>
                                <Select
                                  value={entry.almacenId || undefined}
                                  onValueChange={(value) => updateEditStockEntry(index, "almacenId", value)}
                                  disabled={
                                    savingEdit ||
                                    uploadingEditImage ||
                                    uploadingEditReferences ||
                                    regeneratingEmbeddings ||
                                    loadingStockCatalogos
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un almacén" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={STOCK_ALMACEN_NONE_VALUE}>Sin almacén específico</SelectItem>
                                    {almacenesActivos.map((almacen) => (
                                      <SelectItem key={almacen.id} value={String(almacen.id)}>
                                        {almacen.nombre}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Talla</Label>
                                <Select
                                  value={entry.tallaId || STOCK_TALLA_NONE_VALUE}
                                  onValueChange={(value) => updateEditStockEntry(index, "tallaId", value)}
                                  disabled={
                                    savingEdit ||
                                    uploadingEditImage ||
                                    uploadingEditReferences ||
                                    regeneratingEmbeddings ||
                                    loadingStockCatalogos
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sin talla específica" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={STOCK_TALLA_NONE_VALUE}>Sin talla específica</SelectItem>
                                    {tallasActivas.map((talla) => (
                                      <SelectItem key={talla.id} value={String(talla.id)}>
                                        {talla.nombre}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`editar-stock-cantidad-${index}`}>Cantidad</Label>
                                <Input
                                  id={`editar-stock-cantidad-${index}`}
                                  type="number"
                                  min="0"
                                  value={entry.cantidad}
                                  onChange={(event) => updateEditStockEntry(index, "cantidad", event.target.value)}
                                  disabled={
                                    savingEdit ||
                                    uploadingEditImage ||
                                    uploadingEditReferences ||
                                    regeneratingEmbeddings
                                  }
                                  required
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeEditStockEntry(index)}
                                disabled={
                                  savingEdit ||
                                  uploadingEditImage ||
                                  uploadingEditReferences ||
                                  regeneratingEmbeddings
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Eliminar fila de stock</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addEditStockEntry}
                          disabled={
                            savingEdit ||
                            uploadingEditImage ||
                            uploadingEditReferences ||
                            regeneratingEmbeddings ||
                            loadingStockCatalogos ||
                            almacenesActivos.length === 0
                          }
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar fila de stock
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          {loadingStockCatalogos
                            ? "Cargando catálogos de almacenes y tallas..."
                            : "Si dejas este apartado sin cambios, se mantendrán las unidades actuales."}
                        </p>
                      </div>
                    </div>
                  )}
                </section>

                <section className="space-y-3 rounded-xl border border-border bg-card/60 p-4">
                  <header>
                    <p className="text-sm font-semibold text-foreground">Imagen</p>
                    <p className="text-xs text-muted-foreground">Sube o actualiza la vista previa del producto.</p>
                  </header>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="editar-imagen-file">Subir imagen</Label>
                      <Input
                        id="editar-imagen-file"
                        type="file"
                        accept="image/*"
                        disabled={uploadingEditImage}
                        onChange={async (event) => {
                          const file = event.target.files?.[0]
                          if (!file || !editForm) return
                          setUploadingEditImage(true)
                          try {
                            const { url } = await uploadProductImage(file, {
                              productId: editTarget?.id,
                              productCode: editForm.codigo,
                            })
                            setEditForm((prev) => (prev ? { ...prev, imagen: url } : prev))
                            toast({
                              title: "Imagen actualizada",
                              description: "La imagen se almacenó correctamente.",
                            })
                          } catch (error) {
                            console.error("Error subiendo imagen", error)
                            toast({
                              title: "No se pudo subir la imagen",
                              description: error instanceof Error ? error.message : "Intenta nuevamente con otro archivo",
                              variant: "destructive",
                            })
                          } finally {
                            setUploadingEditImage(false)
                            event.target.value = ""
                          }
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Selecciona un archivo desde tu dispositivo. Se cargará automáticamente a Supabase Storage.
                      </p>
                    </div>
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
                  </div>
                </section>

                <section className="space-y-4 rounded-xl border border-border bg-card/60 p-4">
                  <header>
                    <p className="text-sm font-semibold text-foreground">Imágenes de referencia</p>
                    <p className="text-xs text-muted-foreground">
                      Estas imágenes se usan para el reconocimiento visual del producto.
                    </p>
                  </header>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Imágenes registradas</Label>
                      {editReferenceImages.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {editReferenceImages.map((reference) => {
                            const previewSrc = reference.url && reference.url.length > 0 ? reference.url : undefined
                            return (
                              <div key={reference.id} className="flex flex-col gap-2">
                                <div className="relative h-24 w-full overflow-hidden rounded-md border border-border">
                                  {previewSrc ? (
                                    <Image
                                      src={previewSrc}
                                      alt={reference.filename ?? `Referencia ${reference.id}`}
                                      fill
                                      sizes="120px"
                                      loading="lazy"
                                      className="object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                                      Sin vista previa
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="flex-1 truncate text-xs text-muted-foreground">
                                    {reference.filename ?? reference.path}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteReference(reference.id)}
                                    disabled={
                                      removingReferenceId === reference.id ||
                                      uploadingEditReferences ||
                                      savingEdit
                                    }
                                  >
                                    {removingReferenceId === reference.id ? "Eliminando…" : "Eliminar"}
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Aún no hay imágenes de referencia registradas para este producto.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editar-referencias">Añadir nuevas imágenes</Label>
                      <Input
                        id="editar-referencias"
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={savingEdit || uploadingEditImage || uploadingEditReferences}
                        onChange={handleEditReferenceFilesChange}
                      />
                      <p className="text-xs text-muted-foreground">
                        Agrega diferentes vistas del producto para mejorar los resultados del sistema de coincidencia.
                      </p>
                    </div>

                    {editReferenceDrafts.length > 0 && (
                      <div className="space-y-2">
                        <Label>Imágenes pendientes de registro</Label>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {editReferenceDrafts.map((draft, index) => (
                            <div key={`${draft.preview}-${index}`} className="flex flex-col gap-2">
                              <div className="relative h-24 w-full overflow-hidden rounded-md border border-border">
                                <Image
                                  src={draft.preview}
                                  alt={`Referencia pendiente ${index + 1}`}
                                  fill
                                  sizes="120px"
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => handleRemoveEditReferenceDraft(index)}
                                disabled={savingEdit || uploadingEditReferences}
                              >
                                Quitar
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRegenerateEmbeddings}
                        disabled={
                          regeneratingEmbeddings ||
                          uploadingEditReferences ||
                          editReferenceImages.length === 0 ||
                          savingEdit
                        }
                      >
                        {regeneratingEmbeddings ? "Regenerando…" : "Regenerar embeddings"}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Úsalo cuando reemplaces o elimines referencias existentes.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleEditDialogChange(false)}
                  disabled={
                    savingEdit ||
                    uploadingEditReferences ||
                    regeneratingEmbeddings ||
                    removingReferenceId !== null
                  }
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    savingEdit ||
                    uploadingEditImage ||
                    uploadingEditReferences ||
                    regeneratingEmbeddings ||
                    (!loadingCategorias && categorias.length === 0)
                  }
                >
                  {savingEdit || uploadingEditReferences ? "Procesando..." : "Guardar cambios"}
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
              Selecciona cómo deseas proceder. Puedes marcarlo como inactivo para conservar su historial o eliminarlo
              definitivamente junto con su stock, imágenes de referencia y embeddings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <RadioGroup
            value={deleteMode}
            onValueChange={(value) =>
              setDeleteMode(value === "hard" ? "hard" : "inactive")
            }
            className="space-y-2"
          >
            <label
              htmlFor="delete-mode-inactive"
              className={cn(
                "flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 text-left transition hover:bg-muted/50",
                deleteMode === "inactive" ? "ring-2 ring-primary" : undefined,
              )}
            >
              <RadioGroupItem id="delete-mode-inactive" value="inactive" className="mt-1" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Marcar como inactivo</p>
                <p className="text-xs text-muted-foreground">
                  Oculta el producto del catálogo activo pero conserva su información y referencias para reactivarlo
                  más adelante.
                </p>
              </div>
            </label>
            <label
              htmlFor="delete-mode-hard"
              className={cn(
                "flex items-start gap-3 rounded-lg border border-destructive/60 bg-destructive/10 p-3 text-left transition hover:bg-destructive/20",
                deleteMode === "hard" ? "ring-2 ring-red-500" : undefined,
              )}
            >
              <RadioGroupItem id="delete-mode-hard" value="hard" className="mt-1" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Eliminar definitivamente</p>
                <p className="text-xs text-muted-foreground">
                  Borra el producto, su stock y sus imágenes de referencia. Esta acción no se puede deshacer.
                </p>
              </div>
            </label>
          </RadioGroup>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingProducto}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                deleteMode === "hard"
                  ? "bg-red-900 text-white hover:bg-red-900/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
              disabled={deletingProducto}
              onClick={(event) => {
                event.preventDefault()
                void confirmarEliminarProducto()
              }}
            >
              {deletingProducto
                ? "Procesando…"
                : deleteMode === "hard"
                  ? "Eliminar definitivamente"
                  : "Marcar como inactivo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={formOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="w-[99vw] max-w-[1900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo producto</DialogTitle>
            <DialogDescription>Registra un producto sin abandonar el listado actual.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmitNuevoProducto} className="space-y-8 py-2">
            <div className="grid gap-8 xl:grid-cols-[1.8fr_1fr] 2xl:grid-cols-[2fr_1fr]">
              <section className="space-y-6 rounded-2xl border border-border/70 bg-card p-6 shadow-sm xl:p-7">
                <header>
                  <p className="text-sm font-semibold text-foreground">Información básica</p>
                  <p className="text-xs text-muted-foreground">Completa los datos principales del producto.</p>
                </header>
                <div className="grid gap-4 md:grid-cols-2">
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
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="nuevo-descripcion">Descripción</Label>
                    <Textarea
                      id="nuevo-descripcion"
                      value={nuevoProducto.descripcion}
                      onChange={(event) => setNuevoProducto((prev) => ({ ...prev, descripcion: event.target.value }))}
                      rows={4}
                      placeholder="Describe brevemente las características principales..."
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-5 rounded-2xl border border-border/70 bg-card p-6 shadow-sm xl:p-7">
                <header>
                  <p className="text-sm font-semibold text-foreground">Categorización</p>
                  <p className="text-xs text-muted-foreground">Asigna categoría y proveedor para organizar el inventario.</p>
                </header>
                <div className="grid gap-4">
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
                    <Label htmlFor="nuevo-marca">Marca</Label>
                    <Input
                      id="nuevo-marca"
                      value={nuevoProducto.marca}
                      onChange={(event) => setNuevoProducto((prev) => ({ ...prev, marca: event.target.value }))}
                      placeholder="Nike, Adidas..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nuevo-proveedor">Proveedor</Label>
                    <Input
                      id="nuevo-proveedor"
                      value={nuevoProducto.proveedor}
                      onChange={(event) => setNuevoProducto((prev) => ({ ...prev, proveedor: event.target.value }))}
                      placeholder="Nombre del proveedor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Select
                      value={nuevoProducto.color || "none"}
                      onValueChange={(value) => setNuevoProducto((prev) => ({ ...prev, color: value === "none" ? "" : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin color</SelectItem>
                        {PRODUCT_COLORS.map((color) => (
                          <SelectItem key={color.name} value={color.name}>
                            <div className="flex items-center gap-2">
                              <div className={`h-4 w-4 rounded-full border border-border ${color.class}`} />
                              <span>{color.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>
            </div>

            <div className="grid gap-8 xl:grid-cols-2 2xl:grid-cols-[1.3fr_1fr]">

              <section className="space-y-5 rounded-2xl border border-border/70 bg-card p-6 shadow-sm xl:p-7">
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
                    <Label htmlFor="nuevo-precio-base">Costo Base (COP)</Label>
                    <Input
                      id="nuevo-precio-base"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="300000"
                      value={nuevoProducto.precio_base}
                      onChange={(event) => setNuevoProducto((prev) => ({ ...prev, precio_base: event.target.value }))}
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

              <section className="space-y-5 rounded-2xl border border-border/70 bg-card p-6 shadow-sm xl:p-7">
                <header>
                  <p className="text-sm font-semibold text-foreground">Inventario inicial</p>
                  <p className="text-xs text-muted-foreground">
                    Registra las unidades disponibles por almacén y talla para iniciar el seguimiento de stock.
                  </p>
                </header>
                {almacenesActivos.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 bg-background/40 p-4 text-xs text-muted-foreground">
                    No hay almacenes activos. Configúralos primero en la sección de Almacenes para asignar stock inicial.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {nuevoStockEntries.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/60 bg-background/30 p-4 text-xs text-muted-foreground">
                        Puedes dejar este apartado vacío y registrar el stock más adelante desde Movimientos.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {nuevoStockEntries.map((entry, index) => (
                          <div
                            key={`nuevo-stock-${index}`}
                            className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_auto]"
                          >
                            <div className="space-y-2">
                              <Label>Almacén</Label>
                              <Select
                                value={entry.almacenId || undefined}
                                onValueChange={(value) => updateNuevoStockEntry(index, "almacenId", value)}
                                disabled={
                                  savingProducto ||
                                  uploadingNewImage ||
                                  uploadingNewReferences ||
                                  loadingStockCatalogos
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona un almacén" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={STOCK_ALMACEN_NONE_VALUE}>Sin almacén específico</SelectItem>
                                  {almacenesActivos.map((almacen) => (
                                    <SelectItem key={almacen.id} value={String(almacen.id)}>
                                      {almacen.nombre}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Talla</Label>
                              <Select
                                value={entry.tallaId || STOCK_TALLA_NONE_VALUE}
                                onValueChange={(value) => updateNuevoStockEntry(index, "tallaId", value)}
                                disabled={
                                  savingProducto ||
                                  uploadingNewImage ||
                                  uploadingNewReferences ||
                                  loadingStockCatalogos
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Sin talla específica" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={STOCK_TALLA_NONE_VALUE}>Sin talla específica</SelectItem>
                                  {tallasActivas.map((talla) => (
                                    <SelectItem key={talla.id} value={String(talla.id)}>
                                      {talla.nombre}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`nuevo-stock-cantidad-${index}`}>Cantidad</Label>
                              <Input
                                id={`nuevo-stock-cantidad-${index}`}
                                type="number"
                                min="0"
                                value={entry.cantidad}
                                onChange={(event) => updateNuevoStockEntry(index, "cantidad", event.target.value)}
                                required
                                disabled={savingProducto || uploadingNewImage || uploadingNewReferences}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeNuevoStockEntry(index)}
                              disabled={savingProducto || uploadingNewImage || uploadingNewReferences}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Eliminar fila de stock</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addNuevoStockEntry}
                        disabled={
                          savingProducto ||
                          uploadingNewImage ||
                          uploadingNewReferences ||
                          loadingStockCatalogos ||
                          almacenesActivos.length === 0
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar fila de stock
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        {loadingStockCatalogos
                          ? "Cargando catálogos de almacenes y tallas..."
                          : "Puedes registrar múltiples combinaciones de almacén y talla."}
                      </p>
                    </div>
                  </div>
                )}
              </section>

            </div>

            <div className="grid gap-8 lg:grid-cols-2 2xl:grid-cols-[1.2fr_1fr]">

              <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-6 shadow-sm xl:p-7">
                <header>
                  <p className="text-sm font-semibold text-foreground">Imagen opcional</p>
                  <p className="text-xs text-muted-foreground">
                    Sube un archivo o pega una URL pública para mostrar la vista previa del producto.
                  </p>
                </header>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nuevo-imagen-file">Subir imagen</Label>
                    <Input
                      id="nuevo-imagen-file"
                      type="file"
                      accept="image/*"
                      disabled={uploadingNewImage}
                      onChange={async (event) => {
                        const file = event.target.files?.[0]
                        if (!file) return
                        setUploadingNewImage(true)
                        try {
                          const { url } = await uploadProductImage(file, {
                            productCode: nuevoProducto.codigo,
                          })
                          setNuevoProducto((prev) => ({ ...prev, imagen: url }))
                          toast({ title: "Imagen subida", description: "La imagen se almacenó correctamente." })
                        } catch (error) {
                          console.error("Error subiendo imagen", error)
                          toast({
                            title: "No se pudo subir la imagen",
                            description: error instanceof Error ? error.message : "Intenta con otro archivo",
                            variant: "destructive",
                          })
                        } finally {
                          setUploadingNewImage(false)
                          event.target.value = ""
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      La imagen se almacena en Supabase Storage y se asocia automáticamente al producto.
                    </p>
                  </div>
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
                  </div>
                </div>
              </section>

              <section className="space-y-5 rounded-2xl border border-border/70 bg-card p-6 shadow-sm xl:p-7">
                <header>
                  <p className="text-sm font-semibold text-foreground">Imágenes de referencia</p>
                  <p className="text-xs text-muted-foreground">
                    Añade fotos adicionales que se usarán para el reconocimiento visual (perfil, suela, detalles, etc.).
                  </p>
                </header>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nuevo-referencias">Subir imágenes de referencia</Label>
                    <Input
                      id="nuevo-referencias"
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={savingProducto || uploadingNewImage || uploadingNewReferences}
                      onChange={handleNewReferenceFilesChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      Se almacenarán en Supabase y servirán como muestras para el sistema de coincidencia.
                    </p>
                  </div>

                  {newReferenceDrafts.length > 0 && (
                    <div className="space-y-2">
                      <Label>Imágenes listas para registrar</Label>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {newReferenceDrafts.map((draft, index) => (
                          <div key={`${draft.preview}-${index}`} className="flex flex-col gap-2">
                            <div className="relative h-24 w-full overflow-hidden rounded-md border border-border">
                              <Image
                                src={draft.preview}
                                alt={`Referencia ${index + 1}`}
                                fill
                                sizes="96px"
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => handleRemoveNewReferenceDraft(index)}
                              disabled={savingProducto || uploadingNewReferences}
                            >
                              Quitar
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
                disabled={savingProducto || uploadingNewImage || uploadingNewReferences}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  savingProducto ||
                  uploadingNewImage ||
                  uploadingNewReferences ||
                  (!loadingCategorias && categorias.length === 0)
                }
              >
                {savingProducto ? "Guardando..." : "Guardar producto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
