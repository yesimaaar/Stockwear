'use server'

import { StoreService } from '@/lib/services/store-service'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateStoreWhatsApp(whatsapp: string) {
    try {
        const supabase = await createClient()

        // Verify user and get tienda_id
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) return { success: false, message: 'No autorizado' }

        const { data: userProfile } = await supabase
            .from('usuarios')
            .select('tienda_id')
            .eq('auth_uid', userData.user.id)
            .single()

        if (!userProfile?.tienda_id) return { success: false, message: 'No se encontró la tienda' }

        // Use admin client to bypass RLS for update
        const success = await StoreService.updateWhatsAppAdmin(userProfile.tienda_id, whatsapp)

        if (success) {
            revalidatePath('/admin')
            revalidatePath('/catalog')
            return { success: true, message: 'Número de WhatsApp actualizado' }
        } else {
            return { success: false, message: 'No se pudo actualizar el número' }
        }
    } catch (error) {
        console.error('Error updating whatsapp', error)
        return { success: false, message: 'Error interno' }
    }
}

export async function getStoreSettings() {
    try {
        const supabase = await createClient()
        const settings = await StoreService.getMyStore(supabase)
        return { success: true, data: settings }
    } catch (error) {
        console.error('Error fetching store settings', error)
        return { success: false, error }
    }
}
