import { paragraphsOf, parseInline, slugify, type BlogBlock, type BlogLevel } from '@/lib/blog'
import type { HeadingTag } from '@/lib/heading-style'

// A post's blocks as the pieces the page shows (src/components/BlogContent.tsx), and its contents
// list. Text pasted as one long block is laid out too, in a post with no heading blocks of its own:
// a short line opening a section becomes its heading, and a run of short lines becomes a list.
// Google reads those as real headings and lists.

export type BlogPiece =
  | { type: 'heading'; id: string; text: string; level: BlogLevel; size?: HeadingTag }
  | { type: 'paragraph'; text: string; size?: HeadingTag }
  | { type: 'list'; items: string[]; ordered: boolean; size?: HeadingTag }
  | Extract<BlogBlock, { type: 'image' | 'link' }>

const BULLET = /^\s*(?:[-–•*·]|\d{1,2}[.)])\s+/
const NUMBER = /^\s*\d{1,2}[.)]\s+/
const MAX_ITEM = 110 // a line longer than this is text, not a list item
const words = (s: string) => s.split(/\s+/).length

// "What to Order": one short line, no full stop, no link
const looksLikeHeading = (text: string) =>
  !text.includes('\n') && text.length <= 70 && words(text) <= 11 && /[\p{L}\p{N}?)’'"”]$/u.test(text) && parseInline(text).every((p) => !p.href)
// A short line without a full stop: a heading or a list item
const isOpen = (line: string) => line.length <= MAX_ITEM && /[\p{L}\p{N})’'"”]$/u.test(line)

type Part = { kind: 'heading' | 'text'; text: string } | { kind: 'list'; items: string[]; ordered: boolean }

// One paragraph of several lines, line by line
function partsOf(text: string, headings: boolean): Part[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return [{ kind: 'text', text }]
  if (lines.every((l) => BULLET.test(l)))
    return [{ kind: 'list', items: lines.map((l) => l.replace(BULLET, '')), ordered: lines.every((l) => NUMBER.test(l)) }]
  if (!headings) return lines.length >= 3 && lines.every((l) => l.length <= MAX_ITEM) ? [{ kind: 'list', items: lines, ordered: false }] : [{ kind: 'text', text }]

  const parts: Part[] = []
  const list = (items: string[]) => parts.push({ kind: 'list', items, ordered: false })
  for (let i = 0; i < lines.length; ) {
    let end = i + 1
    if (isOpen(lines[i])) {
      while (end < lines.length && isOpen(lines[end])) end++
      const run = lines.slice(i, end)
      // "Made for sharing", then its text; "Why people come back", then its points
      const next = end < lines.length && run.length > 1 && words(run[run.length - 1]) <= 6 && looksLikeHeading(run[run.length - 1]) ? run.pop() : undefined
      if (run.length >= 3 && words(run[0]) <= 6 && looksLikeHeading(run[0])) parts.push({ kind: 'heading', text: run.shift()! })
      if (run.length >= 2) list(run)
      else if (run.length === 1) parts.push({ kind: end < lines.length && looksLikeHeading(run[0]) ? 'heading' : 'text', text: run[0] })
      if (next) parts.push({ kind: 'heading', text: next })
    } else {
      while (end < lines.length && !isOpen(lines[end])) end++
      const run = lines.slice(i, end)
      if (run.length >= 3 && run.every((l) => l.length <= MAX_ITEM)) list(run)
      else run.forEach((l) => parts.push({ kind: 'text', text: l }))
    }
    i = end
  }
  return parts
}

export function blogPieces(blocks: BlogBlock[]): BlogPiece[] {
  const headings = !blocks.some((b) => b.type === 'heading' && b.text.trim())
  const used = new Map<string, number>()
  const idFor = (text: string) => {
    const base = slugify(text) || 'section'
    const n = (used.get(base) ?? 0) + 1
    used.set(base, n)
    return n === 1 ? base : `${base}-${n}`
  }
  const heading = (text: string): BlogPiece => ({ type: 'heading', id: idFor(text), text, level: 'h2' })
  const pieces: BlogPiece[] = []
  for (const b of blocks) {
    if (b.type === 'heading') {
      if (b.text) pieces.push({ type: 'heading', id: idFor(b.text), text: b.text, level: b.level ?? 'h2', size: b.size })
    } else if (b.type === 'paragraph') {
      const size = b.size === 'p' ? undefined : b.size // "Normal text size" = the page's own
      for (const text of paragraphsOf(b.text))
        for (const part of partsOf(text, headings && !size))
          if (part.kind === 'heading') pieces.push(heading(part.text))
          else if (part.kind === 'list') pieces.push({ type: 'list', items: part.items, ordered: part.ordered, size })
          else pieces.push({ type: 'paragraph', text: part.text, size })
    } else if (b.type === 'image' ? b.src : b.url && b.label) pieces.push(b)
  }
  if (!headings) return pieces
  // A heading standing alone opens a section: never the first piece, and always with text under it
  return pieces.map((p, i) => {
    const under = pieces[i + 1]
    const opens = i > 0 && under && (under.type === 'list' || (under.type === 'paragraph' && !looksLikeHeading(under.text)))
    return p.type === 'paragraph' && !p.size && opens && looksLikeHeading(p.text) ? heading(p.text) : p
  })
}

// The contents list: the main sections
export const blogContents = (pieces: BlogPiece[]) =>
  pieces.flatMap((p) => (p.type === 'heading' && (p.level === 'h1' || p.level === 'h2') ? [{ id: p.id, text: p.text }] : []))

// A photo on Cloudinary in the size (and format) the screen needs; other addresses are unchanged
const CLOUDINARY = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?=v\d|boat\/|images\/)/
export const blogSrc = (src: string, width: number) => src.replace(CLOUDINARY, `$1f_auto,q_auto,c_limit,w_${width}/`)
export const blogSrcSet = (src: string) => (CLOUDINARY.test(src) ? [480, 800, 1200, 1600].map((w) => `${blogSrc(src, w)} ${w}w`).join(', ') : undefined)
