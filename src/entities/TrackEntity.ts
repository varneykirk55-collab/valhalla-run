import Phaser from 'phaser';
import { depthForZ, fadeForZ } from '../config';
import { Projection } from '../systems/Projection';

/** Anything that lives on the track: it has a lane, a depth (z) and a height. */
export abstract class TrackEntity {
  lane: number;
  z: number;
  /** z on the previous frame — collisions test the swept interval so nothing tunnels at high speed. */
  prevZ: number;
  elev: number;
  /** Extra speed toward the player on top of the world scroll. */
  approach = 0;
  baseScale = 1;
  t = 0;
  dead = false;
  readonly sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, texture: string, lane: number, z: number, elev: number, originY: number) {
    this.lane = lane;
    this.z = z;
    this.prevZ = z;
    this.elev = elev;
    this.sprite = scene.add.image(-999, -999, texture).setOrigin(0.5, originY).setAlpha(0);
  }

  update(dt: number, speed: number): void {
    this.prevZ = this.z;
    this.z -= (speed + this.approach) * dt;
    this.t += dt;
  }

  render(proj: Projection, elevOffset = 0, scaleX = 1): void {
    const p = proj.project(this.lane, this.z, this.elev + elevOffset);
    this.sprite
      .setPosition(p.x, p.y)
      .setScale(p.s * this.baseScale * scaleX, p.s * this.baseScale)
      .setDepth(depthForZ(this.z))
      .setAlpha(fadeForZ(this.z));
  }

  destroy(): void {
    if (this.dead) return;
    this.dead = true;
    this.sprite.destroy();
  }
}
