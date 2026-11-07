import Phaser from 'phaser';
import { Ctx, Pt, makeTexture, poly, polyline, seeded, vGradient } from './canvas';

function sky(c: Ctx, w: number, h: number): void {
  c.fillStyle = vGradient(c, 0, h, [
    [0, '#0a1328'],
    [0.42, '#1f3459'],
    [0.75, '#5d7299'],
    [1, '#cdbfcb'],
  ]);
  c.fillRect(0, 0, w, h);
  const r = seeded(7);
  for (let i = 0; i < 90; i++) {
    const big = r() < 0.1;
    c.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.6})`;
    c.fillRect(r() * w, r() * h * 0.5, big ? 1.6 : 1, big ? 1.6 : 1);
  }
}

function aurora(c: Ctx, w: number): void {
  c.globalCompositeOperation = 'lighter';
  const bands = [
    { y: 62, a: 22, f: 0.018, col: '80,255,170' },
    { y: 86, a: 16, f: 0.026, col: '70,200,255' },
    { y: 50, a: 12, f: 0.034, col: '150,120,255' },
  ];
  for (const b of bands) {
    for (let x = 0; x <= w; x += 3) {
      const edge = Math.min(1, x / 80, (w - x) / 80);
      const y = b.y + Math.sin(x * b.f + b.y) * b.a;
      const g = c.createLinearGradient(x, y - 44, x, y + 26);
      g.addColorStop(0, `rgba(${b.col},0)`);
      g.addColorStop(0.72, `rgba(${b.col},${0.2 * edge})`);
      g.addColorStop(1, `rgba(${b.col},0)`);
      c.fillStyle = g;
      c.fillRect(x, y - 44, 3, 70);
    }
  }
}

function farMountains(c: Ctx, w: number, h: number): void {
  const ridged = (v: number) => 1 - Math.abs(v);
  const ridge = (x: number) =>
    h - (55 + 55 * ridged(Math.sin(x * 0.011 + 0.6)) + 28 * ridged(Math.sin(x * 0.027 + 2.1)) + 8 * Math.sin(x * 0.09));
  c.beginPath();
  c.moveTo(0, h);
  for (let x = 0; x <= w; x += 3) c.lineTo(x, ridge(x));
  c.lineTo(w, h);
  c.closePath();
  c.fillStyle = vGradient(c, 40, h, [[0, '#8ea3c4'], [1, '#4d6286']]);
  c.fill();
  c.save();
  c.clip();
  c.fillStyle = 'rgba(240,246,255,0.92)';
  c.beginPath();
  c.moveTo(0, 0);
  for (let x = 0; x <= w; x += 3) c.lineTo(x, 96 + Math.sin(x * 0.21) * 5 + Math.sin(x * 0.07) * 6);
  c.lineTo(w, 0);
  c.closePath();
  c.fill();
  c.fillStyle = vGradient(c, 110, h, [[0, 'rgba(200,212,230,0)'], [1, 'rgba(200,212,230,0.7)']]);
  c.fillRect(0, 110, w, h - 110);
  c.restore();
}

function fjord(c: Ctx, w: number, h: number): void {
  c.fillStyle = vGradient(c, 0, h, [[0, '#6f8fb0'], [0.35, '#3f6286'], [1, '#1d3450']]);
  c.fillRect(0, 0, w, h);
  const r = seeded(21);
  for (let i = 0; i < 40; i++) {
    const y = 4 + r() * (h - 8);
    const x = r() * w;
    c.fillStyle = `rgba(220,235,255,${0.08 + r() * 0.14})`;
    c.fillRect(x, y, 10 + r() * 50, 1);
  }
}

function cliffs(c: Ctx, w: number, h: number): void {
  const left: Pt[] = [[0, 24], [22, 8], [48, 20], [70, 14], [96, 46], [118, 60], [140, 96], [168, 120], [196, 150], [222, 178], [246, 206], [262, 220]];
  const right: Pt[] = left.map(([x, y]) => [w - x, Math.max(0, y + 6)] as Pt);
  const r = seeded(5);
  for (const top of [left, right]) {
    const edgeX = top === left ? 0 : w;
    poly(c, [[edgeX, h], ...top, [top[top.length - 1][0], h]], vGradient(c, 0, h, [[0, '#2b394e'], [1, '#111823']]));
    polyline(c, top.slice(0, -2), 'rgba(235,242,252,0.8)', 3);
    // snow patches and pine silhouettes on the slope
    for (let i = 0; i < top.length - 2; i++) {
      const [x0, y0] = top[i];
      const [x1, y1] = top[i + 1];
      for (let k = 0; k < 2; k++) {
        const t = r();
        const x = x0 + (x1 - x0) * t;
        const y = y0 + (y1 - y0) * t + 12 + r() * 30;
        if (r() < 0.5) {
          poly(c, [[x - 6, y + 8], [x, y - 8], [x + 6, y + 8]], '#0d141e');
        } else {
          poly(c, [[x - 10, y], [x - 2, y - 3], [x + 9, y + 1], [x + 1, y + 3]], 'rgba(230,238,248,0.35)');
        }
      }
    }
  }
}

function mist(c: Ctx, w: number, h: number): void {
  const r = seeded(13);
  for (let i = 0; i < 26; i++) {
    const x = r() * w;
    const y = 50 + r() * (h - 70);
    const rad = 40 + r() * 60;
    for (const ox of [-w, 0, w]) {
      const g = c.createRadialGradient(x + ox, y, 0, x + ox, y, rad);
      g.addColorStop(0, 'rgba(235,240,250,0.16)');
      g.addColorStop(1, 'rgba(235,240,250,0)');
      c.fillStyle = g;
      c.fillRect(x + ox - rad, y - rad, rad * 2, rad * 2);
    }
  }
}

export function generateSceneryTextures(scene: Phaser.Scene): void {
  makeTexture(scene, 'sky', 450, 380, sky);
  makeTexture(scene, 'aurora', 450, 170, (c, w) => aurora(c, w));
  makeTexture(scene, 'mtnFar', 600, 190, farMountains);
  makeTexture(scene, 'fjord', 450, 60, fjord);
  makeTexture(scene, 'cliffs', 540, 220, cliffs);
  makeTexture(scene, 'mist', 900, 150, mist);
  makeTexture(scene, 'fog', 8, 140, (c, w, h) => {
    c.fillStyle = vGradient(c, 0, h, [
      [0, 'rgba(206,214,229,0)'],
      [0.22, 'rgba(206,214,229,0.95)'],
      [0.5, 'rgba(206,214,229,0.7)'],
      [1, 'rgba(206,214,229,0)'],
    ]);
    c.fillRect(0, 0, w, h);
  });
  makeTexture(scene, 'snowfield', 8, 520, (c, w, h) => {
    c.fillStyle = vGradient(c, 0, h, [[0, '#c3cfdf'], [0.3, '#e6edf5'], [1, '#f3f7fb']]);
    c.fillRect(0, 0, w, h);
  });
}
