// A small QR code maker for short links (up to 106 letters), so a code can be drawn from a setting
// such as the WhatsApp number without a picture to keep up to date. Byte mode, versions 1–5, one
// error correction block each: level M while it fits, else L. Returns the rows of dark modules.

// data codewords, error correction codewords (versions 1–5)
const LEVEL_M = [[16, 10], [28, 16], [44, 26]]
const LEVEL_L = [[19, 7], [34, 10], [55, 15], [80, 20], [108, 26]]

// GF(256) tables for the error correction
const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = EXP[i + 255] = x
  LOG[x] = i
  x = x << 1 > 255 ? (x << 1) ^ 0x11d : x << 1
}
const times = (a: number, b: number) => (a && b ? EXP[LOG[a] + LOG[b]] : 0)

function correction(data: number[], count: number) {
  let poly = [1] // the generator, highest power first
  for (let i = 0; i < count; i++) {
    const next = [...poly, 0]
    poly.forEach((c, j) => (next[j + 1] ^= times(c, EXP[i])))
    poly = next
  }
  const rest = [...data, ...Array<number>(count).fill(0)]
  for (let i = 0; i < data.length; i++) {
    const lead = rest[i]
    if (lead) poly.forEach((c, j) => (rest[i + j] ^= times(c, lead)))
  }
  return rest.slice(data.length)
}

const MASKS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
]

// How hard a pattern is to scan (the standard's four rules): the mask with the least is used
function penalty(m: boolean[][]) {
  const n = m.length
  let score = 0
  const lines = [...m, ...m.map((_, c) => m.map((row) => row[c]))]
  for (const line of lines) {
    for (let i = 0, run = 1; i < n; i++, run++) {
      if (line[i] !== line[i + 1]) {
        if (run >= 5) score += run - 2
        run = 0
      }
    }
    const bits = line.map((b) => (b ? 1 : 0)).join('')
    for (const finder of ['10111010000', '00001011101']) for (let i = bits.indexOf(finder); i >= 0; i = bits.indexOf(finder, i + 1)) score += 40
  }
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) if (m[r][c] === m[r][c + 1] && m[r][c] === m[r + 1][c] && m[r][c] === m[r + 1][c + 1]) score += 3
  const dark = m.flat().filter(Boolean).length / (n * n)
  return score + Math.floor(Math.abs(dark * 20 - 10)) * 10
}

export function qrMatrix(text: string): boolean[][] | null {
  const bytes = [...new TextEncoder().encode(text)]
  const fits = (sizes: number[][]) => sizes.findIndex(([data]) => bytes.length + 2 <= data) // 4 + 8 bits before the text
  const levelM = fits(LEVEL_M) >= 0
  const version = fits(levelM ? LEVEL_M : LEVEL_L) + 1
  if (!version) return null
  const [dataCount, ecCount] = (levelM ? LEVEL_M : LEVEL_L)[version - 1]
  const n = 17 + 4 * version

  // The text as bits, filled up to the code's size
  let bits = '0100' + [bytes.length, ...bytes].map((b) => b.toString(2).padStart(8, '0')).join('')
  bits += '0'.repeat(Math.min(4, dataCount * 8 - bits.length))
  bits = bits.padEnd(Math.ceil(bits.length / 8) * 8, '0')
  const data = (bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2))
  for (let i = 0; data.length < dataCount; i++) data.push(i % 2 ? 0x11 : 0xec)
  const stream = [...data, ...correction(data, ecCount)].map((b) => b.toString(2).padStart(8, '0')).join('')

  // The fixed patterns: finders (corners), timing lines, the alignment square, the format's place
  const grid: (boolean | null)[][] = Array.from({ length: n }, () => Array<boolean | null>(n).fill(null))
  const square = (r0: number, c0: number, from: number, to: number, dark: (d: number) => boolean) => {
    for (let r = from; r <= to; r++) for (let c = from; c <= to; c++) if (grid[r0 + r]?.[c0 + c] !== undefined) grid[r0 + r][c0 + c] = dark(Math.max(Math.abs(r), Math.abs(c)))
  }
  for (const [r, c] of [[3, 3], [3, n - 4], [n - 4, 3]]) square(r, c, -4, 4, (d) => d !== 2 && d !== 4)
  if (version > 1) square(n - 7, n - 7, -2, 2, (d) => d !== 1)
  for (let i = 8; i < n - 8; i++) grid[6][i] = grid[i][6] = i % 2 === 0
  const formatSpots: [number, number][][] = [[], []]
  for (let i = 0; i < 15; i++) {
    formatSpots[0].push(i < 6 ? [i, 8] : i < 8 ? [i + 1, 8] : i === 8 ? [8, 7] : [8, 14 - i])
    formatSpots[1].push(i < 8 ? [8, n - 1 - i] : [n - 15 + i, 8])
  }
  formatSpots.flat().forEach(([r, c]) => (grid[r][c] = false))
  grid[n - 8][8] = true

  // The bits, in two-module columns from the right, up and down in turn
  const free = grid.map((row) => row.map((v) => v === null))
  let at = 0
  let up = true
  for (let right = n - 1; right > 0; right -= 2) {
    if (right === 6) right = 5 // the timing column
    for (let i = 0; i < n; i++) {
      const r = up ? n - 1 - i : i
      for (const c of [right, right - 1]) if (free[r][c]) grid[r][c] = stream[at++] === '1'
    }
    up = !up
  }

  // Masked each of the eight ways, with its format bits; the easiest to scan is kept
  const tries = MASKS.map((mask, number) => {
    const m = grid.map((row, r) => row.map((v, c) => (free[r][c] && mask(r, c) ? !v : !!v)))
    const value = ((levelM ? 0 : 1) << 3) | number
    let rest = value << 10
    for (let i = 14; i >= 10; i--) if ((rest >> i) & 1) rest ^= 0x537 << (i - 10)
    const format = ((value << 10) | rest) ^ 0x5412
    formatSpots.forEach((spots) => spots.forEach(([r, c], i) => (m[r][c] = !!((format >> i) & 1))))
    return m
  })
  return tries.reduce((best, m) => (penalty(m) < penalty(best) ? m : best))
}

// The dark modules as one SVG path (one unit each)
export const qrPath = (matrix: boolean[][]) => matrix.flatMap((row, r) => row.map((dark, c) => (dark ? `M${c} ${r}h1v1h-1z` : ''))).join('')
