import 'server-only'
import type { Db } from 'mongodb'
import { NextResponse } from 'next/server'
import { AuthError, verifyAdmin } from '@/lib/auth'
import type { ListQuery } from '@/lib/admin-lists'

// GET handler for an admin list: ?page=0&size=8&q=text (+ any other params, e.g. filter)
// -> { ok, data }. Same login check as the Server Actions. Plain GET (not a Server Action) so
// the browser can abort a search that has been overtaken by newer typing, and several can run
// at once.
export function adminListRoute<T>(query: (db: Db, q: ListQuery & Record<string, string | number>) => Promise<T>) {
  return async function GET(request: Request) {
    const params = new URL(request.url).searchParams
    const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }
    try {
      const { db } = await verifyAdmin('admin')
      const data = await query(db, {
        ...Object.fromEntries(params),
        page: Number(params.get('page')) || 0,
        pageSize: Number(params.get('size')) || 10,
        search: params.get('q') ?? '',
      })
      return NextResponse.json({ ok: true, data }, { headers })
    } catch (e) {
      if (e instanceof AuthError) return NextResponse.json({ ok: false, error: e.message, status: e.status }, { status: e.status, headers })
      console.error('Admin list failed:', e)
      return NextResponse.json({ ok: false, error: 'Could not load the list. Please try again.' }, { status: 500, headers })
    }
  }
}
