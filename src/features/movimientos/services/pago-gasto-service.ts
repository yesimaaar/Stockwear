import { supabase } from "@/lib/supabase"
import { getCurrentTiendaId } from "@/features/auth/services/tenant-service"
import type { PagoGasto } from "@/lib/types"

export interface PagoGastoInput {
    gastoId: number
    monto: number
    metodoPago: string
    nota?: string
    usuarioId?: string | null
    cajaSesionId?: number | null
}

export const PagoGastoService = {
    async create(pago: PagoGastoInput): Promise<PagoGasto> {
        const tiendaId = await getCurrentTiendaId()

        // 1. Insert payment
        const { data: pagoData, error: pagoError } = await supabase
            .from("pagos_gastos")
            .insert({
                tienda_id: tiendaId,
                gasto_id: pago.gastoId,
                usuario_id: pago.usuarioId,
                caja_sesion_id: pago.cajaSesionId,
                monto: pago.monto,
                metodo_pago: pago.metodoPago,
                nota: pago.nota,
            })
            .select()
            .single()

        if (pagoError) throw pagoError

        // 2. Update gasto balance
        // First fetch current gasto to get saldoPendiente
        const { data: gastoData, error: gastoError } = await supabase
            .from("gastos")
            .select("saldo_pendiente, monto")
            .eq("id", pago.gastoId)
            .single()

        if (gastoError) throw gastoError

        const newSaldo = Math.max(0, Number(gastoData.saldo_pendiente) - pago.monto)
        const newEstado = newSaldo === 0 ? 'pagado' : 'pendiente'

        const { error: updateError } = await supabase
            .from("gastos")
            .update({
                saldo_pendiente: newSaldo,
                estado: newEstado
            })
            .eq("id", pago.gastoId)

        if (updateError) throw updateError

        return {
            id: pagoData.id,
            tiendaId: pagoData.tienda_id,
            gastoId: pagoData.gasto_id,
            usuarioId: pagoData.usuario_id,
            cajaSesionId: pagoData.caja_sesion_id,
            monto: Number(pagoData.monto),
            metodoPago: pagoData.metodo_pago,
            nota: pagoData.nota,
            fechaPago: pagoData.fecha_pago,
            createdAt: pagoData.created_at,
        }
    },

    async getAll(filters?: { limit?: number }): Promise<PagoGasto[]> {
        const tiendaId = await getCurrentTiendaId()

        let query = supabase
            .from("pagos_gastos")
            .select("*, gasto:gastos(*)")
            .eq("tienda_id", tiendaId)
            .order("fecha_pago", { ascending: false })

        if (filters?.limit) {
            query = query.limit(filters.limit)
        }

        const { data, error } = await query

        if (error) throw error

        return data.map(row => ({
            id: row.id,
            tiendaId: row.tienda_id,
            gastoId: row.gasto_id,
            usuarioId: row.usuario_id,
            cajaSesionId: row.caja_sesion_id,
            monto: Number(row.monto),
            metodoPago: row.metodo_pago,
            nota: row.nota,
            fechaPago: row.fecha_pago,
            createdAt: row.created_at,
            gasto: row.gasto ? {
                id: row.gasto.id,
                tiendaId: row.gasto.tienda_id,
                usuarioId: row.gasto.usuario_id,
                cajaSesionId: row.gasto.caja_sesion_id,
                descripcion: row.gasto.descripcion,
                monto: Number(row.gasto.monto),
                categoria: row.gasto.categoria,
                metodoPago: row.gasto.metodo_pago,
                proveedor: row.gasto.proveedor,
                estado: row.gasto.estado,
                saldoPendiente: Number(row.gasto.saldo_pendiente),
                fechaVencimiento: row.gasto.fecha_vencimiento,
                fechaGasto: row.gasto.fecha_gasto,
                createdAt: row.gasto.created_at,
            } : undefined
        }))
    }
}
