'use server'

import type { Db } from 'mongodb'
import { v2 as cloudinary } from 'cloudinary'
import { updateTag } from 'next/cache'
import { AuthError, verifyAdmin } from '@/lib/auth'
import { newId, toPlain, type IdDoc, type Plain } from '@/lib/mongodb'
import { DEFAULT_BUSINESS, SEO_PAGES, SEO_TAG, type BusinessInfo } from '@/lib/seo'
import { CONTENT_TAG, getSectionDef, type FieldType, type SectionData } from '@/lib/content'
import { MENU_TAG } from '@/lib/menu-data'
import { MENU_CATEGORIES } from '@/data/menu'
import { dubaiDay, MAX_OFFER_PERCENT, type Offer, type OfferScope } from '@/lib/offers'
import { confirmationMessage, whatsappDigits, type BookingStatus, type BookingType, type PreorderItem } from '@/lib/bookings'
import { sendTemplate, whatsappApiReady } from '@/lib/whatsapp-api'

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

// ---------- Offers ----------

export type OfferInput = {
  title: string
  description: string
  percent: number
  banner_url: string // homepage banner, wide ("" = none)
  banner_mobile_url: string // homepage banner for phones ("" = the wide one)
  scope: OfferScope
  categories: string[]
  item_ids: string[]
  start_day: string // "2026-11-01" in Dubai time, or "" = from now
  end_day: string // or "" = until switched off
  is_active: boolean
}

function day(value: unknown, field: string, edge: 'start' | 'end') {
  const s = text(value, field, 10)
  if (!s) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) fail(`${field} must be a date.`)
  return dubaiDay(s, edge)
}

export async function saveOffer(id: string | null, input: OfferInput) {
  return withAdmin(async (db) => {
    const percent = Number(input?.percent)
    if (!Number.isInteger(percent) || percent < 1 || percent > MAX_OFFER_PERCENT)
      fail(`Discount must be a whole number from 1 to ${MAX_OFFER_PERCENT} %.`)
    const scope = input?.scope
    if (!['all', 'categories', 'items'].includes(scope)) fail('Choose what the offer applies to.')
    const categories = scope === 'categories' ? (Array.isArray(input.categories) ? input.categories : []).filter((c) => MENU_CATEGORIES.includes(c)) : []
    const itemIds = scope === 'items' ? (Array.isArray(input.item_ids) ? input.item_ids : []).map(String).slice(0, 200) : []
    if (scope === 'categories' && !categories.length) fail('Choose at least one category.')
    if (scope === 'items' && !itemIds.length) fail('Choose at least one dish.')
    const startsAt = day(input?.start_day, 'Start date', 'start')
    const endsAt = day(input?.end_day, 'End date', 'end')
    if (startsAt && endsAt && endsAt < startsAt) fail('End date must be on or after the start date.')
    const bannerUrl = imageUrl(input?.banner_url)
    const bannerMobileUrl = imageUrl(input?.banner_mobile_url)

    const row = {
      title: text(input?.title, 'Title', 80, true),
      description: text(input?.description, 'Description', 300),
      percent,
      banner_url: bannerUrl,
      banner_mobile_url: bannerMobileUrl,
      scope,
      categories,
      item_ids: itemIds,
      starts_at: startsAt,
      ends_at: endsAt,
      is_active: !!input?.is_active,
      updated_at: new Date(),
    }

    const offers = db.collection<IdDoc>('offers')
    if (id) found(await offers.updateOne({ _id: String(id) }, { $set: row }))
    else await offers.insertOne({ _id: newId(), ...row, created_at: new Date() })
    updateTag(MENU_TAG) // menu prices and the homepage banner read offers from cache
  })
}

export async function deleteOffer(id: string) {
  return withAdmin(async (db) => {
    found(await db.collection<IdDoc>('offers').deleteOne({ _id: String(id) }))
    updateTag(MENU_TAG)
  })
}

