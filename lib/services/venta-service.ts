import { supabase } from '@/lib/supabase'
import { getCurrentTiendaId } from '@/lib/services/tenant-service'
import type { Venta, VentaDetalle } from '@/lib/types'

interface StockRow {
  id: number
  productoId: number
  tallaId: number | null
  almacenId: number | null
  cantidad: number
}

export interface VentaDraftItem {
  stockId: number
  cantidad: number
  precioUnitario: number
  descuento?: number
}

export interface VentaConDetalles extends Venta {
  detalles: VentaDetalle[]
}

export class VentaService {
  static generarFolio(): string {
    const now = new Date()
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const randomPart = Math.floor(Math.random() * 9000 + 1000)
    return `VTA-${datePart}-${randomPart}`
  }

  static calcularSubtotal(precioUnitario: number, cantidad: number, descuento?: number): number {
    const descuentoSeguro = Number.isFinite(descuento) ? Number(descuento) : 0
    const factor = 1 - descuentoSeguro / 100
    return Math.max(precioUnitario * cantidad * factor, 0)
  }

  static async create(payload: {
    usuarioId?: string | null
    folio?: string
    items: VentaDraftItem[]
  }): Promise<VentaConDetalles | null> {
    const tiendaId = await getCurrentTiendaId()
    if (!payload.items.length) {
      throw new Error('Debes añadir al menos un producto a la venta')
    }

    const stockIds = Array.from(new Set(payload.items.map((item) => item.stockId)))
    const { data: stockData, error: stockError } = await supabase
      .from('stock')
      .select('id,productoId,tallaId,almacenId,cantidad')
      .eq('tienda_id', tiendaId)
      .in('id', stockIds)

    if (stockError) {
      console.error('Error al consultar stock para la venta', stockError)
      throw new Error('No se pudo validar el inventario. Intenta nuevamente')
    }

    const stockMap = new Map<number, StockRow>()
    for (const row of (stockData as StockRow[] | null) || []) {
      stockMap.set(row.id, {
        id: row.id,
        productoId: row.productoId,
        tallaId: row.tallaId,
        almacenId: row.almacenId,
        cantidad: row.cantidad ?? 0,
      })
    }

    const detallesParaInsertar: Array<Omit<VentaDetalle, 'id'>> = []
    const movimientosHistorial: Array<{
      stockId: number
      tipo: 'venta'
      productoId: number
      tallaId: number | null
      almacenId: number | null
      cantidad: number
      stockAnterior: number
      stockNuevo: number
      usuarioId: string | null
      motivo: string
      costoUnitario: number
    }> = []

    let total = 0

    for (const item of payload.items) {
      if (item.cantidad <= 0) {
        throw new Error('La cantidad debe ser mayor a cero')
      }

      const precioUnitario = Number(item.precioUnitario)
      if (!Number.isFinite(precioUnitario) || precioUnitario <= 0) {
        throw new Error('El precio unitario es inválido')
      }

      const descuento = Number.isFinite(item.descuento) ? Number(item.descuento) : 0

      const stockRow = stockMap.get(item.stockId)
      if (!stockRow) {
        throw new Error('El stock seleccionado ya no está disponible')
      }

      if (stockRow.cantidad < item.cantidad) {
        throw new Error('No hay inventario suficiente para completar la venta')
      }

      const subtotal = this.calcularSubtotal(precioUnitario, item.cantidad, descuento)
      total += subtotal

      const stockNuevo = stockRow.cantidad - item.cantidad

      detallesParaInsertar.push({
        ventaId: 0, // se ajustará tras crear la venta
        productoId: stockRow.productoId,
        stockId: stockRow.id,
        cantidad: item.cantidad,
        precioUnitario,
        descuento,
        subtotal,
        tiendaId,
      })

      movimientosHistorial.push({
        stockId: stockRow.id,
        tipo: 'venta',
        productoId: stockRow.productoId,
        tallaId: stockRow.tallaId,
        almacenId: stockRow.almacenId,
        cantidad: item.cantidad,
        stockAnterior: stockRow.cantidad,
        stockNuevo,
        usuarioId: payload.usuarioId ?? null,
        motivo: 'Venta en punto de venta',
        costoUnitario: precioUnitario,
      })

      stockMap.set(item.stockId, { ...stockRow, cantidad: stockNuevo })
    }

    const totalVenta = Number(total.toFixed(2))

    const folio = payload.folio?.trim() && payload.folio.trim().length > 0 ? payload.folio.trim() : this.generarFolio()
    const usuarioId = payload.usuarioId ?? null

    const { data: ventaData, error: ventaError } = await supabase
      .from('ventas')
      .insert({ folio, total: totalVenta, usuarioId, createdAt: new Date().toISOString(), tienda_id: tiendaId })
      .select()
      .single()

    if (ventaError || !ventaData) {
      console.error('Error al registrar la venta', ventaError)
      throw new Error('No se pudo registrar la venta. Intenta nuevamente')
    }

    const venta = ventaData as Venta

    const detallesInsert = detallesParaInsertar.map(({ tiendaId: _, ...detalle }) => ({
      ...detalle,
      ventaId: venta.id,
      tienda_id: tiendaId,
      precioUnitario: Number(detalle.precioUnitario.toFixed(2)),
      subtotal: Number(detalle.subtotal.toFixed(2)),
    }))

    const { data: detallesData, error: detallesError } = await supabase
      .from('ventasDetalle')
      .insert(detallesInsert)
      .select()

    if (detallesError) {
      console.error('Error al registrar detalle de venta', detallesError)
      throw new Error('La venta se creó, pero falló el detalle. Revisa los registros')
    }

    for (const movimiento of movimientosHistorial) {
      const { error: updateError } = await supabase
        .from('stock')
        .update({ cantidad: movimiento.stockNuevo })
        .eq('id', movimiento.stockId)

      if (updateError) {
        console.error('Error al actualizar stock tras la venta', updateError)
        throw new Error('La venta se registró, pero no se pudo actualizar el inventario')
      }
    }

    for (const movimiento of movimientosHistorial) {
      const { error: historialError } = await supabase.from('historialStock').insert({
        tipo: movimiento.tipo,
        productoId: movimiento.productoId,
        tallaId: movimiento.tallaId,
        almacenId: movimiento.almacenId,
        cantidad: movimiento.cantidad,
        stockAnterior: movimiento.stockAnterior,
        stockNuevo: movimiento.stockNuevo,
        usuarioId: movimiento.usuarioId,
        motivo: `${movimiento.motivo} (${folio})`,
        costoUnitario: movimiento.costoUnitario,
        createdAt: new Date().toISOString(),
        tienda_id: tiendaId,
      })

      if (historialError) {
        console.error('Error al registrar historial de stock', historialError)
      }
    }

    return {
      ...venta,
      detalles: (detallesData as VentaDetalle[]) || [],
    }
  }

