import type { Metadata, MetadataRoute } from 'next'
import { cachedPublicClient } from '@/lib/public-db'

// SEO values come from the seo_pages / business_info tables (edited in the SEO Studio, /seo).
// Reads are cached under the "seo" tag; the admin save action calls updateTag('seo').
export const SEO_TAG = 'seo'

// Public pages the SEO dashboard manages. The defaults are used until the tables exist
// or when a field is left empty.
export const SEO_PAGES = [
  {
    path: '/',
    label: 'Home',
    title: 'Boat Seafood Dubai | Seafood Restaurant, Waterfront Market',
    description:
      'Premium seafood dining in Dubai’s Waterfront Market. Fresh daily catch, signature seafood dishes, private dining, and elegant waterfront experience.',
  },
  {
    path: '/menu',
    label: 'Menu',
    title: 'Seafood Menu | Boat Seafood Dubai',
    description:
      'Explore the Boat Seafood menu: fresh fish, prawns, lobster, crab and signature dishes cooked daily at Waterfront Market, Deira, Dubai.',
  },
  {
    path: '/events',
    label: 'Events',
    title: 'Events & Seafood Nights | Boat Seafood Dubai',
    description: 'Lobster nights, chef’s table dinners and private events at Boat Seafood, Waterfront Market, Dubai.',
  },
  {
    path: '/offer',
    label: 'Offers',
    title: 'Offers & Deals | Boat Seafood Dubai',
    description:
      'Current seafood offers at Boat Seafood Dubai: lunch menus, family feasts and seasonal deals at Waterfront Market.',
  },
  {
    path: '/your-fish',
    label: 'Your Fish',
    title: 'Bring Your Own Fish – We Cook It | Boat Seafood Dubai',
    description:
      'Buy fresh fish at Waterfront Market and our chefs will clean, cook and serve it your way. Grilled, fried or curry.',
  },
  {
    path: '/links',
    label: 'Links',
    title: 'Links | Boat Seafood Restaurant',
    description: 'Welcome to Boat Seafood Restaurant. View our menu, leave a review, or follow us on social media.',
  },
] as const

export type SeoPath = (typeof SEO_PAGES)[number]['path']

export type SeoPage = {
  path: string
  title: string
  description: string
  og_image: string
  noindex: boolean
  updated_at?: string
}

export type BusinessInfo = {
  name: string
  site_url: string
  phone: string
  email: string
  street: string
  locality: string
  region: string
  postal_code: string
  country: string
  latitude: string
  longitude: string
  opens: string
  closes: string
  price_range: string
  cuisine: string
  instagram: string
  facebook: string
  tiktok: string
  default_og_image: string
}

export const DEFAULT_BUSINESS: BusinessInfo = {
  name: 'Boat Seafood Restaurant',
  site_url: process.env.NEXT_PUBLIC_SITE_URL || 'https://boatseafood.ae',
  phone: '',
  email: 'hello@boatseafood.ae',
  street: 'Waterfront Market, Al Khaleej Rd',
  locality: 'Deira',
  region: 'Dubai',
  postal_code: '',
  country: 'AE',
  latitude: '25.2759',
  longitude: '55.3202',
  opens: '12:00',
  closes: '23:00',
  price_range: '$$',
  cuisine: 'Seafood',
  instagram: 'https://www.instagram.com/boat_seafood_/',
  facebook: 'https://www.facebook.com/boatseafoodrestaurant/',
  tiktok: 'https://www.tiktok.com/@boatseafoodrestaurant',
  default_og_image: '',
}

const seoClient = () => cachedPublicClient(SEO_TAG)

export async function getSeoPages(): Promise<Record<string, SeoPage>> {
  const defaults = Object.fromEntries(
    SEO_PAGES.map((p) => [p.path, { path: p.path, title: p.title, description: p.description, og_image: '', noindex: false }])
  ) as Record<string, SeoPage>

  const db = seoClient()
  if (!db) return defaults
  const { data, error } = await db.from('seo_pages').select('*')
  if (error || !data) return defaults // table not created yet -> code defaults

  for (const row of data as SeoPage[]) {
    const d = defaults[row.path]
    defaults[row.path] = {
      ...row,
      // Empty fields fall back to the code defaults so a page never loses its title
      title: row.title || d?.title || '',
      description: row.description || d?.description || '',
    }
  }
  return defaults
}

