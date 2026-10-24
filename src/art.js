// All the game's graphics, drawn once at startup with the Canvas 2D API and stored as
// Phaser textures. No image files needed.
import {
  GAME_W, GAME_H, FIELD, CORNER_R, MID_Y, CENTER_X, GOAL_W, GOAL_DEPTH,
  MOUTH_L, MOUTH_R, POST_R, PLAYER_R, BALL_R, PALETTE as C, FONTS,
} from './config.js';

// Sprites are drawn at 2x and shown at half scale so they stay sharp.
export const SPRITE_SCALE = 0.5;
const S = 2;

const CROWD = [C.pink, C.yellow, C.cyan, C.purple, '#ff8a3d', '#ffffff', '#3dd68c', C.p1, C.p2];
const SKIN = ['#f5c9a0', '#d9a074', '#a86b45', '#7a4a2c', '#ffd9b8'];

export function makeTextures(scene) {
  const tex = scene.textures;
  if (tex.exists('field')) return; // textures are global; only build them once

  canvasTexture(tex, 'field', GAME_W, GAME_H, drawStadium);
  canvasTexture(tex, 'menuBg', GAME_W, GAME_H, drawMenuBg);

  const pSize = (PLAYER_R + 5) * 2 * S;
  canvasTexture(tex, 'p1', pSize, pSize, (ctx) => drawPlayer(ctx, pSize, { pattern: 'solid', colors: [C.p1] }, '10'));
  canvasTexture(tex, 'p2', pSize, pSize, (ctx) => drawPlayer(ctx, pSize, { pattern: 'solid', colors: [C.p2] }, '9'));
  canvasTexture(tex, 'trophy', 240, 300, drawTrophy);
  canvasTexture(tex, 'robot', 160, 160, drawRobot);
  canvasTexture(tex, 'chili', 56, 72, drawChili);
  canvasTexture(tex, 'ice', 64 * S, 64 * S, (ctx) => drawIce(ctx, 64 * S));
  canvasTexture(tex, 'soap', 64 * S, 64 * S, (ctx) => drawSoap(ctx, 64 * S));
  canvasTexture(tex, 'bigGoal', 64 * S, 64 * S, (ctx) => drawBigGoal(ctx, 64 * S));
  canvasTexture(tex, 'hole', 180, 160, drawHole);
  canvasTexture(tex, 'dirt', 200, 200, drawDirt);
  canvasTexture(tex, 'grow', 64 * S, 64 * S, (ctx) => drawMushroom(ctx, 64 * S));
  canvasTexture(tex, 'shrink', 64 * S, 64 * S, (ctx) => drawShrinkPotion(ctx, 64 * S));
  canvasTexture(tex, 'target', 100 * S, 100 * S, (ctx) => drawTarget(ctx, 100 * S));

  const bSize = (BALL_R + 3) * 2 * S;
  canvasTexture(tex, 'ball', bSize, bSize, (ctx) => drawBall(ctx, bSize));
  canvasTexture(tex, 'burst', 160, 160, (ctx) => drawBurst(ctx, 160));
}

// Player texture for a team kit, built the first time it's needed. Returns its key.
export function kitTexture(scene, kit, number) {
  const key = `kit-${kit.pattern}-${kit.colors.join('-')}-${number}`;
  if (!scene.textures.exists(key)) {
    const size = (PLAYER_R + 5) * 2 * S;
    canvasTexture(scene.textures, key, size, size, (ctx) => drawPlayer(ctx, size, kit, number));
  }
  return key;
}

function canvasTexture(tex, key, w, h, draw) {
  const t = tex.createCanvas(key, w, h);
  draw(t.context, w, h);
  t.refresh();
}

