'use server'

import type { Db } from 'mongodb'
import { v2 as cloudinary } from 'cloudinary'
import { updateTag } from 'next/cache'
import { AuthError, verifyAdmin } from '@/lib/auth'
import { newId, toPlain, type IdDoc, type Plain } from '@/lib/mongodb'
import { DEFAULT_BUSINESS, SEO_PAGES, SEO_TAG, type BusinessInfo } from '@/lib/seo'
import { CONTENT_TAG, getSectionDef, type FieldType, type SectionData } from '@/lib/content'
import { MENU_TAG } from '@/lib/menu-data'

// Every admin write goes through here: verify the token first, then touch the database.
// Server Actions are reachable by direct POST, so the check must live inside each action.

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; status?: number }

// role 'seo' = SEO Studio actions, also allowed for SEO accounts (admin_users role "seo")
async function withAdmin<T>(
  fn: (db: Db) => Promise<T>,
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

// Update/delete by id: fail if the record is gone (e.g. deleted in another tab)
function found(res: { matchedCount?: number; deletedCount?: number }) {
  if ((res.matchedCount ?? res.deletedCount) === 0) fail('This item no longer exists. Please refresh.')
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

    const items = db.collection<IdDoc>('menu_items')
    if (id) found(await items.updateOne({ _id: String(id) }, { $set: row }))
    else await items.insertOne({ _id: newId(), ...row, is_active: true, created_at: new Date() })
    updateTag(MENU_TAG) // the site reads dishes from cache (src/lib/menu-data.ts)
  })
}

export async function deleteMenuItem(id: string) {
  return withAdmin(async (db) => {
    found(await db.collection<IdDoc>('menu_items').deleteOne({ _id: String(id) }))
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
      updated_at: new Date(),
    }

    const catches = db.collection<IdDoc>('daily_catch')
    if (id) found(await catches.updateOne({ _id: String(id) }, { $set: row }))
    else await catches.insertOne({ _id: newId(), ...row })
    updateTag(MENU_TAG)
  })
}

export async function deleteDailyCatch(id: string) {
  return withAdmin(async (db) => {
    found(await db.collection<IdDoc>('daily_catch').deleteOne({ _id: String(id) }))
    updateTag(MENU_TAG)
  })
}

export async function setDailyCatchAvailability(id: string, isAvailable: boolean) {
  return withAdmin(async (db) => {
    found(
      await db
        .collection<IdDoc>('daily_catch')
        .updateOne({ _id: String(id) }, { $set: { is_available: !!isAvailable, updated_at: new Date() } })
    )
    updateTag(MENU_TAG)
  })
}

// ---------- Orders ----------

export async function completeOrder(id: string) {
  return withAdmin(async (db) => {
    found(await db.collection<IdDoc>('orders').updateOne({ _id: String(id) }, { $set: { status: 'completed' } }))
  })
}

export async function clearPendingOrders() {
  return withAdmin(async (db) => {
    await db.collection('orders').deleteMany({ status: 'pending' })
  })
}

// ---------- SEO Studio: draft saves + publish ----------
// Saves only write to the database (the site keeps showing its cached values). publishSite()
// is the "event" that expires the cache tags, so every page reads the latest values again.

async function markChanged(db: Db) {
  await db.collection<IdDoc<number>>('site_publish').updateOne({ _id: 1 }, { $set: { changed_at: new Date() } }, { upsert: true })
}

export async function publishSite() {
  return withAdmin(async (db) => {
    const now = new Date()
    await db.collection<IdDoc<number>>('site_publish').updateOne({ _id: 1 }, { $set: { published_at: now } }, { upsert: true })
    const publishedAt = now.toISOString()
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
      title: text(input?.title, 'Title', 120),
      description: text(input?.description, 'Description', 320),
      og_image: imageUrl(input?.og_image),
      noindex: !!input?.noindex,
      updated_at: new Date(),
    }
    await db.collection<IdDoc>('seo_pages').updateOne({ _id: path }, { $set: row }, { upsert: true })
    await markChanged(db)
  }, 'seo')
}

export async function saveBusinessInfo(input: BusinessInfo) {
  return withAdmin(async (db) => {
    const row: Record<string, string> = {}
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
    await db
      .collection<IdDoc<number>>('business_info')
      .updateOne({ _id: 1 }, { $set: { ...row, updated_at: new Date() } }, { upsert: true })
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

    await db
      .collection<IdDoc>('site_content')
      .updateOne({ _id: sectionId }, { $set: { data: { fields, items }, updated_at: new Date() } }, { upsert: true })
    await markChanged(db)
  }, 'seo')
}

export async function resetContentSection(sectionId: string) {
  return withAdmin(async (db) => {
    if (!getSectionDef(sectionId)) fail('Unknown section.')
    await db.collection<IdDoc>('site_content').deleteOne({ _id: sectionId })
    await markChanged(db)
  }, 'seo')
}

// ---------- Image upload (Cloudinary) ----------

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']

export type UploadFolder = 'menu' | 'daily-catch' | 'seo' | 'content'

export type ImageUploadAuth = {
  uploadUrl: string
  apiKey: string
  timestamp: number
  signature: string
  folder: string
  publicId: string
  format: string
  transformation: string
}

