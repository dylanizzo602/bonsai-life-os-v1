/* Supabase client singleton: initializes client from Vite env vars for use across the app */
import { createClient } from '@supabase/supabase-js'

/* Env: read and trim so no accidental spaces from .env break the client */
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase env vars missing. Create a .env file in the project root (same folder as package.json) with:\n' +
      '  VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
      '  VITE_SUPABASE_ANON_KEY=your-anon-key\n' +
      'Copy from .env.example then restart the dev server (npm run dev).',
  )
}

/** Single Supabase client instance for auth, database, and storage. No queries or tables here. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
