import 'server-only'
import { unstable_cache } from 'next/cache'
import { getDb } from '@/lib/mongodb'
import { CONTENT_TAG, mergeAll, type SectionData, type SiteContent } from '@/lib/content'
import { DEFAULT_BUSINESS, SEO_TAG } from '@/lib/seo'
import { getBusinessInfo } from '@/lib/seo-data'
import { formatTime } from '@/lib/bookings'

// The opening hours are set in one place, SEO Studio -> Business info (opens, closes). Any page text
// can show them with {hours}: e.g. "Open Daily: {hours}" -> "Open Daily: 11:00 AM – 1:00 AM". So the
// top bar, footer, visit and location sections never disagree, and a change is made once.
export const hoursText = (opens: string, closes: string) => `${formatTime(opens)} – ${formatTime(closes)}`

function fillHours(content: SiteContent, hours: string): SiteContent {
  const fill = (v: string) => (v.includes('{hours}') ? v.replaceAll('{hours}', hours) : v)
  const out = {} as SiteContent
  for (const [id, section] of Object.entries(content) as [keyof SiteContent, SectionData][]) {
    out[id] = {
      ...section,
      fields: Object.fromEntries(Object.entries(section.fields).map(([k, v]) => [k, fill(v)])),
      items: section.items?.map((item) => Object.fromEntries(Object.entries(item).map(([k, v]) => [k, fill(v)]))),
    } as SectionData
  }
  return out
}

// Page text saved in the SEO Studio (site_content collection, one document per section),
// merged over the built-in defaults. Cached under CONTENT_TAG until "Confirm & Publish".
export const getSiteContent = unstable_cache(
  async (): Promise<SiteContent> => {
    try {
      const db = await getDb()
      const [docs, business] = await Promise.all([
        db.collection<{ _id: string; data: SectionData }>('site_content').find().toArray(),
        getBusinessInfo(),
      ])
      return fillHours(mergeAll(docs.map((d) => ({ section: d._id, data: d.data }))), hoursText(business.opens, business.closes))
    } catch (e) {
      console.error('Error fetching page content:', e)
      return fillHours(mergeAll([]), hoursText(DEFAULT_BUSINESS.opens, DEFAULT_BUSINESS.closes)) // database unreachable -> built-in text
    }
  },
  ['site-content-v3'], // v3: "Table Booking" nav label (Nov 2026); renamed so old saved copies aren't used
  { tags: [CONTENT_TAG, SEO_TAG] } // the hours come from the business info (SEO_TAG)
)
