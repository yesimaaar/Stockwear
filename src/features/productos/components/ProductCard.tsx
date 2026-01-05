import React, { useState } from "react"
import Image from "next/image"
import { Package } from "lucide-react"
import { useCart, type CartItem } from "@/hooks/useCart"
import { formatCurrency } from "@/lib/whatsapp"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ProductoConStock } from "@/features/productos/services/producto-service"

export default function ProductCard({ product }: { product: ProductoConStock }) {
  const { addItem } = useCart()

  // Group stock by size
  const stockBySize = React.useMemo(() => {
    const map = new Map<string, { total: number; warehouses: { name: string; qty: number }[] }>()

    product.stockPorTalla.forEach((item) => {
      if (!item.talla) return
      const current = map.get(item.talla) || { total: 0, warehouses: [] }

      current.total += item.cantidad
      if (item.cantidad > 0) {
        current.warehouses.push({ name: item.almacen || "Almacén", qty: item.cantidad })
      }

      map.set(item.talla, current)
    })

    return Array.from(map.entries()).sort((a, b) => {
      const numA = parseFloat(a[0])
      const numB = parseFloat(b[0])
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB
      return a[0].localeCompare(b[0])
    })
  }, [product.stockPorTalla])

  function onAdd(size: string) {
    const item: CartItem = {
      id: `${product.id}-${size}`,
      productId: product.id,
      name: product.nombre,
      price: product.precio,
      qty: 1,
      size: size,
      image: product.imagen || undefined
    }
    addItem(item)
  }

  const hasStock = stockBySize.length > 0

  return (
    <div className="group flex flex-col h-full gap-2 sm:gap-3 rounded-2xl border border-border/60 bg-background/80 p-3 sm:p-4 shadow-sm transition-all hover:border-border hover:shadow-md">
      <div className="relative w-full h-32 sm:h-56 overflow-hidden rounded-xl border border-border/40 bg-card">
        {product.imagen ? (
          <Image
            src={product.imagen}
            alt={product.nombre ?? product.codigo ?? "Producto"}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(min-width: 1280px) 240px, (min-width: 768px) 220px, 160px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package className="h-8 w-8" />
          </div>
        )}
        {product.stockTotal <= 5 && product.stockTotal > 0 && (
          <div className="absolute bottom-2 right-2 rounded-full bg-red-500/90 px-2 py-0.5 text-[0.65rem] font-bold text-white backdrop-blur-sm">
            ¡Últimos!
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-2 sm:gap-3">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm sm:text-base font-semibold text-foreground line-clamp-2 leading-tight" title={product.nombre ?? product.codigo ?? "Producto"}>
              {product.nombre ?? product.codigo ?? "Producto"}
            </p>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">{product.categoria || "General"}</p>
        </div>

        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-end justify-between gap-2">
            <p className="text-base sm:text-lg font-bold text-foreground">{formatCurrency(product.precio ?? 0)}</p>
          </div>

          <div className="min-h-[36px] sm:min-h-[44px]">
            {hasStock ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 sm:gap-1.5">
                {stockBySize.map(([size, data]) => (
                  <Button
                    key={size}
                    variant="outline"
                    size="sm"
                    disabled={data.total <= 0}
                    className={cn(
                      "h-8 sm:h-9 w-full p-0 text-[10px] sm:text-xs font-medium",
                      data.total > 0
                        ? "hover:border-primary hover:bg-primary hover:text-primary-foreground"
                        : "opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
                    )}
                    onClick={() => onAdd(size)}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            ) : (
              <Button
                className="w-full h-8 sm:h-9 rounded-xl font-medium shadow-sm text-[10px] sm:text-xs"
                variant="secondary"
                disabled
              >
                Agotado
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
