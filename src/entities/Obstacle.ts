import Phaser from 'phaser';
import { depthForZ, fadeForZ } from '../config';
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

/**
 * Facing by type. 'across': the log lies across the lane, square to the run.
 * 'player' / 'none': upright, no base rotation.
 */
const FACING: Record<ObstacleKind, 'across' | 'player' | 'none'> = {
  rock: 'none',
  spikes: 'none',
  fallenTree: 'across',
  raven: 'player',
  draugr: 'player',
};
/**
 * The fallen-tree art is painted in 3/4 view: the log runs ~12.5° downhill to the
 * right, cut end facing camera-right. Counter-rotating levels it across the lane;
 * after rotation its rocks sit this far above the sprite's anchor (units at z = 0).
 */
const LOG_ART_SLOPE = Phaser.Math.DegToRad(12.5);
const LOG_SINK = 0.17;

export class Obstacle extends TrackEntity {
  readonly kind: ObstacleKind;
  readonly def: ObstacleDef;
  /** Already resolved against the player (hit or smashed) — never test again. */
  hit = false;
  private frame = 0;
  /** Draugr growls once per approach. */
  private growled = false;
  private readonly baseRotation: number;
  /** Dark ellipse that grounds the fallen log. */
  private readonly contactShadow?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, kind: ObstacleKind, lane: number, z: number) {
    super(scene, OBSTACLES[kind].frames[0], lane, z, OBSTACLES[kind].elev, OBSTACLES[kind].originY);
    this.kind = kind;
    this.def = OBSTACLES[kind];
    this.approach = this.def.approach;
    this.t = Math.random() * 2;
    if (kind === 'rock' || kind === 'spikes' || kind === 'fallenTree') this.baseScale = WINTER_SCALE[kind];

    // Level the log across the lane. In the right lane, mirror it so the cut end
    // faces the middle of the path, as it would from the camera's point of view.
    const across = FACING[kind] === 'across';
    const flip = across && lane > 0;
    this.sprite.setFlipX(flip);
    this.baseRotation = across ? (flip ? LOG_ART_SLOPE : -LOG_ART_SLOPE) : 0;
    this.sprite.setRotation(this.baseRotation);
    if (kind === 'fallenTree') {
      // Slightly darker underside, and a contact shadow so the log sits on the snow.
      this.sprite.setTint(0xffffff, 0xffffff, 0xb4bccf, 0xb4bccf);
      this.contactShadow = scene.add.image(-999, -999, 'shadow').setTint(0x0a0f22).setAlpha(0);
    }
  }

  destroy(): void {
    this.contactShadow?.destroy();
    super.destroy();
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
      this.sprite.setRotation(this.baseRotation + Math.sin(this.t * 3.5) * 0.02);
    }
    if (this.kind === 'fallenTree') bob = -LOG_SINK; // levelling lifts the rocks; set them back on the snow
    super.render(proj, bob);

    if (this.contactShadow) {
      // Offset a little toward the camera and the outside of the lane, stretched to the log's width.
      const g = proj.project(this.lane + Math.sign(this.lane) * 0.06, this.z - 0.25, 0);
      const width = this.sprite.displayWidth * 1.05;
      this.contactShadow
        .setPosition(g.x, g.y)
        .setRotation(0)
        .setDisplaySize(width, Math.max(4, width * 0.16))
        .setDepth(depthForZ(this.z) - 1)
        .setAlpha(0.7 * fadeForZ(this.z));
    }
  }
}
