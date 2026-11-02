// Offers (Admin -> Offers): a percentage off the whole menu, some categories or chosen dishes,
// optionally only between two dates. Shared by the server (pages, order totals) and the browser.

export type OfferScope = 'all' | 'categories' | 'items'

export type Offer = {
  id: string
  title: string
  description: string
  percent: number // 1-90
  scope: OfferScope
  categories: string[]
  item_ids: string[]
  starts_at: string | null // ISO; null = from now
  ends_at: string | null // ISO; null = until switched off
  is_active: boolean
  // The designer's banner, shown in the homepage offers section ("" = no banner)
  banner_url?: string // wide, for landscape screens (desktops, sideways tablets)
  banner_mobile_url?: string // tall, for portrait screens (phones, upright tablets)
}

// One slide of the homepage offer banner. At least one image is set; the screen's shape picks
// which one is shown (landscape -> wide, portrait -> tall)
export type OfferBanner = {
  id: string
  title: string
  wide: string // "" = none
  tall: string // "" = none
  endsAt: string | null // ISO; the browser hides the slide after this (null = no end date)
}

export const MAX_OFFER_PERCENT = 90

// Dates are picked as whole days in Dubai time (UTC+4, no daylight saving)
const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000

// "2026-11-01" -> start (00:00) or end (23:59:59.999) of that day in Dubai, as a Date
export function dubaiDay(day: string, edge: 'start' | 'end') {
  const utc = Date.parse(`${day}T00:00:00Z`)
  return new Date(utc - DUBAI_OFFSET_MS + (edge === 'end' ? 24 * 60 * 60 * 1000 - 1 : 0))
}

// ISO -> "2026-11-01" (the Dubai day), for the admin date inputs
export function toDubaiDay(iso: string | null) {
  return iso ? new Date(Date.parse(iso) + DUBAI_OFFSET_MS).toISOString().slice(0, 10) : ''
}

export function offerStatus(offer: Offer, now = Date.now()): 'live' | 'scheduled' | 'ended' | 'off' {
  if (!offer.is_active) return 'off'
  if (offer.starts_at && Date.parse(offer.starts_at) > now) return 'scheduled'
  if (offer.ends_at && Date.parse(offer.ends_at) < now) return 'ended'
  return 'live'
}

export function offerCovers(offer: Offer, item: { id: string; category: string }) {
  if (offer.scope === 'all') return true
  if (offer.scope === 'categories') return offer.categories.includes(item.category)
  return offer.item_ids.includes(item.id)
}

// Several offers on one dish: the biggest discount wins (they never add up)
export function bestOffer(offers: Offer[], item: { id: string; category: string }) {
  let best: Offer | undefined
  for (const o of offers) if (offerCovers(o, item) && (!best || o.percent > best.percent)) best = o
  return best
}

export function discounted(price: number, percent: number) {
  return Math.round(price * (100 - percent)) / 100
}

// 196 -> "196", 196.5 -> "196.50"
export function formatPrice(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

// What one portion of a dish costs now (its offer applied)
export function unitPrice(item: { price: string | number; discount?: number }) {
  const price = Number(item.price) || 0
  return item.discount ? discounted(price, item.discount) : price
}
