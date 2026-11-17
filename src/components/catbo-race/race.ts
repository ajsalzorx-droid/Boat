// Catbo Racing: the game, drawn on a canvas. Loaded only when a visitor presses "Click to play" on
// the peeking cat (see CatboRace.tsx), so none of it weighs on the pages until then.
//
// Catbo surfs across the sea on his board, fishing rod in paw, ever faster. A tap, a click or Space makes it jump over buoys,
// and not into dolphins: a dolphin, unseen underwater, leaps
// right over Catbo in a high arc and dives back in nose first behind him. Staying on the water is
// safe (it only hits Catbo in the air); jumping into it, or hitting a buoy, ends the race: there is
// one life. Fish swim by under the water; the down arrow (or the fish button on a phone) drops
// Catbo's line, which hooks what it touches. A fish is fine (and counts towards a discount when playing for one: see claims.ts); from
// the second level on, sea creatures swim mixed in with the fish (octopuses, then jellyfish too,
// then sea snakes too), more of them each level, and hooking one of them ends the race too. The distance is the score, kept on the
// device with the best one. The race starts easy and gets harder with the distance, in four levels
// (see LEVELS), every 100 m, their names never shown. Each is faster, with less room between
// obstacles, more creatures in the water, and its own colours: the sky and sea change as a level
// begins. The world fits the screen: at least MIN_W units wide
// and MIN_H tall; on a tall phone the extra height is sky, the sea staying at the bottom.

export type RaceState = {
  phase: "ready" | "racing" | "over";
  metres: number;
  fish: number; // fish Catbo has caught this race (not part of the score)
  cause: string; // how the race ended ("" while it runs)
  hint: boolean; // show "Tap to jump" at the start of a race, until the first jump
  fishHint: boolean; // then "Tap to fish", until the line is first dropped
  best: number;
  level: string; // the level's name: "Beginner", "Medium", "Hard" or "Extra Hard"
  levelNumber: number; // 1 to 4
};
export type Race = { start: () => void; jump: () => void; cast: () => void; setAutoStart: (on: boolean) => void; destroy: () => void };

const MIN_W = 760;
const MIN_H = 600;
const DEPTH = 200; // how much sea shows below the water line
// Catbo on his surfboard: the size of the whole (for what he hits), and where he rides (share of
// the width from the left). CAT_SIZE sizes him: his picture, and the box for what he hits, together
const CAT_SIZE = 0.75;
const BOAT = { w: 220 * CAT_SIZE, h: 200 * CAT_SIZE, x: 0.2 };
// His picture (public/race/catbo-surf.webp, 720 x 581, its line and hook taken out: the game draws
// its own when he fishes): drawn PIC.scale world units a pixel, from the middle of the board's
// bottom (at PIC.x, PIC.y in the picture; the board's tail dips a little lower, into the water).
// ROD: his rod's tip, from there
const PIC = { w: 720, h: 581, x: 360, y: 560, scale: 0.36 * CAT_SIZE };
const ROD = { x: (703 - 360) * PIC.scale, y: (8 - 560) * PIC.scale };
const GRAVITY = 1700;
const JUMP = 720; // speed up at take-off
const START_SPEED = 300; // units a second
const SPEED_UP = 14; // units a second faster, each second, up to the level's speed
const UNITS_PER_METRE = 40;
const BEST_KEY = "catbo-race-best";
// leap: its speed up at take-off, high enough to clear Catbo's head (its top swims swimDepth under the water line)
const DOLPHIN = { w: 160, h: 62, swimDepth: 60, leap: 900, gravity: 1150 };

// The levels, each starting at a distance (from, in metres). speed: the fastest Catbo goes in it.
// gap: the room between obstacles, in seconds of travel (the least, and how much more at random;
// a jump lasts 0.85 s, so the least stays above that). dolphins: the share of obstacles that are
// dolphins. pairs: how often a buoy has a second one close behind. creatures: the sea creatures
// in the water (never to be hooked), danger: the share of what swims by that is one of them, and
// warn: what the new level's sign adds. Then its colours: the sky and the sea (top, bottom), the
// wave at the back, the far islands, and the sun.
const LEVELS = [
  { name: "Beginner", from: 0, speed: 360, gap: [1.5, 0.8], dolphins: 0.25, pairs: 0, creatures: [] as Creature[], danger: 0, warn: "", sky: ["#f9eadb", "#f4dcc4"], sea: ["#a6dbda", "#5b9fb4"], back: "#78bac0", isles: "#cfe3df", sun: "#ffd678" }, // soft morning
  { name: "Medium", from: 100, speed: 500, gap: [1.2, 0.7], dolphins: 0.4, pairs: 0.15, creatures: ["octopus"] as Creature[], danger: 0.2, warn: "Don't hook an octopus! 🐙", sky: ["#bfe6fb", "#e3f4fc"], sea: ["#6fd3d8", "#1f86b3"], back: "#4fb3c9", isles: "#a9d6c4", sun: "#fff3a6" }, // bright blue day
  { name: "Hard", from: 200, speed: 640, gap: [1.0, 0.65], dolphins: 0.5, pairs: 0.3, creatures: ["octopus", "jelly"] as Creature[], danger: 0.35, warn: "Jellyfish too! 🪼", sky: ["#ff9f6b", "#ffd29a"], sea: ["#c98fb0", "#5a4f9c"], back: "#a877a8", isles: "#c9705f", sun: "#ff7043" }, // sunset
  { name: "Extra Hard", from: 300, speed: 800, gap: [0.92, 0.45], dolphins: 0.55, pairs: 0.45, creatures: ["octopus", "jelly", "snake"] as Creature[], danger: 0.5, warn: "And sea snakes! 🐍", sky: ["#101a44", "#3a2f6e"], sea: ["#2c4f96", "#0d1c45"], back: "#213c7c", isles: "#262b5c", sun: "#e6ebff" }, // night
];
// What hooking each sea creature, or hitting each obstacle, says on the race-over card
const CAUSES = {
  buoy: "You bumped into a buoy!",
  dolphin: "You jumped into a dolphin!",
  octopus: "You hooked an octopus!",
  jelly: "You hooked a jellyfish!",
  snake: "You hooked a sea snake!",
};
const RESTART_PAUSE = 1; // seconds after a race ends before a tap or Space starts the next
const LEVEL_FADE = 1.5; // seconds for the colours to change to the next level's
const LEVEL_SIGN = 2.5; // seconds the new level's name shows

