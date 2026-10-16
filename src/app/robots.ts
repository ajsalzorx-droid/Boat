import type { MetadataRoute } from 'next'
import { getBusinessInfo, siteUrl } from '@/lib/seo'

// /admin and /kitchen are kept out of Google by the X-Robots-Tag header in the proxy,
// not listed here (listing them would advertise the paths).
export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = siteUrl(await getBusinessInfo()).origin
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${base}/sitemap.xml`,
  }
}
