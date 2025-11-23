import { InventarioService } from "@/features/movimientos/services/inventario-service"
import { createClient } from "@/lib/supabase/server"

import { AlmacenesPageClient } from "./almacenes-client"

async function loadInitialAlmacenes() {
  try {
    const supabase = await createClient()
    return await InventarioService.getAlmacenesResumen(supabase)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message !== 'Usuario no autenticado') {
      console.error("Error cargando almacenes en el servidor", error)
    }
    return []
  }
}

export default async function AlmacenesPage() {
  const initialAlmacenes = await loadInitialAlmacenes()

  return <AlmacenesPageClient initialAlmacenes={initialAlmacenes} />
}
