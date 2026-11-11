// League mode: two zones of 15 and then knockout playoffs. Everyone plays their zone once
// (14 matches) plus two interzonal matches: the classic, all on the same matchday, and a
// random one against the team that rests in the other zone that round. That makes 16
// matchdays with every team playing. The top 8 of each zone go to the round of 16.
import { TEAMS, TEAM_BY_ID, CLASSICS } from './teams.js';
import { BOT_LEVELS, BALL, LEAGUE } from '../config.js';

const STORAGE_KEY = 'tejo-futbol-liga-v2';
export const MATCH_SECONDS = 90;

// ---------- creation and saving ----------

// difficulty: 'veryEasy' | 'easy' | 'medium' | 'hard' (see botConfigFor). hazards: ice & soap on/off.
export function newLeague(userId, difficulty = 'medium', hazards = false) {
  const { zones, pairs } = drawZones();
  return {
    userId, difficulty, hazards, zones, round: 0, schedule: buildSchedule(pairs), results: [], prevPositions: null,
    stage: 'zones', rounds: [], bracketSeen: false, eliminated: false, champion: null,
  };
}

// The user's results in trailerLeague, repeated: a good campaign, not a perfect one.
const TRAILER_RESULTS = [[2, 1], [1, 0], [1, 1], [3, 1], [0, 1], [2, 0], [2, 2], [2, 1]];

// A league with all 16 matchdays played and the user through to the round of 16, to
// record the playoffs without playing the zones (see the ?trailer link in src/main.js).
export function trailerLeague(userId, difficulty = 'medium') {
  let league;
  do {
    league = newLeague(userId, difficulty, true);
    for (let i = 0; league.stage === 'zones'; i++) {
      const [userGoals, rivalGoals] = TRAILER_RESULTS[i % TRAILER_RESULTS.length];
      recordUserMatch(league, userGoals, rivalGoals);
    }
  } while (league.eliminated);
  return league;
}

export function loadLeague() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const league = raw ? JSON.parse(raw) : null;
    return league && league.zones && TEAM_BY_ID[league.userId] ? league : null;
  } catch {
    return null;
  }
}

export function saveLeague(league) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(league));
  } catch {
    // Private mode or storage full: the league still works until the tab is closed.
  }
}

export function clearLeague() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

// Classics are split between the zones, each side picked at random; the teams without a
// classic are shared out at random and paired up among themselves for that matchday.
function drawZones() {
  const inClassic = new Set(CLASSICS.flat());
  const free = shuffle(TEAMS.map((t) => t.id).filter((id) => !inClassic.has(id)));
  const freePairs = [];
  for (let i = 0; i < free.length; i += 2) freePairs.push([free[i], free[i + 1]]);
  const pairs = shuffle([...CLASSICS, ...freePairs]).map(([a, b]) => (Math.random() < 0.5 ? [a, b] : [b, a]));
  return { zones: { A: pairs.map((p) => p[0]), B: pairs.map((p) => p[1]) }, pairs };
}

// The 16 matchdays. Each zone rests one team per round, and the two teams resting play
// each other: the random interzonal. Zone B's rounds are reordered to make those pairs.
function buildSchedule(pairs) {
  const a = roundRobin(pairs.map((p) => p[0]));
  const b = roundRobin(pairs.map((p) => p[1]));
  const rivalOf = randomRivals(pairs);
  const rounds = a.map(({ matches, rest }) => {
    const other = b.find((r) => r.rest === rivalOf[rest]);
    const interzonal = Math.random() < 0.5 ? [rest, other.rest] : [other.rest, rest];
    return [...matches, ...other.matches, interzonal];
  });
  shuffle(rounds);
  const classics = pairs.map(([x, y]) => (Math.random() < 0.5 ? [x, y] : [y, x]));
  rounds.splice(LEAGUE.classicRound - 1, 0, classics);
  return rounds;
}

// Gives every team of zone A a rival from zone B that isn't its classic rival.
function randomRivals(pairs) {
  const rivals = pairs.map((p) => p[1]);
  do shuffle(rivals); while (pairs.some((p, i) => p[1] === rivals[i]));
  return Object.fromEntries(pairs.map((p, i) => [p[0], rivals[i]]));
}

