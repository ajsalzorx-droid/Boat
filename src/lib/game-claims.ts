// Catbo Racing discount claims: a customer plays for a discount on their bill. Shared by the game
// (src/components/catbo-race), its server actions, and Admin -> Game Claims.
//
// The customer registers first (name, phone: one claim per phone number a day), then has
// CLAIM_CHANCES races a day per number. Every race's score is kept, and the customer chooses which
// one becomes their discount (one discount only): after a race they claim it, or play the next and
// then choose between them. Until they choose, the better score counts. The
// score is the fish caught, in steps (DISCOUNT_TIERS, discountFor). The claim gets a short code; staff
// find it in Admin -> Game Claims and apply it to the bill, once, within CLAIM_VALID_HOURS.

export const CLAIM_CHANCES: number = 3 // races a day per phone number
// "1 race a day" / "2 races a day", for the texts
export const chancesText = (n = CLAIM_CHANCES) => (n === 1 ? '1 race a day' : `${n} races a day`)
// What the customer sends to our WhatsApp to get a code (src/lib/game-otp.ts answers it)
export const OTP_REQUEST_TEXT = 'GET OTP'
export const CLAIM_VALID_HOURS = 24 // a claim must be used at the till within this many hours of registering

// Fish caught -> discount on the bill. At least MIN_FISH (25) in one race for any discount:
// 25 fish = 5 %. From there every fish counts, up to 15 % at 50 fish (0.4 % a fish: 30 fish =
// 7 %, 40 fish = 11 %). 50 fish or more: 15 %, the most. Fewer than 25: no discount.
// Highest first.
export const DISCOUNT_TIERS = [
  { fish: 50, percent: 15 },
  { fish: 25, percent: 5 },
] as const
export const MAX_DISCOUNT_PERCENT = DISCOUNT_TIERS[0].percent
export const MIN_FISH = DISCOUNT_TIERS[DISCOUNT_TIERS.length - 1].fish

export function discountFor(fish: number) {
  const n = Math.max(0, Math.floor(fish))
  if (n < MIN_FISH) return 0
  const steps = [...DISCOUNT_TIERS].reverse()
  for (let i = 1; i < steps.length; i++) {
    const [a, b] = [steps[i - 1], steps[i]]
    if (n < b.fish) return Math.round((a.percent + ((n - a.fish) * (b.percent - a.percent)) / (b.fish - a.fish)) * 100) / 100
  }
  return MAX_DISCOUNT_PERCENT
}

// The next step up from this many fish (null = the top one is reached), for "N more fish for X%"
export function nextTier(fish: number) {
  const n = Math.max(0, Math.floor(fish))
  return [...DISCOUNT_TIERS].reverse().find((t) => n < t.fish) ?? null
}

// "0.25", "5", "7.5": a discount written without needless zeros
export const formatPercent = (p: number) => String(Math.round(p * 100) / 100)

// The rule in one line, for the game and the admin page:
// "25 fish minimum = 5% off, every extra fish counts, up to 15% at 50 fish"
export const RULES = `${MIN_FISH} fish minimum = ${DISCOUNT_TIERS[DISCOUNT_TIERS.length - 1].percent}% off, every extra fish counts, up to ${MAX_DISCOUNT_PERCENT}% at ${DISCOUNT_TIERS[0].fish} fish`

// Claim codes: no 0/O, 1/I/L, so they are easy to read out at the till
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 6
export const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '')

export type ClaimStatus = 'open' | 'used' | 'expired'

// One race's result
export type RaceScore = { chance: number; fish: number; metres: number; percent: number }

// The score a claim gives: the one the customer chose, else the best so far (null = no race yet)
export function claimScore(scores: RaceScore[], chosen: number | null): RaceScore | null {
  if (chosen) return scores.find((s) => s.chance === chosen) ?? null
  return scores.reduce<RaceScore | null>((best, s) => (!best || s.fish > best.fish ? s : best), null)
}

// What the customer's game shows about their claim (never anyone else's phone number)
export type ClaimView = {
  claimId: string // the secret the customer's browser keeps to play its chances
  code: string // what they show at the till
  name: string
  chancesUsed: number
  chancesLeft: number
  scores: RaceScore[] // every race finished, in order
  chosen: number | null // the race the customer chose for their discount (null = not yet)
  fish: number | null // the claim's score: the chosen race, else the best (null = no race finished yet)
  metres: number | null
  percent: number
  locked: boolean // a score is chosen: no more races
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
