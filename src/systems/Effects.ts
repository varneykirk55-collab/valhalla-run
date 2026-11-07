import Phaser from 'phaser';
import { DEPTH, FONT, GAME_W } from '../config';

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

/** Particle bursts, floating score text and ambient snowfall. */
export class Effects {
  private readonly bursts = new Map<number, Emitter>();
  private readonly shards: Emitter;
  private readonly embers: Emitter;

  constructor(private readonly scene: Phaser.Scene) {
    this.shards = scene.add
      .particles(0, 0, 'shard', {
        speed: { min: 160, max: 440 },
        angle: { min: 200, max: 340 },
        gravityY: 900,
        rotate: { min: 0, max: 360 },
        scale: { min: 0.8, max: 1.8 },
        lifespan: 900,
        alpha: { start: 1, end: 0 },
        emitting: false,
      })
      .setDepth(DEPTH.fx);

    this.embers = scene.add
      .particles(0, 0, 'spark', {
        speed: { min: 60, max: 240 },
        lifespan: 700,
        scale: { start: 1.6, end: 0 },
        alpha: { start: 0.9, end: 0 },
        tint: [0xff6a3d, 0xffb347, 0xffffff],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(DEPTH.fx);

    scene.add
      .particles(0, 0, 'flake', {
        x: { min: -20, max: GAME_W + 20 },
        y: -10,
        lifespan: 9000,
        speedY: { min: 40, max: 110 },
        speedX: { min: -35, max: 10 },
        scale: { min: 0.5, max: 1.4 },
        alpha: { min: 0.35, max: 0.85 },
        frequency: 90,
        advance: 6000,
      })
      .setDepth(DEPTH.fx - 1);
  }

  private burst(color: number): Emitter {
    let e = this.bursts.get(color);
    if (!e) {
      e = this.scene.add
        .particles(0, 0, 'spark', {
          speed: { min: 80, max: 280 },
          lifespan: { min: 300, max: 650 },
          scale: { start: 1.3, end: 0 },
          alpha: { start: 1, end: 0 },
          tint: color,
          blendMode: Phaser.BlendModes.ADD,
          emitting: false,
        })
        .setDepth(DEPTH.fx);
      this.bursts.set(color, e);
    }
    return e;
  }

  collect(x: number, y: number, color: number, big = false): void {
    this.burst(color).explode(big ? 34 : 14, x, y);
  }

  crash(x: number, y: number): void {
    this.shards.explode(22, x, y);
    this.embers.explode(26, x, y);
  }

  smash(x: number, y: number): void {
    this.shards.explode(26, x, y);
    this.burst(0xc79bff).explode(30, x, y);
  }

  floatText(x: number, y: number, text: string, color: string, size = 26): void {
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: FONT,
        fontSize: `${size}px`,
        fontStyle: '900',
        color,
        stroke: '#101726',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.fx + 1);
    this.scene.tweens.add({
      targets: t,
      y: y - 70,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }
}
