import Phaser from 'phaser';
import { DESPAWN_Z, PLAYER, SPAWN, SPAWN_Z } from '../config';
import { ObstacleKind } from '../types';
import { Decor } from '../entities/Decor';
import { OBSTACLES, Obstacle } from '../entities/Obstacle';
import { Rune } from '../entities/Rune';
import { TrackEntity } from '../entities/TrackEntity';
import { POWER_KINDS } from './PowerUps';
import { Projection } from './Projection';
import { pickObstacle } from './Difficulty';

/** Remove dead / passed entities in place (no per-frame array allocation). */
function sweep<T extends TrackEntity>(list: T[]): void {
  let w = 0;
  for (const e of list) {
    if (e.dead || e.z < DESPAWN_Z) e.destroy();
    else list[w++] = e;
  }
  list.length = w;
}

/** A planned placement, keyed by world distance along the track. */
type Planned =
  | { type: 'obstacle'; at: number; kind: ObstacleKind; lane: number; gapBehind: number; blocked: number[] }
  | { type: 'runes'; at: number; lane: number; count: number };

/**
 * Lays the track out in 200 m segments. Each segment's obstacles are planned up
 * front (sorted by distance, gap rules enforced), queued, and spawned when they
 * reach the spawn horizon. Runes ride along: a trail into a clear lane or an arc
 * over a jumpable obstacle, plus a line in the long empty stretches.
 */
export class Spawner {
  readonly obstacles: Obstacle[] = [];
  readonly runes: Rune[] = [];
  readonly decor: Decor[] = [];

  /** World distance this spawner has scrolled (matches the run's distance). */
  private travelled = 0;
  private readonly queue: Planned[] = [];
  private nextSegment: number = SPAWN.firstAt;
  private lastAt = -Infinity;
  /** Lanes blocked by the previous obstacle (two when it came two abreast). */
  private lastBlocked: number[] = [0];
  /** Distance since the last sky rune, while flying. */
  private sinceSky = 0;
  private rowsSincePower = 0;
  private sinceDecor = 0;
  private nextDecor = 2;

  constructor(private readonly scene: Phaser.Scene) {
    for (let z = -2; z < SPAWN_Z; z += Phaser.Math.FloatBetween(1.6, 3)) this.spawnDecor(z);
  }

  update(dt: number, speed: number, difficulty: number, magnet: { x: number; h: number } | null, flightLeft = 0): void {
    const dz = speed * dt;
    this.travelled += dz;

    // While flying, lay a weaving trail of runes at cruising height, but only ones
    // that will reach the runner before the flight ends.
    if (flightLeft > SPAWN_Z / speed) {
      this.sinceSky += dz;
      if (this.sinceSky >= 2.6) {
        this.sinceSky = 0;
        const lane = Math.round(Math.sin(this.travelled * 0.045) * 1.2);
        this.runes.push(new Rune(this.scene, 'basic', Phaser.Math.Clamp(lane, -1, 1), SPAWN_Z, PLAYER.flightHeight + 0.4));
      }
    }

    // Keep at least one segment planned beyond the spawn horizon.
    while (this.nextSegment < this.travelled + SPAWN_Z * 2) this.planSegment(this.nextSegment, difficulty);
    this.spawnDue(speed);

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

  // ---- Planning -------------------------------------------------------------------

  /**
   * Plan one segment: n obstacles, one per equal slot, jittered inside the slot so
   * neighbours (also across segments) are never closer than minGap. Some segments
   * add a tight pair 15 m behind one obstacle — the only placement under the floor.
   * Counts, gaps and odds live in SPAWN (config.ts).
   */
  private planSegment(start: number, d: number): void {
    const late = start >= SPAWN.lateFrom;
    const n = late ? SPAWN.perSegmentLate : SPAWN.perSegment;
    const minGap = late ? SPAWN.minGapLate : SPAWN.minGap;
    const slot = SPAWN.segment / n;
    const pairIndex = Math.random() < SPAWN.pairChance ? Phaser.Math.Between(0, n - 1) : -1;

    for (let i = 0; i < n; i++) {
      // Clamp keeps the floor after a tight pair (and across segment boundaries).
      const at = Math.max(start + i * slot + Math.random() * (slot - minGap), this.lastAt + minGap);
      this.planObstacle(at, d);
      if (i === pairIndex) this.planObstacle(at + SPAWN.pairGap, d);
    }
    this.nextSegment = start + SPAWN.segment;
    this.queue.sort((a, b) => a.at - b.at);
  }

  private planObstacle(at: number, d: number): void {
    // Alternate lanes: never reuse a lane the previous obstacle blocked (so never two centres in a row).
    const open = [-1, 0, 1].filter((l) => !this.lastBlocked.includes(l));
    const lane = Phaser.Utils.Array.GetRandom(open.length ? open : [-1, 1]);
    const blocked = [lane];
    // Later on, some obstacles come two abreast; the third lane always stays open.
    const doubleChance = at < SPAWN.doubleFrom ? 0 : SPAWN.doubleChance + (SPAWN.doubleChanceLate - SPAWN.doubleChance) * d;
    // The second lane also avoids the previous obstacle's lanes, so the lane rule still holds.
    const second = open.filter((l) => l !== lane);
    if (second.length && Math.random() < doubleChance) blocked.push(Phaser.Utils.Array.GetRandom(second));
    const gapBehind = at - this.lastAt;
    // A long empty stretch gets a rune line halfway, in any lane (nearest obstacle ≥ 17 m away).
    if (gapBehind >= 35 && Number.isFinite(this.lastAt)) {
      this.queue.push({ type: 'runes', at: this.lastAt + gapBehind / 2 + 5, lane: Phaser.Math.Between(-1, 1), count: 5 });
    }
    for (const l of blocked) this.queue.push({ type: 'obstacle', at, kind: pickObstacle(d, false), lane: l, gapBehind, blocked });
    this.lastAt = at;
    this.lastBlocked = blocked;
  }

  /** Spawn everything that has reached the horizon. Charging creatures wait so they still arrive on their mark. */
  private spawnDue(speed: number): void {
    let w = 0;
    for (const item of this.queue) {
      const z = item.at - this.travelled;
      if (item.type === 'runes') {
        if (z <= SPAWN_Z) {
          for (let k = 0; k < item.count; k++) this.runes.push(new Rune(this.scene, 'basic', item.lane, z - k * 2.2, 0.45));
          continue;
        }
      } else {
        const approach = OBSTACLES[item.kind].approach;
        const spawnZ = approach > 0 ? (z * (speed + approach)) / speed : z;
        if (spawnZ <= SPAWN_Z) {
          this.spawnObstacle(item, z, spawnZ);
          continue;
        }
      }
      this.queue[w++] = item;
    }
    this.queue.length = w;
  }

  private spawnObstacle(item: Extract<Planned, { type: 'obstacle' }>, z: number, spawnZ: number): void {
    this.rowsSincePower++;
    this.obstacles.push(new Obstacle(this.scene, item.kind, item.lane, spawnZ));

    // One set of runes per placement (the first of a two-abreast pair), never into a blocked lane.
    if (item.lane !== item.blocked[0] || Math.random() > 0.65) return;
    const free = [-1, 0, 1].filter((l) => !item.blocked.includes(l));
    if (OBSTACLES[item.kind].avoid === 'jump' && Math.random() < 0.35) this.runeArc(item.lane, z);
    else this.runeLine(Phaser.Utils.Array.GetRandom(free), z, Math.min(item.gapBehind, 20));
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
