'use server'

import { cookies, headers } from 'next/headers'
import { getDb } from '@/lib/mongodb'
import {
  createSession,
  deleteSession,
  hashPassword,
  ROLE_HOME,
  SESSION_COOKIES,
  SESSION_DAYS,
  verifyPassword,
  type Role,
} from '@/lib/session'

type AdminUser = { email: string; password_hash: string; role: Role }

export type LoginResult = { ok: true; role: Role; home: string } | { ok: false; error: string }

const WRONG = 'Wrong email or password.'

// Per-IP limit on login attempts. In-memory, so it only covers this single server process.
const WINDOW_MS = 15 * 60_000
const MAX_ATTEMPTS = 10
const attempts = new Map<string, number[]>()

function tooManyAttempts(key: string) {
  const now = Date.now()
  const hits = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  hits.push(now)
  attempts.set(key, hits)
  return hits.length > MAX_ATTEMPTS
}

// Compared against when the email is unknown, so a wrong email takes as long as a wrong password
let dummyHash: Promise<string> | null = null

export async function login(email: string, password: string): Promise<LoginResult> {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || null
  if (tooManyAttempts(ip ?? 'unknown')) return { ok: false, error: 'Too many attempts. Please wait 15 minutes and try again.' }

  const cleanEmail = String(email ?? '').trim().toLowerCase()
  const pass = String(password ?? '')
  if (!cleanEmail || !pass || pass.length > 200) return { ok: false, error: WRONG }

  try {
    const db = await getDb()
    const user = await db.collection<AdminUser>('admin_users').findOne({ email: cleanEmail })
    dummyHash ??= hashPassword('not-a-real-password')
    const valid = await verifyPassword(pass, user?.password_hash ?? (await dummyHash))
    if (!user || !valid) return { ok: false, error: WRONG }

    // Each role has its own cookie: logging in here leaves the other area's session alone
    const cookieName = SESSION_COOKIES[user.role]
    const jar = await cookies()
    await deleteSession(jar.get(cookieName)?.value) // a new session id on every login
    const sid = await createSession(user.email, user.role, ip, h.get('user-agent'))
    await db.collection('admin_users').updateOne({ email: cleanEmail }, { $set: { last_login_at: new Date() } })

    // The cookie holds only the random session id; the session lives on the server
    jar.set(cookieName, sid, {
      httpOnly: true, // not readable by page scripts
      secure: process.env.NODE_ENV === 'production', // HTTPS only on the live site
      sameSite: 'lax', // not sent with requests started by other sites
      path: '/',
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    })
    return { ok: true, role: user.role, home: ROLE_HOME[user.role] }
  } catch (e) {
    console.error('Login failed:', e)
    return { ok: false, error: 'Could not sign in right now. Please try again.' }
  }
}

// Ends this area's session only (the admin and SEO logins are separate)
export async function logout(role: Role) {
  if (role !== 'admin' && role !== 'seo') return
  const jar = await cookies()
  await deleteSession(jar.get(SESSION_COOKIES[role])?.value).catch((e) => console.error('Logout:', e))
  jar.delete(SESSION_COOKIES[role])
}
