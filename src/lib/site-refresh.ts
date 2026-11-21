import 'server-only'
import { updateTag } from 'next/cache'
import { schedulePurge } from '@/lib/cdn-purge'

// After a staff change that the website shows: expire the server caches for these tags (pages
// rebuild on the next visit) and purge the Hostinger CDN. Server Actions only (updateTag).
export function refreshSite(...tags: string[]) {
  for (const tag of tags) updateTag(tag)
  schedulePurge()
}
