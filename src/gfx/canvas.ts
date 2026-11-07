import Phaser from 'phaser';
import { TEX_SCALE } from '../config';

export type Ctx = CanvasRenderingContext2D;
export type Pt = [number, number];
export const TAU = Math.PI * 2;

/**
 * Create a texture by drawing on a canvas. w/h are in design pixels (450-wide
 * space); the canvas is rasterised at TEX_SCALE so sprites render 1:1 at z = 0.
 */
export function makeTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (c: Ctx, w: number, h: number) => void,
): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, Math.ceil(w * TEX_SCALE), Math.ceil(h * TEX_SCALE));
  if (!tex) return;
  const c = tex.getContext();
  c.save();
  c.scale(TEX_SCALE, TEX_SCALE);
  draw(c, w, h);
  c.restore();
  tex.refresh();
}

export function roundRectPath(c: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

export function box(c: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient): void {
  c.fillStyle = fill;
  roundRectPath(c, x, y, w, h, r);
  c.fill();
}

export function circle(c: Ctx, x: number, y: number, r: number, fill: string | CanvasGradient): void {
  c.fillStyle = fill;
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
}

export function poly(c: Ctx, pts: Pt[], fill?: string | CanvasGradient, stroke?: string, lineWidth = 2): void {
  c.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
  c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = lineWidth;
    c.lineJoin = 'round';
    c.stroke();
  }
}

export function polyline(c: Ctx, pts: Pt[], stroke: string, lineWidth = 2): void {
  c.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
  c.strokeStyle = stroke;
  c.lineWidth = lineWidth;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.stroke();
}

export function vGradient(c: Ctx, y0: number, y1: number, stops: Array<[number, string]>): CanvasGradient {
  const g = c.createLinearGradient(0, y0, 0, y1);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
}

export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Small deterministic PRNG so generated scenery looks the same every run. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
