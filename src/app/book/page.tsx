import { getBusinessInfo, pageMetadata } from "@/lib/seo-data";
import { getActiveMenuItems, getLiveOffers, withOffers } from "@/lib/menu-data";
import { unitPrice } from "@/lib/offers";
import BookingForm from "./BookingForm";

export const generateMetadata = () => pageMetadata("/book");

// Online booking: table reservations and fish-preparation requests (?type=fish opens that tab).
// Opening hours (for the time slots) and the phone number come from the SEO Studio business info.
export default async function BookPage({ searchParams }: { searchParams: Promise<{ type?: string | string[] }> }) {
  const [{ type }, business, menuItems, offers] = await Promise.all([searchParams, getBusinessInfo(), getActiveMenuItems(), getLiveOffers()]);
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
  return (
    <BookingForm
      initialType={type === "fish" ? "fish" : "table"}
      hours={{ opens: business.opens, closes: business.closes }}
      phone={business.phone}
      dishes={dishes}
    />
  );
}
