"use client";

import { useState } from "react";
import { Check, Link2, MessageCircle, Share2 } from "lucide-react";

// Share a blog post: WhatsApp, the phone's own share sheet (or Facebook on a computer), copy the address
export default function BlogShare({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const button =
    "inline-flex h-11 w-11 items-center justify-center rounded-full border border-navy/15 bg-white/60 text-navy hover:bg-navy hover:text-cream transition-colors";

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => {});
      return;
    }
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}`, "_blank", "noopener,noreferrer");
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {} // blocked: nothing to do
  };

  return (
    <div className="flex items-center gap-2.5">
      <a href={`https://wa.me/?text=${encodeURIComponent(title)}%20${u}`} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" title="WhatsApp" className={button}>
        <MessageCircle size={18} aria-hidden />
      </a>
      <button type="button" onClick={share} aria-label="Share this post" title="Share" className={button}>
        <Share2 size={18} aria-hidden />
      </button>
      <button type="button" onClick={copy} aria-label={copied ? "Address copied" : "Copy the address"} title="Copy link" className={button}>
        {copied ? <Check size={18} aria-hidden /> : <Link2 size={18} aria-hidden />}
      </button>
    </div>
  );
}
