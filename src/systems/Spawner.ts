import Phaser from 'phaser';
import { DESPAWN_Z, SPAWN, SPAWN_Z } from '../config';
import { Decor } from '../entities/Decor';
import { OBSTACLES, Obstacle } from '../entities/Obstacle';
import { Rune } from '../entities/Rune';
import { TrackEntity } from '../entities/TrackEntity';
import { POWER_KINDS } from './PowerUps';
import { Projection } from './Projection';
import { pickObstacle, rowGapAt, rowSize } from './Difficulty';

const ALL_LANES = [-1, 0, 1];

/** Remove dead / passed entities in place (no per-frame array allocation). */
function sweep<T extends TrackEntity>(list: T[]): void {
  let w = 0;
  for (const e of list) {
    if (e.dead || e.z < DESPAWN_Z) e.destroy();
    else list[w++] = e;
  }
  list.length = w;
}

/**
 * Generates the track ahead in "rows": each row blocks 1–3 lanes with obstacles,
 * and may come with a line of runes in a free lane or an arc over a jumpable obstacle.
 * Rows are spaced by distance so difficulty can tighten the gap over time.
 */
export class Spawner {
  readonly obstacles: Obstacle[] = [];
  readonly runes: Rune[] = [];
  readonly decor: Decor[] = [];

  private sinceRow: number;
  private gap = SPAWN.gapStart;
  private rowIndex = 0;
  private rowsSincePower = 0;
  private sinceDecor = 0;
  private nextDecor = 2;

  constructor(private readonly scene: Phaser.Scene) {
    this.sinceRow = this.gap - 6; // first row appears almost immediately (≈5 s away)
    for (let z = -2; z < SPAWN_Z; z += Phaser.Math.FloatBetween(1.6, 3)) this.spawnDecor(z);
  }

  update(dt: number, speed: number, difficulty: number, magnet: { x: number; h: number } | null): void {
    const dz = speed * dt;

    this.sinceRow += dz;
    if (this.sinceRow >= this.gap) {
      const overshoot = this.sinceRow - this.gap;
      this.spawnRow(SPAWN_Z - overshoot, difficulty, speed, this.gap);
      this.sinceRow = overshoot;
      this.gap = rowGapAt(difficulty);
    }

    this.sinceDecor += dz;
    if (this.sinceDecor >= this.nextDecor) {
      this.sinceDecor = 0;
      this.nextDecor = Phaser.Math.FloatBetween(1.6, 3.2);
      this.spawnDecor(SPAWN_Z + 4);
    }

    for (const o of this.obstacles) o.update(dt, speed);
    for (const d of this.decor) d.update(dt, speed);
    for (const r of this.runes) {
      r.update(dt, speed);
      if (magnet && r.z < 14 && r.z > -0.5) {
        const k = Math.min(1, dt * 9);
        r.lane += (magnet.x - r.lane) * k;
        r.elev += (magnet.h + 0.45 - r.elev) * k;
      }
    }

    sweep(this.obstacles);
    sweep(this.runes);
    sweep(this.decor);
  }

  render(proj: Projection): void {
    for (const d of this.decor) d.render(proj);
    for (const o of this.obstacles) o.render(proj);
    for (const r of this.runes) r.render(proj);
  }

  private spawnRow(z: number, d: number, speed: number, gapBehind: number): void {
    this.rowIndex++;
    this.rowsSincePower++;

    const count = rowSize(d, this.rowIndex);
    const used = Phaser.Utils.Array.Shuffle([...ALL_LANES]).slice(0, count);
    const jumpable: number[] = [];

    for (const lane of used) {
      // A full row must stay passable: only jump/slide obstacles allowed.
      const kind = pickObstacle(d, count === 3);
      const def = OBSTACLES[kind];
      // Charging creatures spawn further back so they still arrive in sync with their row.
      const spawnZ = def.approach > 0 ? (z * (speed + def.approach)) / speed : z;
      this.obstacles.push(new Obstacle(this.scene, kind, lane, spawnZ));
      if (def.avoid === 'jump') jumpable.push(lane);
    }

    if (Math.random() > 0.65) return;
    const free = ALL_LANES.filter((l) => !used.includes(l));
    if (jumpable.length && (Math.random() < 0.35 || !free.length)) {
      this.runeArc(Phaser.Utils.Array.GetRandom(jumpable), z);
    } else if (free.length) {
      this.runeLine(Phaser.Utils.Array.GetRandom(free), z, gapBehind);
    }
  }

  /** A trail of runes leading up to the row in a lane that's clear. */
  private runeLine(lane: number, rowZ: number, gapBehind: number): void {
    const n = Phaser.Math.Clamp(Math.floor((gapBehind - 4) / 2.2), 3, 6);
    const powerAt = this.rowsSincePower >= 5 && Math.random() < 0.25 ? Math.floor(n / 2) : -1;
    for (let k = 0; k < n; k++) {
      const z = rowZ - 2 - k * 2.2;
      if (k === powerAt) {
        this.rowsSincePower = 0;
        this.runes.push(new Rune(this.scene, Phaser.Utils.Array.GetRandom(POWER_KINDS), lane, z, 0.55));
      } else {
        this.runes.push(new Rune(this.scene, 'basic', lane, z, 0.45));
      }
    }
  }

  /** An arc of runes tracing the jump over an obstacle. */
  private runeArc(lane: number, rowZ: number): void {
    for (let k = -2; k <= 2; k++) {
      const elev = 0.35 + 1.15 * (1 - (k / 2.6) ** 2);
      this.runes.push(new Rune(this.scene, 'basic', lane, rowZ + k * 1.5, elev));
    }
  }

  private spawnDecor(z: number): void {
    const side = Math.random() < 0.5 ? -1 : 1;
    const laneX = side * Phaser.Math.FloatBetween(2.25, 4.4);
    const kind = Math.random() < 0.1 ? 'runestone' : 'pine';
    this.decor.push(new Decor(this.scene, kind, laneX, z));
  }
}
