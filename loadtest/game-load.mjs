// Catbo Racing load test: N virtual players play the discount game at the same time, the way a
// phone does it: open the site with the game, fill the form, verify the WhatsApp code, race twice
// (really waiting out each race, as the server checks the time), and claim the best score.
//
// Run it only against a local production server using the _loadtest database (setup-db.mjs):
//   node --env-file=.env.local loadtest/game-load.mjs [--users 1000] [--ramp 30] [--base http://localhost:3100]
//
// The WhatsApp codes are written straight into the _loadtest database (no messages are sent).
// Each player gets its own cookie jar and its own X-Forwarded-For address (different phones on
// different networks); pass --one-network to play them all from one Wi-Fi address instead.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { MongoClient } from 'mongodb'
import { Sim, STEP, BOAT, JUMP_INPUT, CAST_INPUT } from '../src/components/catbo-race/sim.ts'

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : def
}
const USERS = Number(arg('users', 1000))
const RAMP_S = Number(arg('ramp', 30)) // all players have arrived after this many seconds
const BASE = arg('base', 'http://localhost:3100')
const ONE_NETWORK = process.argv.includes('--one-network')
const DB = `${process.env.MONGODB_DB || 'boat'}_loadtest`
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error('This test only runs against a local server')

// ---- server action ids, from the production build ----
const manifest = JSON.parse(readFileSync(new URL('../.next/server/server-reference-manifest.json', import.meta.url)))
const ACTIONS = {}
for (const [id, entry] of Object.entries(manifest.node)) {
  const file = Object.keys(entry.workers ?? {}).length ? entry : null
  if (file && entry.exportedName) ACTIONS[entry.exportedName] ??= id
}
for (const need of ['verifyClaimCode', 'startClaimChance', 'submitClaimScore', 'keepClaimScore'])
  if (!ACTIONS[need]) throw new Error(`action ${need} not found in the build manifest`)

// ---- metrics ----
const stats = {} // step -> { ms: [], ok, fail, errors: {} }
const note = (step, ms, ok, err) => {
  const s = (stats[step] ??= { ms: [], ok: 0, fail: 0, errors: {} })
  s.ms.push(ms)
  ok ? s.ok++ : (s.fail++, (s.errors[err] = (s.errors[err] ?? 0) + 1))
}
let active = 0
let peakActive = 0
const timeline = [] // per second: requests, active players
let reqThisSecond = 0

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const rnd = (a, b) => a + Math.random() * (b - a)

// ---- one HTTP request, timed ----
async function request(step, url, init = {}, jar) {
  const t = performance.now()
  reqThisSecond++
  try {
    const res = await fetch(url, { ...init, headers: { ...init.headers, ...(jar.cookie ? { cookie: jar.cookie } : {}) }, redirect: 'manual', signal: AbortSignal.timeout(60_000) })
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(';')
      const [k] = pair.split('=')
      jar.cookies[k] = pair
      jar.cookie = Object.values(jar.cookies).join('; ')
    }
    const body = await res.text()
    const ms = performance.now() - t
    return { res, body, ms }
  } catch (e) {
    const ms = performance.now() - t
    note(step, ms, false, e.name === 'TimeoutError' ? 'timeout (60 s)' : e.cause?.code ?? e.message)
    return null
  }
}

