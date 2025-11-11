import { PRODUCT_IMAGE_BUCKET } from '@/lib/services/product-image-path'

const UPLOAD_ENDPOINT = '/api/admin/product-images'

export async function uploadProductImage(
  file: File,
  options: { productId?: number | null; productCode?: string | null } = {}
): Promise<{ url: string; path: string }> {
  const formData = new FormData()
  formData.append('file', file)
  if (options.productId != null) {
    formData.append('productId', String(options.productId))
  }
  if (options.productCode) {
    formData.append('productCode', options.productCode)
  }
  formData.append('bucket', PRODUCT_IMAGE_BUCKET)
  formData.append('extension', file.name.split('.').pop() ?? 'jpg')

  const response = await fetch(UPLOAD_ENDPOINT, {
    method: 'POST',
    body: formData,
  })

  const contentType = response.headers.get('content-type') ?? ''
  let data: any = null
  let textFallback = ''

  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => null)
  } else {
    textFallback = await response.text().catch(() => '')
  }

  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : textFallback || 'No se pudo subir la imagen'
    throw new Error(message)
  }

  if (!data || typeof data.url !== 'string' || typeof data.path !== 'string') {
    throw new Error('Respuesta inválida al subir la imagen')
  }

  return data
}

export default {
  uploadProductImage,
}
