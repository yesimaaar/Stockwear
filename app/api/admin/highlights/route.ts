import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentTiendaId } from "@/lib/services/tenant-service"
// import { cookies } from "next/headers" // Si usas cookies() directamente, necesitas esta línea

// *** SOLUCIÓN CRÍTICA: FORZAR DINÁMICO ***
// Esto soluciona el error de "Dynamic server usage" 
// y asegura que la ruta se ejecute en tiempo de solicitud (en lugar de ser estática).
export const dynamic = 'force-dynamic';

// La revalidación automática de Next.js es excelente, pero la propiedad 'dynamic'
// es necesaria para el uso de recursos específicos del request como cookies().
export const revalidate = 120

interface VentaRow {
    id: number
    total: number | null
    createdAt: string
}

interface VentaDetalleRow {
    ventaId: number
    productoId: number
    cantidad: number
    precioUnitario: number | null
    descuento: number | null
    subtotal: number | null
}

interface HistorialRow {
    tipo: string
    productoId: number | null
    cantidad: number | null
    costoUnitario: number | null
    createdAt: string
}

interface ProductoRow {
    id: number
    codigo: string
    estado: string
    stockMinimo: number
    createdAt: string
    nombre: string | null
    precio: number | null
    imagen: string | null
    categoria?: { nombre: string | null } | Array<{ nombre: string | null }> | null
}

interface HighlightProduct {
    id: number
    codigo?: string | null
    nombre: string
    categoria?: string | null
    precio?: number | null
    imagen?: string | null
    tag?: string | null
    etiqueta?: string | null
    totalVendidas?: number
    ingresos?: number
}

const VENTAS_LIMIT = 400
const DETALLE_LIMIT = 800
const PRODUCTOS_LIMIT = 400
const HISTORIAL_LIMIT = 800

const fechaRecienteFormatter = new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
})

function resolveCategoriaNombre(categoria: ProductoRow["categoria"]): string | null {
    if (!categoria) return null
    if (Array.isArray(categoria)) {
        return categoria[0]?.nombre ?? null
    }
    return categoria.nombre ?? null
}

function getDateParts(dateLike: string | Date) {
    const date = typeof dateLike === "string" ? new Date(dateLike) : dateLike
    return {
        year: date.getFullYear(),
        month: date.getMonth(),
    }
}

function calcularSubtotal(detalle: VentaDetalleRow) {
    if (typeof detalle.subtotal === "number" && Number.isFinite(detalle.subtotal)) {
        return detalle.subtotal
    }

    const unitPrice =
        typeof detalle.precioUnitario === "number" ? detalle.precioUnitario : Number(detalle.precioUnitario ?? 0)
    const cantidad = detalle.cantidad || 0
    const descuento = typeof detalle.descuento === "number" ? detalle.descuento : Number(detalle.descuento ?? 0)
    const bruto = unitPrice * cantidad
    const discountAmount = (bruto * descuento) / 100
    return Math.max(bruto - discountAmount, 0)
}

function formatRecent(producto: ProductoRow, index: number): HighlightProduct {
    return {
        id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre ?? producto.codigo ?? `Producto ${producto.id}`,
        categoria: resolveCategoriaNombre(producto.categoria),
        precio: producto.precio ?? null,
        imagen: producto.imagen ?? null,
        etiqueta: producto.createdAt ? fechaRecienteFormatter.format(new Date(producto.createdAt)) : null,
        tag: index === 0 ? "Mas reciente" : "Nuevo",
    }
}

