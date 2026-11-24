// Shared by the flip books (src/components/FlipBook.tsx and MenuBook.tsx).
// Page turn sounds (Heyzine's, in public/sounds), played the way Heyzine plays them:
// sm = page corner lifted, md = one page turned, lg = several pages skipped. Short and quiet, and
// a new sound stops the one still playing so fast turns never pile up. Loaded once when the book
// opens, so the first turn plays without a delay.
export type FlipSound = "sm" | "md" | "lg";
const FLIP_VOLUME: Record<FlipSound, number> = { sm: 0.1, md: 0.2, lg: 0.2 };
let flipBuffers: Promise<Partial<Record<FlipSound, AudioBuffer>>> | null = null;
let audioContext: AudioContext | null = null;
let playing: AudioBufferSourceNode | null = null;

export function loadFlipSounds() {
  flipBuffers ??= (async () => {
    // Decoded off-screen: no audio output is needed (or allowed) before the first tap
    const decoder = new OfflineAudioContext(1, 1, 44100);
    const entries = await Promise.all(
      (Object.keys(FLIP_VOLUME) as FlipSound[]).map(async (size) => {
        try {
          const data = await (await fetch(`/sounds/page-turn-${size}.mp3`)).arrayBuffer();
          return [size, await decoder.decodeAudioData(data)] as const;
        } catch {
          return [size, undefined] as const; // no sound (offline, unsupported): turning still works
        }
      })
    );
    return Object.fromEntries(entries);
  })();
  return flipBuffers;
}

export async function playFlipSound(size: FlipSound) {
  try {
    const buffer = (await loadFlipSounds())[size];
    if (!buffer) return;
    audioContext ??= new AudioContext();
    const ctx = audioContext;
    if (ctx.state === "suspended") await ctx.resume();

    playing?.stop();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = FLIP_VOLUME[size];
    source.connect(gain).connect(ctx.destination);
    source.start();
    playing = source;
  } catch {
    // Audio is optional (blocked or unsupported): turning the page still works
  }
}
