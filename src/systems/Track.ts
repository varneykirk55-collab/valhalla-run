import Phaser from 'phaser';
import { DEPTH, GAME_H, GAME_W, HORIZON_Y } from '../config';
import { Projection } from './Projection';

const COLORS = {
  pathA: 0x6e6259,
  pathB: 0x645850,
  stoneA: 0x9aa3ad,
  stoneB: 0x7d858f,
  laneLine: 0x3d332c,
};

const SEG = 2.4; // length of one paving band in world units
const FAR = 90;
const NEAR = -2.8;

/** The snowy ground and the 3-lane stone path, redrawn each frame in perspective. */
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

    // Paving bands scroll toward the camera; parity is tied to world position so they don't flicker.
    const offset = distance % SEG;
    const base = Math.floor(distance / SEG);
    for (let i = 0; ; i++) {
      const z0 = NEAR + i * SEG - offset;
      if (z0 > FAR) break;
      const z1 = z0 + SEG;
      const odd = ((base + i) & 1) === 1;
      quad(-1.5, 1.5, z0, z1, odd ? COLORS.pathA : COLORS.pathB);
      quad(-1.72, -1.5, z0, z1, odd ? COLORS.stoneA : COLORS.stoneB);
      quad(1.5, 1.72, z0, z1, odd ? COLORS.stoneB : COLORS.stoneA);
    }

    for (const l of [-0.5, 0.5]) quad(l - 0.03, l + 0.03, NEAR, FAR, COLORS.laneLine, 0.55);
  }
}