// Circle method for an odd number of teams: everyone plays everyone once and rests one
// round (paired with the `null` ghost). Each match is hosted by whichever team has played
// fewer home games so far.
function roundRobin(ids) {
  const list = [...ids, null];
  const n = list.length;
  const rounds = [];
  const homeGames = Object.fromEntries(ids.map((id) => [id, 0]));
  for (let r = 0; r < n - 1; r++) {
    const matches = [];
    let rest = null;
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a === null || b === null) {
        rest = a ?? b;
        continue;
      }
      const aHosts = homeGames[a] < homeGames[b] || (homeGames[a] === homeGames[b] && Math.random() < 0.5);
      const [home, away] = aHosts ? [a, b] : [b, a];
      homeGames[home]++;
      matches.push([home, away]);
    }
    rounds.push({ matches, rest });
    list.splice(1, 0, list.pop()); // rotate everyone except the first team
  }
  return rounds;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- rounds ----------

export function totalRounds(league) {
  return league.schedule.length;
}

export function isFinished(league) {
  return league.stage === 'done';
}

export function currentPlayoffRound(league) {
  return league.rounds[league.rounds.length - 1];
}

// Whether the matchday about to be played is the classics one.
export function isClassicRound(league) {
  return league.stage === 'zones' && league.round === LEAGUE.classicRound - 1;
}

export function userZone(league) {
  return league.zones.A.includes(league.userId) ? 'A' : 'B';
}

// The user's next match: { home, away, userIsHome, knockout }, or null if they're out.
export function nextUserMatch(league) {
  if (league.stage === 'done' || league.eliminated) return null;
  if (league.stage === 'zones') {
    const [home, away] = league.schedule[league.round].find(([h, a]) => h === league.userId || a === league.userId);
    return { home, away, userIsHome: home === league.userId, knockout: false };
  }
  const m = currentPlayoffRound(league).find((x) => x.a === league.userId || x.b === league.userId);
  return m ? { home: m.a, away: m.b, userIsHome: m.a === league.userId, knockout: true } : null;
}

// Stores the user's score, simulates the rest of the round and moves to the next one.
export function recordUserMatch(league, userGoals, rivalGoals) {
  if (league.stage === 'playoffs') {
    const m = nextUserMatch(league);
    if (m) playPlayoffRound(league, { a: m.home, ag: m.userIsHome ? userGoals : rivalGoals, bg: m.userIsHome ? rivalGoals : userGoals });
    saveLeague(league);
    return;
  }
  const prev = positionsById(league);
  const round = league.schedule[league.round].map(([home, away]) => {
    if (home === league.userId) return { home, away, hg: userGoals, ag: rivalGoals, user: true };
    if (away === league.userId) return { home, away, hg: rivalGoals, ag: userGoals, user: true };
    return { home, away, ...simulateMatch(TEAM_BY_ID[home], TEAM_BY_ID[away]) };
  });
  league.results.push(round);
  league.prevPositions = prev;
  league.round++;
  if (league.round === league.schedule.length) startPlayoffs(league);
  saveLeague(league);
}

// The user is out: plays every remaining match to crown a champion.
export function simulateToEnd(league) {
  while (league.stage === 'playoffs') playPlayoffRound(league, null);
  saveLeague(league);
}

// Round of 16: first of a zone against the eighth of the other and so on, with the two
// zone winners on opposite sides of the bracket so they can only meet in the final.
// Each pair of neighbouring matches feeds the same next-round match.
function startPlayoffs(league) {
  const a = standings(league, 'A').map((r) => r.id);
  const b = standings(league, 'B').map((r) => r.id);
  const m = (x, y) => ({ a: x, b: y, ag: null, bg: null, winner: null, pens: false });
  league.rounds = [[
    m(a[0], b[7]), m(b[3], a[4]), m(a[2], b[5]), m(b[1], a[6]),
    m(b[0], a[7]), m(a[3], b[4]), m(b[2], a[5]), m(a[1], b[6]),
  ]];
  league.stage = 'playoffs';
  const qualified = [...a.slice(0, LEAGUE.qualifiers), ...b.slice(0, LEAGUE.qualifiers)];
  if (!qualified.includes(league.userId)) league.eliminated = true;
}

