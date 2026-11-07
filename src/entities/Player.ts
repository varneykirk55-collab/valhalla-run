import Phaser from 'phaser';
import { DEPTH, PLAYER } from '../config';
import { Projection } from '../systems/Projection';

export class Player {
  /** Target lane (-1, 0, 1) and the smoothed lateral position used for rendering and hits. */
  lane = 0;
  x = 0;
  /** Height of the feet above ground (units) and vertical velocity. */
  h = 0;
  vh = 0;
  airborne = false;
  alive = true;
  invuln = 0;

  private slideTimer = 0;
  private slideQueued = false;
  private runClock = 0;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly aura: Phaser.GameObjects.Image;

  constructor(private readonly scene: Phaser.Scene) {
    this.shadow = scene.add.image(0, 0, 'shadow').setDepth(DEPTH.shadow);
    this.aura = scene.add
      .image(0, 0, 'aura')
      .setDepth(DEPTH.aura)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xc79bff)
      .setVisible(false);
    this.sprite = scene.add.image(0, 0, 'viking_run0').setOrigin(0.5, 1).setDepth(DEPTH.player);
  }

  get sliding(): boolean {
    return this.slideTimer > 0;
  }

  moveLeft(): void {
    if (this.lane > -1) this.lane--;
  }

  moveRight(): void {
    if (this.lane < 1) this.lane++;
  }

  jump(): void {
    if (this.airborne) return;
    this.airborne = true;
    this.vh = PLAYER.jumpVelocity;
    this.slideTimer = 0;
    this.slideQueued = false;
  }

  /** On the ground: slide. In the air: slam down and slide on landing. */
  slide(): void {
    if (this.airborne) {
      this.vh = Math.min(this.vh, PLAYER.fastFallVelocity);
      this.slideQueued = true;
    } else {
      this.slideTimer = PLAYER.slideTime;
    }
  }

  update(dt: number, speed: number): void {
    this.x += (this.lane - this.x) * Math.min(1, dt * PLAYER.laneSpeed);
    if (Math.abs(this.lane - this.x) < 0.002) this.x = this.lane;

    if (this.airborne) {
      this.vh -= PLAYER.gravity * dt;
      this.h += this.vh * dt;
      if (this.h <= 0) {
        this.h = 0;
        this.vh = 0;
        this.airborne = false;
        if (this.slideQueued) {
          this.slideQueued = false;
          this.slideTimer = PLAYER.slideTime;
        }
      }
    }
    if (this.slideTimer > 0) this.slideTimer -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    this.runClock += dt * 9 * (speed / 13);
  }

  /** Vertical hitbox [bottom, top] in units. */
  span(): [number, number] {
    return [this.h, this.h + (this.sliding ? PLAYER.slideHeight : PLAYER.standHeight)];
  }

  render(proj: Projection, shieldOn: boolean): void {
    const ground = proj.project(this.x, 0, 0);
    this.shadow
      .setPosition(ground.x, ground.y)
      .setScale(Math.max(0.45, 1 - this.h * 0.3))
      .setAlpha(Math.max(0.15, 0.6 - this.h * 0.2));

    if (!this.alive) return; // crash tween owns the sprite now

    const p = proj.project(this.x, 0, this.h);
    let key = 'viking_run0';
    if (this.airborne) key = 'viking_jump';
    else if (this.sliding) key = 'viking_slide';
    else if (Math.floor(this.runClock) % 2 === 1) key = 'viking_run1';
    if (this.sprite.texture.key !== key) this.sprite.setTexture(key);

    const bob = !this.airborne && !this.sliding ? -Math.abs(Math.sin(this.runClock * Math.PI)) * 4 : 0;
    this.sprite
      .setPosition(p.x, p.y + bob)
      .setRotation((this.lane - this.x) * 0.3)
      .setScale(1, this.vh > 0 ? 1.05 : 1)
      .setAlpha(this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0 ? 0.35 : 1);

    this.aura.setVisible(shieldOn);
    if (shieldOn) {
      const pulse = 1.05 + Math.sin(this.runClock * 0.8) * 0.06;
      this.aura.setPosition(p.x, p.y - (this.sliding ? 40 : 66)).setScale(pulse);
    }
  }

  /** Death animation: knocked back and tumbling. */
  crash(): { x: number; y: number } {
    this.alive = false;
    this.aura.setVisible(false);
    this.sprite.setTint(0xff9a8a).setAlpha(1);
    const x = this.sprite.x;
    const y = this.sprite.y;
    this.scene.tweens.add({
      targets: this.sprite,
      angle: Phaser.Math.Between(0, 1) ? 82 : -82,
      y: y + 18,
      duration: 480,
      ease: 'Quad.easeOut',
    });
    return { x, y: y - 50 };
  }
}
