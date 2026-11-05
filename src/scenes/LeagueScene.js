import * as Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS, PALETTE, FONTS, LEAGUE } from '../config.js';
import { makeTextures, kitTexture } from '../art.js';
import { titleText, uiText, ribbon, button, goTo, wipeIn, playMenuMusic, optionsButton, levelLabel } from '../ui.js';
import { sfx, unlockAudio } from '../sound.js';
import { TEAM_BY_ID, pickKits } from '../league/teams.js';
import {
  loadLeague, saveLeague, clearLeague, standings, nextUserMatch, isFinished, totalRounds, recordUserMatch, simulateToEnd,
  currentPlayoffRound, isClassicRound, userZone,
} from '../league/league.js';
import { roundName } from '../cup/cup.js';
import { padMenu } from '../gamepads.js';
import { t } from '../i18n.js';

const CX = GAME_W / 2;
const ROW_H = 40;
const TABLE_TOP = 190;
const BODY_BOTTOM = 880;
// Column centres for the numeric stats (played, won, drawn, lost, goals for, against,
// difference, points); their headers are league.cols in src/lang/.
const COLS = [420, 465, 510, 555, 605, 655, 705, 765];
// The playoff bracket: round of 16 on the outside, final in the middle. w: tie width in
// each column, from the outside in; only the first one has room for full names.
const BRACKET = { headY: 164, top: 182, bottom: 870, w: [156, 82, 82], finalW: 104, gap: 9, rowH: 42 };
const VIEW_LABEL = {
  zoneA: 'league.zoneA', zoneB: 'league.zoneB', bracket: 'league.bracket', results: 'common.results', final: 'common.championBtn',
};

// League hub: the two zone tables, last round's results, the playoffs, next match and
// the final screen.
export default class LeagueScene extends Phaser.Scene {
  constructor() {
    super('League');
  }

  init(data) {
    this.view = data.view ?? null; // null: the most useful one right now
    this.revealBracket = !!data.reveal; // the ties pop in one by one
  }

  create() {
    makeTextures(this);
    wipeIn(this);
    this.league = loadLeague();
    playMenuMusic(this, { champion: !!this.league && userWonLeague(this.league) });
    if (!this.league) {
      this.scene.start('TeamSelect');
      return;
    }
    this.user = TEAM_BY_ID[this.league.userId];
    this.modal = null;

    this.add.image(0, 0, 'menuBg').setOrigin(0);
    this.add.rectangle(0, 0, GAME_W, GAME_H, COLORS.ink, 0.62).setOrigin(0);
    this.content = this.add.container(0, 0);

    this.views = this.availableViews();
    if (isFinished(this.league) && this.view === 'results') this.view = 'final';
    // Coming back from a playoff match, the bracket shows how it went.
    if (this.league.stage === 'playoffs' && this.view === 'results') this.view = 'bracket';
    if (!this.views.includes(this.view)) this.view = this.views[0];

    this.drawHeader();
    optionsButton(this, GAME_W - 48, 48);
    this.drawFooter();
    this.render();

    const onKey = (event) => {
      unlockAudio();
      if (this.modal) {
        this.modalKey(event.code);
        return;
      }
      const n = this.footer.length;
      if (event.code === 'ArrowLeft' || event.code === 'KeyA' || event.code === 'ArrowUp' || event.code === 'KeyW') {
        this.focusFooter((this.focus + n - 1) % n);
      } else if (event.code === 'ArrowRight' || event.code === 'KeyD' || event.code === 'ArrowDown' || event.code === 'KeyS') {
        this.focusFooter((this.focus + 1) % n);
      } else if (event.code === 'Enter' || event.code === 'Space') {
        this.footer[this.focus].action();
      } else if (event.code === 'Tab') {
        event.preventDefault();
        this.toggleView();
      } else if (event.code === 'Escape') goTo(this, 'Menu');
      else if (event.code === 'KeyN') this.openResetModal();
    };
    this.input.keyboard.on('keydown', onKey);
    padMenu(this, onKey);
  }

