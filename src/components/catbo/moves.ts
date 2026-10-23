// Catbo's moves: idle life, blinking, dancing and touch reactions, played on the puppet rig.
// Starting an animation on a rig value replaces whatever that value was doing before.

import { animate } from "framer-motion";
import { REST, type Rig, type RigKey } from "./CatPuppet";

type Frames = number | number[];
type Opts = { duration?: number; ease?: "linear" | "easeIn" | "easeOut" | "easeInOut"; repeat?: number; times?: number[]; delay?: number };

export const move = (rig: Rig, targets: Partial<Record<RigKey, Frames>>, opts: Opts = {}) =>
  Promise.all(
    (Object.entries(targets) as [RigKey, Frames][]).map(([key, frames]) =>
      animate(rig[key], frames as number[], { ease: "easeInOut", ...opts }),
    ),
  );

const KEYS = Object.keys(REST) as RigKey[];

// Back to the neutral pose
export const rest = (rig: Rig, duration = 0.35) =>
  move(rig, Object.fromEntries(KEYS.map((k) => [k, REST[k]])), { duration, ease: "easeOut" });

// Gentle breathing, tail and scarf movement while nothing else is happening
export function idle(rig: Rig) {
  move(rig, { tailRot: [0, 6, 0, -4, 0] }, { duration: 4, repeat: Infinity });
  move(rig, { scarfRot: [0, 2.5, -1, 0] }, { duration: 3.2, repeat: Infinity });
  move(rig, { squash: [1, 1.012, 1] }, { duration: 3, repeat: Infinity });
  move(rig, { headRot: [0, 1.5, 0, -1.2, 0] }, { duration: 7, repeat: Infinity });
}

export const blink = (rig: Rig) => move(rig, { lidL: [0, 1, 0], lidR: [0, 1, 0] }, { duration: 0.2 });

// Head tilted, eyes wide: "I'm listening"
export const listen = (rig: Rig) =>
  move(rig, { headRot: -6, lidL: 0, lidR: 0, jawOpen: 0 }, { duration: 0.4, ease: "easeOut" });

// ---------- Dance ----------

export function dance(rig: Rig, beat: number) {
  const loop = (targets: Partial<Record<RigKey, Frames>>, beats: number) =>
    move(rig, targets, { duration: beat * beats, repeat: Infinity });
  loop({ torsoY: [0, 9, 0] }, 1); // bounce on every beat
  loop({ squash: [1, 0.965, 1] }, 1);
  loop({ torsoRot: [-4, 4, -4] }, 2); // sway the hips
  loop({ headRot: [5, -5, 5] }, 2); // head bops against the hips
  loop({ armRot: [-8, -48, -8, -30, -8] }, 2); // arm pumps out to the side
  loop({ legLRot: [0, 9, 0, 0, 0], legLY: [0, -12, 0, 0, 0] }, 2); // left step
  loop({ legRRot: [0, 0, 0, -9, 0], legRY: [0, 0, 0, -12, 0] }, 2); // right step
  loop({ tailRot: [-14, 14, -14] }, 1);
  loop({ scarfRot: [-6, 7, -6] }, 1);
  loop({ jawOpen: [0, 0.55, 0.1, 0.35, 0] }, 2); // singing along
  loop({ x: [0, 0, 0, 0, -10, 0, 10, 0] }, 8); // little side shuffle every two bars
  move(rig, { lidL: 0.45, lidR: 0.45 }, { duration: 0.3 }); // happy eyes
}

// ---------- Touch reactions ----------

export type Zone = "nose" | "paw" | "head" | "scarf" | "tail" | "feet" | "belly" | "body";

const ARM: number[][] = [
  [114, 370], [118, 330], [140, 300], [180, 292], [205, 296], [218, 272], [224, 248], [250, 234], [288, 238],
  [302, 256], [298, 282], [284, 300], [262, 316], [252, 340], [252, 380], [246, 410], [232, 432], [200, 438],
  [160, 432], [128, 415],
];

const inside = (pts: number[][], x: number, y: number) => {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};

// Which part of Catbo was touched, from a point in source-picture pixels
export function zoneAt(x: number, y: number): Zone {
  if (x > 238 && x < 290 && y > 176 && y < 210) return "nose";
  if (inside(ARM, x, y)) return "paw";
  if (y < 282 && x > 50 && x < 395) return "head";
  if (x > 345 && y > 240 && y < 445) return "scarf";
  if (x < 125 && y > 410 && y < 690) return "tail";
  if (y > 692) return "feet";
  if (x > 165 && x < 355 && y > 440) return "belly";
  return "body";
}

