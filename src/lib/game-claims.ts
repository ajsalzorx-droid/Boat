// Catbo Racing discount claims: a customer plays for a discount on their bill. Shared by the game
// (src/components/catbo-race), its server actions, and Admin -> Game Claims.
//
// The customer registers first (name, phone: one claim per phone number a day), then has
// CLAIM_CHANCES races. Only the latest race's score counts, even if it is lower: after a race they
// either keep that score ("Claim this score") or play the next chance, which replaces it. The
// score is the fish caught: every fish counts (discountFor). The claim gets a short code; staff
// find it in Admin -> Game Claims and apply it to the bill, once, within CLAIM_VALID_DAYS.

export const CLAIM_CHANCES = 2
export const CLAIM_VALID_DAYS = 7

// Fish caught -> discount on the bill: RATE.percent for every RATE.fish, bit by bit (each fish
// counts: 20 fish = 5 %, so 1 fish = 0.25 %, 2 fish = 0.5 %), up to MAX_DISCOUNT_PERCENT
export const RATE = { fish: 20, percent: 5 }
export const MAX_DISCOUNT_PERCENT = 10
export const PERCENT_PER_FISH = RATE.percent / RATE.fish

export function discountFor(fish: number) {
  const percent = Math.max(0, Math.floor(fish)) * PERCENT_PER_FISH
  return Math.min(MAX_DISCOUNT_PERCENT, Math.round(percent * 100) / 100)
}

// The fish that give the most discount (40 at 0.25 % a fish, up to 10 %)
export const FISH_FOR_MAX = Math.ceil(MAX_DISCOUNT_PERCENT / PERCENT_PER_FISH)

// "0.25", "5", "7.5": a discount written without needless zeros
export const formatPercent = (p: number) => String(Math.round(p * 100) / 100)

// The rule in one line, for the game and the admin page
export const RULES = `${RATE.fish} fish = ${RATE.percent}% off, every fish counts (1 fish = ${formatPercent(PERCENT_PER_FISH)}%), up to ${MAX_DISCOUNT_PERCENT}%`

// Claim codes: no 0/O, 1/I/L, so they are easy to read out at the till
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 6
export const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '')

export type ClaimStatus = 'open' | 'used' | 'expired'

// What the customer's game shows about their claim (never anyone else's phone number)
export type ClaimView = {
  claimId: string // the secret the customer's browser keeps to play its chances
  code: string // what they show at the till
  name: string
  chancesUsed: number
  chancesLeft: number
  fish: number | null // the latest race's fish (null = no race finished yet)
  metres: number | null
  percent: number
  locked: boolean // the score is kept: no more chances
  status: ClaimStatus
  expiresAt: string
}

export type ClaimPlayerInput = { name: string; phone: string; offers: boolean }

// Returns a message for the customer, or null when the details are fine
export function checkPlayer(p: ClaimPlayerInput): string | null {
  const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const name = s(p?.name)
  if (name.length < 2) return 'Please enter your name.'
  if (name.length > 60 || /[<>]/.test(name)) return 'Please enter a shorter name, letters only.'
  const phone = s(p?.phone)
  const digits = phone.replace(/\D/g, '')
  if (!phone) return 'Please enter your phone number.'
  if (!/^\+?[\d\s()-]+$/.test(phone) || digits.length < 7 || digits.length > 15)
    return 'Please enter a valid phone number, e.g. 050 123 4567.'
  return null
}
