import 'server-only'
import { defaultSection, getSectionDef, type SectionData } from '@/lib/content'
import { getSiteContent } from '@/lib/content-data'

// The /blog page text (SEO Studio -> Pages -> Blog). A site cache saved before this section
// existed has no entry for it, so fall back to the built-in text.
export async function blogSection(): Promise<SectionData> {
  const content = await getSiteContent()
  return (content as Partial<Record<string, SectionData>>).blog_hero ?? defaultSection(getSectionDef('blog_hero')!)
}
