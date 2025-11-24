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
        className="h-16 gap-4 rounded-full border border-white/10 bg-[#0f172a] pl-5 pr-8 shadow-2xl transition-all hover:scale-105 hover:bg-[#1e293b] hover:shadow-amber-500/10"
      >
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
          <ShoppingCart className="h-5 w-5 text-white" />
          <Badge className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[0.65rem] font-bold text-white ring-2 ring-[#0f172a]">
            {itemCount}
          </Badge>
        </div>
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Total</span>
          <span className="font-bold text-lg leading-none text-white tracking-tight">{formatCurrency(total)}</span>
        </div>
      </Button>
    </div>
  )
}
