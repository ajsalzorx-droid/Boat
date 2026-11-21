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
  // Table reservations: which table (TABLES id), or ANY_TABLE for the staff to choose
  table: string
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
// Last booking this long before closing (0 = up to closing time: 11 AM to 1 AM); same-day bookings
// at least MIN_NOTICE_MIN ahead
export const LAST_SLOT_BEFORE_CLOSE_MIN = 0
export const MIN_NOTICE_MIN = 30
// Fish preparation bookings ("Fish Preparation" tab on /book): false = hidden, and the server
// refuses them. Set back to true to offer it again.
export const FISH_PREP_ENABLED = false

// The restaurant's tables, for choosing one when booking: Inside 1-10 and Outside 1-36.
// id is what is saved ("in-3", "out-12"); the customer and staff see "Inside 3", "Outside 12".
// seats: the most guests a table takes. Not set = any group size; add it per table to limit one,
// e.g. { id: 'in-1', area: 'inside', number: 1, seats: 2 }.
export type TableArea = 'inside' | 'outside'
export type Table = { id: string; area: TableArea; number: number; seats?: number }
export const TABLE_AREAS: { area: TableArea; label: string; count: number }[] = [
  { area: 'inside', label: 'Inside', count: 10 },
  { area: 'outside', label: 'Outside', count: 36 },
]
export const TABLES: Table[] = TABLE_AREAS.flatMap(({ area, count }) =>
  Array.from({ length: count }, (_, i) => ({ id: `${area === 'inside' ? 'in' : 'out'}-${i + 1}`, area, number: i + 1 }))
)
// "Any table": no longer offered on the form; kept so older bookings that chose it still read right
export const ANY_TABLE = 'any'
// A booked table is kept this long: another booking can't take it within this many minutes
export const TABLE_HOLD_MIN = 120
// "in-3" -> "Inside 3"; older bookings saved "T5" -> "Table T5"
export const tableLabel = (id: string | null | undefined) => {
  if (!id || id === ANY_TABLE) return 'Any table'
  const t = TABLES.find((x) => x.id === id)
  return t ? `${TABLE_AREAS.find((a) => a.area === t.area)!.label} ${t.number}` : `Table ${id}`
}
// Does the table take a group this size?
export const fitsGroup = (t: Table, guests: number) => !t.seats || t.seats >= guests
// Tables that fit the group, apart from those already taken at that time
export const tablesFor = (guests: number, taken: string[] = []) => TABLES.filter((t) => fitsGroup(t, guests) && !taken.includes(t.id))
// Two booking times on the same date too close for one table
export const clashes = (a: string, b: string) => Math.abs(toMinutes(a) - toMinutes(b)) < TABLE_HOLD_MIN

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
// Minutes -> "HH:MM". Past midnight it keeps counting ("24:30" = 12:30 AM that night), so a late
// booking stays on the evening's date and sorts after 11:30 PM
const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
const AFTER_MIDNIGHT = 24 * 60
export const isAfterMidnight = (hhmm: string) => toMinutes(hhmm) >= AFTER_MIDNIGHT

// Booking times from opening to closing, every 30 minutes: with 11:00 to 01:00, 11:00 AM ... 1:00 AM.
// A close after midnight is that night: its times are "24:00", "24:30", "25:00" on the same date.
// On today's date only times at least MIN_NOTICE_MIN from now.
export function timeSlots(opens: string, closes: string, date: string, now = Date.now()) {
  const start = toMinutes(opens)
  let end = toMinutes(closes)
  if (end <= start) end += 24 * 60
  const today = dubaiNow(now)
  const earliest = date === today.date ? today.minutes + MIN_NOTICE_MIN : -1
  const slots: string[] = []
  const last = end - LAST_SLOT_BEFORE_CLOSE_MIN
  for (let m = start; m <= last; m += SLOT_MINUTES) {
    if (m >= earliest) slots.push(toHHMM(m))
  }
  return slots
}

