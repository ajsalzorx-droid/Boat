import { getActiveMenuItems, getLiveOffers, withOffers } from "@/lib/menu-data";
import { getBusinessInfo } from "@/lib/seo-data";
import { menuJsonLd } from "@/lib/seo";
import MenuClient from "./MenuClient";

// Server page: the dishes are in the HTML (and in the Menu schema below) for Google.
// ?table=12 comes from the QR code on a restaurant table; ?offers opens the Offers tab
// (the homepage offers popup links here).
export default async function MenuPage({ searchParams }: { searchParams: Promise<{ table?: string | string[]; offers?: string | string[] }> }) {
  const [{ table, offers: openOffers }, menuItems, offers, business] = await Promise.all([
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
      <MenuClient initialItems={items} tableNumber={tableNumber} openOffers={openOffers !== undefined} />
    </>
  );
}
