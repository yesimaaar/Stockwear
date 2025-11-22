import { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/admin'

export interface StoreSettings {
    id: number
    nombre: string
    slug: string
    whatsapp: string | null
}

export class StoreService {
    static async getMyStore(supabase: SupabaseClient): Promise<StoreSettings | null> {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) return null

        // First get the user's store ID
        const { data: userProfile } = await supabase
            .from('usuarios')
            .select('tienda_id')
            .eq('auth_uid', userData.user.id)
            .single()

        if (!userProfile?.tienda_id) return null

        const { data, error } = await supabase
            .from('tiendas')
            .select('id, nombre, slug, whatsapp')
            .eq('id', userProfile.tienda_id)
            .single()

        if (error || !data) {
            console.error('Error fetching store settings', error)
            return null
        }

        return data
    }

    static async updateWhatsApp(supabase: SupabaseClient, whatsapp: string): Promise<boolean> {
        console.log('[StoreService] Starting updateWhatsApp')
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) {
            console.error('[StoreService] No user found')
            return false
        }

        const { data: userProfile, error: profileError } = await supabase
            .from('usuarios')
            .select('tienda_id')
            .eq('auth_uid', userData.user.id)
            .single()

        if (profileError || !userProfile?.tienda_id) {
            console.error('[StoreService] No profile or tienda_id found', profileError)
            return false
        }

        console.log('[StoreService] Updating store', userProfile.tienda_id)

        const { error, data } = await supabase
            .from('tiendas')
            .update({ whatsapp })
            .eq('id', userProfile.tienda_id)
            .select()

        if (error) {
            console.error('[StoreService] Error updating whatsapp', error)
            return false
        }

        console.log('[StoreService] Update successful', data)
        return true
    }

    static async updateWhatsAppAdmin(tiendaId: number, whatsapp: string): Promise<boolean> {
        console.log('[StoreService] Updating store via Admin', tiendaId)

        const { error, data } = await supabaseAdmin
            .from('tiendas')
            .update({ whatsapp })
            .eq('id', tiendaId)
            .select()

        if (error) {
            console.error('[StoreService] Error updating whatsapp (admin)', error)
            return false
        }

        console.log('[StoreService] Update successful (admin)', data)
        return true
    }
}
