import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdminEmail, isSeoEditorEmail } from '@/lib/admin-emails'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  // Staff pages are never linked from the site; this header keeps search engines from indexing
  // them if someone finds the URL. (Not listed in robots.txt, which would advertise the path.)
  const isSeoStudio = pathname === '/seo' || pathname.startsWith('/seo/')
  const isStaffPage = pathname.startsWith('/admin') || pathname.startsWith('/kitchen') || isSeoStudio
  const isProtected =
    (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) ||
    pathname.startsWith('/kitchen') ||
    isSeoStudio

  if (isProtected) {
    // Verified token (getUser above) + email in ADMIN_EMAILS (server env, no DB function needed).
    // The SEO Studio also lets in SEO_EMAILS accounts.
    const allowed = isSeoStudio ? isSeoEditorEmail(user?.email) : isAdminEmail(user?.email)
    if (!user || !allowed) {
      const url = request.nextUrl.clone()
      url.search = ''
      if (user && isSeoEditorEmail(user.email)) {
        // Signed-in SEO account on an admin page: send it to its own dashboard, not back to login
        url.pathname = '/seo'
      } else {
        url.pathname = '/admin/login'
        url.searchParams.set('next', pathname)
      }
      const redirect = NextResponse.redirect(url)
      redirect.headers.set('X-Robots-Tag', 'noindex, nofollow')
      return redirect
    }
  }

  if (isStaffPage) supabaseResponse.headers.set('X-Robots-Tag', 'noindex, nofollow')

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
