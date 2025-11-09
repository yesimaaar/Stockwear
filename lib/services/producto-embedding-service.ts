import { supabase } from '@/lib/supabase'
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
let cachedCatalog: CatalogEmbedding[] | null = null
let cacheExpiresAt = 0

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
  static invalidateCache() {
    cachedCatalog = null
    cacheExpiresAt = 0
  }

  static async getCatalogEmbeddings(options?: { force?: boolean }): Promise<CatalogEmbedding[]> {
    if (!options?.force && cachedCatalog && cacheExpiresAt > now()) {
      return cachedCatalog
    }

    const { data, error } = await supabase
      .from('productos')
      .select('id,codigo,nombre,descripcion,imagen,proveedor,embeddings:producto_embeddings(id,embedding,fuente,"createdAt","updatedAt")')
      .eq('estado', 'activo')

    if (error) {
      console.error('No fue posible cargar embeddings de productos', error)
      return cachedCatalog ?? []
    }

    const mapped = (data ?? [])
      .map((row) => mapEmbeddingRow(row))
      .filter((item): item is CatalogEmbedding => item !== null)

    cachedCatalog = mapped
    cacheExpiresAt = now() + CACHE_TTL_MS
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

    this.invalidateCache()
  }

  static async deleteEmbedding(id: number): Promise<void> {
    const { error } = await supabase.from('producto_embeddings').delete().eq('id', id)
    if (error) {
      throw new Error(error.message || 'No se pudo eliminar el embedding del producto')
    }

    this.invalidateCache()
  }
}
