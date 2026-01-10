import { notFound } from "next/navigation"
import CartButton from "@/features/ventas/components/CartButton"
import CartDrawer from "@/features/ventas/components/CartDrawer"
import { CatalogClient } from "@/components/catalog/catalog-client"
import { AdPopup } from "@/components/catalog/ad-popup"
import { AdBanner } from "@/components/catalog/ad-banner"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  mapProductoRow,
  PRODUCTO_SELECT,
  type ProductoConStock,
  type ProductoRow,
} from "@/features/productos/services/producto-service"

export const revalidate = 60

type StoreRecord = {
  id: number
  nombre: string
  slug: string
  logo_url: string | null
  whatsapp: string | null
  facebook: string | null
  instagram: string | null
}

async function getStoreBySlug(slug: string): Promise<StoreRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("tiendas")
    .select("id,nombre,slug,logo_url,whatsapp,facebook,instagram")
    .eq("slug", slug)
    .maybeSingle()

  if (error) {
    console.error("No se pudo cargar la tienda pública", error)
    return null
  }

  return (data as StoreRecord | null) ?? null
}

async function getCatalogProducts(storeId: number): Promise<ProductoConStock[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("productos")
      .select(PRODUCTO_SELECT)
      .eq("estado", "activo")
      .eq("tienda_id", storeId)
      .order("createdAt", { ascending: false })

    if (error) {
      console.error("Error al cargar el catálogo público", error)
      return []
    }

    if (!data) {
      return []
    }

    return (data as ProductoRow[]).map(mapProductoRow)
  } catch (error) {
    console.error("Error inesperado al cargar el catálogo público", error)
    return []
  }
}

interface CatalogPageProps {
  params: Promise<{ slug: string }>
}

export default async function CatalogPage({ params }: CatalogPageProps) {
  const { slug } = await params
  const store = await getStoreBySlug(slug)
  if (!store) {
    notFound()
  }

  const productos = await getCatalogProducts(store.id)
  const categories = Array.from(new Set(productos.map((producto) => producto.categoria).filter(Boolean)))
  const totalStock = productos.reduce((total, producto) => total + (producto.stockTotal ?? 0), 0)

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f8faff] via-[#f2f4fb] to-[#edf0f7] dark:from-background dark:via-background dark:to-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(118,131,173,0.25),_transparent_55%)]" />

      <CatalogClient
        initialProducts={productos}
        categories={categories}
        totalStock={totalStock}
        storeName={store.nombre}
        storeLogoUrl={store.logo_url}
        storeSlug={store.slug}
        facebook={store.facebook ?? undefined}
        instagram={store.instagram ?? undefined}
      />

      <CartButton />
      <CartDrawer whatsappNumber={store.whatsapp} />

      {/* Google AdSense Ads */}
      <AdPopup 
        adSlot="1234567890"  // Reemplaza con tu slot de AdSense
        delay={1500}
      />
      <AdBanner 
        adSlot="0987654321"  // Reemplaza con tu slot de AdSense
        dismissible={true}
      />
    </div>
  )
}
