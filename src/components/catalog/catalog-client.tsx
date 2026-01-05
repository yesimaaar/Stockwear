"use client"

import React, { useState, useMemo, useEffect } from "react"
import { Search, ShoppingBag, Sparkles, Filter, X } from "lucide-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import ProductCard from "@/features/productos/components/ProductCard"
import type { ProductoConStock } from "@/features/productos/services/producto-service"
import { useCart } from "@/hooks/useCart"
import { formatCurrency } from "@/lib/whatsapp"
import { PRODUCT_COLORS } from "@/lib/colors"

interface CatalogClientProps {
    initialProducts: ProductoConStock[]
    categories: string[]
    totalStock: number
    storeName?: string
    storeLogoUrl?: string | null
    storeSlug?: string
}

interface FilterContentProps {
    categories: string[]
    selectedCategory: string | null
    setSelectedCategory: (c: string | null) => void
    allColors: string[]
    selectedColors: string[]
    setSelectedColors: React.Dispatch<React.SetStateAction<string[]>>
    allSizes: string[]
    selectedSizes: string[]
    setSelectedSizes: React.Dispatch<React.SetStateAction<string[]>>
    priceRange: [number, number]
    setPriceRange: (val: [number, number]) => void
    minPrice: number
    maxPrice: number
    allBrands: string[]
    selectedBrands: string[]
    setSelectedBrands: React.Dispatch<React.SetStateAction<string[]>>
    hasActiveFilters: boolean
    clearFilters: () => void
}

