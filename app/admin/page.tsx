"use client"

import dynamic from "next/dynamic"
import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import * as LucideIcons from "lucide-react"
const { MonitorSmartphone, X, Paperclip, Copy, ExternalLink } = LucideIcons
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProductoService } from "@/lib/services/producto-service"
import { supabase } from "@/lib/supabase"
import { getCurrentTiendaId } from "@/lib/services/tenant-service"
import { useToast } from "@/hooks/use-toast"

const SalesWorkspace = dynamic(
  () => import("@/components/facturacion/sales-workspace").then((mod) => mod.SalesWorkspace),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4 rounded-2xl border border-dashed border-border/60 bg-card/40 p-6">
        <div className="h-6 w-1/3 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    ),
  },
)

interface HighlightProduct {
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

interface HighlightsResponse {
  topProducts?: HighlightProduct[]
  newProducts?: HighlightProduct[]
  generatedAt?: string
}

type HighlightsCache = HighlightsResponse

const HIGHLIGHT_CACHE_KEY = "stockwear.admin.highlights"
const MOBILE_NOTICE_DISMISSED_KEY = "stockwear.admin.mobile-notice.dismissed"
const SHOULD_USE_CACHE = true
const CATALOG_BASE_PATH = "/catalog"

type BrowserWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
  cancelIdleCallback?: (handle: number) => void
}

interface VentaRow {
  id: number
  total: number | null
  createdAt: string
}

interface VentaDetalleRow {
  ventaId: number
  productoId: number
  cantidad: number
  precioUnitario: number | null
  descuento: number | null
  subtotal: number | null
}

interface HistorialRow {
  tipo: string
  productoId: number | null
  cantidad: number | null
  costoUnitario: number | null
  createdAt: string
}

interface ProductoRow {
  id: number
  codigo: string
  estado: string
  stockMinimo: number
  createdAt: string
  nombre: string | null
  precio: number | null
  imagen: string | null
  categoria?: { nombre: string | null } | Array<{ nombre: string | null }> | null
}

const VENTAS_LIMIT = 400
const DETALLE_LIMIT = 800
const PRODUCTOS_LIMIT = 400
const HISTORIAL_LIMIT = 800

const fechaRecienteFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})

function resolveCategoriaNombre(categoria: ProductoRow["categoria"]): string | null {
  if (!categoria) return null
  if (Array.isArray(categoria)) {
    return categoria[0]?.nombre ?? null
  }
  return categoria.nombre ?? null
}

function getDateParts(dateLike: string | Date) {
  const date = typeof dateLike === "string" ? new Date(dateLike) : dateLike
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
  }
}

function calcularSubtotal(detalle: VentaDetalleRow) {
  if (typeof detalle.subtotal === "number" && Number.isFinite(detalle.subtotal)) {
    return detalle.subtotal
  }

  const unitPrice =
    typeof detalle.precioUnitario === "number" ? detalle.precioUnitario : Number(detalle.precioUnitario ?? 0)
  const cantidad = detalle.cantidad || 0
  const descuento = typeof detalle.descuento === "number" ? detalle.descuento : Number(detalle.descuento ?? 0)
  const bruto = unitPrice * cantidad
  const discountAmount = (bruto * descuento) / 100
  return Math.max(bruto - discountAmount, 0)
}

function formatRecent(producto: ProductoRow, index: number): HighlightProduct {
  return {
    id: producto.id,
    codigo: producto.codigo,
    nombre: producto.nombre ?? producto.codigo ?? `Producto ${producto.id}`,
    categoria: resolveCategoriaNombre(producto.categoria ?? null),
    precio: producto.precio ?? null,
    imagen: producto.imagen ?? null,
    etiqueta: producto.createdAt ? fechaRecienteFormatter.format(new Date(producto.createdAt)) : null,
    tag: index === 0 ? "Mas reciente" : "Nuevo",
  }
}

