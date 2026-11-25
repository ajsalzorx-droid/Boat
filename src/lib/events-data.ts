import 'server-only'
import { safeCache } from '@/lib/safe-cache'
import { getDb, toPlain } from '@/lib/mongodb'
import { EVENTS_TAG, isEventImage, type SiteEvent } from '@/lib/events'

// Events shown on the website (events collection, edited in Admin -> Events). Cached under the
// "events" tag; saving, hiding or deleting an event calls updateTag('events'). Hidden events are
// never read here, so they can't reach the site, the sitemap or Google.

export function toEvent(doc: Record<string, unknown>): SiteEvent {
  const d = toPlain(doc as never) as unknown as Partial<SiteEvent> & { id: string }
  const photos = Array.isArray(d.photos) ? d.photos : []
  return {
    id: d.id,
    slug: d.slug ?? '',
    title: d.title ?? '',
    tag: d.tag ?? '',
    event_date: d.event_date ?? '',
    description: d.description ?? '',
    body: d.body ?? '',
    seo_title: d.seo_title ?? '',
    cover_image: d.cover_image && isEventImage(d.cover_image) ? d.cover_image : '',
    cover_alt: d.cover_alt ?? '',
    photos: photos.filter((p) => p?.src && isEventImage(p.src)).map((p) => ({ src: p.src, alt: p.alt ?? '' })),
    is_active: !!d.is_active,
    old_slugs: Array.isArray(d.old_slugs) ? d.old_slugs : [],
    created_at: d.created_at ?? new Date(0).toISOString(),
    updated_at: d.updated_at ?? d.created_at ?? new Date(0).toISOString(),
  }
}

// Newest first: by the event's date, or the day it was added when it has none
const sortKey = (e: SiteEvent) => e.event_date || e.created_at.slice(0, 10)
export const newestFirst = (a: SiteEvent, b: SiteEvent) =>
  sortKey(b).localeCompare(sortKey(a)) || b.created_at.localeCompare(a.created_at)

export const getEvents = safeCache(
  async (): Promise<SiteEvent[]> => {
    const db = await getDb()
    const docs = await db.collection('events').find({ is_active: true }).toArray()
    return docs.map(toEvent).filter((e) => e.slug && e.cover_image).sort(newestFirst)
  },
  () => [],
  ['events'],
  { tags: [EVENTS_TAG] },
  'events',
)

// The event at this address, or the event that used to be there (the page then redirects)
export async function findEvent(slug: string): Promise<{ event: SiteEvent; redirect: boolean } | null> {
  const events = await getEvents()
  const event = events.find((e) => e.slug === slug)
  if (event) return { event, redirect: false }
  const moved = events.find((e) => e.old_slugs.includes(slug))
  return moved ? { event: moved, redirect: true } : null
}
