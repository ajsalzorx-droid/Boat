import 'server-only'

// Sends WhatsApp messages from the restaurant's own number through Meta's WhatsApp Business
// Cloud API (no tap needed). Set up in Meta, then in .env.local (server only, never NEXT_PUBLIC_):
//   WHATSAPP_API_TOKEN          permanent access token (System User in Meta Business Settings)
//   WHATSAPP_PHONE_NUMBER_ID    "Phone number ID" of the business number (WhatsApp -> API Setup)
//   WHATSAPP_CONFIRM_TEMPLATE   name of the approved template, e.g. booking_confirmed
//   WHATSAPP_TEMPLATE_LANG      its language code (default "en")
// Messages the restaurant starts must use an approved template; booking_confirmed has 4 values:
//   Hello {{1}}, this is Boat Seafood Restaurant. We confirm {{2}} on {{3}} at {{4}}. See you soon!

const GRAPH_VERSION = 'v21.0'

export function whatsappApiReady() {
  return !!(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_CONFIRM_TEMPLATE)
}

export type SendResult = { ok: true } | { ok: false; error: string }

// to = international digits without + (e.g. 971501234567); values fill {{1}}, {{2}}, ...
export async function sendTemplate(to: string, values: string[]): Promise<SendResult> {
  if (!whatsappApiReady()) return { ok: false, error: 'WhatsApp API is not set up.' }
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: process.env.WHATSAPP_CONFIRM_TEMPLATE,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en' },
          components: [{ type: 'body', parameters: values.map((text) => ({ type: 'text', text })) }],
        },
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (res.ok) return { ok: true }
    const body = await res.json().catch(() => null)
    const message = body?.error?.error_data?.details || body?.error?.message || `WhatsApp error ${res.status}`
    console.error('WhatsApp send failed:', res.status, JSON.stringify(body?.error ?? body))
    return { ok: false, error: message }
  } catch (e) {
    console.error('WhatsApp send failed:', e)
    return { ok: false, error: 'Could not reach WhatsApp. Please try again.' }
  }
}
