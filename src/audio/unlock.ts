import Phaser from 'phaser';

/** Resume a suspended Web Audio context from inside a tap or key handler. */
export function unlockAudio(game: Phaser.Game): void {
  const sound = game.sound;
  if (!(sound instanceof Phaser.Sound.WebAudioSoundManager)) return;
  const ctx = sound.context;
  if (ctx.state !== 'running') void ctx.resume();
}
