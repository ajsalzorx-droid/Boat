import { getBusinessInfo, pageMetadata } from "@/lib/seo-data";
import { getActiveMenuItems, getLiveOffers, withOffers } from "@/lib/menu-data";
import { unitPrice } from "@/lib/offers";
import { WHATSAPP_DISPLAY } from "@/lib/whatsapp";
import { MAX_PREORDER_QTY } from "@/lib/bookings";
import BookingForm from "./BookingForm";

export const generateMetadata = () => pageMetadata("/book");

// Online booking: table reservations and fish-preparation requests (?type=fish opens that tab).
// Opening hours (for the time slots) come from the SEO Studio business info; the phone shown is
// the WhatsApp number (NEXT_PUBLIC_WHATSAPP_NUMBER).
// ?dish=<id>&qty=<n> (from a dish's "Add to order" -> Table Booking) starts with that dish pre-ordered.
export default async function BookPage({ searchParams }: { searchParams: Promise<{ type?: string | string[]; dish?: string | string[]; qty?: string | string[] }> }) {
  const [{ type, dish, qty }, business, menuItems, offers] = await Promise.all([searchParams, getBusinessInfo(), getActiveMenuItems(), getLiveOffers()]);
  // Dishes to pre-order (same name listed twice in the menu shows once), with offer prices
  const seen = new Set<string>();
  const dishes = withOffers(menuItems, offers)
    .filter((d) => {
      const key = d.name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((d) => ({ id: d.id, name: d.name, category: d.category, image: d.image, price: Number(d.price) || 0, offerPrice: unitPrice(d), discount: d.discount ?? 0 }));
  // The dish asked for, as listed here (a dish whose name is listed twice shows under its first id)
  const asked = typeof dish === "string" ? menuItems.find((d) => d.id === dish) : undefined;
  const pick = asked && dishes.find((d) => d.name.trim().toLowerCase() === asked.name.trim().toLowerCase());
  const quantity = Math.min(Math.max(Math.floor(Number(qty)) || 1, 1), MAX_PREORDER_QTY);
  return (
    <BookingForm
      initialItems={pick ? [{ id: pick.id, quantity }] : []}
      initialType={type === "fish" ? "fish" : "table"}
      hours={{ opens: business.opens, closes: business.closes }}
      // Bookings use the restaurant mobile (calls and WhatsApp), not the landline
      phone={WHATSAPP_DISPLAY}
      dishes={dishes}
    />
  );
}
