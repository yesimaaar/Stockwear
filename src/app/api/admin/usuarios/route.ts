import { NextResponse } from "next/server"
import { z } from "zod"

import { supabaseAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const createUserSchema = z.object({
  nombre: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  telefono: z.string().optional(),
  rol: z.enum(["admin", "empleado"]).default("empleado"),
  tiendaId: z.number().int().positive().optional(),
})

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null

    if (!token) {
      return NextResponse.json({ message: "Debes iniciar sesión para registrar usuarios." }, { status: 401 })
    }

    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !authData?.user) {
      return NextResponse.json({ message: "Sesión inválida. Inicia sesión nuevamente." }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("usuarios")
      .select("rol, tienda_id")
      .eq("auth_uid", authData.user.id)
      .maybeSingle()

    if (profileError) {
      console.error("No se pudo obtener el perfil del administrador", profileError)
      return NextResponse.json({ message: "Error verificando tu perfil." }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ message: "No se encontró tu perfil." }, { status: 404 })
    }

    if (profile.rol !== "admin") {
      return NextResponse.json({ message: "No tienes permisos para registrar usuarios." }, { status: 403 })
    }

    if (!profile.tienda_id) {
      return NextResponse.json({ message: "Configura una tienda antes de registrar usuarios." }, { status: 400 })
    }

    const rawBody = await request.json()
    const parsed = createUserSchema.safeParse(rawBody)

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Datos inválidos", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { nombre, email, password, telefono, rol, tiendaId } = parsed.data

    if (typeof tiendaId === "number" && tiendaId !== profile.tienda_id) {
      return NextResponse.json({ message: "No puedes asignar usuarios a otra tienda." }, { status: 403 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle()

    if (existingError) {
      console.error("Error al verificar usuarios duplicados", existingError)
      return NextResponse.json({ message: "No se pudo verificar si el correo ya existe." }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json({ message: "Ya existe un usuario con este correo." }, { status: 409 })
    }

    const creationResult = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        nombre,
        rol,
        telefono: telefono?.trim() || null,
        tienda_id: profile.tienda_id,
      },
    })

    if (creationResult.error || !creationResult.data.user?.id) {
      console.error("Error al crear usuario con Supabase Admin", creationResult.error)
      return NextResponse.json(
        { message: creationResult.error?.message || "No se pudo crear el usuario." },
        { status: 500 },
      )
    }

    const createdUserId = creationResult.data.user.id

    const { error: updateError } = await supabaseAdmin
      .from("usuarios")
      .update({
        nombre: nombre.trim(),
        email: normalizedEmail,
        telefono: telefono?.trim() || null,
        rol,
        tienda_id: profile.tienda_id,
        estado: "activo",
      })
      .eq("id", createdUserId)

    if (updateError) {
      console.error("No se pudo sincronizar el perfil del usuario", updateError)
      return NextResponse.json({ message: "El usuario fue creado pero no se pudo sincronizar el perfil." }, { status: 500 })
    }

    return NextResponse.json({ message: "Usuario registrado exitosamente." }, { status: 201 })
  } catch (error) {
    console.error("Error inesperado al registrar usuario", error)
    return NextResponse.json(
      {
        message: "Error inesperado al registrar usuario.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
