import 'server-only'
import { defaultSection, getSectionDef, type SectionData } from '@/lib/content'
import { getSiteContent } from '@/lib/content-data'

// The /blog page text (SEO Studio -> Pages -> Blog). A site cache saved before a section existed
// has no entry for it, so fall back to the built-in text.
async function section(id: 'blog_hero' | 'blog_intro'): Promise<SectionData> {
  const content = await getSiteContent()
  return (content as Partial<Record<string, SectionData>>)[id] ?? defaultSection(getSectionDef(id)!)
}

export const blogSection = () => section('blog_hero')
export const blogIntroSection = () => section('blog_intro')
