import { supabase } from '@/lib/supabase'
import { GeocodingService } from '@/lib/services/geocoding-service'
import type {
  Almacen,
  Categoria,
  EstadoRegistro,
  HistorialStock,
  Talla,
} from '@/lib/types'

type SupabaseError = { message?: string } | null

export interface CategoriaResumen extends Categoria {
  productosActivos: number
}

type CategoriaUpsertPayload = {
  nombre: string
  descripcion: string | null
  estado: EstadoRegistro
}

type AlmacenUpsertPayload = {
  nombre: string
  direccion: string | null
  tipo: Almacen['tipo']
  estado: EstadoRegistro
}

type TallaUpsertPayload = {
  nombre: string
  tipo: Talla['tipo']
  estado: EstadoRegistro
}

type MovimientoEntradaPayload = {
  productoId: number
  tallaId: number | null
  almacenId: number | null
  cantidad: number
  motivo?: string | null
  usuarioId?: string | null
  costoUnitario?: number | null
  createdAt?: string | Date
}

type MovimientoAjustePayload = MovimientoEntradaPayload & {
  tipo: 'entrada' | 'salida' | 'ajuste'
}

type TransferenciaPayload = {
  productoId: number
  tallaId: number | null
  origenId: number
  destinoId: number
  cantidad: number
  usuarioId?: string | null
  motivo?: string | null
  createdAt?: string | Date
}

export interface AlmacenResumen extends Almacen {
  productosUnicos: number
  stockTotal: number
}

export interface AlmacenProductoDetalle {
  productoId: number
  productoNombre: string
  codigo: string
  categoria: string | null
  stockTotal: number
  stockPorTalla: Array<{
    talla: string | null
    cantidad: number
  }>
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
  private static readonly ALMACEN_BASE_FIELDS = 'id,nombre,direccion,tipo,estado'
  private static readonly ALMACEN_FIELDS_WITH_COORDS = `${InventarioService.ALMACEN_BASE_FIELDS},latitud,longitud`
  private static almacenesCoordsAvailable: boolean | null = null
  private static warnedMissingAlmacenCoords = false

  private static shouldRequestAlmacenCoords(): boolean {
    return this.almacenesCoordsAvailable !== false
  }

  private static isCoordinateColumnError(error: SupabaseError): boolean {
    if (!error?.message) {
      return false
    }
    const normalized = error.message.toLowerCase()
    return normalized.includes('latitud') || normalized.includes('longitud')
  }

  private static handleCoordinateColumnError(error: SupabaseError): boolean {
    if (!this.isCoordinateColumnError(error)) {
      return false
    }
    this.almacenesCoordsAvailable = false
    if (!this.warnedMissingAlmacenCoords) {
      console.warn('Columnas latitud/longitud no existen en la tabla "almacenes". Operando en modo legacy.')
      this.warnedMissingAlmacenCoords = true
    }
    return true
  }

  private static async executeAlmacenesFetch<T>(
    fetcher: (fields: string) => Promise<{ data: T; error: SupabaseError }>,
  ): Promise<{ data: T; error: SupabaseError }> {
    const includeCoords = this.shouldRequestAlmacenCoords()
    let response = await fetcher(includeCoords ? this.ALMACEN_FIELDS_WITH_COORDS : this.ALMACEN_BASE_FIELDS)

    if (includeCoords && response.error && this.handleCoordinateColumnError(response.error)) {
      response = await fetcher(this.ALMACEN_BASE_FIELDS)
    } else if (includeCoords && !response.error) {
      this.almacenesCoordsAvailable = true
    }

    return response
  }

  private static buildStockQuery(productoId: number, tallaId: number | null, almacenId: number | null) {
    let query = supabase
      .from('stock')
      .select('id,cantidad')
      .eq('productoId', productoId)

    query = tallaId == null ? query.is('tallaId', null) : query.eq('tallaId', tallaId)
    query = almacenId == null ? query.is('almacenId', null) : query.eq('almacenId', almacenId)

    return query
  }

