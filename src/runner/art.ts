/**
 * Baked rear-view sprites of the cleaned Norse Runner.
 *
 * Source clips (in-place — the track already moves the player):
 * - run:  NorseRunner_FastRun_InPlace, 8 frames across 0.533s
 * - jump: NorseRunner_RunningJump_InPlace, 8 frames. The clip's vertical
 *   arc is removed and each pose is planted on the ground, so Player's
 *   physics hop is not stacked on top of the animation.
 * - slide: Running Slide, 8 frames. The sheet's camera is wider than run/jump
 *   so the lean is not clipped, which shrinks the standing silhouette.
 *   `slideScale` enlarges those frames so a slide matches the run height.
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
  /** Run standing alpha height 389px vs slide standing 274px, same frame. */
  slideScale: 0.42421523991637733 * (389 / 274),
  runFrames: 8,
  jumpFrames: 8,
  slideFrames: 8,
  /** Source clip length. Playback is fit to PLAYER.slideTime. */
  slideClip: 1.5333333333333334,
  runCycle: 0.5333333611488342,
} as const;
