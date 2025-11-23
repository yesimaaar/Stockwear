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
            .select("total, metodo_pago_id, tipo_venta")
            .eq("caja_sesion_id", sesionId)
            .eq("tienda_id", tiendaId)

        if (error) throw error

        // Filter out credit sales from the total
        const totalVentas = ventas?.reduce((sum, v) => {
            if (v.tipo_venta === 'credito') return sum
            return sum + Number(v.total)
        }, 0) ?? 0

        // Obtener abonos de esta sesión
        const { data: abonos, error: abonosError } = await supabase
            .from("abonos")
            .select("monto")
            .eq("caja_sesion_id", sesionId)
            .eq("tienda_id", tiendaId)

        if (abonosError) throw abonosError

        const totalAbonos = abonos?.reduce((sum, a) => sum + Number(a.monto), 0) ?? 0

        return {
            totalVentas,
            totalAbonos,
            totalIngresos: totalVentas + totalAbonos,
            totalGastos: 0, // Placeholder
        }
    },

    async getHistorialCierres(): Promise<CajaSesion[]> {
        const tiendaId = await getCurrentTiendaId()

        // 1. Get sessions
        const { data: sesiones, error } = await supabase
            .from("caja_sesiones")
            .select("*")
            .eq("tienda_id", tiendaId)
            .eq("estado", "cerrada")
            .order("fecha_cierre", { ascending: false })

        if (error) throw error
        if (!sesiones || sesiones.length === 0) return []

        // 2. Get unique user IDs
        const userIds = Array.from(new Set(sesiones.map(s => s.usuario_id)))

        // 3. Get users
        let userMap = new Map<string, string>()
        if (userIds.length > 0) {
            const { data: usuarios } = await supabase
                .from("usuarios")
                .select("id, nombre")
                .in("id", userIds)

            if (usuarios) {
                usuarios.forEach(u => userMap.set(u.id, u.nombre))
            }
        }

        return sesiones.map((row) => ({
            id: row.id,
            tiendaId: row.tienda_id,
            usuarioId: row.usuario_id,
            usuarioNombre: userMap.get(row.usuario_id),
            fechaApertura: row.fecha_apertura,
            fechaCierre: row.fecha_cierre,
            montoInicial: Number(row.monto_inicial),
            montoFinalEsperado: Number(row.monto_final_esperado),
            montoFinalReal: Number(row.monto_final_real),
            diferencia: Number(row.diferencia),
            estado: row.estado,
        }))
    }
}
