import * as Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS } from '../config.js';
import {
  titleText, uiText, button, iconButton, controlsPanel, openSoundPanel, drawGamepadIcon, drawSpeakerIcon,
  drawGlobeIcon,
} from '../ui.js';
import {
  sfx, unlockAudio, getChannel, isMuted, iconLevel, toggleMute, onVolumeChange,
} from '../sound.js';
import { padMenu } from '../gamepads.js';
import { t, getLang, setLang, LANGUAGES } from '../i18n.js';

const CX = GAME_W / 2;
const CARD = { x: 110, y: 270, w: GAME_W - 220, h: 590 };
const LANGUAGE = 2; // index of the language row
const DONE = 3;

// "OPCIONES", opened over any screen with openOptions() (ui.js, the gear button or O):
// CONTROLES opens the controls panel on top of this one, SONIDO opens the sound panel
// (SoundScene) and IDIOMA cycles through the languages. The screen below stays paused
// until this closes.
export default class OptionsScene extends Phaser.Scene {
  constructor() {
    super('Options');
  }

  init(data) {
    this.from = data.from;
    this.focus = data.focus ?? 0;
    this.controls = null;
    this.closing = false;
  }

  create() {
    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, COLORS.ink, 0.75).setOrigin(0).setInteractive();
    dim.on('pointerdown', () => this.close());

    const g = this.add.graphics();
    const { x, y, w, h } = CARD;
    g.fillStyle(COLORS.ink, 1);
    g.fillRoundedRect(x - 6, y + 8, w + 12, h, 30);
    g.fillStyle(COLORS.purpleDark, 1);
    g.fillRoundedRect(x, y, w, h, 28);
    g.fillStyle(0xffffff, 0.12);
    g.fillRoundedRect(x + 14, y + 12, w - 28, 50, 20);
    g.lineStyle(6, COLORS.ink, 1);
    g.strokeRoundedRect(x, y, w, h, 28);
    // Clicks on the card land here instead of on the dim layer, which closes it.
    this.add.zone(CX, y + h / 2, w, h).setInteractive();
    titleText(this, CX, y + 66, t('options.title'), 58).setAngle(-3);

    const controls = iconButton(this, CX, y + 175, w - 90, 92, {
      title: t('options.controls'), sub: t('options.controls.sub'), drawIcon: drawGamepadIcon,
    }, () => this.press(0));
    const sound = iconButton(this, CX, y + 285, w - 90, 92, {
      title: t('options.sound'), sub: this.soundSummary(), drawIcon: (icon) => drawSpeakerIcon(icon, iconLevel()),
    }, () => this.press(1));
    const language = iconButton(this, CX, y + 395, w - 90, 92, {
      title: t('options.language'), sub: this.languageSummary(), drawIcon: drawGlobeIcon,
    }, () => this.press(LANGUAGE));
    const done = button(this, CX, y + 498, 240, 62, t('common.ready'), () => this.press(DONE), 26);
    this.items = [controls, sound, language, done];
    this.items.forEach((item, i) => item.zone.on('pointerover', () => this.setFocus(i)));
    uiText(this, CX, y + h - 26, t('options.hint'), 14, '#bfb3ff');

    // The sound row shows the current levels, also after changing them in the sound panel.
    const stop = onVolumeChange(() => {
      sound.icon.clear();
      drawSpeakerIcon(sound.icon, iconLevel());
      sound.setLabel(t('options.sound'), this.soundSummary());
    });
    this.events.once('shutdown', stop);

    const onKey = (event) => {
      unlockAudio();
      const c = event.code;
      if (this.controls) {
        this.controls.key(c);
        return;
      }
      const n = this.items.length;
      if (c === 'ArrowUp' || c === 'KeyW') this.setFocus((this.focus + n - 1) % n);
      else if (c === 'ArrowDown' || c === 'KeyS') this.setFocus((this.focus + 1) % n);
      else if (c === 'ArrowLeft' || c === 'KeyA') this.changeLanguage(-1);
      else if (c === 'ArrowRight' || c === 'KeyD') this.changeLanguage(1);
      else if (c === 'Enter' || c === 'Space') this.press(this.focus);
      else if (c === 'KeyM') {
        toggleMute();
        sfx.select();
      } else if (c === 'Escape' || c === 'KeyO') this.close();
    };
    this.input.keyboard.on('keydown', onKey);
    padMenu(this, onKey);

    this.setFocus(this.focus, true);
  }

  soundSummary() {
    if (isMuted()) return t('options.sound.muted');
    const pct = (ch) => `${Math.round(getChannel(ch) * 100)} %`;
    return t('options.sound.summary', { music: pct('music'), crowd: pct('crowd'), sfx: pct('sfx') });
  }

  languageSummary() {
    return `◀  ${LANGUAGES.find((l) => l.id === getLang()).label}  ▶`;
  }

  setFocus(index, silent = false) {
    if (index !== this.focus && !silent) sfx.select();
    this.focus = index;
    this.items.forEach((item, i) => item.setActive(i === index));
  }

  press(index) {
    if (this.controls || this.closing) return;
    this.setFocus(index, true);
    if (index === 0) this.controls = controlsPanel(this, () => { this.controls = null; });
    else if (index === 1) openSoundPanel(this);
    else if (index === LANGUAGE) this.changeLanguage(1);
    else this.close();
  }

  // Left/right (or a click) on the language row: switch and redraw this panel and the
  // screen under it in the new language. A match is left as it is (restarting it would
  // lose the score); its texts change from the next screen on.
  changeLanguage(dir) {
    if (this.focus !== LANGUAGE || this.controls || this.closing) return;
    const i = LANGUAGES.findIndex((l) => l.id === getLang());
    setLang(LANGUAGES[(i + dir + LANGUAGES.length) % LANGUAGES.length].id);
    sfx.select();
    if (this.from !== 'Game') {
      const below = this.scene.get(this.from);
      // It comes back running; pause it again as soon as it's built.
      below.events.once('create', () => below.scene.pause());
      below.scene.restart();
    }
    this.scene.restart({ from: this.from, focus: LANGUAGE });
  }

  close() {
    if (this.closing || this.controls) return;
    this.closing = true;
    sfx.back();
    this.scene.resume(this.from);
    this.scene.stop();
  }
}
