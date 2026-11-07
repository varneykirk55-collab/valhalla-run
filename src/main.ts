import Phaser from 'phaser';
import { GAME_H, GAME_W } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { PauseScene } from './scenes/PauseScene';
import lilitaUrl from './assets/fonts/LilitaOne-Regular.ttf';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0a1328',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_W,
    height: GAME_H,
  },
  input: { activePointers: 2 },
  render: { antialias: true },
  scene: [BootScene, MenuScene, GameScene, PauseScene],
};

/** Give the web font a moment so canvas text renders in Cinzel, not the fallback. */
async function start(): Promise<void> {
  try {
    // UI face is bundled with the game (no network needed); Cinzel still comes from Google Fonts.
    const lilita = new FontFace('Lilita One', `url(${lilitaUrl})`);
    document.fonts.add(lilita);
    await Promise.race([
      Promise.all([lilita.load(), document.fonts.load('900 48px "Cinzel"')]),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  } catch {
    // Fallback faces are fine.
  }
  new Phaser.Game(config);
}

start();
