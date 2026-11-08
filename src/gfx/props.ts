import Phaser from 'phaser';
import { Ctx, Pt, TAU, box, circle, makeTexture, poly, polyline, rgba, vGradient } from './canvas';

/**
 * On-screen scale for the baked winter sprites at z = 0.
 * Native textures are several times larger than the old procedural art;
 * these factors keep a rock inside one lane and put the fallen log's gap
 * just above a slide.
 */
export const WINTER_SCALE = {
  pine: 200 / 548,
  rock: 150 / 534,
  spikes: 120 / 390,
  fallenTree: 180 / 325,
} as const;

/** Measured slope of the trunk in the fallen-tree art (3/4 view, falling to the right). */
const LOG_ART_SLOPE_DEG = 15.3;

/**
 * Display copy of the existing fallen-tree texture, sheared vertically so the trunk
 * runs level while the supporting rocks stay upright (a rotation would tilt them).
 * Built once from whatever 'fallenTree' holds (the PNG, or the procedural fallback)
 * and cropped to its visible pixels so the anchor sits on the lowest snow.
 */
export function levelledLogTexture(scene: Phaser.Scene): string {
  const key = 'fallenTree_level';
  if (scene.textures.exists(key)) return key;
  const src = scene.textures.get('fallenTree').getSourceImage() as CanvasImageSource & { width: number; height: number };
  const tan = Math.tan((LOG_ART_SLOPE_DEG * Math.PI) / 180);
  const lift = Math.ceil(tan * src.width);
  const work = document.createElement('canvas');
  work.width = src.width;
  work.height = src.height + lift;
  const wc = work.getContext('2d');
  if (!wc) return 'fallenTree';
  wc.setTransform(1, -tan, 0, 1, 0, lift); // y' = y - tan·x + lift
  wc.drawImage(src, 0, 0);

  // Crop to the visible pixels.
  const { data } = wc.getImageData(0, 0, work.width, work.height);
  let top = work.height;
  let bottom = 0;
  for (let y = 0; y < work.height; y++) {
    for (let x = 0; x < work.width; x++) {
      if (data[(y * work.width + x) * 4 + 3] > 24) {
        if (y < top) top = y;
        bottom = y;
        break;
      }
    }
  }
  const tex = scene.textures.createCanvas(key, work.width, Math.max(1, bottom - top + 1));
  if (!tex) return 'fallenTree';
  tex.getContext().drawImage(work, 0, -top);
  tex.refresh();
  return key;
}

// ---- Obstacles ------------------------------------------------------------

function rock(c: Ctx, w: number, h: number): void {
  const body: Pt[] = [[8, 80], [3, 58], [17, 30], [42, 11], [70, 9], [94, 25], [107, 52], [103, 80]];
  poly(c, body, vGradient(c, 10, h, [[0, '#9aa0a8'], [1, '#4d525a']]), '#3d4148', 2);
  poly(c, [[42, 11], [52, 44], [30, 70], [17, 30]], 'rgba(255,255,255,0.08)');
  poly(c, [[70, 9], [94, 25], [107, 52], [74, 46]], 'rgba(0,0,0,0.12)');
  polyline(c, [[52, 44], [74, 46], [86, 72]], 'rgba(30,32,38,0.5)', 2);
  poly(c, [[17, 31], [42, 11], [70, 9], [94, 25], [86, 30], [72, 23], [58, 29], [44, 25], [30, 35]], '#eef4fa');
  void w;
}

function spikes(c: Ctx): void {
  poly(c, [[2, 80], [9, 70], [101, 70], [108, 80]], '#b6def0');
  const list: Array<[number, number, number]> = [[18, 22, 46], [38, 26, 70], [57, 22, 56], [75, 26, 76], [94, 22, 44]];
  c.save();
  c.shadowColor = '#9fe6ff';
  c.shadowBlur = 10;
  for (const [cx, w, hh] of list) poly(c, [[cx - w / 2, 80], [cx, 80 - hh], [cx + w / 2, 80]], 'rgba(160,225,255,0.5)');
  c.restore();
  for (const [cx, w, hh] of list) {
    poly(c, [[cx - w / 2, 80], [cx, 80 - hh], [cx, 80]], '#e4f7ff');
    poly(c, [[cx, 80], [cx, 80 - hh], [cx + w / 2, 80]], '#86c6e6');
    poly(c, [[cx - w / 2, 80], [cx, 80 - hh], [cx + w / 2, 80]], undefined, '#4f8fb5', 1.5);
  }
}

