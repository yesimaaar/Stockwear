import { supabase } from "@/lib/supabase"
import { Gasto, CreateGastoDTO } from "../types"

export const gastosService = {
  async getGastos(tiendaId: number, startDate?: Date, endDate?: Date) {
    let query = supabase
      .from("gastos")
      .select("*")
      .eq("tienda_id", tiendaId)
      .order("fecha_gasto", { ascending: false })

    if (startDate) {
      query = query.gte("fecha_gasto", startDate.toISOString())
    }
    if (endDate) {
      query = query.lte("fecha_gasto", endDate.toISOString())
    }

    const { data, error } = await query

    if (error) throw error
    return data as Gasto[]
  },

  async createGasto(tiendaId: number, gasto: CreateGastoDTO) {
    const { data, error } = await supabase
      .from("gastos")
      .insert({
        ...gasto,
        tienda_id: tiendaId,
      })
      .select()
      .single()

    if (error) throw error
    return data as Gasto
  },

  async deleteGasto(id: number) {
    const { error } = await supabase.from("gastos").delete().eq("id", id)
    if (error) throw error
  }
}
