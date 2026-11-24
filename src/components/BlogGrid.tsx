"use client";

import { Children, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

// The post cards of the blog page, a few at a time. The later ones are in the page from the start
// (Google follows their links); they are only hidden, and their photos load once they show.
// above = posts shown over the cards, for the count.
export default function BlogGrid({ step, above, className, children }: { step: number; above: number; className: string; children: ReactNode }) {
  const cards = Children.toArray(children);
  const [shown, setShown] = useState(step);
  const listRef = useRef<HTMLUListElement>(null);

  const showMore = () => {
    const next = shown;
    setShown(shown + step);
    // Keyboard and screen readers carry on at the first new card
    requestAnimationFrame(() => listRef.current?.children[next]?.querySelector("a")?.focus({ preventScroll: true }));
  };

  return (
    <>
      <ul ref={listRef} className={className}>
        {cards.map((card, i) => (
          <li key={i} className={`min-w-0 ${i < shown ? "flex" : "hidden"}`}>
            {card}
          </li>
        ))}
      </ul>
      {shown < cards.length && (
        <div className="mt-9 md:mt-12 text-center">
          <button
            type="button"
            onClick={showMore}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-navy/25 px-7 py-3.5 text-[11px] tracking-[2px] uppercase font-bold text-navy hover:bg-navy hover:text-cream transition-colors"
          >
            Show more <ChevronDown size={16} aria-hidden />
          </button>
          <p className="mt-3 text-[13px] text-navy/60" aria-live="polite">
            {shown + above} of {cards.length + above} posts
          </p>
        </div>
      )}
    </>
  );
}
