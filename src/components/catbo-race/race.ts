// Catbo Racing: the game, drawn on a canvas. Loaded only when a visitor presses "Click to play" on
// the peeking cat (see CatboRace.tsx), so none of it weighs on the pages until then.
//
// Catbo surfs across the sea on his board, fishing rod in paw, ever faster. A tap, a click or Space
// makes him jump over buoys, and not into dolphins: a dolphin, unseen underwater, leaps right over
// Catbo in a high arc and dives back in nose first behind him. Staying on the water is safe (it only
// hits Catbo in the air); jumping into it, or hitting a buoy, ends the race: there is one life. Fish
// swim by under the water; the down arrow (or the fish button on a phone) drops Catbo's line, which
// hooks what it touches. A fish counts (towards a discount, when playing for one); from the second
// level on, sea creatures swim among the fish, more of them each level, and hooking one ends the
// race too. The race gets harder every 100 m (see LEVELS in sim.ts), each level with its own colours.
//
// The rules live in sim.ts, shared with the server: this file runs them, draws them, and keeps what
// is only for the eye (splashes, clouds, the colours fading). The world moves in fixed steps; each
// jump and cast is noted with its step, so a race played for a discount can be replayed by the
// server, which works out the score itself (claims.ts). The world fits the screen when a race
// starts: at least MIN_W units wide and MIN_H tall; on a tall phone the extra height is sky.

import { BOAT, CAST_INPUT, CAUSES, JUMP_INPUT, LEVELS, MIN_H, MIN_W, PIC, GULL, Sim, STEP, UNITS_PER_METRE, GRAVITY, type Input, type Swimmer, type Thing } from "./sim";

export type RaceState = {
  phase: "ready" | "racing" | "over";
  metres: number;
  fish: number; // fish Catbo has caught this race
  cause: string; // how the race ended ("" while it runs)
  hint: boolean; // show "Tap to jump" at the start of a race, until the first jump
  fishHint: boolean; // then "Tap to fish", until the line is first dropped
  best: number;
  level: string; // the level's name: "Beginner", "Medium", "Hard" or "Extra Hard"
  levelNumber: number; // 1 to 4
};
// A race's record for the server: the world's size, the seed it was given, and every jump and cast
export type RaceReplay = { W: number; H: number; seed: number; inputs: Input[]; steps: number };
export type Race = {
  start: (seed?: number) => void;
  jump: () => void;
  cast: () => void;
  setAutoStart: (on: boolean) => void;
  replay: () => RaceReplay | null;
  destroy: () => void;
};

const BEST_KEY = "catbo-race-best";
const RESTART_PAUSE = 1; // seconds after a race ends before a tap or Space starts the next
const LEVEL_FADE = 1.5; // seconds for the colours to change to the next level's
const LEVEL_SIGN = 2.5; // seconds the new level's name shows
const MAX_STEPS_PER_FRAME = 8; // a slow device runs the game slower, never skips its steps

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

type Cloud = { img: HTMLImageElement; x: number; y: number; w: number; h: number; speed: number };
type Splash = { x: number; y: number; vx: number; vy: number; age: number };
// Only for the eye, never in the rules: bubbles a fish breathes out. Bird: how a gull is drawn
type Bubble = { x: number; y: number; r: number; age: number; wob: number };
type Bird = { x: number; y: number; s: number; v: number; dir: 1 | -1; flap: number; beat: number; glide: number; flapFor: number };

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
const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

