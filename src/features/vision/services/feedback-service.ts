import { supabase } from '@/lib/supabase'
import { getCurrentTiendaId } from '@/features/auth/services/tenant-service'

export interface VisualFeedbackParams {
  productoSugeridoId: number
  productoCorrectoId?: number | null
  similitud: number
  umbral: number
  fueCorreto: boolean
  embedding?: number[]
  empleadoId?: string | null
  tiendaId?: number
  metadata?: Record<string, unknown>
}

export interface FeedbackEstadisticas {
  total: number
  correctos: number
  rechazados: number
  tasaExito: string
  productosProblemáticos: Array<{
    productoId: number
    nombre: string
    rechazos: number
  }>
}

/**
 * Registra feedback del usuario sobre el reconocimiento visual.
 * Útil para mejorar el modelo y ajustar umbrales dinámicamente.
 */
export async function registrarFeedbackVisual(params: VisualFeedbackParams): Promise<{ success: boolean; error?: string }> {
  try {
    const tiendaId = params.tiendaId ?? (await getCurrentTiendaId())

    const { error } = await supabase.from('visual_recognition_feedback').insert({
      tienda_id: tiendaId,
      producto_sugerido_id: params.productoSugeridoId,
      producto_correcto_id: params.productoCorrectoId ?? null,
      similitud: params.similitud,
      umbral: params.umbral,
      fue_correcto: params.fueCorreto,
      embedding: params.embedding ?? null,
      empleado_id: params.empleadoId ?? null,
      metadata: params.metadata ?? {},
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Error registrando feedback visual:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error inesperado registrando feedback visual:', error)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Obtiene estadísticas del feedback de reconocimiento visual.
 * Útil para dashboards y análisis de rendimiento del modelo.
 */
export async function obtenerEstadisticasFeedback(options?: { tiendaId?: number }): Promise<FeedbackEstadisticas> {
  const tiendaId = options?.tiendaId ?? (await getCurrentTiendaId())

  const { data, error } = await supabase
    .from('visual_recognition_feedback')
    .select('producto_sugerido_id, fue_correcto, similitud')
    .eq('tienda_id', tiendaId)

  if (error) {
    console.error('Error obteniendo estadísticas de feedback:', error)
    return {
      total: 0,
      correctos: 0,
      rechazados: 0,
      tasaExito: '0',
      productosProblemáticos: [],
    }
  }

  const feedbackData = data || []
  const total = feedbackData.length
  const correctos = feedbackData.filter((f) => f.fue_correcto).length
  const rechazados = total - correctos
  const tasaExito = total > 0 ? ((correctos / total) * 100).toFixed(1) : '0'

  // Identificar productos con más rechazos
  const rechazosData = feedbackData.filter((f) => !f.fue_correcto)
  const conteoRechazos = rechazosData.reduce((acc: Record<number, number>, f) => {
    const id = f.producto_sugerido_id
    if (id != null) {
      acc[id] = (acc[id] || 0) + 1
    }
    return acc
  }, {})

  const productosProblemáticos = Object.entries(conteoRechazos)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, rechazos]) => ({
      productoId: Number(id),
      nombre: '', // Se puede enriquecer con datos del producto si se necesita
      rechazos,
    }))

  return {
    total,
    correctos,
    rechazados,
    tasaExito,
    productosProblemáticos,
  }
}

/**
 * Obtiene el promedio de similitud para identificaciones correctas vs incorrectas.
 * Útil para ajustar el umbral de reconocimiento de forma dinámica.
 */
export async function obtenerAnalisisSimilitud(options?: { tiendaId?: number }): Promise<{
  similitudPromedioCorrectos: number
  similitudPromedioRechazados: number
  umbralSugerido: number | null
}> {
  const tiendaId = options?.tiendaId ?? (await getCurrentTiendaId())

  const { data, error } = await supabase
    .from('visual_recognition_feedback')
    .select('fue_correcto, similitud')
    .eq('tienda_id', tiendaId)

  if (error || !data || data.length === 0) {
    return {
      similitudPromedioCorrectos: 0,
      similitudPromedioRechazados: 0,
      umbralSugerido: null,
    }
  }

  const correctos = data.filter((f) => f.fue_correcto)
  const rechazados = data.filter((f) => !f.fue_correcto)

  const promedioCorrectos =
    correctos.length > 0 ? correctos.reduce((sum, f) => sum + f.similitud, 0) / correctos.length : 0

  const promedioRechazados =
    rechazados.length > 0 ? rechazados.reduce((sum, f) => sum + f.similitud, 0) / rechazados.length : 0

  // Sugerir un umbral que esté entre el promedio de rechazados y correctos
  let umbralSugerido: number | null = null
  if (correctos.length >= 5 && rechazados.length >= 3) {
    // Solo sugerir si hay suficientes datos
    umbralSugerido = (promedioCorrectos + promedioRechazados) / 2
  }

  return {
    similitudPromedioCorrectos: promedioCorrectos,
    similitudPromedioRechazados: promedioRechazados,
    umbralSugerido,
  }
}
