import { paragraphsOf, parseInline, slugify, type BlogBlock, type BlogLevel } from '@/lib/blog'
import type { HeadingTag } from '@/lib/heading-style'

// A post's blocks as the pieces the page shows (src/components/BlogContent.tsx), and its contents
// list. Text pasted as one long block is laid out too: lines become a list, and, in a post with no
// heading blocks of its own, a short line standing alone becomes a section heading.

export type BlogPiece =
  | { type: 'heading'; id: string; text: string; level: BlogLevel; size?: HeadingTag }
  | { type: 'paragraph'; text: string; size?: HeadingTag }
  | { type: 'list'; items: string[]; ordered: boolean; size?: HeadingTag }
  | Extract<BlogBlock, { type: 'image' | 'link' }>

const BULLET = /^\s*(?:[-–•*·]|\d{1,2}[.)])\s+/
const NUMBER = /^\s*\d{1,2}[.)]\s+/
const MAX_ITEM = 110 // a plain line longer than this is text, not a list item

// Every line marked as a point, or at least three short plain lines
function listOf(text: string) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const marked = lines.length >= 2 && lines.every((l) => BULLET.test(l))
  const plain = lines.length >= 3 && lines.every((l) => l.length <= MAX_ITEM)
  if (!marked && !plain) return null
  return { items: marked ? lines.map((l) => l.replace(BULLET, '')) : lines, ordered: marked && lines.every((l) => NUMBER.test(l)) }
}

// "What to Order": one short line, no full stop, no link
const looksLikeHeading = (text: string) =>
  !text.includes('\n') && text.length <= 70 && text.split(/\s+/).length <= 11 && /[\p{L}\p{N}?)’'"”]$/u.test(text) && parseInline(text).every((p) => !p.href)

export function blogPieces(blocks: BlogBlock[]): BlogPiece[] {
  const hasHeadings = blocks.some((b) => b.type === 'heading' && b.text.trim())
  const used = new Map<string, number>()
  const idFor = (text: string) => {
    const base = slugify(text) || 'section'
    const n = (used.get(base) ?? 0) + 1
    used.set(base, n)
    return n === 1 ? base : `${base}-${n}`
  }
  const pieces: BlogPiece[] = []
  for (const b of blocks) {
    if (b.type === 'heading') {
      if (b.text) pieces.push({ type: 'heading', id: idFor(b.text), text: b.text, level: b.level ?? 'h2', size: b.size })
    } else if (b.type === 'paragraph') {
      for (const text of paragraphsOf(b.text)) {
        const list = listOf(text)
        if (list) pieces.push({ type: 'list', ...list, size: b.size })
        else pieces.push({ type: 'paragraph', text, size: b.size })
      }
    } else if (b.type === 'image' ? b.src : b.url && b.label) pieces.push(b)
  }
  if (hasHeadings) return pieces
  // A heading opens a section: never the first piece, and always with text or a list under it
  return pieces.map((p, i) => {
    const under = pieces[i + 1]
    const opens = i > 0 && under && (under.type === 'list' || (under.type === 'paragraph' && !looksLikeHeading(under.text)))
    return p.type === 'paragraph' && !p.size && opens && looksLikeHeading(p.text) ? { type: 'heading', id: idFor(p.text), text: p.text, level: 'h2' } : p
  })
}

// The contents list: the main sections
export const blogContents = (pieces: BlogPiece[]) =>
  pieces.flatMap((p) => (p.type === 'heading' && (p.level === 'h1' || p.level === 'h2') ? [{ id: p.id, text: p.text }] : []))
