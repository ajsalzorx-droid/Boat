import 'server-only'
import { unstable_cache } from 'next/cache'
import { getDb, toPlain } from '@/lib/mongodb'
import type { MenuItem } from '@/data/menu'

// Dishes and the daily catch, loaded on the server so Google gets them in the page HTML.
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
