import 'server-only'
import type { Db } from 'mongodb'
import { offerStatus, type Offer } from '@/lib/offers'
import { botTestNumbers, sendTemplateToMany, whatsappChatReady } from '@/lib/whatsapp-api'

// A new offer's banner, sent once on WhatsApp to customers who said YES to offers (src/lib/chatbot.ts
// asks them). Numbers without that YES are never messaged: WhatsApp requires it for marketing, and
// sending without it gets the number rate limited. While WATI_BOT_TEST_NUMBERS is set, only those
// numbers get it. Set in .env.local:
//   WATI_OFFER_TEMPLATE   approved Marketing template, image header {{image_url}}, with the
//                         variables {{offer_title}} and {{percent}}, and a Stop button or
//                         "Reply STOP to unsubscribe". Empty = no WhatsApp offers.
//   WATI_OFFER_MAX_RECIPIENTS   the most at one time, latest customers first (default 1000)
// Each message is charged by WhatsApp and can't be taken back, so "offer_broadcasts" holds one
// record per offer: it can't go out twice, even if the admin saves again or two tabs are open.

export type BroadcastResult =
  | { status: 'sent'; accepted: number; rejected: number }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string }

type ContactRow = { _id: string }
type BroadcastDoc = { _id: string; status: string; started_at: Date; finished_at?: Date; accepted?: number; rejected?: number; error?: string }

type OfferToSend = Pick<Offer, 'id' | 'title' | 'percent' | 'scope' | 'categories' | 'item_ids' | 'starts_at' | 'ends_at' | 'is_active'> & {
  banner_url: string
  banner_mobile_url: string
}

export const offerBroadcastReady = () => whatsappChatReady() && !!process.env.WATI_OFFER_TEMPLATE

const subscribers = (db: Db) => db.collection<ContactRow>('bot_contacts')

function audienceFilter() {
  const testNumbers = botTestNumbers()
  return { opted_in: true, ...(testNumbers.length ? { _id: { $in: testNumbers } } : {}) }
}

export const subscriberCount = (db: Db) => subscribers(db).countDocuments(audienceFilter())

// WhatsApp takes JPEG or PNG images up to 5 MB; our banners are stored as WebP on Cloudinary
function whatsappImage(url: string) {
  return url.replace(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)/, '$1f_jpg,c_limit,w_1600,q_80/')
}

export async function broadcastOffer(db: Db, offer: OfferToSend): Promise<BroadcastResult> {
  const template = process.env.WATI_OFFER_TEMPLATE
  if (!template || !whatsappChatReady()) return { status: 'skipped', reason: 'WhatsApp offers are not set up.' }
  if (offerStatus(offer as Offer) !== 'live') return { status: 'skipped', reason: 'This offer is not live today.' }
  const banner = offer.banner_url || offer.banner_mobile_url
  if (!banner) return { status: 'skipped', reason: 'This offer has no banner.' }

  const limit = Number(process.env.WATI_OFFER_MAX_RECIPIENTS) || 1000
  const audience = await subscribers(db).find(audienceFilter()).sort({ last_seen: -1 }).limit(limit).project<ContactRow>({ _id: 1 }).toArray()
  if (!audience.length) return { status: 'skipped', reason: 'No customers have agreed to offers yet.' }

  const log = db.collection<BroadcastDoc>('offer_broadcasts')
  try {
    await log.insertOne({ _id: offer.id, status: 'sending', started_at: new Date() })
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return { status: 'skipped', reason: 'This offer was already sent.' }
    throw e
  }

  const params = { image_url: whatsappImage(banner), offer_title: offer.title, percent: String(offer.percent) }
  const result = await sendTemplateToMany(
    template,
    `offer-${offer.id}`,
    audience.map((c) => ({ target: c._id, params }))
  )
  // A failure stays recorded and isn't retried: some messages may have gone out, and they cost money
  await log.updateOne(
    { _id: offer.id },
    {
      $set: result.ok
        ? { status: 'sent', finished_at: new Date(), accepted: result.accepted, rejected: result.rejected }
        : { status: 'failed', finished_at: new Date(), error: result.error },
    }
  )
  return result.ok ? { status: 'sent', accepted: result.accepted, rejected: result.rejected } : { status: 'failed', error: result.error }
}
