"use client"
import React, { useState } from "react"
import Image from "next/image"
import { Package, Check, ChevronsUpDown } from "lucide-react"
import { useCart, type CartItem } from "@/hooks/useCart"
import { formatCurrency } from "@/lib/whatsapp"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { ProductoConStock } from "@/lib/services/producto-service"

export default function ProductCard({ product }: { product: ProductoConStock }) {
  const { addItem } = useCart()
  const [selectedSize, setSelectedSize] = useState<string>("")
  const [open, setOpen] = useState(false)

  // Group stock by size
  const stockBySize = React.useMemo(() => {
    const map = new Map<string, { total: number; warehouses: { name: string; qty: number }[] }>()

    product.stockPorTalla.forEach((item) => {
      if (!item.talla) return
      const current = map.get(item.talla) || { total: 0, warehouses: [] }

      if (item.cantidad > 0) {
        current.total += item.cantidad
        current.warehouses.push({ name: item.almacen || "Almacén", qty: item.cantidad })
      }

      if (current.total > 0) {
        map.set(item.talla, current)
      }
    })

    return Array.from(map.entries()).sort((a, b) => {
      const numA = parseFloat(a[0])
      const numB = parseFloat(b[0])
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB
      return a[0].localeCompare(b[0])
    })
  }, [product.stockPorTalla])

  function onAdd() {
    if (!selectedSize) return

    const item: CartItem = {
      id: `${product.id}-${selectedSize}`,
      productId: product.id,
      name: product.nombre,
      price: product.precio,
      qty: 1,
      size: selectedSize,
      image: product.imagen || undefined
    }
    addItem(item)
    setSelectedSize("") // Reset selection after adding
  }

  return (
    <div className="group flex h-full flex-col gap-3 rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm transition-all hover:border-border hover:shadow-md">
      <div className="relative h-56 w-full overflow-hidden rounded-xl border border-border/40 bg-white">
        {product.imagen ? (
          <Image
            src={product.imagen}
            alt={product.nombre ?? product.codigo ?? "Producto"}
            fill
            className="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
            sizes="(min-width: 1280px) 240px, (min-width: 768px) 220px, 200px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package className="h-8 w-8" />
          </div>
        )}
        {product.stockTotal <= 5 && product.stockTotal > 0 && (
          <div className="absolute bottom-2 right-2 rounded-full bg-red-500/90 px-2 py-0.5 text-[0.65rem] font-bold text-white backdrop-blur-sm">
            ¡Últimos pares!
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-base font-semibold text-foreground line-clamp-2 leading-tight" title={product.nombre ?? product.codigo ?? "Producto"}>
              {product.nombre ?? product.codigo ?? "Producto"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">{product.categoria || "General"}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-end justify-between gap-2">
            <p className="text-lg font-bold text-foreground">{formatCurrency(product.precio ?? 0)}</p>
          </div>

          <div className="grid gap-2">
            {stockBySize.length > 0 ? (
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                  >
                    {selectedSize
                      ? `Talla ${selectedSize}`
                      : "Seleccionar talla..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar talla..." />
                    <CommandList>
                      <CommandEmpty>Sin stock.</CommandEmpty>
                      <CommandGroup>
                        {stockBySize.map(([size, details]) => (
                          <CommandItem
                            key={size}
                            value={size}
                            onSelect={(currentValue) => {
                              setSelectedSize(currentValue === selectedSize ? "" : currentValue)
                              setOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedSize === size ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-1 justify-between items-center">
                              <span>Talla {size}</span>
                              <span className="text-xs text-muted-foreground">({details.total})</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : (
              <Button variant="outline" disabled className="w-full opacity-50">
                Agotado
              </Button>
            )}

            <Button
              onClick={onAdd}
              className="w-full rounded-xl font-medium shadow-sm transition-all active:scale-[0.98]"
              variant="default"
              disabled={!selectedSize || product.stockTotal === 0}
            >
              {product.stockTotal === 0 ? "Sin stock" : "Agregar al carrito"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
