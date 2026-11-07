import Phaser from 'phaser';
import jumpSheet from '../assets/runner/jump.png';
import runSheet from '../assets/runner/run.png';
import slideSheet from '../assets/runner/slide.png';
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
    const frameConfig = { frameWidth: RUNNER.frameWidth, frameHeight: RUNNER.frameHeight };
    this.load.spritesheet('viking_run', runSheet, frameConfig);
    this.load.spritesheet('viking_jump', jumpSheet, frameConfig);
    this.load.image('viking_slide', slideSheet);
  }

  create(): void {
    generateSceneryTextures(this);
    generateCharacterTextures(this);
    generatePropTextures(this);
    this.scene.start('Menu');
  }
}
