'use server'

import { createHash, randomInt, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import type { Collection } from 'mongodb'
import { getDb, newId } from '@/lib/mongodb'
import { clientIp, hit, hits, looksLikeBot, type FormGuard } from '@/lib/rate-limit'
import { sendOtp, otpReady } from '@/lib/whatsapp-api'
import { dubaiNow, whatsappDigits } from '@/lib/bookings'
import {
  checkPlayer,
  CLAIM_CHANCES,
  CLAIM_VALID_DAYS,
  CODE_ALPHABET,
  CODE_LENGTH,
  discountFor,
  type ClaimPlayerInput,
  type ClaimView,
} from '@/lib/game-claims'

// The server side of playing Catbo Racing for a discount (rules: src/lib/game-claims.ts). Each
// chance is counted here before its race starts, so reloading the page gives no extra tries.
// The race itself runs in the browser, so a score is checked against the time the race really
// took: no more fish than could have swum by, no further than Catbo's top speed allows.
//
// The phone number is proved first: a 6-digit code goes to it on WhatsApp (sendClaimCode), and
// only typing that code back (verifyClaimCode) opens a claim. So nobody can play on a number that
// isn't theirs, and making up numbers gets no one anywhere. Getting more chances with more SIM
// cards is held back too: one device (a cookie) and one network (IP) can open only a few new
// claims a day, and every code sent is limited per number, per network and for the whole site
// (each WhatsApp message costs money).
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
  scored_chance: number // the chance the score below is from (0 = none yet)
  fish: number | null
  metres: number | null
  percent: number
  scored_at: Date | null
  locked: boolean
  status: 'open' | 'used'
  created_at: Date
  verified_at?: Date // the number was proved with a WhatsApp code
  expires_at: Date
  // filled in at the till (Admin -> Game Claims)
  used_at?: Date
  bill_no?: string
  bill_amount?: number
  discount_amount?: number
}

export type ClaimResult = { ok: true; claim: ClaimView } | { ok: false; error: string }

const GENERIC_ERROR = 'Something went wrong. Please try again in a moment.'
const WINDOW_MS = 10 * 60_000
const MAX_REGISTER_PER_IP = 8
const MAX_REGISTER_SITE = 300
// The WhatsApp code
const OTP_DIGITS = 6
const OTP_VALID_MS = 5 * 60_000
const OTP_MAX_TRIES = 5 // wrong codes before a new one must be sent
const OTP_RESEND_S = 30 // seconds before "Send again"
const OTP_PER_NUMBER = 3 // codes per number per OTP_WINDOW_MS
const OTP_PER_NUMBER_DAY = 6
const OTP_SITE = 150 // codes for the whole site per OTP_WINDOW_MS
const OTP_WINDOW_MS = 15 * 60_000
// New claims (different numbers) a day: per device, and per network. The restaurant's Wi-Fi is one
// network for every guest, so that limit is kept high; the device one does the work
const DAY_MS = 24 * 60 * 60_000
const NEW_CLAIMS_PER_DEVICE = 2
const NEW_CLAIMS_PER_IP = 40
const DEVICE_COOKIE = 'catbo_device'
// Limits for checking a score against the race's real time (see submitClaimScore)
const FISH_AT_START = 4 // fish already in the water when a race starts
const MIN_SECONDS_PER_FISH = 0.55 // new fish swim in at most this often
const MAX_METRES_PER_SECOND = 21 // Catbo's top speed is 20 m a second
const MAX_RACE_MS = 30 * 60_000

let indexes: Promise<unknown> | null = null
async function claims(): Promise<Collection<ClaimDoc>> {
  const col = (await getDb()).collection<ClaimDoc>('game_claims')
  indexes ??= Promise.all([
    col.createIndex({ phone: 1, day: 1 }, { unique: true }),
    col.createIndex({ code: 1 }, { unique: true }),
    col.createIndex({ created_at: -1 }),
  ]).catch((e) => {
    indexes = null
    console.error('game_claims indexes:', e)
  })
  await indexes
  return col
}

// Not exported: in a 'use server' file every exported function can be called from the browser
function toView(d: ClaimDoc): ClaimView {
  const expired = d.status === 'open' && d.expires_at.getTime() < Date.now()
  return {
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

type OtpDoc = {
  _id: string // the phone number, international digits
  hash: string
  tries: number
  name: string
  phone_typed: string
  offers: boolean
  sent_at: Date
  expires_at: Date
}

let otpIndex: Promise<unknown> | null = null
async function otpCodes(): Promise<Collection<OtpDoc>> {
  const col = (await getDb()).collection<OtpDoc>('game_otp')
  otpIndex ??= col.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }).catch((e) => {
    otpIndex = null
    console.error('game_otp index:', e)
  })
  return col // removed by MongoDB soon after they expire
}

const otpHash = (phone: string, code: string) => createHash('sha256').update(`${phone}:${code}`).digest('hex')

