// Catbo Racing's rules, without any drawing: where things are, what Catbo hits, what he catches.
// The same code runs in the visitor's browser (race.ts draws it) and on the server, which replays a
// race played for a discount to work out its score itself (claims.ts): the browser never says how
// many fish were caught, only when the player jumped and cast, and the server's replay decides.
//
// For a replay to come out exactly the same, everything here is deterministic:
// - the world moves in fixed steps of STEP (1/60 s), whatever the screen's frame rate;
// - chance comes from a seeded generator (the server picks the seed when the race starts);
// - only + - * / and Math.min/max/floor/abs are used, which give the same result in every browser
//   and on the server (Math.sin and the like may differ in the last digit: they are for drawing only);
// - the world's size is fixed for the whole race (the screen's size when it started).

export const STEP = 1 / 60

export const MIN_W = 760
export const MIN_H = 600
export const DEPTH = 200 // how much sea shows below the water line
// Catbo on his surfboard: the size of the whole (for what he hits), and where he rides (share of
// the width from the left). CAT_SIZE sizes him: his picture, and the box for what he hits, together
export const CAT_SIZE = 0.75
export const BOAT = { w: 220 * CAT_SIZE, h: 200 * CAT_SIZE, x: 0.2 }
// His picture (public/race/catbo-surf.webp, 720 x 581, its line and hook taken out: the game draws
// its own when he fishes): drawn PIC.scale world units a pixel, from the middle of the board's
// bottom (at PIC.x, PIC.y in the picture; the board's tail dips a little lower, into the water).
// ROD: his rod's tip, from there
export const PIC = { w: 720, h: 581, x: 360, y: 560, scale: 0.36 * CAT_SIZE }
export const ROD = { x: (703 - 360) * PIC.scale, y: (8 - 560) * PIC.scale }
export const GRAVITY = 1700
const JUMP = 720 // speed up at take-off
const START_SPEED = 300 // units a second
const SPEED_UP = 14 // units a second faster, each second, up to the level's speed
export const UNITS_PER_METRE = 40
// leap: its speed up at take-off, high enough to clear Catbo's head (its top swims swimDepth under the water line)
export const DOLPHIN = { w: 160, h: 62, swimDepth: 60, leap: 900, gravity: 1150 }
// A diving gull: it comes at Catbo and, from `level` ahead of him, skims the waves (`skim`: its top
// over the water line). Like a buoy in the air: jump over it, or it hits him. How it gets there
// differs from gull to gull (GULL_PATHS, and its own speed, height and length of approach), but
// every one is skimming the waves well before it reaches him, so the jump is always the same
export const GULL = { w: 84, h: 36, skim: 53, level: 230, head: 170, behind: 0.3 }
// Some gulls (`behind`: the share of them) come from behind instead: they overtake Catbo and fly
// just over his head (`head`: their top over the water line), then on ahead. Coming from behind
// they are seen only a moment before, so these are not to be jumped: like a dolphin, stay down and
// it passes over; jump into it and the race is over. They get a dolphin's room around them
// The ways a gull comes in: its height on the way (1 = as high as it starts, 0 = skimming), from
// k = 1 (where its approach begins) to k = 0 (`level` ahead of Catbo). Only + - * / and
// floor/abs/min/max, so the server's replay matches every browser
export const GULL_PATHS = [
  (k: number) => k * k, // dive: a steep plunge at the end
  (k: number) => k, // glide: a long, even slope
  (k: number) => 1 - (1 - k) * (1 - k) * (1 - k), // stoop: hangs high, then drops at the last moment
  (k: number) => k * (0.45 + 1.1 * Math.abs(k * 2.5 - Math.floor(k * 2.5) - 0.5)), // wave: rises and falls on the way down
  (k: number) => k * k, // skimmer: comes in low over the waves (a small height)
]
export const GULL_KINDS = ['dive', 'glide', 'stoop', 'wave', 'skimmer'] as const

export type Creature = 'octopus' | 'jelly' | 'eel'

