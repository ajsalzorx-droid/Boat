import Link from "next/link";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { pageMetadata } from "@/lib/seo-data";
import { MENU_BOOK_PDF_NAME, MENU_BOOK_PDF_URL, MENU_BOOK_URL } from "@/lib/menu-book";

export const generateMetadata = () => pageMetadata("/menu-book");

// The BOAT menu book as a flip book (Heyzine), filling the screen under a slim bar with the way
// back to the site (old /seafood-menu-book links redirect here). The company profile is at /profile.
export default function MenuBookPage() {
  return (
    <main className="fixed inset-0 flex flex-col bg-ink">
      <h1 className="sr-only">BOAT Seafood Restaurant menu book</h1>
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] text-cream font-jost text-[12px] uppercase tracking-[2px]">
        <Link href="/" className="inline-flex items-center gap-2 hover:text-ocean transition-colors">
          <ArrowLeft size={16} aria-hidden /> Back to site
        </Link>
        <div className="flex items-center gap-2 sm:gap-5">
          <a
            href={MENU_BOOK_PDF_URL}
            download={MENU_BOOK_PDF_NAME}
            className="inline-flex items-center gap-2 rounded-full bg-ocean text-navy px-3.5 py-1.5 font-bold hover:bg-cream transition-colors"
          >
            <Download size={14} aria-hidden /> Download<span className="hidden sm:inline"> PDF</span>
          </a>
          <a href={MENU_BOOK_URL} target="_blank" rel="noopener noreferrer" className="hidden sm:inline-flex items-center gap-2 hover:text-ocean transition-colors">
            Open full screen <ExternalLink size={14} aria-hidden />
          </a>
        </div>
      </div>
      <iframe
        src={MENU_BOOK_URL}
        title="BOAT Seafood Restaurant menu book"
        className="w-full flex-1 min-h-0 border-0 bg-ink"
        allow="fullscreen"
        allowFullScreen
      />
    </main>
  );
}
