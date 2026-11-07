import Phaser from 'phaser';
import { TrackEntity } from './TrackEntity';

export type DecorKind = 'pine' | 'runestone';

/** Non-colliding roadside scenery that sells the sense of speed. */
export class Decor extends TrackEntity {
  constructor(scene: Phaser.Scene, kind: DecorKind, laneX: number, z: number) {
    super(scene, kind, laneX, z, 0, 1);
    this.baseScale = kind === 'pine' ? Phaser.Math.FloatBetween(0.85, 1.35) : 1;
    if (Math.random() < 0.5) this.sprite.setFlipX(true);
  }
}
