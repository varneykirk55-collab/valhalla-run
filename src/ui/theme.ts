import Phaser from 'phaser';

/**
 * Norse UI theme: deep navy panels, bevelled gold trim, glowing cyan runes.
 * Lilita One is bundled (src/assets/fonts) and loaded in main.ts before the
 * game starts, so canvas text never renders in a fallback face.
 */
export const UI_FONT = '"Lilita One", "Cinzel", Georgia, sans-serif';

export const UI = {
  navy900: '#0a101d',
  navy800: '#111a2c',
  navy700: '#1b2842',
  gold: '#f2c25a',
  goldLight: '#fff1b8',
  goldDeep: '#a8701f',
  goldDark: '#4a2f08',
  cyan: '#5ef2ff',
  cream: '#fff4d6',
  muted: '#9fb0c8',
  ink: '#070b14',
} as const;

/** Screen margin from the canvas edge; the canvas itself sits inside the device safe area (see index.html). */
export const SAFE = { top: 18, side: 16, bottom: 18 } as const;

export function hexColor(hex: string): number {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

/** Thousands separators, e.g. 12340 → "12,340". */
export function formatNumber(n: number): string {
  return Math.floor(n).toLocaleString('en-US');
}

export interface UiTextOptions {
  color?: string;
  stroke?: string;
  strokeThickness?: number;
  align?: 'left' | 'center' | 'right';
  shadow?: boolean;
}

/** Display text in the UI face with a dark carved outline and a soft drop shadow. */
export function uiText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  size: number,
  opts: UiTextOptions = {},
): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, str, {
    fontFamily: UI_FONT,
    fontSize: `${size}px`,
    color: opts.color ?? UI.cream,
    stroke: opts.stroke ?? UI.ink,
    strokeThickness: opts.strokeThickness ?? Math.max(3, Math.round(size * 0.14)),
    align: opts.align ?? 'center',
    padding: { x: 4, y: 4 },
  });
  if (opts.shadow !== false) t.setShadow(0, Math.max(2, size * 0.06), 'rgba(0,0,0,0.55)', 4, true, false);
  return t;
}

/** Vertical cream → gold → bronze fill, as on the logo and headings. */
export function goldFill(t: Phaser.GameObjects.Text): Phaser.GameObjects.Text {
  const g = t.context.createLinearGradient(0, 0, 0, t.height);
  g.addColorStop(0.15, '#fff8dc');
  g.addColorStop(0.55, '#f6c95b');
  g.addColorStop(0.95, '#c4831f');
  t.setFill(g);
  return t;
}
