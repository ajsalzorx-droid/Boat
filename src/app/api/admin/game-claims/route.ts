import { adminListRoute } from '@/lib/admin-list-route'
import { queryGameClaims } from '@/lib/admin-lists'

// Admin -> Game Claims: one page of claims (?filter=ready|used|all), with search by code or phone
export const GET = adminListRoute(queryGameClaims)
