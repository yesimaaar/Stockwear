"use client"
import React from "react"
import { useCart } from "@/hooks/useCart"
import { formatCurrency } from "@/lib/whatsapp"
import { Button } from "@/components/ui/button"

export default function CartButton() {
  const { items, total, openCart } = useCart()

  return (
    <div style={{ position: "fixed", right: 16, bottom: 16 }}>
      <Button onClick={openCart} variant="secondary">
        Ver carrito ({items.reduce((s, i) => s + i.qty, 0)} items) — {formatCurrency(total)}
      </Button>
    </div>
  )
}
