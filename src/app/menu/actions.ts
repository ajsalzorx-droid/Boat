'use server'

import type { Db } from 'mongodb'
import { after } from 'next/server'
import { getDb, newId, toPlain, type IdDoc } from '@/lib/mongodb'
import { whatsappDigits } from '@/lib/bookings'
import { deliveryMessageParams, type DeliveryItem } from '@/lib/deliveries'
import { sendDeliveryReceived } from '@/lib/whatsapp-api'
import { verifiedPhone, VERIFY_FIRST } from '@/lib/phone-verify'
import { bestOffer, offerStatus, unitPrice, type Offer } from '@/lib/offers'
import { clientIp, hit, looksLikeBot, type FormGuard } from '@/lib/rate-limit'

export type OrderLine = { id: string; quantity: number }
// Who ordered: shown on the Admin and Kitchen order cards
export type OrderCustomer = { name: string; phone: string }

// A message for the customer, or null when the name and number are fine
function customerProblem(c: OrderCustomer | null | undefined): string | null {
  const name = String(c?.name ?? '').trim()
  if (name.length < 2) return 'Please enter your name.'
  if (name.length > 60 || /[<>]/.test(name)) return 'Please enter a shorter name, letters only.'
  const phone = String(c?.phone ?? '').trim()
  const digits = phone.replace(/[^0-9]/g, '')
  if (!phone) return 'Please enter your phone number.'
  if (!/^[+]?[0-9\s()-]+$/.test(phone) || digits.length < 7 || digits.length > 15) return 'Please enter a valid phone number, e.g. 050 123 4567.'
  return null
}
// verify: the number isn't proved on this device yet: the form asks for the WhatsApp code
export type PlaceOrderResult = { ok: true } | { ok: false; error: string; verify?: true }

const GENERIC_ERROR = 'Could not send your order. Please try again or ask a waiter.'

// Limits, counted in the database so they hold on every server: per visitor, and for the whole
// site (so a bot that fakes its IP still can't flood the kitchen screen)
const MAX_ORDERS_PER_IP = 3 // per minute
const MAX_ORDERS_SITE = 120 // per 10 minutes, all visitors together
const TOO_MANY = 'Too many orders. Please wait a minute and try again.'

// Bots, then the per-visitor and whole-site limits; null = may go on
async function orderRefused(guard?: FormGuard): Promise<string | null> {
  // Bots: a hidden field was filled, or the order was sent instantly
  if (looksLikeBot(guard)) return GENERIC_ERROR
  if (await hit(`order-ip:${await clientIp()}`, MAX_ORDERS_PER_IP, 60_000)) return TOO_MANY
  if (await hit('order-site', MAX_ORDERS_SITE, 10 * 60_000)) return TOO_MANY
  return null
}

export async function placeOrder(table: string | null, lines: OrderLine[], guard?: FormGuard, customer?: OrderCustomer): Promise<PlaceOrderResult> {
  const refused = await orderRefused(guard)
  if (refused) return { ok: false, error: refused }

  const problem = customerProblem(customer)
  if (problem) return { ok: false, error: problem }

  // Table comes from the QR code (?table=), or is typed in the order form; none = takeaway
  const tableName = table?.trim() || 'Takeaway'
  if (!/^[A-Za-z0-9 -]{1,10}$/.test(tableName)) {
    return { ok: false, error: 'Invalid table number.' }
  }

  return saveOrder(lines, { table: tableName, name: customer!.name.trim(), phone: customer!.phone.trim() })
}

// Delivery: where to bring the food. location = the address as typed; map = a pin from the
// customer's phone ("Use my location"), optional
export type DeliveryDetails = OrderCustomer & { location: string; map?: { lat: number; lng: number } | null }
const DELIVERY_LOCATION_MAX = 200 // the form's maxLength matches (DishDetail.tsx)

