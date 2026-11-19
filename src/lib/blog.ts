// Blog posts: shared by the SEO Studio editor (/seo/blog) and the public pages (/blog).
// Safe in client components; the cached database reads are in src/lib/blog-data.ts.
export const BLOG_TAG = 'blog'

// One piece of a post's body, in reading order
export type BlogBlock =
  | { type: 'heading'; text: string }
  // Text; a blank line starts a new paragraph. Links: [link text](https://example.com)
  | { type: 'paragraph'; text: string }
  | { type: 'image'; src: string; alt: string; caption: string }
  // A button-style link to another site (or a page on this one)
  | { type: 'link'; label: string; url: string; nofollow: boolean }

export type BlogStatus = 'draft' | 'published'

export type BlogPost = {
  id: string
  slug: string
  title: string
  seo_title: string // Google title; empty = "<title> | Boat Seafood Dubai"
  description: string // Google description and the summary on /blog
  cover_image: string
  cover_alt: string
  blocks: BlogBlock[]
  status: BlogStatus
  noindex: boolean
  old_slugs: string[] // earlier addresses of a published post: they redirect here
  created_at: string
  updated_at: string
  published_at: string | null
}

export type BlogPostInput = Omit<BlogPost, 'id' | 'old_slugs' | 'created_at' | 'updated_at' | 'published_at'>

export const BLOG_LIMITS = {
  title: 120,
  seo_title: 120,
  slug: 80,
  description: 320,
  alt: 250,
  heading: 200,
  paragraph: 8000,
  caption: 300,
  label: 120,
  url: 1000,
  blocks: 120,
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, BLOG_LIMITS.slug)
    .replace(/-+$/g, '')
}

export const emptyPost = (): BlogPostInput => ({
  slug: '',
  title: '',
  seo_title: '',
  description: '',
  cover_image: '',
  cover_alt: '',
  blocks: [{ type: 'paragraph', text: '' }],
  status: 'draft',
  noindex: false,
})

export const blogTitle = (p: Pick<BlogPost, 'title' | 'seo_title'>) =>
  p.seo_title.trim() || `${p.title.trim()} | Boat Seafood Dubai`

export const isExternal = (url: string) => /^https?:\/\//i.test(url)

// Text with [label](url) links -> pieces to render (no HTML is ever injected)
export type InlinePiece = { text: string; href?: string }
const LINK_RE = /\[([^\]\n]{1,200})\]\(((?:https?:\/\/|\/|mailto:|tel:)[^\s)]{1,1000})\)/g

export function parseInline(text: string): InlinePiece[] {
  const out: InlinePiece[] = []
  let last = 0
  for (const m of text.matchAll(LINK_RE)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index) })
    out.push({ text: m[1], href: m[2] })
    last = m.index! + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}

export const paragraphsOf = (text: string) =>
  text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

export function plainText(blocks: BlogBlock[]) {
  return blocks
    .map((b) => (b.type === 'paragraph' ? b.text.replace(LINK_RE, '$1') : b.type === 'heading' ? b.text : ''))
    .join(' ')
}

export const wordCount = (blocks: BlogBlock[]) => plainText(blocks).split(/\s+/).filter(Boolean).length

export const readingMinutes = (blocks: BlogBlock[]) => Math.max(1, Math.round(wordCount(blocks) / 200))

// What must be fixed before a post can go live (alt text, title, address)
export function publishProblems(p: BlogPostInput): string[] {
  const problems: string[] = []
  if (!p.title.trim()) problems.push('Add a title.')
  if (!SLUG_RE.test(p.slug)) problems.push('Add a web address (lowercase letters, numbers and dashes).')
  if (!p.description.trim()) problems.push('Add a Google description.')
  if (p.cover_image && !p.cover_alt.trim()) problems.push('Add alt text for the cover photo.')
  p.blocks.forEach((b, i) => {
    if (b.type === 'image' && b.src && !b.alt.trim()) problems.push(`Add alt text for the photo in block ${i + 1}.`)
    if (b.type === 'link' && b.url && !b.label.trim()) problems.push(`Add link text for the link in block ${i + 1}.`)
  })
  if (!p.blocks.some((b) => (b.type === 'paragraph' && b.text.trim()) || (b.type === 'image' && b.src)))
    problems.push('Add some text to the post.')
  return problems
}
