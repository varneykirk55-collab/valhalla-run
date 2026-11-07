import Phaser from 'phaser';
import { Ctx, Pt, makeTexture, poly, polyline, seeded, vGradient } from './canvas';

/**
 * Twilight-fjord scenery (middle reference screen): indigo sky with green aurora
 * curtains, two ranges of ridged snow-capped mountains, fjord water in the
 * valley, snowy blue cliffs, pine silhouettes on the shoulders, blue mist.
 * Everything is drawn once at boot in the 450-wide design space (makeTexture
 * applies TEX_SCALE) and cached under the existing texture keys.
 */

const PALETTE = {
  skyTop: '#0d0b2e',
  skyMid: '#1f1f5c',
  skyLow: '#33479a',
  skyHorizon: '#7d97d6',
  snow: '#eaf0ff',
  snowShade: '#b4c1ea',
  rockDark: '#121838',
  pine: '#0f1730',
  mist: '190,205,240',
};

const ridged = (v: number) => 1 - Math.abs(v);

// ---- Sky & aurora ----------------------------------------------------------------

function sky(c: Ctx, w: number, h: number): void {
  c.fillStyle = vGradient(c, 0, h, [
    [0, PALETTE.skyTop],
    [0.35, PALETTE.skyMid],
    [0.68, PALETTE.skyLow],
    [1, PALETTE.skyHorizon],
  ]);
  c.fillRect(0, 0, w, h);
  // faint violet glow behind the aurora
  const neb = c.createRadialGradient(w * 0.3, h * 0.18, 10, w * 0.3, h * 0.18, w * 0.6);
  neb.addColorStop(0, 'rgba(140,90,220,0.22)');
  neb.addColorStop(1, 'rgba(140,90,220,0)');
  c.fillStyle = neb;
  c.fillRect(0, 0, w, h);

  const r = seeded(7);
  for (let i = 0; i < 120; i++) {
    const x = r() * w;
    const y = r() * h * 0.6;
    const a = 0.25 + r() * 0.65;
    c.fillStyle = `rgba(235,240,255,${a})`;
    c.fillRect(x, y, 1, 1);
    if (r() < 0.06) {
      // a few twinkling crosses
      c.fillStyle = `rgba(235,240,255,${a * 0.6})`;
      c.fillRect(x - 2, y, 5, 0.6);
      c.fillRect(x, y - 2, 0.6, 5);
    }
  }
}

/** Curtain aurora: bright green lower hem, rays rising and fading to violet. */
function aurora(c: Ctx, w: number, h: number): void {
  c.globalCompositeOperation = 'lighter';
  const bands = [
    { y: 92, a: 26, f: 0.014, ph: 0.4, len: 78, hem: '120,255,180', top: '120,100,255', gain: 1 },
    { y: 128, a: 18, f: 0.022, ph: 2.1, len: 60, hem: '80,235,210', top: '90,140,255', gain: 0.75 },
    { y: 64, a: 14, f: 0.03, ph: 4.0, len: 46, hem: '150,255,170', top: '170,110,255', gain: 0.5 },
  ];
  for (const b of bands) {
    for (let x = 0; x <= w; x += 2) {
      const edge = Math.min(1, x / 90, (w - x) / 90);
      const hemY = b.y + Math.sin(x * b.f + b.ph) * b.a + Math.sin(x * b.f * 2.7 + b.ph) * b.a * 0.25;
      const rays = 0.45 + 0.55 * Math.pow(Math.sin(x * 0.31 + b.ph) * Math.sin(x * 0.11 + b.ph * 2), 2);
      const k = edge * rays * b.gain;
      const top = hemY - b.len * (0.7 + 0.3 * rays);
      const g = c.createLinearGradient(x, top, x, hemY + 8);
      g.addColorStop(0, `rgba(${b.top},0)`);
      g.addColorStop(0.55, `rgba(${b.hem},${0.22 * k})`);
      g.addColorStop(0.9, `rgba(${b.hem},${0.75 * k})`);
      g.addColorStop(1, `rgba(${b.hem},0)`);
      c.fillStyle = g;
      c.fillRect(x, top, 2, hemY + 8 - top);
    }
  }
  void h;
}

// ---- Mountains ---------------------------------------------------------------------

/**
 * Faceted ridge with snow that follows the peaks: each column is lit or shaded by
 * slope, and snow depth grows with height above the snow line.
 */
