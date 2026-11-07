import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { GAME_H, GAME_W } from '../config';
import { ButtonVariant, IconName, buttonTexture, dividerTexture, iconTexture, panelTexture, pillTexture } from '../gfx/ui';
import { UI, goldFill, uiText } from './theme';

export type ButtonSound = 'confirm' | 'tap' | 'none';

export interface ButtonOptions {
  variant: ButtonVariant;
  width: number;
  height: number;
  label: string;
  onClick: () => void;
  fontSize?: number;
  icon?: IconName;
  /** Which UI sound plays on press ('none' when the action plays its own). */
  sound?: ButtonSound;
  /** Breathing glow behind the button (primary calls to action). */
  pulse?: boolean;
}

/**
 * Bevelled Norse button. Fires on release over the button (so a drag-off cancels),
 * squashes on press and has a generous touch target (the art includes padding).
 */
export class NorseButton extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Image;
  private readonly text: Phaser.GameObjects.Text;
  private readonly iconImg?: Phaser.GameObjects.Image;
  private pressed = false;
  private enabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly opts: ButtonOptions) {
    super(scene, x, y);
    const { variant, width, height } = opts;
    const gold = variant === 'gold';

    if (opts.pulse) {
      const glow = scene.add
        .image(0, 0, 'spark')
        .setDisplaySize(width * 1.25, height * 1.9)
        .setTint(gold ? 0xffc85a : 0x5ef2ff)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.18);
      scene.tweens.add({ targets: glow, alpha: 0.42, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.add(glow);
    }

    this.bg = scene.add.image(0, 0, buttonTexture(scene, variant, width, height));
    this.add(this.bg);

    const size = opts.fontSize ?? Math.round(height * (gold ? 0.46 : 0.38));
    this.text = uiText(scene, 0, 0, opts.label, size, gold ? { color: '#fff4d2', stroke: '#5a3608' } : { color: UI.cream });
    this.text.setOrigin(0.5, 0.5);
    if (gold) goldFill(this.text);
    if (opts.icon) {
      const iconSize = Math.round(height * 0.46);
      this.iconImg = scene.add.image(0, 0, iconTexture(scene, opts.icon, iconSize));
      this.add(this.iconImg);
    }
    this.add(this.text);
    this.layout();

    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerdown', () => {
      if (!this.enabled) return;
      this.pressed = true;
      scene.tweens.add({ targets: this, scale: 0.94, duration: 70 });
    });
    this.bg.on('pointerup', () => {
      if (!this.pressed || !this.enabled) return;
      this.pressed = false;
      scene.tweens.add({ targets: this, scale: 1, duration: 120, ease: 'Back.easeOut' });
      if (opts.sound === 'confirm') sfx(scene).uiConfirm(); // SFX: UI confirm
      else if (opts.sound !== 'none') sfx(scene).uiTap(); // SFX: UI tap
      opts.onClick();
    });
    this.bg.on('pointerout', () => {
      this.pressed = false;
      scene.tweens.add({ targets: this, scale: 1, duration: 100 });
      this.bg.clearTint();
    });
    this.bg.on('pointerover', () => this.enabled && this.bg.setTint(0xfff6e6));

    scene.add.existing(this);
  }

  private layout(): void {
    if (!this.iconImg) {
      this.text.setPosition(0, 0);
      return;
    }
    const gap = 14;
    const total = this.iconImg.width + gap + this.text.width;
    this.iconImg.setPosition(-total / 2 + this.iconImg.width / 2, 0);
    this.text.setPosition(-total / 2 + this.iconImg.width + gap + this.text.width / 2, 0);
  }

  setLabel(label: string): this {
    this.text.setText(label);
    this.layout();
    return this;
  }

  setIcon(icon: IconName): this {
    if (this.iconImg) this.iconImg.setTexture(iconTexture(this.scene, icon, Math.round(this.opts.height * 0.46)));
    return this;
  }

  setEnabled(on: boolean): this {
    this.enabled = on;
    this.setAlpha(on ? 1 : 0.5);
    return this;
  }
}

/** HUD counter: icon + value inside a slim gold pill. */
export class HudPill extends Phaser.GameObjects.Container {
  readonly value: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, icon: Phaser.GameObjects.Image, color: string = UI.cream) {
    super(scene, x, y);
    const h = 54;
    const bg = scene.add.image(0, 0, pillTexture(scene, width, h));
    icon.setPosition(-width / 2 + 36, 0);
    this.value = uiText(scene, -width / 2 + 62, 0, '0', 28, { color, align: 'left' }).setOrigin(0, 0.5);
    this.add([bg, icon, this.value]);
    scene.add.existing(this);
  }

  /** Brief scale pop when the value changes. */
  pop(): void {
    this.scene.tweens.add({ targets: this.value, scale: { from: 1.25, to: 1 }, duration: 180, ease: 'Back.easeOut' });
  }
}

export interface ModalOptions {
  title: string;
  width: number;
  height: number;
  depth: number;
  onClose?: () => void;
}

/**
 * Centred Norse panel over a dim backdrop that swallows taps. Content is added
 * with coordinates relative to the panel centre via `add()`.
 */
export class Modal {
  readonly root: Phaser.GameObjects.Container;
  private readonly dim: Phaser.GameObjects.Rectangle;
  private closing = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly opts: ModalOptions,
  ) {
    this.dim = scene.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x04070e, 0.62)
      .setDepth(opts.depth)
      .setInteractive();
    const panel = scene.add.image(0, 0, panelTexture(scene, opts.width, opts.height));
    const top = -opts.height / 2;
    const title = goldFill(uiText(scene, 0, top + 56, opts.title, 40, { stroke: '#2a1a06' }).setOrigin(0.5));
    const divider = scene.add.image(0, top + 96, dividerTexture(scene, opts.width - 90));
    this.root = scene.add.container(GAME_W / 2, GAME_H / 2, [panel, title, divider]).setDepth(opts.depth + 1);

    this.dim.setAlpha(0);
    this.root.setScale(0.9).setAlpha(0);
    scene.tweens.add({ targets: this.dim, alpha: 1, duration: 180 });
    scene.tweens.add({ targets: this.root, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }

  add(...objects: Phaser.GameObjects.GameObject[]): this {
    this.root.add(objects);
    return this;
  }

  close(): void {
    if (this.closing) return;
    this.closing = true;
    this.scene.tweens.add({ targets: this.dim, alpha: 0, duration: 160 });
    this.scene.tweens.add({
      targets: this.root,
      scale: 0.92,
      alpha: 0,
      duration: 160,
      onComplete: () => {
        this.root.destroy();
        this.dim.destroy();
        this.opts.onClose?.();
      },
    });
  }
}
