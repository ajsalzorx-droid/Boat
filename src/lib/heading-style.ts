// Heading tag + font size, chosen by the SEO specialist in the SEO Studio (page headings and blog
// text). Safe in client components.
export const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'] as const
export type HeadingTag = (typeof HEADING_TAGS)[number]

export const HEADING_TAG_NAMES: Record<HeadingTag, string> = {
  h1: 'H1 – main heading',
  h2: 'H2 – section heading',
  h3: 'H3 – sub heading',
  h4: 'H4',
  h5: 'H5',
  h6: 'H6',
  p: 'P – normal text (not a heading)',
}

export const HEADING_SIZE_NAMES: Record<HeadingTag, string> = {
  h1: 'H1 size – largest',
  h2: 'H2 size',
  h3: 'H3 size',
  h4: 'H4 size',
  h5: 'H5 size',
  h6: 'H6 size',
  p: 'Normal text size',
}

// Page headings: the bigger sizes shrink on phones
export const HEADING_FONT_SIZES: Record<HeadingTag, string> = {
  h1: 'clamp(38px, 6vw, 76px)',
  h2: 'clamp(30px, 4.5vw, 56px)',
  h3: 'clamp(25px, 3vw, 40px)',
  h4: 'clamp(21px, 2.2vw, 30px)',
  h5: 'clamp(18px, 1.7vw, 23px)',
  h6: '17px',
  p: '15px',
}

export const isHeadingTag = (v: unknown): v is HeadingTag => HEADING_TAGS.includes(v as HeadingTag)

// Stored as "tag:size", e.g. "h3:h2"; either part may be empty (= the page's own design)
export type HeadingStyle = { tag: HeadingTag | ''; size: HeadingTag | '' }

export function parseHeadingStyle(value: string | undefined): HeadingStyle {
  const [tag, size] = (value ?? '').split(':')
  return { tag: isHeadingTag(tag) ? tag : '', size: isHeadingTag(size) ? size : '' }
}

export const formatHeadingStyle = ({ tag, size }: HeadingStyle) => (tag || size ? `${tag}:${size}` : '')
