"use client";

import type { CSSProperties, KeyboardEventHandler, MouseEventHandler, Ref } from "react";
import Image from "next/image";
import { motion, useMotionValue, useTransform, type MotionValue } from "framer-motion";

// Catbo as a cut-out puppet: the picture is split into parts (scripts/catbo-parts.mjs), each
// stacked at full size and rotated around its own joint. All positions below are in the
// pixels of the 496 x 822 source picture.

export const CAT_W = 496;
export const CAT_H = 822;

const PARTS = "/images/catbo/parts";
const SIZES = "(min-width: 768px) 240px, 200px";

// Joints (rotation points) of each part
const JOINT = {
  root: [248, 810], // feet: hops and squashes
  torso: [262, 690], // hips: body sway
  head: [255, 285], // neck
  arm: [195, 430], // elbow of the raised arm
  legL: [195, 660],
  legR: [325, 660],
  tail: [125, 640],
  scarf: [360, 262],
} as const;

// Mouth: the smile line the open mouth hangs from, and how far each point drops when open
const LIP = [[228, 228], [246, 230], [262, 222], [282, 215], [300, 211]];
const LIP_DROP = [0, 0.75, 1, 0.75, 0];
const MOUTH_CX = 264;
const JAW_DROP = 13; // px the chin moves down when the mouth is fully open
const LID_TOP = { left: 171, right: 128 }; // top of each eye opening (lids close downwards from here)

// Where food should go, as a fraction of the cat's width / height
export const MOUTH = { x: MOUTH_CX / CAT_W, y: 224 / CAT_H };

// Each value of the rig is one "muscle". Lengths are in source-picture pixels, angles in degrees.
export const REST = {
  x: 0,
  y: 0,
  squash: 1,
  torsoRot: 0,
  torsoY: 0,
  headRot: 0,
  armRot: 0,
  legLRot: 0,
  legRRot: 0,
  legLY: 0,
  legRY: 0,
  tailRot: 0,
  scarfRot: 0,
  lidL: 0, // 0 = eye open, 1 = closed
  lidR: 0,
  jawOpen: 0, // 0 = closed, 1 = wide open
  jawWidth: 1, // < 1 round "oo", > 1 wide "ee"
};
export type RigKey = keyof typeof REST;
export type Rig = Record<RigKey, MotionValue<number>>;

export function useRig(): Rig {
  return {
    x: useMotionValue(REST.x),
    y: useMotionValue(REST.y),
    squash: useMotionValue(REST.squash),
    torsoRot: useMotionValue(REST.torsoRot),
    torsoY: useMotionValue(REST.torsoY),
    headRot: useMotionValue(REST.headRot),
    armRot: useMotionValue(REST.armRot),
    legLRot: useMotionValue(REST.legLRot),
    legRRot: useMotionValue(REST.legRRot),
    legLY: useMotionValue(REST.legLY),
    legRY: useMotionValue(REST.legRY),
    tailRot: useMotionValue(REST.tailRot),
    scarfRot: useMotionValue(REST.scarfRot),
    lidL: useMotionValue(REST.lidL),
    lidR: useMotionValue(REST.lidR),
    jawOpen: useMotionValue(REST.jawOpen),
    jawWidth: useMotionValue(REST.jawWidth),
  };
}

const pctY = (px: number) => `${(px / CAT_H) * 100}%`;
const pctX = (px: number) => `${(px / CAT_W) * 100}%`;
const origin = ([x, y]: readonly [number, number]) => ({ originX: x / CAT_W, originY: y / CAT_H });

// Smooth curve through points (Catmull-Rom as cubic Béziers), without the leading "M"
const smooth = (pts: number[][]) => {
  let d = "";
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
};

const mouthPath = (open: number, width: number) => {
  const drop = open * JAW_DROP;
  const sx = (x: number) => MOUTH_CX + (x - MOUTH_CX) * width;
  const top = LIP.map(([x, y]) => [sx(x), y]);
  const bottom = LIP.map(([x, y], i) => [sx(x), y + drop * LIP_DROP[i]]).reverse();
  return `M${top[0][0]},${top[0][1]}${smooth(top)} L${bottom[0][0]},${bottom[0][1]}${smooth(bottom)} Z`;
};

function Part({ name }: { name: string }) {
  return (
    <Image
      src={`${PARTS}/${name}.png`}
      alt=""
      fill
      sizes={SIZES}
      className="object-contain pointer-events-none select-none"
      draggable={false}
    />
  );
}

