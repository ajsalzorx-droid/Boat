import 'server-only'
import { headers } from 'next/headers'
import { getDb } from '@/lib/mongodb'

// Limits on logins, orders and bookings, counted in MongoDB ("rate_limits" collection), so they
// hold across every server (Hostinger and Vercel) and every process. Each count is for a fixed
// time window and is deleted by MongoDB automatically soon after the window ends (TTL index).
// This collection only holds counters: no other data is read or changed here.

type LimitDoc = { _id: string; count: number; expires_at: Date }

let indexReady: Promise<unknown> | null = null

async function limits() {
  const col = (await getDb()).collection<LimitDoc>('rate_limits')
  indexReady ??= col.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }).catch((e) => {
    indexReady = null
    console.error('rate_limits index:', e)
  })
  await indexReady
  return col
}

const windowId = (key: string, windowMs: number) => {
  const bucket = Math.floor(Date.now() / windowMs)
  return { id: `${key}:${bucket}`, expires: new Date((bucket + 2) * windowMs) }
}

// Counts one more hit; true when this key is now over the limit for the current window.
// Never blocks if the database can't be reached (the action itself will report that).
export async function hit(key: string, limit: number, windowMs: number) {
  try {
    const { id, expires } = windowId(key, windowMs)
    const doc = await (await limits()).findOneAndUpdate(
      { _id: id },
      { $inc: { count: 1 }, $setOnInsert: { expires_at: expires } },
      { upsert: true, returnDocument: 'after' }
    )
    return (doc?.count ?? 0) > limit
  } catch (e) {
    console.error('Rate limit check failed:', e)
    return false
  }
}

// How many hits this key has in the current window (without counting a new one)
export async function hits(key: string, windowMs: number) {
  try {
    return (await (await limits()).findOne({ _id: windowId(key, windowMs).id }))?.count ?? 0
  } catch {
    return 0
  }
}

// The visitor's IP. The hosting's own header is preferred (Vercel sets x-vercel-forwarded-for and
// Cloudflare cf-connecting-ip; visitors can't fake those). X-Forwarded-For comes last, as it can be
// faked: that's why logins are also limited per account, and orders/bookings also site-wide.
export async function clientIp() {
  const h = await headers()
  return (
    h.get('x-vercel-forwarded-for')?.split(',')[0].trim() ||
    h.get('cf-connecting-ip')?.trim() ||
    h.get('x-real-ip')?.trim() ||
    h.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  ).slice(0, 64)
}

// Hidden-field spam check for public forms: a real visitor leaves the hidden "website" field
// empty and takes at least a couple of seconds; bots fill every field and send instantly.
export type FormGuard = { hp: string; ms: number }
export const MIN_FORM_MS = 2500

export function looksLikeBot(guard: FormGuard | undefined) {
  if (!guard || typeof guard !== 'object') return true
  if (typeof guard.hp !== 'string' || guard.hp.trim() !== '') return true
  return !(Number(guard.ms) >= MIN_FORM_MS)
}
