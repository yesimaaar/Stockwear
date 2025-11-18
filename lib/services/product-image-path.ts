const DEFAULT_BUCKET = 'product-images'

export const PRODUCT_IMAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_BUCKET ?? process.env.SUPABASE_PRODUCT_BUCKET ?? DEFAULT_BUCKET

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function resolveStoragePath(
  options: { productId?: number | null; productCode?: string | null },
  extension: string,
  variant: 'product' | 'reference' = 'product'
): string {
  const now = new Date()
  const safeExt = extension ? extension.replace(/[^a-z0-9]/gi, '').toLowerCase() : 'jpg'
  const folderParts: string[] = ['productos']

  if (options.productId != null) {
    folderParts.push(`id-${options.productId}`)
  } else if (options.productCode) {
    folderParts.push(slugify(options.productCode))
  } else {
    folderParts.push('sin-codigo')
  }

  if (variant === 'reference') {
    folderParts.push('referencias')
  }

  const fileName = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(
    2,
    '0'
  )}-${now.getTime()}.${safeExt}`
  return `${folderParts.join('/')}/${fileName}`
}

export function resolveReferenceStoragePath(
  options: { productId?: number | null; productCode?: string | null },
  extension: string
): string {
  return resolveStoragePath(options, extension, 'reference')
}