// Small deterministic RNG so the crowd looks the same every time.
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rand, list) {
  return list[Math.floor(rand() * list.length)];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function drawCrowd(ctx, x, y, w, h, rand) {
  for (let row = y; row < y + h; row += 15) {
    for (let col = x + (rand() * 6); col < x + w; col += 12 + rand() * 4) {
      const cy = row + rand() * 4;
      ctx.fillStyle = pick(rand, CROWD);
      circle(ctx, col, cy + 6, 6.5);
      ctx.fill();
      ctx.fillStyle = pick(rand, SKIN);
      circle(ctx, col, cy, 4.2);
      ctx.fill();
    }
  }
}

// ---------- match background: stands, boards, pitch, goals ----------

function drawStadium(ctx, w, h) {
  const rand = rng(7);
  const { left, right, top, bottom } = FIELD;
  const fw = right - left;
  const fh = bottom - top;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#34197a');
  bg.addColorStop(1, '#22114f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  drawCrowd(ctx, 0, 0, w, h, rand);

  // Darken the crowd so the pitch pops.
  ctx.fillStyle = 'rgba(29, 18, 64, 0.45)';
  ctx.fillRect(0, 0, w, h);

  // Advertising boards ring.
  const m = 50;
  roundRect(ctx, left - 28, top - m, fw + 56, fh + m * 2, CORNER_R + 30);
  ctx.fillStyle = C.ink;
  ctx.fill();
  const band = ctx.createLinearGradient(0, 0, w, 0);
  band.addColorStop(0, C.pink);
  band.addColorStop(0.5, C.purple);
  band.addColorStop(1, C.pink);
  roundRect(ctx, left - 22, top - m + 6, fw + 44, fh + m * 2 - 12, CORNER_R + 24);
  ctx.fillStyle = band;
  ctx.fill();
  ctx.setLineDash([26, 18]);
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.yellow;
  roundRect(ctx, left - 15, top - m + 13, fw + 30, fh + m * 2 - 26, CORNER_R + 17);
  ctx.stroke();
  ctx.setLineDash([]);
  roundRect(ctx, left - 10, top - m + 18, fw + 20, fh + m * 2 - 36, CORNER_R + 12);
  ctx.fillStyle = C.apron;
  ctx.fill();

  drawNet(ctx, top - GOAL_DEPTH, false);
  drawNet(ctx, bottom, true);

  // Pitch with mowing stripes, clipped to the rounded rectangle.
  ctx.save();
  roundRect(ctx, left, top, fw, fh, CORNER_R);
  ctx.clip();
  const stripes = 12;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? C.grassA : C.grassB;
    ctx.fillRect(left, top + (fh / stripes) * i, fw, fh / stripes + 1);
  }
  // Diagonal sheen and a soft spotlight in the middle.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let d = -fh; d < fw + fh; d += 70) {
    ctx.beginPath();
    ctx.moveTo(left + d, top);
    ctx.lineTo(left + d + 35, top);
    ctx.lineTo(left + d + 35 - fh * 0.6, bottom);
    ctx.lineTo(left + d - fh * 0.6, bottom);
    ctx.fill();
  }
  const glow = ctx.createRadialGradient(CENTER_X, MID_Y, 50, CENTER_X, MID_Y, fh * 0.65);
  glow.addColorStop(0, 'rgba(255, 255, 200, 0.18)');
  glow.addColorStop(1, 'rgba(20, 60, 0, 0.18)');
  ctx.fillStyle = glow;
  ctx.fillRect(left, top, fw, fh);
  ctx.restore();

  // Markings, with a little cartoon drop shadow.
  ctx.save();
  ctx.shadowColor = 'rgba(29, 18, 64, 0.35)';
  ctx.shadowOffsetY = 3;
  ctx.strokeStyle = C.white;
  ctx.fillStyle = C.white;
  ctx.lineWidth = 5;

  ctx.beginPath();
  ctx.moveTo(left, MID_Y);
  ctx.lineTo(right, MID_Y);
  ctx.stroke();
  circle(ctx, CENTER_X, MID_Y, 95);
  ctx.stroke();
  circle(ctx, CENTER_X, MID_Y, 8);
  ctx.fill();

  const boxW = GOAL_W + 200;
  const boxD = 140;
  const smallW = GOAL_W + 70;
  const smallD = 55;
  const spotD = 105;
  const arcR = 80;
  const a = Math.asin((boxD - spotD) / arcR);
  for (const end of [{ y: top, dir: 1 }, { y: bottom, dir: -1 }]) {
    ctx.strokeRect(CENTER_X - boxW / 2, end.dir > 0 ? end.y : end.y - boxD, boxW, boxD);
    ctx.strokeRect(CENTER_X - smallW / 2, end.dir > 0 ? end.y : end.y - smallD, smallW, smallD);
    const spotY = end.y + end.dir * spotD;
    circle(ctx, CENTER_X, spotY, 5);
    ctx.fill();
    ctx.beginPath();
    if (end.dir > 0) ctx.arc(CENTER_X, spotY, arcR, a, Math.PI - a);
    else ctx.arc(CENTER_X, spotY, arcR, Math.PI + a, Math.PI * 2 - a);
    ctx.stroke();
  }
  ctx.restore();

  // Thick ink border, then the white touchline on top.
  roundRect(ctx, left, top, fw, fh, CORNER_R);
  ctx.lineWidth = 14;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = C.white;
  ctx.stroke();

  // Posts.
  for (const [x, y] of [[MOUTH_L, top], [MOUTH_R, top], [MOUTH_L, bottom], [MOUTH_R, bottom]]) {
    circle(ctx, x, y, POST_R);
    ctx.fillStyle = C.white;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  }
}

