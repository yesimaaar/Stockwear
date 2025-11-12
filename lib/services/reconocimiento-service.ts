import { supabase } from '@/lib/supabase'
import { ProductoService, type ProductoConStock } from './producto-service'
import { ProductoEmbeddingService } from './producto-embedding-service'
import { cosineSimilarity } from '@/lib/ai/embedding-utils'
import type { Consulta } from '@/lib/types'

type NivelConfianza = 'alto' | 'medio' | 'bajo'

export interface ReconocimientoResult {
  success: boolean
  similitud: number
  umbral: number
  nivelConfianza: NivelConfianza
  producto?: ProductoConStock | null
  coincidencias?: Array<{
    productoId: number
    nombre: string
    similitud: number
  }>
  message?: string
}

export interface ProcesarEmbeddingParams {
  embedding: Float32Array
  empleadoId?: string | null
  umbral: number
}

function calcularNivelConfianza(similitud: number, umbral: number): NivelConfianza {
  if (similitud >= umbral + 0.1) return 'alto'
  if (similitud >= umbral) return 'medio'
  return 'bajo'
}

async function registrarConsulta(options: {
  productoId: number | null
  empleadoId?: string | null
  nivelConfianza: NivelConfianza
  resultado: 'exitoso' | 'fallido'
}) {
  const payload: Partial<Consulta> = {
    tipo: 'reconocimiento_visual',
    productoId: options.productoId,
    empleadoId: options.empleadoId ?? null,
    nivelConfianza: options.nivelConfianza,
    resultado: options.resultado,
    createdAt: new Date().toISOString(),
  }

  await supabase.from('consultas').insert(payload)
}

export class ReconocimientoService {
  static async procesarEmbedding(params: ProcesarEmbeddingParams): Promise<ReconocimientoResult> {
    const { embedding, empleadoId, umbral } = params

    const catalogo = await ProductoEmbeddingService.getCatalogEmbeddings()
    if (catalogo.length === 0) {
      return {
        success: false,
        similitud: 0,
        umbral,
        nivelConfianza: 'bajo',
        message: 'Aún no se han registrado embeddings para los productos en el catálogo.',
      }
    }

    let mejorSimilitud = -1
    let mejorProducto: (typeof catalogo)[number] | null = null
    const coincidencias: Array<{ productoId: number; nombre: string; similitud: number }> = []

    for (const producto of catalogo) {
      let similitudProducto = -1
      for (const candidato of producto.embeddings) {
        if (candidato.length !== embedding.length) {
          continue
        }
        const similitud = cosineSimilarity(embedding, candidato)
        if (similitud > similitudProducto) {
          similitudProducto = similitud
        }
      }

      if (similitudProducto >= 0) {
        coincidencias.push({ productoId: producto.productoId, nombre: producto.nombre, similitud: similitudProducto })
        if (similitudProducto > mejorSimilitud) {
          mejorSimilitud = similitudProducto
          mejorProducto = producto
        }
      }
    }

    coincidencias.sort((a, b) => b.similitud - a.similitud)
    const nivelConfianza = calcularNivelConfianza(mejorSimilitud, umbral)

    if (!mejorProducto || mejorSimilitud < umbral) {
      await registrarConsulta({
        productoId: null,
        empleadoId,
        nivelConfianza,
        resultado: 'fallido',
      })

      return {
        success: false,
        similitud: mejorSimilitud,
        umbral,
        nivelConfianza,
        coincidencias: coincidencias.slice(0, 3),
        message: 'No se encontró un zapato con suficiente similitud. Intenta capturar otra imagen.',
      }
    }

    const productoDetallado = await ProductoService.getById(mejorProducto.productoId)

    await registrarConsulta({
      productoId: mejorProducto.productoId,
      empleadoId,
      nivelConfianza,
      resultado: 'exitoso',
    })

    return {
      success: true,
      similitud: mejorSimilitud,
      umbral,
      nivelConfianza,
      producto: productoDetallado,
      coincidencias: coincidencias.slice(0, 3),
      message:
        nivelConfianza === 'alto'
          ? 'Producto identificado correctamente.'
          : 'Confirma que el producto sugerido coincide con la captura.',
    }
  }

  static async getConsultasMasRecientes(limit = 10): Promise<Consulta[]> {
    const { data } = await supabase.from('consultas').select('*').order('createdAt', { ascending: false }).limit(limit)
    return (data as Consulta[]) || []
  }

  static async getProductosMasConsultados(limit = 10) {
    // Traer consultas exitosas y agregar conteo por producto
    const { data: consultas } = await supabase.from('consultas').select('*').eq('resultado', 'exitoso')
    const conteo = (consultas || []).reduce((acc: Record<number, number>, c) => {
      if (c.productoId == null) {
        return acc
      }
      const id = Number(c.productoId)
      acc[id] = (acc[id] || 0) + 1
      return acc
    }, {})

    const items = Object.entries(conteo)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
    const result = [] as Array<{ producto: Awaited<ReturnType<typeof ProductoService.getById>>; consultas: number }>
    for (const [id, count] of items) {
      const producto = await ProductoService.getById(Number(id))
      result.push({ producto: producto || null, consultas: count })
    }
    return result
  }
}
