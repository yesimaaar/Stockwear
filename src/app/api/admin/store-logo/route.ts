import { NextResponse } from 'next/server'
import { Buffer } from 'node:buffer'
import { STORE_IMAGE_BUCKET, resolveStoreLogoPath } from '@/features/stores/services/store-image-path'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const fileEntry = formData.get('file')

        if (!fileEntry || typeof (fileEntry as Blob).arrayBuffer !== 'function') {
            return NextResponse.json({ message: 'No se recibió ningún archivo' }, { status: 400 })
        }

        const file = fileEntry as File | Blob
        const rawStoreId = formData.get('storeId')
        const storeId = typeof rawStoreId === 'string' && rawStoreId.trim() !== '' ? Number(rawStoreId) : null

        if (!storeId) {
            return NextResponse.json({ message: 'ID de tienda requerido' }, { status: 400 })
        }

        const extensionField = formData.get('extension')
        const typedFile = file as File
        const fileName = typeof typedFile.name === 'string' && typedFile.name ? typedFile.name : 'upload'
        const inferredExtension = fileName.includes('.') ? fileName.split('.').pop() : undefined
        const extension = typeof extensionField === 'string' && extensionField.trim() ? extensionField : inferredExtension ?? 'jpg'
        const bucketField = formData.get('bucket')
        const bucket = typeof bucketField === 'string' && bucketField.trim() ? bucketField : STORE_IMAGE_BUCKET

        if (!bucket) {
            return NextResponse.json({ message: 'No se especificó el bucket de almacenamiento' }, { status: 400 })
        }

        const path = resolveStoreLogoPath(storeId, extension)
        const buffer = Buffer.from(await file.arrayBuffer())

        const contentType = typeof typedFile.type === 'string' && typedFile.type ? typedFile.type : undefined

        const { error } = await supabaseAdmin.storage.from(bucket).upload(path, buffer, {
            upsert: true,
            cacheControl: '3600',
            contentType,
        })

        if (error) {
            const message = String(error.message || 'Error subiendo el logo')
            if (message.toLowerCase().includes('bucket') && message.toLowerCase().includes('not found')) {
                return NextResponse.json(
                    {
                        message: `El bucket "${bucket}" no existe en Supabase. Crea el bucket o configura SUPABASE_PRODUCT_BUCKET con un bucket válido.`,
                    },
                    { status: 400 }
                )
            }
            console.error('Error subiendo logo a Supabase', error)
            return NextResponse.json({ message }, { status: 400 })
        }

        const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)

        if (!data?.publicUrl) {
            return NextResponse.json({ message: 'No se pudo obtener la URL pública del logo' }, { status: 500 })
        }

        return NextResponse.json({ url: data.publicUrl, path })
    } catch (error) {
        console.error('Error inesperado subiendo logo', error)
        return NextResponse.json({ message: 'Error inesperado al subir el logo' }, { status: 500 })
    }
}
