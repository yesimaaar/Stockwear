import { supabase } from '@/lib/supabase'
import type { Producto, Categoria, ProductoEmbedding, ProductoReferenceImage } from '@/lib/types'

export interface ProductoConStock extends Producto {
  categoria: string
  stockTotal: number
  stockPorTalla: Array<{
    stockId: number
    tallaId: number | null
    almacenId: number | null
    talla: string
    almacen: string
    cantidad: number
  }>
  embeddings?: ProductoEmbedding[]
  referenceImages?: ProductoReferenceImage[]
}

type CategoriaRelacion = {
  id?: number | null
  nombre?: string | null
}

type TallaRelacion = {
  id?: number | null
  nombre?: string | null
}

type AlmacenRelacion = {
  id?: number | null
  nombre?: string | null
}

export type ProductoRow = {
  id: number
  tienda_id: number
  codigo: string
  nombre: string
  categoriaId: number
  descripcion: string | null
  precio: number
  descuento: number
  proveedor: string | null
  imagen: string | null
  stockMinimo: number
  estado: 'activo' | 'inactivo'
  createdAt: string
  categoria?: CategoriaRelacion | CategoriaRelacion[] | null
  stock?: Array<{
    id: number | null
    tallaId: number | null
    almacenId: number | null
    cantidad: number | null
    talla?: TallaRelacion | null
    almacen?: AlmacenRelacion | null
  }> | null
  embeddings?: Array<{
    id: number | null
    productoId: number | null
    embedding: number[] | null
    fuente?: string | null
    referenceImageId?: number | null
    createdAt?: string | null
    updatedAt?: string | null
  }> | null
  referenceImages?: Array<{
    id: number | null
    productoId: number | null
    url: string | null
    path: string | null
    bucket?: string | null
    filename?: string | null
    mimeType?: string | null
    size?: number | null
    createdAt?: string | null
    updatedAt?: string | null
  }> | null
}

export const PRODUCTO_SELECT = `
  id,
  tienda_id,
  codigo,
  nombre,
  descripcion,
  categoriaId,
  precio,
  descuento,
  proveedor,
  imagen,
  stockMinimo,
  estado,
  createdAt,
  categoria:categorias!productos_categoriaId_fkey (
    id,
    nombre
  ),
  stock:stock!stock_productoId_fkey (
    id,
    tallaId,
    almacenId,
    cantidad,
    talla:tallas!stock_tallaId_fkey (
      id,
      nombre
    ),
    almacen:almacenes!stock_almacenId_fkey (
      id,
      nombre
    )
  ),
  embeddings:producto_embeddings(
    id,
    "productoId",
    embedding,
    fuente,
    "referenceImageId",
    "createdAt",
    "updatedAt"
  ),
  referenceImages:producto_reference_images(
    id,
    "productoId",
    url,
    path,
    bucket,
    filename,
    "mimeType",
    size,
    "createdAt",
    "updatedAt"
  )
`

const PRODUCTO_CACHE_TTL_MS = 2 * 60 * 1000
const CATEGORIA_CACHE_TTL_MS = 5 * 60 * 1000

let cachedProductos: ProductoConStock[] | null = null
let cachedProductosExpiresAt = 0

let cachedCategorias: Categoria[] | null = null
let cachedCategoriasExpiresAt = 0

const now = () => Date.now()

const getCachedProductos = (force?: boolean): ProductoConStock[] | null => {
  if (!force && cachedProductos && cachedProductosExpiresAt > now()) {
    return cachedProductos
  }
  return null
}

const setCachedProductos = (data: ProductoConStock[]) => {
  cachedProductos = data
  cachedProductosExpiresAt = now() + PRODUCTO_CACHE_TTL_MS
}

const invalidateProductosCache = () => {
  cachedProductos = null
  cachedProductosExpiresAt = 0
}

const getCachedCategorias = (force?: boolean): Categoria[] | null => {
  if (!force && cachedCategorias && cachedCategoriasExpiresAt > now()) {
    return cachedCategorias
  }
  return null
}

const setCachedCategorias = (data: Categoria[]) => {
  cachedCategorias = data
  cachedCategoriasExpiresAt = now() + CATEGORIA_CACHE_TTL_MS
}

