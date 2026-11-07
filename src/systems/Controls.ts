import Phaser from 'phaser';
import { SWIPE_THRESHOLD } from '../config';
import { Action } from '../types';

const KEYMAP: Record<string, Action> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
  ArrowDown: 'slide',
  KeyS: 'slide',
};

/**
 * Turns swipes and key presses into game actions. A swipe fires as soon as the
 * finger travels past the threshold (no waiting for release), which keeps lane
 * changes feeling instant on phones.
 */
export class Controls {
  private start: { x: number; y: number; id: number } | null = null;
  private fired = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onAction: (action: Action) => void,
  ) {
    const input = scene.input;
    input.on('pointerdown', this.onDown, this);
    input.on('pointermove', this.onMove, this);
    input.on('pointerup', this.onUp, this);
    input.on('pointerupoutside', this.onUp, this);
    input.keyboard?.on('keydown', this.onKey, this);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      input.off('pointerdown', this.onDown, this);
      input.off('pointermove', this.onMove, this);
      input.off('pointerup', this.onUp, this);
      input.off('pointerupoutside', this.onUp, this);
      input.keyboard?.off('keydown', this.onKey, this);
    });
  }

  private onDown(p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[] = []): void {
    // Presses on UI (pause button) are not swipes.
    if (over.length > 0) {
      this.start = null;
      return;
    }
    this.start = { x: p.x, y: p.y, id: p.id };
    this.fired = false;
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!p.isDown) return;
    this.evaluate(p, SWIPE_THRESHOLD);
  }

  private onUp(p: Phaser.Input.Pointer): void {
    // A very quick flick may only report down + up: accept a shorter distance here.
    this.evaluate(p, SWIPE_THRESHOLD * 0.6);
    this.start = null;
  }

  private evaluate(p: Phaser.Input.Pointer, threshold: number): void {
    if (!this.start || this.fired || p.id !== this.start.id) return;
    const dx = p.x - this.start.x;
    const dy = p.y - this.start.y;
    if (Math.hypot(dx, dy) < threshold) return;
    this.fired = true;
    if (Math.abs(dx) > Math.abs(dy)) this.onAction(dx < 0 ? 'left' : 'right');
    else this.onAction(dy < 0 ? 'jump' : 'slide');
  }

  private onKey(e: KeyboardEvent): void {
    if (e.repeat) return;
    const action = KEYMAP[e.code];
    if (action) this.onAction(action);
  }
}
