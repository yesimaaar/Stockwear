import { useCallback, useRef, useState } from 'react'
import { generateEmbedding, preloadEmbeddingModel, type EmbeddableInput } from '@/lib/ai/mobile-net'

export function useShoeRecognizer() {
  const [loadingModel, setLoadingModel] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const modelReadyRef = useRef(false)

  const ensureModel = useCallback(async () => {
    if (modelReadyRef.current) return
    setLoadingModel(true)
    setError(null)
    try {
      await preloadEmbeddingModel()
      modelReadyRef.current = true
    } catch (err) {
      console.error('No fue posible cargar el modelo de embeddings', err)
      setError('No fue posible cargar el modelo de reconocimiento. Intenta nuevamente.')
      throw err
    } finally {
      setLoadingModel(false)
    }
  }, [])

  const computeEmbedding = useCallback(async (input: EmbeddableInput) => {
    await ensureModel()
    return generateEmbedding(input)
  }, [ensureModel])

  const resetError = useCallback(() => setError(null), [])

  return {
    ensureModel,
    computeEmbedding,
    loadingModel,
    error,
    resetError,
  }
}
