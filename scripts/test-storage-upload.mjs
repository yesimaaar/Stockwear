import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!url || !serviceKey) {
  console.error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const path = `diagnostic/test-${timestamp}.txt`

const { data, error } = await supabase.storage
  .from(process.env.SUPABASE_PRODUCT_BUCKET || 'product-images')
  .upload(path, 'diagnostic upload', {
    contentType: 'text/plain',
    cacheControl: '60',
  })

console.log('path:', path)
console.log('data:', data)
console.log('error:', error)
