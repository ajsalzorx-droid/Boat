'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { updateTag } from 'next/cache'
import { AuthError, verifyAdmin } from '@/lib/auth'
import { DEFAULT_BUSINESS, SEO_PAGES, SEO_TAG, type BusinessInfo } from '@/lib/seo'
import { CONTENT_TAG, getSectionDef, type FieldType, type SectionData } from '@/lib/content'
import { MENU_TAG } from '@/lib/menu-data'

// Every admin write goes through here: verify the token first, then touch the database.
// Server Actions are reachable by direct POST, so the check must live inside each action.

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; status?: number }

// role 'seo' = SEO Studio actions, also allowed for SEO_EMAILS accounts
async function withAdmin<T>(
  fn: (db: SupabaseClient) => Promise<T>,
  role: 'admin' | 'seo' = 'admin'
): Promise<ActionResult<T>> {
  try {
    const { db } = await verifyAdmin(role)
    return { ok: true, data: await fn(db) }
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message, status: e.status }
    console.error('Admin action failed:', e)
    return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong.' }
  }
}

function fail(message: string): never {
  throw new Error(message)
}

function text(value: unknown, field: string, max: number, required = false) {
  const s = typeof value === 'string' ? value.trim() : ''
  if (required && !s) fail(`${field} is required.`)
  if (s.length > max) fail(`${field} is too long (max ${max} characters).`)
  return s
}

function price(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0 || n > 100000) fail('Price must be a number between 0 and 100000.')
  return Math.round(n * 100) / 100
}

function imageUrl(value: unknown) {
  const s = text(value, 'Image URL', 1000)
  if (s && !s.startsWith('/') && !s.startsWith('https://')) fail('Image URL must start with / or https://')
  return s
}

function check<T extends { error: { message: string } | null }>(res: T) {
  if (res.error) fail(res.error.message)
  return res
}

// ---------- Menu items ----------

export type MenuItemInput = {
  name: string
  category: string
  price: number
  description: string
  tag: string
  image_url: string
  dietary: string[]
  is_tall: boolean
  is_wide: boolean
}

export async function saveMenuItem(id: string | null, input: MenuItemInput) {
  return withAdmin(async (db) => {
    const row = {
      name: text(input?.name, 'Name', 120, true),
      category: text(input?.category, 'Category', 60, true),
      price: price(input?.price),
      description: text(input?.description, 'Description', 1000),
      tag: text(input?.tag, 'Tag', 40),
      image_url: imageUrl(input?.image_url),
      dietary: (Array.isArray(input?.dietary) ? input.dietary : [])
        .map((d) => text(d, 'Dietary tag', 40))
        .filter(Boolean)
        .slice(0, 10),
      is_tall: !!input?.is_tall,
      is_wide: !!input?.is_wide,
    }

    if (id) check(await db.from('menu_items').update(row).eq('id', id))
    else check(await db.from('menu_items').insert(row))
    updateTag(MENU_TAG) // the site reads dishes from cache (src/lib/menu-data.ts)
  })
}

export async function deleteMenuItem(id: string) {
  return withAdmin(async (db) => {
    check(await db.from('menu_items').delete().eq('id', id))
    updateTag(MENU_TAG)
  })
}

// ---------- Daily catch ----------

export type DailyCatchInput = {
  name: string
  origin: string
  price: number
  description: string
  image_url: string
  is_available: boolean
}

export async function saveDailyCatch(id: string | null, input: DailyCatchInput) {
  return withAdmin(async (db) => {
    const row = {
      name: text(input?.name, 'Name', 120, true),
      origin: text(input?.origin, 'Origin', 80),
      price: price(input?.price),
      description: text(input?.description, 'Description', 1000),
      image_url: imageUrl(input?.image_url),
      is_available: !!input?.is_available,
      updated_at: new Date().toISOString(),
    }

    if (id) check(await db.from('daily_catch').update(row).eq('id', id))
    else check(await db.from('daily_catch').insert(row))
    updateTag(MENU_TAG)
  })
}

export async function deleteDailyCatch(id: string) {
  return withAdmin(async (db) => {
    check(await db.from('daily_catch').delete().eq('id', id))
    updateTag(MENU_TAG)
  })
}

export async function setDailyCatchAvailability(id: string, isAvailable: boolean) {
  return withAdmin(async (db) => {
    check(
      await db
        .from('daily_catch')
        .update({ is_available: !!isAvailable, updated_at: new Date().toISOString() })
        .eq('id', id)
    )
    updateTag(MENU_TAG)
  })
}

// ---------- Orders ----------

export async function completeOrder(id: string) {
  return withAdmin(async (db) => {
    check(await db.from('orders').update({ status: 'completed' }).eq('id', id))
  })
}

export async function clearPendingOrders() {
  return withAdmin(async (db) => {
    check(await db.from('orders').delete().eq('status', 'pending'))
  })
}

// ---------- SEO Studio: draft saves + publish ----------
// Saves only write to the database (the site keeps showing its cached values). publishSite()
// is the "event" that expires the cache tags, so every page reads the latest values again.

async function markChanged(db: SupabaseClient) {
  check(await db.from('site_publish').upsert({ id: 1, changed_at: new Date().toISOString() }))
}

