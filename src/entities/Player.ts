import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { DEPTH, PLAYER, SPEED } from '../config';
import { RUNNER } from '../runner/art';
import { STRIDE_EVENT } from '../systems/Effects';
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
  /** Flight power-up: cruising above every obstacle. */
  flying = false;

  private slideTimer = 0;
  private slideQueued = false;
  private runClock = 0;
  /** Seconds of run-cycle playback, scaled with forward speed. */
  private animTime = 0;
  /** Seconds since leaving the ground. Drives the jump sheet. */
  private jumpTime = 0;
  /** Half-cycle index of the run; a change means a foot just planted (drives snow puffs). */
  private lastStride = -1;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly aura: Phaser.GameObjects.Image;
  private readonly wings: Phaser.GameObjects.Image;

  constructor(private readonly scene: Phaser.Scene) {
    this.shadow = scene.add.image(0, 0, 'shadow').setDepth(DEPTH.shadow);
    this.aura = scene.add
      .image(0, 0, 'aura')
      .setDepth(DEPTH.aura)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xc79bff)
      .setVisible(false);
    this.wings = scene.add.image(0, 0, 'flight_wings').setDepth(DEPTH.player - 0.5).setVisible(false);
    this.sprite = scene.add
      .image(0, 0, 'viking_run', 0)
      .setOrigin(RUNNER.originX, RUNNER.originY)
      .setScale(RUNNER.scale)
      .setDepth(DEPTH.player);
  }

  get sliding(): boolean {
    return this.slideTimer > 0;
  }

  moveLeft(): void {
    if (this.lane > -1) {
      this.lane--;
      sfx(this.scene).lane(-1); // SFX: lane change
    }
  }

  moveRight(): void {
    if (this.lane < 1) {
      this.lane++;
      sfx(this.scene).lane(1); // SFX: lane change
    }
  }

  jump(): void {
    if (this.airborne) return;
    this.airborne = true;
    this.vh = PLAYER.jumpVelocity;
    this.jumpTime = 0;
    this.slideTimer = 0;
    this.slideQueued = false;
    sfx(this.scene).jump(); // SFX: jump
  }

  /** Start or end flight. Ending drops the runner back down with a short grace period. */
  setFlying(on: boolean): void {
    if (on === this.flying || !this.alive) return;
    this.flying = on;
    if (on) {
      this.airborne = true;
      this.vh = 0;
      this.slideTimer = 0;
      this.slideQueued = false;
      sfx(this.scene).jump(); // SFX: take-off
    } else {
      this.vh = 0;
      this.invuln = Math.max(this.invuln, PLAYER.flightLandingGrace);
    }
  }

  /** On the ground: slide. In the air: slam down and slide on landing. */
  slide(): void {
    if (this.flying) return;
    if (this.airborne) {
      this.vh = Math.min(this.vh, PLAYER.fastFallVelocity);
      this.slideQueued = true;
    } else {
      if (!this.sliding) sfx(this.scene).slide(); // SFX: slide start (not on re-swipe mid-slide)
      this.slideTimer = PLAYER.slideTime;
    }
  }

  update(dt: number, speed: number): void {
    this.x += (this.lane - this.x) * Math.min(1, dt * PLAYER.laneSpeed);
    if (Math.abs(this.lane - this.x) < 0.002) this.x = this.lane;

    if (this.flying) {
      this.h += (PLAYER.flightHeight - this.h) * Math.min(1, dt * PLAYER.flightClimb);
    } else if (this.airborne) {
      this.vh -= PLAYER.gravity * dt;
      this.h += this.vh * dt;
      if (this.h <= 0) {
        this.h = 0;
        this.vh = 0;
        this.airborne = false;
        sfx(this.scene).land(); // SFX: land
        if (this.slideQueued) {
          this.slideQueued = false;
          this.slideTimer = PLAYER.slideTime;
          sfx(this.scene).slide(); // SFX: slide start (queued slam-slide)
        }
      }
    }
    if (this.slideTimer > 0) this.slideTimer -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    const rate = speed / SPEED.start;
    this.runClock += dt * 9 * rate;
    this.animTime += dt * rate;
    if (this.airborne) this.jumpTime += dt;
    else this.jumpTime = 0;
  }

  /** Run, jump, or slide frame. Jump playback follows airtime, not the clip's own hop. */
  private pose(): { key: string; frame?: number } {
    if (this.flying) return { key: 'viking_jump', frame: Math.floor(RUNNER.jumpFrames / 2) };
    if (this.airborne) {
      const airtime = (2 * PLAYER.jumpVelocity) / PLAYER.gravity;
      let u = Math.min(0.999, this.jumpTime / airtime);
      if (this.vh < 0) u = Math.max(u, 0.5);
      return {
        key: 'viking_jump',
        frame: Math.min(RUNNER.jumpFrames - 1, Math.floor(u * RUNNER.jumpFrames)),
      };
    }
    if (this.sliding) {
      // Play the 8-frame slide once across the slide window (source clip is 1.53s).
      const u = 1 - this.slideTimer / PLAYER.slideTime;
      const frame = Math.min(RUNNER.slideFrames - 1, Math.max(0, Math.floor(u * RUNNER.slideFrames)));
      return { key: 'viking_slide', frame };
    }
    const frame = Math.floor((this.animTime / RUNNER.runCycle) * RUNNER.runFrames) % RUNNER.runFrames;
    return { key: 'viking_run', frame };
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

    // Foot snow puffs: emit once per foot plant (two per run cycle), only while running on the ground.
    const stride = Math.floor((this.animTime / RUNNER.runCycle) * 2);
    if (stride !== this.lastStride) {
      this.lastStride = stride;
      if (!this.airborne && !this.sliding) this.scene.events.emit(STRIDE_EVENT, ground.x, ground.y);
    }

    const p = proj.project(this.x, 0, this.h);
    const pose = this.pose();
    const frameName = pose.frame == null ? undefined : String(pose.frame);
    if (this.sprite.texture.key !== pose.key || (frameName != null && this.sprite.frame.name !== frameName)) {
      this.sprite.setTexture(pose.key, pose.frame);
    }

    // The baked run already bounces. Keep the feet planted on the ground anchor.
    // Slide frames are framed wider, so they use a larger scale to match the run.
    this.sprite
      .setPosition(p.x, p.y)
      .setRotation((this.lane - this.x) * 0.25)
      .setScale(this.sliding ? RUNNER.slideScale : RUNNER.scale)
      .setAlpha(this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0 ? 0.35 : 1);

    this.wings.setVisible(this.flying);
    if (this.flying) {
      const body = this.sprite.displayHeight * this.sprite.originY;
      const flap = 1 + Math.sin(this.runClock * 0.9) * 0.18;
      this.wings.setPosition(p.x, p.y - body * 0.6).setScale(1.4, 1.4 * flap);
    }

    this.aura.setVisible(shieldOn);
    if (shieldOn) {
      const pulse = 1.05 + Math.sin(this.runClock * 0.8) * 0.06;
      const body = this.sprite.displayHeight * this.sprite.originY;
      this.aura.setPosition(p.x, p.y - body * (this.sliding ? 0.32 : 0.5)).setScale(pulse * (this.sliding ? 0.82 : 1));
    }
  }

  /** Death animation: knocked back and tumbling. */
  crash(): { x: number; y: number } {
    this.alive = false;
    this.aura.setVisible(false);
    this.wings.setVisible(false);
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
