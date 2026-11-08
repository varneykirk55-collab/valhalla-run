import { SPEED } from '../config';
import { ObstacleKind } from '../types';
import { OBSTACLES } from '../entities/Obstacle';

/** 0 at the start → 1 at SPEED.rampDistance, eased so the early game ramps faster. */
export function difficultyAt(distance: number): number {
  const t = Math.min(1, distance / SPEED.rampDistance);
  return 1 - (1 - t) * (1 - t);
}

export function speedAt(d: number): number {
  return SPEED.start + (SPEED.max - SPEED.start) * d;
}

/** Weighted obstacle pick. Creatures phase in as difficulty rises. */
export function pickObstacle(d: number, passableOnly: boolean): ObstacleKind {
  const weights: Array<[ObstacleKind, number]> = [
    ['rock', 3],
    ['spikes', 2.5],
    ['fallenTree', 2],
    ['raven', d > 0.12 ? 1.2 + 2 * d : 0],
    ['draugr', d > 0.2 ? 0.8 + 2 * d : 0],
  ];
  const pool = weights.filter(([k, w]) => w > 0 && (!passableOnly || OBSTACLES[k].avoid !== 'lane'));
  const total = pool.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [kind, w] of pool) {
    roll -= w;
    if (roll <= 0) return kind;
  }
  return pool[0][0];
}
