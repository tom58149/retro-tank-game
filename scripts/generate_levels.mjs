// Generator script for 200 Campaign Levels
// Default frame: Player is hidden and protected in the bottom blue U-bunker (rows 12..15),
// with enemy spawn sheltered in the top blue U-bunker (rows 0..3).
// Midfield (rows 4..11) contains rich, creative tactical layout diversity.
// Special exceptions (Left U-bunker, No Blue, Only Blue) appear only on rare designated levels.

import fs from 'fs';
import path from 'path';

const COLS = 12;
const ROWS = 16;
const TOTAL_CELLS = COLS * ROWS; // 192

const EMPTY = 0;
const BRICK = 1; // Orange
const STEEL = 2; // Blue

function createEmptyGrid() {
  return new Array(TOTAL_CELLS).fill(EMPTY);
}

function set(grid, x, y, val) {
  if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
    grid[y * COLS + x] = val;
  }
}

function fillRect(grid, x1, y1, w, h, val) {
  for (let y = y1; y < y1 + h; y++) {
    for (let x = x1; x < x1 + w; x++) {
      set(grid, x, y, val);
    }
  }
}

// DEFAULT FRAME: Exactly preserves the retro classic player starting shelter!
// Player starts inside the bottom blue U-bunker, protected by the row 12 steel bar.
// Enemy spawns inside the top blue U-bunker, protected by the row 3 steel bar.
function applyDefaultShelters(grid) {
  // Top Enemy U-bunker (rows 0..3)
  fillRect(grid, 0, 0, 3, 1, BRICK);
  fillRect(grid, 9, 0, 3, 1, BRICK);

  fillRect(grid, 0, 1, 3, 2, BRICK);
  set(grid, 3, 1, STEEL);
  set(grid, 8, 1, STEEL);
  set(grid, 3, 2, STEEL);
  set(grid, 8, 2, STEEL);
  fillRect(grid, 9, 1, 3, 2, BRICK);

  fillRect(grid, 0, 3, 3, 1, BRICK);
  fillRect(grid, 3, 3, 6, 1, STEEL);
  fillRect(grid, 9, 3, 3, 1, BRICK);

  // Bottom Player Starting U-bunker (rows 12..15) - HIDES AND PROTECTS PLAYER!
  fillRect(grid, 0, 12, 3, 1, BRICK);
  fillRect(grid, 3, 12, 6, 1, STEEL);
  fillRect(grid, 9, 12, 3, 1, BRICK);

  fillRect(grid, 0, 13, 3, 2, BRICK);
  set(grid, 3, 13, STEEL);
  set(grid, 8, 13, STEEL);
  set(grid, 3, 14, STEEL);
  set(grid, 8, 14, STEEL);
  fillRect(grid, 9, 13, 3, 2, BRICK);

  fillRect(grid, 0, 15, 3, 1, BRICK);
  fillRect(grid, 9, 15, 3, 1, BRICK);

  // Ensure cavities inside U-bunkers are open for spawns
  for (let y = 0; y <= 2; y++) {
    for (let x = 4; x <= 7; x++) {
      grid[y * COLS + x] = EMPTY;
    }
  }
  for (let y = 13; y <= 15; y++) {
    for (let x = 4; x <= 7; x++) {
      grid[y * COLS + x] = EMPTY;
    }
  }
}

// Check connectivity: Can player reach top enemy row via EMPTY or BRICK (destructible)?
function isTraversable(grid) {
  const visited = new Uint8Array(TOTAL_CELLS);
  const queue = [{ x: 5, y: 14 }];
  visited[14 * COLS + 5] = 1;

  let reachedTop = false;

  while (queue.length > 0) {
    const { x, y } = queue.shift();
    if (y <= 1) {
      reachedTop = true;
      break;
    }

    const neighbors = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 }
    ];

    for (const nb of neighbors) {
      if (nb.x >= 0 && nb.x < COLS && nb.y >= 0 && nb.y < ROWS) {
        const idx = nb.y * COLS + nb.x;
        if (!visited[idx]) {
          const tile = grid[idx];
          // Steel is impassable; empty and brick are traversable
          if (tile !== STEEL) {
            visited[idx] = 1;
            queue.push(nb);
          }
        }
      }
    }
  }

  return reachedTop;
}

