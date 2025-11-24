import { STORE_IMAGE_BUCKET } from '@/features/stores/services/store-image-path'

const UPLOAD_ENDPOINT = '/api/admin/store-logo'

export async function uploadStoreLogo(
    file: File,
    storeId: number
): Promise<{ url: string; path: string }> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('storeId', String(storeId))
    formData.append('bucket', STORE_IMAGE_BUCKET)
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
        const message = typeof data?.message === 'string' ? data.message : textFallback || 'No se pudo subir el logo'
        throw new Error(message)
    }

    if (!data || typeof data.url !== 'string' || typeof data.path !== 'string') {
        throw new Error('Respuesta inválida al subir el logo')
    }

    return data
}
