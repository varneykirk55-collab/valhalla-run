import Phaser from 'phaser';
import { Music } from '../audio/Music';
import { DEPTH, GAME_W } from '../config';
import { RUNNER } from '../runner/art';
import { sfx } from '../audio/Sfx';
import { Decor } from '../entities/Decor';
import { RUNE_COLORS } from '../gfx/props';
import { Background } from '../systems/Background';
import { POWER_LABELS } from '../systems/PowerUps';
import { Projection } from '../systems/Projection';
import { loadBest } from '../systems/Storage';
import { Track } from '../systems/Track';
import { iconTexture, logoTexture } from '../gfx/ui';
import { HudPill, Modal, NorseButton } from '../ui/components';
import { UI, formatNumber, goldFill, uiText } from '../ui/theme';

export class MenuScene extends Phaser.Scene {
  private proj!: Projection;
  private background!: Background;
  private track!: Track;
  private hero!: Phaser.GameObjects.Image;
  private decor: Decor[] = [];
  private drift = 0;
  /** The open Settings / How to Play panel, if any. */
  private modal?: Modal;
  private starting = false;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.starting = false;
    this.drift = 0;
    this.modal = undefined;
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

    // Darken the top so the logo reads over the aurora.
    const shade = this.add.graphics().setDepth(DEPTH.hud - 1);
    shade.fillGradientStyle(0x070b16, 0x070b16, 0x070b16, 0x070b16, 0.7, 0.7, 0, 0);
    shade.fillRect(0, 0, GAME_W, 380);

    this.buildLogo();
    this.buildMenu();

    // Music (merged from the music branch): pointerdown is a user gesture, so the
    // title theme can start; the RUN tap then switches to the run playlist.
    this.input.on('pointerdown', () => {
      if (!this.starting) Music.of(this).playMenu();
    });