// 32 Distinct Midfield Generators (Rows 4 to 11)
const MIDFIELDS = [
  // 0: Classic Open Arena (pure duel)
  function mid_open(grid) {
    // Open field
  },

  // 1: Twin Pillars (from original Level 2)
  function mid_twin_pillars(grid) {
    fillRect(grid, 4, 5, 4, 1, STEEL);
    fillRect(grid, 1, 6, 2, 1, BRICK);
    fillRect(grid, 9, 6, 2, 1, BRICK);
    fillRect(grid, 1, 9, 2, 1, BRICK);
    fillRect(grid, 9, 9, 2, 1, BRICK);
    fillRect(grid, 4, 10, 4, 1, STEEL);
  },

  // 2: Commander Fortress Showdown (from original Level 3)
  function mid_fortress_showdown(grid) {
    fillRect(grid, 1, 5, 2, 1, STEEL);
    fillRect(grid, 4, 5, 4, 1, BRICK);
    fillRect(grid, 9, 5, 2, 1, STEEL);

    set(grid, 4, 6, BRICK);
    set(grid, 7, 6, BRICK);
    fillRect(grid, 1, 7, 2, 2, BRICK);
    fillRect(grid, 9, 7, 2, 2, BRICK);
    set(grid, 4, 9, BRICK);
    set(grid, 7, 9, BRICK);

    fillRect(grid, 1, 10, 2, 1, STEEL);
    fillRect(grid, 4, 10, 4, 1, BRICK);
    fillRect(grid, 9, 10, 2, 1, STEEL);
  },

  // 3: Diagonal Staggered Obstacles (from original Level 4)
  function mid_diagonal_stagger(grid) {
    set(grid, 1, 5, STEEL);
    set(grid, 2, 6, STEEL);
    set(grid, 7, 6, STEEL);
    set(grid, 3, 7, STEEL);
    set(grid, 8, 7, STEEL);
    set(grid, 9, 8, STEEL);
    fillRect(grid, 4, 7, 4, 2, BRICK);
  },

  // 4: Slalom Bars (from original Level 6)
  function mid_slalom_bars(grid) {
    fillRect(grid, 1, 5, 5, 1, STEEL);
    fillRect(grid, 6, 7, 5, 1, STEEL);
    fillRect(grid, 1, 9, 5, 1, BRICK);
  },

  // 5: Scattered Island Defense (from original Level 7)
  function mid_scattered_islands(grid) {
    set(grid, 1, 9, STEEL);
    set(grid, 10, 9, STEEL);
    set(grid, 2, 10, STEEL);
    set(grid, 9, 10, STEEL);
    fillRect(grid, 4, 6, 4, 1, BRICK);
    fillRect(grid, 5, 7, 2, 1, BRICK);
  },

  // 6: Central Plus Crossroads
  function mid_crossroads(grid) {
    fillRect(grid, 5, 5, 2, 6, STEEL);
    fillRect(grid, 2, 7, 8, 2, BRICK);
    // Center intersection open
    grid[7 * COLS + 5] = EMPTY;
    grid[7 * COLS + 6] = EMPTY;
    grid[8 * COLS + 5] = EMPTY;
    grid[8 * COLS + 6] = EMPTY;
  },

  // 7: Hourglass Chokepoint
  function mid_hourglass(grid) {
    fillRect(grid, 0, 5, 4, 1, BRICK);
    fillRect(grid, 8, 5, 4, 1, BRICK);
    fillRect(grid, 0, 7, 3, 2, STEEL);
    fillRect(grid, 9, 7, 3, 2, STEEL);
    fillRect(grid, 0, 10, 4, 1, BRICK);
    fillRect(grid, 8, 10, 4, 1, BRICK);
    set(grid, 5, 7, STEEL);
    set(grid, 6, 7, STEEL);
  },

  // 8: Diamond Bastion
  function mid_diamond(grid) {
    set(grid, 5, 5, STEEL);
    set(grid, 6, 5, STEEL);
    fillRect(grid, 4, 6, 4, 1, BRICK);
    fillRect(grid, 3, 7, 6, 2, BRICK);
    set(grid, 5, 7, STEEL);
    set(grid, 6, 7, STEEL);
    fillRect(grid, 4, 9, 4, 1, BRICK);
    set(grid, 5, 10, STEEL);
    set(grid, 6, 10, STEEL);
  },

  // 9: Vertical Trenches (3 sniper lanes)
  function mid_vertical_trenches(grid) {
    fillRect(grid, 3, 4, 1, 8, STEEL);
    fillRect(grid, 8, 4, 1, 8, STEEL);
    fillRect(grid, 5, 6, 2, 4, BRICK);
    // Breaches
    grid[7 * COLS + 3] = EMPTY;
    grid[8 * COLS + 8] = EMPTY;
  },

  // 10: Horizontal Trenches (The Gauntlet)
  function mid_horizontal_gauntlet(grid) {
    fillRect(grid, 1, 5, 8, 1, BRICK);
    fillRect(grid, 3, 7, 8, 1, STEEL);
    fillRect(grid, 1, 9, 8, 1, BRICK);
    grid[7 * COLS + 6] = EMPTY;
    grid[7 * COLS + 7] = EMPTY;
  },

  // 11: Checkerboard Cover
  function mid_checkerboard(grid) {
    for (let y = 5; y <= 10; y += 2) {
      for (let x = 1; x <= 10; x += 3) {
        fillRect(grid, x, y, 2, 1, (x + y) % 2 === 0 ? BRICK : STEEL);
      }
    }
  },

  // 12: Quad Pillbox Network
  function mid_quad_pillboxes(grid) {
    fillRect(grid, 1, 5, 2, 2, STEEL);
    fillRect(grid, 9, 5, 2, 2, STEEL);
    fillRect(grid, 1, 9, 2, 2, STEEL);
    fillRect(grid, 9, 9, 2, 2, STEEL);
    fillRect(grid, 4, 7, 4, 2, BRICK);
  },

  // 13: Dense Brick Labyrinth
  function mid_brick_labyrinth(grid) {
    for (let y = 5; y <= 10; y++) {
      fillRect(grid, (y % 2 === 0 ? 1 : 3), y, 8, 1, BRICK);
    }
    // Breaches
    grid[6 * COLS + 5] = EMPTY;
    grid[8 * COLS + 6] = EMPTY;
  },

  // 14: Central Steel Monolith with Brick Wings
  function mid_monolith(grid) {
    fillRect(grid, 5, 6, 2, 4, STEEL);
    fillRect(grid, 1, 6, 3, 4, BRICK);
    fillRect(grid, 8, 6, 3, 4, BRICK);
  },

  // 15: Castle Courtyard
  function mid_castle_courtyard(grid) {
    fillRect(grid, 2, 5, 8, 1, BRICK);
    fillRect(grid, 2, 10, 8, 1, BRICK);
    fillRect(grid, 2, 6, 1, 4, BRICK);
    fillRect(grid, 9, 6, 1, 4, BRICK);
    // Gates
    grid[5 * COLS + 5] = EMPTY;
    grid[5 * COLS + 6] = EMPTY;
    grid[10 * COLS + 5] = EMPTY;
    grid[10 * COLS + 6] = EMPTY;
    // Core
    fillRect(grid, 5, 7, 2, 2, STEEL);
  },

  // 16: Twin Guard Towers
  function mid_twin_towers(grid) {
    fillRect(grid, 3, 5, 2, 6, STEEL);
    fillRect(grid, 7, 5, 2, 6, STEEL);
    fillRect(grid, 5, 7, 2, 2, BRICK);
  },

  // 17: Stepped Pyramid
  function mid_stepped_pyramid(grid) {
    fillRect(grid, 5, 5, 2, 1, STEEL);
    fillRect(grid, 4, 6, 4, 1, BRICK);
    fillRect(grid, 3, 7, 6, 1, BRICK);
    fillRect(grid, 2, 8, 8, 1, BRICK);
    fillRect(grid, 3, 9, 6, 1, BRICK);
    fillRect(grid, 4, 10, 4, 1, BRICK);
    fillRect(grid, 5, 11, 2, 1, STEEL);
  },

  // 18: Split Spine Corridor
  function mid_split_spine(grid) {
    fillRect(grid, 5, 4, 2, 8, STEEL);
    grid[6 * COLS + 5] = EMPTY;
    grid[6 * COLS + 6] = EMPTY;
    grid[9 * COLS + 5] = EMPTY;
    grid[9 * COLS + 6] = EMPTY;
    fillRect(grid, 1, 6, 2, 4, BRICK);
    fillRect(grid, 9, 6, 2, 4, BRICK);
  },

  // 19: Double Chevron Slit
  function mid_double_chevron(grid) {
    fillRect(grid, 1, 5, 3, 1, STEEL);
    fillRect(grid, 8, 5, 3, 1, STEEL);
    fillRect(grid, 3, 7, 6, 2, BRICK);
    fillRect(grid, 1, 10, 3, 1, STEEL);
    fillRect(grid, 8, 10, 3, 1, STEEL);
  },

  // 20: Triangular Pillbox Formation
  function mid_triangular_bunkers(grid) {
    fillRect(grid, 5, 5, 2, 2, STEEL);
    fillRect(grid, 2, 9, 2, 2, STEEL);
    fillRect(grid, 8, 9, 2, 2, STEEL);
    fillRect(grid, 4, 8, 4, 1, BRICK);
  },

  // 21: Concentric Defense Rings
  function mid_concentric_rings(grid) {
    fillRect(grid, 3, 5, 6, 1, BRICK);
    fillRect(grid, 3, 10, 6, 1, BRICK);
    fillRect(grid, 3, 6, 1, 4, BRICK);
    fillRect(grid, 8, 6, 1, 4, BRICK);
    fillRect(grid, 5, 7, 2, 2, STEEL);
  },

  // 22: Alternating Zig-Zag Gauntlet
  function mid_zigzag(grid) {
    fillRect(grid, 0, 5, 7, 1, STEEL);
    fillRect(grid, 5, 7, 7, 1, BRICK);
    fillRect(grid, 0, 9, 7, 1, STEEL);
  },

  // 23: Iron Curtain with 3 Gates
  function mid_iron_curtain(grid) {
    fillRect(grid, 1, 7, 10, 2, STEEL);
    // 3 Gate breaches
    grid[7 * COLS + 2] = EMPTY;
    grid[8 * COLS + 2] = EMPTY;
    grid[7 * COLS + 5] = EMPTY;
    grid[8 * COLS + 5] = EMPTY;
    grid[7 * COLS + 6] = EMPTY;
    grid[8 * COLS + 6] = EMPTY;
    grid[7 * COLS + 9] = EMPTY;
    grid[8 * COLS + 9] = EMPTY;
    fillRect(grid, 4, 5, 4, 1, BRICK);
    fillRect(grid, 4, 10, 4, 1, BRICK);
  },

  // 24: Crossfire Barricades
  function mid_crossfire_bars(grid) {
    fillRect(grid, 1, 5, 4, 1, BRICK);
    fillRect(grid, 7, 5, 4, 1, BRICK);
    fillRect(grid, 3, 7, 6, 1, STEEL);
    fillRect(grid, 1, 9, 4, 1, BRICK);
    fillRect(grid, 7, 9, 4, 1, BRICK);
    grid[7 * COLS + 5] = EMPTY;
    grid[7 * COLS + 6] = EMPTY;
  },

  // 25: Demolition City Grid
  function mid_demolition_city(grid) {
    fillRect(grid, 1, 5, 3, 2, BRICK);
    fillRect(grid, 8, 5, 3, 2, BRICK);
    fillRect(grid, 4, 6, 4, 3, BRICK);
    fillRect(grid, 1, 9, 3, 2, BRICK);
    fillRect(grid, 8, 9, 3, 2, BRICK);
  },

  // 26: Sniper's Perch Alcoves
  function mid_snipers_alcoves(grid) {
    fillRect(grid, 0, 5, 2, 6, STEEL);
    fillRect(grid, 10, 5, 2, 6, STEEL);
    fillRect(grid, 4, 7, 4, 2, STEEL);
    fillRect(grid, 3, 6, 1, 4, BRICK);
    fillRect(grid, 8, 6, 1, 4, BRICK);
  },

  // 27: Staggered Pillboxes
  function mid_staggered_pillboxes(grid) {
    fillRect(grid, 2, 5, 2, 2, STEEL);
    fillRect(grid, 8, 6, 2, 2, STEEL);
    fillRect(grid, 5, 7, 2, 2, BRICK);
    fillRect(grid, 2, 9, 2, 2, STEEL);
    fillRect(grid, 8, 10, 2, 2, STEEL);
  },

  // 28: Valhalla Gates
  function mid_valhalla_gates(grid) {
    fillRect(grid, 1, 6, 4, 1, STEEL);
    fillRect(grid, 7, 6, 4, 1, STEEL);
    fillRect(grid, 4, 7, 4, 2, BRICK);
    fillRect(grid, 1, 9, 4, 1, STEEL);
    fillRect(grid, 7, 9, 4, 1, STEEL);
  },

  // 29: Diagonal Firing Slits
  function mid_diagonal_slits(grid) {
    fillRect(grid, 1, 5, 2, 1, STEEL);
    fillRect(grid, 3, 6, 2, 1, STEEL);
    fillRect(grid, 5, 7, 2, 2, BRICK);
    fillRect(grid, 7, 9, 2, 1, STEEL);
    fillRect(grid, 9, 10, 2, 1, STEEL);
  },

  // 30: Grand Central Citadel
  function mid_grand_citadel(grid) {
    fillRect(grid, 1, 5, 2, 6, STEEL);
    fillRect(grid, 9, 5, 2, 6, STEEL);
    fillRect(grid, 4, 5, 4, 1, BRICK);
    fillRect(grid, 4, 10, 4, 1, BRICK);
    fillRect(grid, 4, 7, 4, 2, STEEL);
  },

  // 31: Omega Endline Complex (Finale)
  function mid_omega_complex(grid) {
    fillRect(grid, 1, 5, 3, 2, STEEL);
    fillRect(grid, 8, 5, 3, 2, STEEL);
    fillRect(grid, 4, 6, 4, 4, BRICK);
    fillRect(grid, 5, 7, 2, 2, STEEL);
    fillRect(grid, 1, 9, 3, 2, STEEL);
    fillRect(grid, 8, 9, 3, 2, STEEL);
  }
];

