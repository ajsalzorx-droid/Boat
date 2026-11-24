'use server'

import { cookies } from 'next/headers'
import type { Collection } from 'mongodb'
import { getDb, newId } from '@/lib/mongodb'
import { clientIp, hit, hits, looksLikeBot, type FormGuard } from '@/lib/rate-limit'
import { randomInt } from 'node:crypto'
import { checkOtp, issueOtp, OTP_DIGITS } from '@/lib/game-otp'
import { isGameTablet } from '@/lib/game-tablet'
import { dropIfNoDiscount, playedToday } from '@/lib/game-played'
import { MIN_H, MIN_W, replayRace, STEP, type Input } from './sim'
import { dubaiNow, whatsappDigits } from '@/lib/bookings'
import {
  checkPlayer,
  checkSpot,
  type PlayerSpot,
  CLAIM_CHANCES,
  CLAIM_VALID_HOURS,
  CODE_ALPHABET,
  CODE_LENGTH,
  claimScore,
  discountFor,
  type RaceScore,
  type ClaimPlayerInput,
  type ClaimView,
} from '@/lib/game-claims'

// The server side of playing Catbo Racing for a discount (rules: src/lib/game-claims.ts). Each
// chance is counted here before its race starts, so reloading the page gives no extra tries.
// The race runs in the browser, but its score is never taken from it: the browser sends the race's
// record (each jump and cast, with the step it came on), and the server replays it with the rules
// in sim.ts and the seed it gave out when the race started. The replay's fish are the score. A race
// can't have more steps than the real time since it started, so it can't be fast-forwarded either.
//
// The phone number is proved first: the customer sends "GET OTP" to the restaurant's WhatsApp and
// gets a 6-digit code back in that chat (src/lib/game-otp.ts); only typing that code here
// (verifyClaimCode) opens a claim. So nobody can play on a number that isn't theirs, and made-up
// numbers get no one anywhere. More chances with more SIM cards are held back too: one device
// (a cookie) and one network (IP) can open only a few new claims a day, and a bill can take only
// one game discount however many claims a group brings (Admin -> Game Claims).
//
// "game_claims": one document per phone number per Dubai day. The phone number also goes into
// "bot_contacts", the list the offer broadcast reads (src/lib/offer-broadcast.ts): marked as
// agreeing to offers only when the customer ticked the box (WhatsApp requires that consent).

export type ClaimDoc = {
  _id: string // random: the customer's browser keeps it to play its chances
  code: string
  name: string
  phone: string // international digits, e.g. 971501234567
  phone_typed: string // as the customer typed it
  day: string // Dubai date of registering
  offers: boolean // ticked "send me offers on WhatsApp"
  chances_used: number
  chance_started_at: Date | null
  chance_seed?: number // the seed the race was given: its buoys, dolphins and fish (secret until it starts)
  scored_chance: number // the last race scored (0 = none yet)
  scores?: RaceScore[] // every race's result (claims from before this list have only fish/metres/percent)
  chosen_chance?: number | null // the race the customer chose; fish/metres/percent below are its, else the best
  fish: number | null
  metres: number | null
  percent: number
  scored_at: Date | null
  locked: boolean
  status: 'open' | 'used'
  created_at: Date
  verified_at?: Date // the number was proved with a WhatsApp code
  device_id?: string // the browser (cookie) it is played on: moves with a new WhatsApp code, else stays
  expires_at: Date
  // filled in at the till (Admin -> Game Claims)
  used_at?: Date
  bill_no?: string
  bill_key?: string // bill_no without spaces, in capitals: for "one game discount per bill"
  bill_amount?: number
  discount_amount?: number
}

export type ClaimResult = { ok: true; claim: ClaimView; seed?: number } | { ok: false; error: string }
// A race's record, from the browser (race.ts): the world's size, and every jump and cast
export type RaceRecord = { W: number; H: number; inputs: Input[] }

