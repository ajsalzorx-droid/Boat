'use server'

import { AuthError, verifyStaff } from '@/lib/auth'
import { toPlain, type IdDoc } from '@/lib/mongodb'
import type { Role } from '@/lib/session'

// The kitchen screen's own actions: kitchen accounts and admins may use them. Kitchen accounts see
// only what the cooks need (no revenue, no other admin data) and can only mark orders done.

export type KitchenOrder = {
  id: string
  table: string
  name?: string | null
  phone?: string | null
  items: { name: string; quantity: number }[]
  total: number
  timestamp: string
  status: 'pending' | 'completed' | 'cancelled'
  source?: 'booking' | null // a pre-order from a confirmed table booking (otherwise the website menu)
  booking_date?: string | null // when the guests come, e.g. "Fri, 20 Nov 2026"
  booking_time?: string | null // e.g. "5:00 PM"
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string; status?: number }

const KITCHEN_ROLES: Role[] = ['kitchen', 'admin']

async function withKitchen<T>(fn: (db: Awaited<ReturnType<typeof verifyStaff>>['db'], role: Role) => Promise<T>): Promise<Result<T>> {
  try {
    const { db, user } = await verifyStaff(KITCHEN_ROLES)
    return { ok: true, data: await fn(db, user.role) }
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message, status: e.status }
    console.error('Kitchen action failed:', e)
    return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong.' }
  }
}

// Orders still to cook, oldest first (the first one in is the first one out)
export async function kitchenOrders() {
  return withKitchen(async (db, role) => {
    const rows = await db.collection('orders').find({ status: 'pending' }).sort({ timestamp: 1, _id: 1 }).limit(200).toArray()
    return { orders: rows.map((d) => toPlain(d) as unknown as KitchenOrder), role }
  })
}

export async function kitchenCompleteOrder(id: string) {
  return withKitchen(async (db) => {
    const res = await db.collection<IdDoc>('orders').updateOne({ _id: String(id), status: 'pending' }, { $set: { status: 'completed', completed_at: new Date() } })
    if (!res.matchedCount) throw new Error('This order is no longer waiting. Please refresh.')
    return null
  })
}
