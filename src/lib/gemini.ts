import 'server-only'

// Gemini for the WhatsApp assistant, through the Interactions API. Set in .env.local:
//   GEMINI_API_KEY   from Google AI Studio (use a billed project once real customers write in:
//                    the free tier's terms don't allow personal information)
//   GEMINI_MODEL     the model id, e.g. a Flash-Lite model listed in AI Studio
// store: false keeps Google from holding the conversation for later turns.

export const BOT_CATEGORIES = ['restaurant', 'off_topic', 'handoff'] as const
export type BotCategory = (typeof BOT_CATEGORIES)[number]
export type BotAnswer = { category: BotCategory; reply: string; cacheable: boolean }

const ANSWER_SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string', enum: BOT_CATEGORIES },
    reply: { type: 'string' },
    cacheable: { type: 'boolean' },
  },
  required: ['category', 'reply', 'cacheable'],
}

export const geminiReady = () => !!(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL)

// The answer's text, wherever this API revision puts it
function outputText(body: unknown): string {
  const b = body as { output_text?: unknown; steps?: { content?: { text?: unknown }[] }[] } | null
  if (typeof b?.output_text === 'string') return b.output_text
  for (const step of [...(b?.steps ?? [])].reverse()) {
    for (const part of [...(step.content ?? [])].reverse()) {
      if (typeof part.text === 'string') return part.text
    }
  }
  return ''
}

function parseAnswer(text: string): BotAnswer | null {
  try {
    const a = JSON.parse(text) as Partial<BotAnswer>
    if (!BOT_CATEGORIES.includes(a.category as BotCategory) || typeof a.reply !== 'string') return null
    return { category: a.category as BotCategory, reply: a.reply.trim().slice(0, 1200), cacheable: a.cacheable === true }
  } catch {
    return null
  }
}

// null = no usable answer (the caller sends its own "staff will reply" message)
export async function askGemini(system: string, input: string): Promise<BotAnswer | null> {
  if (!geminiReady()) return null
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'x-goog-api-key': process.env.GEMINI_API_KEY!,
        'Content-Type': 'application/json',
        'Api-Revision': '2026-05-20',
      },
      body: JSON.stringify({
        model: process.env.GEMINI_MODEL,
        system_instruction: system,
        input,
        store: false,
        generation_config: { max_output_tokens: 500, thinking_level: 'low' },
        response_format: { type: 'text', mime_type: 'application/json', schema: ANSWER_SCHEMA },
      }),
      signal: AbortSignal.timeout(20_000),
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      console.error('Gemini error:', res.status, JSON.stringify(body)?.slice(0, 300))
      return null
    }
    const answer = parseAnswer(outputText(body))
    if (!answer) console.error('Gemini gave an unusable answer')
    return answer
  } catch (e) {
    console.error('Gemini request failed:', e)
    return null
  }
}
