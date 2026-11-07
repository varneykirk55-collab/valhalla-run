import Phaser from 'phaser';
import { generateCharacterTextures } from '../gfx/characters';
import { generatePropTextures } from '../gfx/props';
import { generateSceneryTextures } from '../gfx/scenery';

/**
 * All art is generated procedurally at boot, so the prototype has zero asset
 * files. Swap any key for a real sprite later by loading it in preload()
 * with the same key — the generators skip keys that already exist.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    generateSceneryTextures(this);
    generateCharacterTextures(this);
    generatePropTextures(this);
    this.scene.start('Menu');
  }
}
