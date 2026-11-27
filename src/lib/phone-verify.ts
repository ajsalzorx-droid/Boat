import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import type { Collection } from 'mongodb'
import { getDb } from '@/lib/mongodb'

// A customer's WhatsApp number, proved once with the game's code (src/lib/game-otp.ts: they send
// "GET OTP" to our WhatsApp and type the code we reply with), then remembered on that device for
// REMEMBER_DAYS. Delivery orders and table bookings are only taken for a number proved here, so
// nobody can make the restaurant's WhatsApp message someone else's number.
//
// The browser keeps a random token (httpOnly cookie, never readable by page scripts); the database
// keeps only its hash and the number, and MongoDB removes it when it expires.

export const PHONE_COOKIE = 'boat_phone'
const REMEMBER_DAYS = 30
const REMEMBER_MS = REMEMBER_DAYS * 24 * 60 * 60_000

// Shown when an order or booking arrives for a number not proved on this device
export const VERIFY_FIRST = 'Please verify your WhatsApp number first.'

type VerifiedDoc = { _id: string; phone: string; created_at: Date; expires_at: Date }

let index: Promise<unknown> | null = null
async function verifiedPhones(): Promise<Collection<VerifiedDoc>> {
  const col = (await getDb()).collection<VerifiedDoc>('verified_phones')
  index ??= col.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }).catch((e) => {
    index = null
    console.error('verified_phones index:', e)
  })
  return col
}

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex')

// The number proved on this device (international digits, e.g. 971501234567), or null
export async function verifiedPhone(): Promise<string | null> {
  const token = (await cookies()).get(PHONE_COOKIE)?.value
  if (!token || token.length > 100) return null
  const doc = await (await verifiedPhones()).findOne({ _id: tokenHash(token), expires_at: { $gt: new Date() } })
  return doc?.phone ?? null
}

// After a right code: this device has proved this number (a number proved before is replaced)
export async function rememberPhone(phone: string) {
  const jar = await cookies()
  const col = await verifiedPhones()
  const old = jar.get(PHONE_COOKIE)?.value
  if (old) await col.deleteOne({ _id: tokenHash(old) })
  const token = randomBytes(32).toString('base64url')
  const now = new Date()
  await col.insertOne({ _id: tokenHash(token), phone, created_at: now, expires_at: new Date(now.getTime() + REMEMBER_MS) })
  jar.set(PHONE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: REMEMBER_MS / 1000,
  })
}
