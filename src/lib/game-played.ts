import 'server-only'
import type { Collection, Db } from 'mongodb'
import { getDb } from '@/lib/mongodb'
import { CLAIM_CHANCES } from '@/lib/game-claims'
import type { ClaimDoc } from '@/components/catbo-race/claims'

// Claims that end with no discount (0 %) are not kept: once a claim's races are all played
// without a discount, or it expires without one, it is deleted. What stays:
// - a marker that this phone number has played today (no name, no score), so it can't register
//   again for 3 more races the same day. The marker deletes itself after MARKER_DAYS (TTL index).
// - the player's contact, for good, in "bot_contacts" (name, number, last game day, "no
//   discount"): the customer list the offer broadcast reads. Agreeing to offers is set only when
//   they ticked the box on that claim (WhatsApp requires that consent); an earlier YES or NO stays.

const MARKER_DAYS = 2
type PlayedDoc = { _id: string; expires_at: Date } // _id: "<phone>:<day>"

let ready: Promise<unknown> | null = null
async function played(db?: Db): Promise<Collection<PlayedDoc>> {
  const col = (db ?? (await getDb())).collection<PlayedDoc>('game_played')
  ready ??= col.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }).catch((e) => {
    ready = null
    console.error('game_played index failed:', e)
  })
  await ready
  return col
}

export async function markPlayed(phone: string, day: string, db?: Db) {
  await (await played(db)).updateOne(
    { _id: `${phone}:${day}` },
    { $setOnInsert: { expires_at: new Date(Date.now() + MARKER_DAYS * 86400000) } },
    { upsert: true }
  )
}

export async function playedToday(phone: string, day: string) {
  return !!(await (await played()).findOne({ _id: `${phone}:${day}` }))
}

type ContactOf = Pick<ClaimDoc, 'phone' | 'name' | 'day' | 'offers' | 'created_at'>

// The claim's player into the customer list, before the claim goes
async function keepContact(doc: ContactOf, db?: Db) {
  const now = new Date()
  const when = doc.created_at ?? now
  await (db ?? (await getDb())).collection<{ _id: string; [k: string]: unknown }>('bot_contacts').updateOne(
    { _id: doc.phone },
    {
      $set: { last_game_day: doc.day, last_game_percent: 0 },
      $max: { last_seen: when },
      $setOnInsert: { first_seen: when, source: 'game', name: doc.name, opted_in: !!doc.offers, ...(doc.offers ? { opted_in_at: now } : {}) },
    },
    { upsert: true }
  )
}

// Finished: every race played and scored (none still running), or a score chosen (locked)
const isFinished = (d: ClaimDoc) => d.locked || (d.chances_used >= CLAIM_CHANCES && d.scored_chance === d.chances_used)
const FINISHED = { $or: [{ locked: true }, { chances_used: { $gte: CLAIM_CHANCES }, $expr: { $eq: ['$scored_chance', '$chances_used'] } }] }

// A claim whose races are all played with no discount: delete it, keeping the marker and contact
export async function dropIfNoDiscount(doc: ClaimDoc, db?: Db) {
  if (doc.percent > 0 || doc.status !== 'open' || !isFinished(doc)) return false
  const col = (db ?? (await getDb())).collection<ClaimDoc>('game_claims')
  await Promise.all([markPlayed(doc.phone, doc.day, db), keepContact(doc, db)])
  const res = await col.deleteOne({ _id: doc._id, percent: { $lte: 0 }, status: 'open' })
  return res.deletedCount === 1
}

// Every claim left with no discount that is finished (all races played) or expired: deleted.
// Run when Admin -> Game Claims lists them, so none stay in the database. Each number goes into
// the customer list first (one not expired yet also keeps its "played today" marker), and only
// the claims whose contact was saved are deleted
export async function dropNoDiscountClaims(db: Db) {
  const col = db.collection<ClaimDoc>('game_claims')
  const now = new Date()
  const going = { percent: { $lte: 0 }, status: { $ne: 'used' as const }, $or: [FINISHED, { expires_at: { $lte: now } }] }
  const docs = await col.find(going, { projection: { phone: 1, name: 1, day: 1, offers: 1, created_at: 1, expires_at: 1 } }).limit(2000).toArray()
  if (!docs.length) return 0
  await Promise.all(docs.map((d) => Promise.all([keepContact(d, db), d.expires_at > now ? markPlayed(d.phone, d.day, db) : null])))
  const res = await col.deleteMany({ ...going, _id: { $in: docs.map((d) => d._id) } })
  return res.deletedCount
}
