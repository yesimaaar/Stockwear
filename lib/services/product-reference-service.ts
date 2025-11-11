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

export async function deleteReferenceImage(referenceId: number): Promise<void> {
  const response = await fetch(`${BASE_ENDPOINT}/${referenceId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    const message = typeof data?.message === 'string' ? data.message : 'No se pudo eliminar la imagen de referencia'
    throw new Error(message)
  }
}

export async function regenerateProductEmbeddings(productId: number): Promise<{ processed: number }> {
  const response = await fetch(`/api/admin/productos/${productId}/embeddings`, {
    method: 'POST',
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : 'No se pudieron regenerar los embeddings'
    throw new Error(message)
  }

  return data as { processed: number }
}
