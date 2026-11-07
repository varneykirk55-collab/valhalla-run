import { FOCAL, GAME_W, GROUND_Y, HORIZON_Y, LANE_PX, UNIT_PX } from '../config';

export interface Projected {
  x: number;
  y: number;
  /** Perspective scale: 1 at the player, → 0 at the horizon. */
  s: number;
}

/**
 * Maps world space (lane, z = distance ahead, elev = height) to the screen.
 * The "camera" is just two smoothed offsets: camX follows the player's lane,
 * lift rises a little when the player jumps.
 */
export class Projection {
  camX = 0;
  lift = 0;

  scale(z: number): number {
    return FOCAL / (FOCAL + Math.max(z, -FOCAL + 0.6));
  }

  project(lane: number, z: number, elev = 0): Projected {
    const s = this.scale(z);
    return {
      x: GAME_W / 2 + (lane - this.camX) * LANE_PX * s,
      y: HORIZON_Y + (GROUND_Y - HORIZON_Y) * s - elev * UNIT_PX * s + this.lift,
      s,
    };
  }

  /** Smoothly track the player. Call once per frame. */
  follow(playerX: number, playerH: number, dt: number): void {
    this.camX += (playerX * 0.7 - this.camX) * Math.min(1, dt * 6);
    this.lift += (playerH * UNIT_PX * 0.22 - this.lift) * Math.min(1, dt * 5);
  }
}
