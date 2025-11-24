import { NextResponse } from 'next/server'

import { PRODUCT_IMAGE_BUCKET } from '@/features/productos/services/product-image-path'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type DeleteMode = 'soft' | 'hard'

type RouteParams = {
	params: { id?: string | string[] } | Promise<{ id?: string | string[] }>
}

function parseProductId(rawId: string | string[] | undefined): number | null {
	const value = Array.isArray(rawId) ? rawId[0] : rawId
	if (!value) {
		return null
	}
	const parsed = Number(value)
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null
	}
	return parsed
}

async function softDelete(productId: number) {
	const { error } = await supabaseAdmin.from('productos').update({ estado: 'inactivo' }).eq('id', productId)
	if (error) {
		throw new Error(error.message ?? 'No se pudo marcar el producto como inactivo.')
	}
}

async function hardDelete(productId: number) {
	const { data: references, error: referencesError } = await supabaseAdmin
		.from('producto_reference_images')
		.select('id, path, bucket')
		.eq('productoId', productId)

	if (referencesError) {
		throw new Error(referencesError.message ?? 'No se pudieron obtener las imágenes de referencia para eliminarlas.')
	}

	const referencesList = (references ?? []).filter(
		(item): item is { id: number; path: string; bucket: string | null } =>
			typeof item?.id === 'number' && typeof item?.path === 'string' && item.path.length > 0,
	)

	const bucketGroups = new Map<string, string[]>()
	for (const reference of referencesList) {
		const bucket = reference.bucket ?? PRODUCT_IMAGE_BUCKET
		const paths = bucketGroups.get(bucket) ?? []
		paths.push(reference.path)
		bucketGroups.set(bucket, paths)
	}

	for (const [bucket, paths] of bucketGroups.entries()) {
		try {
			const { error: storageError } = await supabaseAdmin.storage.from(bucket).remove(paths)
			if (storageError) {
				console.warn('No se pudieron eliminar algunos archivos de referencia del almacenamiento', storageError, {
					bucket,
					paths,
				})
			}
		} catch (storageException) {
			console.warn('Excepción eliminando archivos de referencia del almacenamiento', storageException, {
				bucket,
				paths,
			})
		}
	}

	const { error: embeddingsError } = await supabaseAdmin.from('producto_embeddings').delete().eq('productoId', productId)
	if (embeddingsError) {
		throw new Error(embeddingsError.message ?? 'No se pudieron eliminar los embeddings asociados al producto.')
	}

	const { error: referenceDeleteError } = await supabaseAdmin
		.from('producto_reference_images')
		.delete()
		.eq('productoId', productId)

	if (referenceDeleteError) {
		throw new Error(referenceDeleteError.message ?? 'No se pudieron eliminar los registros de imágenes de referencia.')
	}

	const { error: stockDeleteError } = await supabaseAdmin.from('stock').delete().eq('productoId', productId)
	if (stockDeleteError) {
		throw new Error(stockDeleteError.message ?? 'No se pudo limpiar el stock asociado al producto.')
	}

	const { error: productDeleteError } = await supabaseAdmin.from('productos').delete().eq('id', productId)
	if (productDeleteError) {
		throw new Error(productDeleteError.message ?? 'No se pudo eliminar el producto.')
	}
}

export async function DELETE(request: Request, context: RouteParams) {
	try {
		const params = context.params instanceof Promise ? await context.params : context.params
		const requestUrl = new URL(request.url)
		if (process.env.NODE_ENV !== 'production') {
			console.debug('[api] delete product params:', params)
			console.debug('[api] delete product search:', requestUrl.href)
		}
		let productId = parseProductId(params?.id)
		if (!productId) {
			const { pathname } = requestUrl
			const fallbackSegments = pathname.split('/').filter(Boolean)
			const candidate = fallbackSegments[fallbackSegments.length - 1]
			productId = parseProductId(candidate)
			if (process.env.NODE_ENV !== 'production') {
				console.debug('[api] fallback product id parsing:', {
					pathname,
					candidate,
					parsed: productId,
				})
			}
		}
		if (!productId) {
			return NextResponse.json({ message: 'Identificador de producto inválido.' }, { status: 400 })
		}

		const modeParam = requestUrl.searchParams.get('mode')
		const mode: DeleteMode = modeParam === 'hard' ? 'hard' : 'soft'

		if (mode === 'soft') {
			await softDelete(productId)
			return NextResponse.json({ mode, success: true })
		}

		await hardDelete(productId)
		return NextResponse.json({ mode, success: true })
	} catch (error) {
		console.error('Error eliminando producto', error)
		const message = error instanceof Error ? error.message : 'Error inesperado al eliminar el producto.'
		return NextResponse.json({ message }, { status: 500 })
	}
}
