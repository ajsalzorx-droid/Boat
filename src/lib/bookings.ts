// Online booking forms (/book): table reservations and fish-preparation requests (the customer
// brings fish from the market, the chefs cook it). Shared by the form in the browser (mistakes
// show right away) and createBooking on the server (the check that counts).

import { formatPrice } from '@/lib/offers'

export type BookingType = 'table' | 'fish'
export type BookingStatus = 'new' | 'confirmed' | 'cancelled'

export type BookingInput = {
  type: BookingType
  name: string
  phone: string
  email: string
  date: string // "2026-11-01" (Dubai)
  time: string // "19:30" (Dubai)
  guests: number
  // Fish preparation only
  fish_type: string
  fish_weight: string // kg, "" = not sure
  style: string
  notes: string
  // Dishes pre-ordered from the menu (optional); names and prices are looked up on the server
  items: PreorderLine[]
}

export type PreorderLine = { id: string; quantity: number }

// A pre-ordered dish as saved with the booking (price = one portion, offer applied)
export type PreorderItem = { name: string; quantity: number; price: number }

export const MAX_PREORDER_LINES = 30
export const MAX_PREORDER_QTY = 20

export const MAX_GUESTS = 30
export const BOOK_DAYS_AHEAD = 60
export const SLOT_MINUTES = 30
// Last booking this long before closing; same-day bookings at least this far ahead
export const LAST_SLOT_BEFORE_CLOSE_MIN = 60
export const MIN_NOTICE_MIN = 30
// Offered when the customer isn't sure how the fish should be cooked
export const CHEF_CHOICE = "Chef's choice"

const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000

// Today's date and the minutes since midnight, in Dubai
export function dubaiNow(now = Date.now()) {
  const d = new Date(now + DUBAI_OFFSET_MS)
  return { date: d.toISOString().slice(0, 10), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() }
}

export function addDays(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10)
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const toHHMM = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

// Booking times from opening to an hour before closing, every 30 minutes ("00:00" close = midnight).
// On today's date only times at least MIN_NOTICE_MIN from now.
export function timeSlots(opens: string, closes: string, date: string, now = Date.now()) {
  const start = toMinutes(opens)
  let end = toMinutes(closes)
  if (end <= start) end += 24 * 60
  const today = dubaiNow(now)
  const earliest = date === today.date ? today.minutes + MIN_NOTICE_MIN : -1
  const slots: string[] = []
  for (let m = start; m <= end - LAST_SLOT_BEFORE_CLOSE_MIN; m += SLOT_MINUTES) {
    if (m >= earliest) slots.push(toHHMM(m))
  }
  return slots
}

// "19:30" -> "7:30 PM"
export function formatTime(hhmm: string) {
  const m = toMinutes(hhmm)
  const h = Math.floor(m / 60) % 24
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

// "2026-11-01" -> "Sun, 1 Nov 2026"
export function formatDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

// A UAE mobile typed locally ("050 123 4567") -> international digits for WhatsApp ("971501234567")
export function whatsappDigits(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (phone.trim().startsWith('+')) return digits
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.startsWith('0') && digits.length === 10) return `971${digits.slice(1)}`
  return digits
}

