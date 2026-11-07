import 'server-only'
import { randomUUID } from 'node:crypto'

// Sends WhatsApp messages from the restaurant's own number through Wati (no tap needed):
// booking confirmations (templates) and the assistant's replies (sendText, src/lib/chatbot.ts).
// Set up in Wati, then in .env.local (server only, never NEXT_PUBLIC_):
//   WATI_API_HOST              host only, e.g. https://live-mt-server.wati.io (no tenant id, no /api)
//   WATI_API_TOKEN             Wati -> Connector -> API -> Create API Token (messagetemplatev3:write)
//   WATI_CONFIRM_TEMPLATE      approved template, e.g. booking_confirmed
//   WATI_PREORDER_TEMPLATE     (optional) template with the dishes, e.g. booking_confirmed_preorder
// Messages the restaurant starts must use approved templates, with these exact variable names:
//   booking_confirmed:
//     Hello {{customer_name}}, this is Boat Seafood Restaurant. We confirm {{booking}} on {{date}}
//     at {{time}}. See you soon!
//   booking_confirmed_preorder: the same, then
//     Your pre-order: {{dishes}}. Total: {{total}}. See you soon!
// Without the pre-order template, bookings with dishes use booking_confirmed (dish count + total).

const CONFIRM_PARAMS = ['customer_name', 'booking', 'date', 'time']
const PREORDER_PARAMS = [...CONFIRM_PARAMS, 'dishes', 'total']

export function whatsappApiReady() {
  return !!(process.env.WATI_API_HOST && process.env.WATI_API_TOKEN && process.env.WATI_CONFIRM_TEMPLATE)
}

export type SendResult = { ok: true } | { ok: false; error: string }

type WatiRecipient = { errors?: unknown[] }
type WatiResponse = { success?: boolean; error?: unknown; message?: unknown; recipients?: WatiRecipient[] }

// Template confirmations also need WATI_CONFIRM_TEMPLATE; plain replies need only these two
export const whatsappChatReady = () => !!(process.env.WATI_API_HOST && process.env.WATI_API_TOKEN)

// While set, the assistant and offer messages reach only these numbers
export const botTestNumbers = () =>
  (process.env.WATI_BOT_TEST_NUMBERS ?? '').split(',').map((n) => n.replace(/\D/g, '')).filter(Boolean)

const errorText = (e: unknown) => (typeof e === 'string' ? e : e ? JSON.stringify(e) : '')

// to = international digits without + (e.g. 971501234567); params = template variables by name
async function sendTemplate(to: string, template: string, params: Record<string, string>): Promise<SendResult> {
  if (!whatsappApiReady()) return { ok: false, error: 'WhatsApp API is not set up.' }
  const host = process.env.WATI_API_HOST!.replace(/\/+$/, '')
  try {
    const res = await fetch(`${host}/api/ext/v3/messageTemplates/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WATI_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_name: template,
        broadcast_name: `${template}-${new Date().toISOString().slice(0, 10)}`,
        recipients: [
          {
            target: to,
            local_message_id: randomUUID(),
            custom_params: Object.entries(params).map(([name, value]) => ({ name, value })),
          },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    })
    const body = (await res.json().catch(() => null)) as WatiResponse | null
    // HTTP 200 can still carry success=false or recipient errors, so all of these are checked
    const recipient = body?.recipients?.[0]
    const problem =
      !res.ok || !body?.success
        ? errorText(body?.error) || errorText(body?.message) || `WhatsApp error ${res.status}`
        : !recipient
          ? 'WhatsApp did not accept this number.'
          : recipient.errors?.length
            ? errorText(recipient.errors[0])
            : ''
    if (!problem) return { ok: true }
    console.error('WhatsApp send failed:', res.status, JSON.stringify(body))
    return { ok: false, error: problem.slice(0, 200) }
  } catch (e) {
    console.error('WhatsApp send failed:', e)
    return { ok: false, error: 'Could not reach WhatsApp. Please try again.' }
  }
}

// A plain reply inside the 24 hours after the customer's last message (no template needed).
// target = international digits, or a Wati conversation id. Accepted is not yet delivered.
export async function sendText(target: string, text: string): Promise<SendResult> {
  if (!whatsappChatReady()) return { ok: false, error: 'WhatsApp API is not set up.' }
  const host = process.env.WATI_API_HOST!.replace(/\/+$/, '')
  try {
    const res = await fetch(`${host}/api/ext/v3/conversations/messages/text`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WATI_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, text }),
      signal: AbortSignal.timeout(15_000),
    })
    if (res.ok) return { ok: true }
    const body = await res.text().catch(() => '')
    return { ok: false, error: `WhatsApp error ${res.status}: ${body.slice(0, 200)}` }
  } catch (e) {
    console.error('WhatsApp send failed:', e)
    return { ok: false, error: 'Could not reach WhatsApp.' }
  }
}

// One template to many people in a single call (Wati takes up to 10,000 recipients).
// accepted = taken by Wati, which isn't yet delivered.
export async function sendTemplateToMany(template: string, broadcast: string, recipients: { target: string; params: Record<string, string> }[]) {
  if (!whatsappChatReady()) return { ok: false as const, error: 'WhatsApp API is not set up.' }
  const host = process.env.WATI_API_HOST!.replace(/\/+$/, '')
  try {
    const res = await fetch(`${host}/api/ext/v3/messageTemplates/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WATI_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_name: template,
        broadcast_name: broadcast,
        recipients: recipients.map((r) => ({
          target: r.target,
          local_message_id: randomUUID(),
          custom_params: Object.entries(r.params).map(([name, value]) => ({ name, value })),
        })),
      }),
      signal: AbortSignal.timeout(60_000),
    })
    const body = (await res.json().catch(() => null)) as WatiResponse | null
    if (!res.ok || !body?.success) {
      console.error('WhatsApp broadcast failed:', res.status, JSON.stringify(body)?.slice(0, 300))
      return { ok: false as const, error: (errorText(body?.error) || errorText(body?.message) || `WhatsApp error ${res.status}`).slice(0, 200) }
    }
    const rejected = (body.recipients ?? []).filter((r) => r.errors?.length).length
    return { ok: true as const, accepted: (body.recipients?.length ?? 0) - rejected, rejected }
  } catch (e) {
    console.error('WhatsApp broadcast failed:', e)
    return { ok: false as const, error: 'Could not reach WhatsApp. Check Wati before sending again.' }
  }
}

const named = (names: string[], values: string[]) => Object.fromEntries(names.map((n, i) => [n, values[i]]))

// Booking confirmation: with the dishes and total when the pre-order template is set up
export function sendConfirmation(to: string, message: { parts: string[]; preorderParts: string[] | null }) {
  const preorderTemplate = process.env.WATI_PREORDER_TEMPLATE
  return message.preorderParts && preorderTemplate
    ? sendTemplate(to, preorderTemplate, named(PREORDER_PARAMS, message.preorderParts))
    : sendTemplate(to, process.env.WATI_CONFIRM_TEMPLATE ?? '', named(CONFIRM_PARAMS, message.parts))
}
