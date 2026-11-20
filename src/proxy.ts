import { NextResponse, type NextRequest } from 'next/server'
import { readSession, SESSION_COOKIES, type Role } from '@/lib/session'

// Which roles may open a staff page: admin = products and orders (and the kitchen screen),
// seo = the SEO Studio only, kitchen = the kitchen screen only (never the admin dashboard)
function allowedRoles(pathname: string): Role[] | null {
  if (pathname === '/seo' || pathname.startsWith('/seo/')) return ['seo']
  if (pathname.startsWith('/admin/login')) return null
  if (pathname === '/kitchen' || pathname.startsWith('/kitchen/')) return ['kitchen', 'admin']
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return ['admin']
  return null
}

const noindex = (res: NextResponse) => {
  // Staff pages are never linked from the site; keep search engines and caches away from them
  res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  res.headers.set('Cache-Control', 'no-store')
  return res
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const roles = allowedRoles(pathname)
  const isStaffPage = roles !== null || pathname.startsWith('/admin')
  if (!isStaffPage) return NextResponse.next()

  if (roles) {
    // Server-side session lookup with each allowed area's own cookie (src/lib/session.ts); actions
    // check it again in the database. An admin session never opens the SEO Studio, a kitchen
    // session never opens the admin dashboard: without a session for this area, log in here.
    let session = null
    for (const role of roles) {
      const cookie = request.cookies.get(SESSION_COOKIES[role])?.value
      if (cookie) session = await readSession(cookie, role).catch(() => null)
      if (session) break
    }
    if (!session) {
      const url = request.nextUrl.clone()
      url.search = ''
      url.pathname = '/admin/login'
      url.searchParams.set('next', pathname)
      return noindex(NextResponse.redirect(url))
    }
  }

  return noindex(NextResponse.next())
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
