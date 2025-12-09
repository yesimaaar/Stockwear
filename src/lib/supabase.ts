import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ubzabtbearqsbprabqce.supabase.co'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViemFidGJlYXJxc2JwcmFicWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTk1MjIsImV4cCI6MjA3NzkzNTUyMn0.y1fs4e4HfW5UkRy4p8CudP0RitYvGU32kXoNFle3rJI'

if (!supabaseUrl || !supabaseAnonKey) {
  // Not throwing to avoid build-time crashes — will fail at runtime if not configured.
  console.warn('Warning: Supabase environment variables are not set. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
})

/**
 * Clear corrupted auth tokens from localStorage.
 * Call this when you encounter "Invalid Refresh Token" errors.
 */
export function clearCorruptedAuthTokens(): void {
  if (typeof window === 'undefined') return
  
  // Supabase stores auth in these keys
  const keysToCheck = [
    'sb-ubzabtbearqsbprabqce-auth-token',
    'supabase.auth.token',
  ]
  
  keysToCheck.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`🧹 Clearing potentially corrupted auth key: ${key}`)
      localStorage.removeItem(key)
    }
  })
  
  // Also clear any keys that match the Supabase pattern
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('sb-') && key.includes('-auth-token')) {
      console.log(`🧹 Clearing Supabase auth key: ${key}`)
      localStorage.removeItem(key)
    }
  })
}
