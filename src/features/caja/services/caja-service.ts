import { supabase } from "@/lib/supabase"
import { getCurrentTiendaId } from "@/features/auth/services/tenant-service"
import type { CajaSesion, MetodoPago } from "@/lib/types"

export const CajaService = {
    async getMetodosPago(): Promise<MetodoPago[]> {
        try {
            const tiendaId = await getCurrentTiendaId()
            console.log("CajaService.getMetodosPago: Fetching for store", tiendaId)
            
            const { data, error } = await supabase
                .from("metodos_pago")
                .select("*")
                .eq("tienda_id", tiendaId)
                .eq("estado", "activo")
                .order("id")

            if (error) {
                console.error("CajaService.getMetodosPago: Error fetching", error)
                throw error
            }
            
            console.log("CajaService.getMetodosPago: Found", data?.length || 0, "methods")
            
            return (data || []).map((row) => ({
                id: row.id,
                tiendaId: row.tienda_id,
                nombre: row.nombre,
                tipo: row.tipo,
                estado: row.estado,
                comisionPorcentaje: 0
            }))
        } catch (err) {
            console.error("CajaService.getMetodosPago: Unexpected error", err)
            return []
        }
    },

    async ensureDefaults(): Promise<void> {
        try {
            const tiendaId = await getCurrentTiendaId()
            console.log("CajaService.ensureDefaults: Checking defaults for store", tiendaId)
            
            const { data: existing, error: fetchError } = await supabase
                .from("metodos_pago")
                .select("nombre")
                .eq("tienda_id", tiendaId)
            
            if (fetchError) {
                console.error("CajaService.ensureDefaults: Error checking existing", fetchError)
                return
            }
            
            const existingNames = new Set(existing?.map(e => e.nombre) || [])
            
            // Use types compatible with MetodoPago interface: 'efectivo' | 'digital' | 'banco' | 'otro'
            const defaults = [
                { nombre: 'Efectivo', tipo: 'efectivo', estado: 'activo' },
                { nombre: 'Tarjeta de Crédito', tipo: 'banco', estado: 'activo' },
                { nombre: 'Transferencia', tipo: 'banco', estado: 'activo' },
                { nombre: 'Addi', tipo: 'otro', estado: 'activo' }
            ]

            for (const def of defaults) {
                if (!existingNames.has(def.nombre)) {
                    console.log("CajaService.ensureDefaults: Inserting", def.nombre)
                    const { error: insertError } = await supabase.from("metodos_pago").insert({
                        tienda_id: tiendaId,
                        ...def
                    })
                    
                    if (insertError) {
                        console.error("CajaService.ensureDefaults: Error inserting", def.nombre, insertError)
                    }
                }
            }
        } catch (error) {
            console.error("Error ensuring default payment methods:", error)
        }
    },

    async getSesionActual(usuarioId: string): Promise<CajaSesion | null> {
        try {
            const tiendaId = await getCurrentTiendaId()
            console.log("getSesionActual: Checking for user", usuarioId, "in store", tiendaId)

            const { data, error } = await supabase
                .from("caja_sesiones")
                .select("*")
                .eq("tienda_id", tiendaId)
                .eq("usuario_id", usuarioId)
                .eq("estado", "abierta")
                .order("fecha_apertura", { ascending: false })
                .limit(1)
                .maybeSingle()

            if (error) {
                console.error("getSesionActual: Supabase error RAW", error)
                console.error("getSesionActual: Supabase error JSON", JSON.stringify(error))
                throw error
            }

            if (!data) {
                console.log("getSesionActual: No open session found")
                return null
            }

            console.log("getSesionActual: Found session", data.id)
            return {
                id: data.id,
                tiendaId: data.tienda_id,
                usuarioId: data.usuario_id,
                fechaApertura: data.fecha_apertura,
                montoInicial: Number(data.monto_inicial),
                estado: data.estado,
            }
        } catch (error) {
            console.error("getSesionActual: Error", error)
            throw error
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

        // 0. Obtener ID del método de pago "efectivo"
        const { data: metodos, error: metodosError } = await supabase
            .from("metodos_pago")
            .select("id")
            .eq("tienda_id", tiendaId)
            .eq("tipo", "efectivo")
            .single()

        if (metodosError) throw metodosError
        const efectivoId = metodos.id

        // 1. Obtener ventas en EFECTIVO de esta sesión
        const { data: ventas, error } = await supabase
            .from("ventas")
            .select("total, metodo_pago_id, tipo_venta")
            .eq("caja_sesion_id", sesionId)
            .eq("tienda_id", tiendaId)
            .eq("tipo_venta", "contado") // Solo contado
            .eq("metodo_pago_id", efectivoId) // Usar ID numérico

        if (error) throw error

        const totalVentasEfectivo = ventas?.reduce((sum, v) => sum + Number(v.total), 0) ?? 0

        // 2. Obtener abonos en EFECTIVO de esta sesión
        const { data: abonos, error: abonosError } = await supabase
            .from("abonos")
            .select("monto")
            .eq("caja_sesion_id", sesionId)
            .eq("tienda_id", tiendaId)
            .eq("metodo_pago_id", efectivoId) // Usar ID numérico

        if (abonosError) throw abonosError

        const totalAbonosEfectivo = abonos?.reduce((sum, a) => sum + Number(a.monto), 0) ?? 0

        // 3. Obtener GASTOS en EFECTIVO de esta sesión
        // Nota: Gastos usa "metodo_pago" como string ("efectivo")
        const { data: gastos, error: gastosError } = await supabase
            .from("gastos")
            .select("monto")
            .eq("caja_sesion_id", sesionId)
            .eq("tienda_id", tiendaId)
            .ilike("metodo_pago", "efectivo")

        if (gastosError) throw gastosError

        const totalGastosEfectivo = gastos?.reduce((sum, g) => sum + Number(g.monto), 0) ?? 0

        // 4. Obtener PAGOS DE GASTOS en EFECTIVO de esta sesión
        // Nota: PagosGastos usa "metodo_pago" como string ("efectivo")
        const { data: pagosGastos, error: pagosGastosError } = await supabase
            .from("pagos_gastos")
            .select("monto")
            .eq("caja_sesion_id", sesionId)
            .eq("tienda_id", tiendaId)
            .ilike("metodo_pago", "efectivo")

        if (pagosGastosError) throw pagosGastosError

        const totalPagosGastosEfectivo = pagosGastos?.reduce((sum, p) => sum + Number(p.monto), 0) ?? 0

        const totalEgresosEfectivo = totalGastosEfectivo + totalPagosGastosEfectivo
        const totalIngresosEfectivo = totalVentasEfectivo + totalAbonosEfectivo

        return {
            totalVentas: totalVentasEfectivo,
            totalAbonos: totalAbonosEfectivo,
            totalIngresos: totalIngresosEfectivo,
            totalGastos: totalEgresosEfectivo,
            balance: totalIngresosEfectivo - totalEgresosEfectivo
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
