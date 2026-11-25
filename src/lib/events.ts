// Photo events (Admin -> Events): an event with its story and photos. Listed on /events, each with
// its own page at /events/<slug>. Safe in client components; the cached database reads are in
// src/lib/events-data.ts.

export const EVENTS_TAG = 'events'

export type EventPhoto = { src: string; alt: string }

export type SiteEvent = {
  id: string
  slug: string
  title: string
  tag: string // small badge, e.g. "Kids"
  event_date: string // "2026-11-25" (Dubai) or "" = no date shown
  description: string // summary on the card, and the Google description
  body: string // the story; a blank line starts a new paragraph
  seo_title: string // Google title; empty = "<title> | Boat Seafood Dubai"
  cover_image: string
  cover_alt: string
  photos: EventPhoto[]
  is_active: boolean
  old_slugs: string[] // earlier addresses: they redirect here
  created_at: string
  updated_at: string
}

export type SiteEventInput = Omit<SiteEvent, 'id' | 'old_slugs' | 'created_at' | 'updated_at'>

// What an event's card on /events needs (the story and the photos stay on the server)
export type EventCard = {
  id: string
  slug: string
  title: string
  tag: string
  date: string // "2026-11-25" or ""
  dateText: string // "25 November 2026" or ""
  description: string
  cover: EventPhoto
  photoCount: number
}

export const EVENT_LIMITS = {
  title: 100,
  slug: 80,
  tag: 30,
  description: 320,
  body: 6000,
  seo_title: 120,
  alt: 250,
  photos: 60,
}

export const eventTitle = (e: Pick<SiteEvent, 'title' | 'seo_title'>) => e.seo_title || `${e.title} | Boat Seafood Dubai`

export const eventPath = (slug: string) => `/events/${slug}`

// Alt text for Google and screen readers; a photo without its own gets the event's name
export const photoAlt = (e: { title: string }, photo: EventPhoto, index: number) =>
  photo.alt || `${e.title} at Boat Seafood Dubai, photo ${index + 1}`

export const coverAlt = (e: Pick<SiteEvent, 'title' | 'cover_alt'>) => e.cover_alt || `${e.title} at Boat Seafood Dubai`

// "2026-11-25" -> "25 November 2026"
export const eventDateText = (day: string) =>
  day ? new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : ''

// Images next/image may load: files of this site and our Cloudinary uploads (next.config.mjs)
export const isEventImage = (src: string) => src.startsWith('/images/') || src.startsWith('https://res.cloudinary.com/')

export const toEventCard = (e: SiteEvent): EventCard => ({
  id: e.id,
  slug: e.slug,
  title: e.title,
  tag: e.tag,
  date: e.event_date,
  dateText: eventDateText(e.event_date),
  description: e.description,
  cover: { src: e.cover_image, alt: coverAlt(e) },
  photoCount: e.photos.length,
})
