import { supabase } from "@/lib/supabase"
import { getCurrentTiendaId } from "@/features/auth/services/tenant-service"
import type { Gasto } from "@/lib/types"

export interface GastoInput {
    descripcion: string
    monto: number
    categoria: string
    metodoPago: string
    proveedor?: string | null
    estado: 'pagado' | 'pendiente'
    saldoPendiente?: number
    fechaVencimiento?: string | null
    fechaGasto: string
    cajaSesionId?: number | null
    usuarioId?: string | null
}

export const GastoService = {
    async create(gasto: GastoInput): Promise<Gasto> {
        const tiendaId = await getCurrentTiendaId()

        const { data, error } = await supabase
            .from("gastos")
            .insert({
                tienda_id: tiendaId,
                usuario_id: gasto.usuarioId,
                caja_sesion_id: gasto.cajaSesionId,
                descripcion: gasto.descripcion,
                monto: gasto.monto,
                categoria: gasto.categoria,
                metodo_pago: gasto.metodoPago,
                proveedor: gasto.proveedor,
                estado: gasto.estado,
                saldo_pendiente: gasto.saldoPendiente ?? 0,
                fecha_vencimiento: gasto.fechaVencimiento,
                fecha_gasto: gasto.fechaGasto,
            })
            .select()
            .single()

        if (error) throw error

        return {
            id: data.id,
            tiendaId: data.tienda_id,
            usuarioId: data.usuario_id,
            cajaSesionId: data.caja_sesion_id,
            descripcion: data.descripcion,
            monto: Number(data.monto),
            categoria: data.categoria,
            metodoPago: data.metodo_pago,
            proveedor: data.proveedor,
            estado: data.estado,
            saldoPendiente: Number(data.saldo_pendiente),
            fechaVencimiento: data.fecha_vencimiento,
            fechaGasto: data.fecha_gasto,
            createdAt: data.created_at,
        }
    },

    async getAll(filters?: {
        estado?: 'pagado' | 'pendiente',
        limit?: number,
        startDate?: Date,
        endDate?: Date
    }): Promise<Gasto[]> {
        const tiendaId = await getCurrentTiendaId()

        let query = supabase
            .from("gastos")
            .select("*")
            .eq("tienda_id", tiendaId)
            .order("fecha_gasto", { ascending: false })

        if (filters?.estado) {
            query = query.eq("estado", filters.estado)
        }

        if (filters?.startDate) {
            query = query.gte("fecha_gasto", filters.startDate.toISOString())
        }

        if (filters?.endDate) {
            query = query.lte("fecha_gasto", filters.endDate.toISOString())
        }

        if (filters?.limit) {
            query = query.limit(filters.limit)
        }

        const { data, error } = await query

        if (error) throw error

        return data.map(row => ({
            id: row.id,
            tiendaId: row.tienda_id,
            usuarioId: row.usuario_id,
            cajaSesionId: row.caja_sesion_id,
            descripcion: row.descripcion,
            monto: Number(row.monto),
            categoria: row.categoria,
            metodoPago: row.metodo_pago,
            proveedor: row.proveedor,
            estado: row.estado,
            saldoPendiente: Number(row.saldo_pendiente),
            fechaVencimiento: row.fecha_vencimiento,
            fechaGasto: row.fecha_gasto,
            createdAt: row.created_at,
        }))
    }
}