const GENERIC_ERROR = 'Something went wrong. Please try again in a moment.'
const WINDOW_MS = 10 * 60_000
const MAX_REGISTER_SITE = 300
// Codes typed in the game: tries per network (each code also allows only a few wrong tries)
const VERIFY_PER_IP = 30
const VERIFY_PER_TABLET = 200 // the restaurant's tablet
const VERIFY_WINDOW_MS = 15 * 60_000
// New claims (different numbers) a day: per device, and per network. The restaurant's Wi-Fi is one
// network for every guest, so that limit is kept high; the device one does the work
const DAY_MS = 24 * 60 * 60_000
const NEW_CLAIMS_PER_DEVICE = 2
const NEW_CLAIMS_PER_IP = 40
const DEVICE_COOKIE = 'catbo_device'
// Limits for checking a score against the race's real time (see submitClaimScore)
const MAX_RACE_MS = 30 * 60_000
const MAX_WORLD = 6000 // the largest world (units) a screen can give
const MAX_INPUTS = 40_000
const STEP_SLACK = 120 // steps (2 s) allowed over the real time, for the network
// A race can't take much longer in real time than in the game either: a game slowed down on purpose
// (a throttled computer, a doctored clock) would be easy to play. Pauses (switching apps) count too
const SLOW_FACTOR = 1.5
const SLOW_SLACK_S = 20 // seconds: the network, the start, the race-over card
const OTHER_DEVICE = 'This claim was opened on another phone. Get a new WhatsApp code to carry on here.'

let indexes: Promise<unknown> | null = null
async function claims(): Promise<Collection<ClaimDoc>> {
  const col = (await getDb()).collection<ClaimDoc>('game_claims')
  indexes ??= Promise.all([
    col.createIndex({ phone: 1, day: 1 }, { unique: true }),
    col.createIndex({ code: 1 }, { unique: true }),
    col.createIndex({ created_at: -1 }),
    // one game discount per bill: no two used claims share a bill (Admin -> Game Claims)
    col.createIndex({ bill_key: 1 }, { unique: true, partialFilterExpression: { status: 'used' } }),
  ]).catch((e) => {
    indexes = null
    console.error('game_claims indexes:', e)
  })
  await indexes
  return col
}

// Not exported: in a 'use server' file every exported function can be called from the browser
// The races a claim has scored (an older claim, from before every race was kept, has one)
const scoresOf = (d: ClaimDoc): RaceScore[] =>
  d.scores ?? (d.fish !== null && d.scored_chance ? [{ chance: d.scored_chance, fish: d.fish, metres: d.metres ?? 0, percent: d.percent }] : [])

function toView(d: ClaimDoc): ClaimView {
  const expired = d.status === 'open' && d.expires_at.getTime() < Date.now()
  return {
    scores: scoresOf(d),
    chosen: d.chosen_chance ?? null,
    claimId: d._id,
    code: d.code,
    name: d.name,
    chancesUsed: d.chances_used,
    chancesLeft: d.locked ? 0 : Math.max(0, CLAIM_CHANCES - d.chances_used),
    fish: d.fish,
    metres: d.metres,
    percent: d.percent,
    locked: d.locked,
    status: expired ? 'expired' : d.status,
    expiresAt: d.expires_at.toISOString(),
  }
}

const randomCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

// This browser's id (a cookie kept a year), for the "new claims a day per device" limit
async function deviceId() {
  const jar = await cookies()
  let id = jar.get(DEVICE_COOKIE)?.value
  if (!id || !/^[\w-]{20,64}$/.test(id)) {
    id = newId()
    jar.set(DEVICE_COOKIE, id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 365 * 86400, path: '/' })
  }
  return id
}

// The claim may be played only from the browser it was opened in (or moved to with a new code)
async function onThisDevice(doc: ClaimDoc) {
  return !doc.device_id || doc.device_id === (await cookies()).get(DEVICE_COOKIE)?.value
}

// The code from WhatsApp, typed in the game with the customer's name and number. Right: today's
// claim for this number opens (or comes back)
// spot: where the phone is (the browser's location): only at the restaurant (PLAY_AREA)
export async function verifyClaimCode(input: ClaimPlayerInput, code: string, guard?: FormGuard, spot?: PlayerSpot): Promise<ClaimResult> {
  if (looksLikeBot(guard)) return { ok: false, error: GENERIC_ERROR }
  const away = checkSpot(spot)
  if (away) return { ok: false, error: away }
  const problem = checkPlayer(input)
  if (problem) return { ok: false, error: problem }
  const typed = String(code ?? '').replace(/\D/g, '')
  if (typed.length !== OTP_DIGITS) return { ok: false, error: `Please enter the ${OTP_DIGITS}-digit code.` }
  const phone = whatsappDigits(input.phone.trim())
  try {
    const ip = await clientIp()
    const tablet = await isGameTablet()
    const [overIp, overSite] = await Promise.all([
      tablet ? hit(`otp-verify-tablet:${await deviceId()}`, VERIFY_PER_TABLET, VERIFY_WINDOW_MS) : hit(`otp-verify-ip:${ip}`, VERIFY_PER_IP, VERIFY_WINDOW_MS),
      hit('claim-site', MAX_REGISTER_SITE, WINDOW_MS),
    ])
    if (overIp || overSite) return { ok: false, error: 'Too many tries right now. Please wait a few minutes.' }
    const check = await checkOtp(phone, typed)
    if (!check.ok) return check
    return await claimFor(phone, { name: input.name.trim(), phone_typed: input.phone.trim(), offers: !!input.offers })
  } catch (e) {
    console.error('verifyClaimCode failed:', e)
    return { ok: false, error: GENERIC_ERROR }
  }
}

