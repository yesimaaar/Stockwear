export function normalizeL2(vector: ArrayLike<number>): Float32Array {
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

export function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length) {
    throw new Error('Los vectores deben tener la misma longitud para calcular la similitud coseno.')
  }

  let dot = 0
  let normA = 0
  let normB = 0
  for (let index = 0; index < a.length; index += 1) {
    const valueA = Number(a[index])
    const valueB = Number(b[index])
    if (!Number.isFinite(valueA) || !Number.isFinite(valueB)) {
      continue
    }
    dot += valueA * valueB
    normA += valueA * valueA
    normB += valueB * valueB
  }

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

export function toFloat32(vector: number[] | Float32Array): Float32Array {
  return vector instanceof Float32Array ? vector : Float32Array.from(vector ?? [])
}