  // Which screens make sense right now, the most useful first.
  availableViews() {
    const l = this.league;
    const mine = `zone${userZone(l)}`;
    const other = mine === 'zoneA' ? 'zoneB' : 'zoneA';
    if (this.awaitingBracket()) return [mine, other, 'results'];
    if (l.stage === 'zones') return l.results.length ? [mine, other, 'results'] : [mine, other];
    const views = ['bracket', 'results', mine, other];
    return l.stage === 'done' ? ['final', ...views] : views;
  }

  // The zones just ended: the user sees where they finished, and the main button reveals
  // the bracket.
  awaitingBracket() {
    return this.league.stage === 'playoffs' && !this.league.bracketSeen;
  }

  // ---------- layout ----------

  drawHeader() {
    const round = Math.min(this.league.round + 1, totalRounds(this.league));
    ribbon(this, CX, 58, t('league.title'), 380, 54).setAngle(-2);
    const level = levelLabel(this.league.difficulty ?? 'medium')
      + (this.league.hazards ? `  ·  ${t('common.powerups')}` : '');
    let subtitle;
    if (isFinished(this.league)) subtitle = t('league.over', { level });
    else if (this.awaitingBracket()) subtitle = t('league.zonesOver', { team: this.user.short, level });
    else if (this.league.stage === 'playoffs') {
      subtitle = t('league.stage', { stage: roundName(currentPlayoffRound(this.league).length * 2), team: this.user.short, level });
    } else subtitle = t('league.round', { round, total: totalRounds(this.league), team: this.user.short, level });
    uiText(this, CX, 120, subtitle, 20, PALETTE.yellow);
  }

  drawFooter() {
    const l = this.league;
    const btnY = 1018;
    const awaiting = this.awaitingBracket();
    const m = awaiting ? null : nextUserMatch(l);

    if (awaiting) {
      const { pos } = standings(l, userZone(l)).find((r) => r.id === l.userId);
      titleText(this, CX, 925, t(l.eliminated ? 'league.notQualified' : 'league.qualified', { pos }), 26, PALETTE.yellow);
    } else if (m) {
      const home = TEAM_BY_ID[m.home];
      const away = TEAM_BY_ID[m.away];
      const kits = pickKits(home, away);
      const rowY = 940;
      let label = t('common.nextMatch');
      if (m.knockout) label = t('league.nextKnockout', { round: roundName(currentPlayoffRound(l).length * 2) });
      else if (isClassicRound(l)) label = t('league.nextClassic');
      uiText(this, CX, 898, label, 18, PALETTE.yellow);
      this.add.image(CX - 250, rowY, kitTexture(this, kits.home, '10')).setScale(0.38);
      uiText(this, CX - 220, rowY, home.short, 22).setOrigin(0, 0.5);
      uiText(this, CX, rowY, t('common.vs'), 22, PALETTE.yellow);
      uiText(this, CX + 220, rowY, away.short, 22).setOrigin(1, 0.5);
      this.add.image(CX + 250, rowY, kitTexture(this, kits.away, '9')).setScale(0.38);
    } else if (!isFinished(l)) {
      uiText(this, CX, 920, t('league.goesOn'), 17, PALETTE.yellow);
    }

    // Footer buttons, left to right. Arrows / joystick move the yellow highlight and
    // Enter / A presses it; the main button starts highlighted.
    const footer = [];
    if (isFinished(l)) {
      this.viewBtn = button(this, CX - 220, btnY, 230, 66, '', () => this.toggleView(), 20);
      footer.push([this.viewBtn, () => this.toggleView()]);
      this.mainBtn = button(this, CX + 110, btnY, 360, 66, t('league.new'), () => this.mainAction(), 26);
      footer.push([this.mainBtn, () => this.mainAction()]);
    } else {
      this.viewBtn = button(this, 130, btnY, 200, 66, '', () => this.toggleView(), 19);
      footer.push([this.viewBtn, () => this.toggleView()]);
      const quit = button(this, 342, btnY, 200, 66, t('common.quit'), () => this.openResetModal(), 19);
      footer.push([quit, () => this.openResetModal()]);
      let label = t('cup.simulate');
      if (awaiting) label = t('league.seeBracket');
      else if (m) label = m.knockout ? t('cup.play') : t('league.play', { n: l.round + 1 });
      this.mainBtn = button(this, 610, btnY, 320, 66, label, () => this.mainAction(), 24);
      footer.push([this.mainBtn, () => this.mainAction()]);
    }
    this.footer = footer.map(([btn, action]) => ({ btn, action }));
    this.footer.forEach((item, i) => item.btn.zone.on('pointerover', () => this.focusFooter(i)));
    this.focusFooter(this.footer.length - 1, true);
    this.updateViewButton();

    this.hint = uiText(this, CX, GAME_H - 28, t('league.hint'), 15);
  }

