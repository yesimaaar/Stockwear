import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function CatalogRootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?redirect=/catalog")
  }

  const { data: profile, error: profileError } = await supabase
    .from("usuarios")
    .select("tienda_id")
    .eq("auth_uid", user.id)
    .maybeSingle()

  if (profileError || !profile?.tienda_id) {
    console.error("No se encontró tienda para el usuario", profileError)
    notFound()
  }

  const { data: store, error: storeError } = await supabase
    .from("tiendas")
    .select("slug")
    .eq("id", profile.tienda_id)
    .maybeSingle()

  if (storeError || !store?.slug) {
    console.error("La tienda no tiene slug configurado", storeError)
    notFound()
  }

  redirect(`/catalog/${store.slug}`)
}