    // Keyboard: Space / Enter start the run (ignored while a panel is open).
    const keyStart = () => !this.modal && this.begin();
    this.input.keyboard?.on('keydown-SPACE', keyStart);
    this.input.keyboard?.on('keydown-ENTER', keyStart);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-SPACE', keyStart);
      this.input.keyboard?.off('keydown-ENTER', keyStart);
    });
  }

  // ---- Norse UI ----------------------------------------------------------------

  /** Crest with crossed axes and the VALHALLA RUN wordmark; floats gently, side runes glow. */
  private buildLogo(): void {
    const cx = GAME_W / 2;
    const plate = this.add.image(0, 0, logoTexture(this)).setOrigin(0.5, 0);
    const word = goldFill(uiText(this, 0, 150, 'VALHALLA', 64, { stroke: '#1c1206', strokeThickness: 10 }).setOrigin(0.5));
    const run = goldFill(uiText(this, 0, 226, 'RUN', 92, { stroke: '#1c1206', strokeThickness: 12 }).setOrigin(0.5));
    const glows = [-1, 1].map((side) =>
      this.add
        .image(side * 131, 178, 'spark')
        .setDisplaySize(64, 90)
        .setTint(0x5ef2ff)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.25),
    );
    const logo = this.add.container(cx, 26, [...glows, plate, word, run]).setDepth(DEPTH.hud);
    this.tweens.add({ targets: glows, alpha: 0.7, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: logo, y: 32, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private buildMenu(): void {
    const cx = GAME_W / 2;
    const best = loadBest();
    const crown = this.add.image(0, 0, iconTexture(this, 'crown', 34));
    const bestPill = new HudPill(this, cx, 362, 250, crown, UI.gold).setDepth(DEPTH.hud);
    bestPill.value.setText(best > 0 ? `BEST ${formatNumber(best)}` : 'BEST —');

    new NorseButton(this, cx, 454, {
      variant: 'gold',
      width: 380,
      height: 100,
      label: 'RUN',
      fontSize: 54,
      sound: 'none', // begin() plays the confirm
      pulse: true,
      onClick: () => this.begin(),
    }).setDepth(DEPTH.hud);

    new NorseButton(this, cx, 550, {
      variant: 'blue',
      width: 330,
      height: 72,
      label: 'SETTINGS',
      icon: 'gear',
      onClick: () => this.openSettings(),
    }).setDepth(DEPTH.hud);

    new NorseButton(this, cx, 634, {
      variant: 'blue',
      width: 330,
      height: 72,
      label: 'HOW TO PLAY',
      icon: 'book',
      onClick: () => this.openHowTo(),
    }).setDepth(DEPTH.hud);
  }

  private openSettings(): void {
    if (this.modal) return;
    const H = 400;
    const top = -H / 2;
    const modal = new Modal(this, { title: 'SETTINGS', width: 420, height: H, depth: DEPTH.overlay, onClose: () => (this.modal = undefined) });
    const soundLabel = () => (sfx(this).muted ? 'SOUND: OFF' : 'SOUND: ON');
    const sound = new NorseButton(this, 0, top + 180, {
      variant: 'blue',
      width: 300,
      height: 70,
      label: soundLabel(),
      icon: sfx(this).muted ? 'soundOff' : 'soundOn',
      onClick: () => {
        sfx(this).toggleMute();
        sound.setLabel(soundLabel()).setIcon(sfx(this).muted ? 'soundOff' : 'soundOn');
      },
    });
    const hint = uiText(this, 0, top + 250, 'Desktop: press M to mute', 18, { color: UI.muted }).setOrigin(0.5);
    const done = new NorseButton(this, 0, top + 326, {
      variant: 'gold',
      width: 240,
      height: 76,
      label: 'DONE',
      sound: 'confirm',
      onClick: () => modal.close(),
    });
    modal.add(sound, hint, done);
    this.modal = modal;
  }

  private openHowTo(): void {
    if (this.modal) return;
    const H = 720;
    const top = -H / 2;
    const modal = new Modal(this, { title: 'HOW TO PLAY', width: 470, height: H, depth: DEPTH.overlay, onClose: () => (this.modal = undefined) });
    const left = -190;
    const label = (y: number, str: string) => uiText(this, left, top + y, str, 20, { color: UI.gold, align: 'left' }).setOrigin(0, 0.5);
    const line = (y: number, str: string, color: string = UI.cream, size = 19) =>
      uiText(this, left, top + y, str, size, { color, align: 'left', strokeThickness: 3 }).setOrigin(0, 0.5);

    const items: Phaser.GameObjects.GameObject[] = [
      label(136, 'CONTROLS'),
      line(168, 'Swipe left / right: change lane'),
      line(196, 'Swipe up: jump   ·   Swipe down: slide'),
      line(224, 'Keys: arrows / WASD / space   ·   Esc: pause', UI.muted, 16),
      label(268, 'DANGERS'),
      line(300, 'Jump over rocks and ice spikes'),
      line(328, 'Slide under fallen trees and ravens'),
      line(356, 'Change lane to dodge the draugr'),
      label(400, 'RUNES'),
    ];
    const runes: Array<[string, string, string]> = [
      ['rune_ansuz', 'Rune: +10 score', RUNE_COLORS.basic],
      ['rune_shield', `${POWER_LABELS.shield}: blocks one hit`, RUNE_COLORS.shield],
      ['rune_magnet', `${POWER_LABELS.magnet}: pulls runes in`, RUNE_COLORS.magnet],
      ['rune_double', POWER_LABELS.double, RUNE_COLORS.double],
    ];
    runes.forEach(([key, text, color], i) => {
      const y = 444 + i * 48;
      items.push(this.add.image(left + 20, top + y, key).setScale(0.5));
      items.push(line(y, text, color, 19).setX(left + 50));
    });
    items.push(
      new NorseButton(this, 0, top + 660, {
        variant: 'gold',
        width: 240,
        height: 76,
        label: 'GOT IT',
        sound: 'confirm',
        onClick: () => modal.close(),
      }),
    );
    modal.add(...items);
    this.modal = modal;
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
