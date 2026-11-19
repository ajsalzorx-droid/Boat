import type { MetadataRoute } from 'next'
import { getBusinessInfo, sitemapEntries } from '@/lib/seo-data'
import { getPublishedPosts } from '@/lib/blog-data'
import { siteUrl } from '@/lib/seo'

// Public pages from the SEO dashboard; pages marked "Hide from Google" are left out.
// Published blog posts (not drafts, not hidden ones) are added after them, plus /blog once
// there is at least one.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, posts, business] = await Promise.all([sitemapEntries(), getPublishedPosts(), getBusinessInfo()])
  const base = siteUrl(business).origin
  const listed = posts.filter((p) => !p.noindex)
  if (!listed.length) return pages
  return [
    ...pages,
    { url: `${base}/blog`, lastModified: new Date(listed[0].updated_at), changeFrequency: 'weekly', priority: 0.7 },
    ...listed.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ]
}
