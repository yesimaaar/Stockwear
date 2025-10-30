import { productos, categorias, stock, tallas, almacenes, type Producto } from "@/lib/data/mock-data"

export interface ProductoConStock extends Producto {
  categoria: string
  stockTotal: number
  stockPorTalla: Array<{
    talla: string
    almacen: string
    cantidad: number
  }>
}

export class ProductoService {
  static getAll(): ProductoConStock[] {
    return productos.map((p) => this.getById(p.id)!)
  }

  static getById(id: number): ProductoConStock | null {
    const producto = productos.find((p) => p.id === id)
    if (!producto) return null

    const categoria = categorias.find((c) => c.id === producto.categoriaId)
    const stockProducto = stock.filter((s) => s.productoId === id)
    const stockTotal = stockProducto.reduce((sum, s) => sum + s.cantidad, 0)

    const stockPorTalla = stockProducto.map((s) => {
      const talla = tallas.find((t) => t.id === s.tallaId)
      const almacen = almacenes.find((a) => a.id === s.almacenId)
      return {
        talla: talla?.nombre || "",
        almacen: almacen?.nombre || "",
        cantidad: s.cantidad,
      }
    })

    return {
      ...producto,
      categoria: categoria?.nombre || "",
      stockTotal,
      stockPorTalla,
    }
  }

  static search(query: string): ProductoConStock[] {
    const lowerQuery = query.toLowerCase()
    return this.getAll().filter(
      (p) => p.nombre.toLowerCase().includes(lowerQuery) || p.codigo.toLowerCase().includes(lowerQuery),
    )
  }

  static getByCategoria(categoriaId: number): ProductoConStock[] {
    return this.getAll().filter((p) => p.categoriaId === categoriaId)
  }

  static getStockBajo(): ProductoConStock[] {
    return this.getAll().filter((p) => p.stockTotal < p.stockMinimo)
  }

  static create(producto: Omit<Producto, "id" | "createdAt">): Producto {
    const newProducto: Producto = {
      ...producto,
      id: Math.max(...productos.map((p) => p.id)) + 1,
      createdAt: new Date(),
    }
    productos.push(newProducto)
    return newProducto
  }

  static update(id: number, data: Partial<Producto>): Producto | null {
    const index = productos.findIndex((p) => p.id === id)
    if (index === -1) return null

    productos[index] = { ...productos[index], ...data }
    return productos[index]
  }

  static delete(id: number): boolean {
    const index = productos.findIndex((p) => p.id === id)
    if (index === -1) return false

    productos[index].estado = "inactivo"
    return true
  }
}
