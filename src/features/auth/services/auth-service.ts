import { supabase, clearCorruptedAuthTokens } from '@/lib/supabase'
import { getCurrentTiendaId, invalidateTenantCache } from '@/features/auth/services/tenant-service'
import type { Usuario } from '@/lib/types'

export interface AuthResponse {
  success: boolean
  user?: Usuario
  message?: string
}

type UsuarioRow = {
  id: string
  auth_uid?: string
  tienda_id: number
  nombre: string
  email: string
  telefono?: string | null
  rol: 'admin' | 'empleado'
  estado?: 'activo' | 'inactivo'
  created_at?: string
  createdAt?: string
}

type UpdateUsuarioInput = Partial<
  Pick<Usuario, 'nombre' | 'email' | 'telefono' | 'rol' | 'estado'>
>

function mapUsuario(row?: UsuarioRow | null): Usuario | undefined {
  if (!row) return undefined
  const createdValue = row.createdAt ?? row.created_at ?? new Date().toISOString()
  return {
    id: row.id,
    authUid: row.auth_uid ?? row.id,
    tiendaId: row.tienda_id,
    nombre: row.nombre,
    email: row.email,
    telefono: row.telefono ?? null,
    rol: row.rol,
    estado: row.estado ?? 'activo',
    createdAt: createdValue,
  }
}

/**
 * Servicio de autenticación usando Supabase Auth + tabla `usuarios` para perfil.
 * Nota: los métodos ahora son asíncronos y devuelven Promises.
 */
