'use server'

import type { Db } from 'mongodb'
import { v2 as cloudinary } from 'cloudinary'
import { updateTag } from 'next/cache'
import { AuthError, verifyAdmin } from '@/lib/auth'
import { newId, toPlain, type IdDoc, type Plain } from '@/lib/mongodb'
import { DEFAULT_BUSINESS, SEO_PAGES, SEO_TAG, type BusinessInfo } from '@/lib/seo'
import { CONTENT_TAG, getSectionDef, type FieldType, type SectionData } from '@/lib/content'
import { BLOG_LIMITS, BLOG_TAG, publishProblems, SLUG_RE, type BlogBlock, type BlogPostInput, type BlogStatus } from '@/lib/blog'
import { toPost } from '@/lib/blog-data'
import { MENU_TAG } from '@/lib/menu-data'
import { MENU_CATEGORIES } from '@/data/menu'
import { dubaiDay, MAX_OFFER_PERCENT, type Offer, type OfferScope } from '@/lib/offers'
import { markPlayed } from '@/lib/game-played'
import { ANY_TABLE, confirmationMessage, dubaiNow, formatDate, formatTime, tableLabel, visitDate, whatsappDigits, type BookingStatus, type BookingType, type PreorderItem } from '@/lib/bookings'
import { broadcastOffer, offerBroadcastReady, subscriberCount } from '@/lib/offer-broadcast'
import { sendConfirmation, whatsappApiReady } from '@/lib/whatsapp-api'
import type { ClaimStatus, RaceScore } from '@/lib/game-claims'
import type { ClaimDoc } from '@/components/catbo-race/claims'
import { claimRow, queryDailyCatch, queryGameClaims, queryMenuItems } from '@/lib/admin-lists'

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
  ingredients: string[]
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
      ingredients: (Array.isArray(input?.ingredients) ? input.ingredients : [])
        .map((d) => text(d, 'Ingredient', 60))
        .filter(Boolean)
        .slice(0, 30),
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
  send_whatsapp?: boolean // new offers only: send the banner to customers who agreed to offers
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
    if (id) {
      found(await offers.updateOne({ _id: String(id) }, { $set: row }))
      updateTag(MENU_TAG) // menu prices and the homepage banner read offers from cache
      return { whatsapp: null }
    }
    const offerId = newId()
    await offers.insertOne({ _id: offerId, ...row, created_at: new Date() })
    updateTag(MENU_TAG)
    if (!input?.send_whatsapp) return { whatsapp: null }
    return {
      whatsapp: await broadcastOffer(db, {
        ...row,
        id: offerId,
        starts_at: startsAt?.toISOString() ?? null,
        ends_at: endsAt?.toISOString() ?? null,
      }),
    }
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

// A pending order the customer or staff called off: it leaves the kitchen screen and the revenue
export async function cancelOrder(id: string) {
  return withAdmin(async (db) => {
    const res = await db.collection<IdDoc>('orders').updateOne({ _id: String(id), status: 'pending' }, { $set: { status: 'cancelled' } })
    if (!res.matchedCount) fail('Only pending orders can be cancelled. Refresh the list and try again.')
  })
}