// EXCEPTION GENERATORS:
// 1. LEFT U-BUNKER EXCEPTION: Blue U-bunkers shifted to the left flank
function createLeftUExceptionGrid() {
  const grid = createEmptyGrid();
  // Left side U-bunker (cols 0..3, rows 6..9)
  fillRect(grid, 0, 6, 3, 1, STEEL);
  fillRect(grid, 0, 7, 1, 2, STEEL);
  fillRect(grid, 0, 9, 3, 1, STEEL);

  // Brick barricade on right flank
  fillRect(grid, 9, 5, 3, 6, BRICK);
  fillRect(grid, 4, 7, 4, 2, BRICK);

  // Top and bottom corners
  fillRect(grid, 0, 0, 3, 2, BRICK);
  fillRect(grid, 9, 0, 3, 2, BRICK);
  fillRect(grid, 0, 14, 3, 2, BRICK);
  fillRect(grid, 9, 14, 3, 2, BRICK);

  // Clear spawn zones
  for (let y = 0; y <= 2; y++) for (let x = 4; x <= 7; x++) grid[y * COLS + x] = EMPTY;
  for (let y = 13; y <= 15; y++) for (let x = 4; x <= 7; x++) grid[y * COLS + x] = EMPTY;

  return grid;
}

// 2. NO BLUE BLOCKS EXCEPTION: 100% destructible orange brick
function createNoBlueExceptionGrid(variant = 0) {
  const grid = createEmptyGrid();
  // Apply shelter structure, but ALL made of orange brick!
  fillRect(grid, 0, 0, 3, 4, BRICK);
  fillRect(grid, 9, 0, 3, 4, BRICK);
  fillRect(grid, 3, 3, 6, 1, BRICK);

  fillRect(grid, 0, 12, 3, 4, BRICK);
  fillRect(grid, 9, 12, 3, 4, BRICK);
  fillRect(grid, 3, 12, 6, 1, BRICK);

  // Midfield is pure brick
  if (variant === 0) {
    fillRect(grid, 2, 5, 8, 1, BRICK);
    fillRect(grid, 2, 7, 8, 2, BRICK);
    fillRect(grid, 2, 10, 8, 1, BRICK);
    grid[7 * COLS + 5] = EMPTY;
    grid[8 * COLS + 6] = EMPTY;
  } else {
    for (let y = 5; y <= 10; y += 2) {
      fillRect(grid, 1, y, 10, 1, BRICK);
      grid[y * COLS + (y % 2 === 0 ? 3 : 8)] = EMPTY;
    }
  }

  // Clear spawn zones
  for (let y = 0; y <= 2; y++) for (let x = 4; x <= 7; x++) grid[y * COLS + x] = EMPTY;
  for (let y = 13; y <= 15; y++) for (let x = 4; x <= 7; x++) grid[y * COLS + x] = EMPTY;

  // Guarantee 0 steel
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === STEEL) grid[i] = BRICK;
  }
  return grid;
}

