export interface Usuario {
  id: number
  nombre: string
  email: string
  password: string
  rol: "admin" | "empleado"
  estado: "activo" | "inactivo"
  createdAt: Date
}

export interface Producto {
  id: number
  codigo: string
  nombre: string
  categoriaId: number
  precio: number
  descuento: number
  proveedor: string
  imagen: string
  stockMinimo: number
  estado: "activo" | "inactivo"
  createdAt: Date
}

export interface Categoria {
  id: number
  nombre: string
  descripcion: string
  estado: "activo" | "inactivo"
}

export interface Talla {
  id: number
  tipo: "numerico" | "alfanumerico"
  nombre: string
  estado: "activo" | "inactivo"
}

export interface Almacen {
  id: number
  nombre: string
  direccion: string
  tipo: "principal" | "sucursal"
  estado: "activo" | "inactivo"
}

export interface Stock {
  id: number
  productoId: number
  tallaId: number
  almacenId: number
  cantidad: number
  updatedAt: Date
}

export interface HistorialStock {
  id: number
  tipo: "entrada" | "salida" | "venta" | "ajuste"
  productoId: number
  tallaId: number
  almacenId: number
  cantidad: number
  stockAnterior: number
  stockNuevo: number
  usuarioId: number
  motivo: string
  costoUnitario: number
  createdAt: Date
}

export interface Consulta {
  id: number
  tipo: "reconocimiento_visual" | "manual"
  productoId: number
  empleadoId: number
  nivelConfianza: "alto" | "medio" | "bajo"
  resultado: "exitoso" | "fallido"
  createdAt: Date
}

// Datos mock
export const usuarios: Usuario[] = [
  {
    id: 1,
    nombre: "Administrador Principal",
    email: "admin@stockwear.com",
    password: "admin123",
    rol: "admin",
    estado: "activo",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: 2,
    nombre: "Juan Pérez",
    email: "empleado@stockwear.com",
    password: "empleado123",
    rol: "empleado",
    estado: "activo",
    createdAt: new Date("2024-01-15"),
  },
  {
    id: 3,
    nombre: "María García",
    email: "maria@stockwear.com",
    password: "maria123",
    rol: "empleado",
    estado: "activo",
    createdAt: new Date("2024-02-01"),
  },
]

export const categorias: Categoria[] = [
  { id: 1, nombre: "Calzado Deportivo", descripcion: "Zapatos para deporte", estado: "activo" },
  { id: 2, nombre: "Ropa Deportiva", descripcion: "Camisetas, shorts, etc.", estado: "activo" },
  { id: 3, nombre: "Accesorios", descripcion: "Gorras, medias, etc.", estado: "activo" },
]

export const tallas: Talla[] = [
  { id: 1, tipo: "numerico", nombre: "38", estado: "activo" },
  { id: 2, tipo: "numerico", nombre: "39", estado: "activo" },
  { id: 3, tipo: "numerico", nombre: "40", estado: "activo" },
  { id: 4, tipo: "numerico", nombre: "41", estado: "activo" },
  { id: 5, tipo: "numerico", nombre: "42", estado: "activo" },
  { id: 6, tipo: "alfanumerico", nombre: "S", estado: "activo" },
  { id: 7, tipo: "alfanumerico", nombre: "M", estado: "activo" },
  { id: 8, tipo: "alfanumerico", nombre: "L", estado: "activo" },
  { id: 9, tipo: "alfanumerico", nombre: "XL", estado: "activo" },
]

export const almacenes: Almacen[] = [
  { id: 1, nombre: "Almacén Principal", direccion: "Calle 50 #25-30", tipo: "principal", estado: "activo" },
  { id: 2, nombre: "Sucursal Centro", direccion: "Carrera 15 #10-20", tipo: "sucursal", estado: "activo" },
  { id: 3, nombre: "Sucursal Norte", direccion: "Avenida 30 #45-10", tipo: "sucursal", estado: "activo" },
]

