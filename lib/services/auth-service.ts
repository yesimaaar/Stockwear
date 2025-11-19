import { supabase } from '@/lib/supabase'
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

    if (error) {
      return { success: false, message: error.message }
    }

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

  static async logout(): Promise<void> {
    await supabase.auth.signOut()
  }

  static async getCurrentUser(): Promise<Usuario | null> {
    try {
      const { data } = await supabase.auth.getUser()
      const user = data?.user
      if (!user) return null

      const { data: profile } = await supabase
        .from('usuarios')
        .select('*')
        .or(`id.eq.${user.id},auth_uid.eq.${user.id}`)
        .maybeSingle()

      return mapUsuario(profile as UsuarioRow) ?? null
    } catch (_error) {
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
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
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
}
