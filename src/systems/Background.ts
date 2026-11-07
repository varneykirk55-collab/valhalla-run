import Phaser from 'phaser';
import { DEPTH, GAME_W, HORIZON_Y } from '../config';
import { Projection } from './Projection';

/**
 * Layered sky → aurora → distant mountains → fjord water → near cliffs → mist.
 * Layers slide sideways by different amounts as the camera follows the player,
 * which gives the parallax depth; the mist also drifts with running speed.
 */
export class Background {
  private readonly far: Phaser.GameObjects.Image;
  private readonly fjord: Phaser.GameObjects.Image;
  private readonly cliffs: Phaser.GameObjects.Image;
  private readonly mist: Phaser.GameObjects.TileSprite;
  private readonly aurora: Phaser.GameObjects.Image;
  private mistScroll = 0;

  constructor(scene: Phaser.Scene) {
    scene.add.image(0, 0, 'sky').setOrigin(0, 0).setDepth(DEPTH.sky);
    this.aurora = scene.add
      .image(GAME_W / 2, 30, 'aurora')
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.aurora)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.6);
    scene.tweens.add({ targets: this.aurora, alpha: 0.25, duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.far = scene.add.image(GAME_W / 2, 0, 'mtnFar').setOrigin(0.5, 1).setDepth(DEPTH.farMountains);
    this.fjord = scene.add.image(GAME_W / 2, 0, 'fjord').setOrigin(0.5, 1).setDepth(DEPTH.fjord);
    this.cliffs = scene.add.image(GAME_W / 2, 0, 'cliffs').setOrigin(0.5, 1).setDepth(DEPTH.cliffs);
    this.mist = scene.add.tileSprite(GAME_W / 2, 0, GAME_W, 180, 'mist').setOrigin(0.5, 1).setDepth(DEPTH.mist).setAlpha(0.9);
  }

  update(dt: number, proj: Projection, speed: number): void {
    const cam = proj.camX;
    const lift = proj.lift;
    this.mistScroll += dt * (10 + speed * 1.5);

    this.far.setPosition(GAME_W / 2 - cam * 10, HORIZON_Y - 36 + lift * 0.35);
    this.fjord.setPosition(GAME_W / 2 - cam * 14, HORIZON_Y + 8 + lift * 0.5);
    this.cliffs.setPosition(GAME_W / 2 - cam * 30, HORIZON_Y + 14 + lift * 0.6);
    this.mist.setPosition(GAME_W / 2, HORIZON_Y + 40 + lift * 0.8);
    this.mist.tilePositionX = cam * 45 + this.mistScroll;
  }
}
