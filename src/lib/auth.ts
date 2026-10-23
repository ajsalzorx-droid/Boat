import 'server-only'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/mongodb'
import { readSession, SESSION_COOKIES, touchSession, type Role } from '@/lib/session'

export class AuthError extends Error {
  constructor(message: string, public status: 401 | 403) {
    super(message)
  }
}

type AdminUser = { email: string; role: Role }

/**
 * Login check for staff server actions (Server Actions can be called by direct POST, so every
 * action runs this first). Reads the session id from the cookie, looks the session up on the
 * server, checks the account still exists, and that its role is exactly the one the action
 * needs: admin accounts handle products and orders, SEO accounts only the SEO Studio.
 * Throws 401 if not logged in, 403 for the wrong role.
 */
export async function verifyAdmin(role: Role = 'admin') {
  // Each area has its own session cookie, so only a session of this role can be used here
  const sid = (await cookies()).get(SESSION_COOKIES[role])?.value
  const session = await readSession(sid, role)
  if (!session) throw new AuthError('Please log in again.', 401)

  const db = await getDb()
  const user = await db.collection<AdminUser>('admin_users').findOne({ email: session.email })
  if (!user) throw new AuthError('Please log in again.', 401)
  if (user.role !== role) throw new AuthError('This account is not allowed to do this.', 403)

  await touchSession(sid!)
  return { user: { email: user.email, role: user.role }, db }
}
