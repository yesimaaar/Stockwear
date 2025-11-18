"use client"
import React from "react"
import Image from "next/image"
import { useCart, type CartItem } from "@/hooks/useCart"
import { formatCurrency } from "@/lib/whatsapp"
import { Card, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { ProductoConStock } from "@/lib/services/producto-service"

export default function ProductCard({ product }: { product: ProductoConStock }) {
  const { addItem } = useCart()

  function onAdd() {
    const item: CartItem = { id: String(product.id), name: product.nombre, price: product.precio, qty: 1 }
    addItem(item)
  }

  return (
    <Card className="h-full">
      {product.imagen ? (
        <div className="w-full h-40 relative overflow-hidden rounded-t-md">
          <Image src={product.imagen} alt={product.nombre} fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
        </div>
      ) : null}
      <CardContent>
        <CardTitle>{product.nombre}</CardTitle>
        <CardDescription>{formatCurrency(product.precio)}</CardDescription>
      </CardContent>
      <CardFooter>
        <Button onClick={onAdd}>Agregar</Button>
      </CardFooter>
    </Card>
  )
}
