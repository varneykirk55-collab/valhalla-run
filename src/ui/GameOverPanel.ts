import Phaser from 'phaser';
import { DEPTH, FONT, GAME_H, GAME_W } from '../config';
import { RunResult } from '../types';
import { sfx } from '../audio/Sfx';

/** "You have fallen" card. Tap / Space / Enter restarts after a short lockout. */
export function showGameOver(scene: Phaser.Scene, result: RunResult, onRestart: () => void): void {
  sfx(scene).uiFail(); // SFX: game over panel appears
  const cx = GAME_W / 2;
  const cy = GAME_H / 2 - 20;
  const items: Phaser.GameObjects.GameObject[] = [];
  const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    items.push(o);
    return o;
  };

  add(scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x070b16, 0.6).setOrigin(0).setDepth(DEPTH.overlay));

  const panel = add(scene.add.graphics().setDepth(DEPTH.overlay));
  panel.fillStyle(0x141c2e, 0.94);
  panel.fillRoundedRect(cx - 200, cy - 210, 400, 420, 22);
  panel.lineStyle(3, 0xd9a441, 0.9);
  panel.strokeRoundedRect(cx - 200, cy - 210, 400, 420, 22);
  panel.lineStyle(1, 0xd9a441, 0.35);
  panel.strokeRoundedRect(cx - 190, cy - 200, 380, 400, 16);

  const text = (y: number, str: string, size: number, color: string, weight = '700') =>
    add(
      scene.add
        .text(cx, y, str, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: weight, color, stroke: '#070b16', strokeThickness: 4 })
        .setOrigin(0.5)
        .setDepth(DEPTH.overlay + 1),
    );

  text(cy - 160, 'YOU HAVE FALLEN', 32, '#e8664f', '900');
  text(cy - 92, String(result.score), 64, '#f4e7c5', '900');
  text(cy - 46, result.newBest ? '★ NEW BEST ★' : `BEST  ${result.best}`, 20, result.newBest ? '#ffd257' : '#9fb0c8');
  text(cy + 10, `${Math.floor(result.distance)} m   ·   ${result.runes} runes`, 22, '#d6e2f2');

  const prompt = text(cy + 120, 'TAP TO RISE AGAIN', 26, '#5ef2ff', '900');
  scene.tweens.add({ targets: prompt, alpha: 0.35, duration: 650, yoyo: true, repeat: -1 });

  items.forEach((o) => {
    const t = o as unknown as Phaser.GameObjects.Components.Alpha;
    if (o !== prompt) t.setAlpha(0);
  });
  scene.tweens.add({ targets: items.filter((o) => o !== prompt), alpha: 1, duration: 300 });

  let done = false;
  const restart = () => {
    if (done) return;
    done = true;
    sfx(scene).uiConfirm(); // SFX: UI confirm (play again)
    scene.input.off('pointerup', restart);
    scene.input.keyboard?.off('keydown-SPACE', restart);
    scene.input.keyboard?.off('keydown-ENTER', restart);
    onRestart();
  };
  scene.time.delayedCall(550, () => {
    scene.input.once('pointerup', restart);
    scene.input.keyboard?.once('keydown-SPACE', restart);
    scene.input.keyboard?.once('keydown-ENTER', restart);
  });
}
