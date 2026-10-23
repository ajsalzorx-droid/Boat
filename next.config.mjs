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
  // The flip book has one address; old /seafood-menu-book links (and Google) move to it permanently
  async redirects() {
    return [{ source: "/seafood-menu-book", destination: "/profile", permanent: true }];
  },
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
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
