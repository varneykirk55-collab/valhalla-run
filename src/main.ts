import Phaser from 'phaser';
import { Music } from './audio/Music';
import { GAME_H, GAME_W } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';

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
  // Stream the songs. Decoding every MP3 through Web Audio would expand
  // about 20 MB of music into a much larger PCM buffer.
  audio: { disableWebAudio: true },
  render: { antialias: true },
  scene: [BootScene, MenuScene, GameScene],
};

/** Give the web font a moment so canvas text renders in Cinzel, not the fallback. */
async function start(): Promise<void> {
  try {
    await Promise.race([
      document.fonts.load('900 48px "Cinzel"'),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch {
    // Fallback serif is fine.
  }
  Music.install(new Phaser.Game(config));
}

start();