export class AuthService {
  static async login(email: string, password: string): Promise<AuthResponse> {
    const normalizedEmail = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })

    console.log('AuthService.login: signInWithPassword result', { 
      hasUser: !!data.user, 
      hasSession: !!data.session, 
      error: error?.message 
    })

    if (error) {
      return { success: false, message: error.message }
    }

    // Clear any stale cache from previous sessions
    this.userCache = null
    invalidateTenantCache()

    // Verify session is set
    const { data: sessionData } = await supabase.auth.getSession()
    console.log('AuthService.login: Immediate getSession check', { 
      hasSession: !!sessionData.session 
    })

    const userId = data.user?.id ?? null

    if (userId) {
      const { data: profile, error: profileError } = await supabase
        .from('usuarios')
        .select('*')
        .or(`id.eq.${userId},auth_uid.eq.${userId}`)
        .maybeSingle()

      if (profileError || !profile) {
        return {
          success: false,
          message: 'No se encontró el perfil del usuario en la tabla usuarios.',
        }
      }

      const mapped = mapUsuario(profile as UsuarioRow)

      if (mapped) {
        // Check sleep mode
        const { isSleepMode, message } = await this.checkSleepMode(mapped.tiendaId)

        if (isSleepMode) {
          // Check if user is owner
          // We need to fetch all users to find the owner
          // This might be slightly inefficient but necessary for security
          const { data: allUsers } = await supabase
            .from('usuarios')
            .select('id, "createdAt"')
            .eq('tienda_id', mapped.tiendaId)
            .order('createdAt', { ascending: true })

          if (allUsers && allUsers.length > 0) {
            const owner = allUsers[0] // First user created is owner

            if (mapped.id !== owner.id) {
              // User is NOT owner, and it is sleep time.
              await this.logout()
              return {
                success: false,
                message: message || 'Es hora de dormir, puedes continuar mañana a las 7:00 AM',
              }
            }
          }
        }
      }

      return { success: true, user: mapped }
    }

    return { success: true }
  }

  static async register(params: { nombre: string; email: string; password: string; rol: 'admin' | 'empleado'; telefono?: string; tiendaId?: number }): Promise<AuthResponse> {
    const { nombre, email, password, rol, telefono, tiendaId } = params
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPhone = telefono ? telefono.replace(/\s+/g, "") : null

    // Si no se especifica tienda, asumimos que es un nuevo Owner (tienda_id = null)
    // El flujo de onboarding se encargará de pedirle que cree su tienda.
    const finalTiendaId = tiendaId ?? null

    if (typeof window !== 'undefined' && finalTiendaId !== null) {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token

      if (sessionError || !accessToken) {
        return {
          success: false,
          message: 'Tu sesión expiró. Inicia sesión nuevamente para continuar.',
        }
      }

      try {
        const response = await fetch('/api/admin/usuarios', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            nombre: nombre.trim(),
            email: normalizedEmail,
            password,
            rol,
            telefono: normalizedPhone,
            tiendaId: finalTiendaId,
          }),
        })

        const payload = (await response.json().catch(() => null)) as { message?: string } | null

        if (!response.ok) {
          return {
            success: false,
            message: payload?.message ?? 'No se pudo registrar el usuario desde el panel de administración.',
          }
        }

        return {
          success: true,
          message: payload?.message ?? 'Usuario registrado exitosamente.',
        }
      } catch (error) {
        console.error('Error al registrar usuario desde el panel', error)
        return {
          success: false,
          message: 'No se pudo registrar el usuario. Verifica tu conexión e inténtalo nuevamente.',
        }
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          nombre,
          rol,
          telefono: normalizedPhone ?? undefined,
          tienda_id: finalTiendaId,
        },
      },
    })
    if (error) {
      return { success: false, message: error.message }
    }

    const user = data.user
    if (!user) {
      return {
        success: false,
        message: 'No se pudo crear el usuario. Intenta nuevamente.',
      }
    }

    // El trigger en la base de datos se encargará de crear el registro en public.usuarios

    return {
      success: true,
      message: 'Usuario registrado. Revisa tu correo para confirmar la cuenta.',
    }
  }

  static async signInWithGoogle(redirectPath?: string): Promise<AuthResponse> {
    try {
      const redirectTo =
        typeof window === 'undefined'
          ? undefined
          : `${window.location.origin}${redirectPath && redirectPath.startsWith('/') ? redirectPath : ''}`

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      })

      if (error) {
        return { success: false, message: error.message }
      }

      return { success: true, message: data?.url }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo iniciar sesión con Google.'
      return { success: false, message }
    }
  }

  static async resetPasswordForEmail(email: string): Promise<AuthResponse> {
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/update-password`
      : undefined

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      return { success: false, message: error.message }
    }

    return { success: true, message: 'Se ha enviado un correo para restablecer tu contraseña.' }
  }

  static async updatePassword(password: string): Promise<AuthResponse> {
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      return { success: false, message: error.message }
    }

    return { success: true, message: 'Contraseña actualizada correctamente.' }
  }

  private static userCache: { user: Usuario | null; timestamp: number } | null = null
  private static CACHE_DURATION = 10000 // 10 seconds

  static async logout(scope: 'global' | 'local' | 'others' = 'global'): Promise<void> {
    this.userCache = null // Clear cache on logout
    invalidateTenantCache() // Clear tenant cache on logout
    if (scope === 'local') {
      // Manually clear Supabase keys from localStorage to preserve server session
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
            localStorage.removeItem(key);
          }
        });
      }
      return;
    }
    await supabase.auth.signOut({ scope })
  }

  static async getCurrentUser(): Promise<Usuario | null> {
    // Check cache first
    if (this.userCache && (Date.now() - this.userCache.timestamp < this.CACHE_DURATION)) {
      return this.userCache.user
    }

    try {
      // Add timeout to prevent hanging on corrupted tokens
      const timeoutPromise = new Promise<null>((resolve) => 
        setTimeout(() => {
          console.warn('AuthService.getCurrentUser: Timeout reached (5s)')
          resolve(null)
        }, 5000)
      )
      
      const userPromise = (async () => {
        // Debug: Check session state before getUser
        const { data: sessionData } = await supabase.auth.getSession()
        // console.log('AuthService.getCurrentUser: getSession check', { hasSession: !!sessionData.session })

        if (!sessionData.session) {
          // console.warn('AuthService.getCurrentUser: No session found in getSession, skipping getUser')
          return null
        }

        const { data, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('AuthService.getCurrentUser: getUser error', error)
          // If rate limited, return cached user if available (even if expired)
          if (error.status === 429 && this.userCache) {
             console.warn('AuthService.getCurrentUser: Rate limited, returning stale cache')
             return this.userCache.user
          }
        }
        
        // Check for refresh token errors
        if (error?.message?.includes('Refresh Token')) {
          console.warn('🧹 Corrupted refresh token detected in getCurrentUser')
          clearCorruptedAuthTokens()
          return null
        }
        
        const user = data?.user
        if (!user) return null

        const { data: profile } = await supabase
          .from('usuarios')
          .select('*')
          .or(`id.eq.${user.id},auth_uid.eq.${user.id}`)
          .maybeSingle()

        const mappedUser = mapUsuario(profile as UsuarioRow) ?? null
        
        // Update cache
        this.userCache = { user: mappedUser, timestamp: Date.now() }
        
        return mappedUser
      })()
      
      return await Promise.race([userPromise, timeoutPromise])
    } catch (error) {
      // Check if it's a refresh token error
      if (error instanceof Error && error.message?.includes('Refresh Token')) {
        console.warn('🧹 Corrupted refresh token detected in getCurrentUser catch')
        clearCorruptedAuthTokens()
      }
      return null
    }
  }

  static async isAuthenticated(): Promise<boolean> {
    return (await this.getCurrentUser()) !== null
  }

  static async isAdmin(): Promise<boolean> {
    const user = await this.getCurrentUser()
    return user?.rol === 'admin'
  }

  static async isEmpleado(): Promise<boolean> {
    const user = await this.getCurrentUser()
    return user?.rol === 'empleado'
  }

  static async getAll(): Promise<Usuario[]> {
    const tiendaId = await getCurrentTiendaId()
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('tienda_id', tiendaId)
      .order('nombre', { ascending: true })

    if (error || !data) {
      return []
    }

    return (data as UsuarioRow[])
      .map((row) => mapUsuario(row))
      .filter((user): user is Usuario => Boolean(user))
  }

  static async updateUsuario(id: string, updates: UpdateUsuarioInput): Promise<Usuario | null> {
    if (!id) {
      throw new Error('El identificador del usuario es obligatorio.')
    }

    const payload: Partial<UsuarioRow> = {}

    if (Object.prototype.hasOwnProperty.call(updates, 'nombre')) {
      payload.nombre = updates.nombre?.trim() ?? ''
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'email') && updates.email) {
      payload.email = updates.email.trim().toLowerCase()
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'telefono')) {
      const telefonoNormalizado = updates.telefono?.trim() ?? null
      payload.telefono = telefonoNormalizado === '' ? null : telefonoNormalizado
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'rol') && updates.rol) {
      payload.rol = updates.rol
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'estado') && updates.estado) {
      payload.estado = updates.estado
    }

    if (Object.keys(payload).length === 0) {
      return null
    }

    const { data, error } = await supabase
      .from('usuarios')
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      throw new Error(error.message || 'No se pudo actualizar el usuario.')
    }

    return mapUsuario(data as UsuarioRow) ?? null
  }

  static async deleteUsuario(id: string): Promise<boolean> {
    if (!id) {
      throw new Error('El identificador del usuario es obligatorio.')
    }

    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message || 'No se pudo eliminar el usuario.')
    }

    return true
  }

  static async deactivateAllNonOwners(): Promise<number> {
    const tiendaId = await getCurrentTiendaId()

    // Get all users for this store
    const { data: usuarios, error: fetchError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('tienda_id', tiendaId)
      .order('createdAt', { ascending: true })

    if (fetchError || !usuarios || usuarios.length === 0) {
      throw new Error('No se pudieron obtener los usuarios.')
    }

    // The owner is the first user created (earliest created_at)
    const owner = usuarios[0]

    // Deactivate all users except the owner
    const { error: updateError, count } = await supabase
      .from('usuarios')
      .update({ estado: 'inactivo' })
      .eq('tienda_id', tiendaId)
      .neq('id', owner.id)
      .eq('estado', 'activo')

    if (updateError) {
      throw new Error(updateError.message || 'No se pudieron desactivar los usuarios.')
    }

    return count ?? 0
  }

  static async checkSleepMode(tiendaId: number): Promise<{ isSleepMode: boolean; message?: string }> {
    const { data: tienda, error } = await supabase
      .from('tiendas')
      .select('sleep_schedule_enabled, sleep_schedule_time, wake_schedule_time')
      .eq('id', tiendaId)
      .single()

    if (error || !tienda || !tienda.sleep_schedule_enabled || !tienda.sleep_schedule_time) {
      return { isSleepMode: false }
    }

    const now = new Date()
    const currentHours = now.getHours()
    const currentMinutes = now.getMinutes()
    const currentTimeValue = currentHours * 60 + currentMinutes

    const [sleepHours, sleepMinutes] = tienda.sleep_schedule_time.split(':').map(Number)
    const sleepTimeValue = sleepHours * 60 + sleepMinutes

    // Use configured wake time or default to 7:00 AM if not set (for backward compatibility)
    const wakeTimeStr = tienda.wake_schedule_time || '07:00:00'
    const [wakeHours, wakeMinutes] = wakeTimeStr.split(':').map(Number)
    const wakeTimeValue = wakeHours * 60 + wakeMinutes

    let isSleepTime = false

    if (sleepTimeValue > wakeTimeValue) {
      // Example: Sleep at 22:00, Wake at 07:00
      // Sleep if time >= 22:00 OR time < 07:00
      isSleepTime = currentTimeValue >= sleepTimeValue || currentTimeValue < wakeTimeValue
    } else {
      // Example: Sleep at 01:00, Wake at 07:00
      // Sleep if time >= 01:00 AND time < 07:00
      isSleepTime = currentTimeValue >= sleepTimeValue && currentTimeValue < wakeTimeValue
    }

    if (isSleepTime) {
      // Format wake time for message (e.g., "7:00 AM")
      const wakeTimeDate = new Date()
      wakeTimeDate.setHours(wakeHours, wakeMinutes)
      const formattedWakeTime = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true }).format(wakeTimeDate)

      return {
        isSleepMode: true,
        message: `Es hora de dormir, puedes continuar mañana a las ${formattedWakeTime}`,
      }
    }

    return { isSleepMode: false }
  }
}
