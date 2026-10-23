import { NextResponse, type NextRequest } from 'next/server'
import { readSession, SESSION_COOKIES, type Role } from '@/lib/session'

// Which role may open a staff page: admin = products and orders, seo = the SEO Studio only
function requiredRole(pathname: string): Role | null {
  if (pathname === '/seo' || pathname.startsWith('/seo/')) return 'seo'
  if (pathname.startsWith('/admin/login')) return null
  if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/kitchen' || pathname.startsWith('/kitchen/'))
    return 'admin'
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
  const role = requiredRole(pathname)
  const isStaffPage = role !== null || pathname.startsWith('/admin')
  if (!isStaffPage) return NextResponse.next()

  if (role) {
    // Server-side session lookup with this area's own cookie (src/lib/session.ts); actions check
    // it again in the database. An admin session never opens the SEO Studio, and the other way
    // round: without a session for this area, log in here (the other area stays logged in).
    const session = await readSession(request.cookies.get(SESSION_COOKIES[role])?.value, role).catch(() => null)
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
