import { normalizeL2 } from './embedding-utils'

const MODEL_PRIMARY_URL = '/api/tfhub-proxy/model.json';
const MODEL_SECONDARY_URL =
  'https://storage.googleapis.com/tfhub-tfjs-modules/google/imagenet/mobilenet_v2_140_224/feature_vector/5/default/1/model.json';
const WASM_BUNDLE_URL = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.22.0/dist/'

let tfModulePromise: Promise<typeof import('@tensorflow/tfjs')> | null = null
let backendReadyPromise: Promise<void> | null = null
let modelPromise: Promise<any> | null = null

async function loadTfModule() {
  if (typeof window === 'undefined') {
    throw new Error('El modelo de reconocimiento sólo puede cargarse en el navegador.')
  }

  if (!tfModulePromise) {
    tfModulePromise = import('@tensorflow/tfjs')
  }
  return tfModulePromise
}

async function ensureBackend(tf: typeof import('@tensorflow/tfjs')) {
  if (backendReadyPromise) {
    return backendReadyPromise
  }

  backendReadyPromise = (async () => {
    try {
      const wasm = await import('@tensorflow/tfjs-backend-wasm')
      if (wasm && typeof wasm.setWasmPaths === 'function') {
        wasm.setWasmPaths(WASM_BUNDLE_URL)
      }
      await tf.setBackend('wasm')
      await tf.ready()
      return
    } catch (error) {
      console.warn('No se pudo inicializar el backend wasm, se intenta webgl.', error)
    }

    try {
      await import('@tensorflow/tfjs-backend-webgl')
      await tf.setBackend('webgl')
      await tf.ready()
      return
    } catch (error) {
      console.warn('No se pudo inicializar el backend webgl, se usa cpu.', error)
    }

    await tf.setBackend('cpu')
    await tf.ready()
  })()

  return backendReadyPromise
}

async function loadModelInstance() {
  if (modelPromise) {
    return modelPromise
  }

  modelPromise = (async () => {
    const tf = await loadTfModule()
    await ensureBackend(tf)
    const tfconv = await import('@tensorflow/tfjs-converter')
    try {
      const loaders: Array<() => Promise<any>> = [
        () => tfconv.loadGraphModel(MODEL_PRIMARY_URL),
        () => tfconv.loadGraphModel(MODEL_SECONDARY_URL)
      ]
      let lastError
      for (const load of loaders) {
        try {
          return await load()
        } catch (error) {
          lastError = error
          console.warn('Error cargando el modelo, intentando el siguiente.', error)
        }
      }
      throw lastError
    } catch (error) {
      console.error('Fallo cargando el modelo', error)
      throw new Error(
        'No se pudo descargar el modelo de reconocimiento. Verifica tu conexión a internet o permisos de red.'
      )
    }
  })()

  return modelPromise
}

export type EmbeddableInput = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageBitmap | ImageData

export async function generateEmbedding(input: EmbeddableInput): Promise<Float32Array> {
  const tf = await loadTfModule()
  await ensureBackend(tf)
  const model = await loadModelInstance()

  const data = tf.tidy(() => {
    const pixels = tf.browser.fromPixels(input as any)
    const resized = tf.image.resizeBilinear(pixels, [224, 224], true)
    const batched = resized.expandDims(0).toFloat().div(255)
    const prediction = model.predict(batched)
    const tensor = Array.isArray(prediction) ? prediction[0].squeeze() : prediction.squeeze()
    // Extract data synchronously before tensors are disposed
    return tensor.dataSync() as Float32Array
  })
  
  // Normalize after tidy to avoid issues with disposed tensors
  const normalized = normalizeL2(data)
  return normalized
}

export async function preloadEmbeddingModel(): Promise<void> {
  await loadModelInstance()
}
