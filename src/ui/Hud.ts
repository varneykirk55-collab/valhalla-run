import Phaser from 'phaser';
import { DEPTH, FONT, GAME_W } from '../config';
import { RUNE_COLORS } from '../gfx/props';
import { POWER_KINDS, PowerUps } from '../systems/PowerUps';
import { PowerKind } from '../types';

interface PowerBar {
  icon: Phaser.GameObjects.Image;
  track: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
}

const BAR_W = 92;

export class Hud {
  private readonly score: Phaser.GameObjects.Text;
  private readonly distance: Phaser.GameObjects.Text;
  private readonly runes: Phaser.GameObjects.Text;
  private readonly bars: Record<PowerKind, PowerBar>;
  private lastRunes = -1;

  constructor(private readonly scene: Phaser.Scene) {
    const big = { fontFamily: FONT, fontSize: '42px', fontStyle: '900', color: '#f4e7c5', stroke: '#101726', strokeThickness: 7 };
    const small = { fontFamily: FONT, fontSize: '20px', fontStyle: '700', color: '#d6e2f2', stroke: '#101726', strokeThickness: 5 };

    this.score = scene.add.text(22, 16, '0', big).setDepth(DEPTH.hud);
    this.distance = scene.add.text(24, 68, '0 m', small).setDepth(DEPTH.hud);

    scene.add.image(GAME_W - 104, 42, 'rune_ansuz').setScale(0.62).setDepth(DEPTH.hud);
    this.runes = scene.add
      .text(GAME_W - 22, 22, '0', { ...big, fontSize: '34px', color: RUNE_COLORS.basic })
      .setOrigin(1, 0)
      .setDepth(DEPTH.hud);

    const bars = {} as Record<PowerKind, PowerBar>;
    POWER_KINDS.forEach((kind) => {
      const color = Phaser.Display.Color.HexStringToColor(RUNE_COLORS[kind]).color;
      const icon = scene.add.image(0, 0, `rune_${kind}`).setScale(0.5).setDepth(DEPTH.hud);
      const track = scene.add.rectangle(0, 0, BAR_W, 8, 0x101726, 0.7).setOrigin(0, 0.5).setDepth(DEPTH.hud);
      const fill = scene.add.rectangle(0, 0, BAR_W, 8, color).setOrigin(0, 0.5).setDepth(DEPTH.hud);
      bars[kind] = { icon, track, fill };
    });
    this.bars = bars;
  }

  update(score: number, distance: number, runes: number, powers: PowerUps): void {
    this.score.setText(String(score));
    this.distance.setText(`${Math.floor(distance)} m`);
    if (runes !== this.lastRunes) {
      this.runes.setText(String(runes));
      if (this.lastRunes >= 0) {
        this.scene.tweens.add({ targets: this.runes, scale: { from: 1.3, to: 1 }, duration: 160 });
      }
      this.lastRunes = runes;
    }

    // Active power-ups stack under the rune counter.
    let row = 0;
    for (const kind of POWER_KINDS) {
      const bar = this.bars[kind];
      const on = powers.active(kind);
      bar.icon.setVisible(on);
      bar.track.setVisible(on);
      bar.fill.setVisible(on);
      if (!on) continue;
      const y = 110 + row * 42;
      const x = GAME_W - 22 - BAR_W;
      const frac = powers.fraction(kind);
      bar.icon.setPosition(x - 24, y);
      bar.track.setPosition(x, y);
      bar.fill.setPosition(x, y).setScale(frac, 1);
      bar.icon.setAlpha(frac < 0.25 && Math.floor(frac * 60) % 2 === 0 ? 0.4 : 1);
      row++;
    }
  }
}
