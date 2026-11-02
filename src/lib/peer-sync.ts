import 'server-only'

// The site runs on more than one server (Hostinger for boatseafood.com, and Vercel), all reading
// the same database but each with its own page cache. When the SEO Studio publishes, or the admin
// changes menu/offers, this server clears its own cache (updateTag) and then calls the other
// servers' /api/revalidate so theirs is cleared too.
//
// .env.local on every server (the same values everywhere):
//   PEER_SITES=https://boatseafood.com,https://boat-cedf.vercel.app
//   REVALIDATE_SECRET=<long random text>
// A server may list itself; clearing its cache twice is harmless.

export const SYNC_TAGS = ['seo', 'content', 'menu'] as const
export type SyncTag = (typeof SYNC_TAGS)[number]

const TIMEOUT_MS = 8000

export function peerSites() {
  return (process.env.PEER_SITES ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter((s) => /^https?:\/\//.test(s))
}

// Never throws: a server that is down or slow must not make the publish fail
export async function notifyPeers(tags: SyncTag[]) {
  const secret = process.env.REVALIDATE_SECRET
  const sites = peerSites()
  if (!secret || !sites.length) return
  const results = await Promise.allSettled(
    sites.map(async (site) => {
      const res = await fetch(`${site}/api/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
        body: JSON.stringify({ tags }),
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!res.ok) throw new Error(`${site}: HTTP ${res.status}`)
    })
  )
  for (const r of results) if (r.status === 'rejected') console.error('Cache sync to other server failed:', r.reason)
}
