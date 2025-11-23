
import { supabase } from "@/lib/supabase"
import { getCurrentTiendaId } from "@/features/auth/services/tenant-service"
import { AuthService } from "@/features/auth/services/auth-service"

async function seedPaymentMethods() {
    console.log("Seeding payment methods...")

    try {
        // Ensure we have a user session
        const user = await AuthService.getCurrentUser()
        if (!user) {
            console.error("No active user found. Please login first.")
            return
        }

        const tiendaId = await getCurrentTiendaId()
        console.log("Tienda ID:", tiendaId)

        const methods = [
            { nombre: "Efectivo", tipo: "efectivo", estado: "activo", tienda_id: tiendaId },
            { nombre: "Transferencia", tipo: "banco", estado: "activo", tienda_id: tiendaId },
            { nombre: "Tarjeta Débito/Crédito", tipo: "banco", estado: "activo", tienda_id: tiendaId }
        ]

        for (const method of methods) {
            const { data: existing } = await supabase
                .from("metodos_pago")
                .select("*")
                .eq("tienda_id", tiendaId)
                .eq("nombre", method.nombre)
                .maybeSingle()

            if (!existing) {
                const { error } = await supabase.from("metodos_pago").insert(method)
                if (error) {
                    console.error(`Error inserting ${method.nombre}:`, error)
                } else {
                    console.log(`Inserted ${method.nombre}`)
                }
            } else {
                console.log(`Method ${method.nombre} already exists.`)
            }
        }

        console.log("Seeding complete.")

    } catch (error) {
        console.error("Seeding failed:", error)
    }
}

seedPaymentMethods()
