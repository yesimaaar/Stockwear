import { supabase } from '@/lib/supabase'
import { getCurrentTiendaId } from '@/features/auth/services/tenant-service'
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
    metodoPagoId?: number
    cajaSesionId?: number
    clienteId?: number | null
    tipoVenta?: 'contado' | 'credito'
    numeroCuotas?: number
    interesPorcentaje?: number
    montoCuota?: number
    frecuenciaPago?: 'semanal' | 'mensual'
  }): Promise<VentaConDetalles | null> {
    console.log("Creating Sale with Payload:", payload)
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

    let fechaPrimerVencimiento: string | null = null
    if (payload.tipoVenta === 'credito' && payload.frecuenciaPago) {
      const fecha = new Date()
      if (payload.frecuenciaPago === 'semanal') {
        fecha.setDate(fecha.getDate() + 7)
      } else if (payload.frecuenciaPago === 'mensual') {
        fecha.setMonth(fecha.getMonth() + 1)
      }
      fechaPrimerVencimiento = fecha.toISOString()
    }

    if (!payload.metodoPagoId) {
      throw new Error("El método de pago es obligatorio.")
    }
    const { data: ventaData, error: ventaError } = await supabase
      .from('ventas')
      .insert({
        folio,
        total: totalVenta,
        "usuarioId": usuarioId,
        "createdAt": new Date().toISOString(),
        tienda_id: tiendaId,
        metodo_pago_id: payload.metodoPagoId,
        caja_sesion_id: payload.cajaSesionId ?? null,
        cliente_id: payload.clienteId ?? null,
        tipo_venta: payload.tipoVenta ?? 'contado',
        saldo_pendiente: payload.tipoVenta === 'credito' ? (payload.montoCuota ? payload.montoCuota * (payload.numeroCuotas || 1) : totalVenta) : 0,
        numero_cuotas: payload.numeroCuotas ?? 1,
        interes_porcentaje: payload.interesPorcentaje ?? 0,
        monto_cuota: payload.montoCuota ?? 0,
        frecuencia_pago: payload.frecuenciaPago ?? null,
        fecha_primer_vencimiento: fechaPrimerVencimiento
      })
      .select()
      .single()

    if (ventaError || !ventaData) {
      console.error('Error al registrar la venta (Detalles):', JSON.stringify(ventaError, null, 2))
      throw new Error(`No se pudo registrar la venta: ${ventaError?.message || 'Error desconocido'}`)
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

    // Update client balance if credit sale
    if (payload.tipoVenta === 'credito' && payload.clienteId) {
      const totalDeuda = payload.montoCuota ? payload.montoCuota * (payload.numeroCuotas || 1) : totalVenta
      const { error: clientError } = await supabase.rpc('actualizar_saldo_cliente', {
        p_cliente_id: payload.clienteId,
        p_monto: totalDeuda
      })

      if (clientError) {
        // Fallback manual update
        const { data: client } = await supabase.from('clientes').select('saldo_actual').eq('id', payload.clienteId).single()
        if (client) {
          const totalDeuda = payload.montoCuota ? payload.montoCuota * (payload.numeroCuotas || 1) : totalVenta
          const newBalance = (client.saldo_actual || 0) + totalDeuda
          await supabase.from('clientes').update({ saldo_actual: newBalance }).eq('id', payload.clienteId)
        }
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

  static async getById(id: number): Promise<any | null> {
    const tiendaId = await getCurrentTiendaId()

    // 1. Get Sale info (raw, no joins)
    const { data: venta, error: ventaError } = await supabase
      .from('ventas')
      .select('*')
      .eq('id', id)
      .eq('tienda_id', tiendaId)
      .single()

    if (ventaError || !venta) {
      console.error('Error al obtener venta (getById):', ventaError)
      return null
    }

    // 1.5 Get Client info manually
    let cliente = null
    if (venta.cliente_id) {
      const { data: c } = await supabase.from('clientes').select('*').eq('id', venta.cliente_id).single()
      cliente = c
    }

    // 2. Get Details info (raw)
    const { data: detallesRaw, error: detallesError } = await supabase
      .from('ventasDetalle')
      .select('*')
      .eq('ventaId', venta.id)

    if (detallesError) {
      console.error('Error al obtener detalles raw:', detallesError)
      return { ...venta, ventasDetalle: [] }
    }

    // 3. Enrich details manually to avoid relation issues
    const detalles = await Promise.all((detallesRaw as any[]).map(async (d) => {
      const { data: p } = await supabase.from('productos').select('nombre, codigo').eq('id', d.productoId).single()

      let t = { nombre: '-' }
      if (d.tallaId) {
        const { data: tallad } = await supabase.from('tallas').select('nombre').eq('id', d.tallaId).single()
        if (tallad) t = tallad
      }

      // Almacen defaults
      let a = { nombre: '-' }
      if (d.almacenId) {
        const { data: almad } = await supabase.from('almacenes').select('nombre').eq('id', d.almacenId).single()
        if (almad) a = almad
      }

      return {
        ...d,
        producto: p || { nombre: 'Producto desconocido', codigo: '' },
        talla: t,
        almacen: a
      }
    }))

    return {
      ...venta,
      cliente,
      ventasDetalle: detalles
    }
  }
}