function mountainRange(
  c: Ctx,
  w: number,
  h: number,
  ridge: (x: number) => number,
  colors: { top: string; base: string; shade: string },
  snowLine: number,
  haze: string,
): void {
  c.beginPath();
  c.moveTo(0, h);
  for (let x = 0; x <= w; x += 1) c.lineTo(x, ridge(x));
  c.lineTo(w, h);
  c.closePath();
  c.fillStyle = vGradient(c, 20, h, [[0, colors.top], [1, colors.base]]);
  c.fill();

  for (let x = 0; x < w; x += 1) {
    const top = ridge(x);
    const slope = ridge(x + 1) - top; // > 0: face turned away from the light
    if (slope > 0) {
      c.fillStyle = colors.shade;
      c.fillRect(x, top, 1, h - top);
    }
    if (top < snowLine) {
      const depth = (snowLine - top) * 0.55 + 3 + Math.sin(x * 0.45) * 2.5 + Math.sin(x * 0.13) * 3;
      c.fillStyle = slope > 0 ? PALETTE.snowShade : PALETTE.snow;
      c.fillRect(x, top, 1, Math.max(2, depth));
    }
  }

  c.fillStyle = vGradient(c, h * 0.55, h, [[0, `rgba(${haze},0)`], [1, `rgba(${haze},0.75)`]]);
  c.fillRect(0, h * 0.55, w, h * 0.45);
}

function farMountains(c: Ctx, w: number, h: number): void {
  const ridge = (x: number) =>
    h -
    (30 +
      52 * ridged(Math.sin(x * 0.012 + 0.4)) +
      24 * ridged(Math.sin(x * 0.031 + 1.7)) +
      9 * ridged(Math.sin(x * 0.083 + 0.9)));
  mountainRange(c, w, h, ridge, { top: '#7a86d0', base: '#3d4688', shade: 'rgba(22,20,70,0.28)' }, 120, '125,150,210');
}

/** Nearer, darker range: tall shoulders at both sides, a low valley in the middle. */
function midMountains(c: Ctx, w: number, h: number): void {
  const ridge = (x: number) => {
    const env = 0.22 + 0.78 * Math.pow(Math.abs(x - w / 2) / (w / 2), 1.25);
    const peaks = 70 + 60 * ridged(Math.sin(x * 0.019 + 2.3)) + 22 * ridged(Math.sin(x * 0.057 + 0.5));
    return h - env * peaks - 8;
  };
  mountainRange(c, w, h, ridge, { top: '#3f4c8e', base: '#1c2452', shade: 'rgba(8,10,40,0.32)' }, 112, '90,110,180');
}

function fjord(c: Ctx, w: number, h: number): void {
  c.fillStyle = vGradient(c, 0, h, [[0, '#4f6fb8'], [0.35, '#2b4688'], [1, '#132450']]);
  c.fillRect(0, 0, w, h);
  const r = seeded(21);
  for (let i = 0; i < 46; i++) {
    const y = 3 + r() * (h - 6);
    const x = r() * w;
    const green = r() < 0.35;
    c.fillStyle = green ? `rgba(120,255,190,${0.1 + r() * 0.15})` : `rgba(220,232,255,${0.08 + r() * 0.14})`;
    c.fillRect(x, y, 8 + r() * 46, 1);
  }
}

// ---- Cliffs & pines ---------------------------------------------------------------

/** Snow-tipped pine silhouette with its base at (x, y). */
function pineSilhouette(c: Ctx, x: number, y: number, s: number): void {
  const tiers = 3;
  for (let t = 0; t < tiers; t++) {
    const ty = y - s * (0.28 + t * 0.26);
    const hw = s * (0.32 - t * 0.08);
    const th = s * 0.42;
    poly(c, [[x, ty - th], [x - hw, ty], [x + hw, ty]], PALETTE.pine);
    polyline(c, [[x - hw * 0.45, ty - th * 0.5], [x, ty - th], [x + hw * 0.25, ty - th * 0.7]], 'rgba(225,235,255,0.5)', Math.max(0.8, s * 0.035));
  }
  c.fillStyle = PALETTE.pine;
  c.fillRect(x - s * 0.03, y - s * 0.3, s * 0.06, s * 0.3);
}

function cliffs(c: Ctx, w: number, h: number): void {
  const left: Pt[] = [[0, 18], [26, 6], [52, 22], [76, 16], [100, 48], [122, 62], [144, 98], [170, 122], [198, 152], [224, 180], [246, 206], [262, h]];
  const right: Pt[] = left.map(([x, y]) => [w - x, Math.min(h, y + 6)] as Pt);
  const r = seeded(5);

  for (const top of [left, right]) {
    const edgeX = top === left ? 0 : w;
    poly(c, [[edgeX, h], ...top, [top[top.length - 1][0], h]], vGradient(c, 0, h, [[0, '#33407a'], [1, PALETTE.rockDark]]));

    c.save();
    c.beginPath();
    [[edgeX, h] as Pt, ...top, [top[top.length - 1][0], h] as Pt].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.clip();
    // rock strata with snow resting on each ledge
    for (let k = 1; k <= 4; k++) {
      const off = k * 34;
      const pts = top.map(([x, y]) => [x, y + off + Math.sin(x * 0.09 + k) * 4] as Pt);
      polyline(c, pts, 'rgba(8,12,34,0.45)', 2.5);
      polyline(c, pts.map(([x, y]) => [x, y - 2.5] as Pt), 'rgba(225,235,255,0.28)', 1.5);
    }
    c.restore();

    polyline(c, top.slice(0, -1), 'rgba(235,242,255,0.9)', 3.5);

    // pines climbing the slope
    for (let i = 0; i < top.length - 2; i++) {
      const [x0, y0] = top[i];
      const [x1, y1] = top[i + 1];
      for (let k = 0; k < 3; k++) {
        const t = r();
        const x = x0 + (x1 - x0) * t;
        const y = y0 + (y1 - y0) * t + 14 + r() * 34;
        if (y < h - 4 && r() < 0.6) pineSilhouette(c, x, y, 12 + r() * 10);
      }
    }
  }
}