function fallenTree(c: Ctx): void {
  const stone = vGradient(c, 80, 140, [[0, '#8e949c'], [1, '#4f545b']]);
  poly(c, [[0, 140], [2, 104], [12, 86], [30, 80], [42, 96], [44, 140]], stone, '#3d4148', 2);
  poly(c, [[86, 140], [89, 98], [104, 82], [122, 86], [130, 104], [130, 140]], stone, '#3d4148', 2);
  poly(c, [[12, 86], [30, 80], [40, 92], [24, 90]], '#eef4fa');
  poly(c, [[104, 82], [122, 86], [126, 96], [108, 90]], '#eef4fa');
  // trunk
  box(c, 0, 40, 130, 34, 10, vGradient(c, 40, 74, [[0, '#7c5940'], [0.5, '#5a3e2c'], [1, '#3a281c']]));
  c.strokeStyle = 'rgba(0,0,0,0.28)';
  c.lineWidth = 1.5;
  for (const [y, x0, x1] of [[50, 14, 70], [58, 40, 118], [66, 8, 90], [52, 86, 124]] as const) {
    c.beginPath();
    c.moveTo(x0, y);
    c.bezierCurveTo(x0 + 20, y - 2, x1 - 20, y + 2, x1, y);
    c.stroke();
  }
  c.fillStyle = '#c9a36f';
  c.beginPath();
  c.ellipse(6, 57, 6, 16, 0, 0, TAU);
  c.fill();
  c.strokeStyle = '#8a6a43';
  c.lineWidth = 1;
  c.beginPath();
  c.ellipse(6, 57, 3, 9, 0, 0, TAU);
  c.stroke();
  poly(c, [[72, 42], [79, 20], [85, 22], [79, 44]], '#5a3e2c');
  // snow on top
  c.fillStyle = '#eef4fa';
  c.beginPath();
  c.moveTo(8, 44);
  for (let x = 8; x <= 124; x += 8) c.lineTo(x, 38 + Math.sin(x * 0.4) * 2.5);
  c.lineTo(124, 45);
  c.closePath();
  c.fill();
}

// ---- Scenery props ------------------------------------------------------------

function pine(c: Ctx): void {
  box(c, 36, 126, 8, 24, 2, '#4a3426');
  const tiers: Array<[number, number, number]> = [
    [10, 62, 26], // apex y, base y, half width
    [38, 98, 32],
    [70, 134, 37],
  ];
  for (const [ay, by, hw] of tiers) {
    poly(c, [[40, ay], [40 - hw, by], [40 + hw, by]], '#1d3a2f');
    poly(c, [[40, ay], [40, by], [40 + hw, by]], 'rgba(0,0,0,0.18)');
    const mid = ay + (by - ay) * 0.36;
    poly(c, [[40, ay], [40 - hw * 0.5, mid], [40 - hw * 0.25, mid - 4], [40, mid + 2], [40 + hw * 0.3, mid - 3], [40 + hw * 0.5, mid]], 'rgba(238,244,250,0.92)');
  }
}

function runestone(c: Ctx): void {
  c.fillStyle = vGradient(c, 0, 90, [[0, '#8d939b'], [1, '#585d65']]);
  c.beginPath();
  c.moveTo(6, 90);
  c.lineTo(4, 26);
  c.quadraticCurveTo(22, -6, 40, 22);
  c.lineTo(38, 90);
  c.closePath();
  c.fill();
  c.save();
  c.shadowColor = '#5ef2ff';
  c.shadowBlur = 6;
  polyline(c, [[22, 22], [22, 74]], '#7ff3ff', 3);
  polyline(c, [[13, 34], [22, 22], [31, 34]], '#7ff3ff', 3);
  c.restore();
  poly(c, [[8, 22], [22, 6], [36, 18], [28, 16], [22, 12], [14, 20]], '#eef4fa');
}

// ---- Runes ---------------------------------------------------------------------