// A colour between two (k: 0 the first, 1 the second), as rgba()
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a: string, b: string, k: number, alpha = 1) => {
  const [x, y] = [rgb(a), rgb(b)];
  return `rgba(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(",")},${alpha})`;
};

const ART = {
  cat: "/race/catbo-surf.webp",
  fish: "/race/fish.webp",
  cloudA: "/race/cloud-a.webp",
  cloudB: "/race/cloud-b.webp",
  cloudC: "/race/cloud-c.webp",
};

type Thing = {
  kind: "buoy" | "dolphin";
  x: number;
  y: number; // top
  w: number;
  h: number;
  seed: number;
  // a dolphin: swimming toward the boat, leaping (vy: its speed up or down), or gone back under
  leap?: "swim" | "up" | "under";
  vy?: number;
  at?: number; // how far ahead of the boat it leaps
};
type Creature = "octopus" | "jelly" | "snake";
type Swimmer = { kind: "fish" | Creature; x: number; y: number; w: number; h: number; swim: number; seed: number };
type Cloud = { img: HTMLImageElement; x: number; y: number; w: number; h: number; speed: number };
type Splash = { x: number; y: number; vx: number; vy: number; age: number };

function load(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => img.decode().then(() => resolve(img), () => resolve(img));
    img.onerror = reject;
    img.src = src;
  });
}
const readBest = () => {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
};

