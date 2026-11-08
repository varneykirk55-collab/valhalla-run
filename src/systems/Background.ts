import Phaser from 'phaser';
import { DEPTH, GAME_W, HORIZON_Y, SPEED } from '../config';
import { Projection } from './Projection';

/** One speed line: flies outward from the vanishing point along `angle`. */
interface Streak {
  angle: number;
  r: number;
}

const STREAK_COUNT = 12;

function newStreak(r = Phaser.Math.FloatBetween(20, 380)): Streak {
  // Down-left or down-right of the horizon, keeping clear of the path's centre.
  const a = Phaser.Math.FloatBetween(0.12, 0.42) * Math.PI;
  return { angle: Math.random() < 0.5 ? a : Math.PI - a, r };
}

/**
 * Layered sky → aurora → far mountains → fjord water → mid mountains → cliffs →
 * pine ridge → mist (the twilight fjord from the reference run screen).
 * Layers slide sideways by different amounts as the camera follows the player,
 * which gives the parallax depth; the mist also drifts with running speed.
 */
export class Background {
  private readonly far: Phaser.GameObjects.Image;
  private readonly mid: Phaser.GameObjects.Image;
  private readonly pines: Phaser.GameObjects.Image;
  private readonly fjord: Phaser.GameObjects.Image;
  private readonly cliffs: Phaser.GameObjects.Image;
  private readonly mist: Phaser.GameObjects.TileSprite;
  private readonly aurora: Phaser.GameObjects.Image;
  private mistScroll = 0;
  // Speed streaks: sparse radial lines whose alpha scales with run speed.
  private readonly streakGfx: Phaser.GameObjects.Graphics;
  private readonly streaks: Streak[] = [];

  constructor(scene: Phaser.Scene) {
    scene.add.image(0, 0, 'sky').setOrigin(0, 0).setDepth(DEPTH.sky);
    this.aurora = scene.add
      .image(GAME_W / 2, 40, 'aurora')
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.aurora)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.95);
    scene.tweens.add({ targets: this.aurora, alpha: 0.6, duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.far = scene.add.image(GAME_W / 2, 0, 'mtnFar').setOrigin(0.5, 1).setDepth(DEPTH.farMountains);
    this.fjord = scene.add.image(GAME_W / 2, 0, 'fjord').setOrigin(0.5, 1).setDepth(DEPTH.fjord);
    // Fractional depths slot the new layers between the existing ones without touching DEPTH.
    this.mid = scene.add.image(GAME_W / 2, 0, 'mtnMid').setOrigin(0.5, 1).setDepth(DEPTH.fjord + 0.5);
    this.cliffs = scene.add.image(GAME_W / 2, 0, 'cliffs').setOrigin(0.5, 1).setDepth(DEPTH.cliffs);
    this.pines = scene.add.image(GAME_W / 2, 0, 'pineRidge').setOrigin(0.5, 1).setDepth(DEPTH.cliffs + 0.5);
    this.mist = scene.add.tileSprite(GAME_W / 2, 0, GAME_W, 180, 'mist').setOrigin(0.5, 1).setDepth(DEPTH.mist).setAlpha(0.9);

    // Static backdrop: no sideways parallax on lane changes, no bob on jumps.
    this.far.setPosition(GAME_W / 2, HORIZON_Y - 36);
    this.fjord.setPosition(GAME_W / 2, HORIZON_Y + 8);
    this.mid.setPosition(GAME_W / 2, HORIZON_Y - 2);
    this.cliffs.setPosition(GAME_W / 2, HORIZON_Y + 14);
    this.pines.setPosition(GAME_W / 2, HORIZON_Y + 18);
    this.mist.setPosition(GAME_W / 2, HORIZON_Y + 40);
    // The ground still dips when the camera rises on a jump; this fixed strip of the
    // same snow fills the band it uncovers below the static backdrop.
    scene.add.image(0, HORIZON_Y, 'snowfield').setOrigin(0, 0).setDisplaySize(GAME_W, 140).setDepth(DEPTH.snowfield - 0.5);

    // Above the fog, below every track object.
    this.streakGfx = scene.add.graphics().setDepth(DEPTH.fog + 1).setBlendMode(Phaser.BlendModes.ADD);
    for (let i = 0; i < STREAK_COUNT; i++) this.streaks.push(newStreak());
  }

  update(dt: number, proj: Projection, speed: number): void {
    // Mountains, fjord, cliffs and pines stay put (positioned once in the constructor);
    // only the mist drifts, faster as the run speeds up.
    this.mistScroll += dt * (10 + speed * 1.5);
    this.mist.tilePositionX = this.mistScroll;
    this.drawStreaks(dt, proj, speed);
  }

  /** Speed lines: invisible at start speed, subtle but readable near max speed. */
  private drawStreaks(dt: number, proj: Projection, speed: number): void {
    const g = this.streakGfx;
    g.clear();
    const t = Phaser.Math.Clamp((speed - SPEED.start) / (SPEED.max - SPEED.start), 0, 1);
    const alpha = speed > 0 ? 0.03 + 0.22 * t : 0;
    if (alpha <= 0) return;

    const ox = GAME_W / 2 - proj.camX * 20;
    const oy = HORIZON_Y + 6 + proj.lift;
    g.lineStyle(1.5, 0xf2f6ff, alpha);
    for (const s of this.streaks) {
      s.r += dt * (60 + speed * 10) * (0.4 + s.r / 160); // accelerate outward like perspective
      const len = 8 + s.r * 0.14;
      if (s.r > 420) Object.assign(s, newStreak(Phaser.Math.FloatBetween(10, 40)));
      const cx = Math.cos(s.angle);
      const cy = Math.sin(s.angle);
      g.lineBetween(ox + cx * s.r, oy + cy * s.r * 0.6, ox + cx * (s.r + len), oy + cy * (s.r + len) * 0.6);
    }
  }
}
