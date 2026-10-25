import * as Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS, PALETTE, FONTS } from '../config.js';
import { makeTextures } from '../art.js';
import { titleText, uiText, button, goTo, wipeIn, playMenuMusic, optionsButton } from '../ui.js';
import { sfx, unlockAudio } from '../sound.js';
import { NATION_BY_ID } from '../cup/nations.js';
import { flagTexture } from '../cup/flags.js';
import { drawSlots, setSlots, randomSlots, saveCup } from '../cup/cup.js';
import { padMenu } from '../gamepads.js';
import { t } from '../i18n.js';

const CX = GAME_W / 2;
const BODY = { top: 180, bottom: 900, left: 30, right: GAME_W - 30, gap: 12 };
const BTN_Y = 985;
const GROUP_NAMES = 'ABCDEFGHIJKL';

// "Armá los grupos": the player arranges the cup's groups (or, for a knockout cup, the
// first round's matches) by swapping nations: pick one, then another, and they trade
// places. It starts from a random draw; MEZCLAR draws again and ¡A JUGAR! saves the cup.
// data.cup: a cup from newCup(), not saved yet.
export default class CupDrawScene extends Phaser.Scene {
  constructor() {
    super('CupDraw');
  }

  init(data) {
    this.cup = data.cup;
    this.slots = drawSlots(this.cup);
    this.cursor = { box: this.slots.findIndex((s) => s.includes(this.cup.userId)), row: 0 };
    this.cursor.row = this.slots[this.cursor.box].indexOf(this.cup.userId);
    this.picked = null; // { box, row } waiting for its swap partner
    this.button = null; // 0: shuffle, 1: play; null while on the teams
  }

  create() {
    makeTextures(this);
    wipeIn(this);
    playMenuMusic(this);
    this.add.image(0, 0, 'menuBg').setOrigin(0);
    this.add.rectangle(0, 0, GAME_W, GAME_H, COLORS.ink, 0.62).setOrigin(0);
    const groups = this.cup.format === 'groups';
    titleText(this, CX, 66, t(groups ? 'draw.titleGroups' : 'draw.titleBracket'), 46).setAngle(-3);
    this.status = uiText(this, CX, 132, '', 17, PALETTE.yellow);
    optionsButton(this, GAME_W - 48, 48);

    // Boxes laid out in a grid: groups of 4 in 2 or 3 columns, matches of 2 in up to 4.
    const n = this.slots.length;
    const size = this.slots[0].length;
    this.cols = size === 2 ? Math.min(4, n) : n > 8 ? 3 : 2;
    this.layer = this.add.container(0, 0);

    this.buttons = [
      button(this, CX - 150, BTN_Y, 260, 66, t('draw.shuffle'), () => this.shuffle(), 22),
      button(this, CX + 150, BTN_Y, 260, 66, t('draw.done'), () => this.done(), 24),
    ];
    this.buttons.forEach((b, i) => b.zone.on('pointerover', () => this.focusButton(i)));
    uiText(this, CX, GAME_H - 34, t('draw.hint'), 15);

    const onKey = (event) => {
      unlockAudio();
      const c = event.code;
      if (c === 'ArrowUp' || c === 'KeyW') this.move(0, -1);
      else if (c === 'ArrowDown' || c === 'KeyS') this.move(0, 1);
      else if (c === 'ArrowLeft' || c === 'KeyA') this.move(-1, 0);
      else if (c === 'ArrowRight' || c === 'KeyD') this.move(1, 0);
      else if (c === 'Enter' || c === 'Space') this.press();
      else if (c === 'Tab') {
        event.preventDefault();
        this.shuffle();
      } else if (c === 'Escape') this.back();
    };
    this.input.keyboard.on('keydown', onKey);
    padMenu(this, onKey);

    this.render();
  }

  // ---------- drawing ----------

