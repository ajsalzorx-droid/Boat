import 'server-only'
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { getDb } from '@/lib/mongodb'

// Staff login sessions, kept on the server (MongoDB "sessions" collection). The browser cookie
// holds only a random session id; the session itself (who, which role, when it ends) never
// leaves the server. Logging out, an expired session, or deleting the account ends it at once.
// The database stores a SHA-256 hash of the id, so a database leak does not expose live sessions.
// Passwords are stored as scrypt hashes, in the same format as scripts/create-admin.mjs.

export const SESSION_DAYS = 7

// admin = products (menu, daily catch) and orders; seo = the SEO Studio only
export type Role = 'admin' | 'seo'
export type Session = { email: string; role: Role }

// One cookie per role, so an admin and an SEO account can be logged in at the same time in the
// same browser (e.g. two tabs); logging in or out of one area leaves the other untouched
export const SESSION_COOKIES: Record<Role, string> = { admin: 'boat_admin_sid', seo: 'boat_seo_sid' }

// The area each role works in: where it lands after login, and the only pages it can open
export const ROLE_HOME: Record<Role, string> = { admin: '/admin', seo: '/seo' }

type SessionDoc = {
  _id: string // sha256 of the cookie's session id
  email: string
  role: Role
  created_at: Date
  expires_at: Date // MongoDB deletes the document after this (TTL index)
  last_seen_at: Date
  ip: string | null
  user_agent: string | null
}

const hashId = (id: string) => createHash('sha256').update(id).digest('hex')

async function sessions() {
  return (await getDb()).collection<SessionDoc>('sessions')
}

// New session for a verified user; returns the id to put in the cookie
export async function createSession(email: string, role: Role, ip: string | null, userAgent: string | null) {
  const id = randomBytes(32).toString('base64url')
  const now = new Date()
  await (await sessions()).insertOne({
    _id: hashId(id),
    email,
    role,
    created_at: now,
    expires_at: new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000),
    last_seen_at: now,
    ip,
    user_agent: userAgent?.slice(0, 300) ?? null,
  })
  return id
}

// The session for a role's cookie value, or null when missing, unknown, expired or of another role
export async function readSession(id: string | undefined | null, role: Role): Promise<Session | null> {
  if (!id || id.length > 100 || !/^[\w-]+$/.test(id)) return null
  const doc = await (await sessions()).findOne({ _id: hashId(id), role, expires_at: { $gt: new Date() } })
  return doc ? { email: doc.email, role: doc.role } : null
}

export async function touchSession(id: string) {
  await (await sessions()).updateOne({ _id: hashId(id) }, { $set: { last_seen_at: new Date() } })
}

export async function deleteSession(id: string | undefined | null) {
  if (id) await (await sessions()).deleteOne({ _id: hashId(id) })
}

// Ends every session of an account (password changed, account removed)
export async function deleteSessionsFor(email: string) {
  await (await sessions()).deleteMany({ email })
}

// ---------- Passwords: "scrypt$N$r$p$salt$hash" (base64url) ----------
const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number, options: object) => Promise<Buffer>
const N = 16384
const R = 8
const P = 1

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, 64, { N, r: R, p: P })
  return ['scrypt', N, R, P, salt.toString('base64url'), hash.toString('base64url')].join('$')
}

export async function verifyPassword(password: string, stored: string) {
  const [kind, n, r, p, salt, hash] = stored.split('$')
  if (kind !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'base64url')
  const actual = await scrypt(password, Buffer.from(salt, 'base64url'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  })
  return timingSafeEqual(expected, actual)
}
