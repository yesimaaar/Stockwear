"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"

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