type Props = {
  rig: Rig;
  ref?: Ref<HTMLDivElement>;
  className?: string;
  style?: CSSProperties;
  onClick?: MouseEventHandler<HTMLDivElement>;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
  label: string;
};

export default function CatPuppet({ rig, ref, className = "", style, onClick, onKeyDown, label }: Props) {
  const rootX = useTransform(rig.x, pctX);
  const rootY = useTransform(rig.y, pctY);
  const scaleX = useTransform(rig.squash, (s) => 2 - s); // keep the volume when squashing
  const torsoY = useTransform(rig.torsoY, pctY);
  const legLY = useTransform(rig.legLY, pctY);
  const legRY = useTransform(rig.legRY, pctY);
  const jawY = useTransform(rig.jawOpen, (o) => pctY(Math.max(0, o) * JAW_DROP));
  const d = useTransform([rig.jawOpen, rig.jawWidth], ([o, w]) => mouthPath(Math.max(0, o as number), w as number));
  const mouthOpacity = useTransform(rig.jawOpen, [0, 0.03, 0.12], [0, 0, 1]);
  const tongueCy = useTransform(rig.jawOpen, (o) => 221 + Math.max(0, o) * JAW_DROP * 0.78);
  const tongueRy = useTransform(rig.jawOpen, (o) => Math.max(0.1, Math.max(0, o) * JAW_DROP * 0.4));
  const tongueRx = useTransform(rig.jawWidth, (w) => 13 * w);
  const lidLOpacity = useTransform(rig.lidL, [0, 0.04], [0, 1]);
  const lidROpacity = useTransform(rig.lidR, [0, 0.04], [0, 1]);

  return (
    <motion.div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={`relative cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean rounded-3xl ${className}`}
      style={{ aspectRatio: `${CAT_W} / ${CAT_H}`, x: rootX, y: rootY, scaleY: rig.squash, scaleX, ...origin(JOINT.root), ...style }}
    >
      {/* Legs stand still while the body sways on top of them */}
      <motion.div className="absolute inset-0" style={{ rotate: rig.legLRot, y: legLY, ...origin(JOINT.legL) }}>
        <Part name="leg-left" />
      </motion.div>
      <motion.div className="absolute inset-0" style={{ rotate: rig.legRRot, y: legRY, ...origin(JOINT.legR) }}>
        <Part name="leg-right" />
      </motion.div>

      <motion.div className="absolute inset-0" style={{ rotate: rig.torsoRot, y: torsoY, ...origin(JOINT.torso) }}>
        <motion.div className="absolute inset-0" style={{ rotate: rig.tailRot, ...origin(JOINT.tail) }}>
          <Part name="tail" />
        </motion.div>
        <Part name="body" />
        <motion.div className="absolute inset-0" style={{ rotate: rig.scarfRot, ...origin(JOINT.scarf) }}>
          <Part name="scarf" />
        </motion.div>

        <motion.div className="absolute inset-0" style={{ rotate: rig.headRot, ...origin(JOINT.head) }}>
          <Part name="head" />
          <motion.div className="absolute inset-0" style={{ scaleY: rig.lidL, opacity: lidLOpacity, originY: LID_TOP.left / CAT_H }}>
            <Part name="lid-left" />
          </motion.div>
          <motion.div className="absolute inset-0" style={{ scaleY: rig.lidR, opacity: lidROpacity, originY: LID_TOP.right / CAT_H }}>
            <Part name="lid-right" />
          </motion.div>
          <motion.svg viewBox={`0 0 ${CAT_W} ${CAT_H}`} className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: mouthOpacity }}>
            <motion.path d={d} fill="#3a0e1a" stroke="#3a0e1a" strokeWidth={2.5} strokeLinejoin="round" />
            <motion.ellipse cx={MOUTH_CX} cy={tongueCy} rx={tongueRx} ry={tongueRy} fill="#e2788a" />
          </motion.svg>
          <motion.div className="absolute inset-0" style={{ y: jawY, scaleX: rig.jawWidth, originX: MOUTH_CX / CAT_W }}>
            <Part name="jaw" />
          </motion.div>
        </motion.div>

        <motion.div className="absolute inset-0" style={{ rotate: rig.armRot, ...origin(JOINT.arm) }}>
          <Part name="arm" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
