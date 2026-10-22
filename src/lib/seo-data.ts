import 'server-only'
import type { Metadata, MetadataRoute } from 'next'
import { unstable_cache } from 'next/cache'
import { getDb, toPlain, type IdDoc } from '@/lib/mongodb'
import {
  DEFAULT_BUSINESS,
  FALLBACK_SHARE_IMAGE,
  SEO_PAGES,
  SEO_TAG,
  siteUrl,
  type BusinessInfo,
  type SeoPage,
  type SeoPath,
} from '@/lib/seo'

// SEO values from the seo_pages / business_info collections (edited in the SEO Studio, /seo).
// Reads are cached under the "seo" tag; "Confirm & Publish" calls updateTag('seo').

export const getSeoPages = unstable_cache(
  async (): Promise<Record<string, SeoPage>> => {
    const defaults = Object.fromEntries(
      SEO_PAGES.map((p) => [p.path, { path: p.path, title: p.title, description: p.description, og_image: '', noindex: false }]),
    ) as Record<string, SeoPage>

    let data: SeoPage[]
    try {
      const db = await getDb()
      const docs = await db.collection<{ _id: string }>('seo_pages').find().toArray()
      data = docs.map((d) => ({ ...toPlain(d), path: d._id }) as unknown as SeoPage)
    } catch (e) {
      console.error('Error fetching SEO pages:', e)
      return defaults // database unreachable -> code defaults
    }

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
  ['seo-pages'],
  { tags: [SEO_TAG] },
)

export const getBusinessInfo = unstable_cache(
  async (): Promise<BusinessInfo> => {
    let data: IdDoc<number> | null
    try {
      const db = await getDb()
      data = await db.collection<IdDoc<number>>('business_info').findOne({ _id: 1 })
    } catch (e) {
      console.error('Error fetching business info:', e)
      return DEFAULT_BUSINESS
    }
    if (!data) return DEFAULT_BUSINESS

    const merged = { ...DEFAULT_BUSINESS }
    for (const key of Object.keys(DEFAULT_BUSINESS) as (keyof BusinessInfo)[]) {
      const value = data[key]
      if (typeof value === 'string' && value) merged[key] = value
    }
    return merged
  },
  ['business-info'],
  { tags: [SEO_TAG] },
)

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
