import 'server-only'
import { safeCache } from '@/lib/safe-cache'
import { getDb, toPlain } from '@/lib/mongodb'
import { BLOG_TAG, type BlogPost } from '@/lib/blog'

// Published blog posts (blog_posts collection, edited in the SEO Studio, /seo/blog).
// Cached under the "blog" tag; saving, publishing or deleting a post calls updateTag('blog').
// Drafts are never read here, so they can't reach the site, the sitemap or Google.

export function toPost(doc: Record<string, unknown>): BlogPost {
  const d = toPlain(doc as never) as unknown as Partial<BlogPost> & { id: string }
  return {
    id: d.id,
    slug: d.slug ?? '',
    title: d.title ?? '',
    seo_title: d.seo_title ?? '',
    description: d.description ?? '',
    cover_image: d.cover_image ?? '',
    cover_alt: d.cover_alt ?? '',
    blocks: Array.isArray(d.blocks) ? d.blocks : [],
    status: d.status === 'published' ? 'published' : 'draft',
    noindex: !!d.noindex,
    old_slugs: Array.isArray(d.old_slugs) ? d.old_slugs : [],
    created_at: d.created_at ?? new Date(0).toISOString(),
    updated_at: d.updated_at ?? d.created_at ?? new Date(0).toISOString(),
    published_at: d.published_at ?? null,
  }
}

export const getPublishedPosts = safeCache(
  async (): Promise<BlogPost[]> => {
    const db = await getDb()
    const docs = await db.collection('blog_posts').find({ status: 'published' }).sort({ published_at: -1, _id: 1 }).toArray()
    return docs.map(toPost)
  },
  () => [],
  ['blog-posts'],
  { tags: [BLOG_TAG] },
  'blog posts',
)

// The post at this address, or the post that used to be there (the page then redirects)
export async function findPublishedPost(slug: string): Promise<{ post: BlogPost; redirect: boolean } | null> {
  const posts = await getPublishedPosts()
  const post = posts.find((p) => p.slug === slug)
  if (post) return { post, redirect: false }
  const moved = posts.find((p) => p.old_slugs.includes(slug))
  return moved ? { post: moved, redirect: true } : null
}