export async function GET() {
    try {
        // En una ruta dinámica, Supabase crea un cliente que puede acceder
        // a las cookies (necesario para el auth).
        const supabase = await createClient()
        let tiendaId: number
        try {
            tiendaId = await getCurrentTiendaId({ client: supabase })
        } catch (error) {
            console.error("Error determinando tienda para highlights:", error)
            const message = error instanceof Error ? error.message : 'Tienda no encontrada'
            return NextResponse.json({ message }, { status: 403 })
        }

        const [ventasResp, detallesResp, productosResp, historialResp] = await Promise.all([
            supabase
                .from("ventas")
                .select("id,total,\"createdAt\"")
                .eq("tienda_id", tiendaId)
                .order("createdAt", { ascending: false })
                .limit(VENTAS_LIMIT),
            supabase
                .from("ventasDetalle")
                .select("\"ventaId\",\"productoId\",cantidad,\"precioUnitario\",descuento,subtotal")
                .eq("tienda_id", tiendaId)
                .limit(DETALLE_LIMIT),
            supabase
                .from("productos")
                .select(
                    `id,codigo,estado,"stockMinimo","createdAt",nombre,precio,imagen,categoria:categorias!productos_categoriaId_fkey ( nombre )`
                )
                .eq("tienda_id", tiendaId)
                .order("createdAt", { ascending: false })
                .limit(PRODUCTOS_LIMIT),
            supabase
                .from("historialStock")
                .select("tipo,\"productoId\",cantidad,\"costoUnitario\",\"createdAt\"")
                .eq("tipo", "venta")
                .eq("tienda_id", tiendaId)
                .order("createdAt", { ascending: false })
                .limit(HISTORIAL_LIMIT),
        ])

        if (ventasResp.error || detallesResp.error || productosResp.error || historialResp.error) {
            console.error("Error generando destacados", {
                ventasError: ventasResp.error,
                detallesError: detallesResp.error,
                productosError: productosResp.error,
                historialError: historialResp.error,
            })

            return NextResponse.json(
                {
                    topProducts: [],
                    newProducts: [],
                    generatedAt: new Date().toISOString(),
                },
                { status: 500 },
            )
        }

        let ventas = (ventasResp.data as VentaRow[] | null) ?? []
        let detalles = (detallesResp.data as VentaDetalleRow[] | null) ?? []
        const historial = (historialResp.data as HistorialRow[] | null) ?? []
        const productos = (productosResp.data as ProductoRow[] | null) ?? []

        if (ventas.length === 0 && detalles.length === 0 && historial.length > 0) {
            const legacyEntries = historial
                .filter((row) => row.productoId !== null && (row.cantidad ?? 0) > 0)
                .map((row, index) => {
                    const cantidad = Math.max(row.cantidad ?? 0, 0)
                    const unitPrice = row.costoUnitario ?? 0
                    const subtotal = unitPrice * cantidad
                    return {
                        ventaId: -(index + 1),
                        productoId: row.productoId as number,
                        cantidad,
                        precioUnitario: unitPrice,
                        descuento: null,
                        subtotal,
                        createdAt: row.createdAt,
                    }
                })

            if (legacyEntries.length) {
                ventas = legacyEntries.map((entry) => ({
                    id: entry.ventaId,
                    total: entry.subtotal,
                    createdAt: entry.createdAt,
                }))
                detalles = legacyEntries.map(({ createdAt: _createdAt, ...detalle }) => detalle)
            }
        }

        const now = new Date()
        const { month: currentMonth, year: currentYear } = getDateParts(now)

        const ventasCurrentMonth = ventas.filter((venta) => {
            const { month, year } = getDateParts(venta.createdAt)
            return month === currentMonth && year === currentYear
        })

        const ventasCurrentMonthIds = new Set(ventasCurrentMonth.map((venta) => venta.id))
        const detallesMes = detalles.filter((detalle) => ventasCurrentMonthIds.has(detalle.ventaId))

        const acumularPorProducto = (lista: VentaDetalleRow[]) =>
            lista.reduce<Map<number, { cantidad: number; total: number }>>((acc, detalle) => {
                const productoId = detalle.productoId
                const current = acc.get(productoId) || { cantidad: 0, total: 0 }
                const ingresos = calcularSubtotal(detalle)
                acc.set(productoId, {
                    cantidad: current.cantidad + detalle.cantidad,
                    total: current.total + ingresos,
                })
                return acc
            }, new Map())

        const ventasPorProductoMes = acumularPorProducto(detallesMes)
        const ventasPorProductoHistorico = acumularPorProducto(detalles)

        const ordenarVentas = (mapa: Map<number, { cantidad: number; total: number }>) =>
            Array.from(mapa.entries()).sort((a, b) => {
                if (b[1].cantidad !== a[1].cantidad) {
                    return b[1].cantidad - a[1].cantidad
                }
                return b[1].total - a[1].total
            })

        const combinados: Array<[number, { cantidad: number; total: number }]> = []
        const seleccionados = new Set<number>()

        for (const entrada of ordenarVentas(ventasPorProductoMes)) {
            if (combinados.length >= 4) break
            seleccionados.add(entrada[0])
            combinados.push(entrada)
        }

        if (combinados.length < 4) {
            for (const entrada of ordenarVentas(ventasPorProductoHistorico)) {
                if (seleccionados.has(entrada[0])) continue
                combinados.push(entrada)
                if (combinados.length >= 4) break
            }
        }

        const ventasParaDestacados = combinados.length ? new Map(combinados) : ventasPorProductoHistorico
        const productMap = new Map(productos.map((producto) => [producto.id, producto]))

        const topProducts = Array.from(ventasParaDestacados.entries())
            .sort((a, b) => b[1].cantidad - a[1].cantidad || b[1].total - a[1].total)
            .slice(0, 4)
            .map(([productoId, stats], index): HighlightProduct => {
                const productInfo = productMap.get(productoId)
                return {
                    id: productoId,
                    codigo: productInfo?.codigo ?? null,
                    nombre: productInfo?.nombre ?? productInfo?.codigo ?? `Producto ${productoId}`,
                    categoria: resolveCategoriaNombre(productInfo?.categoria ?? null),
                    precio: productInfo?.precio ?? null,
                    imagen: productInfo?.imagen ?? null,
                    totalVendidas: stats.cantidad,
                    ingresos: stats.total,
                    tag: index === 0 ? "Mas vendido" : `Top ${index + 1}`,
                }
            })

        const activos = productos.filter((producto) => producto.estado === "activo")
        const baseRecientes = activos.length ? activos : productos
        const newProducts = baseRecientes
            .slice()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 4)
            .map((producto, index) => formatRecent(producto, index))

        return NextResponse.json({
            topProducts: topProducts,
            newProducts: newProducts,
            generatedAt: new Date().toISOString(),
        })
    } catch (error) {
        console.error("Error inesperado generando destacados", error)
        return NextResponse.json(
            {
                topProducts: [],
                newProducts: [],
                generatedAt: new Date().toISOString(),
            },
            { status: 500 },
        )
    }
}