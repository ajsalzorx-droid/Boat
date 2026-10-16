import type { MetadataRoute } from 'next'
import { sitemapEntries } from '@/lib/seo'

// Public pages from the SEO dashboard; pages marked "Hide from Google" are left out
export default function sitemap(): Promise<MetadataRoute.Sitemap> {
  return sitemapEntries()
}