export async function publishSite() {
  return withAdmin(async (db) => {
    const publishedAt = new Date().toISOString()
    check(await db.from('site_publish').upsert({ id: 1, published_at: publishedAt }))
    updateTag(SEO_TAG)
    updateTag(CONTENT_TAG)
    return { publishedAt }
  }, 'seo')
}

export type SeoPageInput = {
  title: string
  description: string
  og_image: string
  noindex: boolean
}

export async function saveSeoPage(path: string, input: SeoPageInput) {
  return withAdmin(async (db) => {
    if (!SEO_PAGES.some((p) => p.path === path)) fail('Unknown page.')
    const row = {
      path,
      title: text(input?.title, 'Title', 120),
      description: text(input?.description, 'Description', 320),
      og_image: imageUrl(input?.og_image),
      noindex: !!input?.noindex,
      updated_at: new Date().toISOString(),
    }
    check(await db.from('seo_pages').upsert(row))
    await markChanged(db)
  }, 'seo')
}

export async function saveBusinessInfo(input: BusinessInfo) {
  return withAdmin(async (db) => {
    const row: Record<string, string | number> = { id: 1, updated_at: new Date().toISOString() }
    for (const key of Object.keys(DEFAULT_BUSINESS) as (keyof BusinessInfo)[]) {
      row[key] = text(input?.[key], key.replace(/_/g, ' '), 300)
    }
    for (const key of ['site_url', 'instagram', 'facebook', 'tiktok'] as const) {
      if (row[key] && !String(row[key]).startsWith('https://')) fail(`${key.replace(/_/g, ' ')} must start with https://`)
    }
    for (const key of ['opens', 'closes'] as const) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(row[key]))) fail(`${key} must be a time like 12:00`)
    }
    for (const key of ['latitude', 'longitude'] as const) {
      if (row[key] && !Number.isFinite(Number(row[key]))) fail(`${key} must be a number`)
    }
    row.default_og_image = imageUrl(input?.default_og_image)
    check(await db.from('business_info').upsert(row))
    await markChanged(db)
  }, 'seo')
}

// ---------- Page content ----------

const CONTENT_MAX: Record<FieldType, number> = { text: 200, textarea: 2000, image: 1000, link: 1000, alt: 250 }
const LINK_PREFIXES = ['/', '#', 'https://', 'tel:', 'mailto:']

function contentValue(value: unknown, label: string, type: FieldType) {
  // Keep new lines (they become line breaks on the site); trim spaces only
  const s = typeof value === 'string' ? value.replace(/\r\n/g, '\n').replace(/^[ \t]+|[ \t]+$/g, '') : ''
  if (s.length > CONTENT_MAX[type]) fail(`${label} is too long (max ${CONTENT_MAX[type]} characters).`)
  if (type === 'image') return imageUrl(s)
  if (type === 'link' && s && !LINK_PREFIXES.some((p) => s.startsWith(p)))
    fail(`${label} must start with /, https://, tel: or mailto:`)
  if (type === 'alt' && s.includes('\n')) fail(`${label} must be a single line.`)
  return s
}

export async function saveContentSection(sectionId: string, input: SectionData) {
  return withAdmin(async (db) => {
    const def = getSectionDef(sectionId)
    if (!def) fail('Unknown section.')

    const fields = Object.fromEntries(
      def.fields.map((f) => [f.key, contentValue(input?.fields?.[f.key], f.label, f.type)])
    )
    const rawItems = def.list && Array.isArray(input?.items) ? input.items : []
    if (def.list && rawItems.length > def.list.max) fail(`At most ${def.list.max} ${def.list.label.toLowerCase()}.`)
    const items = rawItems.map((item, i) =>
      Object.fromEntries(
        def.list!.fields.map((f) => [f.key, contentValue(item?.[f.key], `${def.list!.itemLabel} ${i + 1} ${f.label}`, f.type)])
      )
    )

    check(
      await db
        .from('site_content')
        .upsert({ section: sectionId, data: { fields, items }, updated_at: new Date().toISOString() })
    )
    await markChanged(db)
  }, 'seo')
}

export async function resetContentSection(sectionId: string) {
  return withAdmin(async (db) => {
    if (!getSectionDef(sectionId)) fail('Unknown section.')
    check(await db.from('site_content').delete().eq('section', sectionId))
    await markChanged(db)
  }, 'seo')
}

// ---------- Image upload ----------

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']

// Returns a one-time signed upload URL so the browser can upload the file straight to
// Storage (no Server Action body-size limit) - only after the token has been verified.
export type UploadFolder = 'menu' | 'daily-catch' | 'seo' | 'content'

export async function createImageUploadUrl(folder: UploadFolder, fileName: string) {
  return withAdmin(async (db) => {
    if (!['menu', 'daily-catch', 'seo', 'content'].includes(folder)) fail('Invalid upload folder.')
    const ext = String(fileName).split('.').pop()?.toLowerCase() ?? ''
    if (!IMAGE_EXTENSIONS.includes(ext)) fail(`Only ${IMAGE_EXTENSIONS.join(', ')} images are allowed.`)

    const path = `${folder}/${crypto.randomUUID()}.${ext}`
    const { data, error } = await db.storage.from('images').createSignedUploadUrl(path)
    if (error || !data) fail(error?.message ?? 'Could not create upload URL.')

    const { data: pub } = db.storage.from('images').getPublicUrl(path)
    return { path, token: data.token, publicUrl: pub.publicUrl }
  }, folder === 'seo' || folder === 'content' ? 'seo' : 'admin')
}
