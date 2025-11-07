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
  nombre: string
  email: string
  telefono?: string | null
  rol: 'admin' | 'empleado'
  estado?: 'activo' | 'inactivo'
  created_at?: string
  createdAt?: string
}

function mapUsuario(row?: UsuarioRow | null): Usuario | undefined {
  if (!row) return undefined
  const createdValue = row.createdAt ?? row.created_at ?? new Date().toISOString()
  return {
    id: row.id,
    authUid: row.auth_uid ?? row.id,
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

  static async register(params: { nombre: string; email: string; password: string; rol: 'admin' | 'empleado'; telefono?: string }): Promise<AuthResponse> {
    const { nombre, email, password, rol, telefono } = params
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPhone = telefono?.trim() || null

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          nombre,
          rol,
          telefono: normalizedPhone ?? undefined,
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
        message: 'No se pudo crear el usuario. Verifica que el correo no requiera confirmación.',
      }
    }

    if (!data.session) {
      await supabase.from('usuarios').upsert({
        id: user.id,
        auth_uid: user.id,
        nombre,
        email: normalizedEmail,
        rol,
        telefono: normalizedPhone,
        estado: 'activo',
      })

      return {
        success: true,
        message: 'Usuario registrado. Revisa tu correo para confirmar la cuenta.',
      }
    }

    await supabase.from('usuarios').upsert({
      id: user.id,
      auth_uid: user.id,
      nombre,
      email: normalizedEmail,
      rol,
      telefono: normalizedPhone,
      estado: 'activo',
    })

    const { data: profile } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    return { success: true, user: mapUsuario(profile as UsuarioRow) }
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
    } catch (error) {
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
}