// Returns a message for the customer, or null when the booking is fine
export function checkBooking(b: BookingInput, hours: { opens: string; closes: string }, now = Date.now()): string | null {
  const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  if (b?.type !== 'table' && b?.type !== 'fish') return 'Please choose what you would like to book.'

  const name = s(b.name)
  if (name.length < 2) return 'Please enter your name.'
  if (name.length > 60 || /[<>]/.test(name)) return 'Please enter a shorter name, letters only.'

  const phone = s(b.phone)
  const digits = phone.replace(/\D/g, '')
  if (!phone) return 'Please enter your phone number.'
  if (!/^\+?[\d\s()-]+$/.test(phone) || digits.length < 7 || digits.length > 15)
    return 'Please enter a valid phone number, e.g. 050 123 4567.'

  const email = s(b.email)
  if (email && (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return 'Please enter a valid email address, or leave it empty.'

  const date = s(b.date)
  const today = dubaiNow(now).date
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return 'Please choose a date.'
  if (date < today) return 'Please choose today or a later date.'
  if (date > addDays(today, BOOK_DAYS_AHEAD)) return `Bookings open up to ${BOOK_DAYS_AHEAD} days ahead.`

  const time = s(b.time)
  if (!time) return 'Please choose a time.'
  if (!timeSlots(hours.opens, hours.closes, date, now).includes(time))
    return date === today ? 'That time has passed or is too soon. Please choose a later time.' : 'Please choose one of the times shown.'

  const guests = Number(b.guests)
  if (!Number.isInteger(guests) || guests < 1 || guests > MAX_GUESTS)
    return `Number of guests must be 1 to ${MAX_GUESTS}. For bigger groups please call us.`

  if (b.type === 'fish') {
    const fish = s(b.fish_type)
    if (fish.length < 2) return 'Please tell us which fish you are bringing.'
    if (fish.length > 60 || /[<>]/.test(fish)) return 'Please enter a shorter fish name.'
    const weight = s(b.fish_weight)
    if (weight && !(Number(weight) > 0 && Number(weight) <= 50)) return 'Weight must be a number of kg up to 50, or leave it empty.'
    const style = s(b.style)
    if (!style) return 'Please choose how you would like it cooked.'
    if (style.length > 40) return 'Please choose a cooking style from the list.'
  }

  const items = b.items ?? []
  if (!Array.isArray(items) || items.length > MAX_PREORDER_LINES) return `You can pre-order up to ${MAX_PREORDER_LINES} different dishes.`
  for (const line of items) {
    if (typeof line?.id !== 'string' || !line.id) return 'Please choose the dishes again.'
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_PREORDER_QTY)
      return `Each dish can be ordered 1 to ${MAX_PREORDER_QTY} times.`
  }

  if (s(b.notes).length > 500) return 'Notes are too long (max 500 characters).'
  return null
}

// The confirmation sent to the customer on WhatsApp, with their pre-ordered dishes and prices.
// text = the whole message written out (tap-to-send fallback).
// parts = values for the approved templates (src/lib/whatsapp-api.ts):
//   booking_confirmed (4):          name, what, date, time
//   booking_confirmed_preorder (6): name, what, date, time, dishes, total   (when dishes were pre-ordered)
// Template values can't hold line breaks, so there the dishes are one line, comma separated.
export function confirmationMessage(b: {
  type: BookingType
  name: string
  guests: number
  fish_type: string | null
  date: string
  time: string
  items?: PreorderItem[] | null
  items_total?: number | null
}) {
  const items = b.items ?? []
  const what = b.type === 'fish' ? `your fish preparation (${b.fish_type})` : `your table for ${b.guests}`
  const base = [b.name, what, formatDate(b.date), formatTime(b.time)]
  const intro = `Hello ${base[0]}, this is Boat Seafood Restaurant. We confirm ${base[1]} on ${base[2]} at ${base[3]}.`
  if (!items.length) return { parts: base, preorderParts: null, text: `${intro} See you soon!` }

  const lineTotal = (i: PreorderItem) => `AED ${formatPrice(Math.round(i.price * i.quantity * 100) / 100)}`
  const total = `AED ${formatPrice(b.items_total ?? Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100)}`
  const dishes = items.map((i) => `${i.quantity} x ${i.name} (${lineTotal(i)})`).join(', ')
  const count = items.reduce((s, i) => s + i.quantity, 0)
  return {
    // Basic template only (no pre-order template set up): the dishes are mentioned briefly
    parts: [base[0], `${what} with ${count} pre-ordered ${count === 1 ? 'dish' : 'dishes'} (total ${total})`, base[2], base[3]],
    preorderParts: [...base, dishes, total],
    text: `${intro}\n\nYour pre-order:\n${items.map((i) => `• ${i.quantity} x ${i.name} – ${lineTotal(i)}`).join('\n')}\nTotal: ${total}\n\nSee you soon!`,
  }
}
