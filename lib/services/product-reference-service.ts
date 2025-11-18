export interface ProductReferenceUploadResponse {
  referenceImage: {
    id: number
    productoId: number
    url: string
    path: string
    bucket?: string | null
    filename?: string | null
    mimeType?: string | null
    size?: number | null
    createdAt?: string
    updatedAt?: string
  }
  embedding?: {
    id: number
    productoId: number
    referenceImageId?: number | null
    fuente?: string | null
    createdAt?: string
    updatedAt?: string
  } | null
  message?: string
  embeddingError?: string
}

const BASE_ENDPOINT = '/api/admin/product-reference-images'

export async function uploadReferenceImage(
  productId: number,
  file: File,
  options?: { productCode?: string }
): Promise<ProductReferenceUploadResponse> {
  const formData = new FormData()
  formData.append('productId', String(productId))
  formData.append('file', file)
  if (file.name) {
    formData.append('filename', file.name)
  }
  if (file.type) {
    formData.append('mimeType', file.type)
  }
  if (options?.productCode) {
    formData.append('productCode', options.productCode)
  }

  const response = await fetch(BASE_ENDPOINT, {
    method: 'POST',
    body: formData,
  })

  const contentType = response.headers.get('content-type') ?? ''
  const data = contentType.includes('application/json') ? await response.json().catch(() => null) : null
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : 'No se pudo subir la imagen de referencia'
    throw new Error(message)
  }

  return data as ProductReferenceUploadResponse
}

export async function deleteReferenceImage(referenceId: number | string): Promise<void> {
  const normalizedId = typeof referenceId === 'number' ? referenceId : referenceId?.toString().trim()

  if (normalizedId === '' || normalizedId == null || (typeof normalizedId === 'number' && Number.isNaN(normalizedId))) {
    throw new Error('Identificador inválido.')
  }

  const origin =
    typeof window === 'undefined'
      ? process.env.NEXT_PUBLIC_SITE_URL
        || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : undefined)
        || 'http://localhost:3000'
      : window.location.origin

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[ProductReferenceService.deleteReferenceImage] request', {
      referenceId: normalizedId,
      origin,
      url: `${origin}${BASE_ENDPOINT}/${encodeURIComponent(String(normalizedId))}`,
    })
  }

  const response = await fetch(`${origin}${BASE_ENDPOINT}/${encodeURIComponent(String(normalizedId))}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    const message = typeof data?.message === 'string' ? data.message : 'No se pudo eliminar la imagen de referencia'
    throw new Error(message)
  }
}

export async function regenerateProductEmbeddings(productId: number | string): Promise<{ processed: number }> {
  const normalizedId = typeof productId === 'number' ? productId : productId?.toString().trim()

  if (normalizedId === '' || normalizedId == null || (typeof normalizedId === 'number' && Number.isNaN(normalizedId))) {
    throw new Error('Identificador de producto inválido.')
  }

  const origin =
    typeof window === 'undefined'
      ? process.env.NEXT_PUBLIC_SITE_URL
        || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : undefined)
        || 'http://localhost:3000'
      : window.location.origin

  const requestUrl = `${origin}/api/admin/productos/${encodeURIComponent(String(normalizedId))}/embeddings`

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[ProductReferenceService.regenerateProductEmbeddings] request', {
      productId: normalizedId,
      origin,
      url: requestUrl,
    })
  }

  const response = await fetch(requestUrl, {
    method: 'POST',
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : 'No se pudieron regenerar los embeddings'
    throw new Error(message)
  }

  return data as { processed: number }
}
