// The delivery apps in the navbar's "Delivery" menu (desktop dropdown and phone menu), edited in
// Admin -> Delivery Apps. Safe in client components; the cached database read is in
// src/lib/delivery-data.ts.

export const DELIVERY_TAG = 'delivery'

export type DeliveryApp = {
  name: string // "Talabat"
  url: string // our page on the app: https://...
  color: string // the dot before the name: "#FF5A00"
  visible: boolean
}

export const DELIVERY_LIMITS = { apps: 10, name: 30, url: 500 }

// Until the list is saved in the admin: the apps the site always had
export const DEFAULT_DELIVERY_APPS: DeliveryApp[] = [
  { name: 'Talabat', url: 'https://www.talabat.com', color: '#FF5A00', visible: true },
  { name: 'Noon Food', url: 'https://food.noon.com', color: '#FEE000', visible: true },
  { name: 'Keeta', url: 'https://www.keeta.com', color: '#FF0000', visible: true },
]

export const COLOR_RE = /^#[0-9a-fA-F]{6}$/

// A message for the admin, or null when the app's details are fine
export function deliveryAppProblem(app: DeliveryApp, n: number): string | null {
  const label = `App ${n}`
  if (!app.name) return `${label}: enter the app's name.`
  if (app.name.length > DELIVERY_LIMITS.name) return `${label}: the name is too long (max ${DELIVERY_LIMITS.name} characters).`
  if (!app.url) return `${app.name}: enter the link to our page on the app.`
  if (app.url.length > DELIVERY_LIMITS.url) return `${app.name}: the link is too long.`
  let url: URL
  try {
    url = new URL(app.url)
  } catch {
    return `${app.name}: the link must be a full web address, starting with https://`
  }
  if (url.protocol !== 'https:') return `${app.name}: the link must start with https://`
  // a real site's address has a dot: talabat.com, not "talabat"
  const host = url.hostname
  if (!host.includes('.') || host.startsWith('.') || host.endsWith('.') || host.includes('..')) return `${app.name}: the link needs a full web address, e.g. https://www.talabat.com/...`
  if (!COLOR_RE.test(app.color)) return `${app.name}: choose a colour.`
  return null
}
