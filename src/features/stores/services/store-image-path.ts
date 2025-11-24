const DEFAULT_BUCKET = 'product-images'

export const STORE_IMAGE_BUCKET =
    process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_BUCKET ?? process.env.SUPABASE_PRODUCT_BUCKET ?? DEFAULT_BUCKET

export function resolveStoreLogoPath(
    storeId: number,
    extension: string
): string {
    const now = new Date()
    const safeExt = extension ? extension.replace(/[^a-z0-9]/gi, '').toLowerCase() : 'jpg'

    // Structure: logos/store-[id]/[timestamp].[ext]
    const fileName = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(
        2,
        '0'
    )}-${now.getTime()}.${safeExt}`

    return `logos/store-${storeId}/${fileName}`
}
