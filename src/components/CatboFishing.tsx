"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

// Catbo sits on the boat in the header logo and fishes; a "Coming soon" sign hangs on the line
// below the header. Tapping the sign opens the Catbo coming-soon card (CatboComingSoon listens for
// the "catbo:open" event).
//
// This box overlays the logo image exactly (same height, 3:2 like /logo.png), so everything is
// placed in percentages of the logo. The SVG uses a 150 x 100 viewBox over the same box.
//
// Two poses: the full one pokes above the logo (fine at the top of the page, where the header has
// room), and a compact one that stays inside the logo box for the slim scrolled header.

const CAT_SRC = "/images/catbo/catbo.png";
const CAT_RATIO = 900 / 543; // height / width of the cat picture

const POSES = {
  full: {
    cat: { left: "51%", top: "-14%", height: "55%" },
    // Rod from Catbo's paw to the tip (viewBox units); the bent version is used when a "fish" nibbles
    rod: "M94,3 Q119,-13 143,-18",
    rodBent: "M94,3 Q121,-6 143,-16",
    reel: { cx: 97, cy: 1 },
    tip: { left: "95.3%", top: "-18%" },
  },
  compact: {
    cat: { left: "54%", top: "1%", height: "40%" },
    rod: "M93,13 Q118,4 143,3",
    rodBent: "M93,13 Q120,9 143,5",
    reel: { cx: 96, cy: 12 },
    tip: { left: "95.3%", top: "3%" },
  },
};

const MOVE = { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }; // same feel as the header's own transition

export const openCatbo = () => window.dispatchEvent(new Event("catbo:open"));

export default function CatboFishing({ compact = false }: { compact?: boolean }) {
  const still = useReducedMotion();
  const pose = compact ? POSES.compact : POSES.full;
  // One loop of 6s: calm, then two quick nibbles near the end
  const loop = { duration: 6, repeat: Infinity, ease: "easeInOut" as const, times: [0, 0.7, 0.76, 0.82, 0.88, 1] };

  return (
    <div className="absolute left-0 top-0 h-16 md:h-20 aspect-[3/2] pointer-events-none">
      {/* Catbo, standing on the fish's tail */}
      <motion.div
        className="absolute"
        style={{ aspectRatio: `1 / ${CAT_RATIO}` }}
        initial={false}
        animate={pose.cat}
        transition={MOVE}
      >
        <motion.div
          className="relative w-full h-full"
          style={{ originX: 0.5, originY: 1 }}
          animate={still ? undefined : { rotate: [0, 0, 5, 0, 4, 0], y: [0, -1, 0, 0, 0, 0] }}
          transition={loop}
        >
          <Image
            src={CAT_SRC}
            alt=""
            fill
            sizes="40px"
            className="object-contain drop-shadow-[0_0_3px_rgba(253,240,213,0.75)]"
            draggable={false}
          />
        </motion.div>
      </motion.div>

      {/* Fishing rod */}
      <svg viewBox="0 0 150 100" className="absolute inset-0 w-full h-full overflow-visible">
        <motion.path
          key={compact ? "compact" : "full"}
          d={pose.rod}
          fill="none"
          stroke="#d9a066"
          strokeWidth={1.8}
          strokeLinecap="round"
          animate={still ? undefined : { d: [pose.rod, pose.rod, pose.rodBent, pose.rod, pose.rodBent, pose.rod] }}
          transition={loop}
        />
        <motion.circle r={2.2} fill="#8a5a2b" initial={false} animate={pose.reel} transition={MOVE} />
      </svg>

      {/* Line + sign, hanging from the rod tip and swinging */}
      <motion.div className="absolute" initial={false} animate={pose.tip} transition={MOVE}>
        <motion.div
          className="flex flex-col items-center"
          style={{ originY: 0, x: "-50%" }}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.7, ease: "easeOut" }}
        >
          <motion.div
            className="flex flex-col items-center"
            style={{ originY: 0 }}
            animate={still ? undefined : { rotate: [-4, 4, -4] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.span
              className="block w-px bg-[#fdf0d5]/70 h-[84px] md:h-[96px]"
              style={{ originY: 0 }}
              animate={still ? undefined : { scaleY: [1, 1, 1.06, 1, 1.05, 1] }}
              transition={loop}
            />
            <motion.button
              type="button"
              onClick={openCatbo}
              className="pointer-events-auto -mt-px whitespace-nowrap rounded-full bg-[#fdf0d5] text-navy border border-[#f2c14e]/70 shadow-lg px-2.5 py-1 text-[9px] md:text-[10px] font-bold tracking-[2px] uppercase hover:bg-white transition-colors"
              animate={still ? undefined : { y: [0, 0, 5, 0, 4, 0] }}
              transition={loop}
            >
              🐟 Coming soon
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
