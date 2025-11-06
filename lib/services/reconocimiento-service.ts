import { supabase } from '@/lib/supabase'
import { ProductoService } from './producto-service'
import type { Consulta } from '@/lib/types'

export interface ReconocimientoResult {
  success: boolean
  producto?: Awaited<ReturnType<typeof ProductoService.getById>>
  nivelConfianza: 'alto' | 'medio' | 'bajo'
  message?: string
}

export class ReconocimientoService {
  static async procesarImagen(imageData: string, empleadoId: string | number): Promise<ReconocimientoResult> {
    // Simular procesamiento de imagen con delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Simular reconocimiento aleatorio (mismo comportamiento que antes)
    const random = Math.random()
    let nivelConfianza: 'alto' | 'medio' | 'bajo'
    let productoId: number | null = null

    if (random > 0.7) {
      nivelConfianza = 'alto'
    } else if (random > 0.4) {
      nivelConfianza = 'medio'
    } else {
      nivelConfianza = 'bajo'
    }

    // Intentar seleccionar producto aleatorio de la tabla productos
    if (nivelConfianza !== 'bajo') {
      const { data: productos } = await supabase.from('productos').select('id')
      if (productos && productos.length > 0) {
        const randomItem = productos[Math.floor(Math.random() * productos.length)] as any
        productoId = (randomItem.id as number) || null
      }
    }

    const consultaProductoId = productoId ?? null
    const consultaEmpleadoId =
      typeof empleadoId === 'string' && empleadoId.trim().length > 0 ? empleadoId : null

    // Registrar consulta en tabla `consultas`
    const nuevaConsulta: Partial<Consulta> = {
      tipo: 'reconocimiento_visual',
      productoId: consultaProductoId,
      nivelConfianza,
      resultado: consultaProductoId ? 'exitoso' : 'fallido',
      createdAt: new Date().toISOString(),
    }

    if (consultaEmpleadoId) {
      nuevaConsulta.empleadoId = consultaEmpleadoId
    }

  await supabase.from('consultas').insert(nuevaConsulta)

    if (!consultaProductoId) {
      return {
        success: false,
        nivelConfianza,
        message: 'No se pudo identificar el producto. Intente con mejor iluminación.',
      }
    }

    const producto = await ProductoService.getById(consultaProductoId)

    return {
      success: true,
      producto: producto || undefined,
      nivelConfianza,
      message: nivelConfianza === 'medio' ? '¿Es este el producto correcto?' : 'Producto identificado correctamente',
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
