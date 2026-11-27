'use server'

import { checkOtp, issueOtp, OTP_DIGITS } from '@/lib/game-otp'
import { whatsappDigits } from '@/lib/bookings'
import { rememberPhone, verifiedPhone } from '@/lib/phone-verify'
import { clientIp, hit } from '@/lib/rate-limit'

// The "verify your WhatsApp number" step of the delivery and booking forms (src/components/PhoneVerify.tsx).
// The code comes from the game's WhatsApp code system (src/lib/game-otp.ts).

const VERIFY_PER_IP = 10 // code tries per visitor per window
const VERIFY_SITE = 300 // for the whole site per window
const WINDOW_MS = 15 * 60_000

// Has this device already proved this number? (asked before WhatsApp opens, so a returning
// customer isn't sent there for nothing)
export async function isPhoneVerified(phoneTyped: string): Promise<boolean> {
  const phone = whatsappDigits(String(phoneTyped ?? '').trim())
  if (phone.length < 7) return false
  try {
    return (await verifiedPhone()) === phone
  } catch (e) {
    console.error('isPhoneVerified failed:', e)
    return false
  }
}

export type VerifyResult = { ok: true } | { ok: false; error: string }

// The code the customer typed, for the number they typed
export async function verifyPhoneCode(phoneTyped: string, code: string): Promise<VerifyResult> {
  const phone = whatsappDigits(String(phoneTyped ?? '').trim())
  if (phone.length < 7 || phone.length > 15) return { ok: false, error: 'Please enter a valid phone number.' }
  const typed = String(code ?? '').replace(/\D/g, '')
  if (typed.length !== OTP_DIGITS) return { ok: false, error: `Please enter the ${OTP_DIGITS}-digit code.` }
  try {
    const [overIp, overSite] = await Promise.all([
      hit(`phone-verify-ip:${await clientIp()}`, VERIFY_PER_IP, WINDOW_MS),
      hit('phone-verify-site', VERIFY_SITE, WINDOW_MS),
    ])
    if (overIp || overSite) return { ok: false, error: 'Too many tries right now. Please wait a few minutes.' }
    const check = await checkOtp(phone, typed)
    if (!check.ok) return check
    await rememberPhone(phone)
    return { ok: true }
  } catch (e) {
    console.error('verifyPhoneCode failed:', e)
    return { ok: false, error: 'Could not check the code. Please try again.' }
  }
}

// Development only (the WhatsApp webhook can't reach a computer): makes a code as if "GET OTP" had
// been sent, and prints it in the server's terminal
export async function devPhoneCode(phoneTyped: string): Promise<{ ok: boolean }> {
  if (process.env.NODE_ENV === 'production') return { ok: false }
  const phone = whatsappDigits(String(phoneTyped ?? '').trim())
  if (phone.length < 7) return { ok: false }
  console.log(`[verify] Code for ${phone}: ${await issueOtp(phone)} (development: on the live site it comes on WhatsApp)`)
  return { ok: true }
}
