import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL) {
  throw new Error('Falta configurar la URL de Supabase (NEXT_PUBLIC_SUPABASE_URL o SUPABASE_URL).')
}

if (!SUPABASE_SERVICE_KEY) {
  throw new Error('Falta configurar SUPABASE_SERVICE_ROLE_KEY para operaciones administrativas.')
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
  },
})