export async function startRace(canvas: HTMLCanvasElement, onState: (s: RaceState) => void): Promise<Race> {
  const entries = await Promise.all(Object.entries(ART).map(async ([k, src]) => [k, await load(src)] as const));
  const art = Object.fromEntries(entries) as Record<keyof typeof ART, HTMLImageElement>;
  const ctx = canvas.getContext("2d")!;

  // ---- The world, fitted to the canvas ----
  let W = 1000;
  let H = MIN_H;
  let SEA = MIN_H - DEPTH; // the water line
  let scale = 1;
  const fit = () => {
    const r = canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(r.width * ratio));
    canvas.height = Math.max(1, Math.round(r.height * ratio));
    scale = Math.min(canvas.height / MIN_H, canvas.width / MIN_W);
    W = canvas.width / scale;
    H = canvas.height / scale;
    const was = SEA;
    SEA = H - DEPTH;
    for (const th of things) th.y += SEA - was; // what is already out there stays on the water
    sky = sea = null;
  };

  // ---- State ----
  let phase: RaceState["phase"] = "ready";
  let t = 0;
  let speed = START_SPEED;
  let travelled = 0;
  let cause = "";
  let best = readBest();
  let lift = 0; // how high the boat is above the water
  let rise = 0; // its speed up (negative: falling)
  let jumps = 0;
  let casts = 0;
  let caught = 0;
  let overAt = 0; // when the race ended
  let autoStart = false; // whether a tap, a click or Space may start a race (free play only)
  let firstJumpAt = 0; // when the race's first jump was
  let level = 0; // which of LEVELS
  let levelAt = -99; // when it began (for its name on screen)
  let shade = 0; // the colours shown: follows level, fading from one to the next
  let things: Thing[] = [];
  let splashes: Splash[] = [];
  let nextThing = 0; // distance to the next obstacle
  // Fish in the water, and Catbo's line: waiting, going down, or reeling in (with a fish, maybe)
  let swimmers: Swimmer[] = [];
  let swimIn = 0;
  const line = { state: "wait" as "wait" | "down" | "reel", depth: 0, target: 0, wait: 2, hold: 0, fish: null as Swimmer | null };
  let sent = "";
  // The race is under way: started, and the guide ("Press Space to jump") answered by a first jump.
  // Until then Catbo waits on the water and nothing comes along
  const moving = () => phase === "racing" && jumps > 0;
  const clouds: Cloud[] = [
    { img: art.cloudA, x: 120, y: 70, w: 210, h: 64, speed: 0.08 },
    { img: art.cloudB, x: 620, y: 40, w: 180, h: 43, speed: 0.05 },
    { img: art.cloudC, x: 950, y: 140, w: 200, h: 51, speed: 0.11 },
  ];

  const emit = () => {
    const hint = phase === "racing" && jumps === 0; // stays until the first jump
    const fishHint = phase === "racing" && !hint && casts === 0 && t - firstJumpAt < 7; // for a while after it
    const s: RaceState = { phase, metres: Math.floor(travelled / UNITS_PER_METRE), fish: caught, cause, best, hint, fishHint, level: LEVELS[level].name, levelNumber: level + 1 };
    const key = JSON.stringify(s);
    if (key !== sent) {
      sent = key;
      onState(s);
    }
  };

  const reset = () => {
    phase = "ready";
    speed = START_SPEED;
    travelled = 0;
    cause = "";
    jumps = 0;
    casts = 0;
    caught = 0;
    lift = rise = 0;
    level = 0;
    levelAt = -99;
    shade = 0;
    things = [];
    splashes = [];
    nextThing = W * 0.9;
    swimmers = [];
    for (let i = 0; i < 4; i++) addSwimmer(80 + Math.random() * (W - 120)); // all fish: the first level has no creatures
    Object.assign(line, { state: "wait", depth: 0, wait: 2, fish: null });
    emit();
  };

  // ---- What comes along: buoys to jump, and dolphins that leap ----
  const spawn = () => {
    const x = W + 60;
    const { gap, dolphins, pairs } = LEVELS[level];
    if (Math.random() >= dolphins) {
      things.push({ kind: "buoy", x, y: SEA - 58, w: 40, h: 70, seed: Math.random() });
      // now and then a second buoy close behind: one long, well-timed jump clears both
      if (Math.random() < pairs) things.push({ kind: "buoy", x: x + 58, y: SEA - 58, w: 40, h: 70, seed: Math.random() });
      nextThing = speed * (gap[0] + Math.random() * gap[1]); // always just time to land and jump again
    } else {
      things.push({
        kind: "dolphin",
        x,
        y: SEA + DOLPHIN.swimDepth,
        w: DOLPHIN.w,
        h: DOLPHIN.h,
        seed: Math.random(),
        leap: "swim",
        vy: 0,
        at: 120 + (Math.random() - 0.5) * 60, // a little early or late, so it is not always the same
      });
      nextThing = speed * (gap[0] + 0.3 + Math.random() * gap[1]); // a dolphin needs room
    }
  };

  // A fish swimming in the water, somewhere below the waves; or, from the third level on and as
  // often as the level says, one of its sea creatures
  function addSwimmer(x = W + 50) {
    const { creatures, danger } = LEVELS[level];
    const kind = creatures.length && Math.random() < danger ? creatures[Math.floor(Math.random() * creatures.length)] : "fish";
    const w = kind === "fish" ? 46 + Math.random() * 26 : kind === "snake" ? 110 + Math.random() * 30 : 52 + Math.random() * 14;
    const h = kind === "fish" ? w * 0.57 : kind === "jelly" ? w * 1.1 : kind === "snake" ? 40 : w * 0.85;
    const y = SEA + 50 + Math.random() * (DEPTH - 50 - h - 15);
    swimmers.push({ kind, x, y, w, h, swim: (kind === "fish" ? 30 : 10) + Math.random() * 50, seed: Math.random() });
  }

  // Where Catbo's line leaves his rod's tip, and where its hook is
  const lineTop = () => {
    const b = boatBox();
    return { x: W * BOAT.x + BOAT.w / 2 + ROD.x, y: b.b + ROD.y };
  };
  const hookAt = () => {
    const top = lineTop();
    return { x: top.x - line.depth * 0.22, y: SEA + 12 + line.depth };
  };

  const splash = (x: number, y: number, n: number) => {
    for (let i = 0; i < n; i++) splashes.push({ x, y, vx: (Math.random() - 0.5) * 260, vy: -120 - Math.random() * 260, age: 0 });
  };

  const jump = () => {
    // In free play, before a race a tap, a click or Space starts it; after one, the same starts the
    // next, once the race-over card has been up a moment (so a last jump that just missed does not
    // skip it). A race played for a discount is only started by its own button (setAutoStart(false)):
    // the server counts each chance first
    if (phase === "ready" || phase === "over") {
      if (autoStart && (phase === "ready" || t - overAt > RESTART_PAUSE)) start();
      return;
    }
    if (lift > 4) return; // on the water only
    rise = JUMP;
    if (jumps === 0) firstJumpAt = t;
    jumps++;
    splash(W * BOAT.x + BOAT.w * 0.45, SEA + 14, 10);
  };
  // The player drops the line (the down arrow, or the fish button): all the way down, a moment
  // there, then back up; a fish it touches on the way is hooked (and counted)
  const cast = () => {
    if (!moving() || lift > 0 || line.state !== "wait") return;
    Object.assign(line, { state: "down", target: DEPTH - 25, hold: 0.35 });
    casts++;
  };
  // The race is over: the reason for the card, and the best distance kept
  const end = (why: keyof typeof CAUSES) => {
    phase = "over";
    overAt = t;
    cause = CAUSES[why];
    const m = Math.floor(travelled / UNITS_PER_METRE);
    if (m > best) {
      best = m;
      try {
        localStorage.setItem(BEST_KEY, String(best));
      } catch {}
    }
  };
  const start = () => {
    if (phase === "over") reset();
    phase = "racing";
    emit();
  };

  // ---- Update ----
  const boatBox = () => {
    const x = W * BOAT.x;
    const bottom = SEA + 20 - lift;
    return { l: x + BOAT.w * 0.08, r: x + BOAT.w * 0.92, t: bottom - BOAT.h * 0.42, b: bottom, top: bottom - BOAT.h * 0.95 };
  };
  const update = (dt: number) => {
    t += dt;
    for (const c of clouds) {
      c.x -= c.speed * (moving() ? speed : 60) * dt;
      if (c.x < -c.w) c.x = W + Math.random() * 200;
    }
    for (const s of splashes) {
      s.age += dt;
      s.x += s.vx * dt - (moving() ? speed * dt : 0);
      s.vy += GRAVITY * 0.7 * dt;
      s.y += s.vy * dt;
    }
    splashes = splashes.filter((s) => s.age < 0.8);

    // fish swim by, a little slower than the boat passes them
    const drift = moving() ? speed * 0.8 : 0;
    for (const f of swimmers) f.x -= (drift + f.swim) * dt;
    swimmers = swimmers.filter((f) => f.x > -f.w * 2);
    swimIn -= dt;
    if (swimIn <= 0) {
      addSwimmer();
      swimIn = 0.6 + Math.random() * 1.1;
    }

    // Catbo's line: now and then it goes down, and comes up again, sometimes with a fish
    if (moving()) {
      if (lift > 0 && line.depth > 0) line.state = "reel"; // pulled in for a jump
      if (line.state === "down") {
        if (line.depth < line.target) line.depth = Math.min(line.target, line.depth + 280 * dt);
        else if ((line.hold -= dt) <= 0) line.state = "reel";
        const h = hookAt();
        const bite = swimmers.find((f) => Math.abs(f.x + f.w / 2 - h.x) < f.w * 0.55 && Math.abs(f.y + f.h / 2 - h.y) < f.h * 0.8);
        if (bite) {
          line.fish = bite; // a creature stays on the hook, under the race-over card
          swimmers = swimmers.filter((f) => f !== bite);
          if (bite.kind !== "fish") {
            splash(h.x, h.y, 16);
            end(bite.kind);
            return emit();
          }
          line.state = "reel";
        }
      } else if (line.state === "reel") {
        line.depth = Math.max(0, line.depth - (lift > 0 ? 700 : line.fish ? 260 : 380) * dt);
        if (line.depth === 0) {
          if (line.fish) {
            splash(lineTop().x, SEA + 10, 10); // into the bag it goes
            caught++;
          }
          Object.assign(line, { state: "wait", fish: null, wait: 2 + Math.random() * 3 });
        }
      }
    }
    if (!moving()) return emit(); // before the race, after it, and while the guide waits for the first jump

    // the next level begins at its distance; the colours follow
    if (level < LEVELS.length - 1 && travelled / UNITS_PER_METRE >= LEVELS[level + 1].from) {
      level++;
      levelAt = t;
    }
    shade = Math.max(0, Math.min(level, shade + dt / LEVEL_FADE));
    speed = Math.min(LEVELS[level].speed, speed + SPEED_UP * dt);
    travelled += speed * dt;

    // the boat: up, and back down onto the water with a splash
    if (lift > 0 || rise > 0) {
      rise -= GRAVITY * dt;
      lift += rise * dt;
      if (lift <= 0) {
        lift = 0;
        rise = 0;
        splash(W * BOAT.x + BOAT.w * 0.5, SEA + 14, 14);
      }
    }

    // obstacles come along
    nextThing -= speed * dt;
    if (nextThing <= 0) spawn();
    for (const th of things) {
      th.x -= speed * dt;
      if (th.kind !== "dolphin") continue;
      // it leaps so that the top of its arc comes right over Catbo: half its time in the air ahead of him
      const over = W * BOAT.x + BOAT.w / 2;
      const ahead = speed * (DOLPHIN.leap / DOLPHIN.gravity);
      if (th.leap === "swim" && th.x + th.w / 2 - over < ahead + th.at! - 120) {
        th.leap = "up";
        th.vy = -DOLPHIN.leap;
        splash(th.x + th.w * 0.3, SEA + 10, 16);
      } else if (th.leap === "up") {
        th.vy! += DOLPHIN.gravity * dt;
        th.y += th.vy! * dt;
        if (th.vy! > 0 && th.y >= SEA + DOLPHIN.swimDepth) {
          th.y = SEA + DOLPHIN.swimDepth;
          th.leap = "under";
          splash(th.x + th.w * 0.5, SEA + 10, 18);
        }
      }
    }
    things = things.filter((th) => th.x + th.w > -40);

    // what the boat touches
    const b = boatBox();
    for (const th of things) {
      if (th.x > b.r || th.x + th.w < b.l) continue;
      const hit =
        th.kind === "dolphin"
          ? lift > 20 && th.leap === "up" && th.x + th.w * 0.15 < b.r - 18 && th.x + th.w * 0.85 > b.l + 18 && th.y + th.h * 0.8 > b.top && th.y + th.h * 0.2 < b.b
          : th.y + th.h * 0.25 < b.b && th.x + th.w * 0.2 < b.r - 20 && th.x + th.w * 0.8 > b.l + 20;
      if (hit) {
        splash(th.x + th.w / 2, th.y, 18);
        end(th.kind);
        break;
      }
    }
    emit();
  };

  // ---- Draw ----
  let sky: CanvasGradient | null = null;
  let sea: CanvasGradient | null = null;
  let shadeDrawn = -1; // the shade those two were made for
  const wave = (top: number, amp: number, len: number, shift: number, fill: string | CanvasGradient) => {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W + 16; x += 16) ctx.lineTo(x, top + Math.sin((x + shift) / len) * amp + Math.sin((x - shift * 0.6) / (len * 2.3)) * amp * 0.4);
    ctx.lineTo(W + 16, H);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  // A dolphin, facing left, the way it swims: drawn round its middle and turned along its path, so
  // it leaps nose up and dives back in nose first. As a shadow (one dark colour, see-through) while
  // it swims underwater
  const dolphin = (th: Thing, shadow: boolean) => {
    const { w, h } = th;
    // its path on screen: left at the race's speed, and up or down at its own; the nose points along it
    const rot = th.leap === "up" ? Math.max(-1.1, Math.min(1.1, Math.atan2(-th.vy!, speed + 120))) : Math.sin(t * 3 + th.seed * 6) * 0.06;
    ctx.save();
    ctx.translate(th.x + w / 2, th.y + h / 2);
    ctx.rotate(rot);
    const body = shadow ? "rgba(18,52,96,0.3)" : "#6c8db6";
    const back = shadow ? "rgba(18,52,96,0.3)" : "#4c6d97";
    const kick = Math.sin(t * 9 + th.seed * 5) * h * 0.08; // the tail beating
    // tail flukes
    ctx.fillStyle = back;
    ctx.beginPath();
    ctx.moveTo(w * 0.36, -h * 0.02);
    ctx.quadraticCurveTo(w * 0.47, -h * 0.06 + kick, w * 0.56, -h * 0.34 + kick);
    ctx.quadraticCurveTo(w * 0.5, -h * 0.06 + kick, w * 0.5, h * 0.02 + kick);
    ctx.quadraticCurveTo(w * 0.5, h * 0.1 + kick, w * 0.56, h * 0.38 + kick);
    ctx.quadraticCurveTo(w * 0.47, h * 0.1 + kick, w * 0.36, h * 0.08);
    ctx.closePath();
    ctx.fill();
    // dorsal fin
    ctx.beginPath();
    ctx.moveTo(-w * 0.04, -h * 0.34);
    ctx.quadraticCurveTo(w * 0.06, -h * 0.5, w * 0.16, -h * 0.78);
    ctx.quadraticCurveTo(w * 0.15, -h * 0.5, w * 0.22, -h * 0.26);
    ctx.closePath();
    ctx.fill();
    // body: the beak, the round forehead, the back down to the tail, and the belly
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, h * 0.08);
    ctx.quadraticCurveTo(-w * 0.43, -h * 0.02, -w * 0.33, -h * 0.06);
    ctx.bezierCurveTo(-w * 0.29, -h * 0.4, -w * 0.04, -h * 0.44, w * 0.15, -h * 0.3);
    ctx.bezierCurveTo(w * 0.28, -h * 0.2, w * 0.36, -h * 0.08, w * 0.4, -h * 0.02);
    ctx.lineTo(w * 0.4, h * 0.08);
    ctx.bezierCurveTo(w * 0.28, h * 0.16, w * 0.04, h * 0.38, -w * 0.2, h * 0.3);
    ctx.quadraticCurveTo(-w * 0.34, h * 0.26, -w * 0.36, h * 0.16);
    ctx.quadraticCurveTo(-w * 0.44, h * 0.16, -w * 0.5, h * 0.08);
    ctx.closePath();
    ctx.fill();
    if (!shadow) {
      // darker back
      ctx.fillStyle = back;
      ctx.beginPath();
      ctx.moveTo(-w * 0.3, -h * 0.2);
      ctx.bezierCurveTo(-w * 0.2, -h * 0.42, w * 0.05, -h * 0.42, w * 0.2, -h * 0.26);
      ctx.bezierCurveTo(w * 0.3, -h * 0.17, w * 0.36, -h * 0.08, w * 0.39, -h * 0.03);
      ctx.bezierCurveTo(w * 0.2, -h * 0.12, -w * 0.05, -h * 0.18, -w * 0.3, -h * 0.2);
      ctx.fill();
      // pale belly
      ctx.fillStyle = "#e3ecf5";
      ctx.beginPath();
      ctx.moveTo(-w * 0.47, h * 0.1);
      ctx.quadraticCurveTo(-w * 0.38, h * 0.2, -w * 0.3, h * 0.2);
      ctx.bezierCurveTo(-w * 0.1, h * 0.3, w * 0.12, h * 0.26, w * 0.3, h * 0.1);
      ctx.bezierCurveTo(w * 0.1, h * 0.14, -w * 0.15, h * 0.1, -w * 0.3, h * 0.06);
      ctx.quadraticCurveTo(-w * 0.4, h * 0.06, -w * 0.47, h * 0.1);
      ctx.fill();
      // flipper
      ctx.fillStyle = back;
      ctx.beginPath();
      ctx.moveTo(-w * 0.16, h * 0.16);
      ctx.quadraticCurveTo(-w * 0.12, h * 0.44, -w * 0.02, h * 0.42);
      ctx.quadraticCurveTo(-w * 0.06, h * 0.26, -w * 0.06, h * 0.16);
      ctx.fill();
      // eye, with a shine, and a smile along the beak
      ctx.fillStyle = "#14223a";
      ctx.beginPath();
      ctx.arc(-w * 0.27, -h * 0.05, h * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-w * 0.262, -h * 0.07, h * 0.022, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#3b5679";
      ctx.lineWidth = 1.8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-w * 0.48, h * 0.09);
      ctx.quadraticCurveTo(-w * 0.4, h * 0.14, -w * 0.32, h * 0.08);
      ctx.stroke();
    }
    ctx.restore();
  };

  // Catbo on his surfboard, with his rod: one picture, drawn from the middle of
  // the board's bottom, rocking a little as he balances
  const surfer = (bob: number) => {
    ctx.save();
    ctx.translate(0, bob);
    ctx.drawImage(art.cat, -PIC.x * PIC.scale, -PIC.y * PIC.scale, PIC.w * PIC.scale, PIC.h * PIC.scale);
    ctx.restore();
  };

  // A sea creature, drawn round its middle (the canvas already moved there): an octopus, a jellyfish
  // or a sea snake. Each moves a little: tentacles wave, a bell pulses, the snake wriggles
  const creature = (f: Swimmer) => {
    const { w, h, seed } = f;
    const eyes = (y: number, gap: number, r: number) => {
      for (const side of [-1, 1]) {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(side * gap, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#14223a";
        ctx.beginPath();
        ctx.arc(side * gap - r * 0.25, y + r * 0.1, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    if (f.kind === "octopus") {
      // wavy arms below a round head
      ctx.strokeStyle = "#c2417a";
      ctx.lineCap = "round";
      ctx.lineWidth = w * 0.1;
      for (let i = 0; i < 6; i++) {
        const x0 = (i / 5 - 0.5) * w * 0.62;
        const sway = Math.sin(t * 5 + i * 1.3 + seed * 6) * w * 0.12;
        ctx.beginPath();
        ctx.moveTo(x0, h * 0.05);
        ctx.quadraticCurveTo(x0 * 1.35 + sway, h * 0.3, x0 * 1.5 - sway * 0.6, h * 0.5);
        ctx.stroke();
      }
      ctx.fillStyle = "#e0569a";
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.12, w * 0.4, h * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.ellipse(-w * 0.14, -h * 0.3, w * 0.1, h * 0.07, -0.5, 0, Math.PI * 2);
      ctx.fill();
      eyes(-h * 0.06, w * 0.14, w * 0.085);
    } else if (f.kind === "jelly") {
      // a see-through bell that pulses, trailing long thin tentacles
      const pulse = 1 + Math.sin(t * 6 + seed * 6) * 0.07;
      ctx.strokeStyle = "rgba(196,120,220,0.8)";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      for (let i = 0; i < 5; i++) {
        const x0 = (i / 4 - 0.5) * w * 0.55;
        ctx.beginPath();
        ctx.moveTo(x0, -h * 0.05);
        for (let k = 1; k <= 4; k++) ctx.lineTo(x0 + Math.sin(t * 4 + k + i + seed * 5) * w * 0.07, -h * 0.05 + (k / 4) * h * 0.55);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(214,140,240,0.85)";
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.08, w * 0.42 * pulse, h * 0.3 / pulse, 0, Math.PI, 0);
      ctx.quadraticCurveTo(0, h * 0.04, -w * 0.42 * pulse, -h * 0.08);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.ellipse(-w * 0.13, -h * 0.24, w * 0.09, h * 0.06, -0.4, 0, Math.PI * 2);
      ctx.fill();
      eyes(-h * 0.14, w * 0.12, w * 0.07);
    } else {
      // a sea snake, banded black and yellow, swimming left: its head in front, a wave running down its
      // body to the flat, paddle-shaped tail
      const n = 22;
      const at = (i: number) => {
        const k = i / n; // 0 at the head, 1 at the tail
        return { x: -w / 2 + k * w, y: Math.sin(k * Math.PI * 2.2 - t * 7 - seed * 6) * h * 0.32 * (0.35 + k * 0.65) };
      };
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let i = 0; i < n; i++) {
        const [p0, p1] = [at(i), at(i + 1)];
        ctx.strokeStyle = Math.floor(i / 2) % 2 === 0 ? "#2b2b2b" : "#f2c94c";
        ctx.lineWidth = h * (0.42 - (i / n) * 0.12);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      const tail = at(n);
      ctx.fillStyle = "#2b2b2b";
      ctx.beginPath();
      ctx.ellipse(tail.x + h * 0.15, tail.y, h * 0.3, h * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      const head = at(0);
      ctx.fillStyle = "#2b2b2b";
      ctx.beginPath();
      ctx.ellipse(head.x - h * 0.08, head.y, h * 0.34, h * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      // a flicking forked tongue
      ctx.strokeStyle = "#d9363e";
      ctx.lineWidth = 1.6;
      const lick = (Math.sin(t * 10 + seed * 7) + 1) * h * 0.12;
      ctx.beginPath();
      ctx.moveTo(head.x - h * 0.4, head.y + h * 0.04);
      ctx.lineTo(head.x - h * 0.55 - lick, head.y + h * 0.04);
      ctx.lineTo(head.x - h * 0.65 - lick, head.y - h * 0.06);
      ctx.moveTo(head.x - h * 0.55 - lick, head.y + h * 0.04);
      ctx.lineTo(head.x - h * 0.65 - lick, head.y + h * 0.14);
      ctx.stroke();
      ctx.fillStyle = "#ffd23f";
      ctx.beginPath();
      ctx.arc(head.x - h * 0.16, head.y - h * 0.08, h * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#14223a";
      ctx.beginPath();
      ctx.arc(head.x - h * 0.17, head.y - h * 0.08, h * 0.04, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const buoy = (th: Thing) => {
    const bob = Math.sin(t * 4 + th.seed * 6) * 4;
    const cx = th.x + th.w / 2;
    const y = th.y + bob;
    ctx.save();
    ctx.translate(cx, y + th.h);
    ctx.rotate(Math.sin(t * 3 + th.seed * 5) * 0.12);
    ctx.fillStyle = "#d9363e";
    ctx.beginPath();
    ctx.moveTo(-th.w / 2, 0);
    ctx.lineTo(-th.w * 0.32, -th.h * 0.75);
    ctx.lineTo(th.w * 0.32, -th.h * 0.75);
    ctx.lineTo(th.w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(-th.w * 0.42, -th.h * 0.42, th.w * 0.84, th.h * 0.16);
    ctx.fillStyle = "#3b3b3b";
    ctx.fillRect(-2, -th.h, 4, th.h * 0.27);
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath();
    ctx.arc(0, -th.h, 6 + Math.max(0, Math.sin(t * 6 + th.seed * 9)) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const draw = () => {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    // the colours: the level's, or part way between two while one fades into the next
    const at = Math.max(0, Math.min(LEVELS.length - 1, Number.isFinite(shade) ? shade : level)); // always a real level
    const from = LEVELS[Math.floor(at)];
    const to = LEVELS[Math.min(LEVELS.length - 1, Math.floor(at) + 1)];
    const k = at - Math.floor(at);
    if (!sky || !sea || shade !== shadeDrawn) {
      shadeDrawn = shade;
      sky = ctx.createLinearGradient(0, 0, 0, SEA);
      sky.addColorStop(0, mix(from.sky[0], to.sky[0], k));
      sky.addColorStop(1, mix(from.sky[1], to.sky[1], k));
      sea = ctx.createLinearGradient(0, SEA, 0, H);
      sea.addColorStop(0, mix(from.sea[0], to.sea[0], k));
      sea.addColorStop(1, mix(from.sea[1], to.sea[1], k));
    }
    // writing on the sky: white with a dark edge, so it reads on every level's colours
    const write = (text: string, y: number) => {
      ctx.textAlign = "center";
      ctx.lineJoin = "round";
      ctx.lineWidth = 7;
      ctx.strokeStyle = "#003049";
      ctx.strokeText(text, W / 2, y);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(text, W / 2, y);
    };
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, SEA + 30);
    const sun = ctx.createRadialGradient(W * 0.82, 90, 10, W * 0.82, 90, 120);
    sun.addColorStop(0, mix(from.sun, to.sun, k, 0.9));
    sun.addColorStop(1, mix(from.sun, to.sun, k, 0));
    ctx.fillStyle = sun;
    ctx.fillRect(W * 0.82 - 130, 0, 260, 230);
    for (const c of clouds) ctx.drawImage(c.img, c.x, c.y, c.w, c.h);

    // far-off islands, drifting slowly
    const far = (travelled * 0.08) % 900;
    ctx.fillStyle = mix(from.isles, to.isles, k);
    for (let i = -1; i < Math.ceil(W / 900) + 1; i++) {
      const x0 = i * 900 - far;
      ctx.beginPath();
      ctx.moveTo(x0 + 80, SEA);
      ctx.quadraticCurveTo(x0 + 200, SEA - 70, x0 + 330, SEA);
      ctx.moveTo(x0 + 520, SEA);
      ctx.quadraticCurveTo(x0 + 610, SEA - 40, x0 + 720, SEA);
      ctx.fill();
    }

    // the back of the sea, then obstacles, then the boat, then the water with its fish
    const roll = travelled + t * 30;
    wave(SEA - 6, 6, 34, roll * 0.6, mix(from.back, to.back, k));
    for (const th of things) {
      if (th.kind === "buoy") buoy(th);
    }

    const b = boatBox();
    {
      ctx.save();
      const tilt = moving() ? (lift > 0 ? Math.max(-0.25, Math.min(0.2, -rise / 2600)) : Math.sin(t * 6) * 0.02) : Math.sin(t * 2) * 0.03;
      ctx.translate(W * BOAT.x + BOAT.w / 2, b.b);
      ctx.rotate(tilt);
      surfer(lift > 0 ? 0 : Math.sin(t * 5) * 2);
      ctx.restore();
    }
    // dolphins in the air, over Catbo (the sea in front, drawn next, hides what is still under)
    for (const th of things) if (th.kind === "dolphin" && th.leap === "up") dolphin(th, false);

    // a wake behind it
    if (moving() && lift <= 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const x0 = W * BOAT.x - 10 - i * 26 - ((t * speed * 0.3) % 26);
        ctx.moveTo(x0, SEA + 18 + i * 3);
        ctx.lineTo(x0 - 40, SEA + 20 + i * 4);
        ctx.stroke();
      }
    }

    wave(SEA + 16, 7, 28, roll, sea);


    // fish, and sea creatures, swimming in the water
    ctx.globalAlpha = 0.92;
    for (const f of swimmers) {
      const y = f.y + Math.sin(t * 3 + f.seed * 8) * 4;
      ctx.save();
      ctx.translate(f.x + f.w / 2, y + f.h / 2);
      if (f.kind === "fish") {
        ctx.rotate(Math.sin(t * 6 + f.seed * 4) * 0.06);
        ctx.drawImage(art.fish, -f.w / 2, -f.h / 2, f.w, f.h);
      } else creature(f);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // Catbo's line and hook, and a fish on it
    if (line.depth > 0) {
      const top = lineTop();
      const h = hookAt();
      ctx.strokeStyle = "rgba(120,70,30,0.85)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.quadraticCurveTo(top.x - line.depth * 0.05, (top.y + h.y) / 2, h.x, h.y - 8);
      ctx.stroke();
      if (line.fish) {
        const f = line.fish;
        ctx.save();
        if (f.kind === "fish") {
          ctx.translate(h.x, h.y + f.w * 0.42);
          ctx.rotate(Math.PI / 2 + Math.sin(t * 14) * 0.25); // head up on the hook, wriggling
          ctx.drawImage(art.fish, -f.w / 2, -f.h / 2, f.w, f.h);
        } else if (f.kind === "snake") {
          ctx.translate(h.x, h.y + f.w * 0.45); // head up on the hook, wriggling
          ctx.rotate(Math.PI / 2 + Math.sin(t * 8) * 0.12);
          creature(f);
        } else {
          ctx.translate(h.x, h.y + f.h * 0.42); // a creature hangs from the hook by its head
          ctx.rotate(Math.sin(t * 8) * 0.15);
          creature(f);
        }
        ctx.restore();
      }
      ctx.strokeStyle = "#5d636b";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(h.x, h.y - 9);
      ctx.lineTo(h.x, h.y + 2);
      ctx.arc(h.x + 5, h.y + 2, 5, Math.PI, 0, true);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x <= W + 16; x += 16) {
      const y = SEA + 16 + Math.sin((x + roll) / 28) * 7 + Math.sin((x - roll * 0.6) / 64.4) * 2.8;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // splashes
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    for (const s of splashes) {
      ctx.globalAlpha = 1 - s.age / 0.8;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4 * (1 - s.age / 0.8) + 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // every 250 metres, a flag
    const m = Math.floor(travelled / UNITS_PER_METRE);
    if (phase === "racing" && m >= 250 && m % 250 < 6 && t - levelAt >= LEVEL_SIGN) { // not over a new level's name
      ctx.font = "800 38px system-ui, sans-serif";
      write(`🏁 ${m - (m % 250)} m!`, SEA - 260);
    }
    // a new level shows no name (only its colours change), but one that brings sea creatures warns
    // of them for a moment
    if (phase === "racing" && t - levelAt < LEVEL_SIGN && LEVELS[level].warn) {
      ctx.font = "800 30px system-ui, sans-serif";
      write(LEVELS[level].warn, SEA - 260);
    }
  };

  // ---- Loop, paused while out of sight ----
  let frame = 0;
  let last = 0;
  const loop = (now: number) => {
    // The first frame's time can be a little before the moment run() noted, so its step is never
    // taken below 0 (time going back would undo the race: the colours fading to a level before the first)
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    update(dt);
    draw();
    frame = requestAnimationFrame(loop);
  };
  const run = () => {
    cancelAnimationFrame(frame);
    if (document.hidden) return;
    last = performance.now();
    frame = requestAnimationFrame(loop);
  };
  const onVisibility = () => run();
  document.addEventListener("visibilitychange", onVisibility);
  const resize = new ResizeObserver(() => {
    fit();
    draw();
  });
  resize.observe(canvas);

  fit();
  reset();
  draw();
  run();

  return {
    start,
    jump,
    cast,
    setAutoStart: (on: boolean) => {
      autoStart = on;
    },
    destroy: () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
