'use server'

import { getDb, newId, toPlain, type IdDoc } from '@/lib/mongodb'
import { bestOffer, offerStatus, unitPrice, type Offer } from '@/lib/offers'
import { getBusinessInfo } from '@/lib/seo-data'
import { clientIp, hit, looksLikeBot, type FormGuard } from '@/lib/rate-limit'
import { checkBooking, MAX_PREORDER_QTY, type BookingInput, type PreorderItem } from '@/lib/bookings'

export type CreateBookingResult = { ok: true } | { ok: false; error: string }

const GENERIC_ERROR = 'Could not send your booking. Please try again or call us.'

// Limits, counted in the database so they hold on every server: per visitor, and for the whole
// site (so a bot that fakes its IP still can't flood Admin -> Bookings)
const WINDOW_MS = 10 * 60_000
const MAX_BOOKINGS_PER_IP = 5
const MAX_BOOKINGS_SITE = 40

// Saves a table reservation or fish-preparation request; staff see it in Admin -> Bookings
export async function createBooking(input: BookingInput, guard?: FormGuard): Promise<CreateBookingResult> {
  // Bots: a hidden field was filled, or the form was sent instantly
  if (looksLikeBot(guard)) return { ok: false, error: GENERIC_ERROR }
  if (
    (await hit(`booking-ip:${await clientIp()}`, MAX_BOOKINGS_PER_IP, WINDOW_MS)) ||
    (await hit('booking-site', MAX_BOOKINGS_SITE, WINDOW_MS))
  ) {
    return { ok: false, error: 'Too many bookings right now. Please wait a few minutes or call us.' }
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
