import Phaser from 'phaser';
import { WINTER_SCALE } from '../gfx/props';
import { ObstacleDef, ObstacleKind } from '../types';
import { Projection } from '../systems/Projection';
import { TrackEntity } from './TrackEntity';
import { sfx } from '../audio/Sfx';

export const OBSTACLES: Record<ObstacleKind, ObstacleDef> = {
  rock: { frames: ['rock'], frameRate: 0, elev: 0, originY: 1, span: [0, 0.6], hitDepth: 0.45, approach: 0, avoid: 'jump' },
  spikes: { frames: ['spikes'], frameRate: 0, elev: 0, originY: 1, span: [0, 0.55], hitDepth: 0.4, approach: 0, avoid: 'jump' },
  // A trunk wedged across two boulders: slide under it.
  fallenTree: { frames: ['fallenTree'], frameRate: 0, elev: 0, originY: 1, span: [0.55, 1.1], hitDepth: 0.45, approach: 0, avoid: 'slide' },
  raven: { frames: ['raven0', 'raven1'], frameRate: 7, elev: 1.05, originY: 0.5, span: [0.75, 1.35], hitDepth: 0.4, approach: 4, avoid: 'slide' },
  // Two-frame shuffle, alternating slowly.
  draugr: { frames: ['draugr', 'draugr1'], frameRate: 3.5, elev: 0, originY: 1, span: [0, 1.3], hitDepth: 0.4, approach: 2.5, avoid: 'lane' },
};

export class Obstacle extends TrackEntity {
  readonly kind: ObstacleKind;
  readonly def: ObstacleDef;
  /** Already resolved against the player (hit or smashed) — never test again. */
  hit = false;
  private frame = 0;
  /** Draugr growls once per approach. */
  private growled = false;

  constructor(scene: Phaser.Scene, kind: ObstacleKind, lane: number, z: number) {
    super(scene, OBSTACLES[kind].frames[0], lane, z, OBSTACLES[kind].elev, OBSTACLES[kind].originY);
    this.kind = kind;
    this.def = OBSTACLES[kind];
    this.approach = this.def.approach;
    this.t = Math.random() * 2;
    if (kind === 'rock' || kind === 'spikes' || kind === 'fallenTree') this.baseScale = WINTER_SCALE[kind];
  }

  update(dt: number, speed: number): void {
    super.update(dt, speed);
    // SFX: draugr proximity growl, once, when it closes within ~4.5 units (only runs while alive).
    if (this.kind === 'draugr' && !this.growled && !this.hit && this.z < 4.5 && this.z > 0) {
      this.growled = true;
      sfx(this.sprite.scene).growl();
    }
  }

  render(proj: Projection): void {
    const { frames, frameRate } = this.def;
    if (frames.length > 1) {
      const f = Math.floor(this.t * frameRate) % frames.length;
      if (f !== this.frame) {
        this.frame = f;
        this.sprite.setTexture(frames[f]);
      }
    }

    let bob = 0;
    if (this.kind === 'raven') bob = Math.sin(this.t * 5) * 0.06;
    if (this.kind === 'draugr') {
      // Frames now carry the lurch; keep a small bob and only a hint of sway.
      bob = Math.abs(Math.sin(this.t * 7)) * 0.03;
      this.sprite.setRotation(Math.sin(this.t * 3.5) * 0.02);
    }
    super.render(proj, bob);
  }
}
