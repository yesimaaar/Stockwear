// vision/matching.ts
// Utilities to compute embeddings and compare them using MobileNet in the browser.

// keep types minimal to avoid pulling server-side TF types in the frontend

let mobilenetModelPromise: Promise<any> | null = null

async function loadMobilenet() {
  if (typeof window === 'undefined') {
    throw new Error('MobileNet only available in the browser')
  }
  if (!mobilenetModelPromise) {
    mobilenetModelPromise = (async () => {
      const m = await import('@tensorflow-models/mobilenet')
      const localUrl = '/models/mobilenet/model.json'
      // Try loading a local copy first (user can place model files under public/models/mobilenet)
      try {
        // attempt to load local model; if it fails we'll fall back to hosted model
        return await m.load({ version: 2, modelUrl: localUrl })
      } catch (err) {
        console.warn('Local mobilenet model not found or failed to load, falling back to hosted model', err)
        return await m.load({ version: 2, alpha: 1.0 })
      }
    })()
  }
  return mobilenetModelPromise
}

export async function getEmbedding(image: HTMLImageElement | ImageData): Promise<number[]> {
  const model = await loadMobilenet()

  // mobilenet.infer accepts DOM elements (image, video, canvas) or tensors.
  let input: HTMLImageElement | HTMLCanvasElement | any

  if (image instanceof ImageData) {
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(image, 0, 0)
    input = canvas
  } else {
    input = image
  }

  // infer with embedding=true to obtain feature vector
  const embeddingsTensor: any = model.infer(input, true)

  try {
    const data = await embeddingsTensor.data()
    return Array.from(data) as number[]
  } finally {
    // dispose if tensor has dispose method
    if (typeof (embeddingsTensor as any).dispose === 'function') {
      ;(embeddingsTensor as any).dispose()
    }
  }
}

export function compareEmbeddings(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return Infinity
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return Infinity
  const similarity = dot / (Math.sqrt(na) * Math.sqrt(nb))
  // Return distance in [0, 2] where 0 == identical, 1 == orthogonal, 2 == opposite
  const distance = 1 - similarity
  return distance
}

export type InventoryItem = {
  id?: string | number
  name?: string
  embedding: number[]
  [key: string]: any
}

export function findClosestMatch(targetEmbedding: number[], inventory: InventoryItem[] | number[][]) {
  if (!targetEmbedding) return null
  let best: { index: number; item: InventoryItem | number[] | null; distance: number } | null = null
  if (!inventory || (Array.isArray(inventory) && inventory.length === 0)) return null

  for (let i = 0; i < inventory.length; i++) {
    const item = inventory[i]
    const emb = Array.isArray(item) ? (item as number[]) : (item as InventoryItem).embedding
    if (!emb) continue
    const d = compareEmbeddings(targetEmbedding, emb)
    if (isNaN(d)) continue
    if (!best || d < best.distance) {
      best = { index: i, item, distance: d }
    }
  }

  return best
}

// Helper: load inventory embeddings from public path '/data/embeddings.json'
export async function loadInventoryFromPublic(path = '/data/embeddings.json') {
  const res = await fetch(path)
  if (!res.ok) throw new Error('Failed to load inventory embeddings: ' + res.status)
  const data = await res.json()
  // Expect data to be { items: [{id,name,embedding}], embeddings: [[...]], meta: [...] }
  if (Array.isArray(data.items)) return data.items as InventoryItem[]
  if (Array.isArray(data.embeddings)) {
    // Try to combine with metadata if present
    const meta = Array.isArray(data.meta) ? data.meta : []
    return (data.embeddings as number[][]).map((e: number[], i: number) => ({ id: meta[i]?.id ?? i, name: meta[i]?.name ?? meta[i]?.title ?? null, embedding: e, meta: meta[i] ?? null }))
  }
  throw new Error('Unsupported embeddings.json format')
}

export default {
  getEmbedding,
  compareEmbeddings,
  findClosestMatch,
  loadInventoryFromPublic,
}
