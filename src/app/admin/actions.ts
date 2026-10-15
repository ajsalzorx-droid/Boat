'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthError, verifyAdmin } from '@/lib/auth'

// Every admin write goes through here: verify the token first, then touch the database.
// Server Actions are reachable by direct POST, so the check must live inside each action.

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; status?: number }

async function withAdmin<T>(fn: (db: SupabaseClient) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const { db } = await verifyAdmin()
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
  })
}

export async function deleteMenuItem(id: string) {
  return withAdmin(async (db) => {
    check(await db.from('menu_items').delete().eq('id', id))
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
  })
}

export async function deleteDailyCatch(id: string) {
  return withAdmin(async (db) => {
    check(await db.from('daily_catch').delete().eq('id', id))
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

// ---------- Image upload ----------

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']

// Returns a one-time signed upload URL so the browser can upload the file straight to
// Storage (no Server Action body-size limit) - only after the token has been verified.
export async function createImageUploadUrl(folder: 'menu' | 'daily-catch', fileName: string) {
  return withAdmin(async (db) => {
    if (folder !== 'menu' && folder !== 'daily-catch') fail('Invalid upload folder.')
    const ext = String(fileName).split('.').pop()?.toLowerCase() ?? ''
    if (!IMAGE_EXTENSIONS.includes(ext)) fail(`Only ${IMAGE_EXTENSIONS.join(', ')} images are allowed.`)

    const path = `${folder}/${crypto.randomUUID()}.${ext}`
    const { data, error } = await db.storage.from('images').createSignedUploadUrl(path)
    if (error || !data) fail(error?.message ?? 'Could not create upload URL.')

    const { data: pub } = db.storage.from('images').getPublicUrl(path)
    return { path, token: data.token, publicUrl: pub.publicUrl }
  })
}