// Removes one order for good, once it is completed or cancelled (a pending one is still being cooked)
export async function deleteOrder(id: string) {
  return withAdmin(async (db) => {
    const res = await db.collection<IdDoc>('orders').deleteOne({ _id: String(id), status: { $in: ['completed', 'cancelled'] } })
    if (!res.deletedCount) fail('Only completed or cancelled orders can be deleted. Refresh the list and try again.')
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

// ---------- Blog posts (SEO Studio -> Blog, public at /blog) ----------
// A post is live as soon as it is saved with status "published" (no Confirm & Publish needed);
// drafts never reach the site. Changing a published post's address keeps the old one as a redirect.

function blogLink(value: unknown, field: string) {
  const s = text(value, field, BLOG_LIMITS.url)
  if (s && !/^(https?:\/\/|\/|mailto:|tel:)/.test(s)) fail(`${field} must start with https://, / , mailto: or tel:`)
  return s
}

function blogBlocks(value: unknown): BlogBlock[] {
  const raw = Array.isArray(value) ? value : []
  if (raw.length > BLOG_LIMITS.blocks) fail(`A post can have at most ${BLOG_LIMITS.blocks} blocks.`)
  return raw.map((b, i): BlogBlock => {
    const n = `Block ${i + 1}`
    switch (b?.type) {
      case 'heading':
        return { type: 'heading', text: text(b.text, `${n} heading`, BLOG_LIMITS.heading) }
      case 'paragraph': {
        const s = typeof b.text === 'string' ? b.text.replace(/\r\n/g, '\n').trim() : ''
        if (s.length > BLOG_LIMITS.paragraph) fail(`${n} text is too long (max ${BLOG_LIMITS.paragraph} characters).`)
        return { type: 'paragraph', text: s }
      }
      case 'image':
        return {
          type: 'image',
          src: imageUrl(b.src),
          alt: text(b.alt, `${n} alt text`, BLOG_LIMITS.alt).replace(/\s*\n\s*/g, ' '),
          caption: text(b.caption, `${n} caption`, BLOG_LIMITS.caption),
        }
      case 'link':
        return { type: 'link', label: text(b.label, `${n} link text`, BLOG_LIMITS.label), url: blogLink(b.url, `${n} link`), nofollow: !!b.nofollow }
      default:
        fail(`${n} has an unknown type.`)
    }
  })
}

export async function listBlogPosts() {
  return withAdmin(async (db) => {
    const docs = await db.collection('blog_posts').find().sort({ updated_at: -1, _id: 1 }).toArray()
    return docs.map(toPost)
  }, 'seo')
}

export async function getBlogPost(id: string) {
  return withAdmin(async (db) => {
    const doc = await db.collection<IdDoc>('blog_posts').findOne({ _id: String(id) })
    if (!doc) fail('This post no longer exists. Please refresh.')
    return toPost(doc)
  }, 'seo')
}

export async function saveBlogPost(id: string | null, input: BlogPostInput) {
  return withAdmin(async (db) => {
    const row = {
      title: text(input?.title, 'Title', BLOG_LIMITS.title, true),
      slug: text(input?.slug, 'Web address', BLOG_LIMITS.slug, true).toLowerCase(),
      seo_title: text(input?.seo_title, 'Google title', BLOG_LIMITS.seo_title),
      description: text(input?.description, 'Google description', BLOG_LIMITS.description),
      cover_image: imageUrl(input?.cover_image),
      cover_alt: text(input?.cover_alt, 'Cover alt text', BLOG_LIMITS.alt).replace(/\s*\n\s*/g, ' '),
      blocks: blogBlocks(input?.blocks),
      status: (input?.status === 'published' ? 'published' : 'draft') as BlogStatus,
      noindex: !!input?.noindex,
    }
    if (!SLUG_RE.test(row.slug)) fail('Web address: use lowercase letters, numbers and dashes only (e.g. fresh-hammour-guide).')
    if (row.status === 'published') {
      const problems = publishProblems(row)
      if (problems.length) fail(`Can't publish yet:\n• ${problems.join('\n• ')}`)
    }

    const posts = db.collection<IdDoc>('blog_posts')
    await posts.createIndex({ slug: 1 }, { unique: true })
    const clash = await posts.findOne({ $or: [{ slug: row.slug }, { old_slugs: row.slug }], _id: { $ne: String(id ?? '') } })
    if (clash) fail('Another post already uses this web address. Choose a different one.')

    const now = new Date()
    const postId = id ? String(id) : newId()
    if (id) {
      const before = await posts.findOne({ _id: postId })
      if (!before) fail('This post no longer exists. Please refresh.')
      const wasLive = before.status === 'published' || !!before.published_at
      // The old address of a post Google may know keeps working (redirects to the new one)
      const oldSlugs = new Set<string>((before.old_slugs as string[] | undefined) ?? [])
      if (wasLive && before.slug !== row.slug) oldSlugs.add(String(before.slug))
      oldSlugs.delete(row.slug)
      await posts.updateOne(
        { _id: postId },
        {
          $set: {
            ...row,
            old_slugs: [...oldSlugs],
            updated_at: now,
            published_at: row.status === 'published' ? (before.published_at ?? now) : (before.published_at ?? null),
          },
        }
      )
    } else {
      await posts.insertOne({ _id: postId, ...row, old_slugs: [], created_at: now, updated_at: now, published_at: row.status === 'published' ? now : null })
    }
    updateTag(BLOG_TAG)
    return { id: postId }
  }, 'seo')
}

export async function deleteBlogPost(id: string) {
  return withAdmin(async (db) => {
    found(await db.collection<IdDoc>('blog_posts').deleteOne({ _id: String(id) }))
    updateTag(BLOG_TAG)
  }, 'seo')
}

// ---------- Image upload (Cloudinary) ----------

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']

export type UploadFolder = 'menu' | 'daily-catch' | 'offers' | 'seo' | 'content' | 'blog'

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
    if (!['menu', 'daily-catch', 'offers', 'seo', 'content', 'blog'].includes(folder)) fail('Invalid upload folder.')
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
  }, folder === 'seo' || folder === 'content' || folder === 'blog' ? 'seo' : 'admin')
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
  ingredients: string[] | null
  is_tall: boolean | null
  is_wide: boolean | null
  is_active: boolean
  created_at: string
}>

