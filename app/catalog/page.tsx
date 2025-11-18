import React from "react"
import ProductCard from "@/components/ProductCard"
import CartButton from "@/components/CartButton"
import CartDrawer from "@/components/CartDrawer"
import { ProductoService, type ProductoConStock } from "@/lib/services/producto-service"

export default async function CatalogPage() {
  const productos: ProductoConStock[] = await ProductoService.getAll()

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-6">Catálogo</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {productos.map(p => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      <CartButton />
      <CartDrawer />
    </main>
  )
}
