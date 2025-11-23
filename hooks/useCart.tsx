"use client"
import React, { createContext, useContext, useState, useEffect } from "react"

export type CartItem = {
  id: string // unique identifier (e.g. "123-M")
  productId: number
  name: string
  price: number
  qty: number
  size: string
  image?: string
}

type CartContextValue = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  clearCart: () => void
  total: number
  setItemQty: (id: string, qty: number) => void
  updateItemQty: (id: string, delta: number) => void
  openCart: () => void
  closeCart: () => void
  isCartOpen: boolean
  setStoreScope: (scope: string) => void
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [storeScope, setStoreScope] = useState<string>("")

  // Load cart from localStorage on mount or scope change
  useEffect(() => {
    // If no scope is set, we might want to load a default cart or nothing.
    // For now, let's assume 'default' if empty, or just wait for scope.
    // But existing app uses 'stockwear-cart'. Let's keep backward compatibility for non-scoped usage if needed,
    // or just default to 'global' if empty.
    const key = storeScope ? `stockwear-cart-${storeScope}` : "stockwear-cart"

    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        setItems(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to load cart", e)
        setItems([])
      }
    } else {
      setItems([])
    }
  }, [storeScope])

  // Save cart to localStorage on change
  useEffect(() => {
    const key = storeScope ? `stockwear-cart-${storeScope}` : "stockwear-cart"
    localStorage.setItem(key, JSON.stringify(items))
  }, [items, storeScope])

  function addItem(item: CartItem) {
    setItems(prev => {
      const existing = prev.find(p => p.id === item.id)
      if (existing) {
        return prev.map(p => (p.id === item.id ? { ...p, qty: p.qty + item.qty } : p))
      }
      return [...prev, item]
    })
    setIsCartOpen(true)
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(p => p.id !== id))
  }

  function setItemQty(id: string, qty: number) {
    setItems(prev => prev.map(p => (p.id === id ? { ...p, qty: Math.max(0, qty) } : p)).filter(p => p.qty > 0))
  }

  function updateItemQty(id: string, delta: number) {
    setItems(prev =>
      prev
        .map(p => (p.id === id ? { ...p, qty: Math.max(0, p.qty + delta) } : p))
        .filter(p => p.qty > 0),
    )
  }

  function clearCart() {
    setItems([])
  }

  const total = items.reduce((s, i) => s + i.price * i.qty, 0)

  function openCart() {
    setIsCartOpen(true)
  }

  function closeCart() {
    setIsCartOpen(false)
  }

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, clearCart, total, setItemQty, updateItemQty, openCart, closeCart, isCartOpen, setStoreScope }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used inside CartProvider")
  return ctx
}
