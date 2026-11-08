// Central tuning values. Everything gameplay-related lives here so balancing
// never means hunting through scene code.

/** Internal render size (portrait). Scaled to fit the screen. */
export const GAME_W = 540;
export const GAME_H = 960;

/** Textures are authored in a 450-wide design space and rasterised at this factor. */
export const TEX_SCALE = GAME_W / 450;

// ---- Pseudo-3D projection -------------------------------------------------
/** Screen y of the vanishing horizon. */
export const HORIZON_Y = 360;
/** Screen y of the ground directly under the player (z = 0). */
export const GROUND_Y = 855;
/** Focal length in world units: larger = flatter perspective. */
export const FOCAL = 8;
/** Pixel width of one lane at z = 0. */
export const LANE_PX = 144;
/** Pixels per world unit of height at z = 0. */
export const UNIT_PX = 144;

/** World z where new objects appear, and where they are removed behind the camera. */
export const SPAWN_Z = 72;
export const DESPAWN_Z = -3;

// ---- Player ------------------------------------------------------------------
export const PLAYER = {
  jumpVelocity: 8.6, // units/s  → peak ≈ 1.4 units, airtime ≈ 0.66 s
  gravity: 26,
  fastFallVelocity: -14, // swipe down mid-air
  slideTime: 0.7,
  laneSpeed: 16, // higher = snappier lane change
  standHeight: 0.92, // hitbox height in units
  slideHeight: 0.45,
  laneHitRadius: 0.55,
  invulnTime: 1.0, // after a shield absorbs a hit
  flightHeight: 2.4, // cruising height while the flight power-up lasts (clears every obstacle)
  flightClimb: 4, // how quickly the runner rises to cruising height
  flightLandingGrace: 1.0, // invulnerable seconds after flight ends, while dropping back down
};

// ---- Difficulty -------------------------------------------------------------
export const SPEED = {
  start: 14, // world units (metres) per second
  max: 31,
  rampDistance: 2200, // metres until max difficulty
};

/** Obstacles are laid out in fixed-length segments of world distance (metres = units). */
export const SPAWN = {
  segment: 200, // length of one segment
  firstAt: 70, // world distance where the first segment starts (≈5 s of free running)
  perSegment: 5, // obstacles per segment early on...
  perSegmentLate: 7, // ...and after lateFrom
  lateFrom: 1000,
  minGap: 30, // minimum gap between obstacles early on...
  minGapLate: 22, // ...and after lateFrom (hard floor)
  pairChance: 0.35, // share of segments that add one tight pair
  doubleFrom: 400, // from here, some obstacles come two abreast (one lane always left open)
  doubleChance: 0.2, // chance per obstacle at doubleFrom...
  doubleChanceLate: 0.45, // ...rising to this by the end of the difficulty ramp
  pairGap: 15, // the tight pair is the only placement allowed under the floor
};

// ---- Scoring & power-ups -------------------------------------------------------
export const RUNE_VALUE = 10;
export const POWER_DURATION = { shield: 12, magnet: 8, double: 9, flight: 7 } as const;

// ---- Input -------------------------------------------------------------------
export const SWIPE_THRESHOLD = 34; // game pixels

// ---- Presentation --------------------------------------------------------------
export const FONT = '"Cinzel", "Trajan Pro", Georgia, serif';
export const BEST_KEY = 'valhalla-dash-best';

export const DEPTH = {
  sky: 0,
  aurora: 1,
  farMountains: 2,
  fjord: 3,
  cliffs: 4,
  mist: 5,
  snowfield: 9,
  ground: 10,
  fog: 11,
  shadow: 4985,
  aura: 4999,
  player: 5001,
  fx: 8000,
  hud: 9000,
  overlay: 9500,
};

/** Painter's order for world objects: nearer (smaller z) draws on top. */
export function depthForZ(z: number): number {
  return 1000 + (100 - z) * 40; // z = 0 → 5000
}

/** Objects fade in out of the distant mist. */
export function fadeForZ(z: number): number {
  return Math.max(0, Math.min(1, (SPAWN_Z + 2 - z) / 12));
}
