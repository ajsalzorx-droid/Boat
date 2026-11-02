'use server'

import { getDb, newId, toPlain, type IdDoc } from '@/lib/mongodb'
import { bestOffer, offerStatus, unitPrice, type Offer } from '@/lib/offers'
import { clientIp, hit, looksLikeBot, type FormGuard } from '@/lib/rate-limit'

export type OrderLine = { id: string; quantity: number }
export type PlaceOrderResult = { ok: true } | { ok: false; error: string }

const GENERIC_ERROR = 'Could not send your order. Please try again or ask a waiter.'

// Limits, counted in the database so they hold on every server: per visitor, and for the whole
// site (so a bot that fakes its IP still can't flood the kitchen screen)
const MAX_ORDERS_PER_IP = 3 // per minute
const MAX_ORDERS_SITE = 120 // per 10 minutes, all visitors together
const TOO_MANY = 'Too many orders. Please wait a minute and try again.'

export async function placeOrder(table: string | null, lines: OrderLine[], guard?: FormGuard): Promise<PlaceOrderResult> {
  // Bots: a hidden field was filled, or the order was sent instantly
  if (looksLikeBot(guard)) return { ok: false, error: GENERIC_ERROR }
  if (await hit(`order-ip:${await clientIp()}`, MAX_ORDERS_PER_IP, 60_000)) return { ok: false, error: TOO_MANY }
  if (await hit('order-site', MAX_ORDERS_SITE, 10 * 60_000)) return { ok: false, error: TOO_MANY }

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
    const [menu, offerDocs] = await Promise.all([
      db
        .collection<{ _id: string; name: string; price: number; category: string }>('menu_items')
        .find({ is_active: true, _id: { $in: [...quantities.keys()] } }, { projection: { name: 1, price: 1, category: 1 } })
        .toArray(),
      db.collection('offers').find({ is_active: true }).toArray(),
    ])

    if (menu.length !== quantities.size) {
      return { ok: false, error: 'Some items in your cart are no longer available. Please refresh the menu.' }
    }

    // Offers running right now (read fresh, not from the page cache)
    const now = Date.now()
    const offers = offerDocs.map((d) => toPlain(d) as unknown as Offer).filter((o) => offerStatus(o, now) === 'live')

    const items = menu.map((m) => ({ name: m.name, quantity: quantities.get(m._id)! }))
    const total = menu.reduce((sum, m) => {
      const discount = bestOffer(offers, { id: m._id, category: m.category })?.percent
      return sum + unitPrice({ price: m.price, discount }) * quantities.get(m._id)!
    }, 0)

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
