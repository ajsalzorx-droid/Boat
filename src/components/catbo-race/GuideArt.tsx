// Small pictures of what comes along in Catbo Racing, for the game guide (CatboRace.tsx).
// The race draws these on its canvas (race.ts); these are the same shapes and colours, as SVG.

type Art = { className?: string };

export function Buoy({ className }: Art) {
  return (
    <svg viewBox="0 0 40 56" className={className} aria-hidden>
      <rect x="18" y="4" width="4" height="16" fill="#3b3b3b" />
      <circle cx="20" cy="6" r="6" fill="#ffd23f" />
      <path d="M2 54 L7 20 L33 20 L38 54 Z" fill="#d9363e" />
      <rect x="4" y="32" width="32" height="8" fill="#f4f1ea" />
    </svg>
  );
}

export function Gull({ className, flip = false }: Art & { flip?: boolean }) {
  return (
    <svg viewBox="0 0 64 34" className={className} aria-hidden>
      <g transform={flip ? "translate(64 0) scale(-1 1)" : undefined} strokeLinejoin="round" strokeLinecap="round">
        <path d="M30 18 Q18 6 4 4 Q16 14 30 22 Z" fill="#f4f7fa" stroke="#44576a" strokeWidth="2" />
        <path d="M34 18 Q46 6 60 4 Q48 14 34 22 Z" fill="#f4f7fa" stroke="#44576a" strokeWidth="2" />
        <ellipse cx="32" cy="21" rx="12" ry="5" fill="#f4f7fa" stroke="#44576a" strokeWidth="2" />
        <circle cx="21" cy="18" r="4" fill="#f4f7fa" stroke="#44576a" strokeWidth="2" />
        <path d="M17 17 L11 19 L17 20 Z" fill="#f0a13a" />
        <circle cx="20" cy="17" r="1" fill="#14223a" />
      </g>
    </svg>
  );
}

export function Dolphin({ className }: Art) {
  return (
    <svg viewBox="0 0 80 40" className={className} aria-hidden>
      <path d="M58 20 Q66 16 72 6 Q70 18 76 30 Q66 24 58 24 Z" fill="#4c6d97" />
      <path d="M34 9 Q40 2 46 4 Q42 8 42 12 Z" fill="#4c6d97" />
      <path d="M4 22 Q10 10 34 10 Q56 10 62 20 Q56 30 34 30 Q16 30 10 25 L2 24 Z" fill="#6c8db6" />
      <path d="M14 26 Q30 31 50 26 Q34 30 14 26 Z" fill="#e3ecf5" />
      <circle cx="16" cy="18" r="2" fill="#14223a" />
    </svg>
  );
}

export function Octopus({ className }: Art) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <g stroke="#c2417a" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M12 26 Q6 36 10 44" />
        <path d="M19 28 Q16 38 20 46" />
        <path d="M29 28 Q32 38 28 46" />
        <path d="M36 26 Q42 36 38 44" />
      </g>
      <ellipse cx="24" cy="18" rx="16" ry="14" fill="#e0569a" />
      <ellipse cx="18" cy="11" rx="5" ry="3" fill="rgba(255,255,255,0.35)" />
      <circle cx="18" cy="20" r="3.5" fill="#fff" />
      <circle cx="30" cy="20" r="3.5" fill="#fff" />
      <circle cx="18.5" cy="20.5" r="1.8" fill="#14223a" />
      <circle cx="30.5" cy="20.5" r="1.8" fill="#14223a" />
    </svg>
  );
}

export function Jelly({ className }: Art) {
  return (
    <svg viewBox="0 0 44 52" className={className} aria-hidden>
      <g stroke="rgba(196,120,220,0.8)" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M10 24 Q6 34 12 42 Q16 48 12 52" />
        <path d="M18 26 Q22 36 17 44" />
        <path d="M26 26 Q22 36 27 44" />
        <path d="M34 24 Q38 34 32 42 Q28 48 32 52" />
      </g>
      <path d="M4 26 Q4 4 22 4 Q40 4 40 26 Q34 22 28 26 Q22 22 16 26 Q10 22 4 26 Z" fill="rgba(214,140,240,0.85)" />
      <ellipse cx="15" cy="12" rx="5" ry="3" fill="rgba(255,255,255,0.4)" />
      <circle cx="16" cy="17" r="2.6" fill="#fff" />
      <circle cx="28" cy="17" r="2.6" fill="#fff" />
      <circle cx="16.4" cy="17.4" r="1.3" fill="#14223a" />
      <circle cx="28.4" cy="17.4" r="1.3" fill="#14223a" />
    </svg>
  );
}

export function ElectricEel({ className }: Art) {
  // a long dark-teal eel, head on the left, glowing yellow lightning marks and a spark over it
  return (
    <svg viewBox="0 0 96 40" className={className} aria-hidden>
      <defs>
        <filter id="eel-glow" x="-20%" y="-40%" width="140%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ffe14d" floodOpacity="0.9" />
        </filter>
      </defs>
      <path
        d="M12 24 C26 14 40 32 56 24 S82 16 92 24"
        stroke="#1f4e5f"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
        filter="url(#eel-glow)"
      />
      <path d="M40 31 C52 34 70 28 90 29" stroke="rgba(120,200,190,0.8)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <g stroke="#ffe14d" strokeWidth="2" fill="none" strokeLinejoin="miter">
        <path d="M27 18 L31 22 L28 23 L32 27" />
        <path d="M47 22 L51 26 L48 27 L52 31" />
        <path d="M67 18 L71 22 L68 23 L72 27" />
      </g>
      <ellipse cx="11" cy="24" rx="9" ry="7" fill="#1a4352" />
      <circle cx="8" cy="22" r="2.4" fill="#ffd23f" />
      <circle cx="7.6" cy="22" r="1.1" fill="#14223a" />
      <path d="M58 12 L62 6 L60 6 L64 0" stroke="#fff27a" strokeWidth="1.8" fill="none" />
    </svg>
  );
}
