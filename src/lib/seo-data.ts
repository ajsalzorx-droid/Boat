import 'server-only'
import type { Metadata, MetadataRoute } from 'next'
import { safeCache } from '@/lib/safe-cache'
import { getDb, toPlain, type IdDoc } from '@/lib/mongodb'
import {
  DEFAULT_BUSINESS,
  FALLBACK_SHARE_IMAGE,
  SEO_PAGES,
  SEO_TAG,
  siteUrl,
  TOUR_PUBLISHED,
  type BusinessInfo,
  type SeoPage,
  type SeoPath,
} from '@/lib/seo'

// SEO values from the seo_pages / business_info collections (edited in the SEO Studio, /seo).
// Reads are cached under the "seo" tag; "Confirm & Publish" calls updateTag('seo').

const defaultSeoPages = () =>
  Object.fromEntries(
    SEO_PAGES.map((p) => [p.path, { path: p.path, title: p.title, description: p.description, og_image: '', noindex: false }]),
  ) as Record<string, SeoPage>

export const getSeoPages = safeCache(
  async (): Promise<Record<string, SeoPage>> => {
    const defaults = defaultSeoPages()
    const db = await getDb()
    const docs = await db.collection<{ _id: string }>('seo_pages').find().toArray()
    const data = docs.map((d) => ({ ...toPlain(d), path: d._id }) as unknown as SeoPage)

    for (const row of data) {
      const d = defaults[row.path]
      defaults[row.path] = {
        ...row,
        // Empty fields fall back to the code defaults so a page never loses its title
        title: row.title || d?.title || '',
        description: row.description || d?.description || '',
      }
    }
    return defaults
  },
  defaultSeoPages, // database unreachable -> code defaults (not cached)
  ['seo-pages'],
  { tags: [SEO_TAG] },
  'SEO pages',
)

export const getBusinessInfo = safeCache(
  async (): Promise<BusinessInfo> => {
    const db = await getDb()
    const data = await db.collection<IdDoc<number>>('business_info').findOne({ _id: 1 })
    if (!data) return DEFAULT_BUSINESS

    const merged = { ...DEFAULT_BUSINESS }
    for (const key of Object.keys(DEFAULT_BUSINESS) as (keyof BusinessInfo)[]) {
      const value = data[key]
      if (typeof value === 'string' && value) merged[key] = value
    }
    return merged
  },
  () => DEFAULT_BUSINESS, // database unreachable (not cached)
  ['business-info-v2'], // v2: renamed so the 11:00–01:00 hours (Nov 2026) show without waiting for a publish
  { tags: [SEO_TAG] },
  'business info',
)

// Used by each route's layout: export const generateMetadata = () => pageMetadata('/menu')
export async function pageMetadata(path: SeoPath): Promise<Metadata> {
  const [pages, business] = await Promise.all([getSeoPages(), getBusinessInfo()])
  // A cached copy made before a page was added (or renamed) has no row for it -> code defaults
  const fallback = SEO_PAGES.find((p) => p.path === path)
  const page: SeoPage = pages[path] ?? {
    path,
    title: fallback?.title ?? '',
    description: fallback?.description ?? '',
    og_image: '',
    noindex: false,
  }
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

  // /blog is added by src/app/sitemap.ts, and only once a post is published
  return SEO_PAGES.filter((p) => p.path !== '/blog' && !pages[p.path]?.noindex && (TOUR_PUBLISHED || p.path !== '/360-view')).map((p) => ({
    url: `${base}${p.path === '/' ? '' : p.path}`,
    lastModified: pages[p.path]?.updated_at ? new Date(pages[p.path].updated_at!) : undefined,
    changeFrequency: p.path === '/' || p.path === '/menu' ? 'weekly' : 'monthly',
    priority: p.path === '/' ? 1 : p.path === '/menu' ? 0.9 : 0.7,
  }))
}