const invalidateCategoriasCache = () => {
  cachedCategorias = null
  cachedCategoriasExpiresAt = 0
}

const resolveCategoriaNombre = (categoria: ProductoRow['categoria']): string => {
  if (!categoria) return ''
  if (Array.isArray(categoria)) {
    return categoria[0]?.nombre ?? ''
  }
  return categoria.nombre ?? ''
}

export const mapProductoRow = (row: ProductoRow): ProductoConStock => {
  const { categoria, stock, embeddings, referenceImages, tienda_id, ...productoBase } = row
  const stockPorTalla = (stock ?? []).map((registro) => ({
    stockId: registro.id ?? 0,
    tallaId: registro.tallaId ?? null,
    almacenId: registro.almacenId ?? null,
    talla: registro.talla?.nombre ?? '',
    almacen: registro.almacen?.nombre ?? '',
    cantidad: typeof registro.cantidad === 'number' ? registro.cantidad : Number(registro.cantidad ?? 0),
  }))

  const stockTotal = stockPorTalla.reduce((total, detalle) => total + (detalle.cantidad ?? 0), 0)

  const mappedEmbeddings: ProductoEmbedding[] | undefined = embeddings
    ? embeddings
      .filter((item): item is NonNullable<typeof item> => Array.isArray(item.embedding) && item.productoId != null)
      .map((item) => ({
        id: item.id ?? 0,
        productoId: item.productoId ?? productoBase.id,
        embedding: item.embedding ?? [],
        fuente: item.fuente ?? null,
        referenceImageId: item.referenceImageId ?? null,
        createdAt: item.createdAt ?? new Date().toISOString(),
        updatedAt: item.updatedAt ?? new Date().toISOString(),
      }))
    : undefined

  const mappedReferenceImages: ProductoReferenceImage[] | undefined = referenceImages
    ? referenceImages
      .filter((item): item is NonNullable<typeof item> => Boolean(item?.id) && Boolean(item?.url))
      .map((item) => ({
        id: item.id ?? 0,
        productoId: item.productoId ?? productoBase.id,
        url: item.url ?? '',
        path: item.path ?? '',
        bucket: item.bucket ?? null,
        filename: item.filename ?? null,
        mimeType: item.mimeType ?? null,
        size:
          typeof item.size === 'number'
            ? item.size
            : item.size != null
              ? Number(item.size)
              : null,
        createdAt: item.createdAt ?? new Date().toISOString(),
        updatedAt: item.updatedAt ?? new Date().toISOString(),
      }))
    : undefined

  return {
    ...productoBase,
    tiendaId: tienda_id,
    categoria: resolveCategoriaNombre(categoria),
    stockTotal,
    stockPorTalla,
    embeddings: mappedEmbeddings,
    referenceImages: mappedReferenceImages,
  }
}

export class ProductoService {
  static async getAll(options?: { force?: boolean }): Promise<ProductoConStock[]> {
    const cached = getCachedProductos(options?.force)
    if (cached) {
      return cached
    }

    const lastKnownSnapshot = cachedProductos

    const { data, error } = await supabase.from('productos').select(PRODUCTO_SELECT)

    if (error) {
      console.error('Error cargando productos', error)
      return lastKnownSnapshot ?? []
    }

    if (!data) {
      return lastKnownSnapshot ?? []
    }

    const mapped = (data as ProductoRow[]).map(mapProductoRow)
    setCachedProductos(mapped)
    return mapped
  }

  static async getById(id: number): Promise<ProductoConStock | null> {
    const cached = cachedProductos?.find((producto) => producto.id === id)
    if (cached) {
      return cached
    }

    const { data, error } = await supabase
      .from('productos')
      .select(PRODUCTO_SELECT)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('Error buscando producto', error)
      return null
    }

    if (!data) {
      return null
    }

