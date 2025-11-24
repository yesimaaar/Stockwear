export interface Gasto {
  id: number
  tienda_id: number
  usuario_id: string | null
  caja_sesion_id: number | null
  descripcion: string
  monto: number
  categoria: string
  metodo_pago: string
  proveedor: string | null
  estado: 'pagado' | 'pendiente'
  saldo_pendiente: number
  fecha_vencimiento: string | null
  fecha_gasto: string
  created_at: string
  updated_at: string
}

export interface CreateGastoDTO {
  descripcion: string
  monto: number
  categoria: string
  metodo_pago: string
  proveedor?: string
  estado?: 'pagado' | 'pendiente'
  fecha_vencimiento?: string
  fecha_gasto?: string
  caja_sesion_id?: number
}
