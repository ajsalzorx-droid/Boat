import 'server-only'
import type { Db, Filter, Document } from 'mongodb'
import { toPlain } from '@/lib/mongodb'
import { CODE_LENGTH, normalizeCode } from '@/lib/game-claims'
import { dropNoDiscountClaims } from '@/lib/game-played'
import type { ClaimDoc } from '@/components/catbo-race/claims'
import type { DailyCatchRow, GameClaimFilter, GameClaimRow, MenuItemRow } from '@/app/admin/actions'

// Paged, searchable lists for the admin tables (Menu, Daily Catch). Used by the Server Actions
// and by the GET routes under /api/admin, which the search box calls (those can be aborted).

export const MAX_SEARCH_LENGTH = 60

export type ListQuery = { page: number; pageSize: number; search?: string }

function paging({ page, pageSize }: ListQuery) {
  const size = Math.min(Math.max(Math.floor(pageSize) || 10, 1), 100)
  const skip = Math.max(Math.floor(page) || 0, 0) * size
  return { size, skip }
}

// Case-insensitive "contains" on any of the fields. The text is escaped, so it is matched
// literally (no regex injection), and capped in length.
function searchFilter(search: string | undefined, fields: string[]): Filter<Document> {
  const q = String(search ?? '').trim().slice(0, MAX_SEARCH_LENGTH)
  if (!q) return {}
  const pattern = escapeRegex(q)
  return { $or: fields.map((f) => ({ [f]: { $regex: pattern, $options: 'i' } })) }
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Dishes, newest first. Search: name, category, tag, ingredients
export async function queryMenuItems(db: Db, query: ListQuery) {
  const { size, skip } = paging(query)
  const filter = searchFilter(query.search, ['name', 'category', 'tag', 'ingredients'])
  const items = db.collection('menu_items')
  const [docs, total] = await Promise.all([
    items.find(filter).sort({ created_at: -1, _id: 1 }).skip(skip).limit(size).toArray(),
    items.countDocuments(filter),
  ])
  return { items: docs.map((d) => toPlain(d) as unknown as MenuItemRow), total }
}

// ---------- Game claims ----------

export const claimRow = (d: ClaimDoc): GameClaimRow => ({
  id: d._id,
  code: d.code,
  name: d.name,
  phone: d.phone_typed,
  phone_digits: d.phone,
  offers: !!d.offers,
  day: d.day,
  chances_used: d.chances_used,
  scores: d.scores ?? (d.fish !== null && d.scored_chance ? [{ chance: d.scored_chance, fish: d.fish, metres: d.metres ?? 0, percent: d.percent }] : []),
  chosen_chance: d.chosen_chance ?? null,
  fish: d.fish,
  metres: d.metres,
  percent: d.percent,
  locked: d.locked,
  status: d.status === 'open' && d.expires_at.getTime() < Date.now() ? 'expired' : d.status,
  created_at: d.created_at.toISOString(),
  expires_at: d.expires_at.toISOString(),
  used_at: d.used_at ? d.used_at.toISOString() : null,
  bill_no: d.bill_no ?? null,
  bill_amount: d.bill_amount ?? null,
  discount_amount: d.discount_amount ?? null,
})

const CLAIM_FILTERS: GameClaimFilter[] = ['ready', 'used', 'all']

// One page of claims, newest first, plus the count per status for the filter buttons.
// search = a claim code or (part of) a phone number. ready = a discount waiting to be used at
// the till; used = applied to a bill.
export async function queryGameClaims(db: Db, query: ListQuery & { filter?: string }) {
  // No-discount claims are not kept: finished or expired ones go first (src/lib/game-played.ts)
  await dropNoDiscountClaims(db).catch((e) => console.error('dropNoDiscountClaims failed:', e))
  const filter: GameClaimFilter = CLAIM_FILTERS.includes(query.filter as GameClaimFilter) ? (query.filter as GameClaimFilter) : 'ready'
  const { size, skip } = paging(query)
  const now = new Date()
  const q = String(query.search ?? '').trim().slice(0, 40)
  const code = normalizeCode(q)
  const digits = q.replace(/\D/g, '')
  const find: Record<string, unknown> = {}
  if (q) {
    // Live search: any part of the code, the phone number or the customer's name, from the
    // first letter typed
    const or: Record<string, unknown>[] = [{ name: { $regex: escapeRegex(q), $options: 'i' } }]
    if (code.length === CODE_LENGTH) or.push({ code })
    else if (code) or.push({ code: { $regex: code } }) // A-Z 0-9 only: safe in a regex
    // a local number typed at the till ("050 123 4567") matches the saved international digits
    // (digits only, so safe inside a regex)
    if (digits) or.push({ phone: { $regex: digits.length >= 4 && digits.startsWith('0') ? digits.slice(1) : digits } })
    find.$or = or
  }
  const ready = { status: 'open' as const, percent: { $gt: 0 }, expires_at: { $gt: now } }
  const where = { ...find, ...(filter === 'ready' ? ready : filter === 'used' ? { status: 'used' } : {}) }
  const col = db.collection<ClaimDoc>('game_claims')
  const [docs, total, readyCount, usedCount, allCount, offersCount] = await Promise.all([
    col.find(where).sort({ created_at: -1, _id: 1 }).skip(skip).limit(size).toArray(),
    col.countDocuments(where),
    col.countDocuments({ ...find, ...ready }),
    col.countDocuments({ ...find, status: 'used' }),
    col.countDocuments(find),
    db.collection('bot_contacts').countDocuments({ source: 'game', opted_in: true }),
  ])
  return { claims: docs.map(claimRow), total, counts: { ready: readyCount, used: usedCount, all: allCount }, offersCount }
}

// Daily catch, last edited first. Search: name, origin
export async function queryDailyCatch(db: Db, query: ListQuery) {
  const { size, skip } = paging(query)
  const filter = searchFilter(query.search, ['name', 'origin'])
  const catches = db.collection('daily_catch')
  const [docs, total] = await Promise.all([
    catches.find(filter).sort({ updated_at: -1, _id: 1 }).skip(skip).limit(size).toArray(),
    catches.countDocuments(filter),
  ])
  return { items: docs.map((d) => toPlain(d) as unknown as DailyCatchRow), total }
}