// "+971 •• ••• 4567": the number the code went to, without showing it all
const masked = (digits: string) => `+${digits.slice(0, 3)} ••• ${digits.slice(-4)}`

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

export type SendCodeResult = { ok: true; sentTo: string; resendInSeconds: number } | { ok: false; error: string }

// Step 1: the customer's name and number; a 6-digit code goes to that number on WhatsApp
export async function sendClaimCode(input: ClaimPlayerInput, guard?: FormGuard): Promise<SendCodeResult> {
  if (looksLikeBot(guard)) return { ok: false, error: GENERIC_ERROR }
  const problem = checkPlayer(input)
  if (problem) return { ok: false, error: problem }
  const devMode = process.env.NODE_ENV !== 'production'
  if (!otpReady() && !devMode) return { ok: false, error: 'Playing for a discount is not available right now. You can still play free!' }

  const phone = whatsappDigits(input.phone.trim())
  try {
    const col = await otpCodes()
    const last = await col.findOne({ _id: phone })
    if (last && Date.now() - last.sent_at.getTime() < OTP_RESEND_S * 1000)
      return { ok: false, error: 'A code was just sent. Please wait a moment before asking again.' }

    const ip = await clientIp()
    const over = await Promise.all([
      hit(`otp-number:${phone}`, OTP_PER_NUMBER, OTP_WINDOW_MS),
      hit(`otp-number-day:${phone}`, OTP_PER_NUMBER_DAY, DAY_MS),
      hit(`claim-ip:${ip}`, MAX_REGISTER_PER_IP, WINDOW_MS),
      hit('claim-site', MAX_REGISTER_SITE, WINDOW_MS),
      hit('otp-site', OTP_SITE, OTP_WINDOW_MS),
    ])
    if (over.some(Boolean)) return { ok: false, error: 'Too many codes asked for. Please wait a while and try again.' }

    const code = String(randomInt(0, 10 ** OTP_DIGITS)).padStart(OTP_DIGITS, '0')
    const now = new Date()
    await col.replaceOne(
      { _id: phone },
      { hash: otpHash(phone, code), tries: 0, name: input.name.trim(), phone_typed: input.phone.trim(), offers: !!input.offers, sent_at: now, expires_at: new Date(now.getTime() + OTP_VALID_MS) },
      { upsert: true }
    )
    if (otpReady()) {
      const sent = await sendOtp(phone, code)
      if (!sent.ok) {
        await col.deleteOne({ _id: phone })
        return { ok: false, error: 'We could not send a WhatsApp code to this number. Please check it is your WhatsApp number.' }
      }
    } else {
      // Development without the WhatsApp template: the code is shown in the server's terminal
      console.log(`[catbo] WhatsApp code for ${phone}: ${code} (WATI_OTP_TEMPLATE is not set, so nothing was sent)`)
    }
    return { ok: true, sentTo: masked(phone), resendInSeconds: OTP_RESEND_S }
  } catch (e) {
    console.error('sendClaimCode failed:', e)
    return { ok: false, error: GENERIC_ERROR }
  }
}

// Step 2: the code typed back. Right: today's claim for this number opens (or comes back)
export async function verifyClaimCode(phoneTyped: string, code: string): Promise<ClaimResult> {
  const phone = whatsappDigits(String(phoneTyped ?? '').trim())
  const typed = String(code ?? '').replace(/\D/g, '')
  if (typed.length !== OTP_DIGITS) return { ok: false, error: `Please enter the ${OTP_DIGITS}-digit code.` }
  try {
    const col = await otpCodes()
    // each try is counted before the check, so guessing stops after OTP_MAX_TRIES
    const otp = await col.findOneAndUpdate({ _id: phone, expires_at: { $gt: new Date() } }, { $inc: { tries: 1 } }, { returnDocument: 'after' })
    if (!otp) return { ok: false, error: 'This code has expired. Please ask for a new one.' }
    if (otp.tries > OTP_MAX_TRIES) {
      await col.deleteOne({ _id: phone })
      return { ok: false, error: 'Too many wrong codes. Please ask for a new one.' }
    }
    const right = timingSafeEqual(Buffer.from(otpHash(phone, typed)), Buffer.from(otp.hash))
    if (!right) return { ok: false, error: `That code is not right. ${OTP_MAX_TRIES - otp.tries} ${OTP_MAX_TRIES - otp.tries === 1 ? 'try' : 'tries'} left.` }
    await col.deleteOne({ _id: phone }) // a code works once
    return await claimFor(phone, otp)
  } catch (e) {
    console.error('verifyClaimCode failed:', e)
    return { ok: false, error: GENERIC_ERROR }
  }
}

