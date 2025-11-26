"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"

export interface VisualFeedbackData {
    productoSugeridoId: number
    productoCorrectoId?: number | null
    similitud: number
    umbral: number
    fueCorreto: boolean
    embedding?: number[]
    empleadoId?: string | null
    tiendaId?: number
    metadata?: Record<string, unknown>
}

export async function confirmVisualMatch(productId: number, embedding: number[]) {
    try {
        // Use admin client to bypass RLS since Server Actions aren't receiving auth cookies
        const { error } = await supabaseAdmin.from("producto_embeddings").insert({
            productoId: productId,
            embedding: embedding,
            fuente: "user_feedback",
        })

        if (error) {
            console.error("Error saving visual match feedback:", error)
            return { success: false, error: "Failed to save feedback" }
        }

        console.log("✅ Visual feedback saved successfully for product:", productId)
        return { success: true }
    } catch (error) {
        console.error("Unexpected error saving visual match feedback:", error)
        return { success: false, error: "Unexpected error" }
    }
}

/**
 * Registra feedback del usuario sobre el reconocimiento visual (positivo o negativo).
 * El feedback negativo es especialmente valioso para mejorar el modelo.
 */
export async function registrarFeedbackVisual(params: VisualFeedbackData) {
    try {
        const { error } = await supabaseAdmin.from("visual_recognition_feedback").insert({
            tienda_id: params.tiendaId ?? null,
            producto_sugerido_id: params.productoSugeridoId,
            producto_correcto_id: params.productoCorrectoId ?? null,
            similitud: params.similitud,
            umbral: params.umbral,
            fue_correcto: params.fueCorreto,
            embedding: params.embedding ?? null,
            empleado_id: params.empleadoId ?? null,
            metadata: params.metadata ?? {},
            created_at: new Date().toISOString(),
        })

        if (error) {
            console.error("Error registrando feedback visual:", error)
            return { success: false, error: error.message }
        }

        const tipo = params.fueCorreto ? "positivo" : "negativo"
        console.log(`✅ Feedback visual ${tipo} registrado para producto:`, params.productoSugeridoId)
        return { success: true }
    } catch (error) {
        console.error("Error inesperado registrando feedback visual:", error)
        return { success: false, error: "Error inesperado" }
    }
}
