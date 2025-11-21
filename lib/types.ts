export type RolUsuario = 'admin' | 'empleado'
export type EstadoRegistro = 'activo' | 'inactivo'

export interface Tienda {
  id: number
  nombre: string
  slug: string
  logo_url?: string | null
  createdAt: string
}

export interface Usuario {
  id: string
  authUid?: string
  tiendaId: number
  nombre: string
  email: string
  telefono?: string | null
  rol: RolUsuario
  estado: EstadoRegistro
  createdAt: string
}

export interface Producto {
  id: number
  tiendaId: number
  codigo: string
  nombre: string
  categoriaId: number
  descripcion: string | null
  precio: number
  descuento: number
  proveedor: string | null
  imagen: string | null
  stockMinimo: number
  estado: EstadoRegistro
  createdAt: string
}

export interface ProductoEmbedding {
  id: number
  productoId: number
  embedding: number[]
  fuente?: string | null
  referenceImageId?: number | null
  createdAt: string
  updatedAt: string
}

export interface ProductoReferenceImage {
  id: number
  productoId: number
  url: string
  path: string
  bucket?: string | null
  filename?: string | null
  mimeType?: string | null
  size?: number | null
  createdAt: string
  updatedAt: string
}

export interface Categoria {
  id: number
  tiendaId: number
  nombre: string
  descripcion: string | null
  estado: EstadoRegistro
}

export interface Talla {
  id: number
  tiendaId: number
  tipo: 'numerico' | 'alfanumerico'
  nombre: string
  estado: EstadoRegistro
}

export interface Almacen {
  id: number
  tiendaId: number
  nombre: string
  direccion: string | null
  tipo: 'principal' | 'sucursal'
  estado: EstadoRegistro
  latitud?: number | null
  longitud?: number | null
  abreviatura?: string | null
}

export interface Stock {
  id: number
  tiendaId: number
  productoId: number
  tallaId: number | null
  almacenId: number
  cantidad: number
  updatedAt: string
}

export interface HistorialStock {
  id: number
  tiendaId: number
  tipo: 'entrada' | 'salida' | 'venta' | 'ajuste'
  productoId: number
  tallaId: number | null
  almacenId: number
  cantidad: number
  stockAnterior: number
  stockNuevo: number
  usuarioId: string | null
  motivo: string | null
  costoUnitario: number | null
  createdAt: string
}

export interface Consulta {
  id: number
  tiendaId: number
  tipo: 'reconocimiento_visual' | 'manual'
  productoId: number | null
  empleadoId: string | null
  nivelConfianza: 'alto' | 'medio' | 'bajo'
  resultado: 'exitoso' | 'fallido'
  createdAt: string
}

export interface Venta {
  id: number
  tiendaId: number
  folio: string
  total: number
  usuarioId: string | null
  createdAt: string
}

export interface VentaDetalle {
  id: number
  tiendaId: number
  ventaId: number
  productoId: number
  stockId: number
  cantidad: number
  precioUnitario: number
  descuento: number
  subtotal: number
}