  focusFooter(index, silent = false) {
    if (index !== this.focus && !silent) sfx.select();
    this.focus = index;
    this.footer.forEach((item, i) => {
      item.btn.setActive(i === index);
      item.btn.container.setScale(i === index ? 1.05 : 1);
    });
  }

  // The view button shows where it takes you next.
  updateViewButton() {
    const next = this.views[(this.views.indexOf(this.view) + 1) % this.views.length];
    this.viewBtn.container.list[1].setText(t(VIEW_LABEL[next]));
  }

  render() {
    this.content.removeAll(true);
    if (this.view === 'zoneA') this.renderTable('A');
    else if (this.view === 'zoneB') this.renderTable('B');
    else if (this.view === 'bracket') this.renderBracket();
    else if (this.view === 'results') this.renderResults();
    else this.renderFinal();
  }

  toggleView() {
    sfx.select();
    this.view = this.views[(this.views.indexOf(this.view) + 1) % this.views.length];
    this.updateViewButton();
    this.render();
  }

  mainAction() {
    if (isFinished(this.league)) {
      this.openResetModal();
      return;
    }
    if (this.leaving) return;
    if (this.awaitingBracket()) {
      this.league.bracketSeen = true;
      saveLeague(this.league);
      sfx.confirm();
      goTo(this, 'League', { view: 'bracket', reveal: true });
      return;
    }
    const m = nextUserMatch(this.league);
    if (!m) {
      // Out of the tournament: play out the rest of it.
      simulateToEnd(this.league);
      sfx.confirm();
      goTo(this, 'League', { view: 'final' });
      return;
    }
    const home = TEAM_BY_ID[m.home];
    const away = TEAM_BY_ID[m.away];
    const kits = pickKits(home, away);
    const rival = m.userIsHome ? away : home;
    sfx.confirm();
    goTo(this, 'Game', {
      mode: 'league',
      match: {
        user: this.user,
        rival,
        userKit: m.userIsHome ? kits.home : kits.away,
        rivalKit: m.userIsHome ? kits.away : kits.home,
        difficulty: this.league.difficulty,
        hazards: this.league.hazards,
        knockout: m.knockout,
        record: (userGoals, rivalGoals) => recordUserMatch(this.league, userGoals, rivalGoals),
        back: { scene: 'League', data: { view: 'results' } },
      },
    });
  }

  // ---------- abandon / new league ----------

