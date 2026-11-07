import Phaser from 'phaser';
import { MENU_TRACK, RUN_TRACKS } from './tracks';

/**
 * Linear gain for the six songs. There is no separate effect bus; anything
 * played at the HTML/Phaser default of 1 stays clearly louder than this.
 */
const VOLUME = 0.3;

/**
 * Plays the six shipped songs one at a time from the audio tags Phaser
 * preloaded. Web Audio is off, so the tracks stream instead of being decoded
 * into one big buffer. The first play() has to run inside a tap or key
 * handler; after that the playlist can advance on its own.
 */
export class Music {
  private mode: 'idle' | 'menu' | 'run' = 'idle';
  private runIndex = 0;
  private playToken = 0;
  /** True while a user pause is holding the current song. */
  private suspended = false;
  private tag: HTMLAudioElement | null = null;
  private readonly onEnded = (): void => {
    if (this.mode !== 'run' || !this.tag || this.tag.loop) return;
    this.runIndex = (this.runIndex + 1) % RUN_TRACKS.length;
    this.start(RUN_TRACKS[this.runIndex].key, false);
  };

  private constructor(private readonly game: Phaser.Game) {}

  static install(game: Phaser.Game): Music {
    const music = new Music(game);
    game.registry.set('music', music);
    return music;
  }

  static of(scene: Phaser.Scene): Music {
    return scene.game.registry.get('music') as Music;
  }

  /** Title theme. A later playRun from the same tap replaces it. */
  playMenu(): void {
    if (this.mode === 'menu' && this.tag && !this.tag.paused) return;
    this.mode = 'menu';
    this.start(MENU_TRACK.key, true);
  }

  /**
   * Gameplay playlist. Call from the tap or key that leaves the menu so the
   * browser allows playback. A death restart leaves the current song alone.
   */
  playRun(): void {
    if (this.mode === 'run' && this.tag && !this.tag.paused && !this.suspended) return;
    this.mode = 'run';
    this.start(RUN_TRACKS[this.runIndex].key, false);
  }

  /** Hold the current song. Playback position is kept for resume. */
  pause(): void {
    if (this.suspended || !this.tag || this.tag.paused) return;
    this.tag.pause();
    this.suspended = true;
  }

  /** Continue the song a pause() stopped, from the same position. */
  resume(): void {
    if (!this.suspended || !this.tag) return;
    this.suspended = false;
    void this.tag.play();
  }

  private start(key: string, loop: boolean): void {
    this.suspended = false;
    const token = ++this.playToken;
    const next = this.tagFor(key);
    const previous = this.tag;
    next.loop = loop;
    next.volume = VOLUME;
    if (next !== previous) next.currentTime = 0;
    next.removeEventListener('ended', this.onEnded);
    next.addEventListener('ended', this.onEnded);
    this.tag = next;
    // Pause the previous song only after this play() settles. Pausing a tag
    // whose play() promise is still pending rejects that promise.
    void next.play().then(
      () => {
        if (token !== this.playToken) {
          next.pause();
          next.removeEventListener('ended', this.onEnded);
          return;
        }
        if (previous && previous !== next) {
          previous.pause();
          previous.removeEventListener('ended', this.onEnded);
        }
      },
      () => {
        if (token === this.playToken && previous && previous !== next && !previous.paused) {
          previous.pause();
        }
      },
    );
  }

  private tagFor(key: string): HTMLAudioElement {
    const cached = this.game.cache.audio.get(key) as HTMLAudioElement[] | undefined;
    const tag = cached?.[0];
    if (!tag) throw new Error(`Missing audio '${key}'`);
    return tag;
  }
}
