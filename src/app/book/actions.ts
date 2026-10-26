'use server'

import { headers } from 'next/headers'
import { getDb, newId, toPlain, type IdDoc } from '@/lib/mongodb'
import { bestOffer, offerStatus, unitPrice, type Offer } from '@/lib/offers'
import { getBusinessInfo } from '@/lib/seo-data'
import { checkBooking, MAX_PREORDER_QTY, type BookingInput, type PreorderItem } from '@/lib/bookings'

export type CreateBookingResult = { ok: true } | { ok: false; error: string }

const GENERIC_ERROR = 'Could not send your booking. Please try again or call us.'

// Per-IP limit. In-memory, so it only covers this single Node process (server.js).
const WINDOW_MS = 10 * 60_000
const MAX_BOOKINGS_PER_WINDOW = 5
const recentBookings = new Map<string, number[]>()

function isRateLimited(key: string) {
  const now = Date.now()
  const hits = (recentBookings.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  const limited = hits.length >= MAX_BOOKINGS_PER_WINDOW
  if (!limited) hits.push(now)
  recentBookings.set(key, hits)

  if (recentBookings.size > 5000) {
    for (const [k, v] of recentBookings) {
      if (v.every((t) => now - t >= WINDOW_MS)) recentBookings.delete(k)
    }
  }
  return limited
}

// Saves a table reservation or fish-preparation request; staff see it in Admin -> Bookings
export async function createBooking(input: BookingInput): Promise<CreateBookingResult> {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip')
  if (ip && isRateLimited(ip)) {
    return { ok: false, error: 'Too many bookings from this device. Please wait a few minutes or call us.' }
  }

  // Opening hours come from the SEO Studio (business info), the same ones the form shows
  const business = await getBusinessInfo()
  const problem = checkBooking(input, { opens: business.opens, closes: business.closes })
  if (problem) return { ok: false, error: problem }

  const fish = input.type === 'fish'
  try {
    const db = await getDb()

    // Pre-ordered dishes: names and prices come from the database (offers running now applied),
    // never from the browser. Same line merged; dishes no longer on the menu are refused.
    const quantities = new Map<string, number>()
    for (const line of input.items ?? []) quantities.set(line.id, Math.min((quantities.get(line.id) ?? 0) + line.quantity, MAX_PREORDER_QTY))
    let items: PreorderItem[] = []
    if (quantities.size) {
      const [menu, offerDocs] = await Promise.all([
        db
          .collection<{ _id: string; name: string; price: number; category: string }>('menu_items')
          .find({ is_active: true, _id: { $in: [...quantities.keys()] } }, { projection: { name: 1, price: 1, category: 1 } })
          .toArray(),
        db.collection('offers').find({ is_active: true }).toArray(),
      ])
      if (menu.length !== quantities.size) {
        return { ok: false, error: 'Some dishes you chose are no longer on the menu. Please refresh the page and choose again.' }
      }
      const now = Date.now()
      const offers = offerDocs.map((d) => toPlain(d) as unknown as Offer).filter((o) => offerStatus(o, now) === 'live')
      items = menu.map((m) => ({
        name: m.name,
        quantity: quantities.get(m._id)!,
        price: unitPrice({ price: m.price, discount: bestOffer(offers, { id: m._id, category: m.category })?.percent }),
      }))
    }
    const itemsTotal = Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100

    await db.collection<IdDoc>('bookings').insertOne({
      _id: newId(),
      type: input.type,
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email.trim() || null,
      date: input.date,
      time: input.time,
      guests: Number(input.guests),
      fish_type: fish ? input.fish_type.trim() : null,
      fish_weight: fish && input.fish_weight.trim() ? Number(input.fish_weight) : null,
      style: fish ? input.style.trim() : null,
      notes: input.notes.trim() || null,
      items: items.length ? items : null,
      items_total: items.length ? itemsTotal : null,
      status: 'new',
      created_at: new Date(),
    })
  } catch (e) {
    console.error('createBooking failed:', e)
    return { ok: false, error: GENERIC_ERROR }
  }
  return { ok: true }
}
