import { NextResponse } from 'next/server'

import { Buffer } from 'node:buffer'

import { isRemoteEmbeddingEnabled, requestRemoteEmbedding } from '@/lib/server/external-embedding-client'
import { PRODUCT_IMAGE_BUCKET, resolveReferenceStoragePath } from '@/features/productos/services/product-image-path'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const rawProductId = formData.get('productId')
    const fileEntry = formData.get('file')
    const explicitFilename = formData.get('filename')
    const explicitMimeType = formData.get('mimeType')
    const productCodeValue = formData.get('productCode')

    const productId = typeof rawProductId === 'string' ? Number(rawProductId) : null
    if (!productId || Number.isNaN(productId)) {
      return NextResponse.json({ message: 'El identificador del producto es obligatorio.' }, { status: 400 })
    }

    if (!fileEntry || typeof (fileEntry as Blob).arrayBuffer !== 'function') {
      return NextResponse.json({ message: 'No se recibió ningún archivo para procesar.' }, { status: 400 })
    }

    const file = fileEntry as File | Blob
    const typedFile = file as File
    const filename = typeof explicitFilename === 'string' && explicitFilename.trim() ? explicitFilename : typedFile.name
    const extension = filename && filename.includes('.') ? filename.split('.').pop() ?? 'jpg' : 'jpg'
    const productCode =
      typeof productCodeValue === 'string' && productCodeValue.trim() ? productCodeValue.trim() : null
    const mimeType =
      typeof explicitMimeType === 'string' && explicitMimeType.trim() ? explicitMimeType : typedFile.type || undefined

    const path = resolveReferenceStoragePath({ productId, productCode }, extension)
    const buffer = Buffer.from(await file.arrayBuffer())

    const storage = supabaseAdmin.storage.from(PRODUCT_IMAGE_BUCKET)
    const { error: uploadError } = await storage.upload(path, buffer, {
      upsert: true,
      cacheControl: '3600',
      contentType: mimeType,
    })

    if (uploadError) {
      console.error('Error subiendo imagen de referencia a Supabase', uploadError)
      return NextResponse.json({ message: uploadError.message ?? 'Error subiendo la imagen.' }, { status: 400 })
    }

    const { data: publicUrlData } = storage.getPublicUrl(path)
    if (!publicUrlData?.publicUrl) {
      return NextResponse.json({ message: 'No se pudo obtener la URL pública de la imagen.' }, { status: 500 })
    }

    const { data: referenceRecord, error: insertReferenceError } = await supabaseAdmin
      .from('producto_reference_images')
      .insert({
        productoId: productId,
        url: publicUrlData.publicUrl,
        path,
        bucket: PRODUCT_IMAGE_BUCKET,
        filename: filename || path.split('/').pop() || null,
        mimeType: mimeType ?? null,
        size: typeof typedFile.size === 'number' ? typedFile.size : null,
      })
      .select()
      .single()

    if (insertReferenceError || !referenceRecord) {
      console.error('Error registrando la imagen de referencia', insertReferenceError)
      return NextResponse.json({ message: 'No se pudo registrar la imagen de referencia.' }, { status: 500 })
    }

    const useRemoteEmbedding = isRemoteEmbeddingEnabled()
    let localEmbeddingsModule: typeof import('@/lib/server/embeddings') | null = null
    if (!useRemoteEmbedding) {
      localEmbeddingsModule = await import('@/lib/server/embeddings')
      await localEmbeddingsModule.ensureEmbeddingModelLoaded()
    }
    let embeddingVector: Float32Array | null = null
    try {
      if (useRemoteEmbedding) {
        embeddingVector = await requestRemoteEmbedding({
          buffer,
          mimeType,
          productId,
          referenceImageId: referenceRecord.id,
        })
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[api] reference embedding fetched remotely', {
            referenceId: referenceRecord.id,
            productId,
            length: embeddingVector.length,
          })
        }
      } else {
        embeddingVector = await localEmbeddingsModule!.generateEmbeddingFromBuffer(buffer)
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[api] reference embedding generated', {
            referenceId: referenceRecord.id,
            productId,
            length: embeddingVector.length,
          })
        }
      }
    } catch (embeddingGenerationError) {
      console.error('No se pudo generar el embedding de la referencia', embeddingGenerationError)
      return NextResponse.json(
        {
          referenceImage: referenceRecord,
          embeddingError:
            embeddingGenerationError instanceof Error
              ? embeddingGenerationError.message
              : 'No se pudo generar el embedding de la imagen.',
        },
        { status: 202 },
      )
    }
    if (!embeddingVector) {
      return NextResponse.json(
        {
          referenceImage: referenceRecord,
          embeddingError: 'No se pudo generar el embedding de la imagen.',
        },
        { status: 202 },
      )
    }

    await supabaseAdmin
      .from('producto_embeddings')
      .delete()
      .eq('productoId', productId)
      .eq('referenceImageId', referenceRecord.id)

    const { data: embeddingRecord, error: insertEmbeddingError } = await supabaseAdmin
      .from('producto_embeddings')
      .insert({
        productoId: productId,
        embedding: Array.from(embeddingVector),
        fuente: referenceRecord.path ?? referenceRecord.filename ?? null,
        referenceImageId: referenceRecord.id,
      })
      .select('id, "productoId", "referenceImageId", fuente, "createdAt", "updatedAt"')
      .single()

    if (insertEmbeddingError) {
      console.error('Error guardando embedding de referencia', insertEmbeddingError)
      return NextResponse.json({
        message:
          'La imagen se subió correctamente pero no fue posible guardar el embedding. Reintenta regenerarlo manualmente.',
        referenceImage: referenceRecord,
        embeddingError: insertEmbeddingError.message,
      }, { status: 202 })
    }

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[api] reference embedding stored', {
        embeddingId: embeddingRecord?.id,
        productId,
        referenceId: referenceRecord.id,
      })
    }

    return NextResponse.json({
      referenceImage: referenceRecord,
      embedding: embeddingRecord,
    }, { status: 201 })
  } catch (error) {
    console.error('Error inesperado al procesar imagen de referencia', error)
    return NextResponse.json(
      {
        message: 'Error inesperado al procesar la imagen de referencia.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