// The levels, each starting at a distance (from, in metres). speed: the fastest Catbo goes in it.
// gap: the room between obstacles, in seconds of travel (the least, and how much more at random;
// a jump lasts 0.85 s, so the least stays above that). dolphins, birds: the share of obstacles that
// are dolphins, and diving gulls (the rest are buoys). pairs: how often a buoy has a second one close behind. creatures: the sea creatures
// in the water (never to be hooked), danger: how often one swims by along with the fish (the fish
// themselves never get fewer). Then its colours: the sky and the sea (top, bottom), the wave at the
// back, the far islands, and the sun.
export const LEVELS = [
  { name: 'Beginner', from: 0, speed: 360, gap: [1.5, 0.8], dolphins: 0.25, birds: 0.12, pairs: 0, creatures: [] as Creature[], danger: 0, sky: ['#f9eadb', '#f4dcc4'], sea: ['#a6dbda', '#5b9fb4'], back: '#78bac0', isles: '#cfe3df', sun: '#ffd678' }, // soft morning
  { name: 'Medium', from: 100, speed: 500, gap: [1.2, 0.7], dolphins: 0.4, birds: 0.15, pairs: 0.15, creatures: ['octopus'] as Creature[], danger: 0.2, sky: ['#bfe6fb', '#e3f4fc'], sea: ['#6fd3d8', '#1f86b3'], back: '#4fb3c9', isles: '#a9d6c4', sun: '#fff3a6' }, // bright blue day
  { name: 'Hard', from: 200, speed: 640, gap: [1.0, 0.65], dolphins: 0.5, birds: 0.18, pairs: 0.3, creatures: ['octopus', 'jelly'] as Creature[], danger: 0.35, sky: ['#ff9f6b', '#ffd29a'], sea: ['#c98fb0', '#5a4f9c'], back: '#a877a8', isles: '#c9705f', sun: '#ff7043' }, // sunset
  { name: 'Extra Hard', from: 300, speed: 800, gap: [0.92, 0.45], dolphins: 0.55, birds: 0.2, pairs: 0.45, creatures: ['octopus', 'jelly', 'eel'] as Creature[], danger: 0.5, sky: ['#101a44', '#3a2f6e'], sea: ['#2c4f96', '#0d1c45'], back: '#213c7c', isles: '#262b5c', sun: '#e6ebff' }, // night
]

// Hidden difficulty by fish caught, whatever the level: from HARD_AFTER_FISH the race quietly
// plays like HARD_PLAY, and from HARDEST_AFTER_FISH like HARDEST_PLAY, the hardest there is
// (fastest, obstacles as close as a jump allows: a jump lasts 0.85 s, the least gap stays above
// it; the most creatures among the fish). Nothing on screen says so: the level name and colours
// still follow the distance. The server's replay runs this same code, so the score it works out
// matches. HARD_SPEED_UP: how fast Catbo then speeds up to it.
export const HARD_AFTER_FISH = 10
export const HARDEST_AFTER_FISH = 15
const HARD_PLAY = {
  speed: 820,
  gap: [0.9, 0.4],
  dolphins: 0.55,
  birds: 0.22,
  pairs: 0.5,
  creatures: ['octopus', 'jelly', 'eel'] as Creature[],
  danger: 0.6,
}
const HARDEST_PLAY = {
  speed: 940,
  gap: [0.88, 0.25],
  dolphins: 0.55,
  birds: 0.25,
  pairs: 0.65,
  creatures: ['octopus', 'jelly', 'eel'] as Creature[],
  danger: 0.85,
}
const HARD_SPEED_UP = 45

// What hooking each sea creature, or hitting each obstacle, says on the race-over card
export const CAUSES = {
  buoy: 'You bumped into a buoy!',
  dolphin: 'You jumped into a dolphin!',
  bird: 'A gull flew into you!',
  octopus: 'You hooked an octopus!',
  jelly: 'You hooked a jellyfish!',
  eel: 'Zap! You hooked an electric eel!',
}
export type Cause = keyof typeof CAUSES

