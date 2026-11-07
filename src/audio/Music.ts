import Phaser from 'phaser';
import { ALL_TRACKS, MENU_TRACK, RUN_TRACKS, Track } from './tracks';
import { unlockAudio } from './unlock';

/**
 * Linear gain for the six songs. There is no separate effect bus; anything
 * played at the HTML/Phaser default of 1 stays clearly louder than this.
 */
const VOLUME = 0.3;

/**
 * Plays the six shipped songs one at a time through HTML audio elements.
 * They stay out of Phaser's Web Audio cache, which is reserved for the
 * synthesised effects. The first play() has to run inside a tap or key
 * handler; after that the playlist can advance on its own.
 */
export class Music {
  private mode: 'idle' | 'menu' | 'run' = 'idle';
  private runIndex = 0;
  private playToken = 0;
  /** True while a user pause is holding the current song. */
  private suspended = false;
  private tag: HTMLAudioElement | null = null;
  /** HTML audio tags, kept out of Phaser's cache so Web Audio never decodes the songs. */
  private readonly tags = new Map<string, HTMLAudioElement>();
  private readonly onEnded = (): void => {
    if (this.mode !== 'run' || !this.tag || this.tag.loop) return;
    this.runIndex = (this.runIndex + 1) % RUN_TRACKS.length;
    this.start(RUN_TRACKS[this.runIndex].key, false);
  };

  private constructor(private readonly game: Phaser.Game) {}

  static install(game: Phaser.Game): Music {
    const music = new Music(game);
    game.registry.set('music', music);
    // The SOUND setting (and the M key) mutes Phaser's sound manager; songs follow it.
    game.sound.on(Phaser.Sound.Events.GLOBAL_MUTE, (_manager: unknown, muted: boolean) => {
      for (const tag of music.tags.values()) tag.muted = muted;
    });
    return music;
  }

  static of(scene: Phaser.Scene): Music {
    return scene.game.registry.get('music') as Music;
  }

  /** Start buffering every song. Does not decode them through Web Audio. */
  preload(): void {
    for (const track of ALL_TRACKS) this.tagFor(track.key);
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
    unlockAudio(this.game);
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
    const existing = this.tags.get(key);
    if (existing) return existing;
    const track: Track | undefined = ALL_TRACKS.find((item) => item.key === key);
    if (!track) throw new Error(`Missing audio '${key}'`);
    const tag = new Audio();
    tag.preload = 'auto';
    tag.muted = this.game.sound.mute;
    tag.src = track.url;
    this.tags.set(key, tag);
    return tag;
  }
}