// Is the game running on the restaurant's tablet (src/lib/game-tablet.ts)?
export async function onGameTablet(): Promise<boolean> {
  try {
    return await isGameTablet()
  } catch (e) {
    console.error('onGameTablet failed:', e)
    return false
  }
}

// Development only (the WhatsApp webhook can't reach a computer): makes a code as if "GET OTP" had
// been sent, and prints it in the server's terminal
export async function devGameCode(phoneTyped: string): Promise<{ ok: boolean }> {
  if (process.env.NODE_ENV === 'production') return { ok: false }
  const phone = whatsappDigits(String(phoneTyped ?? '').trim())
  if (phone.length < 7) return { ok: false }
  console.log(`[catbo] Game code for ${phone}: ${await issueOtp(phone)} (development: on the live site it comes on WhatsApp)`)
  return { ok: true }
}

const PLAYED_TODAY = `This number has already played its ${CLAIM_CHANCES} races today. Come back tomorrow!`
const OTHER_NUMBER_TODAY = 'This phone has already played for a discount with another number today. Come back tomorrow!'
const PRECHECK_PER_IP = 40 // per VERIFY_WINDOW_MS

// Before WhatsApp opens: can this number still play today? The same answers claimFor gives after
// the code, so a customer who can't play isn't sent to WhatsApp for nothing. Only says yes or no
// (no name, no score). null = go ahead; claimFor still decides after the code.
export async function checkNumberToday(phoneTyped: string): Promise<{ error: string | null }> {
  const phone = whatsappDigits(String(phoneTyped ?? '').trim())
  if (phone.length < 7) return { error: null }
  try {
    if (await hit(`claim-precheck-ip:${await clientIp()}`, PRECHECK_PER_IP, VERIFY_WINDOW_MS)) return { error: null }
    const day = dubaiNow().date
    if (await (await claims()).findOne({ phone, day }, { projection: { _id: 1 } })) return { error: null } // today's claim comes back
    if (await playedToday(phone, day)) return { error: PLAYED_TODAY }
    if (await isGameTablet()) return { error: null } // many customers, one device
    const [deviceCount, ipCount] = await Promise.all([hits(`claim-new-device:${await deviceId()}`, DAY_MS), hits(`claim-new-ip:${await clientIp()}`, DAY_MS)])
    if (deviceCount >= NEW_CLAIMS_PER_DEVICE || ipCount >= NEW_CLAIMS_PER_IP) return { error: OTHER_NUMBER_TODAY }
    return { error: null }
  } catch (e) {
    console.error('checkNumberToday failed:', e)
    return { error: null }
  }
}

