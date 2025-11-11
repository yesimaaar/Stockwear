import path from 'node:path'

import * as tf from '@tensorflow/tfjs-node'

import { normalizeL2 } from '@/lib/ai/embedding-utils'

const MODEL_RELATIVE_PATH = ['public', 'models', 'mobilenet', 'model.json']

let modelPromise: Promise<tf.LayersModel> | null = null

function resolveModelPath(): string {
  const absolutePath = path.join(process.cwd(), ...MODEL_RELATIVE_PATH)
  const fileUrl = `file://${absolutePath.replace(/\\/g, '/')}`
  return fileUrl
}

async function loadModel(): Promise<tf.LayersModel> {
  if (!modelPromise) {
    const modelUrl = resolveModelPath()
    modelPromise = tf.loadLayersModel(modelUrl)
  }
  return modelPromise
}

export async function generateEmbeddingFromBuffer(buffer: Buffer): Promise<Float32Array> {
  const model = await loadModel()

  const embedding = tf.tidy(() => {
    const decoded = tf.node.decodeImage(buffer, 3)
    const resized = tf.image.resizeBilinear(decoded, [224, 224], true)
    const normalized = resized.toFloat().div(255)
    const batched = normalized.expandDims(0)

    const prediction = model.predict(batched)
    const tensor = Array.isArray(prediction) ? prediction[0].squeeze() : (prediction as tf.Tensor).squeeze()
    const data = tensor.dataSync() as Float32Array
    return new Float32Array(data)
  })

  return normalizeL2(embedding)
}

export async function ensureEmbeddingModelLoaded(): Promise<void> {
  await loadModel()
}
