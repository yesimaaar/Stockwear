import React from "react"
import Image from "next/image"
import Link from "next/link"
import { Sparkles, ShoppingBag, Star } from "lucide-react"
import ProductCard from "@/components/ProductCard"
import CartButton from "@/components/CartButton"
import CartDrawer from "@/components/CartDrawer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { CatalogClient } from "@/components/catalog/catalog-client"
import {
  mapProductoRow,
  PRODUCTO_SELECT,
  type ProductoConStock,
  type ProductoRow,
} from "@/lib/services/producto-service"

export const revalidate = 60

async function getCatalogProducts(): Promise<ProductoConStock[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("productos")
      .select(PRODUCTO_SELECT)
      .eq("estado", "activo")
      .order("createdAt", { ascending: false })

    if (error) {
      console.error("Error al cargar el catálogo público", error)
      return []
    }

    if (!data) {
      return []
    }

    return (data as ProductoRow[]).map(mapProductoRow)
  } catch (error) {
    console.error("Error inesperado al cargar el catálogo público", error)
    return []
  }
}

export default async function CatalogPage() {
  const productos = await getCatalogProducts()
  const categories = Array.from(new Set(productos.map((producto) => producto.categoria).filter(Boolean)))
  const totalStock = productos.reduce((total, producto) => total + (producto.stockTotal ?? 0), 0)

  return (
    <div className="force-light relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f8faff] via-[#f2f4fb] to-[#edf0f7]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(118,131,173,0.25),_transparent_55%)]" />

      <CatalogClient
        initialProducts={productos}
        categories={categories}
        totalStock={totalStock}
      />

      <CartButton />
      <CartDrawer />
    </div>
  )
}
