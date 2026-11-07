import Phaser from 'phaser';
import { Ctx, Pt, TAU, rgba } from './canvas';
import { GLYPHS } from './props';

/**
 * Procedural Norse UI art: bevelled gold frames, navy faces, cyan rune accents,
 * knotwork. Drawn 1:1 in game pixels (no TEX_SCALE) and generated lazily per
 * size, so each texture is built once and reused.
 */

function makeUi(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: Ctx) => void): string {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, Math.ceil(w), Math.ceil(h));
  if (!tex) return key;
  draw(tex.getContext());
  tex.refresh();
  return key;
}

function grad(c: Ctx, y0: number, y1: number, stops: Array<[number, string]>): CanvasGradient {
  const g = c.createLinearGradient(0, y0, 0, y1);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
}

const GOLD_RIM: Array<[number, string]> = [[0, '#fff3be'], [0.35, '#f0c060'], [0.7, '#c98d2c'], [1, '#8a5714']];
const GOLD_FACE: Array<[number, string]> = [[0, '#ffe39a'], [0.45, '#efb64b'], [1, '#b8781f']];
const NAVY_FACE: Array<[number, string]> = [[0, '#22314f'], [1, '#0f1727']];

// ---- Shapes ----------------------------------------------------------------------

/** Long hexagon with pointed ends (buttons, HUD pills). */
function hexPath(c: Ctx, x: number, y: number, w: number, h: number, point: number): void {
  c.beginPath();
  c.moveTo(x + point, y);
  c.lineTo(x + w - point, y);
  c.lineTo(x + w, y + h / 2);
  c.lineTo(x + w - point, y + h);
  c.lineTo(x + point, y + h);
  c.lineTo(x, y + h / 2);
  c.closePath();
}

/** Rectangle with chamfered corners (panels, pause button). */
function chamferPath(c: Ctx, x: number, y: number, w: number, h: number, cut: number): void {
  c.beginPath();
  c.moveTo(x + cut, y);
  c.lineTo(x + w - cut, y);
  c.lineTo(x + w, y + cut);
  c.lineTo(x + w, y + h - cut);
  c.lineTo(x + w - cut, y + h);
  c.lineTo(x + cut, y + h);
  c.lineTo(x, y + h - cut);
  c.lineTo(x, y + cut);
  c.closePath();
}

type PathFn = (inset: number) => void;

/** Shared bevel: drop shadow + dark outline, gold rim, face, gloss, fine inner lines. */
function bevel(c: Ctx, path: PathFn, top: number, bottom: number, face: Array<[number, string]>, rim: number, gloss: number): void {
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.6)';
  c.shadowBlur = 10;
  c.shadowOffsetY = 4;
  path(0);
  c.fillStyle = '#2a1a06';
  c.fill();
  c.restore();

  path(1.5);
  c.fillStyle = grad(c, top, bottom, GOLD_RIM);
  c.fill();

  path(rim);
  c.fillStyle = grad(c, top + rim, bottom - rim, face);
  c.fill();

  c.save();
  path(rim);
  c.clip();
  c.fillStyle = `rgba(255,255,255,${gloss})`;
  c.fillRect(0, top, 4000, (bottom - top) * 0.42);
  c.restore();

  path(rim);
  c.strokeStyle = 'rgba(0,0,0,0.45)';
  c.lineWidth = 1.5;
  c.stroke();
  path(3);
  c.strokeStyle = 'rgba(255,248,215,0.55)';
  c.lineWidth = 1;
  c.stroke();
}

function withGlow(c: Ctx, color: string, blur: number, draw: () => void): void {
  c.save();
  c.shadowColor = color;
  c.shadowBlur = blur;
  draw();
  c.restore();
}

function stroke(c: Ctx, pts: Pt[], color: string, width: number): void {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.stroke();
}

/** Glowing cyan chevron pointing left (dir -1) or right (dir 1). */
function chevron(c: Ctx, x: number, y: number, size: number, dir: -1 | 1): void {
  withGlow(c, '#5ef2ff', 6, () =>
    stroke(c, [[x - dir * size * 0.35, y - size * 0.5], [x + dir * size * 0.35, y], [x - dir * size * 0.35, y + size * 0.5]], '#7ff6ff', 3),
  );
}

