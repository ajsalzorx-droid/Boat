'use server'

import { headers } from 'next/headers'
import { getDb, newId, type IdDoc } from '@/lib/mongodb'

export type OrderLine = { id: string; quantity: number }
export type PlaceOrderResult = { ok: true } | { ok: false; error: string }

const GENERIC_ERROR = 'Could not send your order. Please try again or ask a waiter.'

// Per-IP limit. In-memory, so it only covers this single Node process (server.js).
const WINDOW_MS = 60_000
const MAX_ORDERS_PER_WINDOW = 3
const recentOrders = new Map<string, number[]>()

function isRateLimited(key: string) {
  const now = Date.now()
  const hits = (recentOrders.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  const limited = hits.length >= MAX_ORDERS_PER_WINDOW
  if (!limited) hits.push(now)
  recentOrders.set(key, hits)

  if (recentOrders.size > 5000) {
    for (const [k, v] of recentOrders) {
      if (v.every((t) => now - t >= WINDOW_MS)) recentOrders.delete(k)
    }
  }
  return limited
}

export async function placeOrder(table: string | null, lines: OrderLine[]): Promise<PlaceOrderResult> {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip')
  if (ip && isRateLimited(ip)) {
    return { ok: false, error: 'Too many orders. Please wait a minute and try again.' }
  }

  // Table comes from the QR code (?table=); anything else is treated as invalid
  const tableName = table?.trim() || 'Takeaway'
  if (!/^[A-Za-z0-9 -]{1,10}$/.test(tableName)) {
    return { ok: false, error: 'Invalid table number.' }
  }

  if (!Array.isArray(lines) || lines.length === 0 || lines.length > 50) {
    return { ok: false, error: 'Your cart is empty or too large.' }
  }

  // Merge duplicate lines and validate quantities
  const quantities = new Map<string, number>()
  for (const line of lines) {
    const id = String(line?.id ?? '')
    const qty = Number(line?.quantity)
    if (!id || !Number.isInteger(qty) || qty < 1 || qty > 50) {
      return { ok: false, error: 'Invalid item quantity.' }
    }
    quantities.set(id, (quantities.get(id) ?? 0) + qty)
  }

  try {
    // Names and prices come from the database, never from the browser
    const db = await getDb()
    const menu = await db
      .collection<{ _id: string; name: string; price: number }>('menu_items')
      .find({ is_active: true, _id: { $in: [...quantities.keys()] } }, { projection: { name: 1, price: 1 } })
      .toArray()

    if (menu.length !== quantities.size) {
      return { ok: false, error: 'Some items in your cart are no longer available. Please refresh the menu.' }
    }

    const items = menu.map((m) => ({ name: m.name, quantity: quantities.get(m._id)! }))
    const total = menu.reduce((sum, m) => sum + Number(m.price) * quantities.get(m._id)!, 0)

    await db.collection<IdDoc>('orders').insertOne({
      _id: newId(),
      table: tableName,
      items,
      total: Math.round(total * 100) / 100,
      status: 'pending',
      timestamp: new Date(),
    })
  } catch (e) {
    console.error('placeOrder failed:', e)
    return { ok: false, error: GENERIC_ERROR }
  }

  return { ok: true }
}