export async function getBusinessInfo(): Promise<BusinessInfo> {
  const db = seoClient()
  if (!db) return DEFAULT_BUSINESS
  const { data, error } = await db.from('business_info').select('*').eq('id', 1).maybeSingle()
  if (error || !data) return DEFAULT_BUSINESS

  const merged = { ...DEFAULT_BUSINESS }
  for (const key of Object.keys(DEFAULT_BUSINESS) as (keyof BusinessInfo)[]) {
    if (typeof data[key] === 'string' && data[key]) merged[key] = data[key]
  }
  return merged
}

export function siteUrl(business: BusinessInfo) {
  try {
    return new URL(business.site_url)
  } catch {
    return new URL(DEFAULT_BUSINESS.site_url)
  }
}

// Share image when neither the page nor Business Info has one (the hero photo, a 1024×1024 JPEG)
const FALLBACK_SHARE_IMAGE = { url: '/images/custom/hero_waterfront_dubai_1777327086914.png', width: 1024, height: 1024, type: 'image/jpeg' }

const absolute = (business: BusinessInfo, src: string) => new URL(src, siteUrl(business)).href

// Used by each route's layout: export const generateMetadata = () => pageMetadata('/menu')
export async function pageMetadata(path: SeoPath): Promise<Metadata> {
  const [pages, business] = await Promise.all([getSeoPages(), getBusinessInfo()])
  const page = pages[path]
  const custom = page.og_image || business.default_og_image
  const image = custom ? { url: custom } : FALLBACK_SHARE_IMAGE

  return {
    metadataBase: siteUrl(business),
    title: page.title,
    description: page.description,
    alternates: { canonical: path },
    robots: page.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'website',
      url: path,
      siteName: business.name,
      title: page.title,
      description: page.description,
      locale: 'en_AE',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: page.description,
      images: [image.url],
    },
  }
}

export async function sitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const [pages, business] = await Promise.all([getSeoPages(), getBusinessInfo()])
  const base = siteUrl(business).origin

  return SEO_PAGES.filter((p) => !pages[p.path]?.noindex).map((p) => ({
    url: `${base}${p.path === '/' ? '' : p.path}`,
    lastModified: pages[p.path]?.updated_at ? new Date(pages[p.path].updated_at!) : undefined,
    changeFrequency: p.path === '/' || p.path === '/menu' ? 'weekly' : 'monthly',
    priority: p.path === '/' ? 1 : p.path === '/menu' ? 0.9 : 0.7,
  }))
}

// schema.org Restaurant data for Google (address, hours, phone, socials)
export function restaurantJsonLd(business: BusinessInfo) {
  const url = siteUrl(business).origin
  const sameAs = [business.instagram, business.facebook, business.tiktok].filter(Boolean)

  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: business.name,
    url,
    ...(business.phone && { telephone: business.phone }),
    ...(business.email && { email: business.email }),
    image: absolute(business, business.default_og_image || FALLBACK_SHARE_IMAGE.url),
    servesCuisine: business.cuisine,
    priceRange: business.price_range,
    menu: `${url}/menu`,
    acceptsReservations: true,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.street,
      addressLocality: business.locality,
      addressRegion: business.region,
      ...(business.postal_code && { postalCode: business.postal_code }),
      addressCountry: business.country,
    },
    ...(business.latitude &&
      business.longitude && {
        geo: { '@type': 'GeoCoordinates', latitude: Number(business.latitude), longitude: Number(business.longitude) },
      }),
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: business.opens,
        closes: business.closes,
      },
    ],
    ...(sameAs.length && { sameAs }),
  }
}

// schema.org Menu for /menu: every active dish with its price, grouped by category
export function menuJsonLd(business: BusinessInfo, items: { name: string; description?: string; price: string | number; category: string; image?: string }[]) {
  const url = siteUrl(business).origin
  const categories = [...new Set(items.map((i) => i.category))]

  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    name: `${business.name} Menu`,
    url: `${url}/menu`,
    inLanguage: 'en',
    hasMenuSection: categories.map((category) => ({
      '@type': 'MenuSection',
      name: category,
      hasMenuItem: items
        .filter((i) => i.category === category)
        .map((i) => ({
          '@type': 'MenuItem',
          name: i.name,
          ...(i.description && { description: i.description }),
          ...(i.image && { image: absolute(business, i.image) }),
          offers: { '@type': 'Offer', price: String(i.price), priceCurrency: 'AED' },
        })),
    })),
  }
}
