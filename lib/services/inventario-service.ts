import { supabase } from '@/lib/supabase'
import type {
  Almacen,
  Categoria,
  HistorialStock,
  Talla,
} from '@/lib/types'

export interface CategoriaResumen extends Categoria {
  productosActivos: number
}

export interface AlmacenResumen extends Almacen {
  productosUnicos: number
  stockTotal: number
}

export interface MovimientoDetallado {
  id: number
  tipo: HistorialStock['tipo']
  cantidad: number
  motivo: string | null
  createdAt: string
  productoNombre: string
  tallaNombre: string
  almacenNombre: string
  usuarioNombre: string
}

export class InventarioService {
  static async getCategoriasResumen(): Promise<CategoriaResumen[]> {
    const [categoriasResp, productosResp] = await Promise.all([
      supabase.from('categorias').select('id,nombre,descripcion,estado').order('nombre', { ascending: true }),
      supabase.from('productos').select('id,"categoriaId",estado')
    ])

    if (categoriasResp.error) {
      console.error('Error al cargar categorías', categoriasResp.error)
    }
    if (productosResp.error) {
      console.error('Error al cargar productos para categorías', productosResp.error)
    }

    const categorias = (categoriasResp.data as Categoria[]) || []
    const productos = productosResp.data as Array<{ id: number; categoriaId: number; estado: string }> | null

    const conteoPorCategoria = (productos || []).reduce<Record<number, number>>((acc, producto) => {
      if (producto.estado !== 'activo') return acc
      acc[producto.categoriaId] = (acc[producto.categoriaId] || 0) + 1
      return acc
    }, {})

    return categorias.map((categoria) => ({
      ...categoria,
      productosActivos: conteoPorCategoria[categoria.id] ?? 0,
    }))
  }

  static async getTallas(): Promise<Talla[]> {
    const { data } = await supabase
      .from('tallas')
      .select('id,nombre,tipo,estado')
      .order('tipo', { ascending: true })
      .order('nombre', { ascending: true })

    return (data as Talla[]) || []
  }

  static async getAlmacenesResumen(): Promise<AlmacenResumen[]> {
    const [almacenesResp, stockResp] = await Promise.all([
      supabase.from('almacenes').select('id,nombre,direccion,tipo,estado').order('nombre', { ascending: true }),
      supabase.from('stock').select('productoId,"almacenId",cantidad'),
    ])

    if (almacenesResp.error) {
      console.error('Error al cargar almacenes', almacenesResp.error)
    }
    if (stockResp.error) {
      console.error('Error al cargar existencias', stockResp.error)
    }

    const almacenes = (almacenesResp.data as Almacen[]) || []
    const stock = stockResp.data as Array<{ productoId: number | null; almacenId: number; cantidad: number | null }> | null

    const stockTotalPorAlmacen = new Map<number, number>()
    const productosPorAlmacen = new Map<number, Set<number>>()

    for (const item of stock || []) {
      const almacenId = item.almacenId
      const cantidad = item.cantidad ?? 0
      stockTotalPorAlmacen.set(almacenId, (stockTotalPorAlmacen.get(almacenId) || 0) + cantidad)
      if (!productosPorAlmacen.has(almacenId)) {
        productosPorAlmacen.set(almacenId, new Set<number>())
      }
      if (item.productoId != null) {
        productosPorAlmacen.get(almacenId)!.add(item.productoId)
      }
    }

    return almacenes.map((almacen) => ({
      ...almacen,
      stockTotal: stockTotalPorAlmacen.get(almacen.id) ?? 0,
      productosUnicos: productosPorAlmacen.get(almacen.id)?.size ?? 0,
    }))
  }

