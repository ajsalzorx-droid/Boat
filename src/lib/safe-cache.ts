import 'server-only'
import { unstable_cache } from 'next/cache'

// unstable_cache, except that a failed read is never cached. The read throws when the database
// can't be reached; this request then gets the fallback (built-in text, empty list), and the next
// one tries the database again. Without this, a database hiccup (or a build without database
// access) would keep the fallback cached until the next publish.
export function safeCache<T>(
  read: () => Promise<T>,
  fallback: () => T,
  keyParts: string[],
  options: { tags: string[]; revalidate?: number },
  label: string,
): () => Promise<T> {
  const cached = unstable_cache(read, keyParts, options)
  return async () => {
    try {
      return await cached()
    } catch (e) {
      console.error(`Error fetching ${label}:`, e)
      return fallback()
    }
  }
}
