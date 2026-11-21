import 'server-only'
import { createHash, randomInt, timingSafeEqual } from 'node:crypto'
import type { Collection } from 'mongodb'
import { getDb } from '@/lib/mongodb'
import { hit } from '@/lib/rate-limit'
import { sendText, whatsappChatReady } from '@/lib/whatsapp-api'
import { rememberOwnMessage, type WatiEvent } from '@/lib/chatbot'
export { OTP_REQUEST_TEXT } from '@/lib/game-claims'

// The code that proves a phone number for Catbo Racing discounts, asked for by the customer:
// they send "GET OTP" to the restaurant's WhatsApp (the game opens WhatsApp with it typed), and the
// reply in that chat is a 6-digit code, which they type into the game (claims.ts, verifyClaimCode).
//
// Why this way round: WhatsApp itself proves who sent a message, the code only ever goes back to
// that same number, and a reply to a customer's own message is free (no template, no approval).
// Nobody can have codes sent to someone else's number, and a forged webhook call gets the forger
// nothing: the code still goes to the real owner of the number.
//
// "game_otp": one code per number, stored only as a hash, removed by MongoDB when it expires.

export const OTP_DIGITS = 6
export const OTP_VALID_MS = 5 * 60_000
export const OTP_MAX_TRIES = 5 // wrong codes before a new one must be asked for
const OTP_PER_NUMBER = 3 // codes per number per OTP_WINDOW_MS
const OTP_PER_NUMBER_DAY = 8
const OTP_SITE = 300 // codes for the whole site per OTP_WINDOW_MS
const OTP_WINDOW_MS = 15 * 60_000
const DAY_MS = 24 * 60 * 60_000
const MAX_MESSAGE_AGE_S = 10 * 60 // an old message delivered late gets no code

export type OtpDoc = {
  _id: string // the phone number, international digits
  hash: string
  tries: number
  sent_at: Date
  expires_at: Date
}

let otpIndex: Promise<unknown> | null = null
export async function otpCodes(): Promise<Collection<OtpDoc>> {
  const col = (await getDb()).collection<OtpDoc>('game_otp')
  otpIndex ??= col.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }).catch((e) => {
    otpIndex = null
    console.error('game_otp index:', e)
  })
  return col
}

const otpHash = (phone: string, code: string) => createHash('sha256').update(`${phone}:${code}`).digest('hex')

// A new code for this number (the last one stops working)
export async function issueOtp(phone: string) {
  const code = String(randomInt(0, 10 ** OTP_DIGITS)).padStart(OTP_DIGITS, '0')
  const now = new Date()
  await (await otpCodes()).replaceOne(
    { _id: phone },
    { hash: otpHash(phone, code), tries: 0, sent_at: now, expires_at: new Date(now.getTime() + OTP_VALID_MS) },
    { upsert: true }
  )
  return code
}

export type OtpCheck = { ok: true } | { ok: false; error: string }

// The code typed in the game. Each try is counted before the check, so guessing stops after
// OTP_MAX_TRIES; a right code works once
export async function checkOtp(phone: string, typed: string): Promise<OtpCheck> {
  const col = await otpCodes()
  const otp = await col.findOneAndUpdate({ _id: phone, expires_at: { $gt: new Date() } }, { $inc: { tries: 1 } }, { returnDocument: 'after' })
  if (!otp) return { ok: false, error: 'No code is waiting for this number, or it has expired. Send GET OTP to us on WhatsApp for a new one.' }
  if (otp.tries > OTP_MAX_TRIES) {
    await col.deleteOne({ _id: phone })
    return { ok: false, error: 'Too many wrong codes. Send GET OTP to us on WhatsApp for a new one.' }
  }
  if (!timingSafeEqual(Buffer.from(otpHash(phone, typed)), Buffer.from(otp.hash))) {
    const left = OTP_MAX_TRIES - otp.tries
    return { ok: false, error: `That code is not right. ${left} ${left === 1 ? 'try' : 'tries'} left.` }
  }
  await col.deleteOne({ _id: phone })
  return { ok: true }
}

// "GET OTP", and the ways people may type it ("get otp", "OTP", "share my otp", "get code")
const ASKS = new Set(['GETOTP', 'OTP', 'SHAREMYOTP', 'SENDOTP', 'GETCODE', 'GAMECODE', 'MYOTP'])
const isRequest = (text: string) => ASKS.has(text.toUpperCase().replace(/[^A-Z]/g, ''))

// Only the 6 digits, so the customer can copy it straight into the game
const replyText = (code: string) => code

// A WhatsApp message from Wati's webhook. true = it asked for a game code and was answered here
// (the chatbot then leaves it alone). Works for every number, whatever the chatbot's own settings.
export async function handleOtpRequest(event: WatiEvent): Promise<boolean> {
  if (!whatsappChatReady()) return false
  const customer = ['message', 'messageReceived', 'message_bsuid'].includes(String(event.eventType ?? '')) && event.owner !== true
  if (!customer || !isRequest(String(event.text ?? ''))) return false

  const phone = String(event.waId ?? '').replace(/\D/g, '')
  const messageId = event.whatsappMessageId || event.id
  const age = Date.now() / 1000 - Number(event.timestamp)
  if (!phone || !messageId || !(age <= MAX_MESSAGE_AGE_S)) return true // not answered, and not for the chatbot either

  // Wati may deliver the same message twice: only the first gets a code
  const [repeat, overNumber, overNumberDay, overSite] = await Promise.all([
    hit(`otp-msg:${messageId}`, 1, DAY_MS),
    hit(`otp-number:${phone}`, OTP_PER_NUMBER, OTP_WINDOW_MS),
    hit(`otp-number-day:${phone}`, OTP_PER_NUMBER_DAY, DAY_MS),
    hit('otp-site', OTP_SITE, OTP_WINDOW_MS),
  ])
  if (repeat) return true
  const target = event.channelPhoneNumber ? `${event.channelPhoneNumber}:${event.waId}` : phone
  // Noted first, so the chatbot knows the reply is ours when Wati reports it back (not staff
  // taking over the chat, which would silence the chatbot there for hours)
  const reply = async (text: string) => {
    await rememberOwnMessage(event, text).catch((e) => console.error('Game code: chat note failed:', e))
    return sendText(target, text)
  }
  if (overNumber || overNumberDay || overSite) {
    await reply('You have asked for several codes just now. Please wait a few minutes and send GET OTP again.')
    return true
  }
  const code = await issueOtp(phone)
  const sent = await reply(replyText(code))
  if (!sent.ok) {
    console.error('Game code reply failed:', sent.error)
    await (await otpCodes()).deleteOne({ _id: phone })
  }
  return true
}
