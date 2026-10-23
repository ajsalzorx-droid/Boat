// Cuts the Catbo picture into puppet parts for src/components/catbo/CatPuppet.tsx.
// Run from the project root:  node scripts/catbo-parts.mjs
//
// Every part is saved at the full image size (496 x 822) so the layers stack exactly;
// the component then rotates/moves each one around its joint (see JOINT in CatPuppet.tsx).
// The fur behind the raised arm is filled in (mirrored from the other side), so nothing is
// left blank when the arm moves away.

import path from "node:path";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SRC = path.join(__dirname, "../public/images/catbo/catbo.png");
const OUT = path.join(__dirname, "../public/images/catbo/parts");

// Outlines in image pixels (x, y)
const POLY = {
  tail: [[0, 415], [118, 415], [114, 470], [112, 560], [114, 640], [118, 682], [85, 682], [40, 600], [0, 520]],
  // the two legs overlap a few pixels in the middle so no seam shows between them
  legL: [[120, 655], [263, 655], [263, 822], [80, 822], [80, 690], [115, 685]],
  legR: [[251, 655], [440, 655], [440, 822], [251, 822]],
  scarf: [[350, 252], [392, 240], [420, 265], [450, 320], [496, 405], [496, 445], [430, 425], [400, 380], [375, 330], [355, 295]],
  arm: [
    [114, 370], [118, 330], [140, 300], [180, 292], [205, 296], [218, 272], [224, 248], [250, 234], [288, 238],
    [302, 256], [298, 282], [284, 300], [262, 316], [252, 340], [252, 380], [246, 410], [232, 432], [200, 438],
    [160, 432], [128, 415],
  ],
  head: [
    [55, 55], [170, 55], [285, 0], [345, 0], [350, 85], [388, 135], [392, 215], [372, 238], [340, 250], [312, 262],
    [280, 275], [245, 282], [200, 282], [160, 276], [128, 258], [105, 225], [90, 150],
  ],
  // Lower lip + chin, under the middle of the smile line (the mouth corners stay with the head)
  jaw: [[226, 229], [246, 232], [262, 224], [282, 216], [302, 211], [307, 224], [296, 241], [270, 251], [245, 251], [227, 243]],
  // Eye openings, for the blink lids
  eyeL: [[168, 180], [180, 173], [200, 171], [218, 173], [228, 180], [220, 188], [200, 191], [180, 189]],
  eyeR: [[273, 148], [282, 138], [298, 131], [314, 128], [322, 135], [318, 150], [308, 161], [292, 165], [278, 160]],
};

const BODY_HEAD_CUT = 250; // body keeps the head pixels below this line, so a head tilt never opens a gap
const BODY_LEG_CUT = 692; // body keeps the top of the legs above this line (legs tuck under it)
const BODY_TAIL_CUT = 122; // body drops the tail left of this x...
const BODY_TAIL_BASE = 625; // ...and all of it above this line (only the root stays, under the hip)
const BODY_SCARF_CUT = 385; // body drops the scarf end right of this x