// "19:30" -> "7:30 PM", "24:30" -> "12:30 AM"
export function formatTime(hhmm: string) {
  const m = toMinutes(hhmm)
  const h = Math.floor(m / 60) % 24
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

// For the time list: after midnight says so, so 12:30 AM isn't read as the morning
export const slotLabel = (hhmm: string) =>
  !isAfterMidnight(hhmm) ? formatTime(hhmm) : toMinutes(hhmm) === AFTER_MIDNIGHT ? `${formatTime(hhmm)} (midnight)` : `${formatTime(hhmm)} (after midnight)`

// The calendar day of the visit: a time after midnight is the next day ("2026-11-21" + "24:30" -> 22 Nov)
export const visitDate = (date: string, hhmm: string) => (isAfterMidnight(hhmm) ? addDays(date, 1) : date)

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
  if (b.type === 'fish' && !FISH_PREP_ENABLED) return 'Fish preparation bookings are not open right now. Please book a table.'

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

  if (b.type === 'table') {
    const table = s(b.table)
    if (!table) return 'Please choose a table.'
    const t = TABLES.find((x) => x.id === table)
    if (!t) return 'Please choose one of the tables shown.'
    if (!fitsGroup(t, guests)) return `${tableLabel(t.id)} seats up to ${t.seats}. Please choose a bigger table.`
  }

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

// "out-6" -> "Outside Table No. 6", as the WhatsApp messages say it
const tableNo = (id: string) => tableLabel(id).replace(/^(.+) (\d+)$/, '$1 Table No. $2')

// Sent on WhatsApp right after the customer books, before staff confirm it. Values for the
// approved booking_received template (src/lib/whatsapp-api.ts): customer_name, booking, date, time
// booking = "Outside Table No. 6 for 2 guests" ("a table for 2 guests" when none was chosen)
export function receivedMessage(b: { type: BookingType; name: string; guests: number; table?: string | null; fish_type: string | null; date: string; time: string }) {
  const guests = `${b.guests} ${b.guests === 1 ? 'guest' : 'guests'}`
  const what =
    b.type === 'fish'
      ? `fish preparation (${b.fish_type})`
      : b.table && b.table !== ANY_TABLE
        ? `${tableNo(b.table)} for ${guests}`
        : `a table for ${guests}`
  return [b.name, what, formatDate(visitDate(b.date, b.time)), formatTime(b.time)]
}

// The confirmation sent when staff confirm the booking, with any pre-ordered dishes and prices.
// text = the whole message written out (tap-to-send fallback).
// parts = values for the approved templates (src/lib/whatsapp-api.ts):
//   booking_confirmed:          customer_name, table_no, guests, date, time
//   booking_confirmed_preorder: the same, then dishes, total   (when dishes were pre-ordered)
// table_no = "Outside Table No. 6" ("Any available table" when none was chosen); guests = "2".
// Template values can't hold line breaks, so there the dishes are one line, comma separated.
export function confirmationMessage(b: {
  type: BookingType
  name: string
  guests: number
  table?: string | null
  fish_type: string | null
  date: string
  time: string
  items?: PreorderItem[] | null
  items_total?: number | null
}) {
  const items = b.items ?? []
  const table =
    b.type === 'fish' ? `Fish preparation (${b.fish_type})` : b.table && b.table !== ANY_TABLE ? tableNo(b.table) : 'Any available table'
  const base = [b.name, table, String(b.guests), formatDate(visitDate(b.date, b.time)), formatTime(b.time)]
  const contact = ' at +971 50 748 7220' // the number the WhatsApp templates give
  const say = (extra = '') =>
    `Hello ${base[0]}, your booking at Boat Seafood Restaurant is confirmed!\n\nTable: ${base[1]}\nGuests: ${base[2]}\nDate: ${base[3]}\nTime: ${base[4]}${extra}\n\nWe look forward to welcoming you!\nNeed help? Call or WhatsApp us${contact}.`
  if (!items.length) return { parts: base, preorderParts: null, text: say() }

  const lineTotal = (i: PreorderItem) => `AED ${formatPrice(Math.round(i.price * i.quantity * 100) / 100)}`
  const total = `AED ${formatPrice(b.items_total ?? Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100)}`
  const dishes = items.map((i) => `${i.quantity} x ${i.name} (${lineTotal(i)})`).join(', ')
  const count = items.reduce((s, i) => s + i.quantity, 0)
  return {
    // Basic template only (no pre-order template set up): the dishes are mentioned briefly
    parts: [base[0], `${table} (${count} pre-ordered ${count === 1 ? 'dish' : 'dishes'}, total ${total})`, ...base.slice(2)],
    preorderParts: [...base, dishes, total],
    text: say(`\n\nYour pre-order:\n${items.map((i) => `• ${i.quantity} x ${i.name} – ${lineTotal(i)}`).join('\n')}\nTotal: ${total}`),
  }
}
