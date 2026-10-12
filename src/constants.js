// Game Constants & Configuration

export const CANVAS_WIDTH = 384;   // 12 tiles * 32px (Portrait 3:4 for phones & tablets)
export const CANVAS_HEIGHT = 512;  // 16 tiles * 32px
export const TILE_SIZE = 32;
export const MAP_GRID_COLS = 12;
export const MAP_GRID_ROWS = 16;
export const TANK_SIZE = 24;

// Tile Types
export const TILES = {
  EMPTY: 0,
  BRICK: 1,
  STEEL: 2,
  WATER: 3,
  FOREST: 4,
  ICE: 5,
  BASE_ALIVE: 6,
  BASE_DESTROYED: 7
};

// Directions
export const DIR = {
  UP: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3
};

export const DIR_VECTORS = [
  { x: 0, y: -1 }, // UP
  { x: 1, y: 0 },  // RIGHT
  { x: 0, y: 1 },  // DOWN
  { x: -1, y: 0 }  // LEFT
];

// Tactical Slower Speeds
export const TANK_TYPES = {
  PLAYER: {
    type: 'player',
    name: 'Player Tank',
    color: '#1ECBE1',      // Cyan Blue
    accentColor: '#0e8a9c',
    speed: 1,            // Slower deliberate player movement
    hp: 8,                 // 8 HP points (4 hits from Lvl 1, 2 hits from Lvl 2/3)
    bulletSpeed: 3,
    bulletDamage: 1,
    cooldown: 380,
    scoreValue: 0
  },
  LEVEL_1: {
    type: 'level_1',
    name: 'Retro Tank Fodder',
    color: '#6AE11E',      // Lime Green
    accentColor: '#4aa512',
    speed: 0.70,           // Slow tactical scout
    hp: 1,                 // 1 shot kill anywhere
    bulletSpeed: 2,
    bulletDamage: 2,       // 2 dmg -> 3 shots kill player (6 / 2 = 3)
    cooldown: 950,
    scoreValue: 100
  },
  LEVEL_2: {
    type: 'level_2',
    name: 'Armored Tank',
    color: '#961EE1',      // Purple
    accentColor: '#6b0fa8',
    speed: 0.75,           // Same slow speed as Level 1
    hp: 2,                 // 2 shots anywhere, 1 shot on the back
    bulletSpeed: 2.3,
    bulletDamage: 3,       // 3 dmg -> 2 shots kill player (6 / 3 = 2)
    cooldown: 900,
    scoreValue: 250
  },
  LEVEL_3: {
    type: 'level_3',
    name: 'Commander Tank',
    color: '#E1341E',      // Red-Orange
    accentColor: '#a31e0e',
    speed: 0.80,           // Tactical commander paced speed (fixed from 80)
    hp: 4,                 // 4 shots anywhere, 2 shots on the back
    bulletSpeed: 2.6,
    bulletDamage: 3,       // 3 dmg -> 2 shots kill player (6 / 3 = 2)
    cooldown: 750,
    scoreValue: 500
  }
};

// Power-up Types
export const POWERUP_TYPES = {
  STAR: { id: 'star', name: 'Gun Upgrade', icon: '⭐', color: '#fbbf24', duration: 0 },
  SHIELD: { id: 'shield', name: 'Invulnerability', icon: '🛡️', color: '#38bdf8', duration: 10000 },
  BOMB: { id: 'bomb', name: 'Nuke Field', icon: '💣', color: '#f87171', duration: 0 },
  CLOCK: { id: 'clock', name: 'Freeze Enemies', icon: '⏱️', color: '#a78bfa', duration: 8000 },
  LIFE: { id: 'life', name: 'Extra Tank', icon: '❤️', color: '#f43f5e', duration: 0 }
};

// Game Modes
export const GAME_MODES = {
  CAMPAIGN: 'campaign',
  ARCADE: 'arcade'
};

// Game States
export const GAME_STATES = {
  TITLE: 'title',
  STAGE_START: 'stage_start',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
  VICTORY: 'victory'
};

// Arcade / Endless Mode Booster Drop Chance (e.g. 0.06 = ~6% chance per enemy spawn)
export const ARCADE_BOOSTER_CHANCE = 0.06;

