"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Images } from "lucide-react";
import { useSection } from "@/context/ContentContext";
import { StyledHeading } from "@/components/ContentText";
import { eventPath, type EventCard } from "@/lib/events";

// The "Special Events" cards on /events: the events added in Admin -> Events, newest first.
// The title's link covers the whole card (one link per event).
export default function EventCards({ events }: { events: EventCard[] }) {
  const c = useSection("events_list");

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-12">
      {events.map((event, i) => (
        <motion.article
          key={event.id}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: (i % 3) * 0.1 }}
          className="group relative flex min-w-0 flex-col rounded-3xl has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-navy has-[a:focus-visible]:ring-offset-4 has-[a:focus-visible]:ring-offset-cream"
        >
          <div className="relative mb-6 aspect-[4/5] overflow-hidden rounded-3xl bg-navy/10 md:mb-8">
            <Image
              src={event.cover.src}
              alt={event.cover.alt}
              fill
              sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
              className="object-cover transition-transform duration-1000 group-hover:scale-110 motion-reduce:transition-none"
            />
            {event.tag && (
              <div className="absolute left-5 top-5 rounded-full bg-navy/90 px-4 py-2 backdrop-blur-md md:left-6 md:top-6">
                <span className="block text-[10px] font-bold uppercase tracking-[2px] text-cream">{event.tag}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-4">
            {(event.dateText || event.photoCount > 0) && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-bold uppercase tracking-[2px] text-ocean">
                {event.dateText && (
                  <span className="inline-flex items-center gap-2">
                    <Calendar size={14} aria-hidden /> <time dateTime={event.date}>{event.dateText}</time>
                  </span>
                )}
                {event.photoCount > 0 && (
                  <span className="inline-flex items-center gap-2">
                    <Images size={14} aria-hidden /> {event.photoCount} {event.photoCount === 1 ? "photo" : "photos"}
                  </span>
                )}
              </div>
            )}
            <StyledHeading as="h3" choice={c.fields.event_title_style} className="font-playfair text-2xl font-bold text-navy break-words">
              <Link href={eventPath(event.slug)} className="after:absolute after:inset-0 after:z-10 focus-visible:outline-none">
                {event.title}
              </Link>
            </StyledHeading>
            {event.description && <p className="text-[14px] font-light italic leading-relaxed text-navy/70">{event.description}</p>}
            <span aria-hidden className="mt-2 inline-flex items-center gap-3 text-[10px] font-bold uppercase tracking-[3px] text-navy">
              {c.fields.card_cta} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
