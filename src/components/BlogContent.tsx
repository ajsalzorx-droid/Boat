import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { isExternal, paragraphsOf, parseInline, type BlogBlock } from "@/lib/blog";
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
              <SmartLink key={i} href={piece.href} className="text-ocean underline underline-offset-4 decoration-ocean/40 hover:text-navy">
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
  h1: "text-3xl md:text-[42px]",
  h2: "text-2xl md:text-3xl",
  h3: "text-xl md:text-2xl",
  h4: "text-lg md:text-xl",
  h5: "text-[17px] md:text-lg",
  h6: "text-base",
  p: "text-[17px]",
};

export default function BlogContent({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <div className="space-y-6 text-[17px] leading-[1.85] text-navy/85 font-light">
      {blocks.map((b, i) => {
        if (b.type === "heading") {
          const Tag = b.level ?? "h2";
          return b.text ? (
            <Tag key={i} className={`font-playfair ${SIZES[b.size ?? Tag]} font-bold text-navy pt-6 leading-tight`}>
              {b.text}
            </Tag>
          ) : null;
        }
        if (b.type === "paragraph")
          return paragraphsOf(b.text).map((p, j) => (
            <p key={`${i}-${j}`} className={b.size && `${SIZES[b.size]} leading-relaxed`}>
              <Inline text={p} />
            </p>
          ));
        if (b.type === "image")
          return b.src ? (
            <figure key={i} className="my-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.src} alt={b.alt} loading="lazy" decoding="async" className="w-full h-auto rounded-sm" />
              {b.caption && <figcaption className="mt-3 text-sm text-navy/50 text-center italic">{b.caption}</figcaption>}
            </figure>
          ) : null;
        return b.url && b.label ? (
          <p key={i}>
            <SmartLink
              href={b.url}
              nofollow={b.nofollow}
              className="inline-flex items-center gap-2 border border-navy/20 hover:border-ocean hover:text-ocean px-5 py-3 text-[11px] tracking-[3px] uppercase font-bold text-navy transition-colors"
            >
              {b.label} <ArrowUpRight size={14} aria-hidden />
            </SmartLink>
          </p>
        ) : null;
      })}
    </div>
  );
}
