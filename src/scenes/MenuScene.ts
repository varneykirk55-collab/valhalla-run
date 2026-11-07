import Phaser from 'phaser';
import { Music } from '../audio/Music';
import { sfx } from '../audio/Sfx';
import { DEPTH, FONT, GAME_H, GAME_W } from '../config';
import { RUNNER } from '../runner/art';
import { Decor } from '../entities/Decor';
import { RUNE_COLORS } from '../gfx/props';
import { Background } from '../systems/Background';
import { POWER_KINDS, POWER_LABELS } from '../systems/PowerUps';
import { Projection } from '../systems/Projection';
import { loadBest } from '../systems/Storage';
import { Track } from '../systems/Track';

export class MenuScene extends Phaser.Scene {
  private proj!: Projection;
  private background!: Background;
  private track!: Track;
  private hero!: Phaser.GameObjects.Image;
  private decor: Decor[] = [];
  private drift = 0;
  private starting = false;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.starting = false;
    this.drift = 0;
    this.proj = new Projection();
    this.background = new Background(this);
    this.track = new Track(this);
    this.decor = [];
    for (let z = 2; z < 70; z += 3.2) {
      this.decor.push(new Decor(this, 'pine', (z % 2 > 1 ? -1 : 1) * Phaser.Math.FloatBetween(2.3, 4), z));
    }

    const ground = this.proj.project(0, 0, 0);
    this.add.image(ground.x, ground.y, 'shadow').setDepth(DEPTH.shadow).setAlpha(0.55);
    this.hero = this.add
      .image(ground.x, ground.y, 'viking_run', 0)
      .setOrigin(RUNNER.originX, RUNNER.originY)
      .setScale(RUNNER.scale)
      .setDepth(DEPTH.player);

    // Darken the top so the title reads over the aurora.
    const shade = this.add.graphics().setDepth(DEPTH.hud - 1);
    shade.fillGradientStyle(0x070b16, 0x070b16, 0x070b16, 0x070b16, 0.75, 0.75, 0, 0);
    shade.fillRect(0, 0, GAME_W, 420);

    const cx = GAME_W / 2;
    const title = (y: number, str: string, size: number, color: string) =>
      this.add
        .text(cx, y, str, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: '900', color, stroke: '#070b16', strokeThickness: 8 })
        .setOrigin(0.5)
        .setDepth(DEPTH.hud);

    title(118, 'VALHALLA', 68, '#f4e7c5').setShadow(0, 0, '#d9a441', 18, true, true);
    title(184, 'DASH', 54, '#d9a441');
    title(236, 'Outrun Ragnarök', 22, '#c9d6e8').setStroke('#070b16', 5);

    // Controls & power-up legend on a translucent card
    const card = this.add.graphics().setDepth(DEPTH.hud);
    card.fillStyle(0x0d1424, 0.72);
    card.fillRoundedRect(cx - 220, 520, 440, 250, 18);
    card.lineStyle(2, 0xd9a441, 0.6);
    card.strokeRoundedRect(cx - 220, 520, 440, 250, 18);

    const body = { fontFamily: FONT, fontSize: '18px', fontStyle: '700', color: '#d6e2f2' };
    this.add.text(cx, 548, 'Swipe ← →  lanes   ·   ↑ jump   ·   ↓ slide', body).setOrigin(0.5).setDepth(DEPTH.hud);
    this.add
      .text(cx, 576, 'Keys: arrows / WASD / space', { ...body, fontSize: '15px', color: '#8fa1bb' })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    POWER_KINDS.forEach((kind, i) => {
      const y = 628 + i * 46;
      this.add.image(cx - 150, y, `rune_${kind}`).setScale(0.55).setDepth(DEPTH.hud);
      this.add
        .text(cx - 118, y, POWER_LABELS[kind], { ...body, color: RUNE_COLORS[kind] })
        .setOrigin(0, 0.5)
        .setDepth(DEPTH.hud);
    });

    const prompt = title(462, 'TAP TO BEGIN', 34, '#5ef2ff').setStroke('#070b16', 6);
    this.tweens.add({ targets: prompt, alpha: 0.35, scale: 0.96, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const best = loadBest();
    if (best > 0) {
      this.add
        .text(cx, GAME_H - 34, `BEST  ${best}`, { ...body, fontSize: '20px', color: '#d9a441' })
        .setOrigin(0.5)
        .setDepth(DEPTH.hud);
    }

    // pointerdown is a user gesture, so the title theme can start before
    // the matching pointerup leaves for the run.
    this.input.on('pointerdown', () => {
      if (!this.starting) Music.of(this).playMenu();
    });
    this.input.once('pointerup', () => this.begin());
    this.input.keyboard?.once('keydown', () => this.begin());
  }

  private begin(): void {
    if (this.starting) return;
    this.starting = true;
    sfx(this).uiConfirm();
    Music.of(this).playRun();
    this.cameras.main.fadeOut(260, 10, 19, 40);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Game'));
  }

  update(_t: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    // A slow jog in place keeps the title screen alive.
    this.drift += dt * 5;
    for (const d of this.decor) {
      d.update(dt, 5);
      if (d.z < -3) d.z += 70;
      d.render(this.proj);
    }
    this.background.update(dt, this.proj, 3);
    this.track.draw(this.proj, this.drift);
    // A slow jog: drift advances at 5 units/second (see above).
    const frame = Math.floor(this.drift * 1.5) % RUNNER.runFrames;
    if (this.hero.frame.name !== String(frame)) this.hero.setTexture('viking_run', frame);
  }
}