export const productos: Producto[] = [
  {
    id: 1,
    codigo: "ZAP-001",
    nombre: "Nike Air Max 270",
    categoriaId: 1,
    precio: 450000,
    descuento: 0,
    proveedor: "Nike Colombia",
    imagen: "/nike-air-max-270.png",
    stockMinimo: 10,
    estado: "activo",
    createdAt: new Date("2024-01-10"),
  },
  {
    id: 2,
    codigo: "CAM-002",
    nombre: "Camiseta Adidas Running",
    categoriaId: 2,
    precio: 120000,
    descuento: 10,
    proveedor: "Adidas Colombia",
    imagen: "/adidas-running-shirt.jpg",
    stockMinimo: 20,
    estado: "activo",
    createdAt: new Date("2024-01-15"),
  },
  {
    id: 3,
    codigo: "ZAP-003",
    nombre: "Puma RS-X",
    categoriaId: 1,
    precio: 380000,
    descuento: 15,
    proveedor: "Puma Colombia",
    imagen: "/puma-rs-x-sneakers.jpg",
    stockMinimo: 10,
    estado: "activo",
    createdAt: new Date("2024-01-20"),
  },
  {
    id: 4,
    codigo: "CAM-004",
    nombre: "Camiseta Nike Dri-Fit",
    categoriaId: 2,
    precio: 95000,
    descuento: 0,
    proveedor: "Nike Colombia",
    imagen: "/nike-dri-fit-shirt.jpg",
    stockMinimo: 15,
    estado: "activo",
    createdAt: new Date("2024-02-01"),
  },
  {
    id: 5,
    codigo: "ZAP-005",
    nombre: "Adidas Ultraboost",
    categoriaId: 1,
    precio: 520000,
    descuento: 0,
    proveedor: "Adidas Colombia",
    imagen: "/adidas-ultraboost.png",
    stockMinimo: 8,
    estado: "activo",
    createdAt: new Date("2024-02-05"),
  },
]

export const stock: Stock[] = [
  // Nike Air Max 270
  { id: 1, productoId: 1, tallaId: 1, almacenId: 1, cantidad: 15, updatedAt: new Date() },
  { id: 2, productoId: 1, tallaId: 2, almacenId: 1, cantidad: 20, updatedAt: new Date() },
  { id: 3, productoId: 1, tallaId: 3, almacenId: 1, cantidad: 10, updatedAt: new Date() },
  { id: 4, productoId: 1, tallaId: 1, almacenId: 2, cantidad: 8, updatedAt: new Date() },
  { id: 5, productoId: 1, tallaId: 2, almacenId: 2, cantidad: 12, updatedAt: new Date() },

  // Camiseta Adidas
  { id: 6, productoId: 2, tallaId: 6, almacenId: 1, cantidad: 30, updatedAt: new Date() },
  { id: 7, productoId: 2, tallaId: 7, almacenId: 1, cantidad: 45, updatedAt: new Date() },
  { id: 8, productoId: 2, tallaId: 8, almacenId: 1, cantidad: 35, updatedAt: new Date() },
  { id: 9, productoId: 2, tallaId: 9, almacenId: 1, cantidad: 10, updatedAt: new Date() },

  // Puma RS-X
  { id: 10, productoId: 3, tallaId: 2, almacenId: 1, cantidad: 5, updatedAt: new Date() },
  { id: 11, productoId: 3, tallaId: 3, almacenId: 1, cantidad: 3, updatedAt: new Date() },
  { id: 12, productoId: 3, tallaId: 4, almacenId: 2, cantidad: 7, updatedAt: new Date() },

  // Camiseta Nike
  { id: 13, productoId: 4, tallaId: 6, almacenId: 1, cantidad: 25, updatedAt: new Date() },
  { id: 14, productoId: 4, tallaId: 7, almacenId: 1, cantidad: 30, updatedAt: new Date() },
  { id: 15, productoId: 4, tallaId: 8, almacenId: 2, cantidad: 20, updatedAt: new Date() },

  // Adidas Ultraboost
  { id: 16, productoId: 5, tallaId: 3, almacenId: 1, cantidad: 12, updatedAt: new Date() },
  { id: 17, productoId: 5, tallaId: 4, almacenId: 1, cantidad: 8, updatedAt: new Date() },
  { id: 18, productoId: 5, tallaId: 5, almacenId: 2, cantidad: 6, updatedAt: new Date() },
]

export const historialStock: HistorialStock[] = [
  {
    id: 1,
    tipo: "entrada",
    productoId: 1,
    tallaId: 1,
    almacenId: 1,
    cantidad: 15,
    stockAnterior: 0,
    stockNuevo: 15,
    usuarioId: 1,
    motivo: "Stock inicial",
    costoUnitario: 350000,
    createdAt: new Date("2024-01-10"),
  },
  {
    id: 2,
    tipo: "venta",
    productoId: 1,
    tallaId: 1,
    almacenId: 1,
    cantidad: 2,
    stockAnterior: 15,
    stockNuevo: 13,
    usuarioId: 2,
    motivo: "Venta en tienda",
    costoUnitario: 350000,
    createdAt: new Date("2024-01-15"),
  },
]

export const consultas: Consulta[] = [
  {
    id: 1,
    tipo: "reconocimiento_visual",
    productoId: 1,
    empleadoId: 2,
    nivelConfianza: "alto",
    resultado: "exitoso",
    createdAt: new Date("2024-02-10"),
  },
  {
    id: 2,
    tipo: "reconocimiento_visual",
    productoId: 2,
    empleadoId: 2,
    nivelConfianza: "alto",
    resultado: "exitoso",
    createdAt: new Date("2024-02-11"),
  },
]