/** Elder Futhark glyphs as strokes in a unit box. */
export const GLYPHS: Record<string, Pt[][]> = {
  ansuz: [[[0.35, 0.08], [0.35, 0.92]], [[0.35, 0.12], [0.7, 0.36]], [[0.35, 0.38], [0.7, 0.62]]],
  kenaz: [[[0.66, 0.18], [0.34, 0.5], [0.66, 0.82]]],
  tiwaz: [[[0.5, 0.08], [0.5, 0.92]], [[0.22, 0.36], [0.5, 0.08], [0.78, 0.36]]],
  algiz: [[[0.5, 0.08], [0.5, 0.92]], [[0.2, 0.12], [0.5, 0.46]], [[0.8, 0.12], [0.5, 0.46]]],
  fehu: [[[0.32, 0.08], [0.32, 0.92]], [[0.32, 0.4], [0.72, 0.12]], [[0.32, 0.64], [0.72, 0.36]]],
  sowilo: [[[0.68, 0.08], [0.3, 0.44], [0.7, 0.56], [0.32, 0.92]]],
  raidho: [[[0.3, 0.08], [0.3, 0.92]], [[0.3, 0.08], [0.7, 0.3], [0.3, 0.5], [0.72, 0.92]]],
};

type RuneStyle = 'crystal' | 'shield' | 'magnet' | 'sun' | 'wings';

/** Glyph strokes inside a box: a wide coloured glow pass, then a bright core so it reads at small sizes. */
function glyphStrokes(c: Ctx, glyph: Pt[][], color: string, x: number, y: number, w: number, h: number, width: number): void {
  const pts = glyph.map((stroke) => stroke.map(([gx, gy]) => [x + gx * w, y + gy * h] as Pt));
  c.save();
  c.shadowColor = color;
  c.shadowBlur = 10;
  for (const stroke of pts) polyline(c, stroke, color, width);
  c.restore();
  for (const stroke of pts) polyline(c, stroke, 'rgba(255,255,255,0.92)', width * 0.38);
}

/**
 * Stylised runes (Norse UI pass). Basic runes are glowing cyan crystals; power-ups
 * are gold-rimmed medallions with a faint emblem behind their own glyph
 * (Algiz → shield, Fehu → magnet, Sowilo → sun) so each reads at a glance.
 */
function rune(c: Ctx, glyph: Pt[][], color: string, style: RuneStyle): void {
  const glow = c.createRadialGradient(36, 36, 6, 36, 36, 36);
  glow.addColorStop(0, rgba(color, 0.5));
  glow.addColorStop(1, rgba(color, 0));
  c.fillStyle = glow;
  c.fillRect(0, 0, 72, 72);

  if (style === 'crystal') {
    const body: Pt[] = [[36, 5], [53, 18], [53, 54], [36, 67], [19, 54], [19, 18]];
    poly(c, body, vGradient(c, 5, 67, [[0, '#1d4b66'], [0.5, '#10283d'], [1, '#0a1626']]));
    poly(c, [[36, 5], [53, 18], [36, 24], [19, 18]], 'rgba(160,250,255,0.28)'); // top facet
    polyline(c, [[36, 24], [36, 60]], 'rgba(120,230,255,0.18)', 2);
    c.save();
    c.shadowColor = color;
    c.shadowBlur = 8;
    poly(c, body, undefined, color, 2.5);
    c.restore();
    glyphStrokes(c, glyph, color, 25, 19, 22, 36, 4.6);
    return;
  }

  // Medallion
  c.fillStyle = vGradient(c, 9, 63, [[0, '#22314f'], [1, '#0c1322']]);
  c.beginPath();
  c.arc(36, 36, 27, 0, TAU);
  c.fill();
  const inner = c.createRadialGradient(36, 36, 2, 36, 36, 26);
  inner.addColorStop(0, rgba(color, 0.35));
  inner.addColorStop(1, rgba(color, 0));
  c.fillStyle = inner;
  c.fill();

  // Faint emblem behind the glyph
  c.save();
  c.globalAlpha = 0.28;
  if (style === 'shield') {
    poly(c, [[36, 15], [53, 21], [51, 41], [36, 56], [21, 41], [19, 21]], color);
  } else if (style === 'magnet') {
    c.strokeStyle = color;
    c.lineWidth = 8;
    c.beginPath();
    c.arc(36, 34, 13, Math.PI * 1.05, Math.PI * 1.95, true);
    c.stroke();
  } else if (style === 'wings') {
    for (const side of [-1, 1]) {
      poly(c, [[36, 38], [36 + side * 10, 22], [36 + side * 24, 16], [36 + side * 20, 26], [36 + side * 25, 30], [36 + side * 18, 36], [36 + side * 21, 42], [36 + side * 8, 44]], color);
    }
  } else {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      polyline(c, [[36 + Math.cos(a) * 11, 36 + Math.sin(a) * 11], [36 + Math.cos(a) * 23, 36 + Math.sin(a) * 23]], color, 3);
    }
  }
  c.restore();

  // Gold rim + accent inner ring
  c.lineWidth = 4;
  c.strokeStyle = vGradient(c, 8, 64, [[0, '#fff0b0'], [0.5, '#e2a943'], [1, '#9c6418']]);
  c.beginPath();
  c.arc(36, 36, 28, 0, TAU);
  c.stroke();
  c.lineWidth = 1.5;
  c.strokeStyle = rgba(color, 0.85);
  c.beginPath();
  c.arc(36, 36, 24.5, 0, TAU);
  c.stroke();

  glyphStrokes(c, glyph, color, 23, 17, 26, 38, 5);
}