export async function setOfferActive(id: string, isActive: boolean) {
  return withAdmin(async (db) => {
    found(
      await db
        .collection<IdDoc>('offers')
        .updateOne({ _id: String(id) }, { $set: { is_active: !!isActive, updated_at: new Date() } })
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

export type UploadFolder = 'menu' | 'daily-catch' | 'offers' | 'seo' | 'content'

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
    if (!['menu', 'daily-catch', 'offers', 'seo', 'content'].includes(folder)) fail('Invalid upload folder.')
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

// All offers, newest first, plus every dish (name and category) for the "applies to" picker
export async function listOffers() {
  return withAdmin(async (db) => {
    const [offers, dishes] = await Promise.all([
      db.collection('offers').find().sort({ created_at: -1, _id: 1 }).toArray(),
      db
        .collection('menu_items')
        .find({}, { projection: { name: 1, category: 1, price: 1 } })
        .sort({ category: 1, name: 1 })
        .toArray(),
    ])
    return {
      offers: offers.map((d) => toPlain(d) as unknown as Offer),
      dishes: dishes.map((d) => ({ id: String(d._id), name: String(d.name), category: String(d.category), price: Number(d.price) })),
    }
  })
}

export type OrderRow = Plain<{
  table: string
  items: { name: string; quantity: number }[]
  total: number
  status: 'pending' | 'completed'
  timestamp: string
}>

// ---------- Bookings (table reservations + fish preparation, from /book) ----------

export type BookingRow = Plain<{
  type: BookingType
  name: string
  phone: string
  email: string | null
  date: string
  time: string
  guests: number
  fish_type: string | null
  fish_weight: number | null
  style: string | null
  notes: string | null
  items?: PreorderItem[] | null // dishes pre-ordered from the menu
  items_total?: number | null
  whatsapp_sent_at?: string | null // confirmation sent through the WhatsApp API
  whatsapp_error?: string | null
  status: BookingStatus
  created_at: string
}>

export type BookingTypeFilter = 'all' | BookingType
export type BookingStatusFilter = 'all' | BookingStatus

// One page of bookings, soonest visit first (by date and time), plus counts for the filters
export async function listBookings(page: number, pageSize: number, type: BookingTypeFilter, status: BookingStatusFilter) {
  return withAdmin(async (db) => {
    if (!['all', 'table', 'fish'].includes(type)) fail('Invalid booking type.')
    if (!['all', 'new', 'confirmed', 'cancelled'].includes(status)) fail('Invalid booking status.')
    const size = Math.min(Math.max(Math.floor(pageSize) || 8, 1), 100)
    const skip = Math.max(Math.floor(page) || 0, 0) * size
    const query = { ...(type !== 'all' && { type }), ...(status !== 'all' && { status }) }
    const bookings = db.collection('bookings')
    const [docs, total, byStatus] = await Promise.all([
      bookings.find(query).sort({ date: 1, time: 1, _id: 1 }).skip(skip).limit(size).toArray(),
      bookings.countDocuments(query),
      bookings
        .aggregate<{ _id: BookingStatus; count: number }>([
          { $match: type !== 'all' ? { type } : {} },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        .toArray(),
    ])
    const counts = { all: 0, new: 0, confirmed: 0, cancelled: 0 }
    for (const s of byStatus) {
      if (s._id in counts) counts[s._id] = s.count
      counts.all += s.count
    }
    // whatsappApi: Confirm sends the message itself (else the admin page opens WhatsApp to tap Send)
    return { bookings: docs.map((d) => toPlain(d) as unknown as BookingRow), total, counts, whatsappApi: whatsappApiReady() }
  })
}

// whatsapp: 'sent' = the confirmation went out from the restaurant's number (WhatsApp API),
// 'failed' = the API refused it (error says why), 'off' = API not set up or not a confirmation
export type BookingStatusResult = { whatsapp: 'sent' | 'failed' | 'off'; error?: string }

export async function setBookingStatus(id: string, status: BookingStatus) {
  return withAdmin<BookingStatusResult>(async (db) => {
    if (!['new', 'confirmed', 'cancelled'].includes(status)) fail('Invalid booking status.')
    const bookings = db.collection<IdDoc>('bookings')
    const before = await bookings.findOneAndUpdate({ _id: String(id) }, { $set: { status, updated_at: new Date() } })
    if (!before) fail('This item no longer exists. Please refresh.')

    // Confirming sends the customer a WhatsApp message from the restaurant's number (once)
    if (status !== 'confirmed' || before.status === 'confirmed' || !whatsappApiReady()) return { whatsapp: 'off' }
    const b = toPlain(before) as unknown as BookingRow
    const sent = await sendTemplate(whatsappDigits(b.phone), confirmationMessage(b).parts)
    await bookings.updateOne(
      { _id: String(id) },
      { $set: sent.ok ? { whatsapp_sent_at: new Date(), whatsapp_error: null } : { whatsapp_error: sent.error } }
    )
    return sent.ok ? { whatsapp: 'sent' } : { whatsapp: 'failed', error: sent.error }
  })
}

export async function deleteBooking(id: string) {
  return withAdmin(async (db) => {
    found(await db.collection<IdDoc>('bookings').deleteOne({ _id: String(id) }))
  })
}

export type OrderFilter = 'all' | 'pending' | 'completed'

// Orders (newest first) from the orders collection, plus totals for the dashboard.
// filter = which orders; with a page size only that page is returned (dashboard), without it
// every matching order (kitchen screen: all pending orders).
export async function listOrders(page?: number, pageSize?: number, filter: OrderFilter = 'pending') {
  return withAdmin(async (db) => {
    if (!['all', 'pending', 'completed'].includes(filter)) fail('Invalid order filter.')
    const orders = db.collection('orders')
    const query = filter === 'all' ? {} : { status: filter }
    let cursor = orders.find(query).sort({ timestamp: -1, _id: 1 })
    if (pageSize !== undefined) {
      const size = Math.min(Math.max(Math.floor(pageSize) || 8, 1), 100)
      cursor = cursor.skip(Math.max(Math.floor(page ?? 0) || 0, 0) * size).limit(size)
    }
    const [rows, byStatus] = await Promise.all([
      cursor.toArray(),
      orders
        .aggregate<{ _id: string; count: number; revenue: number }>([
          { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
        ])
        .toArray(),
    ])
    const counts = { all: 0, pending: 0, completed: 0 }
    let revenue = 0
    for (const s of byStatus) {
      if (s._id === 'pending' || s._id === 'completed') counts[s._id] = s.count
      counts.all += s.count
      revenue += s.revenue
    }
    return {
      orders: rows.map((d) => toPlain(d) as unknown as OrderRow),
      total: counts[filter], // orders matching the filter (for the pagination)
      counts,
      revenue: Math.round(revenue * 100) / 100,
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
