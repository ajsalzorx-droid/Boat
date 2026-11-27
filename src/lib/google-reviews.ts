import 'server-only'
import { safeCache } from '@/lib/safe-cache'

// The restaurant's Google rating and reviews, for the homepage reviews section (Testimonials.tsx).
// Read from the Google Places API (New), so set up in .env.local (server only, never NEXT_PUBLIC_):
//   GOOGLE_PLACES_API_KEY  Google Cloud -> APIs & Services: enable "Places API (New)", create a key
//                          (restrict it to that API)
//   GOOGLE_PLACE_ID        the restaurant's place id, e.g. ChIJ... (Google's "Place ID Finder")
// Google gives the 5 reviews it picks as most relevant. Cached for REFRESH_S, so Google is asked about
// twice a day. Not set up, or Google can't be reached: null, and the section shows the reviews
// written in the SEO Studio instead.

const REFRESH_S = 12 * 60 * 60

export type GoogleReview = {
  author: string
  authorUrl: string | null // the reviewer's Google profile
  photo: string | null
  rating: number // 1-5
  text: string
  when: string // "2 weeks ago"
  url: string | null // the review on Google Maps
}

export type GoogleReviews = {
  rating: number // e.g. 4.7
  count: number // all reviews on Google
  reviews: GoogleReview[]
  mapsUrl: string | null // the restaurant on Google Maps (all reviews)
  writeUrl: string // the "write a review" box on Google
}

const placeId = () => process.env.GOOGLE_PLACE_ID?.trim() ?? ''

// Google's own "write a review" address for the place, when its id is set up
export const googleWriteReviewUrl = () => (placeId() ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId())}` : null)

type PlaceResponse = {
  rating?: number
  userRatingCount?: number
  googleMapsUri?: string
  reviews?: {
    rating?: number
    text?: { text?: string }
    originalText?: { text?: string }
    relativePublishTimeDescription?: string
    googleMapsUri?: string
    authorAttribution?: { displayName?: string; uri?: string; photoUri?: string }
  }[]
}

async function readGoogle(): Promise<GoogleReviews | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim()
  const id = placeId()
  if (!key || !id) return null
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?languageCode=en`, {
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri,reviews' },
    signal: AbortSignal.timeout(10_000),
  })
  // Throwing keeps a failed read out of the cache (safeCache): the next visit tries again
  if (!res.ok) throw new Error(`Google Places ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
  const place = (await res.json()) as PlaceResponse
  const reviews = (place.reviews ?? [])
    .map((r) => ({
      author: r.authorAttribution?.displayName?.trim() || 'Google user',
      authorUrl: r.authorAttribution?.uri || null,
      photo: r.authorAttribution?.photoUri || null,
      rating: Math.min(Math.max(Math.round(r.rating ?? 0), 0), 5),
      text: (r.text?.text || r.originalText?.text || '').trim(),
      when: r.relativePublishTimeDescription || '',
      url: r.googleMapsUri || null,
    }))
    .filter((r) => r.text) // star-only reviews have nothing to show
  return {
    rating: Math.round((place.rating ?? 0) * 10) / 10,
    count: place.userRatingCount ?? 0,
    reviews,
    mapsUrl: place.googleMapsUri || null,
    writeUrl: googleWriteReviewUrl()!,
  }
}

export const getGoogleReviews = safeCache(readGoogle, () => null, ['google-reviews'], { tags: ['google-reviews'], revalidate: REFRESH_S }, 'Google reviews')
