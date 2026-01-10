'use server'

import { StoreService } from '@/features/auth/services/store-service'
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

export async function updateStoreSettings(settings: { whatsapp?: string; logo_url?: string; facebook?: string | null; instagram?: string | null }, accessToken?: string) {
    try {
        const user = await resolveUser(accessToken)
        if (!user) return { success: false, message: 'No autorizado' }

        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('usuarios')
            .select('tienda_id')
            .eq('auth_uid', user.id)
            .single()

        if (profileError || !userProfile?.tienda_id) return { success: false, message: 'No se encontró la tienda' }

        const updates: any = {}
        if (settings.whatsapp !== undefined) updates.whatsapp = settings.whatsapp
        if (settings.logo_url !== undefined) updates.logo_url = settings.logo_url
        if (settings.facebook !== undefined) updates.facebook = settings.facebook
        if (settings.instagram !== undefined) updates.instagram = settings.instagram

        const { error } = await supabaseAdmin
            .from('tiendas')
            .update(updates)
            .eq('id', userProfile.tienda_id)

        if (!error) {
            const { data: tienda } = await supabaseAdmin
                .from('tiendas')
                .select('slug')
                .eq('id', userProfile.tienda_id)
                .single()

            revalidatePath('/admin')
            revalidatePath('/admin/configuracion')
            if (tienda?.slug) {
                revalidatePath(`/catalog/${tienda.slug}`)
            }
            return { success: true, message: 'Configuración actualizada' }
        }

        return { success: false, message: 'No se pudo actualizar la configuración' }
    } catch (error) {
        console.error('Error updating store settings', error)
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
            .select('id, nombre, slug, whatsapp, logo_url, facebook, instagram')
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
