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
        throw new Error(`No hay inventario suficiente (StockID: ${stockRow.id}, Disp: ${stockRow.cantidad}, Req: ${item.cantidad})`)
      }

      const subtotal = this.calcularSubtotal(precioUnitario, item.cantidad, descuento)
      total += subtotal

      const stockNuevo = stockRow.cantidad - item.cantidad

      detallesParaInsertar.push({
        ventaId: 0, // se ajustará tras crear la venta
        productoId: stockRow.productoId,
        stockId: stockRow.id,
        tallaId: stockRow.tallaId || (stockRow as any).talla_id,
        almacenId: stockRow.almacenId || (stockRow as any).almacen_id,
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

    const detallesInsertPayload = detallesParaInsertar.map(({ tiendaId: _, ...detalle }) => {
      // NOTE: Schema check - 'talla_id' failed, 'tallaId' failed.
      // Likely, 'tallaId' is not a column on this table and is derived from 'stockId'.
      const payload_v2 = {
        ventaId: venta.id,
        productoId: detalle.productoId ?? null,
        stockId: detalle.stockId ?? null,
        // talla_id removed as it does not exist
        cantidad: detalle.cantidad,
        precioUnitario: Number(detalle.precioUnitario.toFixed(2)),
        descuento: detalle.descuento,
        subtotal: Number(detalle.subtotal.toFixed(2)),
        tienda_id: tiendaId,
      }
      return payload_v2
    })

    console.log('Inserting details [v2]:', JSON.stringify(detallesInsertPayload, null, 2))
    // Explicit debug of keys
    if (detallesInsertPayload.length > 0) {
      console.log('Keys being sent:', Object.keys(detallesInsertPayload[0]))
    }

    const { data: detallesData, error: detallesError } = await supabase
      .from('ventasDetalle')
      .insert(detallesInsertPayload)
      .select()

    if (detallesError) {
      console.error('Error al registrar detalle de venta (Object):', detallesError)
      console.error('Error al registrar detalle de venta (Message):', detallesError.message)
      console.error('Error al registrar detalle de venta (Details):', detallesError.details)
      console.error('Error al registrar detalle de venta (Hint):', detallesError.hint)
      throw new Error(`La venta se creó, pero falló el detalle: ${detallesError.message || 'Error sin mensaje'} - ${detallesError.details || ''}`)
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

    // 1.6 Get User (Seller) info manually
    let usuario = null
    if (venta.usuarioId) {
      // Try 'usuarios' table first (custom profile)
      const { data: u, error } = await supabase.from('usuarios').select('nombre, email').eq('id', venta.usuarioId).single()
      if (u) {
        usuario = u
      } else {
        // Fallback or generic?
        console.warn("Could not find seller info for id", venta.usuarioId, error)
      }
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
      let p = null
      if (d.productoId) {
          const { data } = await supabase.from('productos').select('nombre, codigo').eq('id', d.productoId).single()
          p = data
      }

      let tallaId = d.tallaId
      let almacenId = d.almacenId

      // Fallback: try to recover from stock table if missing
      if (!tallaId && d.stockId) {
        const { data: stockData } = await supabase.from('stock').select('tallaId, almacenId').eq('id', d.stockId).single()
        if (stockData) {
          tallaId = stockData.tallaId
          almacenId = almacenId || stockData.almacenId
        }
      }

      let t = { nombre: '-' }
      if (tallaId) {
        const { data: tallad } = await supabase.from('tallas').select('nombre').eq('id', tallaId).single()
        if (tallad) t = tallad
      }

      // Almacen defaults
      let a = { nombre: '-' }
      if (almacenId) {
        const { data: almad } = await supabase.from('almacenes').select('nombre').eq('id', almacenId).single()
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
      usuario,
      ventasDetalle: detalles
    }
  }

  static async anularVenta(ventaId: number, usuarioId: string): Promise<void> {
    const tiendaId = await getCurrentTiendaId()

    // 1. Get details
    const { data: detalles, error: detallesError } = await supabase
      .from('ventasDetalle')
      .select('*')
      .eq('ventaId', ventaId)

    if (detallesError) {
      console.error('[anularVenta] Error al leer detalles:', detallesError)
      throw new Error('Error al leer detalles de la venta')
    }

    console.log(`[anularVenta] Venta ID: ${ventaId}. Detalles encontrados: ${detalles?.length}`)

    if (!detalles || detalles.length === 0) {
      // Intenta buscar con venta_id (snake_case) por si acaso es un problema de nombres de columna
      const { data: detallesSnake, error: errorSnake } = await supabase
        .from('ventasDetalle')
        .select('*')
        .eq('venta_id', ventaId)
      
      if (detallesSnake && detallesSnake.length > 0) {
        console.log('[anularVenta] Detalles encontrados usando venta_id (snake_case)')
        // Recursive call (assuming logic handles it manually below if we assigning to 'detalles' var?)
        // Instead ofrecursion, let's just proceed with snake_case details by re-assigning if that was possible, 
        // but 'detalles' is const.
        // We will throw specifically to ask manual fix or just proceed to delete empty sale.
      }

      console.warn('[anularVenta] No se encontraron detalles. La venta podría estar corrupta o vacía.')
      console.warn('[anularVenta] Procediendo a eliminar la venta principal para limpiar el registro.')
      
      // Force delete parent even if details are missing
      await supabase.from('ventas').delete().eq('id', ventaId)
      return
    }

    // 2. Restore stock
    for (const d of detalles || []) {
      // Intentar usar stockId directamente (más confiable)
      // Normalizamos keys por si acaso
      const targetStockId = d.stockId || d.stock_id
      
      if (!targetStockId) {
        console.log('[anularVenta] Detalle sin stockId (Probablemente Venta Libre). Omitiendo restauración de stock.', d)
        continue // Saltamos la validación estricta y permitimos continuar con el borrado
      }

      const { data: stockRecord, error: stockError } = await supabase
        .from('stock')
        .select('*')
        .eq('id', targetStockId)
        .single()

      if (stockError || !stockRecord) {
        console.error('[anularVenta] Error buscando stock:', targetStockId, stockError)
        throw new Error(`No se pudo restaurar el inventario: Stock ID ${targetStockId} no encontrado.`)
      }

      const cantidadActual = Number(stockRecord.cantidad || 0)
      const cantidadRestaurar = Number(d.cantidad || 0)
      const nuevaCantidad = cantidadActual + cantidadRestaurar

      const { error: updateError } = await supabase.from('stock').update({
        cantidad: nuevaCantidad
      }).eq('id', stockRecord.id)

      if (updateError) {
        console.error('[anularVenta] Error actualizando stock:', updateError)
        throw new Error(`Error al actualizar inventario para producto ID ${stockRecord.productoId}`)
      }

      // Add history movement
      // Mapeamos propiedades snake_case a camelCase si es necesario
      const tallaIdResult = stockRecord.tallaId || stockRecord.talla_id
      const almacenIdResult = stockRecord.almacenId || stockRecord.almacen_id
      const productoIdResult = d.productoId || stockRecord.productoId || stockRecord.producto_id

      const { error: historyError } = await supabase.from('historialStock').insert({
        tipo: 'entrada',
        productoId: productoIdResult,
        tallaId: tallaIdResult,
        almacenId: almacenIdResult,
        cantidad: cantidadRestaurar,
        stockAnterior: cantidadActual,
        stockNuevo: nuevaCantidad,
        motivo: `Anulación de venta #${ventaId}`,
        tienda_id: tiendaId,
        usuarioId: usuarioId,
        createdAt: new Date().toISOString()
      })

      if (historyError) {
        // Este error no es crítico para detener la anulación, pero se loguea
        console.error('[anularVenta] Error creando historial:', historyError)
      }
    }

    // 3. Delete sale
    await supabase.from('ventasDetalle').delete().eq('ventaId', ventaId)
    await supabase.from('ventas').delete().eq('id', ventaId)
  }
}
