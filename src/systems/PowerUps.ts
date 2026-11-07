import { POWER_DURATION } from '../config';
import { PowerKind } from '../types';

export const POWER_KINDS: PowerKind[] = ['shield', 'magnet', 'double'];

export const POWER_LABELS: Record<PowerKind, string> = {
  shield: 'Algiz · Shield',
  magnet: 'Fehu · Magnet',
  double: 'Sowilo · ×2 Runes',
};

/** Timed power-up state. The shield also ends early when it absorbs a hit. */
export class PowerUps {
  private readonly timers: Record<PowerKind, number> = { shield: 0, magnet: 0, double: 0 };

  activate(kind: PowerKind): void {
    this.timers[kind] = POWER_DURATION[kind];
  }

  clear(kind: PowerKind): void {
    this.timers[kind] = 0;
  }

  active(kind: PowerKind): boolean {
    return this.timers[kind] > 0;
  }

  /** Remaining fraction 0..1, for HUD bars. */
  fraction(kind: PowerKind): number {
    return Math.max(0, this.timers[kind] / POWER_DURATION[kind]);
  }

  update(dt: number): void {
    for (const k of POWER_KINDS) if (this.timers[k] > 0) this.timers[k] = Math.max(0, this.timers[k] - dt);
  }
}