  // Starting over throws the current league away, so it asks first. "NO" is selected by
  // default so a stray Enter can't wipe the league.
  openResetModal() {
    if (this.modal || this.leaving) return;
    sfx.select();
    const finished = isFinished(this.league);
    const title = t(finished ? 'league.newTitle' : 'league.quitTitle');
    const detail = finished
      ? t('league.newDetail')
      : t('league.quitDetail', { team: this.user.short, round: Math.min(this.league.round + 1, totalRounds(this.league)), total: totalRounds(this.league) });

    // The dim layer swallows clicks so nothing behind the dialog reacts.
    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, COLORS.ink, 0.75).setOrigin(0).setInteractive();
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.ink, 1);
    panel.fillRoundedRect(CX - 316, 400, 632, 330, 26);
    panel.fillStyle(COLORS.purpleDark, 1);
    panel.fillRoundedRect(CX - 310, 394, 620, 330, 24);
    panel.lineStyle(5, COLORS.ink, 1);
    panel.strokeRoundedRect(CX - 310, 394, 620, 330, 24);
    const heading = titleText(this, CX, 470, title, 40);
    const text = uiText(this, CX, 555, detail, 19).setLineSpacing(6);
    const no = button(this, CX - 150, 655, 260, 64, t(finished ? 'common.no' : 'common.noKeep'), () => this.closeModal(), 22);
    const yes = button(this, CX + 150, 655, 260, 64, t(finished ? 'common.yesNew' : 'common.yesQuit'), () => this.confirmReset(), 22);

    this.modal = {
      sel: 0,
      buttons: [no, yes],
      parts: [dim, panel, heading, text, no.container, no.zone, yes.container, yes.zone],
    };
    for (const part of this.modal.parts) part.setDepth(100);
    this.selectModal(0);
  }

  selectModal(sel) {
    this.modal.sel = sel;
    this.modal.buttons.forEach((b, i) => b.setActive(i === sel));
  }

  modalKey(code) {
    if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'KeyA' || code === 'KeyD') {
      sfx.select();
      this.selectModal(1 - this.modal.sel);
    } else if (code === 'Enter' || code === 'Space') {
      if (this.modal.sel === 1) this.confirmReset();
      else this.closeModal();
    } else if (code === 'Escape' || code === 'KeyN') {
      this.closeModal();
    }
  }

  closeModal() {
    if (!this.modal) return;
    sfx.back();
    for (const part of this.modal.parts) part.destroy();
    this.modal = null;
  }

  confirmReset() {
    clearLeague();
    sfx.confirm();
    goTo(this, 'TeamSelect');
  }

  // ---------- views ----------

  // One zone's table. A green mark and a line show who's in the playoffs.
  renderTable(zone) {
    const add = (obj) => this.content.add(obj);
    add(uiText(this, CX, 156, t(`league.zone${zone}`), 24));
    const g = this.add.graphics();
    add(g);
    const x0 = 30;
    const w = GAME_W - 60;
    const rows = standings(this.league, zone);
    const prev = this.league.prevPositions;

    g.fillStyle(COLORS.ink, 0.92);
    g.fillRoundedRect(x0 - 6, TABLE_TOP - 6, w + 12, ROW_H * (rows.length + 1) + 16, 18);
    g.fillStyle(COLORS.purple, 1);
    g.fillRoundedRect(x0, TABLE_TOP, w, ROW_H, { tl: 12, tr: 12, bl: 0, br: 0 });

    const head = { fontFamily: FONTS.ui, fontStyle: '900', fontSize: '15px', color: PALETTE.white };
    add(this.add.text(x0 + 24, TABLE_TOP + ROW_H / 2, '#', head).setOrigin(0.5));
    add(this.add.text(x0 + 95, TABLE_TOP + ROW_H / 2, t('league.team'), head).setOrigin(0, 0.5));
    t('league.cols').split(',').forEach((label, k) => add(this.add.text(COLS[k], TABLE_TOP + ROW_H / 2, label, head).setOrigin(0.5)));

    rows.forEach((r, i) => {
      const y = TABLE_TOP + ROW_H * (i + 1);
      const cy = y + ROW_H / 2;
      const isUser = r.id === this.league.userId;
      const team = TEAM_BY_ID[r.id];

      if (isUser) g.fillStyle(COLORS.yellow, 1);
      else g.fillStyle(i % 2 ? 0x2a1a5c : 0x24164f, 1);
      g.fillRect(x0, y, w, ROW_H);
      if (i < LEAGUE.qualifiers) {
        g.fillStyle(0x3dd68c, 1);
        g.fillRect(x0, y, 6, ROW_H);
      }
      if (i === LEAGUE.qualifiers) {
        g.fillStyle(0xffffff, 0.6);
        g.fillRect(x0, y - 1, w, 2);
      }

      const color = isUser ? PALETTE.ink : PALETTE.white;
      const cell = { fontFamily: FONTS.ui, fontStyle: '900', fontSize: '17px', color };
      add(this.add.text(x0 + 24, cy, String(r.pos), cell).setOrigin(0.5));

      if (prev && prev[r.id] && prev[r.id] !== r.pos) {
        const up = r.pos < prev[r.id];
        add(this.add.text(x0 + 50, cy, up ? '▲' : '▼', { ...cell, fontSize: '12px', color: up ? '#3dd68c' : '#ff4757' }).setOrigin(0.5));
      }
      add(this.add.image(x0 + 78, cy, kitTexture(this, team.home, '')).setScale(0.24));
      add(this.add.text(x0 + 95, cy, team.short, cell).setOrigin(0, 0.5));
      const stats = [r.pj, r.pg, r.pe, r.pp, r.gf, r.gc, r.dg > 0 ? `+${r.dg}` : r.dg, r.pts];
      COLS.forEach((cx, k) => {
        const style = k === COLS.length - 1 ? { ...cell, fontFamily: FONTS.title, fontSize: '18px' } : cell;
        add(this.add.text(cx, cy, String(stats[k]), style).setOrigin(0.5));
      });
    });
    add(uiText(this, CX, TABLE_TOP + ROW_H * (rows.length + 1) + 26, t('league.legend'), 15, '#bfb3ff'));
  }

  // The whole bracket: four ties on each side, closing in on the final in the middle.
  renderBracket() {
    const { rounds } = this.league;
    const { headY, top, bottom, w, gap, finalW } = BRACKET;
    const lines = this.add.graphics();
    this.content.add(lines);
    lines.lineStyle(3, 0xffffff, 0.45);
    const slot = (bottom - top) / 4;
    const midY = top + slot * 2;
    this.content.add(this.add.image(CX, midY - 150, 'trophy').setScale(0.3));
    this.content.add(uiText(this, CX, headY, t('league.col.2'), 14, PALETTE.yellow));

    [0, 1].forEach((side) => {
      let x = 10;
      w.forEach((width, r) => {
        const count = 4 >> r;
        const left = side === 0 ? x : GAME_W - x - width;
        const label = t(`league.col.${16 >> r}`);
        this.content.add(uiText(this, left + width / 2, headY, label, 14, PALETTE.yellow));
        for (let k = 0; k < count; k++) {
          const y = top + slot * (2 ** r) * (k + 0.5);
          this.drawTie(left, y, width, rounds[r]?.[k + side * count], r > 0, (r * 4 + k) * 70);
          // Elbow to the tie this one feeds (a straight line into the final).
          const fromX = side === 0 ? left + width : left;
          const toX = side === 0 ? fromX + gap : fromX - gap;
          const parentY = r === w.length - 1 ? y : top + slot * (2 ** (r + 1)) * (Math.floor(k / 2) + 0.5);
          const elbowX = (fromX + toX) / 2;
          lines.lineBetween(fromX, y, elbowX, y);
          lines.lineBetween(elbowX, y, elbowX, parentY);
          lines.lineBetween(elbowX, parentY, toX, parentY);
        }
        x += width + gap;
      });
    });
    this.drawTie(CX - finalW / 2, midY, finalW, rounds[3]?.[0], true, 16 * 70);
    if (rounds.flat().some((m) => m.pens)) this.content.add(uiText(this, CX, bottom + 8, t('cup.pens'), 14, '#bfb3ff'));

    if (this.revealBracket) {
      this.revealBracket = false;
      lines.setAlpha(0);
      this.tweens.add({ targets: lines, alpha: 1, delay: 500, duration: 500 });
    }
  }

  // One tie of the bracket, vertically centred on y; an empty box while it's undecided.
  // compact: a three-letter code instead of the name.
  drawTie(x, y, w, m, compact, delay) {
    const { rowH } = BRACKET;
    const g = this.add.graphics();
    const tie = this.add.container(x, y - rowH, [g]);
    this.content.add(tie);
    g.fillStyle(COLORS.ink, 1);
    g.fillRoundedRect(-3, -3, w + 6, rowH * 2 + 6, 10);

    [['a', 'ag'], ['b', 'bg']].forEach(([side, goals], row) => {
      const rowY = row * rowH;
      const cy = rowY + rowH / 2;
      const id = m?.[side];
      const isUser = id === this.league.userId;
      g.fillStyle(isUser ? COLORS.yellow : (row ? 0x24164f : 0x2a1a5c), 1);
      g.fillRoundedRect(0, rowY, w, rowH, row ? { tl: 0, tr: 0, bl: 8, br: 8 } : { tl: 8, tr: 8, bl: 0, br: 0 });
      if (!id) return;
      const team = TEAM_BY_ID[id];
      const lost = m.winner && m.winner !== id;
      const color = isUser ? PALETTE.ink : PALETTE.white;
      const style = { fontFamily: FONTS.ui, fontStyle: '900', fontSize: '14px', color };
      const kit = this.add.image(18, cy, kitTexture(this, team.home, '')).setScale(0.2);
      const code = team.short.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').slice(0, 3);
      const name = this.add.text(34, cy, compact ? code : team.short, style).setOrigin(0, 0.5);
      tie.add([kit, name]);
      let room = w - 40;
      if (m[goals] !== null) {
        const pens = m.pens && m.winner === id ? '*' : '';
        const score = this.add.text(w - 6, cy, `${m[goals]}${pens}`, { ...style, fontFamily: FONTS.title, fontSize: '16px' }).setOrigin(1, 0.5);
        tie.add(score);
        room -= score.width + 4;
      }
      if (name.width > room) name.setScale(room / name.width);
      if (lost) {
        kit.setAlpha(0.45);
        name.setAlpha(0.45);
      }
    });

    if (this.revealBracket) {
      tie.setAlpha(0).setScale(0.8);
      this.tweens.add({ targets: tie, alpha: 1, scale: 1, delay, duration: 220, ease: 'Back.Out' });
    }
  }

  renderResults() {
    const l = this.league;
    const played = l.rounds.filter((r) => r.every((m) => m.winner));
    let title;
    let list;
    if (played.length) {
      list = played[played.length - 1];
      title = t('cup.resultsRound', { round: roundName(list.length * 2) });
    } else {
      list = l.results[l.results.length - 1].map((r) => ({ a: r.home, b: r.away, ag: r.hg, bg: r.ag }));
      title = t('league.roundResults', { n: l.results.length });
    }
    this.content.add(uiText(this, CX, TABLE_TOP - 15, title, 24));
    this.matchList(list, TABLE_TOP + 30);
  }

  // One row per match: { a, b, ag, bg, pens, winner }, with kits and the score (or VS).
  matchList(list, top) {
    const add = (obj) => this.content.add(obj);
    const rowH = Math.min(62, (BODY_BOTTOM - top) / list.length);
    const g = this.add.graphics();
    add(g);
    list.forEach((m, i) => {
      const y = top + i * rowH;
      const cy = y + rowH / 2;
      const home = TEAM_BY_ID[m.a];
      const away = TEAM_BY_ID[m.b];
      const isUser = m.a === this.league.userId || m.b === this.league.userId;
      g.fillStyle(isUser ? COLORS.yellow : COLORS.ink, isUser ? 1 : 0.88);
      g.fillRoundedRect(40, y + 2, GAME_W - 80, rowH - 4, 12);
      const color = isUser ? PALETTE.ink : PALETTE.white;
      const style = (won) => ({
        fontFamily: FONTS.ui, fontStyle: '900', fontSize: '19px',
        color: m.winner && !won ? (isUser ? '#6b5a00' : '#8f86b8') : color,
      });
      add(this.add.image(70, cy, kitTexture(this, home.home, '')).setScale(0.24));
      add(this.add.text(CX - 70, cy, home.short, style(m.winner === m.a)).setOrigin(1, 0.5));
      const score = m.ag === null ? t('common.vs') : `${m.ag} - ${m.bg}${m.pens ? '*' : ''}`;
      add(this.add.text(CX, cy, score, { fontFamily: FONTS.title, fontSize: '22px', color }).setOrigin(0.5));
      add(this.add.text(CX + 70, cy, away.short, style(m.winner === m.b)).setOrigin(0, 0.5));
      add(this.add.image(GAME_W - 70, cy, kitTexture(this, away.home, '')).setScale(0.24));
    });
    if (list.some((m) => m.pens)) add(uiText(this, CX, BODY_BOTTOM + 6, t('cup.pens'), 15, '#bfb3ff'));
  }

  renderFinal() {
    const add = (obj) => this.content.add(obj);
    const l = this.league;
    const champion = TEAM_BY_ID[l.champion];
    const won = l.champion === l.userId;

    const burst = this.add.image(CX, 400, 'burst').setScale(3.2).setAlpha(won ? 1 : 0.35);
    add(burst);
    this.tweens.add({ targets: burst, angle: 360, duration: 16000, repeat: -1 });
    add(this.add.image(CX, 400, 'trophy').setScale(0.95));
    add(this.add.image(CX + 105, 450, kitTexture(this, champion.home, '10')).setScale(0.75));

    if (won) {
      const mine = standings(l, userZone(l)).find((r) => r.id === l.userId);
      add(titleText(this, CX, 640, t('common.champion'), 100).setAngle(-5));
      add(ribbon(this, CX, 735, this.user.short, 380, 56).setAngle(-5));
      add(uiText(this, CX, 820, t('league.wonStats', { pts: mine.pts, wins: mine.pg, gd: `${mine.dg > 0 ? '+' : ''}${mine.dg}` }), 24, PALETTE.yellow));
      sfx.win();
      this.time.addEvent({ delay: 700, repeat: 4, callback: () => this.confetti() });
    } else {
      add(titleText(this, CX, 640, t('common.championOf', { team: champion.short }), champion.short.length > 9 ? 52 : 64).setAngle(-4));
      add(ribbon(this, CX, 735, this.userFinish(), 560, 56).setAngle(-4));
      add(uiText(this, CX, 820, t('common.nextTime'), 24, PALETTE.yellow));
    }
  }

  // How far the user got: "SUBCAMPEÓN", "CAÍSTE EN OCTAVOS", "NO CLASIFICASTE"...
  userFinish() {
    const l = this.league;
    let last = null;
    for (const r of l.rounds) if (r.some((m) => m.a === l.userId || m.b === l.userId)) last = r;
    if (!last) {
      const pos = standings(l, userZone(l)).find((r) => r.id === l.userId).pos;
      return t('league.notQualified', { pos });
    }
    if (last.length === 1) return t('league.runnerUp');
    return t('league.outIn', { round: roundName(last.length * 2) });
  }

  confetti() {
    const colors = [COLORS.pink, COLORS.yellow, COLORS.cyan, COLORS.purple, 0xffffff];
    for (let i = 0; i < 40; i++) {
      const piece = this.add.rectangle(Phaser.Math.Between(0, GAME_W), -20, 9, 15, Phaser.Utils.Array.GetRandom(colors))
        .setStrokeStyle(2, COLORS.ink);
      this.tweens.add({
        targets: piece,
        y: GAME_H + 20,
        x: piece.x + Phaser.Math.Between(-120, 120),
        angle: Phaser.Math.Between(-720, 720),
        duration: Phaser.Math.Between(1800, 3000),
        onComplete: () => piece.destroy(),
      });
    }
  }
}

// The tournament is over and the user's team won the final.
function userWonLeague(league) {
  return league.champion === league.userId;
}