async function loadHighlightsFallback(): Promise<HighlightsResponse> {
  const tiendaId = await getCurrentTiendaId().catch(() => null)

  if (!tiendaId) {
    throw new Error("No se pudo determinar la tienda actual")
  }

  const scopedVentas = supabase
    .from("ventas")
    .select("id,total,\"createdAt\"")
    .eq("tienda_id", tiendaId)
    .order("createdAt", { ascending: false })
    .limit(VENTAS_LIMIT)

  const scopedDetalles = supabase
    .from("ventasDetalle")
    .select("\"ventaId\",\"productoId\",cantidad,\"precioUnitario\",descuento,subtotal")
    .eq("tienda_id", tiendaId)
    .limit(DETALLE_LIMIT)

  const scopedProductos = supabase
    .from("productos")
    .select(`id,codigo,estado,"stockMinimo","createdAt",nombre,precio,imagen,categoria:categorias!productos_categoriaId_fkey ( nombre )`)
    .eq("tienda_id", tiendaId)
    .limit(PRODUCTOS_LIMIT)

  const scopedHistorial = supabase
    .from("historialStock")
    .select("tipo,\"productoId\",cantidad,\"costoUnitario\",\"createdAt\"")
    .eq("tipo", "venta")
    .eq("tienda_id", tiendaId)
    .order("createdAt", { ascending: false })
    .limit(HISTORIAL_LIMIT)

  const [ventasResp, detallesResp, productosResp, historialResp] = await Promise.all([
    scopedVentas,
    scopedDetalles,
    scopedProductos,
    scopedHistorial,
  ])

  if (ventasResp.error || detallesResp.error || productosResp.error || historialResp.error) {
    throw new Error("No se pudieron obtener los destacados localmente")
  }

  let ventas = (ventasResp.data as VentaRow[] | null) ?? []
  let detalles = (detallesResp.data as VentaDetalleRow[] | null) ?? []
  const historial = (historialResp.data as HistorialRow[] | null) ?? []
  const productos = (productosResp.data as ProductoRow[] | null) ?? []

  if (ventas.length === 0 && detalles.length === 0 && historial.length > 0) {
    const legacyEntries = historial
      .filter((row) => row.productoId !== null && (row.cantidad ?? 0) > 0)
      .map((row, index) => {
        const cantidad = Math.max(row.cantidad ?? 0, 0)
        const unitPrice = row.costoUnitario ?? 0
        const subtotal = unitPrice * cantidad
        return {
          ventaId: -(index + 1),
          productoId: row.productoId as number,
          cantidad,
          precioUnitario: unitPrice,
          descuento: null,
          subtotal,
          createdAt: row.createdAt,
        }
      })

    if (legacyEntries.length) {
      ventas = legacyEntries.map((entry) => ({
        id: entry.ventaId,
        total: entry.subtotal,
        createdAt: entry.createdAt,
      }))
      detalles = legacyEntries.map(({ createdAt: _createdAt, ...detalle }) => detalle)
    }
  }

  const now = new Date()
  const { month: currentMonth, year: currentYear } = getDateParts(now)

  const ventasCurrentMonth = ventas.filter((venta) => {
    const { month, year } = getDateParts(venta.createdAt)
    return month === currentMonth && year === currentYear
  })

  const ventasCurrentMonthIds = new Set(ventasCurrentMonth.map((venta) => venta.id))
  const detallesMes = detalles.filter((detalle) => ventasCurrentMonthIds.has(detalle.ventaId))

  const acumularPorProducto = (lista: VentaDetalleRow[]) =>
    lista.reduce<Map<number, { cantidad: number; total: number }>>((acc, detalle) => {
      const productoId = detalle.productoId
      const current = acc.get(productoId) || { cantidad: 0, total: 0 }
      const ingresos = calcularSubtotal(detalle)
      acc.set(productoId, {
        cantidad: current.cantidad + detalle.cantidad,
        total: current.total + ingresos,
      })
      return acc
    }, new Map())

  const ventasPorProductoMes = acumularPorProducto(detallesMes)
  const ventasPorProductoHistorico = acumularPorProducto(detalles)

  const ordenarVentas = (mapa: Map<number, { cantidad: number; total: number }>) =>
    Array.from(mapa.entries()).sort((a, b) => {
      if (b[1].cantidad !== a[1].cantidad) {
        return b[1].cantidad - a[1].cantidad
      }
      return b[1].total - a[1].total
    })

  const combinados: Array<[number, { cantidad: number; total: number }]> = []
  const seleccionados = new Set<number>()

  for (const entrada of ordenarVentas(ventasPorProductoMes)) {
    if (combinados.length >= 4) break
    seleccionados.add(entrada[0])
    combinados.push(entrada)
  }

  if (combinados.length < 4) {
    for (const entrada of ordenarVentas(ventasPorProductoHistorico)) {
      if (seleccionados.has(entrada[0])) continue
      combinados.push(entrada)
      if (combinados.length >= 4) break
    }
  }

  const ventasParaDestacados = combinados.length ? new Map(combinados) : ventasPorProductoHistorico
  const productMap = new Map(productos.map((producto) => [producto.id, producto]))

  const topProducts = Array.from(ventasParaDestacados.entries())
    .sort((a, b) => b[1].cantidad - a[1].cantidad || b[1].total - a[1].total)
    .slice(0, 4)
    .map(([productoId, stats], index): HighlightProduct => {
      const productInfo = productMap.get(productoId)
      return {
        id: productoId,
        codigo: productInfo?.codigo ?? null,
        nombre: productInfo?.nombre ?? productInfo?.codigo ?? `Producto ${productoId}`,
        categoria: resolveCategoriaNombre(productInfo?.categoria ?? null),
        precio: productInfo?.precio ?? null,
        imagen: productInfo?.imagen ?? null,
        totalVendidas: stats.cantidad,
        ingresos: stats.total,
        tag: index === 0 ? "Mas vendido" : `Top ${index + 1}`,
      }
    })

  const activos = productos.filter((producto) => producto.estado === "activo")
  const baseRecientes = activos.length ? activos : productos
  const newProducts = baseRecientes
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)
    .map((producto, index) => formatRecent(producto, index))

  return {
    topProducts,
    newProducts,
    generatedAt: new Date().toISOString(),
  }
}