export const reactions: Record<Zone, (rig: Rig) => Promise<unknown>> = {
  // Head pat: eyes close happily, head leans into the hand
  head: (rig) =>
    Promise.all([
      move(rig, { lidL: [0, 1, 1, 1, 0], lidR: [0, 1, 1, 1, 0] }, { duration: 1.6, times: [0, 0.15, 0.5, 0.85, 1] }),
      move(rig, { headRot: [0, -7, 5, -5, 0] }, { duration: 1.6 }),
      move(rig, { tailRot: [0, 12, -8, 10, 0] }, { duration: 1.6 }),
    ]),

  // Boop the nose: scrunch, then sneeze
  nose: (rig) =>
    Promise.all([
      move(rig, { lidL: [0, 0.8, 0.8, 1, 0], lidR: [0, 0.8, 0.8, 1, 0] }, { duration: 0.9, times: [0, 0.2, 0.45, 0.55, 1] }),
      move(rig, { headRot: [0, 5, 6, -9, 0], torsoY: [0, -4, -6, 8, 0] }, { duration: 0.9, times: [0, 0.2, 0.45, 0.55, 1] }),
      move(rig, { jawOpen: [0, 0.3, 0.7, 0.2, 0] }, { duration: 0.9, times: [0, 0.2, 0.45, 0.55, 1] }),
    ]),

  // High five: the arm swings out, wiggles, comes back
  paw: (rig) =>
    Promise.all([
      move(rig, { armRot: [0, -58, -48, -58, -50, 0] }, { duration: 1.4, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }),
      move(rig, { jawOpen: [0, 0.6, 0.4, 0] }, { duration: 1.2 }),
      move(rig, { headRot: [0, -5, -5, 0] }, { duration: 1.4 }),
    ]),

  // Belly poke: squish and giggle
  belly: (rig) =>
    Promise.all([
      move(rig, { squash: [1, 0.9, 1.06, 0.98, 1] }, { duration: 0.7 }),
      move(rig, { torsoY: [0, 8, -4, 0], torsoRot: [0, -3, 3, 0] }, { duration: 0.7 }),
      move(rig, { jawOpen: [0, 0.7, 0.4, 0.7, 0], jawWidth: [1, 1.15, 1.15, 1.15, 1] }, { duration: 0.9 }),
      move(rig, { lidL: [0, 0.6, 0.6, 0], lidR: [0, 0.6, 0.6, 0] }, { duration: 0.9 }),
    ]),

  // Tail pull: jump, angry squint, hiss
  tail: (rig) =>
    Promise.all([
      move(rig, { tailRot: [0, 35, -22, 12, 0] }, { duration: 0.8 }),
      move(rig, { y: [0, -32, 0, -8, 0], squash: [1, 1.06, 0.94, 1.02, 1] }, { duration: 0.7 }),
      move(rig, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.6, delay: 0.3 }),
      move(rig, { lidL: [0, 0.5, 0.5, 0], lidR: [0, 0.5, 0.5, 0] }, { duration: 1.4 }),
      move(rig, { jawOpen: [0, 0.9, 0.9, 0], jawWidth: [1, 1.2, 1.2, 1] }, { duration: 0.9 }),
      move(rig, { headRot: [0, 8, 8, 0] }, { duration: 1.2 }),
    ]),

  // Tickle the toes: kick, kick, giggle
  feet: (rig) =>
    Promise.all([
      move(rig, { legLRot: [0, 14, 0, 10, 0], legLY: [0, -16, 0, -12, 0] }, { duration: 0.8 }),
      move(rig, { legRRot: [0, 0, -14, 0, -10, 0], legRY: [0, 0, -16, 0, -12, 0] }, { duration: 0.9 }),
      move(rig, { jawOpen: [0, 0.6, 0.3, 0.6, 0] }, { duration: 0.9 }),
      move(rig, { lidL: [0, 0.6, 0.6, 0], lidR: [0, 0.6, 0.6, 0] }, { duration: 0.9 }),
    ]),

  // Scarf: it flaps, Catbo salutes "Ahoy!"
  scarf: (rig) =>
    Promise.all([
      move(rig, { scarfRot: [0, 18, -12, 8, 0] }, { duration: 0.9 }),
      move(rig, { armRot: [0, -40, -40, 0] }, { duration: 1 }),
      move(rig, { jawOpen: [0, 0.6, 0] }, { duration: 0.5 }),
      move(rig, { headRot: [0, 4, 0] }, { duration: 0.8 }),
    ]),

  // Anywhere else: a little hop and a meow
  body: (rig) =>
    Promise.all([
      move(rig, { y: [0, -20, 0], squash: [1, 0.95, 1.04, 1] }, { duration: 0.55 }),
      move(rig, { jawOpen: [0, 0.8, 0.6, 0], jawWidth: [1, 0.85, 0.85, 1] }, { duration: 0.55 }),
      move(rig, { headRot: [0, -4, 3, 0] }, { duration: 0.6 }),
    ]),
};

// Eating: mouth opens for the food, then chomp chomp chomp
export const openForFood = (rig: Rig) => move(rig, { jawOpen: 0.9, jawWidth: 0.9, headRot: -3 }, { duration: 0.45, ease: "easeOut" });

export const chew = (rig: Rig) =>
  Promise.all([
    move(rig, { jawOpen: [0.9, 0, 0.6, 0, 0.5, 0], jawWidth: [0.9, 1, 1, 1, 1, 1] }, { duration: 0.75 }),
    move(rig, { headRot: [-3, 2, -2, 2, 0], torsoY: [0, 3, 0, 3, 0] }, { duration: 0.75 }),
    move(rig, { lidL: [0, 0.55, 0.55, 0], lidR: [0, 0.55, 0.55, 0] }, { duration: 1.1 }),
  ]);

// Full tummy: shakes the head "no"
export const refuse = (rig: Rig) => move(rig, { headRot: [0, -8, 8, -6, 6, 0] }, { duration: 0.7 });
