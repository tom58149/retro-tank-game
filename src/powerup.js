// Power-up System
import { POWERUP_TYPES, TILE_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';

export class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.width = TILE_SIZE - 4;
    this.height = TILE_SIZE - 4;
    this.type = type; // Key in POWERUP_TYPES
    this.config = POWERUP_TYPES[type];
    this.lifetime = 15000; // Disappears after 15 seconds if not collected
    this.destroyed = false;
    this.spawnTime = performance.now();
  }

  update(dt) {
    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.destroyed = true;
    }
  }

  draw(ctx) {
    const elapsed = performance.now() - this.spawnTime;
    // Pulsing effect
    const scale = 1 + Math.sin(elapsed * 0.008) * 0.1;
    const alpha = this.lifetime < 3000 ? (Math.floor(elapsed / 150) % 2 === 0 ? 0.3 : 1.0) : 1.0;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.scale(scale, scale);

    // Background pill/badge
    ctx.fillStyle = this.config.color;
    ctx.beginPath();
    ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 6);
    ctx.fill();

    // Dark border
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Emoji / Icon
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.config.icon, 0, 1);

    ctx.restore();
  }

  collidesWith(tank) {
    return (
      this.x < tank.x + tank.width &&
      this.x + this.width > tank.x &&
      this.y < tank.y + tank.height &&
      this.y + this.height > tank.y
    );
  }
}

// Deterministic Level Drop Table for Campaign Mode
export function getLevelPowerUpDrops(stageNum, tankCount = 1) {
  // Preset special levels per campaign design
  switch (stageNum) {
    case 6:
      return ['STAR'];             // Level 6: Gun upgrade
    case 9:
      return ['LIFE'];             // Level 9: Life
    case 15:
      return ['SHIELD'];           // Level 15: Shield
    case 19:
      return ['CLOCK'];            // Level 19: Clock
    case 23:
      return ['BOMB'];             // Level 23: Bomb
    case 26:
      return ['LIFE'];             // Level 26: Life
    case 30:
      return ['BOMB', 'LIFE'];     // Level 30: Bomb and Life
    case 33:
      return ['STAR', 'STAR'];     // Level 33: Star + Gun
    case 35:
      return ['SHIELD'];           // Level 35: Shield
  }

  // Level 35 onward: every 5 stages add a selection of rewards.
  // The more tanks, the more rewards:
  // <= 2 tanks: 1 reward
  // 3-4 tanks: 2 rewards
  // >= 5 tanks: 3 rewards
  if (stageNum > 35 && stageNum % 5 === 0) {
    const rewardCount = tankCount >= 5 ? 3 : (tankCount >= 3 ? 2 : 1);
    const pools = [
      ['BOMB', 'STAR', 'LIFE'],
      ['CLOCK', 'SHIELD', 'STAR'],
      ['STAR', 'LIFE', 'BOMB'],
      ['SHIELD', 'CLOCK', 'LIFE'],
      ['BOMB', 'CLOCK', 'SHIELD'],
      ['STAR', 'SHIELD', 'LIFE']
    ];
    const cycle = Math.floor(stageNum / 5) % pools.length;
    return pools[cycle].slice(0, rewardCount);
  }

  return [];
}

export class PowerUpManager {
  constructor() {
    this.activePowerUps = [];
  }

  spawn(x, y, typeKey) {
    if (!POWERUP_TYPES[typeKey]) return null;
    const px = Math.max(10, Math.min(CANVAS_WIDTH - TILE_SIZE - 10, x));
    const py = Math.max(10, Math.min(CANVAS_HEIGHT - TILE_SIZE - 10, y));

    const p = new PowerUp(px, py, typeKey);
    this.activePowerUps.push(p);
    return p;
  }

  spawnRandom(x, y) {
    const keys = Object.keys(POWERUP_TYPES);
    const selectedKey = keys[Math.floor(Math.random() * keys.length)];
    return this.spawn(x, y, selectedKey);
  }

  update(dt, playerTank, onCollected) {
    for (let i = this.activePowerUps.length - 1; i >= 0; i--) {
      const p = this.activePowerUps[i];
      p.update(dt);

      if (p.destroyed) {
        this.activePowerUps.splice(i, 1);
        continue;
      }

      if (playerTank && !playerTank.destroyed && p.collidesWith(playerTank)) {
        p.destroyed = true;
        this.activePowerUps.splice(i, 1);
        onCollected(p.type, p.config);
      }
    }
  }

  draw(ctx) {
    this.activePowerUps.forEach(p => p.draw(ctx));
  }

  clear() {
    this.activePowerUps = [];
  }
}
