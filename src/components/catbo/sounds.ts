// Catbo's sounds, all made in the browser with Web Audio (no audio files).
// Every function takes the page's AudioContext, which must be created from a tap/click.

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const noiseBuffer = (ctx: AudioContext, seconds: number) => {
  const buf = ctx.createBuffer(1, Math.max(1, Math.round(ctx.sampleRate * seconds)), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
};

// A short sound burst: noise through a filter, with a fast attack and exponential decay
const noiseHit = (
  ctx: AudioContext,
  out: AudioNode,
  t: number,
  { type = "bandpass", freq = 1000, q = 1, gain = 0.5, decay = 0.1 }: { type?: BiquadFilterType; freq?: number; q?: number; gain?: number; decay?: number },
) => {
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();
  src.buffer = noiseBuffer(ctx, decay + 0.02);
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  src.connect(filter).connect(g).connect(out);
  src.start(t);
};

const tone = (
  ctx: AudioContext,
  out: AudioNode,
  t: number,
  { type = "sine", from, to = from, dur, gain = 0.3 }: { type?: OscillatorType; from: number; to?: number; dur: number; gain?: number },
) => {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.02, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
};

export function meow(ctx: AudioContext, pitch = 1) {
  const t = ctx.currentTime;
  const base = rand(520, 680) * pitch;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(base, t);
  osc.frequency.exponentialRampToValueAtTime(base * 1.7, t + 0.14);
  osc.frequency.exponentialRampToValueAtTime(base * 1.1, t + 0.5);
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1100, t);
  filter.frequency.linearRampToValueAtTime(1800, t + 0.15);
  filter.frequency.linearRampToValueAtTime(900, t + 0.5);
  filter.Q.value = 3;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.35, t + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.6);
}

export function chomp(ctx: AudioContext, times = 3) {
  for (let n = 0; n < times; n++) {
    noiseHit(ctx, ctx.destination, ctx.currentTime + n * 0.18, { freq: rand(700, 1100), q: 1.2, gain: 0.6, decay: 0.09 });
  }
}

// Low rumble, pulsing ~24 times a second
export function purr(ctx: AudioContext, seconds = 1.6) {
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  src.buffer = noiseBuffer(ctx, seconds);
  filter.type = "lowpass";
  filter.frequency.value = 220;
  lfo.frequency.value = 24;
  lfoGain.gain.value = 0.35;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.45, t + 0.2);
  g.gain.setValueAtTime(0.45, t + seconds - 0.3);
  g.gain.linearRampToValueAtTime(0.0001, t + seconds);
  lfo.connect(lfoGain).connect(g.gain);
  src.connect(filter).connect(g).connect(ctx.destination);
  src.start(t);
  lfo.start(t);
  lfo.stop(t + seconds);
}

// "Hehehe" - quick rising chirps
export function giggle(ctx: AudioContext) {
  const t = ctx.currentTime;
  const base = rand(700, 850);
  for (let i = 0; i < 5; i++) {
    tone(ctx, ctx.destination, t + i * 0.11, { type: "triangle", from: base * (1 + i * 0.06), to: base * (1.35 + i * 0.06), dur: 0.08, gain: 0.22 });
  }
}

// Angry "hhhsss" plus a low growl
export function hiss(ctx: AudioContext) {
  const t = ctx.currentTime;
  noiseHit(ctx, ctx.destination, t, { type: "highpass", freq: 3200, gain: 0.35, decay: 0.55 });
  tone(ctx, ctx.destination, t + 0.05, { type: "sawtooth", from: 140, to: 85, dur: 0.5, gain: 0.12 });
}

// "Ah... choo!"
export function sneeze(ctx: AudioContext) {
  const t = ctx.currentTime;
  tone(ctx, ctx.destination, t, { type: "triangle", from: 500, to: 900, dur: 0.35, gain: 0.15 });
  noiseHit(ctx, ctx.destination, t + 0.42, { freq: 2200, q: 0.8, gain: 0.7, decay: 0.25 });
}

export function boop(ctx: AudioContext) {
  tone(ctx, ctx.destination, ctx.currentTime, { from: 620, to: 980, dur: 0.14, gain: 0.3 });
}

export function clap(ctx: AudioContext) {
  const t = ctx.currentTime;
  noiseHit(ctx, ctx.destination, t, { freq: 1500, q: 0.9, gain: 0.8, decay: 0.12 });
  noiseHit(ctx, ctx.destination, t + 0.015, { freq: 2400, q: 0.9, gain: 0.5, decay: 0.1 });
}

// ---------- Dance track ----------
// A little 4-bar loop at `bpm`: kick, clap, hats, bass and a pentatonic riff.

const NOTE = (semis: number) => 220 * Math.pow(2, semis / 12); // relative to A3
const BASS = [-12, -16, -9, -14]; // A2, F2, C3, G2 - one per bar
const RIFF = [
  [0, 3, 7, 10, 7, 3, 5, 7],
  [0, 3, 7, 12, 10, 7, 5, 3],
  [3, 7, 10, 15, 12, 10, 7, 5],
  [7, 5, 3, 5, 7, 10, 12, 15],
];

export const DANCE_BPM = 120;
export const DANCE_BARS = 4;

export function playDanceTrack(ctx: AudioContext, bpm = DANCE_BPM, bars = DANCE_BARS) {
  const beat = 60 / bpm;
  const start = ctx.currentTime + 0.06;
  const master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);

  for (let bar = 0; bar < bars; bar++) {
    for (let b = 0; b < 4; b++) {
      const t = start + (bar * 4 + b) * beat;
      // kick
      tone(ctx, master, t, { from: 150, to: 45, dur: 0.16, gain: 0.9 });
      // clap on 2 and 4
      if (b % 2 === 1) noiseHit(ctx, master, t, { freq: 1800, q: 0.8, gain: 0.45, decay: 0.14 });
      // hats on every 8th
      noiseHit(ctx, master, t, { type: "highpass", freq: 7000, gain: 0.12, decay: 0.04 });
      noiseHit(ctx, master, t + beat / 2, { type: "highpass", freq: 7000, gain: 0.18, decay: 0.05 });
      // bass on 8ths
      for (const half of [0, 1]) {
        tone(ctx, master, t + (half * beat) / 2, { type: "triangle", from: NOTE(BASS[bar % BASS.length]), dur: beat / 2 - 0.03, gain: 0.35 });
      }
      // riff on 8ths
      for (const half of [0, 1]) {
        const semis = RIFF[bar % RIFF.length][b * 2 + half];
        tone(ctx, master, t + (half * beat) / 2, { type: "square", from: NOTE(semis + 12), dur: beat / 2 - 0.05, gain: 0.06 });
      }
    }
  }

  const duration = bars * 4 * beat;
  return {
    beat,
    duration,
    stop: () => {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      setTimeout(() => master.disconnect(), 250);
    },
  };
}
