// Site assets are served from Cloudinary (uploaded by scripts/upload-public-images.mjs with the
// same folders and file names they had in public/). cdn("/images/custom/x.webp") gives
// https://res.cloudinary.com/<cloud>/image/upload/images/custom/x.webp. To change one of these
// files, upload the new version to Cloudinary under the same name (or run that script again).
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'xmjctuc9'

export const CDN_BASE = `https://res.cloudinary.com/${CLOUD}/image/upload`

export const cdn = (path: string) => `${CDN_BASE}${path.startsWith('/') ? path : `/${path}`}`

// Video and audio use Cloudinary's /video/upload/ path. q_auto re-encodes at a lower bitrate
// (hero.mp4: 3.6 MB original -> 1.6 MB) with no visible loss.
export const cdnVideo = (path: string) =>
  `https://res.cloudinary.com/${CLOUD}/video/upload/q_auto${path.startsWith('/') ? path : `/${path}`}`