function drawNet(ctx, y, isBottom) {
  const x = MOUTH_L;
  ctx.fillStyle = 'rgba(29, 18, 64, 0.55)';
  ctx.fillRect(x, y, GOAL_W, GOAL_DEPTH);
  // Criss-cross netting, clipped to the goal box.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, GOAL_W, GOAL_DEPTH);
  ctx.clip();
  ctx.beginPath();
  for (let i = -GOAL_DEPTH; i < GOAL_W + GOAL_DEPTH; i += 10) {
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + GOAL_DEPTH, y + GOAL_DEPTH);
    ctx.moveTo(x + i + GOAL_DEPTH, y);
    ctx.lineTo(x + i, y + GOAL_DEPTH);
  }
  ctx.stroke();
  ctx.restore();

  // Frame: back bar and side bars (the open side faces the pitch).
  const backY = isBottom ? y + GOAL_DEPTH : y;
  ctx.lineCap = 'round';
  for (const [w, color] of [[9, C.ink], [4, C.white]]) {
    ctx.lineWidth = w;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(MOUTH_L, isBottom ? y : y + GOAL_DEPTH);
    ctx.lineTo(MOUTH_L, backY);
    ctx.lineTo(MOUTH_R, backY);
    ctx.lineTo(MOUTH_R, isBottom ? y : y + GOAL_DEPTH);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

// ---------- menu background: sky, tilted stands, tilted pitch ----------

function drawMenuBg(ctx, w, h) {
  const rand = rng(21);
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.4);
  sky.addColorStop(0, '#2fb8ff');
  sky.addColorStop(1, '#a6ecff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Clouds.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  for (const [cx, cy, s] of [[120, 90, 1.2], [520, 60, 1], [720, 170, 0.8], [330, 190, 0.7]]) {
    for (const [dx, dy, r] of [[0, 0, 34], [36, -14, 28], [70, 2, 30], [34, 14, 30]]) {
      circle(ctx, cx + dx * s, cy + dy * s, r * s);
      ctx.fill();
    }
  }

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.16);
  ctx.translate(-w, -h / 2);
  const bigW = w * 2;

  // Stands band.
  const standsY = 180;
  const standsH = 230;
  ctx.fillStyle = C.purpleDark;
  ctx.fillRect(0, standsY, bigW, standsH);
  drawCrowd(ctx, 0, standsY + 10, bigW, standsH - 30, rand);
  ctx.fillStyle = 'rgba(29, 18, 64, 0.25)';
  ctx.fillRect(0, standsY, bigW, standsH);
  ctx.fillStyle = C.pink;
  ctx.fillRect(0, standsY + standsH - 26, bigW, 26);
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, standsY + standsH - 30, bigW, 5);
  ctx.fillRect(0, standsY + standsH, bigW, 6);

  // Pitch stripes.
  const pitchY = standsY + standsH + 6;
  for (let i = 0; pitchY + i * 110 < h * 2; i++) {
    ctx.fillStyle = i % 2 ? C.grassA : C.grassB;
    ctx.fillRect(0, pitchY + i * 110, bigW, 110);
  }
  ctx.fillStyle = C.white;
  ctx.fillRect(0, pitchY + 70, bigW, 10);
  ctx.restore();

  // Light vignette at the bottom so text stays readable.
  const shade = ctx.createLinearGradient(0, h * 0.55, 0, h);
  shade.addColorStop(0, 'rgba(29, 18, 64, 0)');
  shade.addColorStop(1, 'rgba(29, 18, 64, 0.55)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
}

// ---------- sprites ----------