  static async getAll(): Promise<VentaConDetalles[]> {
    const tiendaId = await getCurrentTiendaId()
    const { data: ventasData, error: ventasError } = await supabase
      .from('ventas')
      .select('*')
      .eq('tienda_id', tiendaId)
      .order('createdAt', { ascending: false })

    if (ventasError || !ventasData) {
      console.error('Error al obtener ventas', ventasError)
      return []
    }

    const ventas = ventasData as Venta[]
    const ventaIds = ventas.map((venta) => venta.id)

    if (!ventaIds.length) {
      return ventas.map((venta) => ({ ...venta, detalles: [] }))
    }

    const { data: detallesData, error: detallesError } = await supabase
      .from('ventasDetalle')
      .select('*')
      .eq('tienda_id', tiendaId)
      .in('ventaId', ventaIds)

    if (detallesError) {
      console.error('Error al obtener detalles de venta', detallesError)
      return ventas.map((venta) => ({ ...venta, detalles: [] }))
    }

    const detallesPorVenta = new Map<number, VentaDetalle[]>()
    for (const detalle of (detallesData as VentaDetalle[]) || []) {
      const current = detallesPorVenta.get(detalle.ventaId) || []
      current.push(detalle)
      detallesPorVenta.set(detalle.ventaId, current)
    }

    return ventas.map((venta) => ({
      ...venta,
      detalles: detallesPorVenta.get(venta.id) || [],
    }))
  }
}
