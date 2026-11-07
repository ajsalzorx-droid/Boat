import 'server-only'
import { createHash } from 'node:crypto'
import { getActiveMenuItems, getAvailableCatch, getLiveOffers, withOffers } from '@/lib/menu-data'
import { discounted, formatPrice, toDubaiDay, type Offer } from '@/lib/offers'
import { siteUrl } from '@/lib/seo'
import { getBusinessInfo } from '@/lib/seo-data'
import { WHATSAPP_DISPLAY } from '@/lib/whatsapp'
import type { MenuItem } from '@/data/menu'

// What the WhatsApp assistant knows: public facts only (dishes, offers, the fresh catch, contact
// details). Orders, bookings and staff data are never read here, so it can't repeat them.

function dishLine(item: MenuItem) {
  const price = Number(item.price) || 0
  const cost = item.discount
    ? `AED ${formatPrice(discounted(price, item.discount))} (was AED ${formatPrice(price)}, ${item.discount}% off)`
    : `AED ${formatPrice(price)}`
  const dietary = item.dietary?.length ? ` [${item.dietary.join(', ')}]` : ''
  return `- ${item.name}: ${cost}${dietary}. ${item.description ?? ''}`.trim()
}

function offerLine(offer: Offer, items: MenuItem[]) {
  const covered = items.filter((i) => i.offer_title === offer.title).length
  const reach =
    offer.scope === 'all' || covered === items.length
      ? 'the whole menu'
      : offer.scope === 'categories'
        ? offer.categories.join(', ')
        : `${covered} dishes (marked on the menu below)`
  const end = offer.ends_at ? `, until ${toDubaiDay(offer.ends_at)}` : ''
  const details = offer.description ? ` ${offer.description}` : ''
  return `- ${offer.title}: ${offer.percent}% off ${reach}${end}.${details}`
}

export async function restaurantKnowledge() {
  const [menu, offers, freshCatch, business] = await Promise.all([
    getActiveMenuItems(),
    getLiveOffers(),
    getAvailableCatch(),
    getBusinessInfo(),
  ])
  const items = withOffers(menu, offers)
  const site = siteUrl(business).origin
  const address = [business.street, business.locality, business.region].filter(Boolean).join(', ')

  const lines = [
    `Name: ${business.name}`,
    `Cuisine: ${business.cuisine}`,
    `Address: ${address}`,
    `Hours: every day, ${business.opens} to ${business.closes} (24-hour clock, Dubai time)`,
    `Phone: ${business.phone}`,
    `WhatsApp: ${WHATSAPP_DISPLAY}`,
    `Email: ${business.email}`,
    `Book a table or fish preparation: ${site}/book`,
    `Menu and online orders: ${site}/menu`,
    `Bring your own fish from the market and our chefs cook it: ${site}/your-fish`,
    '',
    'LIVE OFFERS',
    ...(offers.length ? offers.map((o) => offerLine(o, items)) : ['- No offers right now.']),
    '',
    'MENU',
  ]
  for (const category of new Set(items.map((i) => i.category))) {
    const dishes = items.filter((i) => i.category === category).map(dishLine)
    lines.push(`${category}:`, ...new Set(dishes)) // a dish entered twice is only told once
  }
  if (freshCatch.length) {
    lines.push('', 'FRESH CATCH (availability changes, ask staff to confirm)')
    const catches = freshCatch.map((c) => `- ${c.name} (${c.origin}): AED ${formatPrice(Number(c.price) || 0)}`)
    lines.push(...new Set(catches))
  }

  const text = lines.join('\n')
  // Changes whenever anything above changes, so saved answers never outlive the facts
  return { text, version: createHash('sha256').update(text).digest('hex').slice(0, 16) }
}
