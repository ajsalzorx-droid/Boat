'use server'

import { cookies, headers } from 'next/headers'
import { clientIp, hit, hits } from '@/lib/rate-limit'
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

// Limits, counted in the database so they hold on every server: attempts per IP, and wrong
// passwords per account (this one can't be dodged by changing or faking the IP)
const WINDOW_MS = 15 * 60_000
const MAX_ATTEMPTS_PER_IP = 20
const MAX_FAILS_PER_ACCOUNT = 8
const TOO_MANY = 'Too many attempts. Please wait 15 minutes and try again.'

// Compared against when the email is unknown, so a wrong email takes as long as a wrong password
let dummyHash: Promise<string> | null = null

export async function login(email: string, password: string): Promise<LoginResult> {
  const h = await headers()
  const ip = await clientIp()
  if (await hit(`login-ip:${ip}`, MAX_ATTEMPTS_PER_IP, WINDOW_MS)) return { ok: false, error: TOO_MANY }

  const cleanEmail = String(email ?? '').trim().toLowerCase().slice(0, 200)
  const pass = String(password ?? '')
  if (!cleanEmail || !pass || pass.length > 200) return { ok: false, error: WRONG }
  const failKey = `login-fail:${cleanEmail}`
  if ((await hits(failKey, WINDOW_MS)) >= MAX_FAILS_PER_ACCOUNT) return { ok: false, error: TOO_MANY }

  try {
    const db = await getDb()
    const user = await db.collection<AdminUser>('admin_users').findOne({ email: cleanEmail })
    dummyHash ??= hashPassword('not-a-real-password')
    const valid = await verifyPassword(pass, user?.password_hash ?? (await dummyHash))
    if (!user || !valid) {
      await hit(failKey, MAX_FAILS_PER_ACCOUNT, WINDOW_MS)
      return { ok: false, error: WRONG }
    }

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
