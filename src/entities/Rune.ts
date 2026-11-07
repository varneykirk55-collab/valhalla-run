import Phaser from 'phaser';
import { RuneKind } from '../types';
import { RUNE_COLORS } from '../gfx/props';
import { Projection } from '../systems/Projection';
import { TrackEntity } from './TrackEntity';

const BASIC_TEXTURES = ['rune_ansuz', 'rune_kenaz', 'rune_tiwaz'];

export function runeTexture(kind: RuneKind): string {
  return kind === 'basic' ? Phaser.Utils.Array.GetRandom(BASIC_TEXTURES) : `rune_${kind}`;
}

export function runeColor(kind: RuneKind): number {
  return Phaser.Display.Color.HexStringToColor(RUNE_COLORS[kind]).color;
}

export class Rune extends TrackEntity {
  readonly kind: RuneKind;
  collected = false;
  private phase = Math.random() * Math.PI * 2;

  constructor(scene: Phaser.Scene, kind: RuneKind, lane: number, z: number, elev: number) {
    super(scene, runeTexture(kind), lane, z, elev, 0.5);
    this.kind = kind;
    this.baseScale = kind === 'basic' ? 0.8 : 1;
  }

  render(proj: Projection): void {
    // Spin like a coin and float gently.
    const spin = Math.max(0.3, Math.abs(Math.cos(this.t * 3 + this.phase)));
    super.render(proj, Math.sin(this.t * 4 + this.phase) * 0.05, spin);
  }
}
