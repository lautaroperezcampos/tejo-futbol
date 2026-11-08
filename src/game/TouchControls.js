// On-screen controls for phones, in the strip under the pitch. One half is the joystick,
// only for moving: it appears wherever the thumb lands and follows it if it goes too far.
// The other half has two buttons in a diagonal: a big KICK near the edge and a smaller
// DASH above it and towards the middle, so the thumb can roll from DASH down to KICK for
// a power shot. The DASH ring fills up with the charge and shines yellow when it's ready.
// Which half is which can be swapped in the options, also in the middle of a match.
// Positions are screen positions in game units; offsetY turns them into the UI camera's
// coordinates.
import { GAME_W, COLORS, MOBILE_LAYOUT } from '../config.js';
import { titleText } from '../ui.js';
import { touchInverted, vibrate } from '../mobile.js';
import { t } from '../i18n.js';

export default class TouchControls {
  constructor(scene, band, offsetY) {
    this.scene = scene;
    this.band = band;
    this.offsetY = offsetY;

    this.bg = scene.add.graphics().setDepth(29);
    this.bg.fillStyle(COLORS.purpleDark, 1);
    this.bg.fillRect(0, band.top + offsetY, GAME_W, band.bottom - band.top + 400);
    this.bg.fillStyle(COLORS.ink, 1);
    this.bg.fillRect(0, band.top + offsetY, GAME_W, 8);
    this.g = scene.add.graphics().setDepth(30);
    this.kickLabel = titleText(scene, 0, 0, t('touch.kick'), 34).setDepth(31);
    this.dashLabel = titleText(scene, 0, 0, t('touch.dash'), 26).setDepth(31);

    this.joy = null; // { id, base, finger }
    this.kickId = null;
    this.dashId = null;
    this.kickPressed = false;
    this.dashPressed = false;
    // Where the player last went: a DASH while standing still goes that way. At first,
    // towards the rival's goal.
    this.lastMove = { x: 0, y: -1 };
    this.dashReady = false;

    scene.input.addPointer(2); // two thumbs at once
    scene.input.on('pointerdown', this.down, this);
    scene.input.on('pointermove', this.move, this);
    scene.input.on('pointerup', this.up, this);
    scene.input.on('pointerupoutside', this.up, this);
  }

  // Where the joystick rests and where the two buttons are, mirrored when swapped.
  get layout() {
    const { joyX, kick, dash } = MOBILE_LAYOUT.touch;
    const cy = (this.band.top + this.band.bottom) / 2;
    const fromSide = (x) => (touchInverted() ? x : GAME_W - x);
    return {
      joy: { x: touchInverted() ? GAME_W - joyX : joyX, y: cy },
      kick: { x: fromSide(kick.x), y: cy + kick.dy },
      dash: { x: fromSide(dash.x), y: cy + dash.dy },
    };
  }

  // Which control a touch belongs to: the joystick half, or the button closest to it.
  // DASH only takes touches close to it; the rest of that half is KICK.
  controlAt(x, y) {
    if ((x < GAME_W / 2) !== touchInverted()) return 'joy';
    const { dash } = this.layout;
    return Math.hypot(x - dash.x, y - dash.y) < MOBILE_LAYOUT.touch.dash.r * 1.25 ? 'dash' : 'kick';
  }

  down(pointer) {
    if (pointer.y < this.band.top) return;
    const control = this.controlAt(pointer.x, pointer.y);
    if (control === 'joy') {
      if (this.joy) return;
      const at = { x: pointer.x, y: pointer.y };
      this.joy = { id: pointer.id, base: { ...at }, finger: { ...at } };
    } else if (control === 'dash') {
      if (this.dashId !== null) return;
      this.dashId = pointer.id;
      this.dashPressed = true;
      if (this.dashReady) vibrate(30);
    } else if (this.kickId === null) {
      this.kickId = pointer.id;
      this.kickPressed = true;
      vibrate(12);
    }
  }

  move(pointer) {
    const j = this.joy;
    if (!j || pointer.id !== j.id) return;
    const { joyR } = MOBILE_LAYOUT.touch;
    j.finger = { x: pointer.x, y: pointer.y };
    // The base follows a thumb that goes past the edge.
    const dx = j.finger.x - j.base.x;
    const dy = j.finger.y - j.base.y;
    const len = Math.hypot(dx, dy);
    if (len > joyR) {
      j.base.x = j.finger.x - (dx / len) * joyR;
      j.base.y = j.finger.y - (dy / len) * joyR;
    }
  }

