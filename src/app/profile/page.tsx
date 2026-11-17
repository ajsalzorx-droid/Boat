import Link from "next/link";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { pageMetadata } from "@/lib/seo-data";
import { PROFILE_FLIPBOOK_URL, PROFILE_PDF_NAME, PROFILE_PDF_URL } from "@/lib/profile-book";

export const generateMetadata = () => pageMetadata("/profile");

// The BOAT profile brochure as a flip book (Heyzine), filling the screen under a slim bar with the
// way back to the site (old /seafood-menu-book links redirect here). The site's own version,
// src/components/ProfileBook.tsx, is no longer shown but kept, should it be wanted again.
export default function ProfilePage() {
  return (
    <main className="fixed inset-0 flex flex-col bg-ink">
      <h1 className="sr-only">BOAT Seafood Restaurant profile flip book</h1>
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] text-cream font-jost text-[12px] uppercase tracking-[2px]">
        <Link href="/" className="inline-flex items-center gap-2 hover:text-ocean transition-colors">
          <ArrowLeft size={16} aria-hidden /> Back to site
        </Link>
        <div className="flex items-center gap-2 sm:gap-5">
          <a
            href={PROFILE_PDF_URL}
            download={PROFILE_PDF_NAME}
            className="inline-flex items-center gap-2 rounded-full bg-ocean text-navy px-3.5 py-1.5 font-bold hover:bg-cream transition-colors"
          >
            <Download size={14} aria-hidden /> Download<span className="hidden sm:inline"> PDF</span>
          </a>
          <a href={PROFILE_FLIPBOOK_URL} target="_blank" rel="noopener noreferrer" className="hidden sm:inline-flex items-center gap-2 hover:text-ocean transition-colors">
            Open full screen <ExternalLink size={14} aria-hidden />
          </a>
        </div>
      </div>
      <iframe
        src={PROFILE_FLIPBOOK_URL}
        title="BOAT Seafood Restaurant profile flip book"
        className="w-full flex-1 min-h-0 border-0 bg-ink"
        allow="fullscreen"
        allowFullScreen
      />
    </main>
  );
}
