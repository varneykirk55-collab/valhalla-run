/**
 * Tiny offline synth: every SFX is rendered once into an AudioBuffer at boot.
 * No audio files ship with the game. Each recipe fills a Float32Array per
 * channel; the buffer is then peak-normalised so per-sound volume lives in Sfx.ts.
 */

type Recipe = (out: Float32Array[], sr: number) => void;

export interface SfxRecipe {
  duration: number; // seconds
  channels: 1 | 2;
  render: Recipe;
}

// ---- DSP helpers ---------------------------------------------------------------

/** Deterministic noise so the sounds are identical on every run. */
function noiseGen(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

/** Attack-then-exponential-decay envelope. */
function env(t: number, attack: number, decay: number): number {
  if (t < 0) return 0;
  if (t < attack) return t / attack;
  return Math.exp(-(t - attack) / decay);
}

/** Chamberlin state-variable filter; returns low/band/high outputs. */
class SVF {
  private low = 0;
  private band = 0;
  constructor(private readonly sr: number) {}
  run(x: number, cutoff: number, q = 0.7): { low: number; band: number; high: number } {
    const f = 2 * Math.sin((Math.PI * Math.min(cutoff, this.sr / 6)) / this.sr);
    const damp = 1 / q;
    this.low += f * this.band;
    const high = x - this.low - damp * this.band;
    this.band += f * high;
    return { low: this.low, band: this.band, high };
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, Math.max(0, t));
const expSweep = (a: number, b: number, t: number) => a * Math.pow(b / a, Math.min(1, Math.max(0, t)));

/** Pitch-swept sine thump (boot / body impacts). */
function thump(out: Float32Array, sr: number, start: number, f0: number, f1: number, len: number, amp: number, drive = 1): void {
  let phase = 0;
  const i0 = Math.floor(start * sr);
  const n = Math.floor(len * 1.6 * sr);
  for (let i = 0; i < n && i0 + i < out.length; i++) {
    const t = i / sr;
    phase += (2 * Math.PI * expSweep(f0, f1, t / len)) / sr;
    out[i0 + i] += Math.tanh(Math.sin(phase) * drive) * amp * env(t, 0.003, len * 0.45);
  }
}

/** Struck-metal / bell ping built from inharmonic partials. */
function ping(out: Float32Array, sr: number, start: number, freq: number, ratios: number[], decay: number, amp: number): void {
  const i0 = Math.floor(start * sr);
  const n = Math.floor(decay * 6 * sr);
  for (let i = 0; i < n && i0 + i < out.length; i++) {
    const t = i / sr;
    let s = 0;
    ratios.forEach((r, k) => {
      s += Math.sin(2 * Math.PI * freq * r * t) * Math.exp(-t / (decay / (1 + k * 0.6))) / (1 + k);
    });
    out[i0 + i] += s * amp * Math.min(1, t / 0.002);
  }
}

// ---- Recipes --------------------------------------------------------------------

const BELL = [1, 2.76, 5.4, 8.93];
const METAL = [1, 1.59, 2.14, 2.92, 3.7];

export const RECIPES: Record<string, SfxRecipe> = {
  // Push-off: low boot thump + bandpassed air rising in pitch.
  sfx_jump: {
    duration: 0.24,
    channels: 1,
    render: ([o], sr) => {
      const rnd = noiseGen(1);
      const f = new SVF(sr);
      for (let i = 0; i < o.length; i++) {
        const t = i / sr;
        const u = t / 0.24;
        o[i] = f.run(rnd(), expSweep(320, 1500, u), 1.6).band * env(t, 0.03, 0.07) * 1.4;
      }
      thump(o, sr, 0, 120, 65, 0.06, 0.55);
    },
  },

  // Boot impact + snow crunch (short crackle grains through a lowpass).
  sfx_land: {
    duration: 0.17,
    channels: 1,
    render: ([o], sr) => {
      const rnd = noiseGen(2);
      const f = new SVF(sr);
      let grain = 0;
      for (let i = 0; i < o.length; i++) {
        const t = i / sr;
        if (rnd() > 0.93) grain = rnd(); // sparse crackle impulses
        grain *= 0.94;
        o[i] = f.run(grain + rnd() * 0.15, 2600, 0.8).low * env(t, 0.004, 0.05) * 1.6;
      }
      thump(o, sr, 0, 95, 50, 0.07, 0.8);
    },
  },

  // Cloth-and-snow scrape; independent noise per channel with a slow L→R drift.
  sfx_slide: {
    duration: 0.34,
    channels: 2,
    render: (chs, sr) => {
      chs.forEach((o, ch) => {
        const rnd = noiseGen(3 + ch);
        const f = new SVF(sr);
        for (let i = 0; i < o.length; i++) {
          const t = i / sr;
          const u = t / 0.34;
          const flutter = 0.75 + 0.25 * Math.sin(2 * Math.PI * 23 * t + ch);
          const pan = ch === 0 ? lerp(1, 0.6, u) : lerp(0.6, 1, u);
          o[i] = f.run(rnd(), expSweep(1400, 450, u), 0.9).band * env(t, 0.03, 0.12) * flutter * pan * 2;
        }
      });
    },
  },

  // Very short sideways air swish.
  sfx_lane: {
    duration: 0.11,
    channels: 1,
    render: ([o], sr) => {
      const rnd = noiseGen(5);
      const f = new SVF(sr);
      for (let i = 0; i < o.length; i++) {
        const t = i / sr;
        o[i] = f.run(rnd(), expSweep(700, 2000, t / 0.11), 1.2).band * Math.sin(Math.PI * Math.min(1, t / 0.11));
      }
    },
  },

  // Crystalline rune chime (G6 bell partials + a faint octave shimmer).
  sfx_rune: {
    duration: 0.4,
    channels: 1,
    render: ([o], sr) => {
      ping(o, sr, 0, 1568, BELL, 0.12, 0.8);
      ping(o, sr, 0.012, 3136, [1, 2.76], 0.06, 0.25);
    },
  },

  // Power-up: rising filtered swell into a deeper resonant bell chord.
  sfx_power: {
    duration: 0.8,
    channels: 1,
    render: ([o], sr) => {
      const rnd = noiseGen(6);
      const f = new SVF(sr);
      let phase = 0;
      for (let i = 0; i < o.length; i++) {
        const t = i / sr;
        const rise = t < 0.18 ? t / 0.18 : Math.exp(-(t - 0.18) / 0.05);
        phase += (2 * Math.PI * expSweep(300, 900, t / 0.18)) / sr;
        o[i] = (Math.sin(phase) * 0.35 + f.run(rnd(), expSweep(500, 3000, t / 0.18), 2).band * 0.6) * rise;
      }
      ping(o, sr, 0.16, 523.25, BELL, 0.28, 0.6);
      ping(o, sr, 0.16, 783.99, BELL, 0.24, 0.45);
      ping(o, sr, 0.17, 1046.5, [1, 2.76], 0.18, 0.25);
    },
  },

  // Shield smash: magical boom + ice shatter (scattered high pings) + shimmer.
  sfx_smash: {
    duration: 0.45,
    channels: 1,
    render: ([o], sr) => {
      const rnd = noiseGen(7);
      const f = new SVF(sr);
      for (let i = 0; i < o.length; i++) {
        const t = i / sr;
        o[i] = f.run(rnd(), expSweep(5000, 900, t / 0.2), 0.8).low * env(t, 0.002, 0.06) * 0.9;
      }
      thump(o, sr, 0, 85, 38, 0.16, 1, 2.2);
      for (let k = 0; k < 14; k++) {
        const r = (rnd() + 1) / 2;
        ping(o, sr, 0.01 + r * 0.2, 2200 + ((rnd() + 1) / 2) * 3800, [1, 2.4], 0.025, 0.22 * (1 - r * 0.6));
      }
      ping(o, sr, 0.02, 659.25, BELL, 0.12, 0.3);
    },
  },

  // Crash: driven body impact, dark noise burst, then a tumble of armour clatter.
  sfx_crash: {
    duration: 0.6,
    channels: 1,
    render: ([o], sr) => {
      const rnd = noiseGen(8);
      const f = new SVF(sr);
      for (let i = 0; i < o.length; i++) {
        const t = i / sr;
        o[i] = f.run(rnd(), expSweep(1800, 300, t / 0.25), 0.7).low * env(t, 0.002, 0.08) * 1.3;
      }
      thump(o, sr, 0, 70, 30, 0.22, 1.1, 3);
      thump(o, sr, 0.19, 80, 45, 0.07, 0.45, 2); // tumble
      thump(o, sr, 0.33, 75, 45, 0.06, 0.3, 2);
      const hits = [0.08, 0.17, 0.24, 0.31, 0.4, 0.47];
      hits.forEach((at, k) => ping(o, sr, at, 700 + ((rnd() + 1) / 2) * 600, METAL, 0.03, 0.28 * (1 - k * 0.13)));
    },
  },

  // Draugr: low, wet, wavering growl through a dark lowpass.
  sfx_growl: {
    duration: 0.65,
    channels: 1,
    render: ([o], sr) => {
      const rnd = noiseGen(9);
      const f = new SVF(sr);
      let phase = 0;
      let jitter = 0;
      for (let i = 0; i < o.length; i++) {
        const t = i / sr;
        jitter += (rnd() * 6 - jitter) * 0.002;
        phase += (2 * Math.PI * (68 + jitter * 4 - t * 12)) / sr;
        const saw = ((phase / (2 * Math.PI)) % 1) * 2 - 1;
        const wet = 0.6 + 0.4 * Math.sin(2 * Math.PI * 17 * t + Math.sin(2 * Math.PI * 3 * t) * 2);
        const amp = Math.sin(Math.PI * Math.min(1, t / 0.65)) ** 0.7;
        o[i] = f.run(saw * 0.8 + rnd() * 0.35, 380 + 120 * wet, 1.3).low * wet * amp * 1.6;
      }
    },
  },

  // UI confirm: two soft rising notes (E5 → B5).
  sfx_ui_confirm: {
    duration: 0.3,
    channels: 1,
    render: ([o], sr) => {
      ping(o, sr, 0, 659.25, [1, 2, 3], 0.08, 0.5);
      ping(o, sr, 0.07, 987.77, [1, 2, 3], 0.1, 0.55);
    },
  },

  // UI tap: soft wooden click with a faint bright tick (secondary buttons, toggles, pause).
  sfx_ui_tap: {
    duration: 0.12,
    channels: 1,
    render: ([o], sr) => {
      thump(o, sr, 0, 420, 220, 0.025, 0.7, 1.5);
      ping(o, sr, 0.002, 1760, [1, 2.4], 0.02, 0.35);
    },
  },

  // UI fail: muted low horn (G2, lowpassed saw, bends down) over a soft thud.
  sfx_ui_fail: {
    duration: 0.65,
    channels: 1,
    render: ([o], sr) => {
      const f = new SVF(sr);
      let phase = 0;
      for (let i = 0; i < o.length; i++) {
        const t = i / sr;
        phase += (2 * Math.PI * (98 - t * 10)) / sr;
        const saw = ((phase / (2 * Math.PI)) % 1) * 2 - 1;
        o[i] = f.run(saw, 520, 0.9).low * env(t, 0.05, 0.22) * 0.9;
      }
      thump(o, sr, 0, 70, 40, 0.08, 0.6);
    },
  },
};

/** Render a recipe into an AudioBuffer, peak-normalised to 0.9 with a tiny fade-out. */
export function renderBuffer(ctx: BaseAudioContext, recipe: SfxRecipe): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.ceil(recipe.duration * sr);
  const buffer = ctx.createBuffer(recipe.channels, len, sr);
  const chans = Array.from({ length: recipe.channels }, () => new Float32Array(len));
  recipe.render(chans, sr);

  let peak = 0;
  for (const c of chans) for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(c[i]));
  const gain = peak > 0 ? 0.9 / peak : 1;
  const fade = Math.floor(0.008 * sr);
  chans.forEach((c, ch) => {
    for (let i = 0; i < len; i++) c[i] *= gain * (i > len - fade ? (len - i) / fade : 1);
    buffer.copyToChannel(c, ch);
  });
  return buffer;
}
