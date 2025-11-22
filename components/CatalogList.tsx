"use client"
import React, { useEffect, useState } from "react"
import ProductCard from "@/components/ProductCard"
import type { ProductoConStock } from "@/lib/services/producto-service"
import { ProductoService } from "@/lib/services/producto-service"

export default function CatalogList() {
  const [productos, setProductos] = useState<ProductoConStock[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const data = await ProductoService.getAll()
        if (mounted) setProductos(data)
      } catch (err) {
        console.error(err)
        if (mounted) setError('Error cargando productos')
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (error) return <div className="p-6 text-destructive">{error}</div>
  if (productos === null) return <div className="p-6">Cargando catálogo...</div>
  if (productos.length === 0) return <div className="p-6">No hay productos disponibles.</div>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {productos.map(p => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
