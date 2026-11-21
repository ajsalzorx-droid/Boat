import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthError, verifyAdmin } from '@/lib/auth'

// SEO Studio preview. /api/preview?path=/menu turns on Next's draft mode for this browser (SEO
// accounts only) and opens the page: it then shows saved changes before Confirm & Publish,
// read fresh from the database (draft mode skips the caches and is never stored by the CDN).
// /api/preview?exit=1&path=/menu turns it off again. Draft mode also ends when the browser closes.

// Only a page on this site (no //other-site.com or /\other-site.com redirects)
const safePath = (p: string | null) => (p && p.startsWith('/') && !p.startsWith('//') && !p.startsWith('/\\') ? p : '/')

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const path = safePath(params.get('path'))
  const draft = await draftMode()

  if (params.get('exit')) {
    draft.disable()
    redirect(path)
  }

  try {
    await verifyAdmin('seo')
  } catch (e) {
    if (e instanceof AuthError)
      return new Response('Log in to the SEO Studio to preview unpublished changes.', {
        status: e.status,
        headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
      })
    throw e
  }

  draft.enable()
  redirect(path)
}
