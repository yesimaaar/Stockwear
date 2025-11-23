import { supabase } from '@/lib/supabase'
import { getCurrentTiendaId } from '@/lib/services/tenant-service'
import type { Cliente, Abono } from '@/lib/types'

export class ClienteService {
    static async getAll(): Promise<Cliente[]> {
        const tiendaId = await getCurrentTiendaId()
        const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .eq('tienda_id', tiendaId)
            .order('nombre', { ascending: true })

        if (error) {
            console.error('Error fetching clients', error)
            return []
        }

        return (data as any[]).map(mapClienteFromDB)
    }

    static async search(query: string): Promise<Cliente[]> {
        const tiendaId = await getCurrentTiendaId()
        const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .eq('tienda_id', tiendaId)
            .or(`nombre.ilike.%${query}%,documento.ilike.%${query}%`)
            .limit(10)

        if (error) {
            console.error('Error searching clients', error)
            return []
        }

        return (data as any[]).map(mapClienteFromDB)
    }

    static async create(payload: Partial<Cliente>): Promise<Cliente | null> {
        const tiendaId = await getCurrentTiendaId()
        const { data, error } = await supabase
            .from('clientes')
            .insert({
                tienda_id: tiendaId,
                nombre: payload.nombre,
                documento: payload.documento,
                telefono: payload.telefono,
                direccion: payload.direccion,
                email: payload.email,
                limite_credito: payload.limiteCredito ?? 0,
                saldo_actual: 0,
                estado: 'activo'
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating client', error)
            return null
        }

        return mapClienteFromDB(data)
    }

    static async registrarAbono(payload: {
        clienteId: number
        monto: number
        metodoPagoId?: number
        nota?: string
        usuarioId?: string
        ventaId?: number
        cajaSesionId?: number
    }): Promise<Abono | null> {
        const tiendaId = await getCurrentTiendaId()

        // 1. Register Abono
        const { data: abonoData, error: abonoError } = await supabase
            .from('abonos')
            .insert({
                tienda_id: tiendaId,
                cliente_id: payload.clienteId,
                venta_id: payload.ventaId,
                monto: payload.monto,
                metodo_pago_id: payload.metodoPagoId,
                usuario_id: payload.usuarioId,
                nota: payload.nota,
                caja_sesion_id: payload.cajaSesionId
            })
            .select()
            .single()

        if (abonoError) {
            console.error('Error registering payment', abonoError)
            throw new Error('No se pudo registrar el abono')
        }

        // 2. Update Client Balance
        const { error: updateError } = await supabase.rpc('actualizar_saldo_cliente', {
            p_cliente_id: payload.clienteId,
            p_monto: -payload.monto // Negative to reduce debt
        })

        if (updateError) {
            // If RPC fails (likely doesn't exist), do manual
            const { data: client } = await supabase.from('clientes').select('saldo_actual').eq('id', payload.clienteId).single()
            if (client) {
                const newBalance = (client.saldo_actual || 0) - payload.monto
                await supabase.from('clientes').update({ saldo_actual: newBalance }).eq('id', payload.clienteId)
            }
        }

        // 3. Update Sale Balance if ventaId is provided
        if (payload.ventaId) {
            const { data: venta } = await supabase.from('ventas').select('saldo_pendiente').eq('id', payload.ventaId).single()
            if (venta) {
                const nuevoSaldo = Math.max(0, (venta.saldo_pendiente || 0) - payload.monto)
                await supabase.from('ventas').update({ saldo_pendiente: nuevoSaldo }).eq('id', payload.ventaId)
            }
        }

        return mapAbonoFromDB(abonoData)
    }

    static async getAbonos(clienteId: number): Promise<Abono[]> {
        const tiendaId = await getCurrentTiendaId()
        const { data, error } = await supabase
            .from('abonos')
            .select('*')
            .eq('tienda_id', tiendaId)
            .eq('cliente_id', clienteId)
            .order('createdAt', { ascending: false })

        if (error) return []
        return (data as any[]).map(mapAbonoFromDB)
    }
}

function mapClienteFromDB(db: any): Cliente {
    return {
        id: db.id,
        tiendaId: db.tienda_id,
        nombre: db.nombre,
        documento: db.documento,
        telefono: db.telefono,
        direccion: db.direccion,
        email: db.email,
        limiteCredito: db.limite_credito,
        saldoActual: db.saldo_actual,
        estado: db.estado,
        createdAt: db.createdAt,
        updatedAt: db.updatedAt
    }
}

function mapAbonoFromDB(db: any): Abono {
    return {
        id: db.id,
        tiendaId: db.tienda_id,
        clienteId: db.cliente_id,
        ventaId: db.venta_id,
        monto: db.monto,
        metodoPagoId: db.metodo_pago_id,
        usuarioId: db.usuario_id,
        nota: db.nota,
        createdAt: db.createdAt
    }
}
