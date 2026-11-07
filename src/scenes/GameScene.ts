import Phaser from 'phaser';
import { Music } from '../audio/Music';
import { sfx } from '../audio/Sfx';
import { DEPTH, FONT, GAME_H, GAME_W, PLAYER, RUNE_VALUE } from '../config';
import { Obstacle } from '../entities/Obstacle';
import { Player } from '../entities/Player';
import { Rune, runeColor } from '../entities/Rune';
import { RUNE_COLORS } from '../gfx/props';
import { Background } from '../systems/Background';
import { Controls } from '../systems/Controls';
import { difficultyAt, speedAt } from '../systems/Difficulty';
import { Effects } from '../systems/Effects';
import { POWER_LABELS, PowerUps } from '../systems/PowerUps';
import { Projection } from '../systems/Projection';
import { Spawner } from '../systems/Spawner';
import { loadBest, saveBest } from '../systems/Storage';
import { Track } from '../systems/Track';
import { Action } from '../types';
import { Hud } from '../ui/Hud';
import { showGameOver } from '../ui/GameOverPanel';

type State = 'running' | 'dead';

export class GameScene extends Phaser.Scene {
  // Everything is (re)created in create(): Phaser reuses the scene instance on restart,
  // so field initialisers would leak state from the previous run.
  private proj!: Projection;
  private background!: Background;
  private track!: Track;
  private spawner!: Spawner;
  private player!: Player;
  private powers!: PowerUps;
  private fx!: Effects;
  private hud!: Hud;
  private state: State = 'running';
  private distance = 0;
  private speed = 0;
  private runeCount = 0;
  private runeScore = 0;
  private paused = false;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private pauseButton!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create(): void {
    this.state = 'running';
    this.paused = false;
    this.distance = 0;
    this.speed = speedAt(0);
    this.runeCount = 0;
    this.runeScore = 0;

    this.proj = new Projection();
    this.background = new Background(this);
    this.track = new Track(this);
    this.spawner = new Spawner(this);
    this.player = new Player(this);
    this.powers = new PowerUps();
    this.fx = new Effects(this);
    this.hud = new Hud(this);
    new Controls(this, (a) => this.onAction(a));
    this.buildPauseUi();
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code !== 'KeyP' && event.code !== 'Escape') return;
      event.preventDefault();
      this.togglePause();
    };
    this.input.keyboard?.on('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', onKey);
      if (this.paused) this.setWorldFrozen(false);
    });

    // The menu tap already started the playlist. A restart keeps that song
    // instead of jumping back to the first track.
    Music.of(this).playRun();
    this.cameras.main.fadeIn(350, 10, 19, 40);
  }

  private buildPauseUi(): void {
    const cx = GAME_W / 2;
    this.pauseButton = this.add
      .text(cx, 36, 'PAUSE', {
        fontFamily: FONT,
        fontSize: '18px',
        fontStyle: '700',
        color: '#f4e7c5',
        backgroundColor: '#141c2ee6',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud)
      .setInteractive({ useHandCursor: true });
    this.pauseButton.on('pointerup', () => this.togglePause());

    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x070b16, 0.55).setOrigin(0);
    const title = this.add
      .text(cx, GAME_H / 2 - 28, 'PAUSED', {
        fontFamily: FONT,
        fontSize: '64px',
        fontStyle: '900',
        color: '#f4e7c5',
        stroke: '#070b16',
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    const hint = this.add
      .text(cx, GAME_H / 2 + 42, 'P    ·    Esc    ·    Tap', {
        fontFamily: FONT,
        fontSize: '22px',
        fontStyle: '700',
        color: '#d9a441',
        stroke: '#070b16',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.pauseOverlay = this.add.container(0, 0, [dim, title, hint]).setDepth(DEPTH.overlay).setVisible(false);
    dim.setInteractive();
    dim.on('pointerup', () => this.togglePause());
  }

  private togglePause(): void {
    if (this.state !== 'running') return;
    this.paused = !this.paused;
    this.pauseOverlay.setVisible(this.paused);
    this.pauseButton.setVisible(!this.paused);
    this.setWorldFrozen(this.paused);
    if (this.paused) {
      Music.of(this).pause();
      this.game.sound.pauseAll();
    } else {
      Music.of(this).resume();
      this.game.sound.resumeAll();
    }
  }

  /** Stop tweens, timers, and particle animation without leaving the scene. */
  private setWorldFrozen(frozen: boolean): void {
    this.time.paused = frozen;
    if (frozen) this.tweens.pauseAll();
    else this.tweens.resumeAll();
    this.children.each((child) => {
      if (child instanceof Phaser.GameObjects.Particles.ParticleEmitter) child.active = !frozen;
    });
  }

  get score(): number {
    return Math.floor(this.distance) + this.runeScore;
  }

  private onAction(action: Action): void {
    if (this.state !== 'running' || this.paused) return;
    switch (action) {
      case 'left':
        this.player.moveLeft();
        break;
      case 'right':
        this.player.moveRight();
        break;
      case 'jump':
        this.player.jump();
        break;
      case 'slide':
        this.player.slide();
        break;
    }
  }

  update(_time: number, deltaMs: number): void {
    if (this.paused) return;
    const dt = Math.min(deltaMs, 50) / 1000; // clamp so a tab-switch hitch can't teleport obstacles

    if (this.state === 'running') {
      const d = difficultyAt(this.distance);
      this.speed = speedAt(d);
      this.distance += this.speed * dt;
      this.powers.update(dt);
      this.player.update(dt, this.speed);
      const magnet = this.powers.active('magnet') ? { x: this.player.x, h: this.player.h } : null;
      this.spawner.update(dt, this.speed, d, magnet);
      this.collectRunes();
      this.checkObstacles();
    }

    this.proj.follow(this.player.x, this.player.h, dt);
    this.background.update(dt, this.proj, this.state === 'running' ? this.speed : 0);
    this.track.draw(this.proj, this.distance);
    this.spawner.render(this.proj);
    this.player.render(this.proj, this.powers.active('shield'));
    this.hud.update(this.score, this.distance, this.runeCount, this.powers);
  }

  // ---- Collisions ---------------------------------------------------------

  private collectRunes(): void {
    const p = this.player;
    const [lo, hi] = p.span();
    for (const r of this.spawner.runes) {
      if (r.dead) continue;
      if (r.z > 0.7 || r.prevZ < -0.7) continue; // swept z overlap
      if (Math.abs(r.lane - p.x) > 0.6) continue;
      if (r.elev < lo - 0.35 || r.elev > hi + 0.45) continue;
      this.collect(r);
    }
  }

  private collect(r: Rune): void {
    const pos = this.proj.project(r.lane, Math.max(r.z, 0), r.elev);
    r.destroy();
    if (r.kind === 'basic') {
      const value = RUNE_VALUE * (this.powers.active('double') ? 2 : 1);
      this.runeCount++;
      sfx(this).rune();
      this.runeScore += value;
      this.fx.collect(pos.x, pos.y, runeColor('basic'));
      this.fx.floatText(pos.x, pos.y - 20, `+${value}`, this.powers.active('double') ? RUNE_COLORS.double : RUNE_COLORS.basic);
    } else {
      this.powers.activate(r.kind);
      sfx(this).power();
      this.fx.collect(pos.x, pos.y, runeColor(r.kind), true);
      this.fx.floatText(pos.x, pos.y - 30, POWER_LABELS[r.kind], RUNE_COLORS[r.kind], 24);
      this.cameras.main.flash(120, 255, 240, 200);
    }
  }

  private checkObstacles(): void {
    const p = this.player;
    const [lo, hi] = p.span();
    for (const o of this.spawner.obstacles) {
      if (o.hit) continue;
      const d = o.def.hitDepth;
      if (o.z > d || o.prevZ < -d) continue;
      if (Math.abs(o.lane - p.x) > PLAYER.laneHitRadius) continue;
      if (hi <= o.def.span[0] || lo >= o.def.span[1]) continue;

      o.hit = true;
      if (this.powers.active('shield')) {
        this.smash(o);
        continue;
      }
      if (p.invuln > 0) continue;
      this.die();
      return;
    }
  }

  private smash(o: Obstacle): void {
    this.powers.clear('shield');
    this.player.invuln = PLAYER.invulnTime;
    const pos = this.proj.project(o.lane, Math.max(o.z, 0), (o.def.span[0] + o.def.span[1]) / 2);
    this.fx.smash(pos.x, pos.y);
    sfx(this).smash();
    this.cameras.main.shake(140, 0.006);
    o.destroy();
  }

  // ---- Death & restart --------------------------------------------------------

  private die(): void {
    this.state = 'dead';
    sfx(this).crash();
    const at = this.player.crash();
    this.fx.crash(at.x, at.y);
    this.cameras.main.shake(320, 0.014);
    this.cameras.main.flash(160, 255, 90, 60);

    const score = this.score;
    const prevBest = loadBest();
    const newBest = score > prevBest;
    if (newBest) saveBest(score);

    this.time.delayedCall(850, () =>
      showGameOver(
        this,
        { score, distance: this.distance, runes: this.runeCount, best: Math.max(score, prevBest), newBest },
        () => {
          this.cameras.main.fadeOut(220, 10, 19, 40);
          this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart());
        },
      ),
    );
  }
}