// Today's claim for a proved number: the one it already has, or a new one (within the limits)
async function claimFor(phone: string, otp: OtpDoc): Promise<ClaimResult> {
  const day = dubaiNow().date
  const now = new Date()
  const col = await claims()
  let doc = await col.findOne({ phone, day })
  if (!doc) {
    const [device, ip] = await Promise.all([deviceId(), clientIp()])
    const [deviceCount, ipCount] = await Promise.all([hits(`claim-new-device:${device}`, DAY_MS), hits(`claim-new-ip:${ip}`, DAY_MS)])
    if (deviceCount >= NEW_CLAIMS_PER_DEVICE || ipCount >= NEW_CLAIMS_PER_IP)
      return { ok: false, error: 'This phone has already played for a discount with another number today. Come back tomorrow!' }
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
        expires_at: new Date(now.getTime() + CLAIM_VALID_DAYS * 86400000),
        verified_at: now,
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
    await Promise.all([hit(`claim-new-device:${device}`, NEW_CLAIMS_PER_DEVICE, DAY_MS), hit(`claim-new-ip:${ip}`, NEW_CLAIMS_PER_IP, DAY_MS)])
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
  if (otp.offers && !doc.offers) await col.updateOne({ _id: doc._id }, { $set: { offers: true } })
  return { ok: true, claim: toView(doc) }
}

// The claim as it is now (the game reopened later the same day)
export async function getClaim(claimId: string): Promise<ClaimResult> {
  try {
    const doc = await (await claims()).findOne({ _id: String(claimId) })
    if (!doc) return { ok: false, error: 'This claim was not found.' }
    return { ok: true, claim: toView(doc) }
  } catch (e) {
    console.error('getClaim failed:', e)
    return { ok: false, error: GENERIC_ERROR }
  }
}

// Counts one chance, before its race starts: from now it is used, even if the race is never finished
export async function startClaimChance(claimId: string): Promise<ClaimResult> {
  try {
    const now = new Date()
    const doc = await (await claims()).findOneAndUpdate(
      { _id: String(claimId), status: 'open', locked: false, chances_used: { $lt: CLAIM_CHANCES }, expires_at: { $gt: now } },
      { $inc: { chances_used: 1 }, $set: { chance_started_at: now } },
      { returnDocument: 'after' }
    )
    if (!doc) {
      const again = await getClaim(claimId)
      return again.ok ? { ok: false, error: 'No chances are left on this claim.' } : again
    }
    return { ok: true, claim: toView(doc) }
  } catch (e) {
    console.error('startClaimChance failed:', e)
    return { ok: false, error: GENERIC_ERROR }
  }
}

// The finished race's score: it replaces any earlier one (the latest counts). After the last chance
// the score is kept for good.
export async function submitClaimScore(claimId: string, chance: number, fish: number, metres: number): Promise<ClaimResult> {
  try {
    const col = await claims()
    const doc = await col.findOne({ _id: String(claimId) })
    if (!doc) return { ok: false, error: 'This claim was not found.' }
    if (doc.status !== 'open' || doc.locked || !doc.chance_started_at || doc.chances_used !== chance || doc.scored_chance === chance)
      return { ok: false, error: 'This race can no longer be scored.' }

    const elapsedMs = Date.now() - doc.chance_started_at.getTime()
    const seconds = elapsedMs / 1000
    const caught = Number(fish)
    const distance = Number(metres)
    if (!Number.isInteger(caught) || caught < 0 || !Number.isInteger(distance) || distance < 0 || elapsedMs > MAX_RACE_MS)
      return { ok: false, error: 'This score could not be checked.' }
    if (caught > FISH_AT_START + seconds / MIN_SECONDS_PER_FISH || distance > 2 + seconds * MAX_METRES_PER_SECOND)
      return { ok: false, error: 'This score could not be checked.' }

    const updated = await col.findOneAndUpdate(
      { _id: doc._id, chances_used: chance, scored_chance: { $ne: chance }, locked: false },
      {
        $set: {
          scored_chance: chance,
          fish: caught,
          metres: distance,
          percent: discountFor(caught),
          scored_at: new Date(),
          locked: chance >= CLAIM_CHANCES,
        },
      },
      { returnDocument: 'after' }
    )
    if (!updated) return { ok: false, error: 'This race can no longer be scored.' }
    return { ok: true, claim: toView(updated) }
  } catch (e) {
    console.error('submitClaimScore failed:', e)
    return { ok: false, error: GENERIC_ERROR }
  }
}

// "Claim this score": keeps the latest score, giving up the chances left
export async function keepClaimScore(claimId: string): Promise<ClaimResult> {
  try {
    const doc = await (await claims()).findOneAndUpdate(
      { _id: String(claimId), status: 'open', scored_chance: { $gt: 0 } },
      { $set: { locked: true } },
      { returnDocument: 'after' }
    )
    if (!doc) return getClaim(claimId)
    return { ok: true, claim: toView(doc) }
  } catch (e) {
    console.error('keepClaimScore failed:', e)
    return { ok: false, error: GENERIC_ERROR }
  }
}
