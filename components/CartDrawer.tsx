"use client"
import React from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerOverlay, DrawerClose } from "@/components/ui/drawer"
import { useCart } from "@/hooks/useCart"
import { Button } from "@/components/ui/button"
import { formatCurrency, createWhatsAppLink } from "@/lib/whatsapp"
import Image from "next/image"

export default function CartDrawer() {
  const { items, total, isCartOpen, closeCart, setItemQty, updateItemQty, removeItem, clearCart } = useCart()
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
    // opcional: limpiar carrito y cerrar
    // clearCart()
    // closeCart()
  }

  return (
    <Drawer open={isCartOpen} onOpenChange={(v: boolean) => (v ? undefined : closeCart())}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Carrito ({items.reduce((s, i) => s + i.qty, 0)} items)</DrawerTitle>
        </DrawerHeader>

        <div className="divide-y">
          {items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Tu carrito está vacío.</div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex items-center gap-4 p-4">
                <div className="w-16 h-16 bg-muted rounded overflow-hidden">
                  {/* si tienes imagen por id puedes mapearla aquí; placeholder */}
                  <Image src="/stockwear-icon.png" alt={item.name} width={64} height={64} />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-muted-foreground">{formatCurrency(item.price)}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => updateItemQty(item.id, -1)}>-</Button>
                    <div className="px-3">{item.qty}</div>
                    <Button size="sm" variant="outline" onClick={() => updateItemQty(item.id, 1)}>+</Button>
                    <Button size="sm" variant="ghost" onClick={() => removeItem(item.id)}>Eliminar</Button>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(item.price * item.qty)}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <DrawerFooter>
          <div className="flex w-full items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="font-semibold">{formatCurrency(total)}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { clearCart(); closeCart(); }}>Vaciar</Button>
              <Button onClick={onSend}>Enviar por WhatsApp</Button>
            </div>
          </div>
        </DrawerFooter>
        <DrawerClose />
      </DrawerContent>
    </Drawer>
  )
}
