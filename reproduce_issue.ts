
import { CajaService } from "@/lib/services/caja-service"
import { VentaService } from "@/lib/services/venta-service"
import { AuthService } from "@/lib/services/auth-service"
import { supabase } from "@/lib/supabase"

async function testCajaFlow() {
    console.log("Starting Caja Flow Test...")

    try {
        // 1. Get current user
        const user = await AuthService.getCurrentUser()
        if (!user) {
            console.error("No active user found. Please login first.")
            return
        }
        console.log("User:", user.id)

        // 2. Open a new Caja Session
        console.log("Opening Caja Session...")
        // Close any existing session first to be clean
        const existingSession = await CajaService.getSesionActual(user.id)
        if (existingSession) {
            console.log("Closing existing session:", existingSession.id)
            await CajaService.cerrarCaja(existingSession.id, 0, 0)
        }

        const session = await CajaService.abrirCaja(user.id, 1000)
        console.log("Session Opened:", session.id)

        // 3. Create a Sale linked to the session
        console.log("Creating Sale...")
        // We need a product stock to sell. We'll try to find one.
        const { data: stock } = await supabase
            .from('stock')
            .select('*')
            .gt('cantidad', 0)
            .limit(1)
            .single()

        if (!stock) {
            console.error("No stock available to sell.")
            return
        }

        const sale = await VentaService.create({
            usuarioId: user.id,
            cajaSesionId: session.id,
            items: [{
                stockId: stock.id,
                cantidad: 1,
                precioUnitario: 5000,
                descuento: 0
            }]
        })

        if (!sale) {
            console.error("Failed to create sale.")
            return
        }
        console.log("Sale Created:", sale.id, "Total:", sale.total)

        // 4. Get Session Summary
        console.log("Getting Session Summary...")
        const summary = await CajaService.getResumenSesion(session.id)
        console.log("Summary:", summary)

        if (summary.totalVentas === 5000) {
            console.log("SUCCESS: Sales total matches expected value.")
        } else {
            console.error("FAILURE: Sales total mismatch. Expected 5000, got", summary.totalVentas)
        }

        // Cleanup: Close the session
        await CajaService.cerrarCaja(session.id, 1000 + 5000, 1000 + 5000)
        console.log("Session Closed.")

    } catch (error) {
        console.error("Test Failed:", error)
    }
}

testCajaFlow()
