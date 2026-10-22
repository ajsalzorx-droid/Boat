import 'server-only'
import { unstable_cache } from 'next/cache'
import { getDb } from '@/lib/mongodb'
import { CONTENT_TAG, mergeAll, type SectionData, type SiteContent } from '@/lib/content'

// Page text saved in the SEO Studio (site_content collection, one document per section),
// merged over the built-in defaults. Cached under CONTENT_TAG until "Confirm & Publish".
export const getSiteContent = unstable_cache(
  async (): Promise<SiteContent> => {
    try {
      const db = await getDb()
      const docs = await db.collection<{ _id: string; data: SectionData }>('site_content').find().toArray()
      return mergeAll(docs.map((d) => ({ section: d._id, data: d.data })))
    } catch (e) {
      console.error('Error fetching page content:', e)
      return mergeAll([]) // database unreachable -> built-in text
    }
  },
  ['site-content'],
  { tags: [CONTENT_TAG] }
)
