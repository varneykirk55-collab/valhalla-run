import Phaser from 'phaser';
import { Music } from '../audio/Music';
import { sfx } from '../audio/Sfx';
import jumpSheet from '../assets/runner/jump.png';
import runSheet from '../assets/runner/run.png';
import slideSheet from '../assets/runner/slide.png';
import { GAME_W } from '../config';
import { generateCharacterTextures } from '../gfx/characters';
import { generatePropTextures } from '../gfx/props';
import { generateSceneryTextures } from '../gfx/scenery';
import { RUNNER } from '../runner/art';

/**
 * Scenery, obstacles and enemies are drawn procedurally. The playable runner
 * is a baked sprite loaded here — generators skip keys that already exist,
 * so the procedural viking is not drawn over these textures.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.add.rectangle(GAME_W / 2, 500, 280, 10, 0x1c2436).setOrigin(0.5);
    const fill = this.add.rectangle(GAME_W / 2 - 140, 500, 0, 10, 0xd9a441).setOrigin(0, 0.5);
    this.add
      .text(GAME_W / 2, 460, 'LOADING', {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: '#f4e7c5',
      })
      .setOrigin(0.5);
    this.load.on('progress', (amount: number) => {
      fill.width = 280 * amount;
    });

    const frameConfig = { frameWidth: RUNNER.frameWidth, frameHeight: RUNNER.frameHeight };
    this.load.spritesheet('viking_run', runSheet, frameConfig);
    this.load.spritesheet('viking_jump', jumpSheet, frameConfig);
    this.load.image('viking_slide', slideSheet);
  }

  create(): void {
    generateSceneryTextures(this);
    generateCharacterTextures(this);
    generatePropTextures(this);
    sfx(this).init();
    Music.of(this).preload();
    this.scene.start('Menu');
  }
}
