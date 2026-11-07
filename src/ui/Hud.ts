import Phaser from 'phaser';
import { DEPTH, GAME_W } from '../config';
import { RUNE_COLORS } from '../gfx/props';
import { iconTexture, pauseButtonTexture, powerBackTexture } from '../gfx/ui';
import { sfx } from '../audio/Sfx';
import { POWER_KINDS, PowerUps } from '../systems/PowerUps';
import { PowerKind } from '../types';
import { HudPill } from './components';
import { SAFE, formatNumber, hexColor } from './theme';

interface PowerRing {
  root: Phaser.GameObjects.Container;
  arc: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Image;
  color: number;
}

const PILL_H = 54;
const PAUSE = 60;
const RING = 72;
const RING_R = 30;

/**
 * Norse HUD. Top-left: score (trophy) and distance (runner). Top-right: rune
 * count and pause. Active power-ups sit under the right cluster as circular
 * timers driven by PowerUps.fraction(), leaving the centre of the screen clear.
 */
export class Hud {
  private readonly score: HudPill;
  private readonly distance: HudPill;
  private readonly runes: HudPill;
  private readonly pause: Phaser.GameObjects.Image;
  private readonly rings: Record<PowerKind, PowerRing>;
  private lastRunes = -1;
  private lastScore = '';
  private lastDistance = '';

  constructor(scene: Phaser.Scene, onPause: () => void) {
    const rowY = SAFE.top + PILL_H / 2;

    // Top-left counters
    const trophy = scene.add.image(0, 0, iconTexture(scene, 'trophy', 34));
    this.score = new HudPill(scene, SAFE.side + 110, rowY, 220, trophy).setDepth(DEPTH.hud);
    const runner = scene.add.image(0, 0, iconTexture(scene, 'runner', 32));
    this.distance = new HudPill(scene, SAFE.side + 110, rowY + PILL_H + 8, 220, runner).setDepth(DEPTH.hud);

    // Top-right: pause button (art is padded, so the touch target is 72px) and rune counter
    const pauseX = GAME_W - SAFE.side - PAUSE / 2 - 2;
    this.pause = scene.add
      .image(pauseX, rowY, pauseButtonTexture(scene, PAUSE))
      .setDepth(DEPTH.hud)
      .setInteractive({ useHandCursor: true });
    this.pause.on('pointerdown', () => this.pause.setScale(0.92));
    this.pause.on('pointerout', () => this.pause.setScale(1));
    this.pause.on('pointerup', () => {
      this.pause.setScale(1);
      sfx(scene).uiTap(); // SFX: UI tap (pause)
      onPause();
    });

    const crystal = scene.add.image(0, 0, 'rune_ansuz').setScale(0.46);
    this.runes = new HudPill(scene, pauseX - PAUSE / 2 - 12 - 75, rowY, 150, crystal, RUNE_COLORS.basic).setDepth(DEPTH.hud);

    // Power-up timer rings (positioned each frame, right-aligned, only when active)
    const rings = {} as Record<PowerKind, PowerRing>;
    for (const kind of POWER_KINDS) {
      const back = scene.add.image(0, 0, powerBackTexture(scene, RING));
      const arc = scene.add.graphics();
      const icon = scene.add.image(0, 0, `rune_${kind}`).setScale(0.68);
      const root = scene.add.container(0, 0, [back, arc, icon]).setDepth(DEPTH.hud).setVisible(false);
      rings[kind] = { root, arc, icon, color: hexColor(RUNE_COLORS[kind]) };
    }
    this.rings = rings;
  }

  /** Hide the pause button once the run is over. */
  setPauseVisible(on: boolean): void {
    this.pause.setVisible(on);
    if (on) this.pause.setInteractive();
    else this.pause.disableInteractive();
  }

  update(score: number, distance: number, runes: number, powers: PowerUps): void {
    const s = formatNumber(score);
    if (s !== this.lastScore) {
      this.score.value.setText(s);
      this.lastScore = s;
    }
    const d = `${formatNumber(distance)} m`;
    if (d !== this.lastDistance) {
      this.distance.value.setText(d);
      this.lastDistance = d;
    }
    if (runes !== this.lastRunes) {
      this.runes.value.setText(formatNumber(runes));
      if (this.lastRunes >= 0) this.runes.pop();
      this.lastRunes = runes;
    }

    // Power-up rings: the arc is the real remaining time.
    let slot = 0;
    const rightX = this.pause.x;
    const y = SAFE.top + PILL_H + 8 + PILL_H / 2 + 14;
    for (const kind of POWER_KINDS) {
      const ring = this.rings[kind];
      const on = powers.active(kind);
      ring.root.setVisible(on);
      if (!on) continue;
      ring.root.setPosition(rightX - slot * (RING + 8), y);
      slot++;

      const frac = powers.fraction(kind);
      const end = -Math.PI / 2 + Math.PI * 2 * frac;
      ring.arc.clear();
      ring.arc.lineStyle(9, ring.color, 0.28);
      ring.arc.beginPath();
      ring.arc.arc(0, 0, RING_R, -Math.PI / 2, end, false);
      ring.arc.strokePath();
      ring.arc.lineStyle(4, ring.color, 1);
      ring.arc.beginPath();
      ring.arc.arc(0, 0, RING_R, -Math.PI / 2, end, false);
      ring.arc.strokePath();
      ring.arc.fillStyle(0xffffff, 1);
      ring.arc.fillCircle(Math.cos(end) * RING_R, Math.sin(end) * RING_R, 3);

      // Last quarter: the rune flickers as a warning.
      ring.icon.setAlpha(frac < 0.25 && Math.floor(frac * 80) % 2 === 0 ? 0.45 : 1);
    }
  }
}

