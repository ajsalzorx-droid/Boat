"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

// Catbo (upcoming mascot feature) - the "coming soon" card. It opens when the "Coming soon"
// sign on Catbo's fishing line in the header is tapped (CatboFishing fires "catbo:open").
// Mounted once in the root layout.

const CAT_SRC = "/images/catbo/catbo.png";
const CAT_RATIO = 900 / 543; // height / width of the cut-out image

export default function CatboComingSoon() {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("catbo:open", onOpen);
    return () => window.removeEventListener("catbo:open", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Full coming-soon card */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="catbo-title"
          >
            <motion.div
              className="relative w-full max-w-[420px] bg-white rounded-3xl shadow-2xl overflow-hidden px-8 md:px-10 pt-9 pb-9 text-center"
              initial={{ y: 40, scale: 0.92, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 30, scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              data-lenis-prevent
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-navy/5 text-navy hover:bg-navy hover:text-white transition-colors"
              >
                <X size={18} />
              </button>

              <span className="inline-flex items-center gap-2 text-[10px] tracking-[4px] uppercase text-ocean font-semibold mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e4473a] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e4473a]"></span>
                </span>
                Coming soon
              </span>

              {/* Cat jumps in from the side, lands, then floats */}
              <motion.div
                className="relative mx-auto w-[110px] md:w-[130px]"
                style={{ aspectRatio: `1 / ${CAT_RATIO}` }}
                initial={{ x: -220, y: -40, rotate: -25, opacity: 0 }}
                animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 160, damping: 12, delay: 0.1 }}
              >
                <motion.div
                  className="w-full h-full"
                  animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
                >
                  <Image src={CAT_SRC} alt="Catbo, the Boat Seafood cat" fill sizes="130px" className="object-contain select-none" draggable={false} />
                </motion.div>
                {/* Ground shadow */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[70%] h-3 rounded-[50%] bg-navy/15 blur-[3px]" />
              </motion.div>

              <motion.h2
                id="catbo-title"
                className="mt-4 font-[family-name:var(--font-outfit)] text-navy leading-none whitespace-nowrap"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <span className="text-[34px] md:text-[40px] font-semibold tracking-[1px]">CATBO</span>{" "}
                <span className="text-[16px] md:text-[19px] font-medium uppercase">
                  is coming<span className="text-[#e4473a]">!!</span>
                </span>
              </motion.h2>

              <motion.p
                className="mt-2 text-[14px] text-navy/70 leading-snug max-w-[300px] mx-auto"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
              >
                A new member of the Boat crew is getting ready to come aboard. Stay tuned!
              </motion.p>

              <motion.button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-4 inline-flex items-center justify-center bg-navy text-white px-7 py-3 rounded-lg text-[11px] font-semibold tracking-[2px] uppercase hover:bg-ocean hover:text-navy transition-colors"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
              >
                Can&apos;t wait
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
