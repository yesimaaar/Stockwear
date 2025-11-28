import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import LandingPageClient from "@/components/landing/landing-page"

// Optimización: Reducir tiempo de cold start con cache
export const revalidate = 0 // Siempre fresco pero con streaming

async function resolveUserRole(): Promise<"admin" | "empleado" | null> {
  const supabase = await createClient()
  
  // Optimización: Una sola consulta para obtener usuario
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!user || error) {
    return null
  }

  // Primero verificar metadata (más rápido, no requiere DB query)
  const metadataRole = (user.user_metadata?.rol ?? user.app_metadata?.rol) as string | undefined
  if (metadataRole === "admin" || metadataRole === "empleado") {
    return metadataRole
  }

  // Solo si no hay rol en metadata, consultar la tabla
  const { data: profile } = await supabase
    .from("usuarios")
    .select("rol")
    .or(`id.eq.${user.id},auth_uid.eq.${user.id}`)
    .limit(1)
    .maybeSingle()

  const persistedRole = (profile as { rol?: string } | null | undefined)?.rol
  if (persistedRole === "admin" || persistedRole === "empleado") {
    return persistedRole
  }

  return "empleado"
}

export default async function HomePage() {
  const role = await resolveUserRole()

  // Si el usuario está autenticado, redirigir al panel correspondiente
  if (role) {
    redirect(role === "admin" ? "/admin" : "/empleado")
  }

  // Si no hay usuario autenticado, mostrar la landing page
  return <LandingPageClient />
}
