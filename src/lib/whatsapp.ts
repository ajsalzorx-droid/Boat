// WhatsApp number from .env.local (NEXT_PUBLIC_WHATSAPP_NUMBER, international format without + or 0).
// whatsapp() gives the wa.me chat link; pass a message to pre-fill it.
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '971507487220'

export const whatsapp = (text?: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ''}`
