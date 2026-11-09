import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Supabase-asiakas, jos ympäristömuuttujat on asetettu (julkaisussa aina).
 * Anon-avain on tarkoitettu julkiseksi; data on suojattu rivitason käyttöoikeuksilla (supabase/schema.sql).
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'it-oppi-auth' },
      })
    : null

/** Ilman Supabase-asetuksia sovellus toimii paikallisessa tilassa vain kehityksessä (pnpm dev, testit). */
export const localModeAllowed = import.meta.env.DEV
