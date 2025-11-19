"use client"
import React from "react"
import { ShoppingCart } from "lucide-react"
import { useCart } from "@/hooks/useCart"
import { formatCurrency } from "@/lib/whatsapp"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function CartButton() {
  const { items, total, openCart } = useCart()
  const itemCount = items.reduce((s, i) => s + i.qty, 0)

  if (itemCount === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <Button
        onClick={openCart}
        size="lg"
        className="h-14 gap-3 rounded-full border border-slate-200 bg-slate-900 px-6 shadow-xl transition-all hover:scale-105 hover:bg-slate-800"
      >
        <div className="relative">
          <ShoppingCart className="h-5 w-5 text-white" />
          <Badge className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[0.65rem] font-bold text-white">
            {itemCount}
          </Badge>
        </div>
        <div className="flex flex-col items-start text-xs text-white">
          <span className="font-medium text-slate-300">Total</span>
          <span className="font-bold text-base leading-none">{formatCurrency(total)}</span>
        </div>
      </Button>
    </div>
  )
}
