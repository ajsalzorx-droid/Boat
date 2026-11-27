import 'server-only'
import { safeCache } from '@/lib/safe-cache'
import { getDb } from '@/lib/mongodb'
import { COLOR_RE, DEFAULT_DELIVERY_APPS, DELIVERY_TAG, type DeliveryApp } from '@/lib/delivery'

// The delivery apps, saved as one list in site_settings ("delivery_apps"), in the admin's order.
// Cached under the "delivery" tag; saving in Admin -> Delivery Apps refreshes it.

export type DeliverySettings = { _id: string; apps: DeliveryApp[]; updated_at: Date }
export const DELIVERY_DOC = 'delivery_apps'

// Every app as saved (hidden ones too), or the defaults while nothing is saved
export function savedApps(doc: Partial<DeliverySettings> | null): DeliveryApp[] {
  if (!doc || !Array.isArray(doc.apps)) return DEFAULT_DELIVERY_APPS
  return doc.apps
    .filter((a) => a && typeof a.name === 'string' && typeof a.url === 'string' && a.url.startsWith('https://'))
    .map((a) => ({ name: a.name, url: a.url, color: COLOR_RE.test(a.color) ? a.color : '#669BBC', visible: a.visible !== false }))
}

// The apps the website shows
export const getDeliveryApps = safeCache(
  async (): Promise<DeliveryApp[]> => {
    const db = await getDb()
    const doc = await db.collection<DeliverySettings>('site_settings').findOne({ _id: DELIVERY_DOC })
    return savedApps(doc).filter((a) => a.visible)
  },
  () => DEFAULT_DELIVERY_APPS,
  ['delivery-apps'],
  { tags: [DELIVERY_TAG] },
  'delivery apps'
)
