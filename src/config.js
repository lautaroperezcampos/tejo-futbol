// Every gameplay number lives here so the game can be tuned in one place.

export const GAME_W = 820;
export const GAME_H = 1120;

// Playable area (inside the white lines). The stands and scoreboard sit around it.
export const FIELD = { left: 70, right: 750, top: 130, bottom: 1050 };
export const CORNER_R = 90; // rounded corners; the ball bounces off the curve
export const MID_Y = (FIELD.top + FIELD.bottom) / 2;
export const CENTER_X = (FIELD.left + FIELD.right) / 2;

export const GOAL_W = 200;
export const GOAL_DEPTH = 36;
export const MOUTH_L = CENTER_X - GOAL_W / 2;
export const MOUTH_R = CENTER_X + GOAL_W / 2;
export const POST_R = 7;

export const PLAYER_R = 28;
export const PLAYER_SPEED = 380; // px/s
export const KICKOFF_OFFSET = 150; // distance from the goal line where players restart

export const BALL_R = 13;
export const BALL = {
  baseSpeed: 340, // speed after every kickoff
  maxSpeed: 1550, // hard cap; sub-steps keep it from tunnelling even at this speed
  wallBoost: 1.04, // each wall/post bounce
  bodyDamp: 0.88, // touching a body without kicking cushions the ball
  kickBoost: 1.15, // a kick multiplies the current speed...
  kickMin: 700, // ...but always leaves at least this fast
  minVerticalRatio: 0.22, // stops the ball from bouncing side to side forever
};

export const KICK = {
  reach: 15, // extra gap between body and ball where a kick still connects
  cooldown: 280, // ms between kicks
  buffer: 140, // ms a key press stays "armed" waiting for the ball
};

// Dash: a short burst of speed (Shift / R1). The bar fills in `charge` ms of play; the
// dash covers about duration × speed = 130 px, a short burst.
export const DASH = {
  charge: 5000, // ms to fill the bar
  duration: 120, // ms
  speed: 1100, // px/s
  kickBoost: 1.35, // kicking during a dash: dash + kick = power shot
};

// Optional power-ups ("hielo y jabón"): every so often an ice block or a bar of soap
// appears in one of the two halves. Whoever grabs it throws it at the rival, who gets
// frozen (very slow) or slippery (moves with a lot of inertia) for a while.
export const HAZARDS = {
  spawnMin: 6000, // ms between spawns (random in this range)
  spawnMax: 12000,
  lifetime: 9000, // ms an item stays on the pitch
  maxOnField: 2,
  radius: 24,
  freezeTime: 2000, // ms frozen
  freezeSpeed: 0, // speed multiplier while frozen (0 = can't move at all)
  soapTime: 3000, // ms slippery
  soapGrip: 1.2, // how fast you can change direction on soap (lower = slipperier)
  throwTime: 350, // ms the item takes to fly to the rival
  bigGoalTime: 6000, // ms the rival's goal stays big ("arco gigante")
  bigGoalExtra: 60, // px added on each side of that goal (200 -> 320 wide)
  bigGoalGrow: 350, // ms the posts take to slide out or back
};

// Volumes (0..1, before the sound button's level). The hits are synthesized and quiet on
// their own, so they go through a boost; the recorded music and crowd stay lower so the
// hits can be heard over them.
export const AUDIO = {
  sfxBoost: 2.2, // every synthesized effect (kicks, bounces, post...)
  menuMusic: 0.4,
  matchMusic: 0.2,
  matchMusicDucked: 0.08, // while a chant is playing
  chant: 0.3,
  goalShout: 0.8,
  ooh: 0.6,
};

// Score box in the top-left corner of the match: position, width without the clock, row
// height, width of the clock column (tournaments), kit size and dash ring radius.
export const SCORE_BOX = { x: 16, y: 12, w: 132, rowH: 56, clockW: 72, kitScale: 0.3, ringR: 24 };

export const WIN_GOALS = 5; // default length of a friendly