  static async getHistorialDetallado(limit = 50): Promise<MovimientoDetallado[]> {
    const { data: movimientosData, error: movimientosError } = await supabase
      .from('historialStock')
      .select('id,tipo,productoId,tallaId,almacenId,cantidad,usuarioId,motivo,"createdAt"')
      .order('createdAt', { ascending: false })
      .limit(limit)

    if (movimientosError) {
      console.error('Error al cargar historial de stock', movimientosError)
    }

  const movimientos = (movimientosData as HistorialStock[] | null) || []

    const productoIds = Array.from(
      new Set(
        movimientos
          .map((mov) => mov.productoId)
          .filter((id): id is number => typeof id === 'number' && !Number.isNaN(id)),
      ),
    )
    const tallaIds = Array.from(
      new Set(
        movimientos
          .map((mov) => mov.tallaId)
          .filter((id): id is number => typeof id === 'number' && !Number.isNaN(id)),
      ),
    )
    const almacenIds = Array.from(
      new Set(
        movimientos
          .map((mov) => mov.almacenId)
          .filter((id): id is number => typeof id === 'number' && !Number.isNaN(id)),
      ),
    )
    const usuarioIds = Array.from(
      new Set(
        movimientos
          .map((mov) => mov.usuarioId)
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0),
      ),
    )

    const [productosResp, tallasResp, almacenesResp, usuariosResp] = await Promise.all([
      productoIds.length
        ? supabase.from('productos').select('id,nombre').in('id', productoIds)
        : Promise.resolve({ data: [], error: null }),
      tallaIds.length
        ? supabase.from('tallas').select('id,nombre').in('id', tallaIds)
        : Promise.resolve({ data: [], error: null }),
      almacenIds.length
        ? supabase.from('almacenes').select('id,nombre').in('id', almacenIds)
        : Promise.resolve({ data: [], error: null }),
      usuarioIds.length
        ? supabase.from('usuarios').select('id,nombre').in('id', usuarioIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if ('error' in productosResp && productosResp.error) {
      console.error('Error al cargar nombres de productos', productosResp.error)
    }
    if ('error' in tallasResp && tallasResp.error) {
      console.error('Error al cargar tallas', tallasResp.error)
    }
    if ('error' in almacenesResp && almacenesResp.error) {
      console.error('Error al cargar almacenes relacionados', almacenesResp.error)
    }
    if ('error' in usuariosResp && usuariosResp.error) {
      console.error('Error al cargar usuarios', usuariosResp.error)
    }

    const productosMap = new Map<number, string>()
    ;(productosResp.data as Array<{ id: number; nombre: string }> | null || []).forEach((producto) => {
      productosMap.set(producto.id, producto.nombre)
    })

    const tallasMap = new Map<number, string>()
    ;(tallasResp.data as Array<{ id: number; nombre: string }> | null || []).forEach((talla) => {
      tallasMap.set(talla.id, talla.nombre)
    })

    const almacenesMap = new Map<number, string>()
    ;(almacenesResp.data as Array<{ id: number; nombre: string }> | null || []).forEach((almacen) => {
      almacenesMap.set(almacen.id, almacen.nombre)
    })

    const usuariosMap = new Map<string, string>()
    ;(usuariosResp.data as Array<{ id: string; nombre: string }> | null || []).forEach((usuario) => {
      usuariosMap.set(usuario.id, usuario.nombre)
    })

    return movimientos.map((movimiento) => {
      const productoNombre =
        movimiento.productoId != null ? productosMap.get(movimiento.productoId) || 'Producto sin nombre' : 'Sin producto'
      const tallaNombre =
        movimiento.tallaId != null ? tallasMap.get(movimiento.tallaId) || `ID ${movimiento.tallaId}` : 'N/A'
      const almacenNombre =
        movimiento.almacenId != null ? almacenesMap.get(movimiento.almacenId) || 'Sin almacén' : 'Sin almacén'
      const usuarioNombre = movimiento.usuarioId
        ? usuariosMap.get(movimiento.usuarioId) || 'Usuario desconocido'
        : 'Automático'

      const createdAtIso = movimiento.createdAt
        ? new Date(movimiento.createdAt).toISOString()
        : new Date().toISOString()

      return {
        id: movimiento.id,
        tipo: movimiento.tipo,
  cantidad: movimiento.cantidad ?? 0,
        motivo: movimiento.motivo ?? null,
        createdAt: createdAtIso,
        productoNombre,
        tallaNombre,
        almacenNombre,
        usuarioNombre,
      }
    })
  }
}