// 3. ONLY BLUE BLOCKS EXCEPTION: 100% indestructible steel
function createOnlyBlueExceptionGrid(variant = 0) {
  const grid = createEmptyGrid();
  applyDefaultShelters(grid);

  // Midfield with steel only
  if (variant === 0) {
    fillRect(grid, 4, 5, 4, 1, STEEL);
    fillRect(grid, 2, 7, 2, 2, STEEL);
    fillRect(grid, 8, 7, 2, 2, STEEL);
    fillRect(grid, 4, 10, 4, 1, STEEL);
  } else {
    fillRect(grid, 1, 5, 3, 1, STEEL);
    fillRect(grid, 8, 5, 3, 1, STEEL);
    fillRect(grid, 5, 6, 2, 4, STEEL);
    fillRect(grid, 1, 10, 3, 1, STEEL);
    fillRect(grid, 8, 10, 3, 1, STEEL);
  }

  // Guarantee 0 brick
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === BRICK) grid[i] = STEEL;
  }
  return grid;
}

// Tank progression configuration
function generateTankConfig(levelNum) {
  let tankCount = 1;
  if (levelNum === 1) tankCount = 1;
  else if (levelNum === 2) tankCount = 1;
  else if (levelNum === 3) tankCount = 1;
  else if (levelNum <= 10) tankCount = Math.min(4, 1 + Math.floor(levelNum / 3));
  else if (levelNum <= 30) tankCount = Math.floor(3 + ((levelNum - 10) / 20) * 3);
  else if (levelNum <= 60) tankCount = Math.floor(5 + ((levelNum - 30) / 30) * 3);
  else if (levelNum <= 100) tankCount = Math.floor(7 + ((levelNum - 60) / 40) * 5);
  else if (levelNum <= 150) tankCount = Math.floor(10 + ((levelNum - 100) / 50) * 5);
  else tankCount = Math.floor(12 + ((levelNum - 150) / 50) * 8); // Up to 20

  const tankTypes = [];
  for (let t = 0; t < tankCount; t++) {
    const progress = levelNum / 200;
    const roll = Math.random();

    if (levelNum <= 4) {
      tankTypes.push('level_1');
    } else if (levelNum <= 10) {
      tankTypes.push(t % 2 === 1 ? 'level_2' : 'level_1');
    } else if (levelNum <= 30) {
      if (t === 0 && levelNum >= 20) tankTypes.push('level_3');
      else tankTypes.push(t % 2 === 0 ? 'level_2' : 'level_1');
    } else if (levelNum <= 80) {
      const commanderChance = 0.15 + progress * 0.2;
      const armoredChance = 0.40;
      if (roll < commanderChance) tankTypes.push('level_3');
      else if (roll < commanderChance + armoredChance) tankTypes.push('level_2');
      else tankTypes.push('level_1');
    } else {
      const commanderChance = 0.35 + progress * 0.25;
      const armoredChance = 0.40;
      if (roll < commanderChance) tankTypes.push('level_3');
      else if (roll < commanderChance + armoredChance) tankTypes.push('level_2');
      else tankTypes.push('level_1');
    }
  }

  let spawnInterval = Math.max(1200, 3600 - Math.floor(levelNum * 12));
  const isAmbush = (levelNum % 25 === 0 && levelNum > 1);
  if (isAmbush) {
    spawnInterval = 800;
  }

  return {
    tankCount,
    tankTypes,
    spawnInterval,
    spawnAllAtOnce: isAmbush
  };
}