export const RUNE_COLORS = {
  basic: '#5ef2ff',
  shield: '#6cb6ff',
  magnet: '#ff6670',
  double: '#ffd257',
  flight: '#c39bff',
} as const;

/** Feathered Valkyrie wings worn while the flight power-up lasts (drawn behind the runner). */
function wings(c: Ctx): void {
  c.save();
  c.shadowColor = '#c39bff';
  c.shadowBlur = 14;
  for (const side of [-1, 1]) {
    const x = (dx: number) => 90 + side * dx;
    for (let f = 0; f < 5; f++) {
      const len = 78 - f * 11;
      const y0 = 30 + f * 9;
      poly(
        c,
        [[x(6), y0 + 8], [x(20), y0 - 4], [x(len * 0.7), y0 - 12 + f * 2], [x(len), y0 - 4 + f * 3], [x(len * 0.75), y0 + 6], [x(16), y0 + 14]],
        f % 2 === 0 ? 'rgba(246,242,255,0.95)' : 'rgba(222,212,255,0.95)',
        'rgba(150,120,220,0.7)',
        1.2,
      );
    }
  }
  c.restore();
}

// ---- FX ---------------------------------------------------------------------

function softDot(c: Ctx, size: number, inner: string, outer: string): void {
  const r = size / 2;
  const g = c.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
}

export function generatePropTextures(scene: Phaser.Scene): void {
  makeTexture(scene, 'rock', 110, 80, rock);
  makeTexture(scene, 'spikes', 110, 80, spikes);
  makeTexture(scene, 'fallenTree', 130, 140, fallenTree);
  makeTexture(scene, 'pine', 80, 150, pine);
  makeTexture(scene, 'runestone', 44, 90, runestone);

  makeTexture(scene, 'rune_ansuz', 72, 72, (c) => rune(c, GLYPHS.ansuz, RUNE_COLORS.basic, 'crystal'));
  makeTexture(scene, 'rune_kenaz', 72, 72, (c) => rune(c, GLYPHS.kenaz, RUNE_COLORS.basic, 'crystal'));
  makeTexture(scene, 'rune_tiwaz', 72, 72, (c) => rune(c, GLYPHS.tiwaz, RUNE_COLORS.basic, 'crystal'));
  makeTexture(scene, 'rune_shield', 72, 72, (c) => rune(c, GLYPHS.algiz, RUNE_COLORS.shield, 'shield'));
  makeTexture(scene, 'rune_magnet', 72, 72, (c) => rune(c, GLYPHS.fehu, RUNE_COLORS.magnet, 'magnet'));
  makeTexture(scene, 'rune_double', 72, 72, (c) => rune(c, GLYPHS.sowilo, RUNE_COLORS.double, 'sun'));
  makeTexture(scene, 'rune_flight', 72, 72, (c) => rune(c, GLYPHS.raidho, RUNE_COLORS.flight, 'wings'));
  makeTexture(scene, 'flight_wings', 180, 90, wings);

  makeTexture(scene, 'shadow', 80, 22, (c) => {
    c.fillStyle = 'rgba(10,14,24,0.55)';
    c.beginPath();
    c.ellipse(40, 11, 36, 9, 0, 0, TAU);
    c.fill();
  });
  makeTexture(scene, 'spark', 16, 16, (c) => softDot(c, 16, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)'));
  makeTexture(scene, 'flake', 8, 8, (c) => softDot(c, 8, 'rgba(255,255,255,0.95)', 'rgba(255,255,255,0)'));
  makeTexture(scene, 'shard', 10, 10, (c) => poly(c, [[1, 4], [5, 0], [9, 3], [7, 9], [2, 8]], '#d4dde8'));
  makeTexture(scene, 'aura', 128, 128, (c) => {
    softDot(c, 128, 'rgba(255,255,255,0)', 'rgba(255,255,255,0)');
    const g = c.createRadialGradient(64, 64, 30, 64, 64, 62);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.75, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
    circle(c, 64, 64, 0, '#fff');
  });
}
