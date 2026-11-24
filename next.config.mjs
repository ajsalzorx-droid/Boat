// Plain JavaScript (not .ts): Next would otherwise compile this file on every start, which takes
// ~10s here because Windows blocks the native compiler and Next falls back to WebAssembly.
/** @type {import("next").NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "**.pexels.com",
      },
      // Photos stored on Cloudinary (uploaded in the SEO Studio / admin, and the site images)
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  // Old /seafood-menu-book links (and Google) move to the menu book permanently
  async redirects() {
    return [
      { source: "/seafood-menu-book", destination: "/menu-book", permanent: true },
      // The menu book PDF used to be named as the profile
      { source: "/boat-seafood-profile.pdf", destination: "/boat-seafood-menu.pdf", permanent: true },
      // The 360° view moved from /virtual-tour; old links keep working
      { source: "/virtual-tour", destination: "/360-view", permanent: true },
      // The printed game QR code (public/images/qr/game-qr.*): the homepage with Catbo Racing open.
      // Not permanent, so where it leads can change later without reprinting the code
      { source: "/game", destination: "/?play=game", permanent: false },
    ];
  },
  // How long the CDN may show an old page while it fetches the new one. With revalidate = 60
  // (src/app/layout.tsx) pages are sent as "s-maxage=60, stale-while-revalidate=60". The default
  // (1 year) let the Hostinger CDN keep showing old pages after an update.
  expireTime: 120,
  // Don't advertise the framework (an "X-Powered-By: Next.js" header helps attackers pick exploits)
  poweredByHeader: false,
  // Security headers on every response
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Pages can only be shown in frames on this site (the SEO Studio previews pages in a frame)
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'" },
          // Browsers must use the declared file type (no guessing that turns an upload into a script)
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Other sites only see the domain a visitor came from, not the full address
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // HTTPS only for a year once a visitor has been to the site over HTTPS
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Features the site never uses are switched off
          // Location: this site only (the discount game checks the player is at the restaurant)
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
