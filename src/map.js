// Level Maps & Tile Map Management (Portrait 12x16 for Mobile & Tablet)
import { TILES, MAP_GRID_COLS, MAP_GRID_ROWS, TILE_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT, DIR } from './constants.js';
import { LEVELS, LEVEL_7_TEMPLATE } from './levels.js';

export { LEVELS, LEVEL_7_TEMPLATE };

export class GameMap {
  constructor() {
    this.grid = [];
    this.levelIndex = 0;
    this.tankCount = 1;
    this.tankType = 'level_1';
    this.spawnAllAtOnce = false;
    this.spawnInterval = 4000;
    this.levelName = '';
    this.totalLevels = LEVELS.length;
    this.spawnPoints = [
      { x: 5.5 * TILE_SIZE - 12, y: 1 * TILE_SIZE + 4, dir: DIR.DOWN },
      { x: 4 * TILE_SIZE + 4, y: 1 * TILE_SIZE + 4, dir: DIR.DOWN },
      { x: 7 * TILE_SIZE + 4, y: 1 * TILE_SIZE + 4, dir: DIR.DOWN }
    ];
    this.playerSpawn = { x: 5.5 * TILE_SIZE - 12, y: 14 * TILE_SIZE + 4, dir: DIR.UP };
  }

  loadArcadeMap() {
    const template = LEVEL_7_TEMPLATE;
    this.grid = [...(template.grid || template)];
    this.tankCount = Infinity;
    this.tankTypes = ['level_1'];
    this.tankType = 'level_1';
    this.spawnAllAtOnce = false;
    this.spawnInterval = 3000; // Will be dynamically controlled by ArcadeDirector
    this.levelName = 'ARCADE ENDLESS ONSLAUGHT';
  }

  loadLevel(stageNum) {

    this.totalLevels = LEVELS.length;
    this.levelIndex = (stageNum - 1) % LEVELS.length;
    const lvl = LEVELS[this.levelIndex];

    if (Array.isArray(lvl)) {
      this.grid = [...lvl];
      this.tankTypes = ["level_1"];
      this.tankCount = 1;
      this.tankType = "level_1";
      this.levelName = `LEVEL ${stageNum}`;
    } else {
      this.grid = [...lvl.grid];
      // Supports both tankType (singular) and tankTypes (plural) as either an array or string
      let parsedTypes = [];
      if (Array.isArray(lvl.tankTypes)) {
        parsedTypes = lvl.tankTypes;
      } else if (Array.isArray(lvl.tankType)) {
        parsedTypes = lvl.tankType;
      } else if (typeof lvl.tankType === "string") {
        parsedTypes = [lvl.tankType];
      } else if (typeof lvl.tankTypes === "string") {
        parsedTypes = [lvl.tankTypes];
      } else {
        parsedTypes = ["level_1"];
      }

      this.tankTypes = parsedTypes.flat();
      this.tankCount = lvl.tankCount !== undefined ? lvl.tankCount : this.tankTypes.length;
      this.tankType = this.tankTypes[0] || "level_1";
      this.spawnAllAtOnce = lvl.spawnAllAtOnce === true;
      this.spawnInterval = typeof lvl.spawnInterval === "number" ? lvl.spawnInterval : 4000;
      this.levelName = lvl.name || `LEVEL ${stageNum}`;
    }
  }

  getTile(gx, gy) {
    if (gx < 0 || gx >= MAP_GRID_COLS || gy < 0 || gy >= MAP_GRID_ROWS) {
      return TILES.STEEL;
    }
    return this.grid[gy * MAP_GRID_COLS + gx];
  }

  setTile(gx, gy, type) {
    if (gx >= 0 && gx < MAP_GRID_COLS && gy >= 0 && gy < MAP_GRID_ROWS) {
      this.grid[gy * MAP_GRID_COLS + gx] = type;
    }
  }

  isSolidAt(x, y, width, height) {
    if (x < 0 || x + width > CANVAS_WIDTH || y < 0 || y + height > CANVAS_HEIGHT) {
      return true;
    }

    const minGX = Math.floor((x + 0.5) / TILE_SIZE);
    const maxGX = Math.floor((x + width - 0.5) / TILE_SIZE);
    const minGY = Math.floor((y + 0.5) / TILE_SIZE);
    const maxGY = Math.floor((y + height - 0.5) / TILE_SIZE);

    for (let gy = minGY; gy <= maxGY; gy++) {
      for (let gx = minGX; gx <= maxGX; gx++) {
        const tile = this.getTile(gx, gy);
        if (tile === TILES.BRICK || tile === TILES.STEEL) {
          return true;
        }
      }
    }
    return false;
  }

  checkBulletCollision(bullet) {
    const minGX = Math.floor(bullet.x / TILE_SIZE);
    const maxGX = Math.floor((bullet.x + bullet.width) / TILE_SIZE);
    const minGY = Math.floor(bullet.y / TILE_SIZE);
    const maxGY = Math.floor((bullet.y + bullet.height) / TILE_SIZE);

    let hit = false;
    let hitSteel = false;

    for (let gy = minGY; gy <= maxGY; gy++) {
      for (let gx = minGX; gx <= maxGX; gx++) {
        const tile = this.getTile(gx, gy);
        if (tile === TILES.BRICK) {
          this.setTile(gx, gy, TILES.EMPTY);
          hit = true;
        } else if (tile === TILES.STEEL) {
          if (bullet.damage >= 4) {
            this.setTile(gx, gy, TILES.EMPTY);
          }
          hit = true;
          hitSteel = true;
        }
      }
    }
    return { hit, hitSteel };
  }

  draw(ctx) {
    for (let gy = 0; gy < MAP_GRID_ROWS; gy++) {
      for (let gx = 0; gx < MAP_GRID_COLS; gx++) {
        const tile = this.getTile(gx, gy);
        const px = gx * TILE_SIZE;
        const py = gy * TILE_SIZE;

        if (tile === TILES.BRICK) {
          this.drawOrangeBrick(ctx, px, py);
        } else if (tile === TILES.STEEL) {
          this.drawBlueSteel(ctx, px, py);
        }
      }
    }
  }

  drawOrangeBrick(ctx, x, y) {
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(x, y, TILE_SIZE, 2);
    ctx.fillRect(x, y, 2, TILE_SIZE);
    ctx.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);
    ctx.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
    ctx.fillStyle = '#c2410c';
    ctx.fillRect(x, y + TILE_SIZE / 2 - 1, TILE_SIZE, 2);
    ctx.fillRect(x + TILE_SIZE / 2 - 1, y, 2, TILE_SIZE);
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(x + 4, y + 4, 3, 3);
    ctx.fillRect(x + TILE_SIZE / 2 + 3, y + 4, 3, 3);
  }

  drawBlueSteel(ctx, x, y) {
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(x, y, TILE_SIZE, 3);
    ctx.fillRect(x, y, 3, TILE_SIZE);
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(x, y + TILE_SIZE - 3, TILE_SIZE, 3);
    ctx.fillRect(x + TILE_SIZE - 3, y, 3, TILE_SIZE);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(x + 5, y + 5, TILE_SIZE - 10, TILE_SIZE - 10);
    ctx.fillStyle = '#dbeafe';
    ctx.fillRect(x + 4, y + 4, 2, 2);
    ctx.fillRect(x + TILE_SIZE - 6, y + 4, 2, 2);
    ctx.fillRect(x + 4, y + TILE_SIZE - 6, 2, 2);
    ctx.fillRect(x + TILE_SIZE - 6, y + TILE_SIZE - 6, 2, 2);
  }
}