/** Dense pine stands on both shoulders of the valley, on a snowy rise. */
function pineRidge(c: Ctx, w: number, h: number): void {
  const r = seeded(31);
  const rise = (x: number) => {
    const fromCentre = Math.abs(x - w / 2) / (w / 2);
    return h - 6 - Math.max(0, fromCentre - 0.28) * 70 - Math.sin(x * 0.05) * 3;
  };
  // snowy rise (empty in the middle third so the valley stays open)
  c.beginPath();
  c.moveTo(0, h);
  for (let x = 0; x <= w; x += 2) c.lineTo(x, rise(x));
  c.lineTo(w, h);
  c.closePath();
  c.fillStyle = vGradient(c, h - 60, h, [[0, '#c9d6f2'], [1, '#9fb2dc']]);
  c.fill();

  for (let i = 0; i < 70; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const d = Math.pow(r(), 0.7) * 0.62; // 0 at the outer edge → 0.62 towards centre
    const x = side < 0 ? d * (w / 2) : w - d * (w / 2);
    const s = 26 + (0.62 - d) * 60 + r() * 14;
    pineSilhouette(c, x, rise(x) + 3, s);
  }
}

function mist(c: Ctx, w: number, h: number): void {
  const r = seeded(13);
  for (let i = 0; i < 28; i++) {
    const x = r() * w;
    const y = 50 + r() * (h - 70);
    const rad = 40 + r() * 64;
    for (const ox of [-w, 0, w]) {
      const g = c.createRadialGradient(x + ox, y, 0, x + ox, y, rad);
      g.addColorStop(0, `rgba(${PALETTE.mist},0.17)`);
      g.addColorStop(1, `rgba(${PALETTE.mist},0)`);
      c.fillStyle = g;
      c.fillRect(x + ox - rad, y - rad, rad * 2, rad * 2);
    }
  }
}

/** Blue twilight snow with soft drift shadows that widen toward the camera. */
function snowfield(c: Ctx, w: number, h: number): void {
  c.fillStyle = vGradient(c, 0, h, [[0, '#93a8d8'], [0.25, '#c3d1ee'], [0.6, '#dde7f8'], [1, '#eef3fc']]);
  c.fillRect(0, 0, w, h);
  const r = seeded(17);
  for (let k = 0; k < 14; k++) {
    const t = k / 14;
    const y = 8 + Math.pow(t, 1.6) * (h - 16);
    const amp = 2 + t * 10;
    const width = 2 + t * 9;
    c.beginPath();
    for (let x = 0; x <= w; x += 6) {
      const yy = y + Math.sin(x * (0.02 + r() * 0.0005) + k * 1.7) * amp;
      x ? c.lineTo(x, yy) : c.moveTo(x, yy);
    }
    c.strokeStyle = `rgba(80,100,165,${0.1 + t * 0.06})`;
    c.lineWidth = width;
    c.stroke();
  }
  for (let i = 0; i < 160; i++) {
    c.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.5})`;
    c.fillRect(r() * w, r() * h, 1, 1);
  }
}

export function generateSceneryTextures(scene: Phaser.Scene): void {
  makeTexture(scene, 'sky', 450, 380, sky);
  makeTexture(scene, 'aurora', 450, 200, aurora);
  makeTexture(scene, 'mtnFar', 600, 190, farMountains);
  makeTexture(scene, 'mtnMid', 600, 200, midMountains);
  makeTexture(scene, 'fjord', 450, 60, fjord);
  makeTexture(scene, 'cliffs', 540, 220, cliffs);
  makeTexture(scene, 'pineRidge', 600, 130, pineRidge);
  makeTexture(scene, 'mist', 900, 150, mist);
  makeTexture(scene, 'fog', 8, 140, (c, w, h) => {
    c.fillStyle = vGradient(c, 0, h, [
      [0, 'rgba(160,180,225,0)'],
      [0.22, 'rgba(160,180,225,0.95)'],
      [0.5, 'rgba(170,190,232,0.7)'],
      [1, 'rgba(180,198,236,0)'],
    ]);
    c.fillRect(0, 0, w, h);
  });
  makeTexture(scene, 'snowfield', 450, 520, snowfield);
}
