// Gobble's Great Escape — tuning and stage table.
// One turkey, one farmer, three places to run through: the farmyard, the barn
// yard and the kitchen. Distances are in metres; the world itself is drawn in
// pixels, PIXELS_PER_METRE of them to a metre.

export const CANVAS_W = 1280;
export const CANVAS_H = 720;
export const GROUND_Y = 600;
export const STEP = 1 / 60;
export const PIXELS_PER_METRE = 50;
export const ESCAPE_DISTANCE_M = 1500;
export const MAX_LIVES = 3;

// The turkey runs at about a fifth of the way across the screen; the farmer
// chases from behind it, so the gap between them is the game's real health bar.
export const PLAYER = {
  width: 64,
  height: 78,
  startX: 300,
  jumpVelocity: -860,
  gravity: 2300,
  baseSpeed: 300,
  topSpeed: 390,
  stumbleSeconds: 0.55,
  invulnerableSeconds: 1.6,
  dashSeconds: 1.0,
};

export const FARMER = {
  width: 58,
  height: 118,
  startGap: 280,
  baseSpeed: 258,
  cornerBoost: 48,
  cornerGap: 190,
  searchSlow: 70,
  stumbleGain: 90,
};

// A stage is a stretch of the run: its name, where it starts, how fast the
// turkey runs there, how close together the hazards are packed, and which
// hazards its spawner may use.
export const STAGES = [
  {
    name: 'FARMYARD',
    fromM: 0,
    toM: 450,
    speed: 300,
    gapMin: 340,
    gapMax: 480,
    hazards: ['fence', 'pumpkin', 'mud', 'hay'],
  },
  {
    name: 'BARN YARD',
    fromM: 450,
    toM: 950,
    speed: 335,
    gapMin: 290,
    gapMax: 420,
    hazards: ['fence', 'pumpkin', 'mud', 'hay', 'doubleFence'],
  },
  {
    name: 'THE KITCHEN',
    fromM: 950,
    toM: ESCAPE_DISTANCE_M,
    speed: 370,
    gapMin: 250,
    gapMax: 370,
    hazards: ['fence', 'pumpkin', 'oven', 'knife', 'hay', 'doubleFence'],
  },
];

export const SCORES = {
  corn: 100,
  feather: 250,
  metre: 10,
  escapeBonus: 1000,
};

export const PALETTE = {
  skyTop: '#f7b733',
  skyMid: '#fcce6e',
  skyLow: '#fde9b8',
  hillFar: '#d99a4e',
  hillNear: '#b97e35',
  grass: '#7da23c',
  dirt: '#c98f4e',
  dirtDark: '#a8743a',
  barnRed: '#a63d2f',
  barnCream: '#f2e3c6',
  kitchenWall: '#e8c9a0',
  kitchenFloor: '#d9b380',
  ovenBody: '#5b5b66',
  ovenGlow: '#ff7a1a',
  knifeSteel: '#dfe6ee',
  knifeHandle: '#4a2f1d',
  turkeyBrown: '#8a5a2b',
  turkeyDark: '#6b4420',
  turkeyCream: '#f4e3c2',
  farmerShirt: '#b23a2e',
  farmerDenim: '#3a5a8c',
  farmerHat: '#d9b25f',
  cornYellow: '#ffd23e',
  hayGold: '#e8c25a',
};