/** A rune glyph from the game's Futhark set, glowing cyan. */
function runeGlyph(c: Ctx, name: keyof typeof GLYPHS, x: number, y: number, w: number, h: number, width = 3.2): void {
  const strokes = GLYPHS[name].map((s) => s.map(([gx, gy]) => [x + gx * w, y + gy * h] as Pt));
  withGlow(c, '#5ef2ff', 9, () => strokes.forEach((s) => stroke(c, s, '#6ff4ff', width)));
  strokes.forEach((s) => stroke(c, s, 'rgba(235,255,255,0.9)', width * 0.35));
}

/** Interlaced figure-eight knot ornament, carved in gold. */
function knot(c: Ctx, cx: number, cy: number, s: number): void {
  const loop = () => {
    c.beginPath();
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * TAU;
      const x = cx + Math.sin(t) * 30 * s;
      const y = cy + Math.sin(t) * Math.cos(t) * 26 * s;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.moveTo(cx + 9 * s, cy - 9 * s);
    c.arc(cx, cy - 9 * s, 9 * s, 0, TAU);
  };
  c.lineCap = 'round';
  c.lineJoin = 'round';
  loop();
  c.strokeStyle = '#2a1a06';
  c.lineWidth = 9 * s;
  c.stroke();
  loop();
  c.strokeStyle = grad(c, cy - 22 * s, cy + 14 * s, GOLD_RIM);
  c.lineWidth = 5 * s;
  c.stroke();
  loop();
  c.strokeStyle = 'rgba(255,250,220,0.5)';
  c.lineWidth = 1.2 * s;
  c.stroke();
}

// ---- Buttons & pills -----------------------------------------------------------

export type ButtonVariant = 'gold' | 'blue';

/** Hex button: gold (primary, with cyan runes at the ends) or navy (secondary, with chevrons). */
export function buttonTexture(scene: Phaser.Scene, variant: ButtonVariant, w: number, h: number): string {
  const pad = 8;
  return makeUi(scene, `ui_btn_${variant}_${w}x${h}`, w + pad * 2, h + pad * 2, (c) => {
    const point = h * 0.34;
    const path: PathFn = (i) => hexPath(c, pad + i, pad + i, w - i * 2, h - i * 2, point - i * 0.4);
    if (variant === 'gold') {
      bevel(c, path, pad, pad + h, GOLD_FACE, 6, 0.28);
      // inner engraved line
      path(11);
      c.strokeStyle = 'rgba(110,64,10,0.55)';
      c.lineWidth = 2;
      c.stroke();
      const gh = h * 0.46;
      runeGlyph(c, 'sowilo', pad + point * 0.55, pad + (h - gh) / 2, gh * 0.55, gh, Math.max(2.6, h * 0.04));
      runeGlyph(c, 'sowilo', pad + w - point * 0.55 - gh * 0.55, pad + (h - gh) / 2, gh * 0.55, gh, Math.max(2.6, h * 0.04));
    } else {
      bevel(c, path, pad, pad + h, NAVY_FACE, 4.5, 0.08);
      chevron(c, pad + point * 0.62, pad + h / 2, h * 0.34, -1);
      chevron(c, pad + w - point * 0.62, pad + h / 2, h * 0.34, 1);
    }
  });
}

/** HUD counter pill: slim gold rim, translucent navy face, tiny chevrons. */
export function pillTexture(scene: Phaser.Scene, w: number, h: number): string {
  const pad = 6;
  return makeUi(scene, `ui_pill_${w}x${h}`, w + pad * 2, h + pad * 2, (c) => {
    const path: PathFn = (i) => hexPath(c, pad + i, pad + i, w - i * 2, h - i * 2, h * 0.3 - i * 0.4);
    bevel(c, path, pad, pad + h, [[0, 'rgba(30,44,72,0.94)'], [1, 'rgba(12,19,33,0.94)']], 3.5, 0.06);
    chevron(c, pad + h * 0.2, pad + h / 2, h * 0.26, -1);
    chevron(c, pad + w - h * 0.2, pad + h / 2, h * 0.26, 1);
  });
}

/** Square chamfered icon button (pause). */
export function iconButtonTexture(scene: Phaser.Scene, key: string, size: number, icon: (c: Ctx, cx: number, cy: number, s: number) => void): string {
  const pad = 6;
  return makeUi(scene, key, size + pad * 2, size + pad * 2, (c) => {
    const path: PathFn = (i) => chamferPath(c, pad + i, pad + i, size - i * 2, size - i * 2, size * 0.18 - i * 0.4);
    bevel(c, path, pad, pad + size, NAVY_FACE, 4, 0.08);
    icon(c, pad + size / 2, pad + size / 2, size);
  });
}