function drawPlayer(ctx, size, kit, number) {
  const c = size / 2;
  const r = PLAYER_R * S - 2 * S;

  ctx.save();
  circle(ctx, c, c, r);
  ctx.clip();
  drawKitPattern(ctx, c, r, kit);
  // Cel shading: darker toward the bottom-right edge.
  const shade = ctx.createRadialGradient(c - r * 0.25, c - r * 0.25, r * 0.55, c, c, r * 1.05);
  shade.addColorStop(0, 'rgba(29, 18, 64, 0)');
  shade.addColorStop(1, 'rgba(29, 18, 64, 0.4)');
  ctx.fillStyle = shade;
  ctx.fillRect(c - r, c - r, r * 2, r * 2);
  ctx.restore();

  // Shine.
  ctx.save();
  ctx.translate(c - r * 0.38, c - r * 0.45);
  ctx.rotate(-0.6);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.3, r * 0.15, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fill();
  ctx.restore();

  ctx.font = `${17 * S}px ${FONTS.title}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 5 * S;
  ctx.strokeStyle = C.ink;
  ctx.strokeText(number, c, c + 1 * S);
  ctx.fillStyle = C.white;
  ctx.fillText(number, c, c + 1 * S);

  circle(ctx, c, c, r);
  ctx.lineWidth = 4 * S;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
}

// Fills the square around the (already clipped) player circle with the kit pattern.
function drawKitPattern(ctx, c, r, kit) {
  const [main, second = main] = kit.colors;
  const x0 = c - r;
  const d = r * 2;
  ctx.fillStyle = main;
  ctx.fillRect(x0, x0, d, d);
  ctx.fillStyle = second;

  switch (kit.pattern) {
    case 'stripes': {
      const w = d / 5;
      for (let i = 1; i < 5; i += 2) ctx.fillRect(x0 + i * w, x0, w, d);
      break;
    }
    case 'band':
      ctx.fillRect(x0, c - d * 0.17, d, d * 0.34);
      break;
    case 'sash':
      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-r * 1.5, -r * 0.24, r * 3, r * 0.48);
      ctx.restore();
      break;
    case 'halves':
      ctx.fillRect(c, x0, r, d);
      break;
    case 'checks': { // checkerboard (Croatia)
      const n = 5;
      const sq = d / n;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) if ((i + j) % 2) ctx.fillRect(x0 + i * sq, x0 + j * sq, sq + 0.5, sq + 0.5);
      }
      break;
    }
    case 'v':
      ctx.beginPath();
      ctx.moveTo(x0, x0);
      ctx.lineTo(c, c + r * 0.45);
      ctx.lineTo(x0 + d, x0);
      ctx.lineWidth = r * 0.42;
      ctx.lineJoin = 'miter';
      ctx.strokeStyle = second;
      ctx.stroke();
      break;
    case 'trim':
      circle(ctx, c, c, r * 0.86);
      ctx.lineWidth = r * 0.16;
      ctx.strokeStyle = second;
      ctx.stroke();
      break;
    default: // solid
  }
}

// Cartoon ice cube seen from slightly above: light blue block with a lighter top face.
function drawIce(ctx, size) {
  const s = size / 64;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.5 * s;
  ctx.strokeStyle = C.ink;
  // Body.
  roundRect(ctx, 10 * s, 18 * s, 44 * s, 38 * s, 7 * s);
  ctx.fillStyle = '#7fd6ff';
  ctx.fill();
  ctx.stroke();
  // Top face.
  roundRect(ctx, 10 * s, 8 * s, 44 * s, 18 * s, 7 * s);
  ctx.fillStyle = '#d4f4ff';
  ctx.fill();
  ctx.stroke();
  // Shine streaks.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(17 * s, 32 * s);
  ctx.lineTo(17 * s, 46 * s);
  ctx.moveTo(23 * s, 32 * s);
  ctx.lineTo(23 * s, 38 * s);
  ctx.stroke();
  // Little snowflake on the top face.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2 * s;
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(40 * s - Math.cos(a) * 5 * s, 17 * s - Math.sin(a) * 3 * s);
    ctx.lineTo(40 * s + Math.cos(a) * 5 * s, 17 * s + Math.sin(a) * 3 * s);
    ctx.stroke();
  }
}

// Pink bar of soap with bubbles.
// Pothole for the bad pitch, seen from above at 2x: torn-up dirt around it, a dirt rim,
// and a hole that gets darker toward the bottom so it reads as deep. Light comes from
// the top-left, so the inner wall is lit at the bottom-right and in shadow at the top.
function drawHole(ctx, w, h) {
  const cx = w / 2;
  const cy = h / 2 + 4;
  const rand = rng(7);

  // Torn-up dirt and dead grass around it (irregular blob).
  for (let i = 0; i < 22; i++) {
    const a = rand() * Math.PI * 2;
    const d = 34 + rand() * 20;
    circle(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, 12 + rand() * 12);
    ctx.fillStyle = rand() < 0.5 ? 'rgba(150, 110, 62, 0.75)' : 'rgba(128, 92, 50, 0.75)';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(cx, cy, 64, 52, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#8c6435';
  ctx.fill();

  // Rim.
  ctx.beginPath();
  ctx.ellipse(cx, cy, 52, 41, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#6a4523';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(29, 18, 64, 0.8)';
  ctx.stroke();

  // The hole: dark radial gradient, deepest a bit below the middle.
  const deep = ctx.createRadialGradient(cx + 6, cy + 8, 4, cx, cy, 46);
  deep.addColorStop(0, '#0a0503');
  deep.addColorStop(0.55, '#24150a');
  deep.addColorStop(1, '#4e3119');
  ctx.beginPath();
  ctx.ellipse(cx, cy, 44, 34, 0, 0, Math.PI * 2);
  ctx.fillStyle = deep;
  ctx.fill();

  // Inner wall: shadow along the top, lit edge along the bottom-right.
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 40, 30, 0, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(196, 150, 96, 0.8)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 41, 31, 0, Math.PI * 0.05, Math.PI * 0.75);
  ctx.stroke();

  // Pebbles on the rim and grass tufts sticking out of the dirt.
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2;
    circle(ctx, cx + Math.cos(a) * 58, cy + Math.sin(a) * 46, 3 + rand() * 3);
    ctx.fillStyle = rand() < 0.5 ? '#c9b28a' : '#9d8a6a';
    ctx.fill();
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const a = rand() * Math.PI * 2;
    const x = cx + Math.cos(a) * (62 + rand() * 8);
    const y = cy + Math.sin(a) * (50 + rand() * 6);
    ctx.lineWidth = 3;
    ctx.strokeStyle = rand() < 0.5 ? '#6fae2a' : '#8bbf3a';
    for (const dx of [-3, 0, 3]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, y + 4);
      ctx.lineTo(x + dx * 1.6, y - 6 - rand() * 4);
      ctx.stroke();
    }
  }
}

// Worn patch of dry grass and dirt (soft-edged, irregular) for the bad pitch.
function drawDirt(ctx, w, h) {
  const rand = rng(21);
  for (let i = 0; i < 26; i++) {
    const x = w / 2 + (rand() - 0.5) * w * 0.55;
    const y = h / 2 + (rand() - 0.5) * h * 0.55;
    const r = 18 + rand() * 26;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const tone = rand() < 0.5 ? '140, 100, 55' : '165, 128, 72';
    g.addColorStop(0, `rgba(${tone}, 0.55)`);
    g.addColorStop(1, `rgba(${tone}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // A few loose clods.
  for (let i = 0; i < 10; i++) {
    circle(ctx, w / 2 + (rand() - 0.5) * w * 0.5, h / 2 + (rand() - 0.5) * h * 0.5, 2 + rand() * 3);
    ctx.fillStyle = 'rgba(95, 65, 35, 0.8)';
    ctx.fill();
  }
}

// "Arco gigante" power-up: a little goal (posts, crossbar, net) on a yellow badge with
// arrows pointing out on both sides.
function drawBigGoal(ctx, size) {
  const s = size / 64;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  circle(ctx, 32 * s, 32 * s, 27 * s);
  ctx.fillStyle = C.yellow;
  ctx.fill();
  ctx.lineWidth = 3.5 * s;
  ctx.strokeStyle = C.ink;
  ctx.stroke();

  // Net.
  ctx.fillStyle = 'rgba(29, 18, 64, 0.35)';
  ctx.fillRect(20 * s, 22 * s, 24 * s, 16 * s);
  ctx.strokeStyle = 'rgba(29, 18, 64, 0.55)';
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  for (let x = 24; x < 44; x += 5) {
    ctx.moveTo(x * s, 22 * s);
    ctx.lineTo(x * s, 38 * s);
  }
  for (let y = 27; y < 38; y += 5) {
    ctx.moveTo(20 * s, y * s);
    ctx.lineTo(44 * s, y * s);
  }
  ctx.stroke();
  // Frame.
  for (const [w, color] of [[6, C.ink], [3, C.white]]) {
    ctx.lineWidth = w * s;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(20 * s, 40 * s);
    ctx.lineTo(20 * s, 22 * s);
    ctx.lineTo(44 * s, 22 * s);
    ctx.lineTo(44 * s, 40 * s);
    ctx.stroke();
  }
  // Arrows pointing out.
  for (const dir of [-1, 1]) {
    const x0 = 32 + dir * 14;
    const tip = 32 + dir * 25;
    const arrow = [
      { x: x0, y: 46 }, { x: tip - dir * 6, y: 46 }, { x: tip - dir * 6, y: 42 },
      { x: tip, y: 49 }, { x: tip - dir * 6, y: 56 }, { x: tip - dir * 6, y: 52 }, { x: x0, y: 52 },
    ];
    ctx.beginPath();
    arrow.forEach((p, i) => (i ? ctx.lineTo(p.x * s, p.y * s) : ctx.moveTo(p.x * s, p.y * s)));
    ctx.closePath();
    ctx.fillStyle = C.p2;
    ctx.fill();
    ctx.lineWidth = 2.5 * s;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  }
}

function drawSoap(ctx, size) {
  const s = size / 64;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.5 * s;
  ctx.strokeStyle = C.ink;
  ctx.save();
  ctx.translate(32 * s, 38 * s);
  ctx.rotate(-0.25);
  roundRect(ctx, -22 * s, -12 * s, 44 * s, 26 * s, 11 * s);
  ctx.fillStyle = '#ff7ac0';
  ctx.fill();
  ctx.stroke();
  roundRect(ctx, -16 * s, -8 * s, 32 * s, 12 * s, 6 * s);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.fill();
  ctx.restore();
  // Bubbles.
  for (const [x, y, r] of [[18, 14, 7], [32, 8, 5], [44, 16, 6], [50, 6, 3.5]]) {
    circle(ctx, x * s, y * s, r * s);
    ctx.fillStyle = 'rgba(220, 245, 255, 0.85)';
    ctx.fill();
    ctx.lineWidth = 2 * s;
    ctx.stroke();
    circle(ctx, (x - r * 0.35) * s, (y - r * 0.35) * s, r * 0.28 * s);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
}

// Green mushroom with white spots and an up arrow: "you get bigger".
function drawMushroom(ctx, size) {
  const s = size / 64;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.5 * s;
  ctx.strokeStyle = C.ink;
  // Stem with a little face.
  roundRect(ctx, 22 * s, 32 * s, 20 * s, 24 * s, 7 * s);
  ctx.fillStyle = '#fff1d6';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.ink;
  for (const x of [28, 36]) {
    roundRect(ctx, (x - 1.5) * s, 39 * s, 3 * s, 7 * s, 1.5 * s);
    ctx.fill();
  }
  // Cap.
  ctx.beginPath();
  ctx.moveTo(6 * s, 36 * s);
  ctx.quadraticCurveTo(6 * s, 6 * s, 32 * s, 6 * s);
  ctx.quadraticCurveTo(58 * s, 6 * s, 58 * s, 36 * s);
  ctx.closePath();
  ctx.fillStyle = '#3ddc84';
  ctx.fill();
  ctx.stroke();
  // Spots.
  ctx.fillStyle = '#ffffff';
  for (const [x, y, r] of [[32, 17, 6], [16, 28, 4.5], [48, 28, 4.5]]) {
    circle(ctx, x * s, y * s, r * s);
    ctx.fill();
    ctx.lineWidth = 2 * s;
    ctx.stroke();
  }
  // Up arrow badge.
  circle(ctx, 52 * s, 50 * s, 10 * s);
  ctx.fillStyle = C.yellow;
  ctx.fill();
  ctx.lineWidth = 2.5 * s;
  ctx.stroke();
  arrow(ctx, 52 * s, 50 * s, 6 * s, -1);
}

// Purple potion bottle with a down arrow: "your rival gets smaller".
function drawShrinkPotion(ctx, size) {
  const s = size / 64;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.5 * s;
  ctx.strokeStyle = C.ink;
  // Neck and cork.
  roundRect(ctx, 25 * s, 4 * s, 14 * s, 9 * s, 3 * s);
  ctx.fillStyle = '#c98a4b';
  ctx.fill();
  ctx.stroke();
  roundRect(ctx, 26 * s, 12 * s, 12 * s, 12 * s, 2 * s);
  ctx.fillStyle = '#e6dcff';
  ctx.fill();
  ctx.stroke();
  // Round flask.
  circle(ctx, 32 * s, 40 * s, 19 * s);
  ctx.fillStyle = '#e6dcff';
  ctx.fill();
  ctx.stroke();
  // Liquid.
  ctx.save();
  circle(ctx, 32 * s, 40 * s, 17 * s);
  ctx.clip();
  ctx.fillStyle = '#9b5cff';
  ctx.fillRect(10 * s, 36 * s, 44 * s, 26 * s);
  ctx.restore();
  // Shine.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.arc(32 * s, 40 * s, 12 * s, Math.PI * 1.1, Math.PI * 1.45);
  ctx.stroke();
  // Down arrow badge.
  ctx.strokeStyle = C.ink;
  circle(ctx, 52 * s, 50 * s, 10 * s);
  ctx.fillStyle = C.yellow;
  ctx.fill();
  ctx.lineWidth = 2.5 * s;
  ctx.stroke();
  arrow(ctx, 52 * s, 50 * s, 6 * s, 1);
}

// Small filled arrow centred on (x, y): dir -1 points up, 1 points down.
function arrow(ctx, x, y, r, dir) {
  ctx.beginPath();
  ctx.moveTo(x, y + dir * r);
  ctx.lineTo(x - r, y - dir * r * 0.1);
  ctx.lineTo(x - r * 0.4, y - dir * r * 0.1);
  ctx.lineTo(x - r * 0.4, y - dir * r);
  ctx.lineTo(x + r * 0.4, y - dir * r);
  ctx.lineTo(x + r * 0.4, y - dir * r * 0.1);
  ctx.lineTo(x + r, y - dir * r * 0.1);
  ctx.closePath();
  ctx.fillStyle = C.ink;
  ctx.fill();
}

// Red and white bullseye painted on the grass under each power-up: "hit this with the ball".
function drawTarget(ctx, size) {
  const c = size / 2;
  const r = c - 4 * S;
  const rings = [C.p2, C.white, C.p2, C.white, C.p2];
  rings.forEach((color, i) => {
    circle(ctx, c, c, r * (1 - i / rings.length));
    ctx.fillStyle = color;
    ctx.fill();
  });
  circle(ctx, c, c, r);
  ctx.lineWidth = 3 * S;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
}

// Robot head for the "VS BOT" menu card.
function drawRobot(ctx, w) {
  const cx = w / 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink;

  // Antenna.
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(cx, 44);
  ctx.lineTo(cx, 18);
  ctx.stroke();
  circle(ctx, cx, 16, 11);
  ctx.fillStyle = C.pink;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.stroke();

  // Ears.
  for (const side of [-1, 1]) {
    roundRect(ctx, cx + side * 62 - 10, 74, 20, 36, 6);
    ctx.fillStyle = C.purple;
    ctx.fill();
    ctx.stroke();
  }

  // Head.
  const metal = ctx.createLinearGradient(0, 40, 0, 150);
  metal.addColorStop(0, '#e3ebff');
  metal.addColorStop(1, '#93a6dc');
  roundRect(ctx, cx - 54, 40, 108, 104, 24);
  ctx.fillStyle = metal;
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.stroke();

  // Visor with glowing eyes.
  roundRect(ctx, cx - 40, 58, 80, 42, 16);
  ctx.fillStyle = C.ink;
  ctx.fill();
  for (const side of [-1, 1]) {
    circle(ctx, cx + side * 19, 79, 10);
    ctx.fillStyle = C.cyan;
    ctx.fill();
    circle(ctx, cx + side * 19 - 3, 75, 3.5);
    ctx.fillStyle = C.white;
    ctx.fill();
  }

  // Grill mouth.
  roundRect(ctx, cx - 24, 112, 48, 18, 6);
  ctx.fillStyle = C.white;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.lineWidth = 3;
  for (const dx of [-8, 8]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx, 114);
    ctx.lineTo(cx + dx, 128);
    ctx.stroke();
  }

  // Shine.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath();
  ctx.ellipse(cx - 34, 52, 10, 5, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

// Little chili pepper: the bot difficulty is shown as 1, 2 or 3 of them.
function drawChili(ctx, w, h) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink;

  // Body, curving down to the tip.
  ctx.beginPath();
  ctx.moveTo(w * 0.4, h * 0.3);
  ctx.bezierCurveTo(w * 0.08, h * 0.38, w * 0.06, h * 0.78, w * 0.26, h * 0.94);
  ctx.bezierCurveTo(w * 0.42, h * 0.86, w * 0.86, h * 0.64, w * 0.74, h * 0.3);
  ctx.closePath();
  ctx.fillStyle = '#ff3b30';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(w * 0.36, h * 0.5, w * 0.06, h * 0.13, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Stem and cap.
  for (const [width, color] of [[11, C.ink], [5, '#3dd68c']]) {
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(w * 0.56, h * 0.3);
    ctx.quadraticCurveTo(w * 0.56, h * 0.12, w * 0.76, h * 0.07);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(w * 0.57, h * 0.3, w * 0.2, h * 0.07, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#3dd68c';
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 5;
  ctx.stroke();
}

function drawTrophy(ctx, w, h) {
  const cx = w / 2;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 8;
  ctx.strokeStyle = C.ink;
  const gold = ctx.createLinearGradient(0, 0, w, 0);
  gold.addColorStop(0, '#f7b500');
  gold.addColorStop(0.45, '#ffe680');
  gold.addColorStop(1, '#e09a00');

  // Handles.
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + side * 78, 80, 34, 44, 0, 0, Math.PI * 2);
    ctx.lineWidth = 22;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#f7c600';
    ctx.stroke();
  }

  // Cup.
  ctx.lineWidth = 8;
  ctx.strokeStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(cx - 80, 24);
  ctx.lineTo(cx + 80, 24);
  ctx.quadraticCurveTo(cx + 80, 150, cx + 18, 168);
  ctx.lineTo(cx + 18, 205);
  ctx.lineTo(cx - 18, 205);
  ctx.lineTo(cx - 18, 168);
  ctx.quadraticCurveTo(cx - 80, 150, cx - 80, 24);
  ctx.closePath();
  ctx.fillStyle = gold;
  ctx.fill();
  ctx.stroke();

  // Base.
  roundRect(ctx, cx - 62, 205, 124, 30, 6);
  ctx.fillStyle = gold;
  ctx.fill();
  ctx.stroke();
  roundRect(ctx, cx - 82, 235, 164, 46, 8);
  ctx.fillStyle = C.purple;
  ctx.fill();
  ctx.stroke();

  // Shine and a star.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(cx - 40, 70, 12, 34, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.white;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? 9 : 22;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    ctx.lineTo(cx + 10 + Math.cos(a) * rr, 88 + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.stroke();
}

function drawBall(ctx, size) {
  const c = size / 2;
  const r = BALL_R * S;

  circle(ctx, c, c, r);
  ctx.fillStyle = C.white;
  ctx.fill();

  ctx.save();
  circle(ctx, c, c, r);
  ctx.clip();
  ctx.fillStyle = C.ink;
  pentagon(ctx, c, c, r * 0.36, -Math.PI / 2);
  for (let i = 0; i < 5; i++) {
    const ang = -Math.PI / 2 + Math.PI / 5 + (i * 2 * Math.PI) / 5;
    pentagon(ctx, c + Math.cos(ang) * r * 0.98, c + Math.sin(ang) * r * 0.98, r * 0.32, ang + Math.PI / 2);
    // Seams from the centre patch to the outer ones.
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(ang) * r * 0.32, c + Math.sin(ang) * r * 0.32);
    ctx.lineTo(c + Math.cos(ang) * r * 0.7, c + Math.sin(ang) * r * 0.7);
    ctx.lineWidth = 1.5 * S;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  }
  const shade = ctx.createRadialGradient(c - r * 0.4, c - r * 0.4, r * 0.2, c, c, r * 1.1);
  shade.addColorStop(0, 'rgba(255, 255, 255, 0)');
  shade.addColorStop(1, 'rgba(29, 18, 64, 0.35)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  circle(ctx, c, c, r);
  ctx.lineWidth = 2.5 * S;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
}

function pentagon(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = rot + (i * 2 * Math.PI) / 5;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

function drawBurst(ctx, size) {
  const c = size / 2;
  const star = (outer, inner, points) => {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 ? inner : outer;
      const a = (i * Math.PI) / points - Math.PI / 2;
      ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
    }
    ctx.closePath();
  };
  star(c - 6, (c - 6) * 0.5, 11);
  ctx.fillStyle = C.yellow;
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 5;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  star((c - 6) * 0.6, (c - 6) * 0.32, 11);
  ctx.fillStyle = '#fff6b0';
  ctx.fill();
}
