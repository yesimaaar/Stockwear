import type { AlmacenResumen } from "@/features/movimientos/services/inventario-service"

export interface WarehouseCoordinate {
  lat: number
  lng: number
  label?: string
}

// Ajusta este catálogo con las coordenadas reales de tus almacenes.
// Se hace match por nombre (normalizado en minúsculas).
const NAME_BASED_COORDINATES: Record<string, WarehouseCoordinate> = {
  "cdmx central": { lat: 19.432608, lng: -99.133209, label: "CDMX Central" },
  "guadalajara norte": { lat: 20.67359, lng: -103.34499, label: "Guadalajara Norte" },
  "monterrey hub": { lat: 25.68661, lng: -100.31611, label: "Monterrey Hub" },
}


export function getWarehouseCoordinate(almacen: AlmacenResumen): WarehouseCoordinate | null {
  const lat = typeof almacen.latitud === "number" ? almacen.latitud : null
  const lng = typeof almacen.longitud === "number" ? almacen.longitud : null

  if (lat != null && lng != null) {
    return { lat, lng, label: almacen.nombre }
  }

  const normalizedName = almacen.nombre.trim().toLowerCase()
  const matchByName = NAME_BASED_COORDINATES[normalizedName]
  if (matchByName) {
    return matchByName
  }

  return null
}

export function upsertWarehouseCoordinate(name: string, coordinate: WarehouseCoordinate) {
  NAME_BASED_COORDINATES[name.trim().toLowerCase()] = coordinate
}