    return mapProductoRow(data as ProductoRow)
  }

  static async search(query: string): Promise<ProductoConStock[]> {
    const q = query.trim()
    if (!q) return this.getAll()

    const catalogo = await this.getAll()
    const normalized = q.toLowerCase()

    const resultados = catalogo.filter((producto) => {
      const nombre = producto.nombre?.toLowerCase() ?? ''
      const codigo = producto.codigo?.toLowerCase() ?? ''
      const categoria = producto.categoria?.toLowerCase() ?? ''
      return (
        nombre.includes(normalized) ||
        codigo.includes(normalized) ||
        categoria.includes(normalized)
      )
    })

    if (resultados.length > 0 || catalogo.length === 0) {
      return resultados
    }

    const { data, error } = await supabase
      .from('productos')
      .select(PRODUCTO_SELECT)
      .or(`nombre.ilike.%${q}%,codigo.ilike.%${q}%`)

    if (error || !data) {
      return resultados
    }

    return (data as ProductoRow[]).map(mapProductoRow)
  }

  static async getByCategoria(categoriaId: number): Promise<ProductoConStock[]> {
    const catalogo = await this.getAll()
    const filtrados = catalogo.filter((producto) => producto.categoriaId === categoriaId)
    if (filtrados.length > 0 || catalogo.length === 0) {
      return filtrados
    }

    const { data, error } = await supabase
      .from('productos')
      .select(PRODUCTO_SELECT)
      .eq('categoriaId', categoriaId)

    if (error || !data) {
      console.error('Error filtrando productos por categoría', error)
      return filtrados
    }

    return (data as ProductoRow[]).map(mapProductoRow)
  }

  static async getStockBajo(): Promise<ProductoConStock[]> {
    const all = await this.getAll()
    return all.filter((p) => p.stockTotal < p.stockMinimo)
  }

  static async create(producto: Omit<Producto, 'id' | 'createdAt' | 'tiendaId'>): Promise<Producto | null> {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return null

    // Fetch user profile to get tienda_id
    const { data: profile } = await supabase
      .from('usuarios')
      .select('tienda_id')
      .eq('auth_uid', userData.user.id)
      .single()

    if (!profile?.tienda_id) {
      console.error('No se pudo obtener la tienda del usuario')
      return null
    }

    const payload = {
      ...producto,
      tienda_id: profile.tienda_id,
      descripcion: producto.descripcion?.trim() || null,
      createdAt: new Date(),
    }

    const { data, error } = await supabase.from('productos').insert(payload).select(PRODUCTO_SELECT).single()
    if (error || !data) {
      console.error('Error al crear producto', error)
      return null
    }
    invalidateProductosCache()
    return mapProductoRow(data as ProductoRow)
  }

  static async getCategoriasActivas(): Promise<Categoria[]> {
    const cached = getCachedCategorias()
    if (cached) {
      return cached
    }

    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('estado', 'activo')
      .order('nombre', { ascending: true })

    if (error || !data) {
      return cachedCategorias ?? []
    }

    const mapped = data as Categoria[]
    setCachedCategorias(mapped)
    return mapped
  }

  static async update(id: number, data: Partial<Producto>): Promise<Producto | null> {
    const { data: updated, error } = await supabase.from('productos').update(data).eq('id', id).select(PRODUCTO_SELECT).single()
    if (error || !updated) return null
    invalidateProductosCache()
    return mapProductoRow(updated as ProductoRow)
  }

  static async delete(
    id: number,
    options?: {
      mode?: 'inactive' | 'hard'
    },
  ): Promise<boolean> {
    const mode = options?.mode === 'hard' ? 'hard' : 'soft'

    try {
      const origin =
        typeof window === 'undefined'
          ? process.env.NEXT_PUBLIC_SITE_URL
          || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : undefined)
          || 'http://localhost:3000'
          : window.location.origin

      if (process.env.NODE_ENV !== 'production') {
        console.debug('[ProductoService.delete] request', { id, mode, origin })
      }

      const response = await fetch(`${origin}/api/admin/productos/${id}?mode=${mode}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const details = await response.json().catch(() => null)
        console.error('Error eliminando producto', { status: response.status, details })
        return false
      }

      if (process.env.NODE_ENV !== 'production') {
        console.debug('[ProductoService.delete] success', { id, mode })
      }

      invalidateProductosCache()
      return true
    } catch (error) {
      console.error('Falló la solicitud para eliminar producto', error)
      return false
    }
  }

  static async warmCache(): Promise<void> {
    await Promise.allSettled([
      this.getAll(),
      this.getCategoriasActivas(),
    ])
  }

  static invalidateCache(): void {
    invalidateProductosCache()
    invalidateCategoriasCache()
  }
}