// Today's claim for a proved number: the one it already has, or a new one (within the limits)
type Player = { name: string; phone_typed: string; offers: boolean }
async function claimFor(phone: string, otp: Player): Promise<ClaimResult> {
  const day = dubaiNow().date
  const now = new Date()
  const col = await claims()
  let doc = await col.findOne({ phone, day })
  const device = await deviceId()
  // Played today already, with no discount (that claim is not kept): no new races today
  if (!doc && (await playedToday(phone, day)))
    return { ok: false, error: PLAYED_TODAY }
  if (!doc) {
    const ip = await clientIp()
    const tablet = await isGameTablet() // many customers, one device: no limit per device or network
    const [deviceCount, ipCount] = await Promise.all([hits(`claim-new-device:${device}`, DAY_MS), hits(`claim-new-ip:${ip}`, DAY_MS)])
    if (!tablet && (deviceCount >= NEW_CLAIMS_PER_DEVICE || ipCount >= NEW_CLAIMS_PER_IP))
      return { ok: false, error: OTHER_NUMBER_TODAY }
    for (let tries = 0; !doc && tries < 5; tries++) {
      const fresh: ClaimDoc = {
        _id: newId(),
        code: randomCode(),
        name: otp.name,
        phone,
        phone_typed: otp.phone_typed,
        day,
        offers: otp.offers,
        chances_used: 0,
        chance_started_at: null,
        scored_chance: 0,
        fish: null,
        metres: null,
        percent: 0,
        scored_at: null,
        locked: false,
        status: 'open',
        created_at: now,
        expires_at: new Date(now.getTime() + CLAIM_VALID_HOURS * 3600000),
        verified_at: now,
        device_id: device,
      }
      try {
        await col.insertOne(fresh)
        doc = fresh
      } catch (e) {
        if ((e as { code?: number }).code !== 11000) throw e
        doc = await col.findOne({ phone, day }) // opened at the same moment in another tab; else the code was taken: try another
      }
    }
    if (!doc) return { ok: false, error: GENERIC_ERROR }
    if (!tablet) await Promise.all([hit(`claim-new-device:${device}`, NEW_CLAIMS_PER_DEVICE, DAY_MS), hit(`claim-new-ip:${ip}`, NEW_CLAIMS_PER_IP, DAY_MS)])
  }

  // The number joins the customer list; agreeing to offers only if they ticked the box now
  // (an earlier YES is kept, and a NO given on WhatsApp is never overridden without a new tick)
  const contacts = (await getDb()).collection<{ _id: string; [k: string]: unknown }>('bot_contacts')
  await contacts.updateOne(
    { _id: phone },
    otp.offers
      ? { $set: { last_seen: now, opted_in: true, opted_in_at: now, name: otp.name }, $setOnInsert: { first_seen: now, source: 'game' }, $unset: { opted_out_at: '' } }
      : { $set: { last_seen: now }, $setOnInsert: { first_seen: now, opted_in: false, source: 'game', name: otp.name } },
    { upsert: true }
  )
  // A right code is proof of the number: the claim now plays on this browser (a new phone, say)
  const changes: Partial<ClaimDoc> = {}
  if (doc.device_id !== device) changes.device_id = device
  if (otp.offers && !doc.offers) changes.offers = true
  if (Object.keys(changes).length) await col.updateOne({ _id: doc._id }, { $set: changes })
  return { ok: true, claim: toView({ ...doc, ...changes }) }
}

// The claim as it is now (the game reopened later the same day)
export async function getClaim(claimId: string): Promise<ClaimResult> {
  try {
    const doc = await (await claims()).findOne({ _id: String(claimId) })
    if (!doc) return { ok: false, error: 'This claim was not found.' }
    if (!(await onThisDevice(doc))) return { ok: false, error: OTHER_DEVICE }
    return { ok: true, claim: toView(doc) }
  } catch (e) {
    console.error('getClaim failed:', e)
    return { ok: false, error: GENERIC_ERROR }
  }
}

// "New player": the customer before left, finished or not. This device can no longer play or see
// their claim. Nothing of theirs is lost: their races left and their discount stay with their number,
// and a new WhatsApp code brings the claim back, on this device or their own phone
const RELEASED = 'released' // never a device's id (those are longer)
export async function leaveClaim(claimId: string): Promise<{ ok: boolean }> {
  try {
    const col = await claims()
    const doc = await col.findOne({ _id: String(claimId) })
    if (!doc || !(await onThisDevice(doc))) return { ok: false }
    await col.updateOne({ _id: doc._id }, { $set: { device_id: RELEASED } })
    return { ok: true }
  } catch (e) {
    console.error('leaveClaim failed:', e)
    return { ok: false }
  }
}

// Counts one chance, before its race starts: from now it is used, even if the race is never finished.
// Every race is played at the restaurant too (spot: the phone's location, PLAY_AREA)
export async function startClaimChance(claimId: string, spot?: PlayerSpot): Promise<ClaimResult> {
  const away = checkSpot(spot)
  if (away) return { ok: false, error: away }
  try {
    const now = new Date()
    const col = await claims()
    const before = await col.findOne({ _id: String(claimId) })
    if (before && !(await onThisDevice(before))) return { ok: false, error: OTHER_DEVICE }
    const doc = await col.findOneAndUpdate(
      { _id: String(claimId), status: 'open', locked: false, chances_used: { $lt: CLAIM_CHANCES }, expires_at: { $gt: now } },
      { $inc: { chances_used: 1 }, $set: { chance_started_at: now, chance_seed: randomInt(0, 2 ** 31) } },
      { returnDocument: 'after' }
    )
    if (!doc) {
      const again = await getClaim(claimId)
      return again.ok ? { ok: false, error: 'No chances are left on this claim.' } : again
    }
    return { ok: true, claim: toView(doc), seed: doc.chance_seed }
  } catch (e) {
    console.error('startClaimChance failed:', e)
    return { ok: false, error: GENERIC_ERROR }
  }
}

