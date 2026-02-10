/* Supabase client singleton: initializes client from Vite env vars for use across the app */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env for auth/db.',
  )
}

/** Single Supabase client instance for auth, database, and storage. No queries or tables here. */
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
