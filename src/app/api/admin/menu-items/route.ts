import { adminListRoute } from '@/lib/admin-list-route'
import { queryMenuItems } from '@/lib/admin-lists'

// Admin -> Menu table: one page of dishes, with search (src/app/admin/use-admin-list.ts)
export const GET = adminListRoute(queryMenuItems)