// One page of dishes, newest first (skip/limit pagination)
// The admin page reads it through GET /api/admin/menu-items (abortable); same query.
export async function listMenuItems(page: number, pageSize: number, search = '') {
  return withAdmin((db) => queryMenuItems(db, { page, pageSize, search }))
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

// One page of the daily catch, last edited first (skip/limit pagination, optional search).
// The admin page reads it through GET /api/admin/daily-catch (abortable); same query.
export async function listDailyCatch(page: number, pageSize: number, search = '') {
  return withAdmin((db) => queryDailyCatch(db, { page, pageSize, search }))
}

// All offers, newest first, plus every dish (name and category) for the "applies to" picker
export async function listOffers() {
  return withAdmin(async (db) => {
    const broadcastReady = offerBroadcastReady()
    const [subscribers, offers, dishes] = await Promise.all([
      broadcastReady ? subscriberCount(db) : 0,
      db.collection('offers').find().sort({ created_at: -1, _id: 1 }).toArray(),
      db
        .collection('menu_items')
        .find({}, { projection: { name: 1, category: 1, price: 1 } })
        .sort({ category: 1, name: 1 })
        .toArray(),
    ])
    return {
      broadcastReady,
      subscribers, // the count only: numbers stay on the server
      offers: offers.map((d) => toPlain(d) as unknown as Offer),
      dishes: dishes.map((d) => ({ id: String(d._id), name: String(d.name), category: String(d.category), price: Number(d.price) })),
    }
  })
}

export type OrderRow = Plain<{
  table: string
  name?: string | null // who ordered (from the menu's order form)
  phone?: string | null
  items: { name: string; quantity: number }[]
  total: number
  status: 'pending' | 'completed' | 'cancelled'
  timestamp: string
  source?: 'booking' | null // a confirmed booking's pre-order (otherwise the website menu)
  booking_date?: string | null // when the guests come, e.g. "Fri, 20 Nov 2026"
  booking_time?: string | null
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
  table?: string | null // TABLES id, or ANY_TABLE (staff choose); none on older bookings
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
    const row = toPlain(before) as unknown as BookingRow

    // Pre-ordered dishes go to the kitchen screen when the booking is confirmed (once), and leave it
    // again if the booking is cancelled before they are cooked
    if (status === 'confirmed' && row.items?.length) await sendPreorderToKitchen(db, row)
    if (status === 'cancelled')
      await db.collection('orders').updateMany({ booking_id: row.id, status: 'pending' }, { $set: { status: 'cancelled' } })

    // Confirming sends the customer a WhatsApp message from the restaurant's number (once). It never
    // goes from a staff member's own phone: until Wati can send it, the booking says it wasn't sent
    // and "Send WhatsApp" (resendBookingConfirmation) tries again later
    if (status !== 'confirmed' || before.status === 'confirmed') return { whatsapp: 'off' }
    return sendBookingConfirmation(db, row)
  })
}

// A confirmed booking's pre-order as a kitchen order (source 'booking', with when the guests come).
// Keyed by the booking, so confirming again never adds it twice; a cancelled one comes back, a
// completed one (already cooked) stays done.
async function sendPreorderToKitchen(db: Db, b: BookingRow) {
  const items = b.items ?? []
  const orders = db.collection<IdDoc>('orders')
  const id = `booking-${b.id}`
  const existing = await orders.findOne({ _id: id }, { projection: { status: 1 } })
  if (existing) {
    if (existing.status === 'cancelled') await orders.updateOne({ _id: id }, { $set: { status: 'pending', timestamp: new Date() } })
    return
  }
  await orders.updateOne(
    { _id: id },
    {
      $set: { status: 'pending' },
      $setOnInsert: {
        booking_id: b.id,
        source: 'booking',
        table: b.table && b.table !== ANY_TABLE ? tableLabel(b.table) : 'Booking',
        name: b.name,
        phone: b.phone,
        items: items.map((i) => ({ name: i.name, quantity: i.quantity })),
        total: b.items_total ?? Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100,
        booking_date: formatDate(visitDate(b.date, b.time)),
        booking_time: formatTime(b.time),
        timestamp: new Date(),
      },
    },
    { upsert: true }
  )
}

