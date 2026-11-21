// The restaurant's WhatsApp number comes only from .env.local: NEXT_PUBLIC_WHATSAPP_NUMBER, in
// international format without + or 0 (050 748 7220 -> 971507487220). Change it there; every
// WhatsApp link, the booking page and the admin confirmations follow (restart the server after).
// whatsapp() gives the wa.me chat link; pass a message to pre-fill it.
export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '').replace(/\D/g, '')

if (!WHATSAPP_NUMBER) console.warn('NEXT_PUBLIC_WHATSAPP_NUMBER is not set in .env.local: WhatsApp links will not work.')

export const whatsapp = (text?: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ''}`

// The app's own link (whatsapp://): opens WhatsApp or WhatsApp Business straight away, without
// the browser tab wa.me leaves behind on iPhone
export const whatsappApp = (text?: string) =>
  `whatsapp://send?phone=${WHATSAPP_NUMBER}${text ? `&text=${encodeURIComponent(text)}` : ''}`

// Android: the app through an intent (WhatsApp or WhatsApp Business, whichever handles
// whatsapp://), from the current tab, so the page stays where it is. Only when no WhatsApp is
// installed does the browser go to the wa.me page instead. A plain wa.me link opened in a new tab
// often stopped at WhatsApp's web page ("Continue to chat") in QR-scanner and in-app browsers.
export const whatsappAndroid = (text?: string) =>
  `intent://send?phone=${WHATSAPP_NUMBER}${text ? `&text=${encodeURIComponent(text)}` : ''}` +
  `#Intent;scheme=whatsapp;S.browser_fallback_url=${encodeURIComponent(whatsapp(text))};end`

// The same number written for people, e.g. 971507487220 -> "+971 50 748 7220"
export const WHATSAPP_DISPLAY = WHATSAPP_NUMBER.replace(/^971(\d{2})(\d{3})(\d{4})$/, '+971 $1 $2 $3')
