import { Readable } from 'node:stream'
import { NextResponse } from 'next/server'

import { ensureEmbeddingModelLoaded, generateEmbeddingFromBuffer } from '@/lib/server/embeddings'
import { PRODUCT_IMAGE_BUCKET } from '@/lib/services/product-image-path'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type RouteParams = {
  params: { id?: string | string[] } | Promise<{ id?: string | string[] }>
}

async function toBuffer(data: unknown): Promise<Buffer> {
  if (!data) {
    throw new Error('Datos vacíos para convertir en buffer.')
  }

  if (data instanceof Buffer) {
    return data
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data)
  }

  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer)
  }

  if (typeof (data as any).arrayBuffer === 'function') {
    const arrayBuffer = await (data as any).arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  if (data instanceof Readable) {
    const chunks: Buffer[] = []
    for await (const chunk of data) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }

  throw new Error('Formato de datos no soportado para convertir en buffer.')
}

export async function POST(_request: Request, context: RouteParams) {
  try {
    const params = context.params instanceof Promise ? await context.params : context.params
    const rawParam = params?.id
    const rawId = Array.isArray(rawParam) ? rawParam[0] : rawParam
    const productKey = typeof rawId === 'string' ? rawId.trim() : ''

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[api] regenerate embeddings raw product id:', rawId)
    }

    if (!productKey) {
      return NextResponse.json({ message: 'Identificador de producto inválido.' }, { status: 400 })
    }

    const numericProduct = Number(productKey)
    const productId = Number.isFinite(numericProduct) ? numericProduct : productKey

    const { data: references, error: fetchError } = await supabaseAdmin
      .from('producto_reference_images')
      .select('id, path, bucket, filename, mimeType')
      .eq('productoId', productId)

    if (fetchError) {
      console.error('Error obteniendo imágenes de referencia para regenerar embeddings', fetchError)
      return NextResponse.json({ message: 'No se pudieron obtener las imágenes de referencia.' }, { status: 500 })
    }

    if (!references || references.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No hay imágenes de referencia registradas.' })
    }

    await ensureEmbeddingModelLoaded()

    let processed = 0
    const failures: Array<{ id: number; reason: string }> = []

    for (const reference of references) {
      if (!reference?.path) {
        failures.push({ id: reference?.id ?? 0, reason: 'Ruta inválida o ausente.' })
        continue
      }

      const bucket = reference.bucket || PRODUCT_IMAGE_BUCKET
      const downloadResult = await supabaseAdmin.storage.from(bucket).download(reference.path)

      if (downloadResult.error || !downloadResult.data) {
        console.error('Error descargando imagen de referencia', downloadResult.error)
        failures.push({
          id: reference.id,
          reason: downloadResult.error?.message ?? 'No fue posible descargar la imagen de referencia.',
        })
        continue
      }

      let buffer: Buffer
      try {
        buffer = await toBuffer(downloadResult.data)
      } catch (conversionError) {
        console.error('No se pudo convertir la imagen descargada a Buffer', conversionError)
        failures.push({ id: reference.id, reason: 'No se pudo leer la imagen descargada.' })
        continue
      }

      try {
        const embedding = await generateEmbeddingFromBuffer(buffer)
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[api] regenerate embedding generated', {
            referenceId: reference.id,
            productId,
            length: embedding.length,
          })
        }

        await supabaseAdmin
          .from('producto_embeddings')
          .delete()
          .eq('productoId', productId)
          .eq('referenceImageId', reference.id)

        const { error: insertError } = await supabaseAdmin.from('producto_embeddings').insert({
          productoId: productId,
          embedding: Array.from(embedding),
          fuente: reference.path,
          referenceImageId: reference.id,
        })

        if (insertError) {
          console.error('Error guardando embedding regenerado', insertError)
          failures.push({ id: reference.id, reason: insertError.message ?? 'Error guardando el embedding.' })
          continue
        }

        if (process.env.NODE_ENV !== 'production') {
          console.debug('[api] regenerate embedding stored', {
            referenceId: reference.id,
            productId,
          })
        }

        processed += 1
      } catch (processingError) {
        console.error('Error generando embedding de referencia', processingError)
        failures.push({ id: reference.id, reason: 'Error generando el embedding.' })
      }
    }

    return NextResponse.json({ processed, failures })
  } catch (error) {
    console.error('Error inesperado regenerando embeddings', error)
    return NextResponse.json({ message: 'Error inesperado regenerando embeddings.' }, { status: 500 })
  }
}
