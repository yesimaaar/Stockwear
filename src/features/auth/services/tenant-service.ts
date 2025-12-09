import { supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

const CACHE_TTL_MS = 60 * 1000
let cachedTenant: { tiendaId: number; expiresAt: number } | null = null

async function fetchTenantId(client: SupabaseClient): Promise<number> {
  const { data: userData, error: userError } = await client.auth.getUser()
  
  if (userError) {
    console.error('fetchTenantId: getUser error', userError)
    if (userError.status === 429) {
       throw new Error('Rate limit exceeded')
    }
  }

  if (userError || !userData.user) {
    throw new Error('Usuario no autenticado')
  }

  // 1. Try to get from profile
  const { data: profile, error: profileError } = await client
    .from('usuarios')
    .select('tienda_id')
    .eq('auth_uid', userData.user.id)
    .single()

  if (profile?.tienda_id) {
    return profile.tienda_id
  }

  // 2. Fallback: Check if user owns a store
  const { data: store, error: storeError } = await client
    .from('tiendas')
    .select('id')
    .eq('owner_id', userData.user.id)
    .single()

  if (store?.id) {
    // Optional: Self-heal the user profile
    // We don't await this to avoid blocking the response
    void client
      .from('usuarios')
      .update({ tienda_id: store.id })
      .eq('auth_uid', userData.user.id)
      .then(({ error }) => {
        if (error) console.warn('Failed to auto-heal user tienda_id', error)
      })

    return store.id
  }

  console.error('Tenant resolution failed:', { profileError, storeError })
  throw new Error('Usuario sin tienda asignada')
}

export async function getCurrentTiendaId(options?: {
  client?: SupabaseClient
  force?: boolean
}): Promise<number> {
  // console.log("getCurrentTiendaId: called", options)
  if (!options?.client && !options?.force && cachedTenant && cachedTenant.expiresAt > Date.now()) {
    // console.log("getCurrentTiendaId: returning cached", cachedTenant.tiendaId)
    return cachedTenant.tiendaId
  }

  const client = options?.client ?? supabase
  try {
    const tiendaId = await fetchTenantId(client)

    if (!options?.client) {
      cachedTenant = {
        tiendaId,
        expiresAt: Date.now() + CACHE_TTL_MS,
      }
    }
    // console.log("getCurrentTiendaId: fetched", tiendaId)
    return tiendaId
  } catch (error) {
    console.error("getCurrentTiendaId: error", error)
    throw error
  }
}

export function invalidateTenantCache(): void {
  console.log('invalidateTenantCache: Clearing tenant cache')
  cachedTenant = null
}