  render() {
    this.layer.removeAll(true);
    const add = (obj) => {
      this.layer.add(obj);
      return obj;
    };
    const n = this.slots.length;
    const size = this.slots[0].length;
    const rows = Math.ceil(n / this.cols);
    const { top, bottom, left, right, gap } = BODY;
    const w = (right - left - gap * (this.cols - 1)) / this.cols;
    const h = Math.min(200, (bottom - top - gap * (rows - 1)) / rows);
    const big = this.cols === 2 && rows <= 2;
    const fontSize = big ? 20 : this.cols >= 3 ? 14 : 17;
    const headH = Math.min(30, h * 0.2);
    const rowH = (h - headH - 6) / size;
    const g = add(this.add.graphics());

    this.slots.forEach((teams, box) => {
      const x = left + (box % this.cols) * (w + gap);
      const y = top + Math.floor(box / this.cols) * (h + gap);
      const mine = teams.includes(this.cup.userId);
      g.fillStyle(COLORS.ink, 0.92);
      g.fillRoundedRect(x, y, w, h, 14);
      g.lineStyle(mine ? 4 : 2, mine ? COLORS.yellow : COLORS.purple, 1);
      g.strokeRoundedRect(x, y, w, h, 14);
      const header = size === 2 ? t('draw.match', { n: box + 1 }) : t('cup.group', { name: GROUP_NAMES[box] });
      add(this.add.text(x + 12, y + headH / 2 + 2, header, {
        fontFamily: FONTS.title, fontSize: `${Math.round(fontSize * 0.9)}px`, color: mine ? PALETTE.yellow : PALETTE.white,
      }).setOrigin(0, 0.5));

      teams.forEach((id, row) => {
        const cy = y + headH + 2 + rowH * row + rowH / 2;
        const focused = this.button === null && this.cursor.box === box && this.cursor.row === row;
        const picked = this.picked && this.picked.box === box && this.picked.row === row;
        if (focused || picked) {
          g.fillStyle(focused ? COLORS.yellow : COLORS.cyan, picked && focused ? 0.75 : 1);
          g.fillRoundedRect(x + 5, cy - rowH / 2 + 2, w - 10, rowH - 4, 8);
        }
        if (picked) {
          g.lineStyle(3, COLORS.cyan, 1);
          g.strokeRoundedRect(x + 5, cy - rowH / 2 + 2, w - 10, rowH - 4, 8);
        }
        const nation = NATION_BY_ID[id];
        const color = focused || picked ? PALETTE.ink : id === this.cup.userId ? PALETTE.yellow : PALETTE.white;
        add(this.add.image(x + (big ? 36 : 28), cy, flagTexture(this, id)).setScale(big ? 0.16 : 0.12));
        add(this.add.text(x + (big ? 64 : 52), cy, nation.short, {
          fontFamily: FONTS.ui, fontStyle: '900', fontSize: `${fontSize}px`, color,
        }).setOrigin(0, 0.5));

        const zone = add(this.add.zone(x + w / 2, cy, w - 10, rowH).setInteractive({ useHandCursor: true }));
        zone.on('pointerdown', () => {
          this.setCursor({ box, row }, true);
          this.press();
        });
      });
    });

    const p = this.picked && this.slots[this.picked.box][this.picked.row];
    this.status.setText(p ? t('draw.picked', { team: NATION_BY_ID[p].short }) : t('draw.sub'));
    this.buttons.forEach((b, i) => b.setActive(this.button === i));
  }

  // ---------- moving ----------

  setCursor(cell, silent = false) {
    if (!silent) sfx.select();
    this.cursor = cell;
    this.button = null;
    this.render();
  }

  focusButton(i) {
    if (this.button === i) return;
    sfx.select();
    this.button = i;
    this.render();
  }

  // Arrows walk the grid: up/down through the teams of a box and on to the box above or
  // below (down from the last row reaches the buttons), left/right to the next box.
  move(dx, dy) {
    const n = this.slots.length;
    const size = this.slots[0].length;
    if (this.button !== null) {
      if (dx) this.focusButton(1 - this.button);
      else if (dy < 0) this.setCursor({ ...this.cursor });
      return;
    }
    let { box, row } = this.cursor;
    if (dx) {
      const col = box % this.cols;
      const next = box + dx;
      if (col + dx < 0 || col + dx >= this.cols || next >= n) return;
      box = next;
    } else {
      row += dy;
      if (row < 0) {
        if (box - this.cols < 0) return;
        box -= this.cols;
        row = size - 1;
      } else if (row >= size) {
        if (box + this.cols >= n) {
          this.focusButton(1);
          return;
        }
        box += this.cols;
        row = 0;
      }
    }
    this.setCursor({ box, row });
  }

  // ---------- actions ----------

  // Enter / A / click: on a team, pick it or swap it with the one already picked.
  press() {
    if (this.leaving) return;
    if (this.button !== null) {
      if (this.button === 0) this.shuffle();
      else this.done();
      return;
    }
    const { box, row } = this.cursor;
    if (!this.picked) {
      sfx.select();
      this.picked = { box, row };
    } else if (this.picked.box === box && this.picked.row === row) {
      sfx.back();
      this.picked = null;
    } else {
      const a = this.picked;
      [this.slots[a.box][a.row], this.slots[box][row]] = [this.slots[box][row], this.slots[a.box][a.row]];
      sfx.confirm();
      this.picked = null;
    }
    this.render();
  }

  shuffle() {
    if (this.leaving) return;
    sfx.confirm();
    this.slots = randomSlots(this.cup);
    this.picked = null;
    this.render();
  }

  done() {
    if (this.leaving) return;
    sfx.confirm();
    setSlots(this.cup, this.slots);
    saveCup(this.cup);
    goTo(this, 'Cup', {});
  }

  // Esc / B: drop the pick, or go back to choosing the nation (nothing is saved).
  back() {
    if (this.picked) {
      sfx.back();
      this.picked = null;
      this.render();
      return;
    }
    goTo(this, 'NationSelect');
  }
}
