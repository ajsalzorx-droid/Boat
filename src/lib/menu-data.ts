import 'server-only'
import { unstable_cache } from 'next/cache'
import { getDb, toPlain } from '@/lib/mongodb'
import type { MenuItem } from '@/data/menu'
import { bestOffer, offerStatus, type Offer, type OfferBanner } from '@/lib/offers'

// Dishes, the daily catch and offers, loaded on the server so Google gets them in the page HTML.
// Cached under MENU_TAG; the admin Menu / Daily Catch actions call updateTag(MENU_TAG), so
// staff changes show on the next visit (no publish step, unlike the SEO Studio).
export const MENU_TAG = 'menu'

export type DailyCatchItem = {
  id: string
  name: string
  origin: string
  price: number
  description: string
  image_url: string
}

export const getActiveMenuItems = unstable_cache(
  async (): Promise<MenuItem[]> => {
    try {
      const db = await getDb()
      const docs = await db
        .collection('menu_items')
        .find({ is_active: true })
        .sort({ created_at: 1, _id: 1 }) // stable order when created_at ties
        .toArray()
      return docs.map((d) => {
        const item = toPlain(d)
        return { ...item, image: d.image_url ?? '' } as unknown as MenuItem
      })
    } catch (e) {
      console.error('Error fetching menu:', e)
      return []
    }
  },
  ['menu-items'],
  { tags: [MENU_TAG] }
)

// Offers switched on in the admin. The date window is checked outside the cache (getLiveOffers),
// so an offer starts and ends on time without an admin change.
const getActiveOffers = unstable_cache(
  async (): Promise<Offer[]> => {
    try {
      const db = await getDb()
      const docs = await db.collection('offers').find({ is_active: true }).sort({ percent: -1, _id: 1 }).toArray()
      return docs.map((d) => toPlain(d) as unknown as Offer)
    } catch (e) {
      console.error('Error fetching offers:', e)
      return []
    }
  },
  ['offers'],
  { tags: [MENU_TAG] }
)

export async function getLiveOffers() {
  const now = Date.now()
  return (await getActiveOffers()).filter((o) => offerStatus(o, now) === 'live')
}

// Dishes with their offer (if any) attached
export function withOffers(items: MenuItem[], offers: Offer[]): MenuItem[] {
  return items.map((item) => {
    const offer = bestOffer(offers, item)
    return offer ? { ...item, discount: offer.percent, offer_title: offer.title } : item
  })
}

// For wide screens Cloudinary pads the banner out to a very wide 7:2 strip, filled with the
// banner's own border colour so the sides blend into it. The homepage section (full width,
// 16:9 or wider) shows it with object-cover: only that padding is trimmed to fit the screen,
// never the artwork, so the whole banner is always visible. Other addresses are used unchanged.
function fitWide(url: string) {
  return url.replace(
    /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)/,
    '$1c_pad,ar_7:2,h_1080,b_auto:border/'
  )
}

// Homepage banner slides: each live offer that has a banner, biggest discount first.
// wide = for landscape screens (the wide banner, else the tall one padded to 16:9);
// tall = for portrait screens (the phone banner, else the wide one)
export function offerBanners(offers: Offer[]): OfferBanner[] {
  return offers.flatMap((o) => {
    const wide = o.banner_url || o.banner_mobile_url
    const tall = o.banner_mobile_url || o.banner_url
    return wide && tall ? [{ id: o.id, title: o.title, wide: fitWide(wide), tall, endsAt: o.ends_at }] : []
  })
}

export const getAvailableCatch = unstable_cache(
  async (): Promise<DailyCatchItem[]> => {
    try {
      const db = await getDb()
      const docs = await db.collection('daily_catch').find({ is_available: true }).sort({ updated_at: -1 }).toArray()
      return docs.map((d) => toPlain(d) as unknown as DailyCatchItem)
    } catch (e) {
      console.error('Error fetching daily catch:', e)
      return []
    }
  },
  ['daily-catch'],
  { tags: [MENU_TAG] }
)
