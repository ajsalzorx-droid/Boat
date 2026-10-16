import { createClient } from '@supabase/supabase-js'

// Cookie-free anon client for public pages (keeps them static). Every request it makes is
// cached under `tag` with no time limit: the site keeps serving the cached values until the
// SEO Studio's "Confirm & Publish" calls publishSite(), which expires the tags so the next
// visit fetches the latest values from the database.
export function cachedPublicClient(tag: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: 'force-cache', next: { tags: [tag] } }),
    },
  })
}
