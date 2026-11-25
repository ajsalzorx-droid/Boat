import type { MetadataRoute } from 'next'
import { getBusinessInfo, sitemapEntries } from '@/lib/seo-data'
import { getPublishedPosts } from '@/lib/blog-data'
import { eventPath } from '@/lib/events'
import { getEvents } from '@/lib/events-data'
import { siteUrl } from '@/lib/seo'

// Public pages from the SEO dashboard; pages marked "Hide from Google" are left out.
// Published blog posts (not drafts, not hidden ones) are added after them, plus /blog once
// there is at least one.
// Rebuilt at most every 60 s, and straight away when a post (blog tag) or an event (events tag) is saved
export const revalidate = 60

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [seoPages, posts, events, business] = await Promise.all([sitemapEntries(), getPublishedPosts(), getEvents(), getBusinessInfo()])
  const base = siteUrl(business).origin
  // Events shown on the website, with their photos for Google Images
  const pages: MetadataRoute.Sitemap = [
    ...seoPages,
    ...events.map((e) => ({
      url: `${base}${eventPath(e.slug)}`,
      lastModified: new Date(e.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
      images: [e.cover_image, ...e.photos.map((p) => p.src)].map((src) => new URL(src, base).href),
    })),
  ]
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
