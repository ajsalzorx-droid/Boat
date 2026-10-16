// Comma-separated logins (server-only env, no NEXT_PUBLIC_ prefix):
//   ADMIN_EMAILS=owner@boatseafood.com,chef@boatseafood.com   -> full admin (/admin, /kitchen, /seo)
//   SEO_EMAILS=seo@agency.com                                  -> SEO Studio only (/seo)
function emailList(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

// If ADMIN_EMAILS is unset, any signed-in user counts as admin.
export function isAdminEmail(email: string | undefined | null) {
  const list = emailList(process.env.ADMIN_EMAILS)
  if (list.length === 0) return true
  return !!email && list.includes(email.toLowerCase())
}

// SEO Studio access: admins plus the SEO_EMAILS list
export function isSeoEditorEmail(email: string | undefined | null) {
  if (isAdminEmail(email)) return true
  return !!email && emailList(process.env.SEO_EMAILS).includes(email.toLowerCase())
}
