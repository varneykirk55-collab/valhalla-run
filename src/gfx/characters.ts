import Phaser from 'phaser';
import { Ctx, TAU, box, circle, makeTexture, poly, rgba } from './canvas';

const C = {
  skin: '#e2b48c',
  tunic: '#9b3226',
  tunicDark: '#6e2219',
  trousers: '#4b3d30',
  boot: '#2b2019',
  sole: '#17110c',
  hair: '#c8863c',
  iron: '#9aa1ab',
  ironDark: '#5a5f68',
  wood: '#a8743d',
  paint: '#2f5f8f',
  gold: '#d9a441',
  belt: '#3a2a1c',
};

type Pose = 'run0' | 'run1' | 'jump' | 'slide';

function roundShield(c: Ctx, x: number, y: number, r: number): void {
  c.save();
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fillStyle = C.wood;
  c.fill();
  c.clip();
  c.fillStyle = C.paint;
  for (const a of [-Math.PI / 2, Math.PI / 2]) {
    c.beginPath();
    c.moveTo(x, y);
    c.arc(x, y, r, a, a + Math.PI / 2);
    c.closePath();
    c.fill();
  }
  c.strokeStyle = 'rgba(0,0,0,0.22)';
  c.lineWidth = 1;
  for (const dx of [-9, -3, 3, 9]) {
    c.beginPath();
    c.moveTo(x + dx, y - r);
    c.lineTo(x + dx, y + r);
    c.stroke();
  }
  c.restore();
  c.strokeStyle = C.ironDark;
  c.lineWidth = 3;
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.stroke();
  circle(c, x, y, 5, '#c9ced6');
  c.strokeStyle = C.ironDark;
  c.lineWidth = 1.2;
  c.stroke();
}

function helmet(c: Ctx, x: number, y: number, r: number): void {
  c.fillStyle = C.iron;
  c.beginPath();
  c.arc(x, y, r, Math.PI, 0);
  c.closePath();
  c.fill();
  box(c, x - r - 1, y - 2, r * 2 + 2, 5, 2, C.ironDark);
  c.strokeStyle = C.ironDark;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(x, y - r);
  c.lineTo(x, y - 1);
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.45)';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(x, y, r - 3, Math.PI * 1.15, Math.PI * 1.45);
  c.stroke();
}

/** The hero, seen from behind: round shield on the back, iron helm, braids. */
function viking(c: Ctx, pose: Pose): void {
  if (pose === 'slide') {
    box(c, 4, 96, 28, 11, 4, C.trousers);
    box(c, 40, 96, 28, 11, 4, C.trousers);
    box(c, 0, 93, 9, 15, 3, C.boot);
    box(c, 63, 93, 9, 15, 3, C.boot);
    poly(c, [[22, 76], [50, 76], [55, 104], [17, 104]], C.tunic);
    box(c, 17, 98, 38, 5, 2, C.belt);
    box(c, 6, 80, 16, 8, 4, C.tunic);
    box(c, 50, 80, 16, 8, 4, C.tunic);
    circle(c, 6, 84, 4.5, C.skin);
    circle(c, 66, 84, 4.5, C.skin);
    circle(c, 36, 70, 10, C.hair);
    roundShield(c, 36, 91, 16);
    helmet(c, 36, 68, 11);
    return;
  }

  // Legs
  if (pose === 'jump') {
    box(c, 23, 74, 12, 20, 4, C.trousers);
    box(c, 37, 74, 12, 20, 4, C.trousers);
    box(c, 22, 90, 14, 9, 3, C.boot);
    box(c, 36, 90, 14, 9, 3, C.boot);
  } else {
    const planted = pose === 'run0' ? 23 : 37;
    const raised = pose === 'run0' ? 37 : 23;
    box(c, planted, 74, 12, 32, 4, C.trousers);
    box(c, planted - 1, 101, 14, 11, 3, C.boot);
    box(c, raised, 74, 12, 20, 4, C.trousers);
    box(c, raised - 1, 89, 14, 10, 3, C.boot);
    box(c, raised, 96, 12, 3, 1, C.sole);
  }

  // Torso
  poly(c, [[20, 44], [52, 44], [56, 84], [16, 84]], C.tunic);
  box(c, 16, 80, 40, 5, 2, C.tunicDark);
  box(c, 17, 71, 38, 6, 2, C.belt);
  box(c, 33, 70, 6, 8, 1, C.gold);

  // Arms (swing opposite to legs)
  const arms: Array<[number, number, number, number]> =
    pose === 'jump'
      ? [[7, 28, 9, 24], [56, 28, 9, 24]]
      : pose === 'run0'
        ? [[9, 50, 9, 22], [54, 45, 9, 19]]
        : [[9, 45, 9, 19], [54, 50, 9, 22]];
  for (const [x, y, w, h] of arms) {
    box(c, x, y, w, h, 4, C.tunic);
    circle(c, x + w / 2, pose === 'jump' ? y : y + h, 4.5, C.skin);
  }

  // Hair & braids, shield, helm
  circle(c, 36, 34, 11, C.hair);
  box(c, 27, 38, 5, 16, 2, C.hair);
  box(c, 40, 38, 5, 16, 2, C.hair);
  roundShield(c, 36, 62, 18);
  helmet(c, 36, 32, 12);
}