// Generate the 200 Levels
export function buildAllLevels() {
  const levels = [];

  // Designated rare exception levels:
  const LEFT_U_EXCEPTIONS = new Set([10, 45, 90, 140, 185]); // 5 levels with side U on the left
  const NO_BLUE_EXCEPTIONS = new Set([15, 60, 110, 160]);    // 4 levels with NO blue blocks (100% brick)
  const ONLY_BLUE_EXCEPTIONS = new Set([25, 75, 125, 175]); // 4 levels with ONLY blue blocks (100% steel)

  for (let i = 1; i <= 200; i++) {
    let grid;
    let nameSuffix = '';

    if (LEFT_U_EXCEPTIONS.has(i)) {
      // Rare Exception: Left U-Bunker Flank Ambush
      grid = createLeftUExceptionGrid();
      nameSuffix = ' [EXCEPTION: LEFT FLANK]';
    } else if (NO_BLUE_EXCEPTIONS.has(i)) {
      // Rare Exception: No Blue Blocks (Demolition)
      grid = createNoBlueExceptionGrid(i % 2);
      nameSuffix = ' [EXCEPTION: NO BLUE]';
    } else if (ONLY_BLUE_EXCEPTIONS.has(i)) {
      // Rare Exception: Only Blue Blocks (Ricochet)
      grid = createOnlyBlueExceptionGrid(i % 2);
      nameSuffix = ' [EXCEPTION: ONLY BLUE]';
    } else {
      // DEFAULT: Standard player bottom blue shelter + top enemy blue shelter!
      grid = createEmptyGrid();
      applyDefaultShelters(grid);

      // Midfield layout (Rows 4..11)
      let midIndex = (i - 1) % MIDFIELDS.length;
      if (i === 1) midIndex = 0; // Level 1 is open midfield
      if (i === 2) midIndex = 1; // Level 2 is twin pillars
      if (i === 3) midIndex = 2; // Level 3 is commander showdown
      if (i === 4) midIndex = 3; // Level 4 is diagonal stagger
      if (i === 6) midIndex = 4; // Level 6 is slalom bars
      if (i === 7) midIndex = 5; // Level 7 is scattered islands
      if (i === 200) midIndex = 31; // Level 200 is omega complex

      const midFn = MIDFIELDS[midIndex];
      midFn(grid);
    }

    // Verify pathfinding traversability
    if (!isTraversable(grid)) {
      // Breach emergency corridor
      grid[6 * COLS + 5] = EMPTY;
      grid[7 * COLS + 5] = EMPTY;
      grid[8 * COLS + 5] = EMPTY;
      grid[9 * COLS + 5] = EMPTY;
    }

    const { tankCount, tankTypes, spawnInterval, spawnAllAtOnce } = generateTankConfig(i);

    const baseNames = [
      'Scout Duel', 'Armored Duel', 'Commander Duel', 'Two 4 One', 'Iron Gate',
      'Platoon', 'Adauchi', 'Crossfire Alpha', 'Cobalt Trench', 'West Flank',
      'Brick Alley', 'Twin Pillars', 'Hourglass Pass', 'Fortress Core', 'Demolition Run',
      'Diamond Bastion', 'Pillbox Ridge', 'Castle Moat', 'Slalom Gauntlet', 'Omega Line',
      'Iron Vanguard', 'Thunder Pass', 'Ricochet Alley', 'Dust Storm', 'Cobalt Bastion',
      'Heavy Brigade', 'Frontline Assault', 'Valhalla Gate', 'Steel Labyrinth', 'Redoubt Alpha',
      'Commander Battalion', 'The Crucible', 'Citadel Siege', 'Apex Predator', 'Last Stand'
    ];
    const baseName = baseNames[(i - 1) % baseNames.length];
    const name = (i === 200) ? 'LEVEL 200: OMEGA CITADEL (FINALE)' : `LEVEL ${i}: ${baseName.toUpperCase()}${nameSuffix}`;

    levels.push({
      name,
      tankCount,
      tankType: tankTypes,
      tankTypes,
      spawnInterval,
      spawnAllAtOnce,
      grid
    });
  }

  return levels;
}

