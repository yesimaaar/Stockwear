import { supabase } from '@/lib/supabase'
import type { Producto, Categoria, Talla, Almacen } from '@/lib/types'

export interface ProductoConStock extends Producto {
  categoria: string
  stockTotal: number
  stockPorTalla: Array<{
    talla: string
    almacen: string
    cantidad: number
  }>
}

export class ProductoService {
  static async getAll(): Promise<ProductoConStock[]> {
    const { data: productos, error } = await supabase.from('productos').select('*')
    if (error || !productos) return []

    // Map to ProductoConStock by fetching stock per producto
    const results: ProductoConStock[] = []
    for (const p of productos as Producto[]) {
      const detalle = await this.getById((p as any).id as number)
      if (detalle) results.push(detalle)
    }
    return results
  }

  static async getById(id: number): Promise<ProductoConStock | null> {
    const { data: producto, error } = await supabase.from('productos').select('*').eq('id', id).single()
    if (error || !producto) return null

    const { data: categoria } = await supabase.from('categorias').select('*').eq('id', producto.categoriaId).single()

    const { data: stockEntries } = await supabase.from('stock').select('*').eq('productoId', id)
    const stockProducto = (stockEntries || []) as Array<{ tallaId: number; almacenId: number; cantidad: number }>
    const stockTotal = stockProducto.reduce((sum, s) => sum + (s.cantidad || 0), 0)

    const stockPorTalla = [] as ProductoConStock['stockPorTalla']
    for (const s of stockProducto) {
      const { data: talla } = await supabase.from('tallas').select('*').eq('id', s.tallaId).single()
      const { data: almacen } = await supabase.from('almacenes').select('*').eq('id', s.almacenId).single()
      stockPorTalla.push({
        talla: (talla as Talla)?.nombre || '',
        almacen: (almacen as Almacen)?.nombre || '',
        cantidad: s.cantidad || 0,
      })
    }

    return {
      ...(producto as Producto),
      categoria: (categoria as Categoria)?.nombre || '',
      stockTotal,
      stockPorTalla,
    }
  }

  static async search(query: string): Promise<ProductoConStock[]> {
    const q = query.trim()
    if (!q) return this.getAll()

    const { data, error } = await supabase.from('productos').select('*').or(
      `nombre.ilike.%${q}%,codigo.ilike.%${q}%`,
    )
    if (error || !data) return []
    const results: ProductoConStock[] = []
    for (const p of data as Producto[]) {
      const detalle = await this.getById((p as any).id as number)
      if (detalle) results.push(detalle)
    }
    return results
  }

  static async getByCategoria(categoriaId: number): Promise<ProductoConStock[]> {
    const { data, error } = await supabase.from('productos').select('*').eq('categoriaId', categoriaId)
    if (error || !data) return []
    const results: ProductoConStock[] = []
    for (const p of data as Producto[]) {
      const detalle = await this.getById((p as any).id as number)
      if (detalle) results.push(detalle)
    }
    return results
  }

  static async getStockBajo(): Promise<ProductoConStock[]> {
    const all = await this.getAll()
    return all.filter((p) => p.stockTotal < p.stockMinimo)
  }

  static async create(producto: Omit<Producto, 'id' | 'createdAt'>): Promise<Producto | null> {
    const { data, error } = await supabase.from('productos').insert({ ...producto, createdAt: new Date() }).select().single()
    if (error || !data) return null
    return data as Producto
  }

  static async update(id: number, data: Partial<Producto>): Promise<Producto | null> {
    const { data: updated, error } = await supabase.from('productos').update(data).eq('id', id).select().single()
    if (error || !updated) return null
    return updated as Producto
  }

  static async delete(id: number): Promise<boolean> {
    const { data, error } = await supabase.from('productos').update({ estado: 'inactivo' }).eq('id', id)
    return !error
  }
}
