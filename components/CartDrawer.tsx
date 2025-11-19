"use client"
import React from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet"
import { useCart } from "@/hooks/useCart"
import { Button } from "@/components/ui/button"
import { formatCurrency, createWhatsAppLink } from "@/lib/whatsapp"
import Image from "next/image"
import { Trash2, ShoppingBag } from "lucide-react"

export default function CartDrawer() {
  const { items, total, isCartOpen, closeCart, updateItemQty, removeItem, clearCart } = useCart()
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ""

  function onSend() {
    if (!phone) {
      alert("Configura NEXT_PUBLIC_WHATSAPP_NUMBER en .env.local")
      return
    }
    if (items.length === 0) {
      alert("El carrito está vacío")
      return
    }
    const url = createWhatsAppLink(items, total, phone)
    window.open(url, "_blank")
  }

  const itemCount = items.reduce((s, i) => s + i.qty, 0)

  return (
    <Sheet open={isCartOpen} onOpenChange={(v) => (v ? undefined : closeCart())}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Tu Carrito ({itemCount})
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-muted-foreground">
              <ShoppingBag className="h-12 w-12 opacity-20" />
              <p>Tu carrito está vacío.</p>
              <Button variant="link" onClick={closeCart}>
                Seguir comprando
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-secondary/20">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-contain p-1"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h4 className="font-medium leading-tight line-clamp-2">{item.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Talla: <span className="font-medium text-foreground">{item.size}</span>
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 rounded-md border bg-background shadow-sm">
                        <button
                          className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground"
                          onClick={() => updateItemQty(item.id, -1)}
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
                        <button
                          className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground"
                          onClick={() => updateItemQty(item.id, 1)}
                        >
                          +
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{formatCurrency(item.price * item.qty)}</span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <SheetFooter className="border-t pt-4 sm:justify-center">
            <div className="flex w-full flex-col gap-4">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="grid gap-2">
                <Button onClick={onSend} className="w-full gap-2" size="lg">
                  Completar pedido por WhatsApp
                </Button>
                <Button variant="outline" onClick={() => { clearCart(); closeCart(); }}>
                  Vaciar carrito
                </Button>
              </div>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