const NOT_SET_UP = "Sending from Boat's WhatsApp number isn't set up yet (an approved Wati template is needed)."

async function sendBookingConfirmation(db: Db, b: BookingRow): Promise<BookingStatusResult> {
  const bookings = db.collection<IdDoc>('bookings')
  if (!whatsappApiReady()) {
    await bookings.updateOne({ _id: b.id }, { $set: { whatsapp_error: NOT_SET_UP } })
    return { whatsapp: 'failed', error: NOT_SET_UP }
  }
  const sent = await sendConfirmation(whatsappDigits(b.phone), confirmationMessage(b))
  await bookings.updateOne({ _id: b.id }, { $set: sent.ok ? { whatsapp_sent_at: new Date(), whatsapp_error: null } : { whatsapp_error: sent.error } })
  return sent.ok ? { whatsapp: 'sent' } : { whatsapp: 'failed', error: sent.error }
}

// "Send WhatsApp" on a confirmed booking whose message didn't go: tries again from Boat's number
export async function resendBookingConfirmation(id: string) {
  return withAdmin<BookingStatusResult>(async (db) => {
    const doc = await db.collection<IdDoc>('bookings').findOne({ _id: String(id) })
    if (!doc) fail('This item no longer exists. Please refresh.')
    const b = toPlain(doc!) as unknown as BookingRow
    if (b.status !== 'confirmed') fail('Only confirmed bookings get the WhatsApp confirmation.')
    if (b.whatsapp_sent_at) fail('The confirmation was already sent on WhatsApp.')
    return sendBookingConfirmation(db, b)
  })
}

export async function deleteBooking(id: string) {
  return withAdmin(async (db) => {
    found(await db.collection<IdDoc>('bookings').deleteOne({ _id: String(id) }))
  })
}

export type OrderFilter = 'all' | 'pending' | 'completed' | 'cancelled'

// Upcoming table bookings (new or confirmed, from today on), soonest first: the dashboard's
// "Table Bookings" tab, with their pre-ordered food. Confirming stays in Admin -> Bookings.
const upcomingBookings = () => ({ status: { $in: ['new', 'confirmed'] }, date: { $gte: dubaiNow().date } })
export async function listUpcomingBookings(page: number, pageSize: number) {
  return withAdmin(async (db) => {
    const size = Math.min(Math.max(Math.floor(pageSize) || 8, 1), 100)
    const skip = Math.max(Math.floor(page) || 0, 0) * size
    const bookings = db.collection('bookings')
    const [docs, total] = await Promise.all([
      bookings.find(upcomingBookings()).sort({ date: 1, time: 1, _id: 1 }).skip(skip).limit(size).toArray(),
      bookings.countDocuments(upcomingBookings()),
    ])
    return { bookings: docs.map((d) => toPlain(d) as unknown as BookingRow), total }
  })
}