// ---- Panels ------------------------------------------------------------------

/** Results / modal panel with double gold border, knotwork top and bottom, cyan side runes. */
export function panelTexture(scene: Phaser.Scene, w: number, h: number): string {
  const padX = 8;
  const padY = 34; // room for the knots overhanging the frame
  return makeUi(scene, `ui_panel_${w}x${h}`, w + padX * 2, h + padY * 2, (c) => {
    const cut = 26;
    const path: PathFn = (i) => chamferPath(c, padX + i, padY + i, w - i * 2, h - i * 2, cut - i * 0.4);
    bevel(c, path, padY, padY + h, [[0, 'rgba(28,40,64,0.97)'], [1, 'rgba(10,16,28,0.97)']], 7, 0.04);
    // second, inner gold line
    path(13);
    c.strokeStyle = rgba('#e2a943', 0.55);
    c.lineWidth = 1.5;
    c.stroke();
    // soft inner vignette
    c.save();
    path(7);
    c.clip();
    const v = c.createRadialGradient(padX + w / 2, padY + h * 0.4, w * 0.1, padX + w / 2, padY + h * 0.4, w * 0.8);
    v.addColorStop(0, 'rgba(70,110,160,0.10)');
    v.addColorStop(1, 'rgba(0,0,0,0.35)');
    c.fillStyle = v;
    c.fillRect(0, 0, w + padX * 2, h + padY * 2);
    c.restore();
    // side runes
    const gy = padY + h * 0.3;
    runeGlyph(c, 'kenaz', padX + 18, gy, 18, 34);
    runeGlyph(c, 'algiz', padX + 16, gy + 48, 22, 34);
    runeGlyph(c, 'ansuz', padX + w - 36, gy, 20, 34);
    runeGlyph(c, 'tiwaz', padX + w - 38, gy + 48, 22, 34);
    // knotwork caps
    knot(c, padX + w / 2, padY + 4, 0.85);
    knot(c, padX + w / 2, padY + h - 2, 0.85);
  });
}

/** Thin gold rule with a knot in the middle. */
export function dividerTexture(scene: Phaser.Scene, w: number): string {
  return makeUi(scene, `ui_divider_${w}`, w, 34, (c) => {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(242,194,90,0)');
    g.addColorStop(0.3, 'rgba(242,194,90,0.95)');
    g.addColorStop(0.7, 'rgba(242,194,90,0.95)');
    g.addColorStop(1, 'rgba(242,194,90,0)');
    c.fillStyle = g;
    c.fillRect(0, 16, w / 2 - 34, 2.5);
    c.fillRect(w / 2 + 34, 16, w / 2 - 34, 2.5);
    knot(c, w / 2, 19, 0.55);
  });
}

/** Dark rounded row that holds one result line. */
export function rowTexture(scene: Phaser.Scene, w: number, h: number): string {
  return makeUi(scene, `ui_row_${w}x${h}`, w, h, (c) => {
    const r = h / 2;
    c.beginPath();
    c.moveTo(r, 0);
    c.arcTo(w, 0, w, h, r);
    c.arcTo(w, h, 0, h, r);
    c.arcTo(0, h, 0, 0, r);
    c.arcTo(0, 0, w, 0, r);
    c.closePath();
    c.fillStyle = 'rgba(5,9,18,0.72)';
    c.fill();
    c.strokeStyle = 'rgba(120,160,210,0.14)';
    c.lineWidth = 1.5;
    c.stroke();
  });
}

/** Disc behind a power-up timer ring. */
export function powerBackTexture(scene: Phaser.Scene, size: number): string {
  return makeUi(scene, `ui_power_bg_${size}`, size, size, (c) => {
    const r = size / 2;
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.6)';
    c.shadowBlur = 8;
    c.shadowOffsetY = 3;
    c.beginPath();
    c.arc(r, r, r - 6, 0, TAU);
    c.fillStyle = grad(c, 6, size - 6, [[0, '#1e2c47'], [1, '#0a111f']]);
    c.fill();
    c.restore();
    c.beginPath();
    c.arc(r, r, r - 6, 0, TAU);
    c.strokeStyle = grad(c, 6, size - 6, GOLD_RIM);
    c.lineWidth = 2.5;
    c.stroke();
    c.beginPath();
    c.arc(r, r, r - 11, 0, TAU);
    c.strokeStyle = 'rgba(255,255,255,0.08)';
    c.lineWidth = 5;
    c.stroke();
  });
}

