'use server'

import { StoreService } from '@/lib/services/store-service'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
async function resolveUser(accessToken?: string) {
    if (!accessToken) {
        return null
    }

    const { data, error } = await supabaseAdmin.auth.getUser(accessToken)
    if (error || !data?.user) {
        return null
    }

    return data.user
}

export async function updateStoreWhatsApp(whatsapp: string, accessToken?: string) {
    try {
        const user = await resolveUser(accessToken)
        if (!user) return { success: false, message: 'No autorizado' }

        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('usuarios')
            .select('tienda_id')
            .eq('auth_uid', user.id)
            .single()

        if (profileError || !userProfile?.tienda_id) return { success: false, message: 'No se encontró la tienda' }

        const success = await StoreService.updateWhatsAppAdmin(userProfile.tienda_id, whatsapp)

        if (success) {
            const { data: tienda } = await supabaseAdmin
                .from('tiendas')
                .select('slug')
                .eq('id', userProfile.tienda_id)
                .single()

            revalidatePath('/admin')
            if (tienda?.slug) {
                revalidatePath(`/catalog/${tienda.slug}`)
            }
            return { success: true, message: 'Número de WhatsApp actualizado' }
        }

        return { success: false, message: 'No se pudo actualizar el número' }
    } catch (error) {
        console.error('Error updating whatsapp', error)
        return { success: false, message: 'Error interno' }
    }
}

export async function getStoreSettings(accessToken?: string) {
    try {
        const user = await resolveUser(accessToken)
        if (!user) {
            return { success: false, message: 'No autorizado' }
        }

        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('usuarios')
            .select('tienda_id')
            .eq('auth_uid', user.id)
            .single()

        if (profileError || !userProfile?.tienda_id) {
            return { success: false, message: 'No se encontró la tienda' }
        }

        const { data: settings, error } = await supabaseAdmin
            .from('tiendas')
            .select('id, nombre, slug, whatsapp')
            .eq('id', userProfile.tienda_id)
            .single()

        if (error) {
            console.error('Error fetching store settings', error)
            return { success: false, message: 'No se pudo obtener la tienda' }
        }

        return { success: true, data: settings }

    } catch (error) {
        console.error('Error fetching store settings', error)
        return { success: false, message: 'Error interno' }
    }
}