// The finished race's score: it replaces any earlier one (the latest counts). After the last chance
// the score is kept for good.
export async function submitClaimScore(claimId: string, chance: number, race: RaceRecord): Promise<ClaimResult> {
  try {
    const col = await claims()
    const doc = await col.findOne({ _id: String(claimId) })
    if (!doc) return { ok: false, error: 'This claim was not found.' }
    if (!(await onThisDevice(doc))) return { ok: false, error: OTHER_DEVICE }
    if (doc.status !== 'open' || doc.locked || !doc.chance_started_at || doc.chances_used !== chance || doc.scored_chance === chance || doc.chance_seed === undefined)
      return { ok: false, error: 'This race can no longer be scored.' }

    // The record must look like a real race: a world a screen could give, inputs in order
    const W = Number(race?.W)
    const H = Number(race?.H)
    const inputs = Array.isArray(race?.inputs) ? race.inputs : null
    const fine =
      Number.isFinite(W) && Number.isFinite(H) && W >= MIN_W && H >= MIN_H && W <= MAX_WORLD && H <= MAX_WORLD &&
      inputs !== null && inputs.length <= MAX_INPUTS &&
      inputs.every((x, i) => Array.isArray(x) && Number.isInteger(x[0]) && x[0] >= 0 && (x[1] === 0 || x[1] === 1) && (i === 0 || x[0] >= inputs[i - 1][0]))
    const elapsedMs = Date.now() - doc.chance_started_at.getTime()
    if (!fine || elapsedMs > MAX_RACE_MS) return { ok: false, error: 'This race could not be checked.' }

    // The server plays the race again: no more steps than the real time allows
    const maxSteps = Math.floor(elapsedMs / 1000 / STEP) + STEP_SLACK
    const result = replayRace(W, H, doc.chance_seed, inputs as Input[], maxSteps)
    if (!result.over || !result.usedAllInputs) {
      console.warn(`Race not confirmed (claim ${doc.code}, race ${chance}): over=${result.over}, inputs used=${result.usedAllInputs}, steps=${result.steps}/${maxSteps}`)
      return { ok: false, error: 'This race could not be checked.' }
    }
    if (elapsedMs / 1000 > result.steps * STEP * SLOW_FACTOR + SLOW_SLACK_S) {
      console.warn(`Race too slow (claim ${doc.code}, race ${chance}): ${Math.round(elapsedMs / 1000)} s real, ${Math.round(result.steps * STEP)} s in the game`)
      return { ok: false, error: "This race didn't count: the game was paused or ran too slowly. Stay in the game until your race ends." }
    }
    const caught = result.fish
    const distance = result.metres

    // Every race is kept; the claim's score is the best so far until the customer chooses one
    const scores = [...scoresOf(doc), { chance, fish: caught, metres: distance, percent: discountFor(caught) }]
    const best = claimScore(scores, null)!
    const updated = await col.findOneAndUpdate(
      { _id: doc._id, chances_used: chance, scored_chance: { $ne: chance }, locked: false },
      { $set: { scored_chance: chance, scores, fish: best.fish, metres: best.metres, percent: best.percent, scored_at: new Date() } },
      { returnDocument: 'after' }
    )
    if (!updated) return { ok: false, error: 'This race can no longer be scored.' }
    // The last race, and still no discount: the claim is not kept (only "played today")
    await dropIfNoDiscount(updated)
    return { ok: true, claim: toView(updated) }
  } catch (e) {
    console.error('submitClaimScore failed:', e)
    return { ok: false, error: GENERIC_ERROR }
  }
}

// "Claim this score": the customer chooses one of their races for the discount (one only), giving up
// any race left. chance = which race; their best if not given
export async function keepClaimScore(claimId: string, chance?: number): Promise<ClaimResult> {
  try {
    const col = await claims()
    const current = await col.findOne({ _id: String(claimId), status: 'open', locked: false })
    if (!current) return getClaim(claimId)
    if (!(await onThisDevice(current))) return { ok: false, error: OTHER_DEVICE }
    const scores = scoresOf(current)
    const pick = chance ? scores.find((s) => s.chance === Number(chance)) : claimScore(scores, null)
    if (!pick) return { ok: false, error: 'Play a race first.' }
    const doc = await col.findOneAndUpdate(
      { _id: current._id, status: 'open', locked: false },
      { $set: { locked: true, chosen_chance: pick.chance, fish: pick.fish, metres: pick.metres, percent: pick.percent } },
      { returnDocument: 'after' }
    )
    if (!doc) return getClaim(claimId)
    await dropIfNoDiscount(doc) // a race with no discount chosen: nothing to keep
    return { ok: true, claim: toView(doc) }
  } catch (e) {
    console.error('keepClaimScore failed:', e)
    return { ok: false, error: GENERIC_ERROR }
  }
}
