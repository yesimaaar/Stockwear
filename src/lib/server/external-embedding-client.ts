import { Buffer } from 'node:buffer'

interface RemoteEmbeddingRequest {
  buffer: Buffer
  mimeType?: string
  productId: number | string
  referenceImageId?: number | string
}

interface RemoteEmbeddingResponse {
  embedding: number[]
  message?: string
  details?: unknown
}

const serviceUrl = process.env.EMBEDDING_SERVICE_URL
const serviceToken = process.env.EMBEDDING_SERVICE_TOKEN

export function isRemoteEmbeddingEnabled(): boolean {
  return typeof serviceUrl === 'string' && serviceUrl.length > 0
}

export async function requestRemoteEmbedding({ buffer, mimeType, productId, referenceImageId }: RemoteEmbeddingRequest): Promise<Float32Array> {
  if (!isRemoteEmbeddingEnabled()) {
    throw new Error('El servicio remoto de embeddings no está configurado.')
  }

  const payload = {
    imageBase64: buffer.toString('base64'),
    mimeType: mimeType ?? null,
    productId,
    referenceImageId: referenceImageId ?? null,
  }

  const response = await fetch(serviceUrl!, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(serviceToken ? { authorization: `Bearer ${serviceToken}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json().catch(() => null)) as RemoteEmbeddingResponse | null

  if (!response.ok || !data?.embedding || !Array.isArray(data.embedding)) {
    const reason = data?.message || response.statusText || 'No se pudo obtener el embedding remoto.'
    throw new Error(reason)
  }

  return Float32Array.from(data.embedding)
}
