import { supabase } from "@/lib/supabase"
import { getCurrentTiendaId } from "./tenant-service"
import type { CajaSesion, MetodoPago } from "@/lib/types"

export const CajaService = {
    async getMetodosPago(): Promise<MetodoPago[]> {
        const tiendaId = await getCurrentTiendaId()
        const { data, error } = await supabase
            .from("metodos_pago")
            .select("*")
            .eq("tienda_id", tiendaId)
            .eq("estado", "activo")
            .order("id")

        if (error) throw error
        return data.map((row) => ({
            id: row.id,
            tiendaId: row.tienda_id,
            nombre: row.nombre,
            tipo: row.tipo,
            estado: row.estado,
        }))
    },

    async getSesionActual(usuarioId: string): Promise<CajaSesion | null> {
        const tiendaId = await getCurrentTiendaId()
        const { data, error } = await supabase
            .from("caja_sesiones")
            .select("*")
            .eq("tienda_id", tiendaId)
            .eq("usuario_id", usuarioId)
            .eq("estado", "abierta")
            .maybeSingle()

        if (error) throw error
        if (!data) return null

        return {
            id: data.id,
            tiendaId: data.tienda_id,
            usuarioId: data.usuario_id,
            fechaApertura: data.fecha_apertura,
            montoInicial: Number(data.monto_inicial),
            estado: data.estado,
        }
    },

    async abrirCaja(usuarioId: string, montoInicial: number): Promise<CajaSesion> {
        const tiendaId = await getCurrentTiendaId()

        // Verificar si ya tiene una sesión abierta
        const sesionActual = await this.getSesionActual(usuarioId)
        if (sesionActual) {
            throw new Error("Ya tienes una caja abierta.")
        }

        const { data, error } = await supabase
            .from("caja_sesiones")
            .insert({
                tienda_id: tiendaId,
                usuario_id: usuarioId,
                monto_inicial: montoInicial,
                estado: "abierta",
                fecha_apertura: new Date().toISOString(),
            })
            .select()
            .single()

        if (error) throw error

        return {
            id: data.id,
            tiendaId: data.tienda_id,
            usuarioId: data.usuario_id,
            fechaApertura: data.fecha_apertura,
            montoInicial: Number(data.monto_inicial),
            estado: data.estado,
        }
    },

    async cerrarCaja(
        sesionId: number,
        montoFinalEsperado: number,
        montoFinalReal: number
    ): Promise<CajaSesion> {
        const diferencia = montoFinalReal - montoFinalEsperado

        const { data, error } = await supabase
            .from("caja_sesiones")
            .update({
                fecha_cierre: new Date().toISOString(),
                monto_final_esperado: montoFinalEsperado,
                monto_final_real: montoFinalReal,
                diferencia,
                estado: "cerrada",
            })
            .eq("id", sesionId)
            .select()
            .single()

        if (error) throw error

        return {
            id: data.id,
            tiendaId: data.tienda_id,
            usuarioId: data.usuario_id,
            fechaApertura: data.fecha_apertura,
            fechaCierre: data.fecha_cierre,
            montoInicial: Number(data.monto_inicial),
            montoFinalEsperado: Number(data.monto_final_esperado),
            montoFinalReal: Number(data.monto_final_real),
            diferencia: Number(data.diferencia),
            estado: data.estado,
        }
    },

    async getResumenSesion(sesionId: number) {
        const tiendaId = await getCurrentTiendaId()

        // Obtener ventas de esta sesión
        const { data: ventas, error } = await supabase
            .from("ventas")
            .select("total, metodo_pago_id")
            .eq("caja_sesion_id", sesionId)
            .eq("tienda_id", tiendaId)

        if (error) throw error

        const totalVentas = ventas?.reduce((sum, v) => sum + Number(v.total), 0) ?? 0

        // Aquí se podrían sumar gastos si estuvieran vinculados a la sesión
        // Por ahora solo ventas

        return {
            totalVentas,
            totalGastos: 0, // Placeholder
        }
    }
}