function FilterContent({
    categories,
    selectedCategory,
    setSelectedCategory,
    allColors,
    selectedColors,
    setSelectedColors,
    allSizes,
    selectedSizes,
    setSelectedSizes,
    priceRange,
    setPriceRange,
    minPrice,
    maxPrice,
    allBrands,
    selectedBrands,
    setSelectedBrands,
    hasActiveFilters,
    clearFilters
}: FilterContentProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Filter className="h-4 w-4" /> Filtros
                </h3>
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                        <X className="h-3 w-3" /> Limpiar
                    </button>
                )}
            </div>

            <Separator />

            <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Categorías</h4>
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
                        <p className="text-xs text-muted-foreground">Sin categorías.</p>
                    )}
                </div>
            </div>

            <Separator />

            <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Colores</h4>
                <div className="flex flex-wrap gap-2">
                    {allColors.length > 0 ? (
                        allColors.map((colorName) => {
                            const colorDef = PRODUCT_COLORS.find(c => c.name === colorName)
                            const isSelected = selectedColors.includes(colorName)
                            if (!colorDef) return null
                            
                            return (
                                <div 
                                    key={colorName}
                                    className={`cursor-pointer rounded-full p-0.5 border-2 transition-all ${isSelected ? 'border-primary scale-110' : 'border-transparent hover:scale-105'}`}
                                    onClick={() => {
                                        setSelectedColors(prev => 
                                            isSelected ? prev.filter(c => c !== colorName) : [...prev, colorName]
                                        )
                                    }}
                                    title={colorName}
                                >
                                    <div className={`h-6 w-6 rounded-full border border-border/20 shadow-sm ${colorDef.class}`} />
                                </div>
                            )
                        })
                    ) : (
                        <p className="text-xs text-muted-foreground">Sin colores.</p>
                    )}
                </div>
            </div>

            <Separator />

            <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Tallas</h4>
                <div className="flex flex-wrap gap-2">
                    {allSizes.length > 0 ? (
                        allSizes.map((talla) => {
                            const isSelected = selectedSizes.includes(talla)
                            return (
                                <Badge
                                    key={talla}
                                    variant={isSelected ? "secondary" : "outline"}
                                    className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs transition
                                        ${isSelected
                                            ? "bg-slate-800 text-white border-slate-800 hover:bg-slate-700"
                                            : "bg-card text-muted-foreground border-border hover:border-ring hover:bg-accent"
                                        }`}
                                    onClick={() => {
                                        setSelectedSizes(prev => 
                                            isSelected ? prev.filter(s => s !== talla) : [...prev, talla]
                                        )
                                    }}
                                >
                                    {talla}
                                </Badge>
                            )
                        })
                    ) : (
                        <p className="text-xs text-muted-foreground">Sin tallas.</p>
                    )}
                </div>
            </div>

            <Separator />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-muted-foreground">Precio</h4>
                    <span className="text-xs font-medium text-foreground">
                        {formatCurrency(priceRange[0])} - {formatCurrency(priceRange[1])}
                    </span>
                </div>
                <Slider
                    defaultValue={[minPrice, maxPrice]}
                    value={[priceRange[0], priceRange[1]]}
                    min={minPrice}
                    max={maxPrice}
                    step={100}
                    onValueChange={(val) => setPriceRange([val[0], val[1]])}
                    className="py-4"
                />
            </div>

            <Separator />

            <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Marcas</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border">
                    {allBrands.length > 0 ? (
                        allBrands.map((brand) => (
                            <div key={brand} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`brand-${brand}`} 
                                    checked={selectedBrands.includes(brand)}
                                    onCheckedChange={(checked) => {
                                        setSelectedBrands(prev => 
                                            checked ? [...prev, brand] : prev.filter(b => b !== brand)
                                        )
                                    }}
                                />
                                <Label 
                                    htmlFor={`brand-${brand}`}
                                    className="text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {brand}
                                </Label>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-muted-foreground">Sin marcas.</p>
                    )}
                </div>
            </div>
        </div>
    )
}

export function CatalogClient({ initialProducts, categories, totalStock, storeName, storeLogoUrl, storeSlug }: CatalogClientProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [selectedColors, setSelectedColors] = useState<string[]>([])
    const [selectedSizes, setSelectedSizes] = useState<string[]>([])
    const [selectedBrands, setSelectedBrands] = useState<string[]>([])
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000])

    const { setStoreScope } = useCart()

    useEffect(() => {
        if (storeSlug) {
            setStoreScope(storeSlug)
        }
    }, [storeSlug, setStoreScope])

    const { allSizes, allBrands, allColors, minPrice, maxPrice } = useMemo(() => {
        const sizes = new Set<string>()
        const brands = new Set<string>()
        const colors = new Set<string>()
        let min = Infinity
        let max = -Infinity

        if (initialProducts.length === 0) return { allSizes: [], allBrands: [], allColors: [], minPrice: 0, maxPrice: 1000 }

        initialProducts.forEach(p => {
            p.stockPorTalla.forEach(s => {
                if (s.talla && s.talla !== 'none') sizes.add(s.talla)
            })
            if (p.marca) brands.add(p.marca)
            if (p.color) colors.add(p.color)
            if (p.precio < min) min = p.precio
            if (p.precio > max) max = p.precio
        })

        return {
            allSizes: Array.from(sizes).sort((a, b) => {
                const numA = parseFloat(a)
                const numB = parseFloat(b)
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB
                return a.localeCompare(b)
            }),
            allBrands: Array.from(brands).sort(),
            allColors: Array.from(colors).sort(),
            minPrice: min === Infinity ? 0 : min,
            maxPrice: max === -Infinity ? 1000 : max
        }
    }, [initialProducts])

    useEffect(() => {
        setPriceRange([minPrice, maxPrice])
    }, [minPrice, maxPrice])

    const filteredProducts = useMemo(() => {
        return initialProducts.filter((product) => {
            const matchesSearch =
                (product.nombre?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                (product.codigo?.toLowerCase() || "").includes(searchQuery.toLowerCase())

            const matchesCategory = selectedCategory
                ? product.categoria === selectedCategory
                : true

            const matchesPrice = product.precio >= priceRange[0] && product.precio <= priceRange[1]
            
            const matchesSize = selectedSizes.length === 0 || product.stockPorTalla.some(s => selectedSizes.includes(s.talla))
            
            const matchesBrand = selectedBrands.length === 0 || (product.marca && selectedBrands.includes(product.marca))

            const matchesColor = selectedColors.length === 0 || (product.color && selectedColors.includes(product.color))

            return matchesSearch && matchesCategory && matchesPrice && matchesSize && matchesBrand && matchesColor
        })
    }, [initialProducts, searchQuery, selectedCategory, priceRange, selectedSizes, selectedBrands, selectedColors])

    const numberFormatter = new Intl.NumberFormat("es-MX")
    const displayName = storeName ?? "StockWear"
    const logoSrc = storeLogoUrl && storeLogoUrl.length > 0 ? storeLogoUrl : "/stockwear-icon.png"

    const clearFilters = () => {
        setSearchQuery("")
        setSelectedCategory(null)
        setSelectedSizes([])
        setSelectedBrands([])
        setSelectedColors([])
        setPriceRange([minPrice, maxPrice])
    }

    const hasActiveFilters = searchQuery || selectedCategory || selectedSizes.length > 0 || selectedBrands.length > 0 || selectedColors.length > 0 || priceRange[0] > minPrice || priceRange[1] < maxPrice

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
                            <p className="text-sm text-muted-foreground">Catalog by Stockwear</p>
                        </div>
                    </div>

                    <div className="relative w-full max-w-md flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por código o nombre..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-11 rounded-full border-border bg-card pl-10 shadow-sm focus-visible:ring-ring"
                            />
                        </div>

                        {/* Mobile Filter Trigger */}
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-full lg:hidden">
                                    <Filter className="h-4 w-4" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[300px] sm:w-[400px] overflow-y-auto">
                                <SheetHeader className="mb-4">
                                    <SheetTitle>Filtros</SheetTitle>
                                </SheetHeader>
                                <FilterContent
                                    categories={categories}
                                    selectedCategory={selectedCategory}
                                    setSelectedCategory={setSelectedCategory}
                                    allColors={allColors}
                                    selectedColors={selectedColors}
                                    setSelectedColors={setSelectedColors}
                                    allSizes={allSizes}
                                    selectedSizes={selectedSizes}
                                    setSelectedSizes={setSelectedSizes}
                                    priceRange={priceRange}
                                    setPriceRange={setPriceRange}
                                    minPrice={minPrice}
                                    maxPrice={maxPrice}
                                    allBrands={allBrands}
                                    selectedBrands={selectedBrands}
                                    setSelectedBrands={setSelectedBrands}
                                    hasActiveFilters={hasActiveFilters}
                                    clearFilters={clearFilters}
                                />
                            </SheetContent>
                        </Sheet>
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

            <section className="grid gap-8 lg:grid-cols-[260px_1fr]">
                <aside className="hidden h-fit space-y-6 lg:sticky lg:top-8 lg:block">
                    <div className="rounded-2xl border border-border/60 bg-card/50 p-5 shadow-sm backdrop-blur-md space-y-6">
                        <FilterContent
                            categories={categories}
                            selectedCategory={selectedCategory}
                            setSelectedCategory={setSelectedCategory}
                            allColors={allColors}
                            selectedColors={selectedColors}
                            setSelectedColors={setSelectedColors}
                            allSizes={allSizes}
                            selectedSizes={selectedSizes}
                            setSelectedSizes={setSelectedSizes}
                            priceRange={priceRange}
                            setPriceRange={setPriceRange}
                            minPrice={minPrice}
                            maxPrice={maxPrice}
                            allBrands={allBrands}
                            selectedBrands={selectedBrands}
                            setSelectedBrands={setSelectedBrands}
                            hasActiveFilters={!!hasActiveFilters}
                            clearFilters={clearFilters}
                        />
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
                            {(hasActiveFilters) && (
                                <button
                                    onClick={clearFilters}
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