// ---- Logo -------------------------------------------------------------------------

function axe(c: Ctx, x: number, y: number, angle: number, flip: boolean): void {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  if (flip) c.scale(-1, 1);
  // haft
  c.fillStyle = grad(c, -10, 150, [[0, '#7a4a26'], [1, '#4a2a14']]);
  c.strokeStyle = '#1e1007';
  c.lineWidth = 3;
  c.beginPath();
  c.rect(-6, -10, 12, 160);
  c.fill();
  c.stroke();
  for (const wy of [92, 104, 116]) {
    c.fillStyle = '#c99a4a';
    c.fillRect(-7, wy, 14, 5);
  }
  // crescent blade
  c.beginPath();
  c.moveTo(4, -6);
  c.quadraticCurveTo(40, -10, 62, -46);
  c.quadraticCurveTo(80, 6, 64, 58);
  c.quadraticCurveTo(42, 26, 4, 30);
  c.closePath();
  const bg = c.createLinearGradient(0, -40, 70, 50);
  bg.addColorStop(0, '#e8f2ff');
  bg.addColorStop(0.45, '#8fa9c9');
  bg.addColorStop(1, '#3d5068');
  c.fillStyle = bg;
  c.fill();
  c.strokeStyle = '#141c28';
  c.lineWidth = 4;
  c.stroke();
  // honed edge
  c.beginPath();
  c.moveTo(62, -40);
  c.quadraticCurveTo(76, 6, 62, 52);
  c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.lineWidth = 3;
  c.stroke();
  c.restore();
}

/** Crest behind the VALHALLA RUN wordmark: crossed axes, gold-rimmed badge, runes, knot. */
export function logoTexture(scene: Phaser.Scene): string {
  const W = 500;
  const H = 330;
  return makeUi(scene, 'ui_logo_plate', W, H, (c) => {
    // Crossed axes behind the crest, blades showing above its shoulders.
    axe(c, 122, 52, -0.42, true);
    axe(c, W - 122, 52, 0.42, false);

    const plate: Pt[] = [[34, 112], [150, 100], [250, 60], [350, 100], [466, 112], [434, 214], [332, 240], [250, 304], [168, 240], [66, 214]];
    const trace = () => {
      c.beginPath();
      plate.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
    };
    c.lineJoin = 'round';
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.65)';
    c.shadowBlur = 16;
    c.shadowOffsetY = 6;
    trace();
    c.fillStyle = '#2a1a06';
    c.fill();
    c.restore();
    trace();
    c.strokeStyle = '#2a1a06';
    c.lineWidth = 22;
    c.stroke();
    trace();
    c.strokeStyle = grad(c, 60, 304, GOLD_RIM);
    c.lineWidth = 14;
    c.stroke();
    trace();
    c.fillStyle = grad(c, 60, 304, [[0, '#24365a'], [0.6, '#131e33'], [1, '#0b1221']]);
    c.fill();
    trace();
    c.strokeStyle = 'rgba(255,245,210,0.6)';
    c.lineWidth = 1.5;
    c.stroke();
    // top gem
    c.save();
    c.shadowColor = '#5ef2ff';
    c.shadowBlur = 12;
    c.beginPath();
    c.moveTo(250, 72);
    c.lineTo(262, 86);
    c.lineTo(250, 100);
    c.lineTo(238, 86);
    c.closePath();
    c.fillStyle = '#7ff6ff';
    c.fill();
    c.restore();

    runeGlyph(c, 'algiz', 86, 156, 26, 44, 3.6);
    runeGlyph(c, 'algiz', W - 112, 156, 26, 44, 3.6);
    knot(c, 250, 282, 0.95);
  });
}

// ---- Icons ---------------------------------------------------------------------------

type IconDraw = (c: Ctx, s: number) => void;

