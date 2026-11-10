import 'server-only'
import { generateText, Output, type LanguageModel } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createAnthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

// The model behind the WhatsApp assistant, through the AI SDK. Gemini answers first; if it fails
// (down, over its limit, or an unusable answer), Claude answers instead, when it is set up.
// Set in .env.local:
//   GEMINI_API_KEY     from Google AI Studio (use a billed project once real customers write in:
//                      the free tier's terms don't allow personal information)
//   GEMINI_MODEL       the model id, e.g. a Flash-Lite model listed in AI Studio
//   ANTHROPIC_API_KEY  optional: from the Claude Console, to turn on the fallback
//   ANTHROPIC_MODEL    optional: the fallback model id (default claude-haiku-5-5, fast and low cost)

export const BOT_CATEGORIES = ['restaurant', 'off_topic', 'handoff'] as const
export type BotCategory = (typeof BOT_CATEGORIES)[number]
export type BotAnswer = { category: BotCategory; reply: string; cacheable: boolean; model: string }

const ANSWER = z.object({
  category: z.enum(BOT_CATEGORIES),
  reply: z.string(),
  cacheable: z.boolean(),
})

const TIMEOUT_MS = 20_000
const MAX_TOKENS = 500

type Choice = { name: string; model: LanguageModel; providerOptions?: Parameters<typeof generateText>[0]['providerOptions'] }

// The models to try, in order; made once, on first use
let chain: Choice[] | undefined
function models(): Choice[] {
  if (chain) return chain
  chain = []
  const { GEMINI_API_KEY, GEMINI_MODEL, ANTHROPIC_API_KEY, ANTHROPIC_MODEL } = process.env
  if (GEMINI_API_KEY && GEMINI_MODEL) {
    chain.push({
      name: 'gemini',
      model: createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY })(GEMINI_MODEL),
      providerOptions: { google: { thinkingConfig: { thinkingLevel: 'low' } } },
    })
  }
  if (ANTHROPIC_API_KEY) {
    chain.push({ name: 'claude', model: createAnthropic({ apiKey: ANTHROPIC_API_KEY })(ANTHROPIC_MODEL || 'claude-haiku-5-5') })
  }
  return chain
}

export const aiReady = () => models().length > 0

// null = no model gave a usable answer (the caller sends its own "staff will reply" message)
export async function askAi(system: string, input: string): Promise<BotAnswer | null> {
  for (const choice of models()) {
    try {
      const { output } = await generateText({
        model: choice.model,
        system,
        prompt: input,
        maxOutputTokens: MAX_TOKENS,
        maxRetries: 1, // one quick retry, then the next model
        timeout: TIMEOUT_MS,
        output: Output.object({ schema: ANSWER }),
        providerOptions: choice.providerOptions,
      })
      if (!output) throw new Error('no answer')
      return { ...output, reply: output.reply.trim().slice(0, 1200), model: choice.name }
    } catch (e) {
      console.error(`Chatbot AI (${choice.name}) failed:`, e instanceof Error ? e.message.slice(0, 300) : e)
    }
  }
  return null
}
