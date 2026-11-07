import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { NorseButton, Modal } from '../ui/components';

/** Registry key: loop time of the last resume, so the same key press can't re-pause instantly. */
export const RESUMED_AT = 'resumedAt';

/**
 * Overlay launched on top of the paused Game scene. RESUME returns to the run,
 * SOUND toggles SFX, MAIN MENU abandons the run. Esc / P also resume.
 */
export class PauseScene extends Phaser.Scene {
  private leaving = false;

  constructor() {
    super('Pause');
  }

  create(): void {
    this.leaving = false;
    const modal = new Modal(this, { title: 'PAUSED', width: 420, height: 470, depth: 10 });
    const top = -470 / 2;

    const resume = new NorseButton(this, 0, top + 190, {
      variant: 'gold',
      width: 330,
      height: 88,
      label: 'RESUME',
      sound: 'confirm',
      pulse: true,
      onClick: () => this.resume(),
    });
    const sound = new NorseButton(this, 0, top + 292, {
      variant: 'blue',
      width: 290,
      height: 68,
      label: this.soundLabel(),
      icon: sfx(this).muted ? 'soundOff' : 'soundOn',
      onClick: () => {
        sfx(this).toggleMute();
        sound.setLabel(this.soundLabel()).setIcon(sfx(this).muted ? 'soundOff' : 'soundOn');
      },
    });
    const menu = new NorseButton(this, 0, top + 384, {
      variant: 'blue',
      width: 290,
      height: 68,
      label: 'MAIN MENU',
      icon: 'home',
      onClick: () => this.toMenu(),
    });
    modal.add(resume, sound, menu);

    const keyResume = () => {
      sfx(this).uiConfirm(); // SFX: UI confirm (resume via keyboard)
      this.resume();
    };
    this.input.keyboard?.on('keydown-ESC', keyResume);
    this.input.keyboard?.on('keydown-P', keyResume);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', keyResume);
      this.input.keyboard?.off('keydown-P', keyResume);
    });
  }

  private soundLabel(): string {
    return sfx(this).muted ? 'SOUND: OFF' : 'SOUND: ON';
  }

  private resume(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.registry.set(RESUMED_AT, this.game.loop.time);
    this.scene.resume('Game');
    this.scene.stop();
  }

  private toMenu(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.stop('Game');
    this.scene.start('Menu');
  }
}
