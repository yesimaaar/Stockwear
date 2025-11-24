#!/usr/bin/env node
/* eslint-disable no-console */
const path = require('node:path')
const { Readable } = require('node:stream')

require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') })

const { createClient } = require('@supabase/supabase-js')
const tf = require('@tensorflow/tfjs-node')

const DEFAULT_BUCKET = process.env.SUPABASE_PRODUCT_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_BUCKET || 'product-images'
const MODEL_PATH = path.join(process.cwd(), 'public', 'models', 'mobilenet', 'model.json')

const args = process.argv.slice(2)
let targetProductId = null
let dryRun = false

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index]
  if (arg === '--product' || arg === '--productId') {
    const value = args[index + 1]
    if (!value) {
      console.error('El argumento --product requiere un identificador numérico.')
      process.exit(1)
    }
    targetProductId = Number(value)
    index += 1
  } else if (arg === '--dry-run') {
    dryRun = true
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Faltan las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

let modelPromise = null

function normalizeL2(vector) {
  let sumSquares = 0
  for (let index = 0; index < vector.length; index += 1) {
    const value = Number(vector[index])
    if (Number.isFinite(value)) {
      sumSquares += value * value
    }
  }
  const norm = sumSquares > 0 ? Math.sqrt(sumSquares) : 1
  const normalized = new Float32Array(vector.length)
  for (let index = 0; index < vector.length; index += 1) {
    const value = Number(vector[index])
    normalized[index] = Number.isFinite(value) ? value / norm : 0
  }
  return Array.from(normalized)
}

async function loadModel() {
  if (!modelPromise) {
    const modelUrl = `file://${MODEL_PATH.replace(/\\/g, '/')}`
    modelPromise = tf.loadLayersModel(modelUrl)
  }
  return modelPromise
}

async function toBuffer(data) {
  if (!data) {
    throw new Error('Sin datos para convertir.')
  }
  if (data instanceof Buffer) {
    return data
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data)
  }
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer)
  }
  if (typeof data.arrayBuffer === 'function') {
    const arrayBuffer = await data.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }
  if (data instanceof Readable) {
    const chunks = []
    for await (const chunk of data) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }
  throw new Error('Formato de datos no soportado para convertir en Buffer.')
}

async function generateEmbedding(buffer) {
  const model = await loadModel()
  const embedding = tf.tidy(() => {
    const decoded = tf.node.decodeImage(buffer, 3)
    const resized = tf.image.resizeBilinear(decoded, [224, 224], true)
    const normalized = resized.toFloat().div(255)
    const batched = normalized.expandDims(0)
    const prediction = model.predict(batched)
    const tensor = Array.isArray(prediction) ? prediction[0].squeeze() : prediction.squeeze()
    const data = tensor.dataSync()
    return new Float32Array(data)
  })
  return normalizeL2(embedding)
}

async function fetchReferenceImages() {
  let query = supabase
    .from('producto_reference_images')
    .select('id, productoId, path, bucket, filename')

  if (targetProductId) {
    query = query.eq('productoId', targetProductId)
  }

  const { data, error } = await query
  if (error) {
    throw error
  }
  return data || []
}

async function main() {
  try {
    if (dryRun) {
      console.log('Ejecutando en modo dry-run: no se guardarán cambios en Supabase.')
    }

    const references = await fetchReferenceImages()
    if (references.length === 0) {
      console.log('No se encontraron imágenes de referencia para procesar.')
      return
    }

    await loadModel()

    let processed = 0
    const failures = []

    for (const reference of references) {
      if (!reference?.path) {
        failures.push({ id: reference?.id ?? 0, reason: 'Ruta inválida o ausente.' })
        continue
      }

      const bucket = reference.bucket || DEFAULT_BUCKET
      const download = await supabase.storage.from(bucket).download(reference.path)
      if (download.error || !download.data) {
        failures.push({
          id: reference.id,
          reason: download.error?.message || 'No se pudo descargar la imagen de referencia.',
        })
        continue
      }

      let buffer
      try {
        buffer = await toBuffer(download.data)
      } catch (conversionError) {
        failures.push({ id: reference.id, reason: `Error convirtiendo a buffer: ${conversionError.message}` })
        continue
      }

      try {
        const embedding = await generateEmbedding(buffer)

        if (!dryRun) {
          await supabase
            .from('producto_embeddings')
            .delete()
            .eq('productoId', reference.productoId)
            .eq('referenceImageId', reference.id)

          const { error: insertError } = await supabase.from('producto_embeddings').insert({
            productoId: reference.productoId,
            embedding,
            fuente: reference.path,
            referenceImageId: reference.id,
          })

          if (insertError) {
            failures.push({ id: reference.id, reason: insertError.message || 'Error guardando el embedding.' })
            continue
          }
        }

        processed += 1
        console.log(`✔ Procesado referencia ${reference.id} (producto ${reference.productoId})`)
      } catch (processingError) {
        failures.push({ id: reference.id, reason: processingError.message || 'Error generando embedding.' })
      }
    }

    console.log(`\nEmbeddings generados: ${processed}`)
    if (failures.length > 0) {
      console.log('Fallos:')
      failures.forEach((failure) => {
        console.log(`  - Referencia ${failure.id}: ${failure.reason}`)
      })
      process.exitCode = 1
    }
  } catch (error) {
    console.error('Error ejecutando el generador de embeddings:', error)
    process.exit(1)
  }
}

main()
