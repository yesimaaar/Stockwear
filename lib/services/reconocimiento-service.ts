import { productos, consultas, type Consulta } from "@/lib/data/mock-data"
import { ProductoService } from "./producto-service"

export interface ReconocimientoResult {
  success: boolean
  producto?: ReturnType<typeof ProductoService.getById>
  nivelConfianza: "alto" | "medio" | "bajo"
  message?: string
}

export class ReconocimientoService {
  static async procesarImagen(imageData: string, empleadoId: number): Promise<ReconocimientoResult> {
    // Simular procesamiento de imagen con delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Simular reconocimiento aleatorio
    const random = Math.random()
    let nivelConfianza: "alto" | "medio" | "bajo"
    let productoId: number | null = null

    if (random > 0.7) {
      // 30% de probabilidad de confianza alta
      nivelConfianza = "alto"
      productoId = productos[Math.floor(Math.random() * productos.length)].id
    } else if (random > 0.4) {
      // 30% de probabilidad de confianza media
      nivelConfianza = "medio"
      productoId = productos[Math.floor(Math.random() * productos.length)].id
    } else {
      // 40% de probabilidad de confianza baja
      nivelConfianza = "bajo"
    }

    // Registrar consulta
    const consulta: Consulta = {
      id: consultas.length + 1,
      tipo: "reconocimiento_visual",
      productoId: productoId || 0,
      empleadoId,
      nivelConfianza,
      resultado: productoId ? "exitoso" : "fallido",
      createdAt: new Date(),
    }
    consultas.push(consulta)

    if (!productoId) {
      return {
        success: false,
        nivelConfianza,
        message: "No se pudo identificar el producto. Intente con mejor iluminación.",
      }
    }

    const producto = ProductoService.getById(productoId)

    return {
      success: true,
      producto: producto || undefined,
      nivelConfianza,
      message: nivelConfianza === "medio" ? "¿Es este el producto correcto?" : "Producto identificado correctamente",
    }
  }

  static getConsultasMasRecientes(limit = 10): Consulta[] {
    return consultas.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit)
  }

  static getProductosMasConsultados(limit = 10) {
    const conteo = consultas.reduce(
      (acc, c) => {
        if (c.resultado === "exitoso") {
          acc[c.productoId] = (acc[c.productoId] || 0) + 1
        }
        return acc
      },
      {} as Record<number, number>,
    )

    return Object.entries(conteo)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id, count]) => ({
        producto: ProductoService.getById(Number(id)),
        consultas: count,
      }))
  }
}