// A server action call, like the browser's: the result is the flight row "1:"
async function action(step, name, args, jar, ip) {
  const r = await request(step, `${BASE}/`, {
    method: 'POST',
    headers: {
      'next-action': ACTIONS[name],
      accept: 'text/x-component',
      'content-type': 'text/plain;charset=UTF-8',
      origin: BASE,
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(args),
  }, jar)
  if (!r) return null
  const row = r.body.split('\n').find((l) => l.startsWith('1:'))
  let result = null
  try {
    result = row ? JSON.parse(row.slice(2)) : null
  } catch {}
  const ok = r.res.ok && result?.ok === true
  note(step, r.ms, ok, !r.res.ok ? `HTTP ${r.res.status}` : result?.error ?? 'unreadable reply')
  return ok ? result : null
}

// ---- a bot that plays a race like a person would (jumps buoys, casts at fish, makes mistakes) ----
function playRace(W, H, seed, skill) {
  const sim = new Sim(W, H, seed)
  const inputs = []
  const press = (kind) => {
    const ok = kind === JUMP_INPUT ? sim.jump() : sim.cast()
    if (ok) inputs.push([sim.steps, kind])
  }
  const reaction = () => Math.floor(rnd(0, 6)) // steps late
  let waitJump = -1
  let castCool = 0
  press(JUMP_INPUT) // the first jump starts the race
  while (!sim.over && sim.steps < 60 * 300) {
    const b = sim.boatBox()
    const near = sim.things.find((th) => th.x + th.w > b.l && th.x - b.r < sim.speed * 0.22)
    if (waitJump < 0 && near && sim.lift === 0) {
      // a buoy: jump; a dolphin: stay down (it leaps over); now and then misjudge
      if (near.kind === 'buoy' || Math.random() > skill) waitJump = sim.steps + reaction()
    }
    if (waitJump >= 0 && sim.steps >= waitJump) {
      if (Math.random() < skill) press(JUMP_INPUT)
      waitJump = -1
    }
    if (castCool-- <= 0 && sim.lift === 0 && sim.line.state === 'wait') {
      const hook = sim.hookAt()
      const fish = sim.swimmers.find((f) => f.x > hook.x && f.x - hook.x < 160)
      if (fish && (fish.kind === 'fish' || Math.random() > skill)) {
        press(CAST_INPUT)
        castCool = 20
      }
    }
    sim.step()
  }
  return { inputs, steps: sim.steps, fish: sim.caught }
}

// ---- one player ----
async function player(i) {
  const jar = { cookies: {}, cookie: '' }
  const ip = ONE_NETWORK ? '10.0.0.1' : `10.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`
  const phoneTyped = `+97159${String(9000000 + i).padStart(7, '0')}`
  active++
  peakActive = Math.max(peakActive, active)
  try {
    // 1. the page with the game (the printed QR code: /game -> /?play=game), and its scripts and styles
    const page = await request('page /?play=game', `${BASE}/?play=game`, { headers: { 'x-forwarded-for': ip } }, jar)
    if (!page) return
    note('page /?play=game', page.ms, page.res.ok, `HTTP ${page.res.status}`)
    if (!page.res.ok) return
    const assets = [...new Set([...page.body.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]))]
    await Promise.all(assets.map(async (a) => {
      const r = await request('static js/css', BASE + a, {}, jar)
      if (r) note('static js/css', r.ms, r.res.ok, `HTTP ${r.res.status}`)
    }))

    // 2. name, number, the code from WhatsApp (a person takes a while)
    await sleep(rnd(4000, 12000))
    const verified = await action('verifyClaimCode', 'verifyClaimCode', [{ name: `Load Test ${i}`, phone: phoneTyped, offers: false }, CODES[i], { hp: '', ms: 6000 }], jar, ip)
    if (!verified) return
    let claim = verified.claim

    // 3. two races, each really played out in time
    for (let chance = 1; chance <= 2 && claim.chancesLeft > 0; chance++) {
      await sleep(rnd(1500, 4000))
      const started = await action('startClaimChance', 'startClaimChance', [claim.claimId], jar, ip)
      if (!started) return
      const W = 760 + Math.floor(Math.random() * 400)
      const H = 600 + Math.floor(Math.random() * 600)
      const race = playRace(W, H, started.seed, rnd(0.8, 0.98))
      raceSeconds.push(race.steps * STEP)
      await sleep(race.steps * STEP * 1000 + rnd(500, 1500)) // the race, and the race-over card
      const scored = await action('submitClaimScore', 'submitClaimScore', [claim.claimId, started.claim.chancesUsed, { W, H, inputs: race.inputs }], jar, ip)
      if (!scored) return
      claim = scored.claim
    }

    // 4. claim the best race
    await sleep(rnd(1000, 3000))
    const kept = await action('keepClaimScore', 'keepClaimScore', [claim.claimId], jar, ip)
    if (kept) finished++
  } finally {
    active--
  }
}

// ---- seed the WhatsApp codes into the test database ----
const CODES = []
const mongo = await new MongoClient(process.env.MONGODB_URI).connect()
const otp = mongo.db(DB).collection('game_otp')
const now = new Date()
const docs = []
for (let i = 0; i < USERS; i++) {
  const code = String(Math.floor(Math.random() * 1e6)).padStart(6, '0')
  CODES.push(code)
  const phone = `97159${String(9000000 + i).padStart(7, '0')}`
  docs.push({ _id: phone, hash: createHash('sha256').update(`${phone}:${code}`).digest('hex'), tries: 0, sent_at: now, expires_at: new Date(now.getTime() + 60 * 60_000) })
}
await otp.deleteMany({})
await otp.insertMany(docs)
await mongo.close()

// ---- run ----
const raceSeconds = []
let finished = 0
console.log(`${USERS} players against ${BASE} (database ${DB}), arriving over ${RAMP_S} s${ONE_NETWORK ? ', all on one network' : ''}`)
const t0 = Date.now()
const ticker = setInterval(() => {
  timeline.push({ s: Math.round((Date.now() - t0) / 1000), rps: reqThisSecond, active })
  if (timeline.length % 10 === 0) console.log(`  ${Math.round((Date.now() - t0) / 1000)} s: ${active} playing, ${reqThisSecond} req/s, ${finished} finished`)
  reqThisSecond = 0
}, 1000)
await Promise.all(Array.from({ length: USERS }, (_, i) => sleep((i / USERS) * RAMP_S * 1000).then(() => player(i))))
clearInterval(ticker)

// ---- report ----
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))] : 0)
const report = { users: USERS, base: BASE, oneNetwork: ONE_NETWORK, durationS: Math.round((Date.now() - t0) / 1000), finished, peakActive, steps: {}, timeline,
  races: { count: raceSeconds.length, avgS: raceSeconds.reduce((a, b) => a + b, 0) / (raceSeconds.length || 1) } }
console.log(`\nDone in ${report.durationS} s: ${finished}/${USERS} players finished the whole game, peak ${peakActive} at once`)
console.log('step'.padEnd(20), 'ok'.padStart(6), 'fail'.padStart(6), 'p50 ms'.padStart(8), 'p95 ms'.padStart(8), 'p99 ms'.padStart(8), 'max ms'.padStart(8))
for (const [step, s] of Object.entries(stats)) {
  const ms = s.ms.sort((a, b) => a - b)
  report.steps[step] = { ok: s.ok, fail: s.fail, p50: pct(ms, 50), p95: pct(ms, 95), p99: pct(ms, 99), max: ms.at(-1), errors: s.errors }
  console.log(step.padEnd(20), String(s.ok).padStart(6), String(s.fail).padStart(6), ...[50, 95, 99].map((p) => pct(ms, p).toFixed(0).padStart(8)), ms.at(-1).toFixed(0).padStart(8))
  for (const [e, n] of Object.entries(s.errors)) console.log(`    ${n} x ${e}`)
}
console.log(`races: ${raceSeconds.length}, average ${report.races.avgS.toFixed(1)} s`)
const out = arg('out', null)
if (out) (await import('node:fs')).writeFileSync(out, JSON.stringify(report, null, 2))
