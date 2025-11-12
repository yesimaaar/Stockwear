import { NextResponse } from 'next/server'

import { PRODUCT_IMAGE_BUCKET } from '@/lib/services/product-image-path'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type RouteParams = {
  params: { id?: string | string[] } | Promise<{ id?: string | string[] }>
}

export async function DELETE(_request: Request, context: RouteParams) {
  try {
    const params = context.params instanceof Promise ? await context.params : context.params
    const rawId = params?.id
    const referenceKey = Array.isArray(rawId) ? rawId[0] : rawId
    const parsedReferenceId = typeof referenceKey === 'string' ? Number(referenceKey.trim()) : Number(referenceKey)

    if (!Number.isFinite(parsedReferenceId) || parsedReferenceId <= 0) {
      return NextResponse.json({ message: 'Identificador inválido.' }, { status: 400 })
    }

    const referenceId = parsedReferenceId

    const { data: reference, error: fetchError } = await supabaseAdmin
      .from('producto_reference_images')
      .select('*')
      .eq('id', referenceId)
      .maybeSingle()

    if (fetchError) {
      console.error('Error buscando imagen de referencia', fetchError)
      return NextResponse.json({ message: 'No se pudo obtener la imagen de referencia.' }, { status: 500 })
    }

    if (!reference) {
      return NextResponse.json({ message: 'La imagen de referencia no existe.' }, { status: 404 })
    }

    const bucket = reference.bucket || PRODUCT_IMAGE_BUCKET
    const path = reference.path

    await supabaseAdmin
      .from('producto_embeddings')
      .delete()
      .eq('referenceImageId', referenceId)

    if (typeof path === 'string' && path.length > 0) {
      const storage = supabaseAdmin.storage.from(bucket)
      const { error: removeError } = await storage.remove([path])
      if (removeError) {
        console.warn('No se pudo eliminar el archivo del almacenamiento, se continuará con la eliminación lógica.', removeError)
      }
    }

    const { error: deleteError } = await supabaseAdmin.from('producto_reference_images').delete().eq('id', referenceId)

    if (deleteError) {
      console.error('Error eliminando registro de imagen de referencia', deleteError)
      return NextResponse.json({ message: 'No se pudo eliminar la imagen de referencia.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error inesperado eliminando imagen de referencia', error)
    return NextResponse.json({ message: 'Error inesperado eliminando la imagen de referencia.' }, { status: 500 })
  }
}