const ICONS = {
  trophy: (c, s) => {
    const g = grad(c, s * 0.12, s * 0.9, [[0, '#fff2b5'], [0.5, '#f2bf4f'], [1, '#a86c18']]);
    c.lineJoin = 'round';
    c.strokeStyle = '#3a2306';
    c.lineWidth = s * 0.05;
    // handles
    c.beginPath();
    c.arc(s * 0.24, s * 0.34, s * 0.12, Math.PI * 0.5, Math.PI * 1.5);
    c.arc(s * 0.76, s * 0.34, s * 0.12, Math.PI * 1.5, Math.PI * 0.5);
    c.strokeStyle = '#d8a238';
    c.lineWidth = s * 0.07;
    c.stroke();
    // cup
    c.beginPath();
    c.moveTo(s * 0.24, s * 0.14);
    c.lineTo(s * 0.76, s * 0.14);
    c.quadraticCurveTo(s * 0.76, s * 0.58, s * 0.5, s * 0.62);
    c.quadraticCurveTo(s * 0.24, s * 0.58, s * 0.24, s * 0.14);
    c.closePath();
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = '#3a2306';
    c.lineWidth = s * 0.04;
    c.stroke();
    c.fillStyle = g;
    c.fillRect(s * 0.45, s * 0.6, s * 0.1, s * 0.14);
    c.beginPath();
    c.rect(s * 0.3, s * 0.74, s * 0.4, s * 0.12);
    c.fill();
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.fillRect(s * 0.32, s * 0.18, s * 0.06, s * 0.26);
  },
  crown: (c, s) => {
    c.beginPath();
    c.moveTo(s * 0.12, s * 0.78);
    c.lineTo(s * 0.1, s * 0.3);
    c.lineTo(s * 0.32, s * 0.5);
    c.lineTo(s * 0.5, s * 0.18);
    c.lineTo(s * 0.68, s * 0.5);
    c.lineTo(s * 0.9, s * 0.3);
    c.lineTo(s * 0.88, s * 0.78);
    c.closePath();
    c.fillStyle = grad(c, s * 0.18, s * 0.8, [[0, '#fff2b5'], [0.5, '#f2bf4f'], [1, '#a86c18']]);
    c.fill();
    c.strokeStyle = '#3a2306';
    c.lineWidth = s * 0.045;
    c.lineJoin = 'round';
    c.stroke();
    for (const [x, y] of [[0.1, 0.28], [0.5, 0.16], [0.9, 0.28]]) {
      c.beginPath();
      c.arc(s * x, s * y, s * 0.06, 0, TAU);
      c.fillStyle = '#fff2b5';
      c.fill();
      c.stroke();
    }
    c.fillStyle = '#5ef2ff';
    c.beginPath();
    c.arc(s * 0.5, s * 0.64, s * 0.06, 0, TAU);
    c.fill();
  },
  runner: (c, s) => {
    const col = '#7ff6ff';
    withGlow(c, '#5ef2ff', 5, () => {
      c.fillStyle = col;
      c.beginPath();
      c.arc(s * 0.6, s * 0.16, s * 0.1, 0, TAU);
      c.fill();
      const w = s * 0.11;
      stroke(c, [[s * 0.55, s * 0.3], [s * 0.45, s * 0.56]], col, w); // torso
      stroke(c, [[s * 0.53, s * 0.34], [s * 0.72, s * 0.46], [s * 0.86, s * 0.38]], col, w * 0.8); // front arm
      stroke(c, [[s * 0.52, s * 0.34], [s * 0.32, s * 0.38], [s * 0.2, s * 0.5]], col, w * 0.8); // back arm
      stroke(c, [[s * 0.45, s * 0.56], [s * 0.64, s * 0.68], [s * 0.6, s * 0.9]], col, w); // front leg
      stroke(c, [[s * 0.45, s * 0.56], [s * 0.3, s * 0.72], [s * 0.1, s * 0.74]], col, w); // back leg
    });
  },
  gear: (c, s) => {
    const cx = s / 2;
    const cy = s / 2;
    withGlow(c, '#5ef2ff', 5, () => {
      c.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        const r = i % 2 === 0 ? s * 0.44 : s * 0.33;
        const a2 = ((i + 1) / 16) * TAU;
        c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        c.lineTo(cx + Math.cos(a2) * r, cy + Math.sin(a2) * r);
      }
      c.closePath();
      c.fillStyle = '#7ff6ff';
      c.fill();
    });
    c.beginPath();
    c.arc(cx, cy, s * 0.14, 0, TAU);
    c.fillStyle = '#111a2c';
    c.fill();
  },
  book: (c, s) => {
    withGlow(c, '#5ef2ff', 5, () => {
      c.strokeStyle = '#7ff6ff';
      c.lineWidth = s * 0.08;
      c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(s * 0.5, s * 0.26);
      c.quadraticCurveTo(s * 0.3, s * 0.14, s * 0.08, s * 0.2);
      c.lineTo(s * 0.08, s * 0.8);
      c.quadraticCurveTo(s * 0.3, s * 0.74, s * 0.5, s * 0.86);
      c.quadraticCurveTo(s * 0.7, s * 0.74, s * 0.92, s * 0.8);
      c.lineTo(s * 0.92, s * 0.2);
      c.quadraticCurveTo(s * 0.7, s * 0.14, s * 0.5, s * 0.26);
      c.lineTo(s * 0.5, s * 0.86);
      c.stroke();
    });
  },
  home: (c, s) => {
    withGlow(c, '#5ef2ff', 5, () => {
      c.fillStyle = '#7ff6ff';
      c.beginPath();
      c.moveTo(s * 0.5, s * 0.1);
      c.lineTo(s * 0.92, s * 0.48);
      c.lineTo(s * 0.8, s * 0.48);
      c.lineTo(s * 0.8, s * 0.88);
      c.lineTo(s * 0.6, s * 0.88);
      c.lineTo(s * 0.6, s * 0.64);
      c.lineTo(s * 0.4, s * 0.64);
      c.lineTo(s * 0.4, s * 0.88);
      c.lineTo(s * 0.2, s * 0.88);
      c.lineTo(s * 0.2, s * 0.48);
      c.lineTo(s * 0.08, s * 0.48);
      c.closePath();
      c.fill();
    });
  },
  soundOn: (c, s) => speaker(c, s, true),
  soundOff: (c, s) => speaker(c, s, false),
  play: (c, s) => {
    withGlow(c, '#5ef2ff', 6, () => {
      c.fillStyle = '#7ff6ff';
      c.beginPath();
      c.moveTo(s * 0.28, s * 0.16);
      c.lineTo(s * 0.84, s * 0.5);
      c.lineTo(s * 0.28, s * 0.84);
      c.closePath();
      c.fill();
    });
  },
} satisfies Record<string, IconDraw>;