// Uploads are converted by Cloudinary as they are stored: WebP, no wider than 1600px
const UPLOAD_FORMAT = 'webp'
const UPLOAD_TRANSFORMATION = 'c_limit,w_1600'

// Signs a one-time upload so the browser can send the file straight to Cloudinary (no Server
// Action body-size limit) - only after the login has been verified. The API secret never
// leaves the server. The uploaded file's Cloudinary URL is what gets saved in the database.
export async function createImageUpload(folder: UploadFolder, fileName: string) {
  return withAdmin<ImageUploadAuth>(async () => {
    if (!['menu', 'daily-catch', 'seo', 'content'].includes(folder)) fail('Invalid upload folder.')
    const ext = String(fileName).split('.').pop()?.toLowerCase() ?? ''
    if (!IMAGE_EXTENSIONS.includes(ext)) fail(`Only ${IMAGE_EXTENSIONS.join(', ')} images are allowed.`)

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    if (!cloudName || !apiKey || !apiSecret) fail('Image uploads are not set up yet (Cloudinary keys missing in .env.local).')

    // Only these exact values can be uploaded with this signature (valid for about an hour).
    // Every upload is stored as WebP, at most 1600px wide (smaller files, faster pages).
    const params = {
      folder: `boat/${folder}`,
      public_id: newId(),
      timestamp: Math.round(Date.now() / 1000),
      format: UPLOAD_FORMAT,
      transformation: UPLOAD_TRANSFORMATION,
    }
    const signature = cloudinary.utils.api_sign_request(params, apiSecret)
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      apiKey,
      timestamp: params.timestamp,
      signature,
      folder: params.folder,
      publicId: params.public_id,
      format: params.format,
      transformation: params.transformation,
    }
  }, folder === 'seo' || folder === 'content' ? 'seo' : 'admin')
}

// ---------- Reads for the admin screens (straight from the database, never cached) ----------

export type MenuItemRow = Plain<{
  name: string
  description: string
  price: number
  category: string
  tag: string
  image_url: string
  dietary: string[] | null
  is_tall: boolean | null
  is_wide: boolean | null
  is_active: boolean
  created_at: string
}>

// One page of dishes, newest first (skip/limit pagination)
export async function listMenuItems(page: number, pageSize: number) {
  return withAdmin(async (db) => {
    const size = Math.min(Math.max(Math.floor(pageSize) || 10, 1), 100)
    const skip = Math.max(Math.floor(page) || 0, 0) * size
    const items = db.collection('menu_items')
    const [docs, total] = await Promise.all([
      items.find().sort({ created_at: -1, _id: 1 }).skip(skip).limit(size).toArray(),
      items.countDocuments(),
    ])
    return { items: docs.map((d) => toPlain(d) as unknown as MenuItemRow), total }
  })
}

export type DailyCatchRow = Plain<{
  name: string
  origin: string
  description: string
  price: number
  image_url: string
  is_available: boolean
  updated_at: string
}>

export async function listDailyCatch() {
  return withAdmin(async (db) => {
    const docs = await db.collection('daily_catch').find().sort({ updated_at: -1 }).toArray()
    return docs.map((d) => toPlain(d) as unknown as DailyCatchRow)
  })
}

export type OrderRow = Plain<{
  table: string
  items: { name: string; quantity: number }[]
  total: number
  status: 'pending' | 'completed'
  timestamp: string
}>

// Pending orders (newest first) plus totals for the dashboard
export async function listOrders() {
  return withAdmin(async (db) => {
    const orders = db.collection('orders')
    const [pending, totals] = await Promise.all([
      orders.find({ status: 'pending' }).sort({ timestamp: -1 }).toArray(),
      orders
        .aggregate<{ count: number; revenue: number }>([{ $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$total' } } }])
        .toArray(),
    ])
    return {
      pending: pending.map((d) => toPlain(d) as unknown as OrderRow),
      totalOrders: totals[0]?.count ?? 0,
      revenue: totals[0]?.revenue ?? 0,
    }
  })
}

export type StudioRows = {
  seoPages: (SeoPageInput & { path: string })[]
  business: Partial<BusinessInfo> | null
  content: { section: string; data: SectionData }[]
  changedAt: string | null
  publishedAt: string | null
}

// Everything the SEO Studio edits, read straight from the database (never from the site cache)
export async function getStudioRows() {
  return withAdmin<StudioRows>(async (db) => {
    const [seo, business, content, publish] = await Promise.all([
      db.collection<{ _id: string } & SeoPageInput>('seo_pages').find().toArray(),
      db.collection<IdDoc<number>>('business_info').findOne({ _id: 1 }),
      db.collection<{ _id: string; data: SectionData }>('site_content').find().toArray(),
      db.collection<{ _id: number; changed_at?: Date | null; published_at?: Date | null }>('site_publish').findOne({ _id: 1 }),
    ])
    return {
      seoPages: seo.map((d) => ({ path: d._id, title: d.title, description: d.description, og_image: d.og_image, noindex: d.noindex })),
      business: business ? (toPlain(business) as unknown as Partial<BusinessInfo>) : null,
      content: content.map((d) => ({ section: d._id, data: d.data })),
      changedAt: publish?.changed_at ? publish.changed_at.toISOString() : null,
      publishedAt: publish?.published_at ? publish.published_at.toISOString() : null,
    }
  }, 'seo')
}
