// Comma-separated admin logins, e.g. ADMIN_EMAILS=admin@boatseafood.com,chef@boatseafood.com
// Server-only (no NEXT_PUBLIC_ prefix). If unset, any signed-in user counts as admin.
export function isAdminEmail(email: string | undefined | null) {
  const list = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (list.length === 0) return true
  return !!email && list.includes(email.toLowerCase())
}