  up(pointer) {
    if (this.joy && pointer.id === this.joy.id) this.joy = null;
    if (pointer.id === this.kickId) this.kickId = null;
    if (pointer.id === this.dashId) this.dashId = null;
  }

  // What the player is doing this frame: { move, kickPressed, kickHeld, dash }.
  read() {
    const { joyR, deadZone } = MOBILE_LAYOUT.touch;
    let move = { x: 0, y: 0 };
    if (this.joy) {
      const dx = (this.joy.finger.x - this.joy.base.x) / joyR;
      const dy = (this.joy.finger.y - this.joy.base.y) / joyR;
      const len = Math.hypot(dx, dy);
      if (len > deadZone) {
        move = { x: dx / Math.max(1, len), y: dy / Math.max(1, len) };
        this.lastMove = { x: dx / len, y: dy / len };
      }
    }
    const dash = this.dashPressed;
    // The dash goes where the player is heading, so standing still it needs a direction.
    if (dash && !move.x && !move.y) move = this.lastMove;
    const state = { move, kickPressed: this.kickPressed, kickHeld: this.kickId !== null, dash };
    this.kickPressed = false;
    this.dashPressed = false;
    return state;
  }

  // charge: the player's dash, 0..1 (1: ready).
  draw(now, charge) {
    this.dashReady = charge >= 1;
    const { joyR, knobR, kick, dash } = MOBILE_LAYOUT.touch;
    const pos = this.layout;
    const g = this.g;
    const oy = this.offsetY;
    g.clear();

    // Joystick.
    const base = this.joy ? this.joy.base : pos.joy;
    const knob = this.joy ? this.joy.finger : pos.joy;
    const kx = knob.x - base.x;
    const ky = knob.y - base.y;
    const len = Math.hypot(kx, ky);
    const k = len > joyR ? joyR / len : 1;
    g.fillStyle(0xffffff, 0.1);
    g.fillCircle(base.x, base.y + oy, joyR);
    g.lineStyle(10, 0xffffff, 0.35);
    g.strokeCircle(base.x, base.y + oy, joyR);
    g.fillStyle(COLORS.ink, 1);
    g.fillCircle(base.x + kx * k, base.y + ky * k + oy, knobR + 6);
    g.fillStyle(0xffffff, this.joy ? 1 : 0.75);
    g.fillCircle(base.x + kx * k, base.y + ky * k + oy, knobR);

    // Buttons: pressed ones sink a little.
    const button = (at, r, color, pressed) => {
      const sink = pressed ? 8 : 0;
      g.fillStyle(COLORS.ink, 1);
      g.fillCircle(at.x, at.y + oy + 12, r);
      g.fillStyle(color, 1);
      g.fillCircle(at.x, at.y + oy + sink, r);
      g.lineStyle(10, COLORS.ink, 1);
      g.strokeCircle(at.x, at.y + oy + sink, r);
      g.fillStyle(0xffffff, 0.25);
      g.fillEllipse(at.x, at.y + oy - r * 0.5 + sink, r * 1.25, r * 0.4);
      return at.y + oy + sink;
    };
    const kickPressed = this.kickId !== null;
    this.kickLabel.setPosition(pos.kick.x, button(pos.kick, kick.r, kickPressed ? COLORS.yellow : COLORS.pink, kickPressed));

    const ready = this.dashReady;
    if (ready) {
      g.fillStyle(COLORS.yellow, 0.18 + 0.1 * Math.sin(now / 160));
      g.fillCircle(pos.dash.x, pos.dash.y + oy, dash.r + 26);
    }
    const dashY = button(pos.dash, dash.r, ready ? COLORS.cyan : 0x6a5aa8, this.dashId !== null);
    this.dashLabel.setPosition(pos.dash.x, dashY).setAlpha(ready ? 1 : 0.6);
    // The charge ring: fills clockwise from the top, yellow when full.
    g.lineStyle(9, ready ? COLORS.yellow : 0xffffff, ready ? 1 : 0.8);
    g.beginPath();
    g.arc(pos.dash.x, dashY, dash.r + 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, charge), false);
    g.strokePath();
  }
}
