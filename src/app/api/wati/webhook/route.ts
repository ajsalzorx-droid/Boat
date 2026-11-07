import { createHash, timingSafeEqual } from 'node:crypto'
import { after, NextResponse, type NextRequest } from 'next/server'
import { handleWatiEvent, type WatiEvent } from '@/lib/chatbot'

// Wati posts WhatsApp events here. Wati documents no signature for webhooks, so the address itself
// carries the secret: https://boatseafood.com/api/wati/webhook?key=WATI_WEBHOOK_SECRET
// (server.js keeps it out of the logs). Wati gets its 200 at once; the reply goes out afterwards.

const MAX_BODY_CHARS = 64_000

const digest = (text: string) => createHash('sha256').update(text).digest()

function rightKey(key: string | null) {
  const secret = process.env.WATI_WEBHOOK_SECRET
  return !!secret && !!key && timingSafeEqual(digest(key), digest(secret))
}

export async function POST(request: NextRequest) {
  if (!rightKey(request.nextUrl.searchParams.get('key'))) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const raw = await request.text()
  if (raw.length > MAX_BODY_CHARS) return NextResponse.json({ ok: false }, { status: 413 })

  let event: WatiEvent | null = null
  try {
    event = JSON.parse(raw) as WatiEvent
  } catch {
    // Wati's own test callback may not be an event: answered 200 so it isn't sent again
  }

  if (event && typeof event === 'object') {
    after(() => handleWatiEvent(event).catch((e) => console.error('Chatbot failed:', e)))
  }
  return NextResponse.json({ ok: true })
}
