import Phaser from 'phaser';
import { DEPTH } from '../config';
import { RUNE_COLORS } from '../gfx/props';
import { iconTexture, rowTexture } from '../gfx/ui';
import { RunResult } from '../types';
import { sfx } from '../audio/Sfx';
import { Modal, NorseButton } from './components';
import { UI, formatNumber, goldFill, uiText } from './theme';

export interface GameOverActions {
  onRestart: () => void;
  onMenu: () => void;
}

const W = 460;
const H = 660;

/**
 * Norse results panel: score, best, distance, runes, then RISE AGAIN (gold)
 * and MAIN MENU (blue). Space / Enter = rise again, Esc = main menu.
 * Input unlocks after a short delay so a frantic swipe can't skip it.
 */
export function showGameOver(scene: Phaser.Scene, result: RunResult, actions: GameOverActions): void {
  sfx(scene).uiFail(); // SFX: game over panel appears

  const modal = new Modal(scene, { title: 'YOU HAVE FALLEN', width: W, height: H, depth: DEPTH.overlay });
  const top = -H / 2;

  // Result rows
  const rows: Array<{ icon: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text }> = [
    {
      icon: scene.add.image(0, 0, iconTexture(scene, 'trophy', 40)),
      text: uiText(scene, 0, 0, formatNumber(result.score), 42),
    },
    {
      icon: scene.add.image(0, 0, iconTexture(scene, 'crown', 38)),
      text: uiText(scene, 0, 0, result.newBest ? 'NEW BEST!' : `BEST: ${formatNumber(result.best)}`, 28, { color: UI.gold }),
    },
    {
      icon: scene.add.image(0, 0, iconTexture(scene, 'runner', 34)),
      text: uiText(scene, 0, 0, `${formatNumber(result.distance)} m`, 30),
    },
    {
      icon: scene.add.image(0, 0, 'rune_ansuz').setScale(0.5),
      text: uiText(scene, 0, 0, formatNumber(result.runes), 30, { color: RUNE_COLORS.basic }),
    },
  ];
  if (result.newBest) goldFill(rows[1].text);

  rows.forEach((row, i) => {
    const y = top + 168 + i * 68;
    const bg = scene.add.image(0, 0, rowTexture(scene, 340, 58));
    row.icon.setPosition(-128, 0);
    row.text.setOrigin(0.5).setPosition(14, 0);
    const line = scene.add.container(0, y, [bg, row.icon, row.text]).setAlpha(0);
    modal.add(line);
    scene.tweens.add({ targets: line, alpha: 1, x: { from: -24, to: 0 }, delay: 160 + i * 90, duration: 240, ease: 'Cubic.easeOut' });
  });

  let ready = false;
  let done = false;
  const finish = (fn: () => void) => {
    if (!ready || done) return;
    done = true;
    scene.input.keyboard?.off('keydown-SPACE', rise);
    scene.input.keyboard?.off('keydown-ENTER', rise);
    scene.input.keyboard?.off('keydown-ESC', menu);
    fn();
  };
  const rise = () =>
    finish(() => {
      sfx(scene).uiConfirm(); // SFX: UI confirm (rise again)
      actions.onRestart();
    });
  const menu = () =>
    finish(() => {
      sfx(scene).uiTap(); // SFX: UI tap (main menu)
      actions.onMenu();
    });

  const riseBtn = new NorseButton(scene, 0, top + 480, {
    variant: 'gold',
    width: 360,
    height: 92,
    label: 'RISE AGAIN',
    sound: 'none', // rise() plays the confirm
    pulse: true,
    onClick: rise,
  });
  const menuBtn = new NorseButton(scene, 0, top + 586, {
    variant: 'blue',
    width: 290,
    height: 70,
    label: 'MAIN MENU',
    icon: 'home',
    sound: 'none', // menu() plays the tap
    onClick: menu,
  });
  modal.add(riseBtn, menuBtn);

  scene.time.delayedCall(550, () => {
    ready = true;
    scene.input.keyboard?.on('keydown-SPACE', rise);
    scene.input.keyboard?.on('keydown-ENTER', rise);
    scene.input.keyboard?.on('keydown-ESC', menu);
  });
}
