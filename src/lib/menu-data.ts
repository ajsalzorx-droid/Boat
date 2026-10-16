import { cachedPublicClient } from '@/lib/public-db'
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

export async function getActiveMenuItems(): Promise<MenuItem[]> {
  const db = cachedPublicClient(MENU_TAG)
  if (!db) return []
  const { data, error } = await db
    .from('menu_items')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true }) // stable order when created_at ties
  if (error) console.error('Error fetching menu:', error.message)
  return (data ?? []).map((d) => ({ ...d, image: d.image_url }))
}

export async function getAvailableCatch(): Promise<DailyCatchItem[]> {
  const db = cachedPublicClient(MENU_TAG)
  if (!db) return []
  const { data, error } = await db
    .from('daily_catch')
    .select('*')
    .eq('is_available', true)
    .order('updated_at', { ascending: false })
  if (error) console.error('Error fetching daily catch:', error.message)
  return data ?? []
}
