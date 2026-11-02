import { timingSafeEqual } from 'node:crypto'
import { revalidateTag } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'
import { SYNC_TAGS, type SyncTag } from '@/lib/peer-sync'

// "Cache clear" link for the other servers (src/lib/peer-sync.ts): when the SEO Studio publishes
// or the admin changes menu/offers on one server, it calls this on the others. Needs the shared
// REVALIDATE_SECRET; only clears caches (it never changes any data), and never calls other
// servers itself, so publishes can't bounce back and forth.

export const dynamic = 'force-dynamic'

function secretOk(given: string | null) {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  if (!secretOk(request.headers.get('x-revalidate-secret'))) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const body = await request.json().catch(() => null)
  const tags = (Array.isArray(body?.tags) ? body.tags : []).filter((t: unknown): t is SyncTag =>
    SYNC_TAGS.includes(t as SyncTag)
  )
  if (!tags.length) return NextResponse.json({ ok: false, error: 'No valid tags.' }, { status: 400 })
  // Expire right away: the next visit reads the new values from the database
  for (const tag of tags) revalidateTag(tag, { expire: 0 })
  return NextResponse.json({ ok: true, tags })
}
