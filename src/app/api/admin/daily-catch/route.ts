import { adminListRoute } from '@/lib/admin-list-route'
import { queryDailyCatch } from '@/lib/admin-lists'

// Admin -> Daily Catch table: one page of catches, with search (src/app/admin/use-admin-list.ts)
export const GET = adminListRoute(queryDailyCatch)