// Friendly lengths to pick from in "Antes de jugar": first to N goals, or N minutes on the
// clock (a draw is possible then).
export const FRIENDLY_LENGTHS = [
  { goals: 3 }, { goals: 5 }, { goals: 7 }, { goals: 10 },
  { minutes: 1 }, { minutes: 2 }, { minutes: 3 }, { minutes: 5 },
];
// Anti-stalling: the ball may stay this long in one half before it's a foul ("¡DEMORA!").
// From `warn` on, a countdown shows over the ball. On a foul the play restarts from the
// other player's side, heading at the one who held it.
export const STALL = { limit: 10000, warn: 5000 };

// Pitches for friendlies ("Antes de jugar"): normal, rain or in bad shape; random picks
// one of the three when the match starts.
export const PITCHES = [
  { id: 'normal', label: 'NORMAL' },
  { id: 'rain', label: 'LLUVIA' },
  { id: 'rough', label: 'EN MAL ESTADO' },
  { id: 'random', label: 'AL AZAR' },
];
export const PITCH = {
  rainGrip: 4, // like soap (HAZARDS.soapGrip) but much milder: players slide a little
  rainDrops: 140,
  rainTint: 0.18, // darker sky over the pitch
  holes: 2, // per half (mirrored in the other half, so it's fair)
  puddles: 2,
  holeR: 24,
  puddleR: 38,
  holeTurn: 0.45, // radians a hole knocks the ball off its line (either way)
  holeSlow: 0.85, // speed kept after a hole
  puddleDrag: 8, // per second while the ball is in a puddle (crossing one about halves it)
  puddleMin: 170, // px/s a puddle can slow the ball down to
  puddlePlayer: 0.7, // players move slower through puddles
  dryTint: 0x8a6a3a, // bad pitch: brown wash over the grass...
  dryAlpha: 0.32,
  dirtPatches: 5, // ...and worn dirt patches per half (mirrored)
};
export const GOAL_PAUSE = 1600; // ms celebrating before the kickoff
export const KICKOFF_DELAY = 700; // ms the ball waits in the centre

// Cartoon palette inspired by arcade football games: saturated colours, thick dark outlines.
export const PALETTE = {
  ink: '#1d1240', // outlines and shadows
  grassA: '#9be33b',
  grassB: '#88d12e',
  apron: '#5aa625',
  purple: '#7b3fe4',
  purpleDark: '#5a2bb0',
  pink: '#ff4fa3',
  yellow: '#ffd23f',
  cyan: '#4be0ff',
  white: '#ffffff',
  titleFill: '#e6f9ff',
  p1: '#2f8bff',
  p1Dark: '#1b5fd1',
  p2: '#ff4757',
  p2Dark: '#c92a3a',
};

// Same colours as numbers, for Phaser APIs that want 0xRRGGBB.
export const COLORS = Object.fromEntries(
  Object.entries(PALETTE).map(([k, v]) => [k, parseInt(v.slice(1), 16)]),
);

export const FONTS = {
  title: '"Bungee", "Arial Black", sans-serif',
  ui: '"Rubik", "Arial", sans-serif',
};

export const BOT_LEVELS = {
  // dash: 'none' never; 'defense' only to save a shot it can't reach walking;
  // 'smart' also to hit a power shot when it's lined up with the opponent's goal.
  // The four levels go up in even steps. Very easy is meant for kids: slow, late,
  // doesn't read the ball and barely kicks; its kicks are weak (kickPower) and its body
  // soaks up the ball (bodyDamp), so its shots can be stopped, and it only goes after
  // the ball some of the time (aggression). Easy keeps a little of that; levels without
  // these use the normal values.
  veryEasy: {
    label: 'Muy fácil', speed: 0.32, reaction: 520, predict: 'none', kickChance: 0.15, error: 90, dash: 'none',
    kickPower: 0.6, bodyDamp: 0.6, aggression: 0.3,
  },
  easy: {
    label: 'Fácil', speed: 0.55, reaction: 260, predict: 'straight', kickChance: 0.5, error: 40, dash: 'none',
    kickPower: 0.85, aggression: 0.75,
  },
  medium: { label: 'Medio', speed: 0.72, reaction: 160, predict: 'straight', kickChance: 0.75, error: 24, dash: 'defense' },
  hard: { label: 'Difícil', speed: 1.0, reaction: 45, predict: 'bounces', kickChance: 1, error: 4, dash: 'smart' },
};
