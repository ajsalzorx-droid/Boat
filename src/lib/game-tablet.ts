import 'server-only'
import { createHash } from 'node:crypto'
import { cookies } from 'next/headers'
import type { Db } from 'mongodb'
import { getDb, newId } from '@/lib/mongodb'

// The restaurant's own tablet for Catbo Racing: many customers play on it, one after the other, each
// with their own number. Staff switch it on from the tablet itself (Admin -> Game Claims). It gets
// a secret cookie; the database ("game_tablets") keeps only the cookie's hash, so nobody can make
// one up. On a tablet the limits on new claims per device and per network don't apply (one claim per
// number a day still does), and no customer's claim is remembered for the next one.

const COOKIE = 'catbo_tablet'
const YEAR_S = 365 * 86400
type TabletDoc = { _id: string; created_at: Date }

const hash = (secret: string) => createHash('sha256').update(secret).digest('hex')
const secretOf = async () => {
  const value = (await cookies()).get(COOKIE)?.value
  return value && /^[\w-]{20,128}$/.test(value) ? value : null
}

export async function isGameTablet() {
  const secret = await secretOf()
  if (!secret) return false
  return !!(await (await getDb()).collection<TabletDoc>('game_tablets').findOne({ _id: hash(secret) }))
}

// Admin only (src/app/admin/actions.ts checks): this browser becomes the tablet, or stops being it
export async function setGameTablet(db: Db, on: boolean) {
  const jar = await cookies()
  const col = db.collection<TabletDoc>('game_tablets')
  const old = await secretOf()
  if (old) await col.deleteOne({ _id: hash(old) })
  if (!on) {
    jar.delete(COOKIE)
    return
  }
  const secret = `${newId()}-${newId()}`
  await col.insertOne({ _id: hash(secret), created_at: new Date() })
  jar.set(COOKIE, secret, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: YEAR_S, path: '/' })
}
