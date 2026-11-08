import Phaser from 'phaser';
import { DEPTH, GAME_H, GAME_W, HORIZON_Y } from '../config';
import { Projection } from './Projection';

/** Blue-grey cobbles with dark mortar and snowy edges (reference run screen). */
const COLORS = {
  mortar: 0x2e3654,
  stones: [0x5d6a8c, 0x68759b, 0x535f80, 0x717ea4],
  farStone: 0x5f6b8d,
  snowA: 0xe6eefb,
  snowB: 0xd3def3,
  laneLine: 0x232a44,
  // path containment: rock one step lighter than the cobbles, snow caps, frost edge
  wallFace: 0x6b78a0,
  wallFaceShade: 0x5a668e,
  wallBase: 0x3d4766,
  wallCap: 0xeef3fd,
  frost: 0xf6f9ff,
  edgeShade: 0x283050,
};

/** Low rocky ridge either side of the path. */
const WALL = { inner: 1.82, outer: 2.25, seg: 2.4, minH: 0.32, maxH: 0.6 };

const SEG = 1.2; // depth of one row of cobbles, world units
const STONE_W = 0.5; // two cobbles per lane
const DETAIL_Z = 45; // beyond this, rows are drawn as flat bands (too small to read)
const FAR = 90;
const NEAR = -2.8;

/** Stable per-stone variation, tied to world position so cobbles don't flicker. */
function hash(a: number, b: number): number {
  return (Math.imul(a, 73856093) ^ Math.imul(b + 17, 19349663)) >>> 0;
}

/** The snowy ground and the 3-lane cobbled path, redrawn each frame in perspective. */
export class Track {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly snow: Phaser.GameObjects.Image;
  private readonly fog: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.snow = scene.add
      .image(0, HORIZON_Y, 'snowfield')
      .setOrigin(0, 0)
      .setDisplaySize(GAME_W, GAME_H - HORIZON_Y + 80)
      .setDepth(DEPTH.snowfield);
    this.g = scene.add.graphics().setDepth(DEPTH.ground);
    this.fog = scene.add.image(0, HORIZON_Y - 24, 'fog').setOrigin(0, 0).setDisplaySize(GAME_W, 150).setDepth(DEPTH.fog);
  }

  draw(proj: Projection, distance: number): void {
    const top = HORIZON_Y + proj.lift;
    this.snow.y = top;
    this.fog.y = top - 30;

    const g = this.g;
    g.clear();
    const quad = (l0: number, l1: number, z0: number, z1: number, color: number, alpha = 1) => {
      g.fillStyle(color, alpha);
      g.fillPoints([proj.project(l0, z0), proj.project(l1, z0), proj.project(l1, z1), proj.project(l0, z1)], true);
    };

    // Rows scroll toward the camera; each row's look comes from its world index.
    const offset = distance % SEG;
    const base = Math.floor(distance / SEG);
    for (let i = 0; ; i++) {
      const z0 = NEAR + i * SEG - offset;
      if (z0 > FAR) break;
      const z1 = z0 + SEG;
      const row = base + i;
      const h = hash(row, 0);

      // snowy shoulders
      quad(-1.8, -1.5, z0, z1, (row & 1) === 0 ? COLORS.snowA : COLORS.snowB);
      quad(1.5, 1.8, z0, z1, (row & 1) === 0 ? COLORS.snowB : COLORS.snowA);

      if (z0 > DETAIL_Z) {
        quad(-1.5, 1.5, z0, z1, COLORS.farStone);
        continue;
      }

      quad(-1.5, 1.5, z0, z1, COLORS.mortar);
      // Running bond: every other row is offset by half a cobble.
      const shift = (row & 1) === 1 ? STONE_W / 2 : 0;
      const gapX = 0.035;
      const gapZ = 0.08;
      for (let k = -1; k < 6; k++) {
        const l0 = Math.max(-1.5, -1.5 + k * STONE_W + shift);
        const l1 = Math.min(1.5, -1.5 + (k + 1) * STONE_W + shift);
        if (l1 - l0 < 0.05) continue;
        const color = COLORS.stones[hash(row, k + 2) % COLORS.stones.length];
        quad(l0 + gapX, l1 - gapX, z0 + gapZ, z1 - gapZ, color);
      }

      // drifted snow creeping onto the path edges
      if (h % 3 === 0) quad(-1.5, -1.5 + 0.1 + (h % 7) * 0.02, z0 + 0.15, z1 - 0.1, COLORS.snowA);
      if ((h >> 3) % 3 === 0) quad(1.5 - 0.1 - ((h >> 5) % 7) * 0.02, 1.5, z0 + 0.1, z1 - 0.15, COLORS.snowA);
    }

    // Faint lane grooves keep the three lanes readable.
    for (const l of [-0.5, 0.5]) quad(l - 0.025, l + 0.025, NEAR, FAR, COLORS.laneLine, 0.3);

    // Frost berm where the cobbles meet the snow: a shaded lip on the path side, a bright edge on the snow side.
    for (const side of [-1, 1]) {
      quad(side * 1.46, side * 1.5, NEAR, FAR, COLORS.edgeShade, 0.6);
      quad(side * 1.5, side * 1.58, NEAR, FAR, COLORS.frost);
    }

    this.drawWalls(proj, distance);
  }

  /**
   * Low rocky ridges both sides, drawn far → near so nearer rock overlaps farther.
   * Heights come from the segment's world index, so the ridge line is stable as it scrolls.
   */
  private drawWalls(proj: Projection, distance: number): void {
    const g = this.g;
    const fill = (pts: Array<{ x: number; y: number }>, color: number) => {
      g.fillStyle(color, 1);
      g.fillPoints(pts, true);
    };
    const height = (k: number) => WALL.minH + ((hash(k, 99) % 1000) / 1000) * (WALL.maxH - WALL.minH);

    const offset = distance % WALL.seg;
    const base = Math.floor(distance / WALL.seg);
    const count = Math.ceil((FAR - NEAR) / WALL.seg) + 1;
    for (let i = count; i >= 0; i--) {
      const z0 = NEAR + i * WALL.seg - offset;
      const z1 = z0 + WALL.seg;
      const k = base + i;
      const h0 = height(k);
      const h1 = height(k + 1);
      const shade = (k & 1) === 0 ? COLORS.wallFace : COLORS.wallFaceShade;
      for (const side of [-1, 1]) {
        const inner = side * WALL.inner;
        const outer = side * WALL.outer;
        // face toward the path
        fill([proj.project(inner, z0, 0), proj.project(inner, z1, 0), proj.project(inner, z1, h1), proj.project(inner, z0, h0)], shade);
        // dark foot where rock meets snow
        fill([proj.project(inner, z0, 0), proj.project(inner, z1, 0), proj.project(inner, z1, 0.05), proj.project(inner, z0, 0.05)], COLORS.wallBase);
        // snow-capped top, with snow lipping over the face
        fill([proj.project(inner, z0, h0), proj.project(inner, z1, h1), proj.project(outer, z1, h1 * 0.8), proj.project(outer, z0, h0 * 0.8)], COLORS.wallCap);
        fill([proj.project(inner, z0, h0), proj.project(inner, z1, h1), proj.project(inner, z1, h1 - 0.07), proj.project(inner, z0, h0 - 0.05)], COLORS.wallCap);
      }
    }
  }
}
