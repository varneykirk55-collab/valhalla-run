# Valhalla Dash

Norse endless runner prototype — Phaser 3.90 + TypeScript + Vite. Portrait, mobile-first, zero asset files (all art is drawn procedurally at boot).

## Run

```bash
npm install
npm run dev      # open the printed Network URL on your phone (same Wi-Fi)
npm run build    # type-check + production build to dist/
```

## Controls

| Action | Touch | Keyboard |
|---|---|---|
| Change lane | swipe left / right | ← → / A D |
| Jump | swipe up | ↑ / W / Space |
| Slide | swipe down (mid-air = slam down) | ↓ / S |

## Obstacles

| Obstacle | How to pass |
|---|---|
| Rock, ice spikes | jump or change lane |
| Fallen tree (wedged on boulders) | slide under |
| Raven (flies toward you) | slide under |
| Draugr (walks toward you) | change lane |

Runes: cyan = +10 score. Ringed runes are power-ups: **Algiz** shield (absorbs one hit), **Fehu** magnet, **Sowilo** double rune score.

## Structure

```
src/
  config.ts            all tuning: speeds, jump physics, spawn gaps, durations
  types.ts
  main.ts              Phaser game config
  scenes/              Boot (generates textures) → Menu → Game
  entities/            Player, TrackEntity base, Obstacle (+ defs table), Rune, Decor
  systems/
    Projection.ts      pseudo-3D lane/z/height → screen, smooth camera follow
    Spawner.ts         obstacle rows, rune lines/arcs, roadside decor
    Difficulty.ts      speed, row gap and obstacle mix vs distance
    Controls.ts        swipe + keyboard → actions
    Track.ts           perspective path drawing
    Background.ts      parallax sky / aurora / mountains / fjord / cliffs / mist
    Effects.ts         particles + floating text
    PowerUps.ts, Storage.ts
  ui/                  Hud, GameOverPanel
  gfx/                 procedural textures (canvas 2D)
```

## Notes

- The world is a pseudo-3D track: objects have `lane`, `z` (distance ahead) and `elev`. Collisions test the swept z interval each frame, so nothing tunnels at high speed.
- To swap in real art, load an image with the same texture key in `BootScene.preload()` — generators skip keys that already exist.
- Balancing lives in `config.ts` and `systems/Difficulty.ts`.