/**
 * Undead warrior shambling toward the player.
 * `lurch` draws the second shuffle frame: left foot dragged up, body shifted
 * ~4px sideways and the axe arm dipped, so alternating frames read as a lurch.
 */
function draugr(c: Ctx, lurch = false): void {
  const skin = '#7d9877';
  if (lurch) {
    box(c, 32, 108, 12, 34, 4, '#3b3a33'); // left leg dragged up
    box(c, 52, 108, 12, 40, 4, '#3b3a33');
    box(c, 30, 136, 16, 8, 3, '#22211c');
    box(c, 50, 142, 16, 8, 3, '#22211c');
  } else {
    box(c, 30, 108, 12, 40, 4, '#3b3a33');
    box(c, 48, 108, 12, 40, 4, '#3b3a33');
    box(c, 28, 142, 16, 8, 3, '#22211c');
    box(c, 46, 142, 16, 8, 3, '#22211c');
  }
  c.save();
  if (lurch) c.translate(4, 0); // upper body sways with the shuffle
  // tattered cloak
  poly(c, [[16, 52], [74, 52], [80, 130], [70, 122], [62, 134], [52, 124], [42, 136], [32, 124], [22, 132], [10, 130]], '#26302c');
  // mail shirt
  box(c, 26, 54, 38, 58, 6, '#56615b');
  c.fillStyle = 'rgba(20,25,22,0.45)';
  for (let y = 60; y < 108; y += 6) for (let x = 30 + ((y / 6) % 2) * 3; x < 62; x += 6) c.fillRect(x, y, 2, 2);
  box(c, 26, 96, 38, 6, 2, '#3b2d20');
  // left arm hanging, clawed
  box(c, 14, 58, 10, 40, 4, skin);
  poly(c, [[13, 96], [25, 96], [23, 104], [19, 100], [15, 104]], '#5f7a5a');
  // right arm raised with axe (dipped slightly on the lurch frame)
  c.save();
  if (lurch) {
    c.translate(71, 64);
    c.rotate(0.12);
    c.translate(-71, -64);
  }
  box(c, 66, 30, 10, 34, 4, skin);
  c.strokeStyle = '#5b3d26';
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(72, 8);
  c.lineTo(72, 66);
  c.stroke();
  poly(c, [[72, 10], [88, 3], [91, 27], [72, 24]], '#8f969f', '#5a5f68', 1.5);
  c.strokeStyle = 'rgba(255,255,255,0.6)';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(88, 5);
  c.lineTo(90, 25);
  c.stroke();
  c.restore();
  // head
  circle(c, 45, 38, 14, skin);
  poly(c, [[33, 44], [57, 44], [53, 60], [45, 66], [37, 60]], '#a7aaa2'); // ragged beard
  box(c, 37, 46, 16, 3, 1, '#2b2b26');
  c.fillStyle = '#26302a';
  c.beginPath();
  c.ellipse(39, 37, 4.5, 3.5, 0, 0, TAU);
  c.ellipse(51, 37, 4.5, 3.5, 0, 0, TAU);
  c.fill();
  c.save();
  c.shadowColor = '#7dffd8';
  c.shadowBlur = 8;
  circle(c, 39, 37, 2, '#c8fff0');
  circle(c, 51, 37, 2, '#c8fff0');
  c.restore();
  // rusted helm
  c.fillStyle = '#6f5a45';
  c.beginPath();
  c.arc(45, 33, 15, Math.PI, 0);
  c.closePath();
  c.fill();
  box(c, 29, 31, 32, 5, 2, '#4e3f31');
  box(c, 43, 31, 4, 10, 1, '#4e3f31');
  c.restore();
}