  private static async findStockRow(
    productoId: number,
    tallaId: number | null,
    almacenId: number | null,
  ): Promise<{ id: number; cantidad: number | null } | null> {
    const query = this.buildStockQuery(productoId, tallaId, almacenId)
    const { data, error } = await query.maybeSingle()

    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message || 'No se pudo consultar el stock actual')
    }

    return (data as { id: number; cantidad: number | null } | null) ?? null
  }

  private static normalizeDireccion(direccion?: string | null): string | null {
    const trimmed = direccion?.trim() ?? ''
    return trimmed.length > 0 ? trimmed : null
  }

  private static async geocodeDireccion(direccion?: string | null) {
    const direccionNormalizada = this.normalizeDireccion(direccion)
    if (!direccionNormalizada) {
      return null
    }

    return GeocodingService.geocode(direccionNormalizada)
  }

  private static async guardarStock(
    productoId: number,
    tallaId: number | null,
    almacenId: number | null,
    cantidad: number,
  ): Promise<number> {
    const existente = await this.findStockRow(productoId, tallaId, almacenId)

    if (existente) {
      const { error: updateError } = await supabase.from('stock').update({ cantidad }).eq('id', existente.id)

      if (updateError) {
        throw new Error(updateError.message || 'No se pudo actualizar el stock')
      }

      return existente.id
    }

    const { data: insertData, error: insertError } = await supabase
      .from('stock')
      .insert({
        productoId,
        tallaId,
        almacenId,
        cantidad,
      })
      .select('id')
      .single()

    if (insertError || !insertData) {
      throw new Error(insertError?.message || 'No se pudo crear el registro de inventario')
    }

    return (insertData as { id: number }).id
  }
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

  static async createCategoria(payload: CategoriaUpsertPayload): Promise<Categoria> {
    const { data, error } = await supabase
      .from('categorias')
      .insert({
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        estado: payload.estado,
      })
      .select('id,nombre,descripcion,estado')
      .single()

    if (error) {
      throw new Error(error.message || 'No se pudo crear la categoría')
    }

    return data as Categoria
  }

  static async updateCategoria(id: number, payload: CategoriaUpsertPayload): Promise<Categoria> {
    const { data, error } = await supabase
      .from('categorias')
      .update({
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        estado: payload.estado,
      })
      .eq('id', id)
      .select('id,nombre,descripcion,estado')
      .single()

    if (error) {
      throw new Error(error.message || 'No se pudo actualizar la categoría')
    }

    return data as Categoria
  }

  static async deleteCategoria(id: number): Promise<void> {
    const { error } = await supabase.from('categorias').delete().eq('id', id)

    if (error) {
      throw new Error(error.message || 'No se pudo eliminar la categoría')
    }
  }

  static async getTallas(): Promise<Talla[]> {
    const { data } = await supabase
      .from('tallas')
      .select('id,nombre,tipo,estado')
      .order('tipo', { ascending: true })
      .order('nombre', { ascending: true })

    return (data as Talla[]) || []
  }

  static async getTallasActivas(): Promise<Talla[]> {
    const { data, error } = await supabase
      .from('tallas')
      .select('id,nombre,tipo,estado')
      .eq('estado', 'activo')
      .order('tipo', { ascending: true })
      .order('nombre', { ascending: true })

    if (error) {
      console.error('Error al cargar tallas activas', error)
    }

    return (data as Talla[]) || []
  }

  static async getProductosActivosBasicos(): Promise<Array<{ id: number; nombre: string; codigo: string }>> {
    const { data, error } = await supabase
      .from('productos')
      .select('id,nombre,codigo,estado')
      .eq('estado', 'activo')
      .order('nombre', { ascending: true })

    if (error) {
      console.error('Error al cargar productos activos', error)
    }

    return ((data as Array<{ id: number; nombre: string; codigo: string }> | null) || []).map((item) => ({
      id: item.id,
      nombre: item.nombre,
      codigo: item.codigo,
    }))
  }

  static async getAlmacenesActivos(): Promise<Almacen[]> {
    const { data, error } = await this.executeAlmacenesFetch<Almacen[] | null>((fields) =>
      supabase
        .from('almacenes')
        .select(fields)
        .eq('estado', 'activo')
        .order('nombre', { ascending: true }),
    )

    if (error) {
      console.error('Error al cargar almacenes activos', error)
    }

    return (data as Almacen[]) || []
  }

  static async createTalla(payload: TallaUpsertPayload): Promise<Talla> {
    const { data, error } = await supabase
      .from('tallas')
      .insert({
        nombre: payload.nombre,
        tipo: payload.tipo,
        estado: payload.estado,
      })
      .select('id,nombre,tipo,estado')
      .single()

    if (error) {
      throw new Error(error.message || 'No se pudo crear la talla')
    }

    return data as Talla
  }

  static async updateTalla(id: number, payload: TallaUpsertPayload): Promise<Talla> {
    const { data, error } = await supabase
      .from('tallas')
      .update({
        nombre: payload.nombre,
        tipo: payload.tipo,
        estado: payload.estado,
      })
      .eq('id', id)
      .select('id,nombre,tipo,estado')
      .single()

    if (error) {
      throw new Error(error.message || 'No se pudo actualizar la talla')
    }

    return data as Talla
  }

  static async deleteTalla(id: number): Promise<void> {
    const { error } = await supabase.from('tallas').delete().eq('id', id)

    if (error) {
      throw new Error(error.message || 'No se pudo eliminar la talla')
    }
  }

  static async registrarEntrada(payload: MovimientoEntradaPayload): Promise<void> {
    const cantidad = Number(payload.cantidad)
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new Error('La cantidad debe ser mayor a cero')
    }

    const createdAt = payload.createdAt ? new Date(payload.createdAt).toISOString() : new Date().toISOString()

    const stockMatch = await this.findStockRow(payload.productoId, payload.tallaId ?? null, payload.almacenId ?? null)

    const stockAnterior = Number(stockMatch?.cantidad ?? 0)
    const stockNuevo = stockAnterior + cantidad

    await this.guardarStock(payload.productoId, payload.tallaId ?? null, payload.almacenId ?? null, stockNuevo)

    const { error: historialError } = await supabase.from('historialStock').insert({
      tipo: 'entrada',
      productoId: payload.productoId,
      tallaId: payload.tallaId,
      almacenId: payload.almacenId,
      cantidad,
      stockAnterior,
      stockNuevo,
      usuarioId: payload.usuarioId ?? null,
      motivo: payload.motivo ?? 'Entrada manual',
      costoUnitario: payload.costoUnitario ?? null,
      createdAt,
    })

    if (historialError) {
      throw new Error(historialError.message || 'El stock se actualizó, pero falló el registro del historial')
    }
  }

  static async registrarAjuste(payload: MovimientoAjustePayload): Promise<void> {
    const cantidad = Number(payload.cantidad)
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new Error('La cantidad debe ser mayor a cero')
    }

    const stockEntry = await this.findStockRow(payload.productoId, payload.tallaId ?? null, payload.almacenId ?? null)

    const stockActual = Number(stockEntry?.cantidad ?? 0)
    const createdAt = payload.createdAt ? new Date(payload.createdAt).toISOString() : new Date().toISOString()

    let stockNuevo = stockActual
    if (payload.tipo === 'entrada' || payload.tipo === 'ajuste') {
      stockNuevo = stockActual + cantidad
    } else if (payload.tipo === 'salida') {
      stockNuevo = stockActual - cantidad
      if (stockNuevo < 0) {
        throw new Error('El ajuste dejaría el stock en negativo')
      }
    }

    await this.guardarStock(payload.productoId, payload.tallaId ?? null, payload.almacenId ?? null, stockNuevo)

    const { error: historialError } = await supabase.from('historialStock').insert({
      tipo: payload.tipo,
      productoId: payload.productoId,
      tallaId: payload.tallaId,
      almacenId: payload.almacenId,
      cantidad,
      stockAnterior: stockActual,
      stockNuevo,
      usuarioId: payload.usuarioId ?? null,
      motivo: payload.motivo ?? 'Ajuste manual',
      costoUnitario: payload.costoUnitario ?? null,
      createdAt,
    })

    if (historialError) {
      throw new Error(historialError.message || 'El ajuste se aplicó, pero no se registró el historial')
    }
  }

  static async transferirStock(payload: TransferenciaPayload): Promise<void> {
    const cantidad = Number(payload.cantidad)
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new Error('La cantidad debe ser mayor a cero')
    }

    if (payload.origenId === payload.destinoId) {
      throw new Error('El almacén de destino debe ser diferente al de origen')
    }

    const createdAt = payload.createdAt ? new Date(payload.createdAt).toISOString() : new Date().toISOString()

    const origenStock = await this.findStockRow(payload.productoId, payload.tallaId ?? null, payload.origenId ?? null)

    const stockOrigenActual = Number(origenStock?.cantidad ?? 0)
    if (stockOrigenActual < cantidad) {
      throw new Error('No hay inventario suficiente en el almacén origen para completar la transferencia')
    }

    const stockOrigenNuevo = stockOrigenActual - cantidad
    await this.guardarStock(payload.productoId, payload.tallaId ?? null, payload.origenId ?? null, stockOrigenNuevo)

    const destinoStock = await this.findStockRow(payload.productoId, payload.tallaId ?? null, payload.destinoId ?? null)
    const stockDestinoActual = Number(destinoStock?.cantidad ?? 0)
    const stockDestinoNuevo = stockDestinoActual + cantidad
    await this.guardarStock(payload.productoId, payload.tallaId ?? null, payload.destinoId ?? null, stockDestinoNuevo)

    const motivoSalida = payload.motivo
      ? `${payload.motivo} (origen)`
      : `Transferencia a almacén ${payload.destinoId}`
    const motivoEntrada = payload.motivo
      ? `${payload.motivo} (destino)`
      : `Transferencia desde almacén ${payload.origenId}`

    const { error: historialError } = await supabase.from('historialStock').insert([
      {
        tipo: 'salida',
        productoId: payload.productoId,
        tallaId: payload.tallaId,
        almacenId: payload.origenId,
        cantidad,
        stockAnterior: stockOrigenActual,
        stockNuevo: stockOrigenNuevo,
        usuarioId: payload.usuarioId ?? null,
        motivo: motivoSalida,
        costoUnitario: null,
        createdAt,
      },
      {
        tipo: 'entrada',
        productoId: payload.productoId,
        tallaId: payload.tallaId,
        almacenId: payload.destinoId,
        cantidad,
        stockAnterior: stockDestinoActual,
        stockNuevo: stockDestinoNuevo,
        usuarioId: payload.usuarioId ?? null,
        motivo: motivoEntrada,
        costoUnitario: null,
        createdAt,
      },
    ])

    if (historialError) {
      throw new Error(historialError.message || 'La transferencia se aplicó, pero no se registró en el historial')
    }
  }

  static async getAlmacenesResumen(): Promise<AlmacenResumen[]> {
    const [almacenesResp, stockResp] = await Promise.all([
      this.executeAlmacenesFetch<Almacen[] | null>((fields) =>
        supabase.from('almacenes').select(fields).order('nombre', { ascending: true }),
      ),
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

  static async getAlmacenProductos(almacenId: number): Promise<AlmacenProductoDetalle[]> {
    const { data: stockData, error: stockError } = await supabase
      .from('stock')
      .select('productoId,tallaId,cantidad,almacenId')
      .eq('almacenId', almacenId)

    if (stockError) {
      throw new Error(stockError.message || 'No se pudo obtener el inventario del almacén')
    }

    const stockEntries = (stockData || []).filter((item) => item.productoId != null) as Array<{
      productoId: number
      tallaId: number | null
      cantidad: number | null
    }>

    if (stockEntries.length === 0) {
      return []
    }

    const productoIds = Array.from(new Set(stockEntries.map((item) => item.productoId)))
    const tallaIds = Array.from(
      new Set(
        stockEntries
          .map((item) => item.tallaId)
          .filter((id): id is number => typeof id === 'number' && !Number.isNaN(id)),
      ),
    )

    const [{ data: productosData, error: productosError }, { data: categoriasData, error: categoriasError }] =
      await Promise.all([
        supabase.from('productos').select('id,nombre,codigo,categoriaId').in('id', productoIds),
        supabase.from('categorias').select('id,nombre'),
      ])

    if (productosError) {
      throw new Error(productosError.message || 'No se pudieron obtener los productos del almacén')
    }
    if (categoriasError) {
      throw new Error(categoriasError.message || 'No se pudieron obtener las categorías relacionadas')
    }

    const tallasMap = new Map<number, string>()
    if (tallaIds.length > 0) {
      const { data: tallasData, error: tallasError } = await supabase
        .from('tallas')
        .select('id,nombre')
        .in('id', tallaIds)
      if (tallasError) {
        throw new Error(tallasError.message || 'No se pudieron obtener las tallas asociadas')
      }
      ;(tallasData ?? []).forEach((talla) => {
        tallasMap.set(talla.id, talla.nombre)
      })
    }

    const categoriasMap = new Map<number, string>()
    ;(categoriasData ?? []).forEach((categoria) => {
      categoriasMap.set(categoria.id, categoria.nombre)
    })

    const productosMap = new Map<number, { nombre: string; codigo: string; categoriaId: number | null }>()
    ;(productosData ?? []).forEach((producto) => {
      productosMap.set(producto.id, {
        nombre: producto.nombre,
        codigo: producto.codigo,
        categoriaId: producto.categoriaId ?? null,
      })
    })

    const agrupado = new Map<number, AlmacenProductoDetalle>()

    for (const entry of stockEntries) {
      const productoInfo = productosMap.get(entry.productoId)
      if (!productoInfo) {
        continue
      }

      if (!agrupado.has(entry.productoId)) {
        agrupado.set(entry.productoId, {
          productoId: entry.productoId,
          productoNombre: productoInfo.nombre,
          codigo: productoInfo.codigo,
          categoria: productoInfo.categoriaId ? categoriasMap.get(productoInfo.categoriaId) ?? null : null,
          stockTotal: 0,
          stockPorTalla: [],
        })
      }

      const registro = agrupado.get(entry.productoId)!
      const cantidad = entry.cantidad ?? 0
      registro.stockTotal += cantidad
      registro.stockPorTalla.push({
        talla: entry.tallaId ? tallasMap.get(entry.tallaId) ?? `ID ${entry.tallaId}` : null,
        cantidad,
      })
    }

    return Array.from(agrupado.values()).sort((a, b) => a.productoNombre.localeCompare(b.productoNombre))
  }

  static async createAlmacen(payload: AlmacenUpsertPayload): Promise<Almacen> {
    const direccion = this.normalizeDireccion(payload.direccion)
    const geocodeResult = await this.geocodeDireccion(direccion)

    const attempt = (includeCoords: boolean) => {
      const insertPayload: Record<string, unknown> = {
        nombre: payload.nombre,
        direccion,
        tipo: payload.tipo,
        estado: payload.estado,
      }

      if (includeCoords) {
        insertPayload.latitud = geocodeResult?.lat ?? null
        insertPayload.longitud = geocodeResult?.lng ?? null
      }

      const fields = includeCoords ? this.ALMACEN_FIELDS_WITH_COORDS : this.ALMACEN_BASE_FIELDS

      return supabase.from('almacenes').insert(insertPayload).select(fields).single()
    }

    let includeCoords = this.shouldRequestAlmacenCoords()
    let { data, error } = await attempt(includeCoords)

    if (error && includeCoords && this.handleCoordinateColumnError(error)) {
      includeCoords = false
      ;({ data, error } = await attempt(includeCoords))
    } else if (includeCoords && !error) {
      this.almacenesCoordsAvailable = true
    }

    if (error) {
      throw new Error(error.message || 'No se pudo crear el almacén')
    }

    return data as Almacen
  }

  static async updateAlmacen(id: number, payload: AlmacenUpsertPayload): Promise<Almacen> {
    const direccion = this.normalizeDireccion(payload.direccion)
    const geocodeResult = await this.geocodeDireccion(direccion)

    const attempt = (includeCoords: boolean) => {
      const updateData: Record<string, unknown> = {
        nombre: payload.nombre,
        direccion,
        tipo: payload.tipo,
        estado: payload.estado,
      }

      if (includeCoords) {
        if (!direccion) {
          updateData.latitud = null
          updateData.longitud = null
        } else if (geocodeResult) {
          updateData.latitud = geocodeResult.lat
          updateData.longitud = geocodeResult.lng
        }
      }

      const fields = includeCoords ? this.ALMACEN_FIELDS_WITH_COORDS : this.ALMACEN_BASE_FIELDS

      return supabase.from('almacenes').update(updateData).eq('id', id).select(fields).single()
    }

    let includeCoords = this.shouldRequestAlmacenCoords()
    let { data, error } = await attempt(includeCoords)

    if (error && includeCoords && this.handleCoordinateColumnError(error)) {
      includeCoords = false
      ;({ data, error } = await attempt(includeCoords))
    } else if (includeCoords && !error) {
      this.almacenesCoordsAvailable = true
    }

    if (error) {
      throw new Error(error.message || 'No se pudo actualizar el almacén')
    }

    return data as Almacen
  }

  static async deleteAlmacen(id: number): Promise<void> {
    const { error } = await supabase.from('almacenes').delete().eq('id', id)

    if (error) {
      throw new Error(error.message || 'No se pudo eliminar el almacén')
    }
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
