// Shared by the brochure flip book (src/components/ProfileBook.tsx): page shape and viewer backdrop.

// Pages of the printed BOAT PROFILE-26 brochure are landscape, 1418 × 840 in the artwork
export const BROCHURE_RATIO = 1418 / 840;

// Light grey viewer backdrop with soft diagonal light and shade, like Heyzine's "back5" background
export function BrochureBackdrop() {
  return (
    <svg viewBox="0 0 1440 560" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="brochure-backdrop" x1="100%" y1="50%" x2="0%" y2="50%">
          <stop offset="0" stopColor="#dbdbdb" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <rect width="1440" height="560" fill="url(#brochure-backdrop)" />
      <path d="M1440 0L1070.88 0L1440 165.39z" fill="rgba(255,255,255,.1)" />
      <path d="M1070.88 0L1440 165.39L1440 342.21L948.48 0z" fill="rgba(255,255,255,.075)" />
      <path d="M948.48 0L1440 342.21L1440 362.52L942.4 0z" fill="rgba(255,255,255,.05)" />
      <path d="M942.4 0L1440 362.52L1440 433.83L908.53 0z" fill="rgba(255,255,255,.025)" />
      <path d="M0 560L472.02 560L0 403.31z" fill="rgba(0,0,0,.06)" />
      <path d="M0 403.31L472.02 560L521.23 560L0 353.99z" fill="rgba(0,0,0,.045)" />
      <path d="M0 353.99L521.23 560L1013.96 560L0 179.99z" fill="rgba(0,0,0,.03)" />
      <path d="M0 179.99L1013.96 560L1300.81 560L0 81.35z" fill="rgba(0,0,0,.015)" />
    </svg>
  );
}
