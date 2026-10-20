import type { Metadata } from "next";
import { Playfair_Display, Jost, Cormorant_Garamond, Outfit } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  weight: ["200", "300", "400", "500"],
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant-garamond",
  weight: ["300", "400"],
  style: ["normal", "italic"],
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600"],
});

import SmoothScroll from "@/components/SmoothScroll";
import FloatingActions from "@/components/FloatingActions";
import CatboComingSoon from "@/components/CatboComingSoon";

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
import { getSiteContent } from "@/lib/content";

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
              {/* Catbo coming-soon card, opened from the fishing sign in the header */}
              <CatboComingSoon />
            </SmoothScroll>
          </CartProvider>
        </ContentProvider>
      </body>
    </html>
  );
}
