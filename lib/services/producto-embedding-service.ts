import { supabase } from '@/lib/supabase'
import { getCurrentTiendaId } from '@/lib/services/tenant-service'
import type { ProductoEmbedding } from '@/lib/types'

export interface CatalogEmbedding {
  productoId: number
  codigo: string
  nombre: string
  imagen: string | null
  proveedor: string | null
  descripcion: string | null
  embeddings: Float32Array[]
  rawEmbeddings: ProductoEmbedding[]
}

const CACHE_TTL_MS = 60 * 1000
type CatalogCacheEntry = { data: CatalogEmbedding[]; expiresAt: number }
const catalogCache = new Map<number, CatalogCacheEntry>()

const now = () => Date.now()

function mapEmbeddingRow(row: any): CatalogEmbedding | null {
  if (!row || typeof row.id !== 'number') {
    return null
  }

  const embeddingsRaw = Array.isArray(row.embeddings)
    ? row.embeddings.filter((item: any) => Array.isArray(item?.embedding))
    : []

  if (embeddingsRaw.length === 0) {
    return {
      productoId: row.id,
      codigo: row.codigo ?? '',
      nombre: row.nombre ?? '',
      imagen: row.imagen ?? null,
      proveedor: row.proveedor ?? null,
      descripcion: row.descripcion ?? null,
      embeddings: [],
      rawEmbeddings: [],
    }
  }

  const rawEmbeddings: ProductoEmbedding[] = embeddingsRaw.map((item: any) => ({
    id: item.id as number,
    productoId: row.id as number,
    embedding: (item.embedding as number[]) ?? [],
    fuente: item.fuente ?? null,
    createdAt: item.createdAt ?? new Date().toISOString(),
    updatedAt: item.updatedAt ?? new Date().toISOString(),
  }))

  const embeddings = rawEmbeddings.map((item) => Float32Array.from(item.embedding ?? []))

  return {
    productoId: row.id as number,
    codigo: row.codigo ?? '',
    nombre: row.nombre ?? '',
    imagen: row.imagen ?? null,
    proveedor: row.proveedor ?? null,
    descripcion: row.descripcion ?? null,
    embeddings,
    rawEmbeddings,
  }
}

export class ProductoEmbeddingService {
  static invalidateCache(tiendaId?: number) {
    if (typeof tiendaId === 'number') {
      catalogCache.delete(tiendaId)
      return
    }
    catalogCache.clear()
  }

  static async getCatalogEmbeddings(options?: { force?: boolean; tiendaId?: number }): Promise<CatalogEmbedding[]> {
    const tiendaId = options?.tiendaId ?? (await getCurrentTiendaId())
    const entry = catalogCache.get(tiendaId)
    if (!options?.force && entry && entry.expiresAt > now()) {
      return entry.data
    }

    const { data, error } = await supabase
      .from('productos')
      .select('id,codigo,nombre,descripcion,imagen,proveedor,embeddings:producto_embeddings(id,embedding,fuente,"createdAt","updatedAt")')
      .eq('estado', 'activo')
      .eq('tienda_id', tiendaId)

    if (error) {
      console.error('No fue posible cargar embeddings de productos', error)
      return entry?.data ?? []
    }

    const mapped = (data ?? [])
      .map((row) => mapEmbeddingRow(row))
      .filter((item): item is CatalogEmbedding => item !== null)

    catalogCache.set(tiendaId, {
      data: mapped,
      expiresAt: now() + CACHE_TTL_MS,
    })
    return mapped
  }

  static async addEmbedding(productoId: number, embedding: Float32Array, fuente?: string | null): Promise<void> {
    const payload = {
      productoId,
      embedding: Array.from(embedding) as number[],
      fuente: fuente ?? null,
    }

    const { error } = await supabase.from('producto_embeddings').insert(payload)
    if (error) {
      throw new Error(error.message || 'No se pudo registrar el embedding del producto')
    }

    const tiendaId = await getCurrentTiendaId()
    this.invalidateCache(tiendaId)
  }

  static async deleteEmbedding(id: number): Promise<void> {
    const { error } = await supabase.from('producto_embeddings').delete().eq('id', id)
    if (error) {
      throw new Error(error.message || 'No se pudo eliminar el embedding del producto')
    }

    const tiendaId = await getCurrentTiendaId()
    this.invalidateCache(tiendaId)
  }
}
