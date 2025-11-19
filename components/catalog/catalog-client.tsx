"use client"

import React, { useState, useMemo } from "react"
import { Search, ShoppingBag, Sparkles } from "lucide-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import ProductCard from "@/components/ProductCard"
import type { ProductoConStock } from "@/lib/services/producto-service"

interface CatalogClientProps {
    initialProducts: ProductoConStock[]
    categories: string[]
    totalStock: number
    storeName?: string
    storeLogoUrl?: string | null
}

export function CatalogClient({ initialProducts, categories, totalStock, storeName, storeLogoUrl }: CatalogClientProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

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
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <Image src={logoSrc} alt={displayName} width={48} height={48} className="h-full w-full object-cover" priority />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{displayName}</h1>
                            <p className="text-sm text-slate-500">Catálogo en tiempo real</p>
                        </div>
                    </div>

                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Buscar por código o nombre..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-11 rounded-full border-slate-200 bg-white pl-10 shadow-sm focus-visible:ring-slate-400"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Badge
                            variant="secondary"
                            className="rounded-full border border-slate-100 bg-white px-3 py-1 text-slate-700 shadow-sm"
                        >
                            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
                            Actualizado ahora
                        </Badge>
                        <Badge variant="outline" className="rounded-full border-slate-200 bg-white/50 px-3 py-1 text-slate-600">
                            {numberFormatter.format(initialProducts.length)} modelos
                        </Badge>
                    </div>
                </div>
            </header>

            <section className="grid gap-8 lg:grid-cols-[240px_1fr]">
                <aside className="h-fit space-y-6 lg:sticky lg:top-8">
                    <div className="rounded-2xl border border-white/60 bg-white/50 p-5 shadow-sm backdrop-blur-md">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-slate-900">Categorías</h3>
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
                                                ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
                                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
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

                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                                <ShoppingBag className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-700">Inventario total</p>
                                <p className="text-xs text-slate-500">{numberFormatter.format(totalStock)} pares</p>
                            </div>
                        </div>
                    </div>
                </aside>

                <div id="catalogo" className="space-y-6">
                    {filteredProducts.length === 0 ? (
                        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                                <ShoppingBag className="h-8 w-8 text-slate-300" />
                            </div>
                            <h3 className="mt-4 text-lg font-medium text-slate-900">No se encontraron productos</h3>
                            <p className="mt-2 max-w-sm text-sm text-slate-500">
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
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
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
