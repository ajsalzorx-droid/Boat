// Delivery orders: placed from a dish's "Add to order" -> Delivery (src/components/DishDetail.tsx),
// saved in the "deliveries" collection, handled in Admin -> Delivery. Confirming one asks for the
// cooking time, sends the food to the kitchen screen and tells the customer on WhatsApp.
// Also the cooking time asked when confirming a table booking with pre-ordered dishes.
// Safe in client components (no database here).

import { formatPrice } from '@/lib/offers'

export type DeliveryStatus = 'new' | 'confirmed' | 'cancelled'

// A dish as saved with the delivery (price = one portion, offer applied when ordered)
export type DeliveryItem = { name: string; quantity: number; price: number }

// The choices when confirming (minutes)
export const COOKING_TIMES = [10, 15, 20, 25, 30, 40, 45, 60, 75, 90, 120]
export const DEFAULT_COOKING_MIN = 30
export const isCookingTime = (n: unknown): n is number => typeof n === 'number' && COOKING_TIMES.includes(n)

// 30 -> "30 minutes", 60 -> "1 hour", 90 -> "1 hour 30 minutes"
export function cookingLabel(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  const hours = h ? `${h} ${h === 1 ? 'hour' : 'hours'}` : ''
  const mins = m ? `${m} minutes` : ''
  return [hours, mins].filter(Boolean).join(' ')
}

// A time of day in Dubai: "7:45 PM"
export const dubaiClock = (d: Date | string) =>
  new Date(d).toLocaleTimeString('en-US', { timeZone: 'Asia/Dubai', hour: 'numeric', minute: '2-digit' })

const lineTotal = (i: DeliveryItem) => `AED ${formatPrice(Math.round(i.price * i.quantity * 100) / 100)}`

// Values for the WhatsApp templates (src/lib/whatsapp-api.ts). Template values can't hold line
// breaks, so the dishes are one line, comma separated.
export function deliveryMessageParams(d: { name: string; items: DeliveryItem[]; items_total: number; location: string }) {
  return {
    customer_name: d.name,
    dishes: d.items.map((i) => `${i.quantity} x ${i.name} (${lineTotal(i)})`).join(', '),
    total: `AED ${formatPrice(d.items_total)}`,
    location: d.location,
  }
}