function playPlayoffRound(league, userResult) {
  const round = currentPlayoffRound(league);
  for (const m of round) {
    if (userResult && m.a === userResult.a) {
      Object.assign(m, { ag: userResult.ag, bg: userResult.bg, user: true });
      // Golden goal means the user's match always has a winner; a draw only happens if
      // they abandon, which counts as a loss.
      m.winner = m.ag > m.bg ? m.a : m.bg > m.ag ? m.b : (m.a === league.userId ? m.b : m.a);
    } else {
      const { hg, ag } = simulateMatch(TEAM_BY_ID[m.a], TEAM_BY_ID[m.b]);
      m.ag = hg;
      m.bg = ag;
      if (hg !== ag) m.winner = hg > ag ? m.a : m.b;
      else {
        // Penalties: a coin flip leaning toward the stronger team.
        const pa = 0.5 + (TEAM_BY_ID[m.a].strength - TEAM_BY_ID[m.b].strength) * 0.6;
        m.winner = Math.random() < pa ? m.a : m.b;
        m.pens = true;
      }
    }
  }
  const userIn = round.some((m) => m.a === league.userId || m.b === league.userId);
  if (userIn && !round.some((m) => m.winner === league.userId)) league.eliminated = true;

  if (round.length === 1) {
    league.champion = round[0].winner;
    league.stage = 'done';
    return;
  }
  const next = [];
  for (let i = 0; i < round.length; i += 2) {
    next.push({ a: round[i].winner, b: round[i + 1].winner, ag: null, bg: null, winner: null, pens: false });
  }
  league.rounds.push(next);
}

// Goals follow a Poisson distribution whose average depends on the strength gap,
// with a small home advantage. Draws happen naturally.
export function simulateMatch(home, away) {
  const diff = home.strength - away.strength;
  const hg = poisson(clamp(1.6 + 2.4 * diff + 0.2, 0.25, 4));
  const ag = poisson(clamp(1.6 - 2.4 * diff, 0.25, 4));
  return { hg, ag };
}

function poisson(lambda) {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = Math.random();
  while (p > limit) {
    k++;
    p *= Math.random();
  }
  return k;
}

// ---------- standings ----------

// The table of a zone ('A' or 'B'). Interzonal matches count too.
export function standings(league, zone) {
  const rows = Object.fromEntries(TEAMS.map((t) => [t.id, {
    id: t.id, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0,
  }]));

  for (const round of league.results) {
    for (const { home, away, hg, ag } of round) {
      const h = rows[home];
      const a = rows[away];
      h.pj++; a.pj++;
      h.gf += hg; h.gc += ag;
      a.gf += ag; a.gc += hg;
      if (hg > ag) { h.pg++; a.pp++; h.pts += 3; }
      else if (hg < ag) { a.pg++; h.pp++; a.pts += 3; }
      else { h.pe++; a.pe++; h.pts++; a.pts++; }
    }
  }

  const list = league.zones[zone].map((id) => rows[id]);
  for (const r of list) r.dg = r.gf - r.gc;
  // Points, then goal difference, then goals scored, then name.
  list.sort((x, y) => y.pts - x.pts || y.dg - x.dg || y.gf - x.gf
    || TEAM_BY_ID[x.id].name.localeCompare(TEAM_BY_ID[y.id].name));
  list.forEach((r, i) => { r.pos = i + 1; });
  return list;
}

function positionsById(league) {
  return Object.fromEntries(['A', 'B'].flatMap((zone) => standings(league, zone)).map((r) => [r.id, r.pos]));
}

// ---------- bots ----------

// How the league difficulty shifts every rival: on easy even the big teams play like a
// medium bot, on hard even the small ones do. Strong teams are always tougher than weak ones.
const DIFFICULTY_SHIFT = { veryEasy: -0.5, easy: -0.35, medium: 0, hard: 0.35 };

// Weakest bot of each league: the level itself, except on hard, where small teams play
// like a medium bot (so the big ones are a real step up).
const LEAGUE_FLOOR = { veryEasy: 'veryEasy', easy: 'easy', medium: 'medium', hard: 'medium' };

// Turns a team's strength (and the league difficulty) into bot settings, blending the
// weakest and hard levels.
export function botConfigFor(strength, difficulty = 'medium') {
  const t = clamp((strength - 0.35) / 0.6 + (DIFFICULTY_SHIFT[difficulty] ?? 0), 0, 1);
  const { hard } = BOT_LEVELS;
  const low = BOT_LEVELS[LEAGUE_FLOOR[difficulty] ?? 'medium'];
  return {
    speed: lerp(low.speed, hard.speed, t),
    reaction: lerp(low.reaction, hard.reaction, t),
    kickChance: lerp(low.kickChance, hard.kickChance, t),
    error: lerp(low.error, hard.error, t),
    predict: t > 0.6 ? hard.predict : low.predict,
    dash: t > 0.5 ? hard.dash : 'none',
    // Soft kicks and body only at the weak end of a league.
    kickPower: lerp(low.kickPower ?? 1, 1, t),
    bodyDamp: lerp(low.bodyDamp ?? BALL.bodyDamp, BALL.bodyDamp, t),
    aggression: lerp(low.aggression ?? 1, 1, t),
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
