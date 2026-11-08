// On-screen controls for phones, in the strip under the pitch. One half is the joystick:
// it appears wherever the thumb lands and follows it if it goes too far; its ring turns
// yellow when the dash is ready, and a quick flick of the thumb fires it in that direction.
// The other half is the kick button (the whole half counts, not just the drawn circle).
// Which half is which can be swapped in the options, also in the middle of a match. Positions are screen positions in
// game units; offsetY turns them into the UI camera's coordinates.
import { GAME_W, COLORS, PALETTE, MOBILE_LAYOUT } from '../config.js';
import { titleText, uiText } from '../ui.js';
import { touchInverted, vibrate } from '../mobile.js';
import { t } from '../i18n.js';

export default class TouchControls {
  constructor(scene, band, offsetY) {
    this.scene = scene;
    this.band = band;
    this.offsetY = offsetY;
    const cy = (band.top + band.bottom) / 2;

    this.bg = scene.add.graphics().setDepth(29);
    this.bg.fillStyle(COLORS.purpleDark, 1);
    this.bg.fillRect(0, band.top + offsetY, GAME_W, band.bottom - band.top + 400);
    this.bg.fillStyle(COLORS.ink, 1);
    this.bg.fillRect(0, band.top + offsetY, GAME_W, 8);
    this.g = scene.add.graphics().setDepth(30);
    this.kickLabel = titleText(scene, this.home.kick.x, this.home.kick.y + offsetY, t('touch.kick'), 34).setDepth(31);
    this.readyLabel = uiText(scene, this.home.joy.x, cy + MOBILE_LAYOUT.touch.joyR + 44 + offsetY, t('game.dashReady'), 22, PALETTE.yellow)
      .setDepth(31).setVisible(false);

    this.joy = null; // { id, base, finger, samples }
    this.kickId = null;
    this.kickPressed = false;
    this.dash = null; // flick direction waiting to be read
    this.lastFlick = 0;
    this.dashReady = false;

    scene.input.addPointer(2); // two thumbs at once
    scene.input.on('pointerdown', this.down, this);
    scene.input.on('pointermove', this.move, this);
    scene.input.on('pointerup', this.up, this);
    scene.input.on('pointerupoutside', this.up, this);
  }

  // Where the joystick rests and where the kick button is.
  get home() {
    const { sideX } = MOBILE_LAYOUT.touch;
    const cy = (this.band.top + this.band.bottom) / 2;
    const left = { x: sideX, y: cy };
    const right = { x: GAME_W - sideX, y: cy };
    return touchInverted() ? { joy: right, kick: left } : { joy: left, kick: right };
  }

  // Which control a touch at x belongs to.
  half(x) {
    return (x < GAME_W / 2) !== touchInverted() ? 'joy' : 'kick';
  }

  down(pointer) {
    if (pointer.y < this.band.top) return;
    if (this.half(pointer.x) === 'joy') {
      if (this.joy) return;
      const at = { x: pointer.x, y: pointer.y };
      this.joy = { id: pointer.id, base: { ...at }, finger: { ...at }, samples: [{ t: this.scene.time.now, ...at }] };
    } else if (this.kickId === null) {
      this.kickId = pointer.id;
      this.kickPressed = true;
      vibrate(12);
    }
  }

  move(pointer) {
    const j = this.joy;
    if (!j || pointer.id !== j.id) return;
    const { joyR, flick } = MOBILE_LAYOUT.touch;
    const now = this.scene.time.now;
    j.finger = { x: pointer.x, y: pointer.y };
    // The base follows a thumb that goes past the edge.
    const dx = j.finger.x - j.base.x;
    const dy = j.finger.y - j.base.y;
    const len = Math.hypot(dx, dy);
    if (len > joyR) {
      j.base.x = j.finger.x - (dx / len) * joyR;
      j.base.y = j.finger.y - (dy / len) * joyR;
    }
    // Flick: the thumb travelled far in a very short time.
    j.samples.push({ t: now, ...j.finger });
    while (j.samples.length && now - j.samples[0].t > flick.ms) j.samples.shift();
    const from = j.samples[0];
    const fx = j.finger.x - from.x;
    const fy = j.finger.y - from.y;
    const travel = Math.hypot(fx, fy);
    if (travel >= flick.distance && now - this.lastFlick > flick.cooldown) {
      this.lastFlick = now;
      this.dash = { x: fx / travel, y: fy / travel };
      if (this.dashReady) vibrate(30);
    }
  }