export async function startRace(canvas: HTMLCanvasElement, onState: (s: RaceState) => void): Promise<Race> {
  const entries = await Promise.all(Object.entries(ART).map(async ([k, src]) => [k, await load(src)] as const));
  const art = Object.fromEntries(entries) as Record<keyof typeof ART, HTMLImageElement>;
  const ctx = canvas.getContext("2d")!;

  // ---- The canvas, and the world's size for a new race ----
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  const worldSize = () => {
    const r = canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(r.width * ratio));
    canvas.height = Math.max(1, Math.round(r.height * ratio));
    const s = Math.min(canvas.height / MIN_H, canvas.width / MIN_W);
    return { W: canvas.width / s, H: canvas.height / s };
  };
  // The world drawn as large as fits the canvas (a race's world keeps its size if the screen turns)
  const fitView = () => {
    scale = Math.min(canvas.height / sim.H, canvas.width / sim.W);
    offsetX = (canvas.width - sim.W * scale) / 2;
    offsetY = canvas.height - sim.H * scale; // the sea stays at the bottom
    sky = sea = null;
  };

  // ---- State ----
  let splashes: Splash[] = [];
  const splash = (x: number, y: number, n: number) => {
    for (let i = 0; i < n; i++) splashes.push({ x, y, vx: (Math.random() - 0.5) * 260, vy: -120 - Math.random() * 260, age: 0 });
  };
  let bubbles: Bubble[] = [];
  const first = worldSize();
  let sim = new Sim(first.W, first.H, randomSeed(), splash); // before a race: the sea, fish swimming
  let seed = 0;
  let inputs: Input[] = [];
  let queued: (0 | 1)[] = []; // pressed since the last step
  let phase: RaceState["phase"] = "ready";
  let best = readBest();
  let autoStart = false; // whether a tap, a click or Space may start a race (free play only)
  let overAt = 0; // when the race ended (sim time)
  let endStep = 0; // the step it ended on (the world keeps moving gently after, for the eye)
  let shade = 0; // the colours shown: follows the level, fading from one to the next
  let sent = "";
  const clouds: Cloud[] = [
    { img: art.cloudA, x: 120, y: 70, w: 210, h: 64, speed: 0.08 },
    { img: art.cloudB, x: 620, y: 40, w: 180, h: 43, speed: 0.05 },
    { img: art.cloudC, x: 950, y: 140, w: 200, h: 51, speed: 0.11 },
  ];

  // What the drawing reads, taken from the rules each frame
  let W = sim.W;
  let H = sim.H;
  let SEA = sim.SEA;
  let t = 0;
  let speed = 0;
  let travelled = 0;
  let lift = 0;
  let rise = 0;
  let level = 0;
  let levelAt = -99;
  let things: Thing[] = [];
  let swimmers: Swimmer[] = [];
  let line = sim.line;
  const fromSim = () => {
    ({ W, H, SEA, t, speed, travelled, lift, rise, level, levelAt, things, swimmers, line } = sim);
  };
  const moving = () => phase === "racing" && sim.moving();
  const boatBox = () => sim.boatBox();
  const lineTop = () => sim.lineTop();
  const hookAt = () => sim.hookAt();

  const emit = () => {
    const hint = phase === "racing" && sim.jumps === 0; // stays until the first jump
    const fishHint = phase === "racing" && !hint && sim.casts === 0 && sim.t - sim.firstJumpAt < 7; // for a while after it
    const s: RaceState = {
      phase,
      metres: sim.metres(),
      fish: sim.caught,
      cause: sim.cause ? CAUSES[sim.cause] : "",
      best,
      hint,
      fishHint,
      level: LEVELS[sim.level].name,
      levelNumber: sim.level + 1,
    };
    const key = JSON.stringify(s);
    if (key !== sent) {
      sent = key;
      onState(s);
    }
  };

  // A new race in a world the size of the screen now. seed: given by the server for a race played
  // for a discount, else any
  const start = (raceSeed?: number) => {
    const { W: w, H: h } = worldSize();
    seed = raceSeed ?? randomSeed();
    sim = new Sim(w, h, seed, splash);
    inputs = [];
    queued = [];
    splashes = [];
    bubbles = [];
    shade = 0;
    phase = "racing";
    fitView();
    emit();
  };
  const jump = () => {
    // In free play, before a race a tap, a click or Space starts it; after one, the same starts the
    // next, once the race-over card has been up a moment (so a last jump that just missed does not
    // skip it). A race played for a discount is only started by its own button (setAutoStart(false)):
    // the server counts each chance first
    if (phase === "ready" || phase === "over") {
      if (autoStart && (phase === "ready" || sim.t - overAt > RESTART_PAUSE)) start();
      return;
    }
    queued.push(JUMP_INPUT);
  };
  const cast = () => {
    if (phase === "racing") queued.push(CAST_INPUT);
  };

  // One step of the world: what was pressed since the last one first (noted with this step's
  // number, for the replay), then the rules
  const step = () => {
    if (phase === "racing") {
      for (const k of queued) {
        const done = k === JUMP_INPUT ? sim.jump() : sim.cast();
        if (done) inputs.push([sim.steps, k]);
      }
      queued = [];
    }
    sim.step();
    if (phase === "racing" && sim.over) {
      phase = "over";
      overAt = sim.t;
      endStep = sim.steps;
      if (sim.metres() > best) {
        best = sim.metres();
        try {
          localStorage.setItem(BEST_KEY, String(best));
        } catch {}
      }
    }
  };

  // What is only for the eye, by the real time passed
  const animate = (dt: number) => {
    for (const c of clouds) {
      c.x -= c.speed * (moving() ? sim.speed : 60) * dt;
      if (c.x < -c.w) c.x = sim.W + Math.random() * 200;
    }
    for (const s of splashes) {
      s.age += dt;
      s.x += s.vx * dt - (moving() ? sim.speed * dt : 0);
      s.vy += GRAVITY * 0.7 * dt;
      s.y += s.vy * dt;
    }
    splashes = splashes.filter((s) => s.age < 0.8);

    // the world passing by
    const pass = moving() ? sim.speed : 0;
    // now and then a fish breathes out a bubble, which wobbles up and pops below the waves
    for (const f of sim.swimmers) {
      if (f.kind === "fish" && f.x > 0 && f.x < sim.W && Math.random() < dt * 0.45)
        bubbles.push({ x: f.x + f.w * 0.06, y: f.y + f.h * 0.55, r: 1.6 + Math.random() * 2.4, age: 0, wob: Math.random() * 6 });
    }
    for (const b of bubbles) {
      b.age += dt;
      b.y -= (26 + b.r * 7) * dt;
      b.x += Math.sin(b.age * 5 + b.wob) * 12 * dt - pass * 0.8 * dt;
    }
    bubbles = bubbles.filter((b) => b.age < 3 && b.y > sim.SEA + 24 && b.x > -10);

    if (moving()) shade = Math.max(0, Math.min(sim.level, shade + dt / LEVEL_FADE));
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

  // A gull, drawn in a few strokes: wings that beat (or are held out in a glide), a white body, a
  // small head with an orange beak. Facing the way it flies
  const gull = (b: Bird, night: number, tilt = 0) => {
    const s = b.s;
    const a = b.glide > 0 ? 0.22 : Math.sin(b.flap); // the wings' lift: -1 down to 1 up
    const tipY = -a * s * 0.8;
    const bend = -s * 0.28 - a * s * 0.25; // the wrist, a little above the line to the tip
    ctx.save();
    ctx.translate(b.x, b.y);
    if (b.dir > 0) ctx.scale(-1, 1); // drawn facing left
    ctx.rotate(tilt); // below 0: nose down
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.fillStyle = mix("#f4f7fa", "#b9c3e6", night);
    ctx.strokeStyle = mix("#44576a", "#1b2350", night);
    ctx.lineWidth = Math.max(1.2, s * 0.09);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * s * 0.1, -s * 0.04);
      ctx.quadraticCurveTo(side * s * 0.45, bend, side * s, tipY);
      ctx.quadraticCurveTo(side * s * 0.5, bend + s * 0.3, side * s * 0.1, s * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // dark wingtip
      ctx.beginPath();
      ctx.moveTo(side * s, tipY);
      ctx.lineTo(side * s * 0.8, tipY + (bend - tipY) * 0.2 + s * 0.05);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(0, s * 0.04, s * 0.34, s * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-s * 0.32, -s * 0.03, s * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0a13a";
    ctx.beginPath();
    ctx.moveTo(-s * 0.41, -s * 0.05);
    ctx.lineTo(-s * 0.56, -s * 0.01);
    ctx.lineTo(-s * 0.41, s * 0.02);
    ctx.fill();
    ctx.restore();
  };

  // A fish that swims: its picture cut into thin upright strips, each moved up or down a little on
  // a wave that runs from the head to the tail, so the head stays steady and the tail beats. Faster
  // when it is hooked. Drawn round its middle, facing left (the picture's way)
  const FISH_STRIPS = 12;
  const swimFish = (f: Swimmer, beat: number, amp: number) => {
    const img = art.fish;
    const sw = img.naturalWidth / FISH_STRIPS;
    const dw = f.w / FISH_STRIPS;
    for (let i = 0; i < FISH_STRIPS; i++) {
      const k = i / (FISH_STRIPS - 1); // 0 the nose, 1 the tail's end
      const bendK = Math.max(0, (k - 0.3) / 0.7); // only behind the head
      const dy = Math.sin(beat - k * 2.6) * amp * f.h * bendK * bendK;
      const sx = Math.min(i * sw, img.naturalWidth - sw);
      ctx.drawImage(img, sx, 0, sw, img.naturalHeight, -f.w / 2 + i * dw, -f.h / 2 + dy, dw + 0.7, f.h);
    }
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
    // the world drawn as large as fits: anything the world doesn't cover (a screen turned during a
    // race) in the sea's deepest colour
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (offsetX > 0 || offsetY > 0) {
      ctx.fillStyle = LEVELS[sim.level].sea[1];
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
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
    const night = Math.max(0, Math.min(1, at - 2)); // gulls are moonlit at night

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
    // diving gulls, in front of everything, each coming its own way (sim.ts, GULL_PATHS): pointed
    // the way it is flying, wings tucked in a steep drop and beating as it levels out, skims the
    // waves at Catbo or climbs away. Its shadow on the water darkens as it comes down, so it is
    // plain when it is low enough to hit
    for (const th of things) {
      if (th.kind !== "bird") continue;
      const cx = th.x + th.w / 2;
      const height = SEA - GULL.skim - th.y; // 0: skimming the waves
      const low = Math.max(0, Math.min(1, 1 - height / 300));
      ctx.fillStyle = `rgba(0,40,60,${0.05 + low * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(cx, SEA + 8, th.w * (0.18 + low * 0.16), 3 + low * 3, 0, 0, Math.PI * 2);
      ctx.fill();
      const vy = th.vy ?? 0; // + going down
      const tilt = Math.max(-0.8, Math.min(0.6, -Math.atan2(vy, speed + (th.fly ?? 0))));
      const dropping = vy > 140; // a steep drop: wings held back
      const flap = t * (dropping ? 5 : height < 4 ? 15 : 10) + th.seed * 6;
      const bob = height < 4 ? Math.sin(flap * 0.5) * 2 : 0;
      gull({ x: cx, y: th.y + th.h / 2 + bob, s: th.w / 2, v: 0, dir: -1, flap, beat: 0, glide: dropping ? 1 : 0, flapFor: 1 }, night, tilt);
    }

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
        // its nose follows its rise and fall, and its tail beats, each fish at its own pace
        ctx.rotate(-Math.cos(t * 3 + f.seed * 8) * 0.09);
        swimFish(f, t * (7 + f.seed * 5) + f.seed * 10, 0.09);
      } else creature(f);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // bubbles rising from the fish
    ctx.lineWidth = 1.1;
    for (const b of bubbles) {
      ctx.globalAlpha = Math.min(1, b.age * 4) * (1 - b.age / 3) * 0.75;
      ctx.strokeStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.3, 0, Math.PI * 2);
      ctx.fill();
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
          swimFish(f, t * 24, 0.18);
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
    // a new level shows no sign: only its colours change (its sea creatures simply start to swim by)
  };


  // ---- Loop, paused while out of sight ----
  let frame = 0;
  let last = 0;
  let pending = 0; // real time not yet turned into steps
  const loop = (now: number) => {
    // The first frame's time can be a little before the moment run() noted, so it is never below 0
    const dt = Math.max(0, Math.min(0.25, (now - last) / 1000));
    last = now;
    pending += dt;
    let n = 0;
    while (pending >= STEP && n < MAX_STEPS_PER_FRAME) {
      step();
      pending -= STEP;
      n++;
    }
    if (n === MAX_STEPS_PER_FRAME) pending = 0; // a long stall: carry on from here, slower, not in a rush
    animate(dt);
    emit();
    fromSim();
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
    // Before a race the sea simply fits the new size; during or after one, its world is kept and
    // only drawn larger or smaller
    if (phase === "ready") {
      const { W: w, H: h } = worldSize();
      sim = new Sim(w, h, randomSeed(), splash);
    } else worldSize();
    fitView();
    fromSim();
    draw();
  });
  resize.observe(canvas);

  fitView();
  fromSim();
  emit();
  draw();
  run();

  return {
    start,
    jump,
    cast,
    setAutoStart: (on: boolean) => {
      autoStart = on;
    },
    replay: () => (phase === "ready" ? null : { W: sim.W, H: sim.H, seed, inputs: inputs.slice(), steps: phase === "over" ? endStep : sim.steps }),
    destroy: () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
