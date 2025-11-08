import { InventarioService } from "@/lib/services/inventario-service"

import { AlmacenesPageClient } from "./almacenes-client"

async function loadInitialAlmacenes() {
  try {
    return await InventarioService.getAlmacenesResumen()
  } catch (error) {
    console.error("Error cargando almacenes en el servidor", error)
    return []
  }
}

export default async function AlmacenesPage() {
  const initialAlmacenes = await loadInitialAlmacenes()

  return <AlmacenesPageClient initialAlmacenes={initialAlmacenes} />
}
