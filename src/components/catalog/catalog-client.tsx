"use client"

import React, { useState, useMemo, useEffect } from "react"
import { Search, ShoppingBag, Sparkles } from "lucide-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import ProductCard from "@/features/productos/components/ProductCard"
import type { ProductoConStock } from "@/features/productos/services/producto-service"
import { useCart } from "@/hooks/useCart"

interface CatalogClientProps {
    initialProducts: ProductoConStock[]
    categories: string[]
    totalStock: number
    storeName?: string
    storeLogoUrl?: string | null
    storeSlug?: string
}

export function CatalogClient({ initialProducts, categories, totalStock, storeName, storeLogoUrl, storeSlug }: CatalogClientProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

    const { setStoreScope } = useCart()

    useEffect(() => {
        if (storeSlug) {
            setStoreScope(storeSlug)
        }
    }, [storeSlug, setStoreScope])

    const filteredProducts = useMemo(() => {
        return initialProducts.filter((product) => {
            const matchesSearch =
                (product.nombre?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                (product.codigo?.toLowerCase() || "").includes(searchQuery.toLowerCase())

            const matchesCategory = selectedCategory
                ? product.categoria === selectedCategory
                : true

            return matchesSearch && matchesCategory
        })
    }, [initialProducts, searchQuery, selectedCategory])

    const numberFormatter = new Intl.NumberFormat("es-MX")
    const displayName = storeName ?? "StockWear"
    const logoSrc = storeLogoUrl && storeLogoUrl.length > 0 ? storeLogoUrl : "/stockwear-icon.png"

    return (
        <main className="relative mx-auto flex w-full max-w-7xl flex-col px-4 py-8 lg:px-8">
            <header className="mb-8 flex flex-col gap-6">
                <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                            <Image src={logoSrc} alt={displayName} width={48} height={48} className="h-full w-full object-cover" priority />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
                            <p className="text-sm text-muted-foreground">By Stockwear</p>
                        </div>
                    </div>

                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por código o nombre..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-11 rounded-full border-border bg-card pl-10 shadow-sm focus-visible:ring-ring"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Badge
                            variant="secondary"
                            className="rounded-full border border-border bg-card px-3 py-1 text-foreground shadow-sm"
                        >
                            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
                            Actualizado ahora
                        </Badge>
                        <Badge variant="outline" className="rounded-full border-border bg-card/50 px-3 py-1 text-muted-foreground">
                            {numberFormatter.format(initialProducts.length)} modelos
                        </Badge>
                    </div>
                </div>
            </header>

            <section className="grid gap-8 lg:grid-cols-[240px_1fr]">
                <aside className="h-fit space-y-6 lg:sticky lg:top-8">
                    <div className="rounded-2xl border border-border/60 bg-card/50 p-5 shadow-sm backdrop-blur-md">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-foreground">Categorías</h3>
                            {selectedCategory && (
                                <button
                                    onClick={() => setSelectedCategory(null)}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {categories.length > 0 ? (
                                categories.map((categoria) => (
                                    <Badge
                                        key={categoria}
                                        variant={selectedCategory === categoria ? "secondary" : "outline"}
                                        className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition 
                      ${selectedCategory === categoria
                                                ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                                                : "bg-card text-muted-foreground border-border hover:border-ring hover:bg-accent"
                                            }`}
                                        onClick={() => setSelectedCategory(selectedCategory === categoria ? null : categoria)}
                                    >
                                        {categoria}
                                    </Badge>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500">Sin categorías.</p>
                            )}
                        </div>
                    </div>


                </aside>

                <div id="catalogo" className="space-y-6">
                    {filteredProducts.length === 0 ? (
                        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="mt-4 text-lg font-medium text-foreground">No se encontraron productos</h3>
                            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                                Intenta ajustar tu búsqueda o los filtros seleccionados.
                            </p>
                            {(searchQuery || selectedCategory) && (
                                <button
                                    onClick={() => {
                                        setSearchQuery("")
                                        setSelectedCategory(null)
                                    }}
                                    className="mt-4 text-sm font-medium text-blue-600 hover:underline"
                                >
                                    Limpiar filtros
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
                            {filteredProducts.map((producto) => (
                                <ProductCard key={producto.id} product={producto} />
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </main>
    )
}