export type Thing = {
  kind: 'buoy' | 'dolphin' | 'bird'
  x: number
  y: number // top
  w: number
  h: number
  seed: number // for drawing only (how it bobs)
  // a dolphin: swimming toward the boat, leaping (vy: its speed up or down), or gone back under
  leap?: 'swim' | 'up' | 'under'
  vy?: number // a dolphin: its speed up or down; a gull: too, for the eye (its tilt)
  // a gull: which of GULL_PATHS, its own speed, how high it starts and over how long it comes down,
  // and how it leaves once past Catbo (climb: how fast it rises, 0 = straight on)
  path?: number
  fly?: number
  high?: number
  dive?: number
  climb?: number
  dir?: 1 | -1 // a gull: -1 coming from ahead, 1 from behind (fly: then its speed across the screen)
  at?: number // how far ahead of the boat it leaps
}
export type Swimmer = { kind: 'fish' | Creature; x: number; y: number; w: number; h: number; swim: number; seed: number }

// What the player did, and on which step: [step, 0 = jump | 1 = cast]
export type Input = [number, 0 | 1]
export const JUMP_INPUT = 0
export const CAST_INPUT = 1

// A small, fast generator: the same seed always gives the same numbers, everywhere
export function seededRandom(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let r = Math.imul(a ^ (a >>> 15), 1 | a)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export class Sim {
  readonly W: number
  readonly H: number
  readonly SEA: number // the water line
  private rand: () => number
  private onSplash: (x: number, y: number, n: number) => void

  t = 0 // seconds of the race (steps × STEP)
  steps = 0
  speed = START_SPEED
  travelled = 0
  lift = 0 // how high the boat is above the water
  rise = 0 // its speed up (negative: falling)
  jumps = 0
  casts = 0
  caught = 0
  level = 0 // which of LEVELS
  levelAt = -99 // when it began (t)
  firstJumpAt = 0
  things: Thing[] = []
  nextThing: number // distance to the next obstacle
  // Fish in the water, and Catbo's line: waiting, going down, or reeling in (with a fish, maybe)
  swimmers: Swimmer[] = []
  swimIn = 0
  line = { state: 'wait' as 'wait' | 'down' | 'reel', depth: 0, target: 0, hold: 0, fish: null as Swimmer | null }
  over = false
  cause: Cause | null = null

  constructor(W: number, H: number, seed: number, onSplash: (x: number, y: number, n: number) => void = () => {}) {
    this.W = W
    this.H = H
    this.SEA = H - DEPTH
    this.rand = seededRandom(seed)
    this.onSplash = onSplash
    this.nextThing = W * 0.9
    for (let i = 0; i < 4; i++) this.addSwimmer('fish', 80 + this.rand() * (W - 120))
  }

  // The race is under way: started by a first jump (until then Catbo waits, and nothing comes along)
  moving() {
    return !this.over && this.jumps > 0
  }

  metres() {
    return Math.floor(this.travelled / UNITS_PER_METRE)
  }

  boatBox() {
    const x = this.W * BOAT.x
    const bottom = this.SEA + 20 - this.lift
    return { l: x + BOAT.w * 0.08, r: x + BOAT.w * 0.92, t: bottom - BOAT.h * 0.42, b: bottom, top: bottom - BOAT.h * 0.95 }
  }

  // Where Catbo's line leaves his rod's tip, and where its hook is
  lineTop() {
    return { x: this.W * BOAT.x + BOAT.w / 2 + ROD.x, y: this.boatBox().b + ROD.y }
  }
  hookAt() {
    const top = this.lineTop()
    return { x: top.x - this.line.depth * 0.22, y: this.SEA + 12 + this.line.depth }
  }

  // A jump, if Catbo is on the water. true = it happened (and goes in the replay)
  jump() {
    if (this.over || this.lift > 4) return false
    this.rise = JUMP
    if (this.jumps === 0) this.firstJumpAt = this.t
    this.jumps++
    this.onSplash(this.W * BOAT.x + BOAT.w * 0.45, this.SEA + 14, 10)
    return true
  }

  // The line drops (all the way down, a moment there, then back up); a fish it touches is hooked
  cast() {
    if (!this.moving() || this.lift > 0 || this.line.state !== 'wait') return false
    Object.assign(this.line, { state: 'down', target: DEPTH - 25, hold: 0.35 })
    this.casts++
    return true
  }

  // How the race plays now: the level's, or the hidden hard / hardest one (by fish caught)
  private play() {
    if (this.caught >= HARDEST_AFTER_FISH) return HARDEST_PLAY
    if (this.caught >= HARD_AFTER_FISH) return HARD_PLAY
    return LEVELS[this.level]
  }

  // ---- What comes along: buoys to jump, diving gulls to jump, and dolphins that leap ----
  private spawn() {
    const x = this.W + 60
    const { gap, dolphins, birds, pairs } = this.play()
    const pick = this.rand()
    if (pick >= dolphins && pick < dolphins + birds && this.rand() < GULL.behind) {
      // A gull from behind: off the screen to the left for now, so that it reaches Catbo when a
      // buoy put here now would (fly: how fast it crosses the screen). Its way down: one of the
      // first four of GULL_PATHS, to just over his head
      const r = (a: number, b: number) => a + this.rand() * (b - a)
      const path = Math.floor(this.rand() * 4)
      const fly = r(330, 430)
      const high = r(120, 230)
      const dive = r(300, 480)
      const climb = this.rand() < 0.7 ? r(0.6, 1.4) : 0
      // It reaches him LATE seconds after a buoy put here now would: unseen until it is close, it
      // must never catch him still in the air from an early jump over the obstacle before it
      const LATE = 0.3
      const over = this.W * BOAT.x + BOAT.w / 2
      const start = over - fly * ((x - over) / this.speed + LATE) - GULL.w / 2
      this.things.push({ kind: 'bird', dir: 1, x: start, y: this.SEA - GULL.head - high, w: GULL.w, h: GULL.h, seed: this.rand(), vy: 0, path, fly, high, dive, climb })
      this.nextThing = this.speed * (gap[0] + LATE + 0.3 + this.rand() * gap[1]) // then a dolphin's room
    } else if (pick >= dolphins && pick < dolphins + birds) {
      // A gull, each its own way (seed: how its wings beat, for the eye). It flies faster than the
      // world, so it starts further off: it reaches Catbo when a buoy put here now would, and keeps
      // the same room around it as a buoy (time to land before it, and after it)
      const path = Math.floor(this.rand() * GULL_PATHS.length)
      const r = (a: number, b: number) => a + this.rand() * (b - a)
      // [its speed, how high it starts, over how long it comes down], each between two values
      const ways = [
        [r(120, 170), r(230, 340), r(420, 620)], // dive
        [r(125, 160), r(160, 260), r(700, 950)], // glide
        [r(140, 190), r(260, 340), r(380, 520)], // stoop
        [r(125, 160), r(220, 320), r(650, 900)], // wave
        [r(150, 200), r(30, 70), r(500, 800)], // skimmer
      ]
      const [fly, high, dive] = ways[path]
      const climb = this.rand() < 0.7 ? r(0.6, 1.4) : 0
      const over = this.W * BOAT.x + BOAT.w / 2
      const start = over + ((x - over) * (this.speed + fly)) / this.speed
      this.things.push({ kind: 'bird', dir: -1, x: start, y: this.SEA - GULL.skim - high, w: GULL.w, h: GULL.h, seed: this.rand(), vy: 0, path, fly, high, dive, climb })
      this.nextThing = this.speed * (gap[0] + this.rand() * gap[1])
    } else if (pick >= dolphins) {
      this.things.push({ kind: 'buoy', x, y: this.SEA - 58, w: 40, h: 70, seed: this.rand() })
      // now and then a second buoy close behind: one long, well-timed jump clears both
      if (this.rand() < pairs) this.things.push({ kind: 'buoy', x: x + 58, y: this.SEA - 58, w: 40, h: 70, seed: this.rand() })
      this.nextThing = this.speed * (gap[0] + this.rand() * gap[1]) // always just time to land and jump again
    } else {
      this.things.push({
        kind: 'dolphin',
        x,
        y: this.SEA + DOLPHIN.swimDepth,
        w: DOLPHIN.w,
        h: DOLPHIN.h,
        seed: this.rand(),
        leap: 'swim',
        vy: 0,
        at: 120 + (this.rand() - 0.5) * 60, // a little early or late, so it is not always the same
      })
      this.nextThing = this.speed * (gap[0] + 0.3 + this.rand() * gap[1]) // a dolphin needs room
    }
  }

  // A fish, or a sea creature, swimming in the water somewhere below the waves
  private addSwimmer(kind: Swimmer['kind'], x = this.W + 50) {
    const w = kind === 'fish' ? 46 + this.rand() * 26 : kind === 'eel' ? 110 + this.rand() * 30 : 52 + this.rand() * 14
    const h = kind === 'fish' ? w * 0.57 : kind === 'jelly' ? w * 1.1 : kind === 'eel' ? 40 : w * 0.85
    const y = this.SEA + 50 + this.rand() * (DEPTH - 50 - h - 15)
    this.swimmers.push({ kind, x, y, w, h, swim: (kind === 'fish' ? 30 : 10) + this.rand() * 50, seed: this.rand() })
  }

  private end(why: Cause) {
    this.over = true
    this.cause = why
  }

  // One step of the world (STEP seconds)
  step() {
    const dt = STEP
    this.t = (this.steps + 1) * STEP // from the step count, so no rounding builds up
    this.steps++

    // fish swim by, a little slower than the boat passes them
    const drift = this.moving() ? this.speed * 0.8 : 0
    for (const f of this.swimmers) f.x -= (drift + f.swim) * dt
    this.swimmers = this.swimmers.filter((f) => f.x > -f.w * 2)
    this.swimIn -= dt
    if (this.swimIn <= 0) {
      // A fish every time. The level's sea creatures come as well as the fish, never instead of
      // them, a little behind it
      this.addSwimmer('fish')
      const { creatures, danger } = this.play()
      if (creatures.length && this.rand() < danger)
        this.addSwimmer(creatures[Math.floor(this.rand() * creatures.length)], this.W + 140 + this.rand() * 120)
      // The faster Catbo goes, the sooner they pass, so they come more often: the sea holds as
      // many fish on a hard level as on the first
      // (a fish passes at 0.8 of Catbo's speed, plus its own swimming: 55 on average)
      this.swimIn = (0.6 + this.rand() * 1.1) * Math.min(1, (START_SPEED * 0.8 + 55) / (this.speed * 0.8 + 55))
    }
    if (!this.moving()) return // before the first jump, and after the race

    // Catbo's line: down, a moment there, and back up, sometimes with a fish
    const line = this.line
    if (this.lift > 0 && line.depth > 0) line.state = 'reel' // pulled in for a jump
    if (line.state === 'down') {
      if (line.depth < line.target) line.depth = Math.min(line.target, line.depth + 280 * dt)
      else if ((line.hold -= dt) <= 0) line.state = 'reel'
      const h = this.hookAt()
      const bite = this.swimmers.find((f) => Math.abs(f.x + f.w / 2 - h.x) < f.w * 0.55 && Math.abs(f.y + f.h / 2 - h.y) < f.h * 0.8)
      if (bite) {
        line.fish = bite // a creature stays on the hook, under the race-over card
        this.swimmers = this.swimmers.filter((f) => f !== bite)
        if (bite.kind !== 'fish') {
          this.onSplash(h.x, h.y, 16)
          return this.end(bite.kind)
        }
        line.state = 'reel'
      }
    } else if (line.state === 'reel') {
      line.depth = Math.max(0, line.depth - (this.lift > 0 ? 700 : line.fish ? 260 : 380) * dt)
      if (line.depth === 0) {
        if (line.fish) {
          this.onSplash(this.lineTop().x, this.SEA + 10, 10) // into the bag it goes
          this.caught++
        }
        Object.assign(line, { state: 'wait', fish: null })
      }
    }

    // the next level begins at its distance
    if (this.level < LEVELS.length - 1 && this.travelled / UNITS_PER_METRE >= LEVELS[this.level + 1].from) {
      this.level++
      this.levelAt = this.t
    }
    const hard = this.caught >= HARD_AFTER_FISH
    this.speed = Math.min(this.play().speed, this.speed + (hard ? HARD_SPEED_UP : SPEED_UP) * dt)
    this.travelled += this.speed * dt

    // the boat: up, and back down onto the water with a splash
    if (this.lift > 0 || this.rise > 0) {
      this.rise -= GRAVITY * dt
      this.lift += this.rise * dt
      if (this.lift <= 0) {
        this.lift = 0
        this.rise = 0
        this.onSplash(this.W * BOAT.x + BOAT.w * 0.5, this.SEA + 14, 14)
      }
    }

    // obstacles come along
    this.nextThing -= this.speed * dt
    if (this.nextThing <= 0) this.spawn()
    const over = this.W * BOAT.x + BOAT.w / 2
    const ahead = this.speed * (DOLPHIN.leap / DOLPHIN.gravity)
    for (const th of this.things) {
      th.x -= this.speed * dt
      if (th.kind === 'bird') {
        // a gull flies at Catbo its own way: from ahead it skims the waves near him, from behind it
        // flies just over his head; then it leaves (up, or straight on)
        const behind = th.dir === 1
        if (behind) th.x += (this.speed + th.fly!) * dt
        else th.x -= th.fly! * dt
        const dx = th.x + th.w / 2 - over
        const toGo = behind ? -dx : dx // how far it still has to fly to reach him
        const far = Math.max(0, Math.min(1, (toGo - GULL.level) / th.dive!))
        const past = Math.max(0, Math.min(1, (-toGo - 90) / 260)) // only once it is clear of him
        const was = th.y
        th.y = this.SEA - (behind ? GULL.head : GULL.skim) - Math.max(th.high! * GULL_PATHS[th.path!](far), 300 * th.climb! * past * past)
        th.vy = (th.y - was) / dt
      }
      if (th.kind !== 'dolphin') continue
      // it leaps so that the top of its arc comes right over Catbo: half its time in the air ahead of him
      if (th.leap === 'swim' && th.x + th.w / 2 - over < ahead + th.at! - 120) {
        th.leap = 'up'
        th.vy = -DOLPHIN.leap
        this.onSplash(th.x + th.w * 0.3, this.SEA + 10, 16)
      } else if (th.leap === 'up') {
        th.vy! += DOLPHIN.gravity * dt
        th.y += th.vy! * dt
        if (th.vy! > 0 && th.y >= this.SEA + DOLPHIN.swimDepth) {
          th.y = this.SEA + DOLPHIN.swimDepth
          th.leap = 'under'
          this.onSplash(th.x + th.w * 0.5, this.SEA + 10, 18)
        }
      }
    }
    // gone off the screen: to the left, or (a gull from behind) to the right
    this.things = this.things.filter((th) => (th.dir === 1 ? th.x < this.W + 100 : th.x + th.w > -40))

    // what the boat touches
    const b = this.boatBox()
    for (const th of this.things) {
      if (th.x > b.r || th.x + th.w < b.l) continue
      const hit =
        th.kind === 'dolphin'
          ? this.lift > 20 && th.leap === 'up' && th.x + th.w * 0.15 < b.r - 18 && th.x + th.w * 0.85 > b.l + 18 && th.y + th.h * 0.8 > b.top && th.y + th.h * 0.2 < b.b
          : th.kind === 'bird'
            ? // its body and the inner part of its wings, against Catbo and his board
              th.x + th.w * 0.15 < b.r - 18 && th.x + th.w * 0.85 > b.l + 18 && th.y + th.h * 0.25 < b.b && th.y + th.h * 0.8 > b.top
            : th.y + th.h * 0.25 < b.b && th.x + th.w * 0.2 < b.r - 20 && th.x + th.w * 0.8 > b.l + 20
      if (hit) {
        this.onSplash(th.x + th.w / 2, th.y, 18)
        return this.end(th.kind)
      }
    }
  }
}

// A race replayed from its seed, world size and inputs: what the server trusts. Stops when the race
// ends, or after maxSteps (a race can't have lasted longer than the time it really took)
export function replayRace(W: number, H: number, seed: number, inputs: Input[], maxSteps: number) {
  const sim = new Sim(W, H, seed)
  let next = 0
  while (!sim.over && sim.steps < maxSteps) {
    while (next < inputs.length && inputs[next][0] === sim.steps) {
      if (inputs[next][1] === JUMP_INPUT) sim.jump()
      else sim.cast()
      next++
    }
    if (next < inputs.length && inputs[next][0] < sim.steps) break // inputs out of order: not a real race
    sim.step()
  }
  return { over: sim.over, fish: sim.caught, metres: sim.metres(), steps: sim.steps, cause: sim.cause, usedAllInputs: next === inputs.length }
}
