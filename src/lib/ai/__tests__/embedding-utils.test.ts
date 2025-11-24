import { describe, expect, it } from 'vitest'
import { cosineSimilarity, normalizeL2, toFloat32 } from '../embedding-utils'

describe('embedding-utils', () => {
  it('normalizes vectors to L2 norm 1', () => {
    const vector = [3, 4]
    const normalized = normalizeL2(vector)
    const norm = Math.sqrt(normalized.reduce((sum, value) => sum + value * value, 0))
    expect(norm).toBeCloseTo(1, 5)
  })

  it('computes cosine similarity for identical vectors', () => {
    const a = normalizeL2([1, 2, 3])
    const b = normalizeL2([1, 2, 3])
    const similarity = cosineSimilarity(a, b)
    expect(similarity).toBeCloseTo(1, 5)
  })

  it('computes cosine similarity for orthogonal vectors', () => {
    const a = normalizeL2([1, 0])
    const b = normalizeL2([0, 1])
    const similarity = cosineSimilarity(a, b)
    expect(similarity).toBeCloseTo(0, 5)
  })

  it('converts arrays to Float32Array', () => {
    const vector = [0.1, 0.2]
    const result = toFloat32(vector)
    expect(result).toBeInstanceOf(Float32Array)
    expect(Array.from(result)).toEqual(vector)
  })
})