// Orders (newest first) from the orders collection, plus totals for the dashboard.
// filter = which orders; with a page size only that page is returned (dashboard), without it
// every matching order (kitchen screen: all pending orders).
export async function listOrders(page?: number, pageSize?: number, filter: OrderFilter = 'pending') {
  return withAdmin(async (db) => {
    if (!['all', 'pending', 'completed', 'cancelled'].includes(filter)) fail('Invalid order filter.')
    const orders = db.collection('orders')
    const query = filter === 'all' ? {} : { status: filter }
    let cursor = orders.find(query).sort({ timestamp: -1, _id: 1 })
    if (pageSize !== undefined) {
      const size = Math.min(Math.max(Math.floor(pageSize) || 8, 1), 100)
      cursor = cursor.skip(Math.max(Math.floor(page ?? 0) || 0, 0) * size).limit(size)
    }
    const [rows, byStatus, bookings] = await Promise.all([
      cursor.toArray(),
      orders
        .aggregate<{ _id: string; count: number; revenue: number }>([
          { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
        ])
        .toArray(),
      db.collection('bookings').countDocuments(upcomingBookings()), // the "Table Bookings" tab's count
    ])
    const counts = { all: 0, pending: 0, completed: 0, cancelled: 0 }
    let revenue = 0
    for (const s of byStatus) {
      if (s._id === 'pending' || s._id === 'completed' || s._id === 'cancelled') counts[s._id] = s.count
      counts.all += s.count
      if (s._id !== 'cancelled') revenue += s.revenue // a cancelled order earns nothing
    }
    return {
      orders: rows.map((d) => toPlain(d) as unknown as OrderRow),
      total: counts[filter], // orders matching the filter (for the pagination)
      counts,
      bookings,
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

// ---------- Game claims (Catbo Racing played for a discount: src/lib/game-claims.ts) ----------

export type GameClaimRow = {
  id: string
  code: string
  name: string
  phone: string // as the customer typed it
  phone_digits: string // for WhatsApp
  offers: boolean // agreed to offers on WhatsApp
  day: string
  chances_used: number
  scores: RaceScore[] // every race
  chosen_chance: number | null // the race the customer chose (null = not chosen: the best counts)
  fish: number | null
  metres: number | null
  percent: number
  locked: boolean
  status: ClaimStatus
  created_at: string
  expires_at: string
  used_at: string | null
  bill_no: string | null
  bill_amount: number | null
  discount_amount: number | null
}

export type GameClaimFilter = 'ready' | 'used' | 'all'

// One page of claims, newest first. search = a claim code or (part of) a phone number.
// ready = a discount waiting to be used at the till; used = applied to a bill.
// The admin page reads it through GET /api/admin/game-claims (abortable); same query.
export async function listGameClaims(search: string, filter: GameClaimFilter, page: number, pageSize: number) {
  return withAdmin((db) => queryGameClaims(db, { search, filter, page, pageSize }))
}

// Applies a claim's discount to a bill, once: the bill number and amount are kept with it
export async function applyGameClaim(id: string, billNo: string, billAmount: number) {
  return withAdmin<GameClaimRow>(async (db) => {
    const bill = text(billNo, 'Bill number', 40, true)
    const amount = price(billAmount)
    if (amount <= 0) fail('Enter the bill amount.')
    const col = db.collection<ClaimDoc>('game_claims')
    const doc = await col.findOne({ _id: String(id) })
    if (!doc) fail('This claim no longer exists. Please refresh.')
    if (doc.status === 'used') fail(`This claim was already used on bill ${doc.bill_no ?? ''}.`.trim())
    if (doc.expires_at.getTime() < Date.now()) fail('This claim has expired.')
    if (doc.percent <= 0) fail('This claim has no discount (not enough fish caught).')
    // One game discount per bill: a group with several claims uses one person's (bill numbers are
    // compared without spaces or case, so "B-102" and "b 102" are the same bill)
    const billKey = bill.toUpperCase().replace(/\s+/g, '')
    const onBill = await col.findOne({ bill_key: billKey, status: 'used' })
    if (onBill) fail(`Bill ${onBill.bill_no} already has a game discount (code ${onBill.code}, ${onBill.name}). Only one game discount per bill.`)
    const discount = Math.round(amount * doc.percent) / 100 // AED, to the fil (percent can be 0.25, 7.5, ...)
    let updated: ClaimDoc | null
    try {
      updated = await col.findOneAndUpdate(
        { _id: doc._id, status: 'open' },
        // using it also ends the customer's chances: the score can't change after the bill
        { $set: { status: 'used', locked: true, used_at: new Date(), bill_no: bill, bill_key: billKey, bill_amount: amount, discount_amount: discount } },
        { returnDocument: 'after' }
      )
    } catch (e) {
      // two claims applied to the same bill at the same moment: the database lets only one through
      if ((e as { code?: number }).code === 11000) fail(`Bill ${bill} already has a game discount. Only one game discount per bill.`)
      throw e
    }
    if (!updated) fail('This claim was just used. Please refresh.')
    return claimRow(updated)
  })
}

// Removes a claim (any state). The page warns first when it is still a usable discount.
export async function deleteGameClaim(id: string) {
  return withAdmin(async (db) => {
    const gone = await db.collection<ClaimDoc>('game_claims').findOneAndDelete({ _id: String(id) })
    if (!gone) fail('This item no longer exists. Please refresh.')
    // The number still played today: it can't register for 3 new races until tomorrow
    if (gone.day === dubaiNow().date) await markPlayed(gone.phone, gone.day, db)
  })
}