(async () => {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const N = W * H;

  const polyMask = (pts) => {
    const m = new Float32Array(N);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i];
          const [xj, yj] = pts[j];
          if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) m[y * W + x] = 1;
      }
    }
    return m;
  };

  // Separable box blur, repeated = close to a gaussian
  const boxBlur = (src, r, passes = 3) => {
    let a = Float32Array.from(src);
    const b = new Float32Array(N);
    for (let p = 0; p < passes; p++) {
      for (let y = 0; y < H; y++) {
        let acc = 0;
        for (let x = -r; x <= r; x++) acc += a[y * W + Math.min(W - 1, Math.max(0, x))];
        for (let x = 0; x < W; x++) {
          b[y * W + x] = acc / (2 * r + 1);
          acc += a[y * W + Math.min(W - 1, x + r + 1)] - a[y * W + Math.max(0, x - r)];
        }
      }
      for (let x = 0; x < W; x++) {
        let acc = 0;
        for (let y = -r; y <= r; y++) acc += b[Math.min(H - 1, Math.max(0, y)) * W + x];
        for (let y = 0; y < H; y++) {
          a[y * W + x] = acc / (2 * r + 1);
          acc += b[Math.min(H - 1, y + r + 1) * W + x] - b[Math.max(0, y - r) * W + x];
        }
      }
    }
    return a;
  };

  const feather = (m) => boxBlur(m, 1, 2);

  // The original cut-out kept some white floor between the legs (the flood fill couldn't reach it).
  // Clear light, colourless pixels there; the belly fur above y = 700 is left alone.
  for (let y = 700; y < H; y++)
    for (let x = y < 785 ? 200 : 212; x < (y < 785 ? 330 : 322); x++) {
      const p = (y * W + x) * 4;
      const lo = Math.min(data[p], data[p + 1], data[p + 2]);
      const hi = Math.max(data[p], data[p + 1], data[p + 2]);
      if (hi - lo < 40 && lo > 150) data[p + 3] = Math.round(data[p + 3] * Math.max(0, Math.min(1, (200 - lo) / 50)));
    }

  const masks = Object.fromEntries(Object.entries(POLY).map(([k, v]) => [k, polyMask(v)]));

  // ---- Fill in behind the arm ----
  // The cat is close to symmetric, so most of what the arm hides is copied from the mirror image
  // of the other side (shoulder fur, scarf). The chin under the paw (and anything whose mirror is
  // also hidden) gets real fur copied from a reference patch of the right colour instead.
  const hole = boxBlur(masks.arm, 2, 1).map((v) => (v > 0.01 ? 1 : 0));
  const MIRROR_X = 524; // x + mirrored x (the cat's centre line is x = 262)
  const MIRROR_MAX = 378; // past this the mirror lands on the scarf end, so reflect back
  const REF = { white: [205, 505, 95, 110], navy: [130, 690, 100, 70] }; // x, y, w, h
  const pingPong = (v, n) => {
    const m = ((v % (2 * n)) + 2 * n) % (2 * n);
    return m < n ? m : 2 * n - 1 - m;
  };
  const refPixel = (r, x, y) => ((r[1] + pingPong(y, r[3])) * W + r[0] + pingPong(x, r[2])) * 4;
  const whiteZone = new Float32Array(N);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) whiteZone[y * W + x] = (y < 282 && (y < 255 || x < 292)) || (y >= 312 && x > 245) ? 1 : 0;
  const whiteBlend = boxBlur(whiteZone, 3);
  const base = Buffer.from(data);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (!hole[p]) continue;
      let mx = MIRROR_X - x;
      if (mx > MIRROR_MAX) mx = 2 * MIRROR_MAX - mx;
      const m = y * W + mx;
      if (y >= 282 && !hole[m] && data[m * 4 + 3] > 200) {
        for (let c = 0; c < 3; c++) base[p * 4 + c] = data[m * 4 + c];
        continue;
      }
      const w = whiteBlend[p];
      const a = refPixel(REF.white, x, y);
      const b = refPixel(REF.navy, x, y);
      // the chin casts a soft shadow onto the neck
      const shade = y < 282 ? 1 - 0.2 * Math.min(1, Math.max(0, (y - 248) / 34)) : 1;
      for (let c = 0; c < 3; c++) base[p * 4 + c] = Math.round((data[a + c] * w + data[b + c] * (1 - w)) * shade);
    }
  }
  // Soften the seams of the patch a little
  const soft = [0, 1, 2].map((c) => boxBlur(Float32Array.from({ length: N }, (_, p) => base[p * 4 + c]), 1, 1));
  for (let p = 0; p < N; p++) if (hole[p]) for (let c = 0; c < 3; c++) base[p * 4 + c] = Math.round(soft[c][p]);

  // ---- Body mask: everything that is not a separately moving part ----
  const body = new Float32Array(N);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      let v = 1;
      if (y < BODY_HEAD_CUT && masks.head[p]) v = 0;
      if (masks.tail[p] && (x < BODY_TAIL_CUT || y < BODY_TAIL_BASE)) v = 0;
      if (x > BODY_SCARF_CUT && masks.scarf[p]) v = 0;
      if (y >= BODY_LEG_CUT && (masks.legL[p] || masks.legR[p])) v = 0;
      body[p] = v;
    }
  }

  const save = async (name, src, mask) => {
    const f = feather(mask);
    const out = Buffer.alloc(N * 4);
    for (let p = 0; p < N; p++) {
      const a = Math.round(src[p * 4 + 3] * Math.min(1, f[p]));
      if (!a) continue; // fully transparent pixels stay 0,0,0,0 so the PNG compresses well
      out[p * 4] = src[p * 4];
      out[p * 4 + 1] = src[p * 4 + 1];
      out[p * 4 + 2] = src[p * 4 + 2];
      out[p * 4 + 3] = a;
    }
    await sharp(out, { raw: { width: W, height: H, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT, `${name}.png`));
  };

  await mkdir(OUT, { recursive: true });
  await save("tail", base, masks.tail);
  await save("leg-left", base, masks.legL);
  await save("leg-right", base, masks.legR);
  await save("body", base, body);
  await save("scarf", base, masks.scarf);
  await save("head", base, masks.head);
  await save("jaw", base, masks.jaw);
  await save("arm", data, boxBlur(masks.arm, 4, 1).map((v) => (v > 0.01 ? 1 : 0)));

  // Blink lids: the fur just above each eye, slid down over the eye opening, with a dark lash
  // line along the bottom edge. The component scales them down from the top of the eye.
  const lid = (eye, dy) => {
    // a little wider than the eye so its original eyeliner never peeks out
    const mask = boxBlur(eye, 2, 1).map((v) => (v > 0.01 ? 1 : 0));
    const f = boxBlur(mask, 1, 2);
    const out = Buffer.alloc(N * 4);
    const bottom = new Int32Array(W).fill(-1);
    for (let p = 0; p < N; p++) if (mask[p]) bottom[p % W] = Math.max(bottom[p % W], Math.floor(p / W));
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        if (f[p] <= 0) continue;
        const q = (y - dy) * W + x;
        const lash = bottom[x] >= 0 && y > bottom[x] - 3 ? 0.35 : 1;
        for (let c = 0; c < 3; c++) out[p * 4 + c] = Math.round(data[q * 4 + c] * lash);
        out[p * 4 + 3] = Math.round(255 * Math.min(1, f[p]));
      }
    return out;
  };
  for (const [name, mask, dy] of [["lid-left", masks.eyeL, 22], ["lid-right", masks.eyeR, 36]]) {
    await sharp(lid(mask, dy), { raw: { width: W, height: H, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT, `${name}.png`));
  }
  console.log("parts saved to", OUT);
})();