  up(pointer) {
    if (this.joy && pointer.id === this.joy.id) this.joy = null;
    if (pointer.id === this.kickId) this.kickId = null;
  }

  // What the player is doing this frame: { move, kickPressed, kickHeld, dash }. A flick
  // also points the movement its way, since the dash goes where the player is heading.
  read() {
    const { joyR, deadZone } = MOBILE_LAYOUT.touch;
    let move = { x: 0, y: 0 };
    if (this.joy) {
      const dx = (this.joy.finger.x - this.joy.base.x) / joyR;
      const dy = (this.joy.finger.y - this.joy.base.y) / joyR;
      const len = Math.hypot(dx, dy);
      if (len > deadZone) move = { x: dx / Math.max(1, len), y: dy / Math.max(1, len) };
    }
    const dash = this.dash !== null;
    if (dash) move = this.dash;
    const state = { move, kickPressed: this.kickPressed, kickHeld: this.kickId !== null, dash };
    this.kickPressed = false;
    this.dash = null;
    return state;
  }

  draw(now, dashReady) {
    this.dashReady = dashReady;
    const { joyR, knobR, kickR } = MOBILE_LAYOUT.touch;
    const g = this.g;
    const oy = this.offsetY;
    g.clear();

    const base = this.joy ? this.joy.base : this.home.joy;
    const knob = this.joy ? this.joy.finger : this.home.joy;
    const kx = knob.x - base.x;
    const ky = knob.y - base.y;
    const len = Math.hypot(kx, ky);
    const k = len > joyR ? joyR / len : 1;
    if (dashReady) {
      g.fillStyle(COLORS.yellow, 0.16 + 0.08 * Math.sin(now / 160));
      g.fillCircle(base.x, base.y + oy, joyR + 26);
    }
    g.fillStyle(0xffffff, 0.1);
    g.fillCircle(base.x, base.y + oy, joyR);
    g.lineStyle(10, dashReady ? COLORS.yellow : 0xffffff, dashReady ? 1 : 0.35);
    g.strokeCircle(base.x, base.y + oy, joyR);
    g.fillStyle(COLORS.ink, 1);
    g.fillCircle(base.x + kx * k, base.y + ky * k + oy, knobR + 6);
    g.fillStyle(0xffffff, this.joy ? 1 : 0.75);
    g.fillCircle(base.x + kx * k, base.y + ky * k + oy, knobR);
    this.readyLabel.setVisible(dashReady).setPosition(base.x, base.y + joyR + 44 + oy);

    const pressed = this.kickId !== null;
    const { x, y } = this.home.kick;
    g.fillStyle(COLORS.ink, 1);
    g.fillCircle(x, y + oy + 12, kickR);
    g.fillStyle(pressed ? COLORS.yellow : COLORS.pink, 1);
    g.fillCircle(x, y + oy + (pressed ? 8 : 0), kickR);
    g.lineStyle(10, COLORS.ink, 1);
    g.strokeCircle(x, y + oy + (pressed ? 8 : 0), kickR);
    g.fillStyle(0xffffff, 0.25);
    g.fillEllipse(x, y + oy - kickR * 0.5 + (pressed ? 8 : 0), kickR * 1.25, kickR * 0.4);
    this.kickLabel.setPosition(x, y + oy + (pressed ? 8 : 0));
  }
}
