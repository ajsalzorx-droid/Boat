import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// The fonts live in the repo (src/app/fonts, Latin, from Google Fonts) so a build never has to
// download them: a bad reply from Google can't break a deploy. Each file holds a range of weights.
const playfair = localFont({
  src: [
    { path: "./fonts/playfair-normal.woff2", weight: "400 600", style: "normal" },
    { path: "./fonts/playfair-italic.woff2", weight: "400 600", style: "italic" },
  ],
  variable: "--font-playfair-display",
  adjustFontFallback: "Times New Roman",
});

const jost = localFont({
  src: "./fonts/jost-normal.woff2",
  weight: "200 500",
  style: "normal",
  variable: "--font-jost",
});

const cormorant = localFont({
  src: [
    { path: "./fonts/cormorant-normal.woff2", weight: "300 400", style: "normal" },
    { path: "./fonts/cormorant-italic.woff2", weight: "300 400", style: "italic" },
  ],
  variable: "--font-cormorant-garamond",
  adjustFontFallback: "Times New Roman",
});

const outfit = localFont({
  src: "./fonts/outfit-normal.woff2",
  weight: "300 600",
  style: "normal",
  variable: "--font-outfit",
});

import SmoothScroll from "@/components/SmoothScroll";
import FloatingActions from "@/components/FloatingActions";

// Fallback for pages without their own SEO entry (admin, kitchen). Public pages set their
// title/description from the SEO dashboard via pageMetadata() in their page or layout.
export const metadata: Metadata = {
  title: "Boat Seafood Dubai",
  icons: {
    icon: "/icon.png",
  },
};

import { CartProvider } from "@/context/CartContext";
import { ContentProvider } from "@/context/ContentContext";
import { getSiteContent } from "@/lib/content-data";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Editable site text (SEO Studio) for every client component, via useSection()
  const content = await getSiteContent();

  return (
    <html lang="en">
      {/* Browser extensions (e.g. ColorZilla's cz-shortcut-listen) add attributes to <body> before hydration */}
      <body
        suppressHydrationWarning
        className={`${playfair.variable} ${jost.variable} ${cormorant.variable} ${outfit.variable} antialiased selection:bg-navy selection:text-cream`}
      >
        <ContentProvider content={content}>
          <CartProvider>
            <SmoothScroll>
              {children}
              <FloatingActions />
            </SmoothScroll>
          </CartProvider>
        </ContentProvider>
      </body>
    </html>
  );
}
