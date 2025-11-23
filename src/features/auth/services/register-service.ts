import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"

/**
 * Servicio centralizado para operaciones de registro
 */

interface RegistroEmpleadoData {
  nombre: string
  email: string
  password: string
  departamento: string
  puesto: string
  telefono?: string
}

interface RegistroAdminData {
  nombre: string
  email: string
  password: string
  departamento: string
}

/**
 * Crea cliente Supabase del servidor
 */
async function createSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL = "https://ubzabtbearqsbprabqce.supabase.co", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViemFidGJlYXJxc2JwcmFicWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTk1MjIsImV4cCI6MjA3NzkzNTUyMn0.y1fs4e4HfW5UkRy4p8CudP0RitYvGU32kXoNFle3rJI", {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookieStore.getAll().forEach((cookie) => {
          cookieStore.delete(cookie.name)
        })
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      },
    },
  })
}

/**
 * Registra un nuevo empleado en la base de datos
 */
export async function registrarEmpleado(data: RegistroEmpleadoData) {
  try {
    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // Crear cliente Supabase
    const supabase = await createSupabaseClient()

    // Insertar en base de datos
    const { data: resultado, error } = await supabase
      .from("empleados")
      .insert({
        nombre: data.nombre,
        email: data.email,
        password_hash: hashedPassword,
        departamento: data.departamento,
        puesto: data.puesto,
        telefono: data.telefono || null,
        fecha_contratacion: new Date().toISOString().split("T")[0],
      })
      .select()

    if (error) {
      throw new Error(error.message || "Error al registrar empleado")
    }

    return { success: true, data: resultado }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Registra un nuevo admin en la base de datos
 */
export async function registrarAdmin(data: RegistroAdminData, codigoAdmin: string) {
  try {
    // Validar código de admin
    const ADMIN_REGISTRATION_CODE = process.env.ADMIN_REGISTRATION_CODE || "admin123"

    if (codigoAdmin !== ADMIN_REGISTRATION_CODE) {
      throw new Error("Código de administrador inválido")
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // Crear cliente Supabase
    const supabase = await createSupabaseClient()

    // Insertar en base de datos
    const { data: resultado, error } = await supabase
      .from("admins")
      .insert({
        nombre: data.nombre,
        email: data.email,
        password_hash: hashedPassword,
        departamento: data.departamento,
        permisos: "admin",
      })
      .select()

    if (error) {
      throw new Error(error.message || "Error al registrar admin")
    }

    return { success: true, data: resultado }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