export async function placeDeliveryOrder(lines: OrderLine[], guard: FormGuard | undefined, details: DeliveryDetails): Promise<PlaceOrderResult> {
  const refused = await orderRefused(guard)
  if (refused) return { ok: false, error: refused }

  const problem = customerProblem(details)
  if (problem) return { ok: false, error: problem }
  const location = String(details?.location ?? '').trim().replace(/\s+/g, ' ')
  if (location.length < 5) return { ok: false, error: 'Please enter the delivery location (area, building, flat).' }
  if (location.length > DELIVERY_LOCATION_MAX || /[<>]/.test(location)) return { ok: false, error: 'Please enter a shorter location.' }
  let map: string | null = null
  if (details.map) {
    const lat = Number(details.map.lat)
    const lng = Number(details.map.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { ok: false, error: 'Could not read your location. Please type the address.' }
    map = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`
  }

  const name = details.name.trim()
  const phone = details.phone.trim()
  // Only for a number proved on this device (src/lib/phone-verify.ts): our WhatsApp messages
  // about the order can only ever reach the person who ordered
  if ((await verifiedPhone().catch(() => null)) !== whatsappDigits(phone)) return { ok: false, error: VERIFY_FIRST, verify: true }
  try {
    const db = await getDb()
    const priced = await priceLines(db, lines)
    if (!priced.ok) return priced

    // Saved for Admin -> Delivery; the kitchen gets it when the admin confirms (with a cooking time)
    const id = newId()
    await db.collection<IdDoc>('deliveries').insertOne({
      _id: id,
      name,
      phone,
      location,
      location_map: map,
      items: priced.items,
      items_total: priced.total,
      status: 'new',
      created_at: new Date(),
    })

    // "We have your order" on WhatsApp from Boat's number, after the customer already sees the
    // thank-you screen (a slow or failed send never holds up or fails the order)
    const params = deliveryMessageParams({ name, items: priced.items, items_total: priced.total, location })
    after(async () => {
      const sent = await sendDeliveryReceived(whatsappDigits(phone), params)
      if (!sent) return
      if (!sent.ok) console.error('Delivery received message not sent:', sent.error)
      await db
        .collection<IdDoc>('deliveries')
        .updateOne({ _id: id }, { $set: sent.ok ? { received_sent_at: new Date() } : { received_error: sent.error } })
        .catch((e) => console.error('Saving the received-message result failed:', e))
    })
  } catch (e) {
    console.error('placeDeliveryOrder failed:', e)
    return { ok: false, error: GENERIC_ERROR }
  }
  return { ok: true }
}

type Priced = { ok: true; items: DeliveryItem[]; total: number } | { ok: false; error: string }

// The dishes with their names and prices from the database (offers running now applied), never
// from the browser. Same dish twice is merged; dishes no longer on the menu are refused.
async function priceLines(db: Db, lines: OrderLine[]): Promise<Priced> {
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
  const items = menu.map((m) => ({
    name: m.name,
    quantity: quantities.get(m._id)!,
    price: unitPrice({ price: m.price, discount: bestOffer(offers, { id: m._id, category: m.category })?.percent }),
  }))
  const total = Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100
  return { ok: true, items, total }
}

// A table / takeaway order from the menu's order form: straight to the kitchen screen
async function saveOrder(lines: OrderLine[], fields: Record<string, unknown>): Promise<PlaceOrderResult> {
  try {
    const db = await getDb()
    const priced = await priceLines(db, lines)
    if (!priced.ok) return priced
    await db.collection<IdDoc>('orders').insertOne({
      _id: newId(),
      ...fields,
      items: priced.items.map((i) => ({ name: i.name, quantity: i.quantity })),
      total: priced.total,
      status: 'pending',
      timestamp: new Date(),
    })
  } catch (e) {
    console.error('placeOrder failed:', e)
    return { ok: false, error: GENERIC_ERROR }
  }

  return { ok: true }
}
