import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Server-only client with the service_role key: bypasses RLS, so it must only be used
// AFTER verifyAdmin() has passed. The key has no NEXT_PUBLIC_ prefix, so Next.js never
// ships it to the browser. Returns null when the key isn't configured.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
