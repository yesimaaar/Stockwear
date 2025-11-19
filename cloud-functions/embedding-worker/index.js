const path = require('node:path')
const { Buffer } = require('node:buffer')
const tf = require('@tensorflow/tfjs-node')
// Quita esta línea ya que no exportaremos onRequest directamente, sino la función
// const { onRequest } = require('@google-cloud/functions-framework')

const MODEL_RELATIVE_PATH = ['models', 'mobilenet', 'model.json']
const WORKER_AUTH_TOKEN = process.env.AUTH_TOKEN ?? ''

let modelPromise = null

function normalizeL2(vector) {
	let sumSquares = 0
	const length = vector.length
	for (let index = 0; index < length; index += 1) {
		const value = Number(vector[index])
		if (Number.isFinite(value)) {
			sumSquares += value * value
		}
	}

	const norm = sumSquares > 0 ? Math.sqrt(sumSquares) : 1
	const normalized = new Float32Array(length)
	for (let index = 0; index < length; index += 1) {
		const value = Number(vector[index])
		normalized[index] = Number.isFinite(value) ? value / norm : 0
	}
	return normalized
}

async function loadModel() {
	if (!modelPromise) {
		modelPromise = (async () => {
			const modelPath = path.join(__dirname, ...MODEL_RELATIVE_PATH)
			const modelUrl = `file://${modelPath.replace(/\\/g, '/')}`
			console.info('[worker] Loading model from', modelUrl)
			return tf.loadLayersModel(modelUrl)
		})()
	}
	return modelPromise
}

async function generateEmbeddingFromBuffer(buffer) {
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

function toBufferFromBase64(value) {
	try {
		const cleanedValue = value.replace(/ /g, '+')
		return Buffer.from(cleanedValue, 'base64')
	} catch (error) {
		throw new Error('No se pudo decodificar la imagen en base64.')
	}
}

// *** ¡ESTE ES EL CAMBIO CLAVE! ***
// Exporta la función HTTP directamente con el nombre que usarás en --entry-point
exports.generateEmbedding = async (req, res) => { // Renombrado y exportado
	if (req.method !== 'POST') {
		res.status(405).json({ message: 'Método no permitido. Usa POST.' })
		return
	}

	try {
		if (WORKER_AUTH_TOKEN) {
			const authHeader = req.header('authorization') ?? req.header('Authorization') ?? ''
			const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
			if (!bearer || bearer !== WORKER_AUTH_TOKEN) {
				res.status(401).json({ message: 'Token de acceso no válido.' })
				return
			}
		}

		const { imageBase64, mimeType, productId, referenceImageId } = req.body ?? {}

		if (!imageBase64 || typeof imageBase64 !== 'string') {
			res.status(400).json({ message: 'Falta imageBase64 en la solicitud.' })
			return
		}

		const buffer = toBufferFromBase64(imageBase64)
		const embedding = await generateEmbeddingFromBuffer(buffer)

		res.status(200).json({
			embedding: Array.from(embedding),
			length: embedding.length,
			productId: productId ?? null,
			referenceImageId: referenceImageId ?? null,
			mimeType: mimeType ?? null,
		})
	} catch (error) {
		console.error('Error generando embedding remoto:', error)
		res.status(500).json({
			message: 'No se pudo generar el embedding remoto.',
			details: error instanceof Error ? error.message : String(error),
		})
	}
}