import { updateStoreWhatsApp, getStoreSettings } from "@/app/actions/store-actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AdminHomePage() {
  const router = useRouter()
  const [topProducts, setTopProducts] = useState<HighlightProduct[]>([])
  const [newProducts, setNewProducts] = useState<HighlightProduct[]>([])
  const [loadingHighlights, setLoadingHighlights] = useState(true)
  const [isHydratingHighlights, startHighlightsTransition] = useTransition()
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [showMobileNotice, setShowMobileNotice] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [savingWhatsapp, setSavingWhatsapp] = useState(false)
  const [storeSlug, setStoreSlug] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    let active = true
    const loadSettings = async () => {
      const { data } = await supabase.auth.getSession()
      const accessToken = data.session?.access_token

      if (!accessToken) {
        console.warn("No hay sesión activa para cargar la tienda")
        return
      }

      const res = await getStoreSettings(accessToken)
      if (!active) return

      if (res.success && res.data) {
        setStoreSlug(res.data.slug ?? null)
        if (res.data.whatsapp) {
          setWhatsappNumber(res.data.whatsapp)
        }
      } else if (!res.success && res.message) {
        toast({ title: "Error", description: res.message, variant: "destructive" })
      }
    }

    void loadSettings()

    return () => {
      active = false
    }
  }, [toast])

  const handleSaveWhatsapp = async () => {
    setSavingWhatsapp(true)
    try {
      const { data } = await supabase.auth.getSession()
      const accessToken = data.session?.access_token

      if (!accessToken) {
        toast({ title: "Sesión requerida", description: "Inicia sesión para actualizar el WhatsApp", variant: "destructive" })
        return
      }

      const res = await updateStoreWhatsApp(whatsappNumber, accessToken)
      if (res.success) {
        toast({ title: "Guardado", description: "Número de WhatsApp actualizado" })
      } else {
        toast({ title: "Error", description: res.message, variant: "destructive" })
      }
    } catch (_error) {
      toast({ title: "Error", description: "No se pudo guardar", variant: "destructive" })
    } finally {
      setSavingWhatsapp(false)
    }
  }

  const resolveCatalogUrl = () => {
    if (!storeSlug) {
      return null
    }
    const catalogPath = `${CATALOG_BASE_PATH}/${storeSlug}`
    if (typeof window !== "undefined" && window.location?.origin) {
      return `${window.location.origin}${catalogPath}`
    }

    const fallbackOrigin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "")

    if (fallbackOrigin) {
      return `${fallbackOrigin}${catalogPath}`
    }

    return catalogPath
  }

  const copyCatalogLink = async () => {
    const catalogUrl = resolveCatalogUrl()
    if (!catalogUrl) {
      toast({
        title: "Configura el slug",
        description: "Asigna un slug a tu tienda para compartir el catálogo.",
        variant: "destructive",
      })
      return
    }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(catalogUrl)
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea")
        textarea.value = catalogUrl
        textarea.setAttribute("readonly", "")
        textarea.style.position = "absolute"
        textarea.style.left = "-9999px"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }

      toast({
        title: "Link copiado",
        description: "El enlace al catálogo está listo para compartir.",
      })
    } catch (error) {
      console.error("No se pudo copiar el link del catálogo", error)
      toast({
        title: "No se pudo copiar",
        description: "Intenta de nuevo o comparte el enlace manualmente.",
        variant: "destructive",
      })
    }
  }

  const openCatalog = () => {
    if (!storeSlug) {
      toast({
        title: "Slug requerido",
        description: "No se encontró el slug de la tienda para abrir el catálogo.",
        variant: "destructive",
      })
      return
    }
    router.push(`${CATALOG_BASE_PATH}/${storeSlug}`)
  }

  useEffect(() => {
    if (typeof window === "undefined" || !SHOULD_USE_CACHE) return

    try {
      const cachedRaw = window.localStorage.getItem(HIGHLIGHT_CACHE_KEY)
      if (!cachedRaw) return

      const cached = JSON.parse(cachedRaw) as HighlightsCache | null
      if (!cached) return

      const hasData = Boolean((cached.topProducts?.length ?? 0) || (cached.newProducts?.length ?? 0))

      startHighlightsTransition(() => {
        setTopProducts(cached.topProducts ?? [])
        setNewProducts(cached.newProducts ?? [])
      })

      if (hasData) {
        setLoadingHighlights(false)
      }
    } catch (error) {
      console.warn("No se pudo recuperar la cache de destacados", error)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.innerWidth >= 1024) return
    if (window.localStorage.getItem(MOBILE_NOTICE_DISMISSED_KEY) === "true") return

    setShowMobileNotice(true)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    let canceled = false
    const browserWindow = window as BrowserWindow

    const warm = () => {
      if (canceled) return
      void ProductoService.warmCache()
    }

    if (typeof browserWindow.requestIdleCallback === "function") {
      const handle = browserWindow.requestIdleCallback(warm, { timeout: 1800 })
      return () => {
        canceled = true
        browserWindow.cancelIdleCallback?.(handle)
      }
    }

    const timeout = window.setTimeout(() => {
      warm()
    }, 500)

    return () => {
      canceled = true
      window.clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    let canceled = false
    const controller = new AbortController()
    const browserWindow = window as BrowserWindow
    let idleHandle: number | undefined
    let timeoutHandle: number | undefined

    const loadHighlights = async () => {
      setLoadingHighlights(true)
      try {
        const response = await fetch(`/api/admin/highlights?refresh=${refreshCounter}`, {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`No se pudieron cargar los destacados (${response.status})`)
        }

        let payload = (await response.json()) as HighlightsResponse
        if ((!payload.topProducts || payload.topProducts.length === 0) && (!payload.newProducts || payload.newProducts.length === 0)) {
          payload = await loadHighlightsFallback()
        }
        if (canceled) return

        startHighlightsTransition(() => {
          setTopProducts(payload.topProducts ?? [])
          setNewProducts(payload.newProducts ?? [])
        })

        if (SHOULD_USE_CACHE && typeof window !== "undefined") {
          window.localStorage.setItem(HIGHLIGHT_CACHE_KEY, JSON.stringify(payload))
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return
        }
        console.error("Error al obtener los productos destacados", error)
        try {
          const fallback = await loadHighlightsFallback()
          if (!canceled) {
            startHighlightsTransition(() => {
              setTopProducts(fallback.topProducts ?? [])
              setNewProducts(fallback.newProducts ?? [])
            })

            if (SHOULD_USE_CACHE && typeof window !== "undefined") {
              window.localStorage.setItem(HIGHLIGHT_CACHE_KEY, JSON.stringify(fallback))
            }
          }
        } catch (fallbackError) {
          console.error("Error al generar destacados locales", fallbackError)
          if (!canceled) {
            startHighlightsTransition(() => {
              setTopProducts([])
              setNewProducts([])
            })
          }
        }
      } finally {
        if (!canceled) {
          setLoadingHighlights(false)
        }
      }
    }

    if (typeof browserWindow.requestIdleCallback === "function") {
      idleHandle = browserWindow.requestIdleCallback(() => {
        if (!canceled) {
          void loadHighlights()
        }
      })
    } else {
      timeoutHandle = window.setTimeout(() => {
        if (!canceled) {
          void loadHighlights()
        }
      }, 60)
    }

    return () => {
      canceled = true
      controller.abort()
      if (idleHandle !== undefined && typeof browserWindow.cancelIdleCallback === "function") {
        browserWindow.cancelIdleCallback(idleHandle)
      }
      if (timeoutHandle !== undefined) {
        window.clearTimeout(timeoutHandle)
      }
    }
  }, [refreshCounter])

  const dismissMobileNotice = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MOBILE_NOTICE_DISMISSED_KEY, "true")
    }
    setShowMobileNotice(false)
  }

  const handleSaleRegistered = () => {
    setRefreshCounter((value) => value + 1)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Comparte tu catálogo</p>
            <p className="text-sm text-muted-foreground">
              Comparte la vista pública para que vendedores y clientes consulten existencias al instante.
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Paperclip className="size-4" />
                Compartir catálogo
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-4">
              <DropdownMenuLabel>Acciones rápidas</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => void copyCatalogLink()} className="cursor-pointer">
                <Copy className="mr-2 size-4" />
                Copiar link
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={openCatalog} className="cursor-pointer">
                <ExternalLink className="mr-2 size-4" />
                Abrir catálogo
              </DropdownMenuItem>

              <div className="my-2 border-t border-border" />

              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="whatsapp-config" className="text-xs font-medium">WhatsApp de Pedidos</Label>
                  <div className="flex gap-2">
                    <Input
                      id="whatsapp-config"
                      placeholder="Ej: 573001234567"
                      className="h-8 text-xs"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                    <Button
                      size="sm"
                      className="h-8 px-3"
                      onClick={(e) => {
                        e.preventDefault()
                        handleSaveWhatsapp()
                      }}
                      disabled={savingWhatsapp}
                    >
                      {savingWhatsapp ? "..." : "OK"}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Este número recibirá los pedidos del catálogo.</p>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showMobileNotice && (
        <div className="relative w-full overflow-hidden rounded-2xl border border-primary bg-secondary p-4 text-sm text-muted-foreground shadow-sm">
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <MonitorSmartphone className="h-4 w-4" />
            </span>
            <div className="flex-1 text-[0.92rem] leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">Optimiza tu experiencia</p>
              <p>
                StockWear recomienda gestionar el panel desde un equipo de escritorio para aprovechar todo el
                espacio disponible. Puedes continuar en tu dispositivo movil cuando lo necesites.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissMobileNotice}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition hover:border-border hover:text-foreground"
          >
            <span className="sr-only">Ocultar aviso</span>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {(loadingHighlights || isHydratingHighlights) && topProducts.length === 0 && newProducts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
          Calculando recomendaciones de productos
        </div>
      ) : null}

      <SalesWorkspace
        variant="dashboard"
        highlights={{ top: topProducts, recent: newProducts }}
        onSaleRegistered={handleSaleRegistered}
        hideCartTrigger
      />
    </div>
  )
}
