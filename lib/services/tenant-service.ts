import { supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

const CACHE_TTL_MS = 60 * 1000
let cachedTenant: { tiendaId: number; expiresAt: number } | null = null

async function fetchTenantId(client: SupabaseClient): Promise<number> {
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError || !userData.user) {
    throw new Error('Usuario no autenticado')
  }

  const { data: profile, error: profileError } = await client
    .from('usuarios')
    .select('tienda_id')
    .eq('auth_uid', userData.user.id)
    .single()

  if (profileError || !profile?.tienda_id) {
    throw new Error('Usuario sin tienda asignada')
  }

  return profile.tienda_id
}

export async function getCurrentTiendaId(options?: {
  client?: SupabaseClient
  force?: boolean
}): Promise<number> {
  if (!options?.client && !options?.force && cachedTenant && cachedTenant.expiresAt > Date.now()) {
    return cachedTenant.tiendaId
  }

  const client = options?.client ?? supabase
  const tiendaId = await fetchTenantId(client)

  if (!options?.client) {
    cachedTenant = {
      tiendaId,
      expiresAt: Date.now() + CACHE_TTL_MS,
    }
  }

  return tiendaId
}

export function invalidateTenantCache(): void {
  cachedTenant = null
}
