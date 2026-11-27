import { getActiveMenuItems, getLiveOffers, withOffers } from "@/lib/menu-data";
import type { Metadata } from "next";
import { getBusinessInfo, pageMetadata } from "@/lib/seo-data";
import { menuJsonLd } from "@/lib/seo";
import MenuClient from "./MenuClient";

type MenuSearch = { table?: string | string[]; offers?: string | string[]; dish?: string | string[] };

// A shared dish (?dish=<id>, the Share button in a dish's details): the link preview on WhatsApp
// and other apps shows that dish's name, description and photo. The page stays /menu for Google
// (canonical), so there are no extra pages to index.
export async function generateMetadata({ searchParams }: { searchParams: Promise<MenuSearch> }): Promise<Metadata> {
  const [{ dish }, base, items] = await Promise.all([searchParams, pageMetadata("/menu"), getActiveMenuItems()]);
  const item = typeof dish === "string" ? items.find((d) => d.id === dish) : undefined;
  if (!item) return base;
  const title = `${item.name} · AED ${item.price}`;
  const description = item.description || base.description || "";
  // WhatsApp's preview may skip WebP: Cloudinary photos go as a 1200x630 JPG (others unchanged)
  const photo = item.image.replace(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)/, "$1f_jpg,c_fill,w_1200,h_630/");
  const images = item.image ? [{ url: photo, width: photo === item.image ? undefined : 1200, height: photo === item.image ? undefined : 630, alt: item.name }] : base.openGraph?.images;
  return {
    ...base,
    title: { absolute: `${item.name} | Boat Seafood` },
    description,
    openGraph: { ...base.openGraph, url: `/menu?dish=${encodeURIComponent(item.id)}`, title, description, images },
    twitter: { ...base.twitter, title, description, images },
  };
}

// Server page: the dishes are in the HTML (and in the Menu schema below) for Google.
// ?table=12 comes from the QR code on a restaurant table; ?offers opens the Offers tab
// (the homepage offers popup links here).
export default async function MenuPage({ searchParams }: { searchParams: Promise<MenuSearch> }) {
  const [{ table, offers: openOffers, dish }, menuItems, offers, business] = await Promise.all([
    searchParams,
    getActiveMenuItems(),
    getLiveOffers(),
    getBusinessInfo(),
  ]);
  const tableNumber = typeof table === "string" && table ? table : null;
  const items = withOffers(menuItems, offers);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(menuJsonLd(business, items)).replace(/</g, "\u003c") }}
      />
      <MenuClient initialItems={items} tableNumber={tableNumber} openOffers={openOffers !== undefined} openDish={typeof dish === "string" ? dish : null} />
    </>
  );
}
