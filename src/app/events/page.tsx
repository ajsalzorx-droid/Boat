import EventsClient from "./EventsClient";
import { eventPath, toEventCard } from "@/lib/events";
import { getEvents } from "@/lib/events-data";
import { getBusinessInfo } from "@/lib/seo-data";
import { siteUrl } from "@/lib/seo";

// Server page: the events are in the HTML (and in the list below) for Google.
export default async function EventsPage() {
  const [events, business] = await Promise.all([getEvents(), getBusinessInfo()]);
  const origin = siteUrl(business).origin;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: origin },
        { "@type": "ListItem", position: 2, name: "Events", item: `${origin}/events` },
      ],
    },
    ...(events.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: events.map((e, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: e.title,
              url: `${origin}${eventPath(e.slug)}`,
            })),
          },
        ]
      : []),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output, with "<" escaped so text can't close the script tag
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <EventsClient events={events.map(toEventCard)} />
    </>
  );
}
