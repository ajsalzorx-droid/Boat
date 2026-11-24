import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { isExternal, parseInline } from "@/lib/blog";
import type { BlogPiece } from "@/lib/blog-layout";
import type { HeadingTag } from "@/lib/heading-style";

// A blog post's body (server component). Text is rendered as React text, never as HTML, so
// nothing typed in the studio can inject markup or scripts.

function linkRel(url: string, nofollow = false) {
  if (!isExternal(url)) return undefined;
  return nofollow ? "nofollow sponsored noopener noreferrer" : "noopener noreferrer";
}

function SmartLink({ href, nofollow, className, children }: { href: string; nofollow?: boolean; className?: string; children: React.ReactNode }) {
  if (href.startsWith("/"))
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  const external = isExternal(href);
  return (
    <a href={href} className={className} {...(external && { target: "_blank", rel: linkRel(href, nofollow) })}>
      {children}
    </a>
  );
}

function Inline({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, li) => (
        <span key={li}>
          {li > 0 && <br />}
          {parseInline(line).map((piece, i) =>
            piece.href ? (
              <SmartLink key={i} href={piece.href} className="font-medium text-navy underline underline-offset-4 decoration-ocean decoration-2 hover:text-ocean transition-colors break-words">
                {piece.text}
              </SmartLink>
            ) : (
              <span key={i}>{piece.text}</span>
            )
          )}
        </span>
      ))}
    </>
  );
}

// Font size of each level (H2 = the size headings always had)
const SIZES: Record<HeadingTag, string> = {
  h1: "text-[28px] md:text-[42px]",
  h2: "text-2xl md:text-3xl",
  h3: "text-xl md:text-2xl",
  h4: "text-lg md:text-xl",
  h5: "text-[17px] md:text-lg",
  h6: "text-base",
  p: "text-[16px] md:text-[17px]",
};

export default function BlogContent({ pieces }: { pieces: BlogPiece[] }) {
  const lead = pieces.findIndex((p) => p.type === "paragraph"); // the opening paragraph, a little larger
  return (
    <div className="space-y-5 md:space-y-6 text-[16px] md:text-[17px] leading-[1.75] md:leading-[1.85] text-navy/85 font-normal break-words">
      {pieces.map((p, i) => {
        if (p.type === "heading") {
          const Tag = p.level;
          const main = p.level === "h1" || p.level === "h2";
          return (
            <Tag key={i} id={p.id} className={`font-playfair ${SIZES[p.size ?? p.level]} font-bold text-navy leading-tight text-balance scroll-mt-28 md:scroll-mt-36 ${main ? "pt-6 md:pt-8 first:pt-0" : "pt-3"}`}>
              {main && <span aria-hidden className="block w-10 h-[3px] rounded-full bg-ocean mb-4" />}
              {p.text}
            </Tag>
          );
        }
        if (p.type === "paragraph")
          return (
            <p
              key={i}
              className={
                p.size ? `${SIZES[p.size]} leading-relaxed` : i === lead ? "text-[18px] md:text-[20px] leading-[1.7] text-navy" : undefined
              }
            >
              <Inline text={p.text} />
            </p>
          );
        if (p.type === "list") {
          const List = p.ordered ? "ol" : "ul";
          return (
            <List key={i} className={`rounded-2xl bg-white/55 border border-navy/10 px-4 py-4 md:px-6 md:py-5 space-y-2.5 ${p.size ? SIZES[p.size] : ""}`}>
              {p.items.map((item, n) => (
                <li key={n} className="flex gap-3 leading-[1.6]">
                  {p.ordered ? (
                    <span aria-hidden className="shrink-0 w-6 text-ocean font-medium tabular-nums">{n + 1}.</span>
                  ) : (
                    <span aria-hidden className="shrink-0 mt-[0.62em] w-1.5 h-1.5 rounded-full bg-ocean" />
                  )}
                  <span className="min-w-0">
                    <Inline text={item} />
                  </span>
                </li>
              ))}
            </List>
          );
        }
        if (p.type === "image")
          return (
            <figure key={i} className="py-3 md:py-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.alt} loading="lazy" decoding="async" className="block w-auto h-auto max-w-full max-h-[70vh] md:max-h-[640px] mx-auto rounded-2xl shadow-lg" />
              {p.caption && <figcaption className="mt-3 text-sm text-navy/60 text-center italic">{p.caption}</figcaption>}
            </figure>
          );
        return (
          <p key={i}>
            <SmartLink
              href={p.url}
              nofollow={p.nofollow}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-navy/25 hover:border-ocean hover:text-ocean px-5 py-3 text-[11px] tracking-[2px] uppercase font-bold text-navy transition-colors"
            >
              {p.label} <ArrowUpRight size={14} className="shrink-0" aria-hidden />
            </SmartLink>
          </p>
        );
      })}
    </div>
  );
}
