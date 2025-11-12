import path from 'node:path'

import { normalizeL2 } from '@/lib/ai/embedding-utils'

const MODEL_RELATIVE_PATH = ['public', 'models', 'mobilenet', 'model.json']

type TfModule = typeof import('@tensorflow/tfjs-node')
type LayersModel = Awaited<ReturnType<TfModule['loadLayersModel']>>
type Tensor = ReturnType<TfModule['tensor']>

let tfPromise: Promise<TfModule> | null = null
let modelPromise: Promise<LayersModel> | null = null

async function loadTf(): Promise<TfModule> {
  if (!tfPromise) {
    tfPromise = import('@tensorflow/tfjs-node')
  }
  return tfPromise
}

function resolveModelPath(): string {
  const absolutePath = path.join(process.cwd(), ...MODEL_RELATIVE_PATH)
  const fileUrl = `file://${absolutePath.replace(/\\/g, '/')}`
  return fileUrl
}

async function loadModel(): Promise<LayersModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await loadTf()
      const modelUrl = resolveModelPath()
      return tf.loadLayersModel(modelUrl)
    })()
  }
  return modelPromise
}

export async function generateEmbeddingFromBuffer(buffer: Buffer): Promise<Float32Array> {
  const tf = await loadTf()
  const model = await loadModel()

  const embedding = tf.tidy(() => {
    const decoded = tf.node.decodeImage(buffer, 3)
    const resized = tf.image.resizeBilinear(decoded, [224, 224], true)
    const normalized = resized.toFloat().div(255)
    const batched = normalized.expandDims(0)

    const prediction = model.predict(batched)
  const tensor = Array.isArray(prediction) ? prediction[0].squeeze() : (prediction as Tensor).squeeze()
    const data = tensor.dataSync() as Float32Array
    return new Float32Array(data)
  })

  return normalizeL2(embedding)
}

export async function ensureEmbeddingModelLoaded(): Promise<void> {
  await loadModel()
}