/** Giant raven (Huginn & Muninn's angrier cousins). Two wing frames. */
function raven(c: Ctx, wingsUp: boolean): void {
  const wing = '#1c1c27';
  const left: Array<[number, number]> = wingsUp
    ? [[52, 36], [30, 10], [8, 4], [14, 14], [3, 18], [16, 24], [7, 30], [26, 34], [42, 44]]
    : [[52, 36], [28, 44], [6, 58], [18, 56], [10, 66], [26, 60], [24, 69], [40, 54], [50, 47]];
  const right = left.map(([x, y]) => [120 - x, y] as [number, number]);
  poly(c, left, wing, '#3a3f5c', 1.5);
  poly(c, right, wing, '#3a3f5c', 1.5);
  poly(c, [[52, 54], [68, 54], [66, 68], [60, 63], [54, 68]], '#14141c');
  c.fillStyle = '#15151d';
  c.beginPath();
  c.ellipse(60, 40, 14, 19, 0, 0, TAU);
  c.fill();
  circle(c, 60, 22, 9.5, '#15151d');
  poly(c, [[55, 25], [65, 25], [60, 39]], '#3d3d44');
  c.save();
  c.shadowColor = '#ff4b3a';
  c.shadowBlur = 7;
  circle(c, 55.5, 20, 2.2, '#ff7a63');
  circle(c, 64.5, 20, 2.2, '#ff7a63');
  c.restore();
  c.strokeStyle = rgba('#7d86b8', 0.35);
  c.lineWidth = 1;
  c.beginPath();
  c.ellipse(60, 40, 9, 14, 0, Math.PI * 1.1, Math.PI * 1.6);
  c.stroke();
}

export function generateCharacterTextures(scene: Phaser.Scene): void {
  // Baked runner sheets (BootScene.preload) replace the procedural hero.
  if (!scene.textures.exists('viking_run')) {
    makeTexture(scene, 'viking_run0', 72, 112, (c) => viking(c, 'run0'));
    makeTexture(scene, 'viking_run1', 72, 112, (c) => viking(c, 'run1'));
    makeTexture(scene, 'viking_jump', 72, 112, (c) => viking(c, 'jump'));
    makeTexture(scene, 'viking_slide', 72, 112, (c) => viking(c, 'slide'));
  }
  // Two-frame draugr shuffle: 'draugr' (frame 0, unchanged) + 'draugr1' (lurch).
  makeTexture(scene, 'draugr', 92, 150, (c) => draugr(c));
  makeTexture(scene, 'draugr1', 92, 150, (c) => draugr(c, true));
  makeTexture(scene, 'raven0', 120, 72, (c) => raven(c, true));
  makeTexture(scene, 'raven1', 120, 72, (c) => raven(c, false));
}
