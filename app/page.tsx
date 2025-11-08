import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

async function resolveUserRole(): Promise<"admin" | "empleado" | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!user || error) {
    return null
  }

  const metadataRole = (user.user_metadata?.rol ?? user.app_metadata?.rol) as string | undefined
  if (metadataRole === "admin" || metadataRole === "empleado") {
    return metadataRole
  }

  const { data: profile } = await supabase
    .from("usuarios")
    .select("rol")
    .or(`id.eq.${user.id},auth_uid.eq.${user.id}`)
    .maybeSingle()

  const persistedRole = (profile as { rol?: string } | null | undefined)?.rol
  if (persistedRole === "admin" || persistedRole === "empleado") {
    return persistedRole
  }

  return "empleado"
}

export default async function HomePage() {
  const role = await resolveUserRole()

  if (!role) {
    redirect("/login")
  }

  redirect(role === "admin" ? "/admin" : "/empleado")
  return null
}