// Execute and format
const levels = buildAllLevels();

// Format grid: exactly 12 numbers per line, across 16 rows
function formatGrid(grid, indent = '      ') {
  const rows = [];
  for (let r = 0; r < 16; r++) {
    const rowSlice = grid.slice(r * 12, (r + 1) * 12);
    const rowStr = rowSlice.map(n => String(n).padStart(2, ' ')).join(',');
    rows.push(`${indent}${rowStr}`);
  }
  return `[\n${rows.join(',\n')}\n    ]`;
}

function formatLevel(lvl) {
  const gridFormatted = formatGrid(lvl.grid);
  const tankTypesFormatted = JSON.stringify(lvl.tankTypes);
  return `  {
    name: ${JSON.stringify(lvl.name)},
    tankCount: ${lvl.tankCount},
    tankType: ${tankTypesFormatted},
    tankTypes: ${tankTypesFormatted},
    spawnInterval: ${lvl.spawnInterval},
    spawnAllAtOnce: ${lvl.spawnAllAtOnce},
    grid: ${gridFormatted}
  }`;
}

const fileHeader = `// 200 Campaign Levels for Retro Tank Battle 1990
// Grid format is 12 columns by 16 rows (1:1 visual match with the game screen)
// 0 = Empty, 1 = Orange Brick, 2 = Blue Steel
//
// Default layout:
// - Rows 0..3: Top Enemy blue U-bunker & brick flanks
// - Rows 4..11: Creative midfield layouts (mazes, pillars, chicanes, fortresses)
// - Rows 12..15: Bottom Player starting blue U-bunker (hiding and protecting the player)
// Rare exceptions (Left U-bunker, No Blue, Only Blue) occur only on special designated levels.

`;

const arcadeTemplateGrid = levels[6].grid; // Level 7 template for Arcade mode
const formattedArcadeGrid = formatGrid(arcadeTemplateGrid, '  ');

const formattedLevels = levels.map(formatLevel).join(',\n\n');

const exportContent = `${fileHeader}export const LEVEL_7_TEMPLATE = {
  grid: ${formattedArcadeGrid}
};

export const LEVELS = [
${formattedLevels}
];
`;

fs.writeFileSync(path.resolve('src/levels.js'), exportContent, 'utf8');
console.log('Successfully wrote src/levels.js with default player starting shelter and 12x16 grid format!');
