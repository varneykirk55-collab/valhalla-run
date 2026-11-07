/**
 * Baked rear-view sprites of the cleaned Norse Runner.
 *
 * Source clips (in-place — the track already moves the player):
 * - run:  NorseRunner_FastRun_InPlace, 8 frames across 0.533s
 * - jump: NorseRunner_RunningJump_InPlace, 8 frames. The clip's vertical
 *   arc is removed and each pose is planted on the ground, so Player's
 *   physics hop is not stacked on top of the animation.
 * - slide: the rig has no slide clip. This frame is the fast-run pose
 *   pitched forward into a dive and planted on the ground.
 *
 * `scale` maps texture pixels into game pixels so the hair-to-ground
 * height matches the rig (about 1.119 m at UNIT_PX).
 */
export const RUNNER = {
  frameWidth: 303,
  frameHeight: 430,
  originX: 0.5115511551155115,
  originY: 0.9484765369303741,
  scale: 0.42421523991637733,
  runFrames: 8,
  jumpFrames: 8,
  runCycle: 0.5333333611488342,
} as const;
