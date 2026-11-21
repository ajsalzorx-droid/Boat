import 'server-only'

// Hostinger CDN purge, so a change saved in the admin or SEO Studio reaches the CDN straight away
// (DELETE /api/hosting/v1/accounts/{username}/websites/{domain}/cdn/purge, whole site).
//
// Optional: without the three settings below nothing is sent, and pages still refresh on the CDN
// within 2 minutes (s-maxage=60 + stale-while-revalidate=60, src/app/layout.tsx).
//   HOSTINGER_API_TOKEN  hPanel -> Profile -> API. It has the same rights as the account owner:
//                        keep it only in the server's environment (never NEXT_PUBLIC_, never in
//                        git) and give it an expiry date.
//   HOSTINGER_USERNAME   the hosting account username the website belongs to
//   HOSTINGER_DOMAIN     e.g. boatseafood.com
//
// Safety: only called from staff actions after their login check; several saves within a few
// seconds become one purge (the API allows 90 requests a minute); failures are retried a few
// times and logged by status only (the token and response bodies are never logged); a failure
// never blocks or fails the save itself.

const API = 'https://developers.hostinger.com/api/hosting/v1'
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{0,99}$/i
const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i
const COALESCE_MS = 3_000
const MAX_TRIES = 4

type Config = { token: string; username: string; domain: string }

let warned = false
function config(): Config | null {
  const token = process.env.HOSTINGER_API_TOKEN?.trim()
  const username = process.env.HOSTINGER_USERNAME?.trim()
  const domain = process.env.HOSTINGER_DOMAIN?.trim().toLowerCase()
  if (!token || !username || !domain) return null
  if (!USERNAME_RE.test(username) || !DOMAIN_RE.test(domain) || /\s/.test(token)) {
    if (!warned) console.error('CDN purge off: HOSTINGER_USERNAME / HOSTINGER_DOMAIN / HOSTINGER_API_TOKEN look wrong.')
    warned = true
    return null
  }
  return { token, username, domain }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function purgeWithRetry(c: Config) {
  const url = `${API}/accounts/${encodeURIComponent(c.username)}/websites/${encodeURIComponent(c.domain)}/cdn/purge`
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    let waitS = 2 ** attempt // 2, 4, 8 s
    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${c.token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      })
      if (res.ok) {
        console.info('CDN purged')
        return
      }
      // Wrong token, account or domain: retrying won't help
      if (res.status === 401 || res.status === 403 || res.status === 404 || res.status === 422) {
        console.error(`CDN purge refused (HTTP ${res.status}): check the HOSTINGER_* settings. Pages still refresh within 2 minutes.`)
        return
      }
      if (res.status === 429) waitS = Math.min(60, Math.max(1, Number(res.headers.get('retry-after')) || 10))
      console.warn(`CDN purge attempt ${attempt} failed (HTTP ${res.status})`)
    } catch (e) {
      console.warn(`CDN purge attempt ${attempt} failed (${e instanceof Error ? e.name : 'error'})`)
    }
    if (attempt < MAX_TRIES) await sleep(waitS * 1000)
  }
  console.error(`CDN purge failed after ${MAX_TRIES} tries. Pages still refresh within 2 minutes.`)
}

// One purge at a time; a save during a purge queues exactly one more
let timer: ReturnType<typeof setTimeout> | null = null
let running = false
let again = false

async function run() {
  const c = config()
  if (!c) return
  if (running) {
    again = true
    return
  }
  running = true
  try {
    await purgeWithRetry(c)
  } finally {
    running = false
    if (again) {
      again = false
      schedulePurge()
    }
  }
}

// Ask for a purge soon. Returns at once (the save doesn't wait for the CDN).
export function schedulePurge() {
  if (timer || !config()) return
  timer = setTimeout(() => {
    timer = null
    void run()
  }, COALESCE_MS)
  // Don't keep the process alive just for this
  if (typeof timer === 'object' && timer && 'unref' in timer) timer.unref()
}