function speaker(c: Ctx, s: number, on: boolean): void {
  withGlow(c, '#5ef2ff', 5, () => {
    c.fillStyle = '#7ff6ff';
    c.beginPath();
    c.moveTo(s * 0.1, s * 0.38);
    c.lineTo(s * 0.28, s * 0.38);
    c.lineTo(s * 0.5, s * 0.16);
    c.lineTo(s * 0.5, s * 0.84);
    c.lineTo(s * 0.28, s * 0.62);
    c.lineTo(s * 0.1, s * 0.62);
    c.closePath();
    c.fill();
    if (on) {
      c.strokeStyle = '#7ff6ff';
      c.lineWidth = s * 0.07;
      c.lineCap = 'round';
      for (const r of [0.18, 0.32]) {
        c.beginPath();
        c.arc(s * 0.5, s * 0.5, s * r, -0.8, 0.8);
        c.stroke();
      }
    } else {
      stroke(c, [[s * 0.62, s * 0.36], [s * 0.88, s * 0.64]], '#ff8a8a', s * 0.08);
      stroke(c, [[s * 0.88, s * 0.36], [s * 0.62, s * 0.64]], '#ff8a8a', s * 0.08);
    }
  });
}

export type IconName = keyof typeof ICONS;

/** Icon texture key at a given pixel size, e.g. icon(scene, 'trophy', 40). */
export function iconTexture(scene: Phaser.Scene, name: IconName, size: number): string {
  return makeUi(scene, `ui_icon_${name}_${size}`, size, size, (c) => ICONS[name](c, size));
}

/** Pause glyph for the HUD button. */
export function pauseButtonTexture(scene: Phaser.Scene, size: number): string {
  return iconButtonTexture(scene, `ui_btn_pause_${size}`, size, (c, cx, cy, s) => {
    withGlow(c, '#5ef2ff', 8, () => {
      c.fillStyle = '#7ff6ff';
      c.fillRect(cx - s * 0.2, cy - s * 0.22, s * 0.13, s * 0.44);
      c.fillRect(cx + s * 0.07, cy - s * 0.22, s * 0.13, s * 0.44);
    });
  });
}
