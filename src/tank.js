// Tank Base Class, PlayerTank, and Tactical Seeking EnemyTank (with A* Pathfinding)
import { DIR, DIR_VECTORS, TILE_SIZE, TANK_TYPES, CANVAS_WIDTH, CANVAS_HEIGHT, TILES, MAP_GRID_COLS, MAP_GRID_ROWS } from './constants.js';
import { Bullet } from './bullet.js';

let tankIdCounter = 1;
const TANK_SIZE = 24;

export function findTacticalPath(startGX, startGY, targetGX, targetGY, map, dangerCheck = null, campKillZone = null) {
  if (startGX === targetGX && startGY === targetGY) return [];

  const cols = MAP_GRID_COLS;
  const rows = MAP_GRID_ROWS;
  const startIdx = startGY * cols + startGX;
  const targetIdx = targetGY * cols + targetGX;

  const dist = new Float32Array(cols * rows).fill(Infinity);
  const parent = new Int32Array(cols * rows).fill(-1);
  const parentDir = new Int8Array(cols * rows).fill(-1);

  dist[startIdx] = 0;
  const openSet = [{ idx: startIdx, gx: startGX, gy: startGY, f: 0 }];

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const cur = openSet.shift();

    if (cur.idx === targetIdx) {
      const path = [];
      let curr = targetIdx;
      while (curr !== startIdx && curr !== -1) {
        const gx = curr % cols;
        const gy = Math.floor(curr / cols);
        const dir = parentDir[curr];
        path.unshift({ gx, gy, dir });
        curr = parent[curr];
      }
      return path;
    }

    const cgx = cur.gx;
    const cgy = cur.gy;
    const curDist = dist[cur.idx];

    const neighbors = [
      { dir: DIR.UP, gx: cgx, gy: cgy - 1 },
      { dir: DIR.RIGHT, gx: cgx + 1, gy: cgy },
      { dir: DIR.DOWN, gx: cgx, gy: cgy + 1 },
      { dir: DIR.LEFT, gx: cgx - 1, gy: cgy }
    ];

    for (const nb of neighbors) {
      if (nb.gx < 0 || nb.gx >= cols || nb.gy < 0 || nb.gy >= rows) continue;

      const tile = map.getTile(nb.gx, nb.gy);
      if (tile === TILES.STEEL) continue;

      let cost = (tile === TILES.BRICK) ? 3.0 : 1.0;
      if (dangerCheck && dangerCheck(nb.gx, nb.gy)) {
        cost += 300.0; // Heavily penalize stepping into the player's firing corridor
      }
      if (campKillZone && campKillZone.gx === nb.gx && campKillZone.gy === nb.gy) {
        cost += 450.0; // Heavily penalize walking into player's pre-aimed corner kill ambush spot
      }

      const nbIdx = nb.gy * cols + nb.gx;
      const newDist = curDist + cost;

      if (newDist < dist[nbIdx]) {
        dist[nbIdx] = newDist;
        parent[nbIdx] = cur.idx;
        parentDir[nbIdx] = nb.dir;
        const h = Math.abs(nb.gx - targetGX) + Math.abs(nb.gy - targetGY);
        const f = newDist + h;

        const existing = openSet.find(q => q.idx === nbIdx);
        if (existing) {
          existing.f = f;
        } else {
          openSet.push({ idx: nbIdx, gx: nb.gx, gy: nb.gy, f });
        }
      }
    }
  }

  return null;
}


// Fine-Grained Raycasting Line-of-Sight Check (Prevents seeing through yellow/orange blocks & steel)
export function hasLineOfSight(map, x1, y1, x2, y2) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  if (dist < 4) return true;

  // Step in fine increments of 6 pixels (tile size is 32)
  const steps = Math.ceil(dist / 6);
  const dx = (x2 - x1) / steps;
  const dy = (y2 - y1) / steps;

  for (let i = 1; i < steps; i++) {
    const sx = x1 + dx * i;
    const sy = y1 + dy * i;
    const gx = Math.floor(sx / TILE_SIZE);
    const gy = Math.floor(sy / TILE_SIZE);

    const tile = map.getTile(gx, gy);
    if (tile === TILES.BRICK || tile === TILES.STEEL) {
      return false; // Obstructed by wall
    }
  }
  return true;
}

// 180-Degree Forward Vision Cone Check (True = in front/flank, False = blind spot behind)
export function isInVisionCone(enemyX, enemyY, enemyDir, targetX, targetY) {
  const v = DIR_VECTORS[enemyDir];
  const dx = targetX - enemyX;
  const dy = targetY - enemyY;
  const dot = dx * v.x + dy * v.y;
  return dot >= -4; // Slight peripheral tolerance; strictly false if behind
}

export class Tank {
  constructor(x, y, typeConfig, isPlayer = false) {
    this.id = tankIdCounter++;
    this.x = x;
    this.y = y;
    this.width = TANK_SIZE;
    this.height = TANK_SIZE;
    this.dir = isPlayer ? DIR.UP : DIR.DOWN;
    this.typeConfig = typeConfig;
    this.isPlayer = isPlayer;
    this.speed = typeConfig.speed;
    this.maxHp = typeConfig.hp;
    this.hp = this.maxHp;
    this.bulletSpeed = typeConfig.bulletSpeed;
    this.cooldown = typeConfig.cooldown;
    this.lastShotTime = 0;
    this.destroyed = false;
    this.isMoving = false;
    this.treadFrame = 0;
    this.treadTimer = 0;
    this.shieldTime = 0;
    this.upgradeLevel = 0;
    this.flashTime = 0;
    this.freezeTime = 0;
    this.isBonus = false;
  }

  update(dt) {
    if (this.shieldTime > 0) this.shieldTime -= dt;
    if (this.flashTime > 0) this.flashTime -= dt;
    if (this.freezeTime > 0) this.freezeTime -= dt;
    if (this.isMoving) {
      this.treadTimer += dt;
      if (this.treadTimer > 100) {
        this.treadFrame = (this.treadFrame + 1) % 2;
        this.treadTimer = 0;
      }
    }
  }

  tryMove(dir, dt, map, otherTanks = []) {
    this.dir = dir;
    const v = DIR_VECTORS[dir];
    const dist = this.speed * (dt / 16.67);
    const slideSpeed = Math.min(dist * 1.0, 2.5);

    let curX = this.x;
    let curY = this.y;

    let nextX = curX + v.x * dist;
    let nextY = curY + v.y * dist;

    // Check if blocked by terrain or arena borders
    if (map.isSolidAt(nextX, nextY, this.width, this.height)) {
      let glided = false;
      const maxOffsetCheck = 14;

      if (dir === DIR.UP || dir === DIR.DOWN) {
        let leftClear = false;
        let rightClear = false;

        for (let off = 2; off <= maxOffsetCheck; off += 2) {
          if (!leftClear && !map.isSolidAt(curX - off, curY, this.width, this.height) && !map.isSolidAt(curX - off, nextY, this.width, this.height)) {
            leftClear = true;
            break;
          }
        }
        for (let off = 2; off <= maxOffsetCheck; off += 2) {
          if (!rightClear && !map.isSolidAt(curX + off, curY, this.width, this.height) && !map.isSolidAt(curX + off, nextY, this.width, this.height)) {
            rightClear = true;
            break;
          }
        }

        if (leftClear && !rightClear) {
          curX = Math.max(0, curX - slideSpeed);
          nextX = curX;
          glided = !map.isSolidAt(nextX, nextY, this.width, this.height);
        } else if (rightClear && !leftClear) {
          curX = Math.min(CANVAS_WIDTH - this.width, curX + slideSpeed);
          nextX = curX;
          glided = !map.isSolidAt(nextX, nextY, this.width, this.height);
        }
      } else if (dir === DIR.LEFT || dir === DIR.RIGHT) {
        let upClear = false;
        let downClear = false;

        for (let off = 2; off <= maxOffsetCheck; off += 2) {
          if (!upClear && !map.isSolidAt(curX, curY - off, this.width, this.height) && !map.isSolidAt(nextX, curY - off, this.width, this.height)) {
            upClear = true;
            break;
          }
        }
        for (let off = 2; off <= maxOffsetCheck; off += 2) {
          if (!downClear && !map.isSolidAt(curX, curY + off, this.width, this.height) && !map.isSolidAt(nextX, curY + off, this.width, this.height)) {
            downClear = true;
            break;
          }
        }

        if (upClear && !downClear) {
          curY = Math.max(0, curY - slideSpeed);
          nextY = curY;
          glided = !map.isSolidAt(nextX, nextY, this.width, this.height);
        } else if (downClear && !upClear) {
          curY = Math.min(CANVAS_HEIGHT - this.height, curY + slideSpeed);
          nextY = curY;
          glided = !map.isSolidAt(nextX, nextY, this.width, this.height);
        }
      }

      if (!glided || map.isSolidAt(nextX, nextY, this.width, this.height)) {
        this.isMoving = false;
        return false;
      }
    }

    // Tank vs Tank non-sticking collision check
    for (const other of otherTanks) {
      if (other !== this && !other.destroyed) {
        const isColliding = (
          nextX < other.x + other.width &&
          nextX + this.width > other.x &&
          nextY < other.y + other.height &&
          nextY + this.height > other.y
        );

        if (isColliding) {
          const curDistSq = (this.x - other.x) ** 2 + (this.y - other.y) ** 2;
          const nextDistSq = (nextX - other.x) ** 2 + (nextY - other.y) ** 2;

          if (nextDistSq > curDistSq) {
            // Moving away
          } else {
            this.isMoving = false;
            return false;
          }
        }
      }
    }

    this.x = nextX;
    this.y = nextY;
    this.isMoving = true;
    return true;
  }

  canShoot(currentTime) {
    return currentTime - this.lastShotTime >= this.cooldown;
  }

  shoot(currentTime) {
    if (!this.canShoot(currentTime)) return null;
    this.lastShotTime = currentTime;
    let bx = this.x + this.width / 2;
    let by = this.y + this.height / 2;
    const v = DIR_VECTORS[this.dir];
    bx += v.x * (this.width / 2 + 4);
    by += v.y * (this.height / 2 + 4);
    const bulletDamage = this.isPlayer ? (1 + this.upgradeLevel) : (this.typeConfig.bulletDamage || 2);
    const bulletSpeed = this.bulletSpeed + (this.isPlayer ? this.upgradeLevel * 0.6 : 0);
    return new Bullet(bx, by, this.dir, bulletSpeed, bulletDamage, this.isPlayer, this.id);
  }

  takeDamage(amount = 1) {
    if (this.shieldTime > 0) return { killed: false, actualDamage: 0 };
    this.hp -= amount;
    this.flashTime = 120;
    if (this.hp <= 0) {
      this.destroyed = true;
      return { killed: true, actualDamage: amount };
    }
    return { killed: false, actualDamage: amount };
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    const angleMap = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    ctx.rotate(angleMap[this.dir]);
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    // Treads
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-halfW, -halfH, 4, this.height);
    ctx.fillRect(halfW - 4, -halfH, 4, this.height);

    ctx.fillStyle = this.treadFrame === 0 ? '#475569' : '#64748b';
    for (let ty = -halfH + 2; ty < halfH - 2; ty += 4) {
      const off = this.treadFrame * 2;
      ctx.fillRect(-halfW, ty + off, 4, 2);
      ctx.fillRect(halfW - 4, ty + off, 4, 2);
    }

    // Hull
    let hullColor = this.flashTime > 0 ? '#ffffff' : this.typeConfig.color;
    let accentColor = this.flashTime > 0 ? '#cbd5e1' : this.typeConfig.accentColor;

    if (!this.isPlayer && this.isBonus && this.flashTime <= 0) {
      const isRed = Math.floor(performance.now() / 150) % 2 === 0;
      hullColor = isRed ? '#ef4444' : '#fbbf24';
      accentColor = isRed ? '#b91c1c' : '#d97706';
    } else if (this.freezeTime > 0 && this.flashTime <= 0) {
      hullColor = '#38bdf8';
      accentColor = '#0284c7';
    }

    ctx.fillStyle = hullColor;
    ctx.fillRect(-halfW + 3, -halfH + 2, this.width - 6, this.height - 4);
    ctx.fillStyle = accentColor;
    ctx.fillRect(-halfW + 4, -halfH + 3, this.width - 8, 3);

    // Rear Armor
    ctx.fillStyle = accentColor;
    ctx.fillRect(-halfW + 4, halfH - 4, this.width - 8, 2);

    // Turret Dome
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(0, 1, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Barrel
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-2, -halfH - 3, 4, 8);
    ctx.restore();

    // Bonus Tank indicator
    if (!this.isPlayer && this.isBonus && !this.destroyed && this.hp > 0) {
      ctx.save();
      const pulse = 1 + Math.sin(performance.now() * 0.012) * 0.15;
      ctx.translate(this.x + this.width / 2, this.y - 14);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', 0, 0);
      ctx.restore();
    }

    // Freeze Ice indicator
    if (this.freezeTime > 0 && !this.destroyed && this.hp > 0) {
      ctx.save();
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('❄️', this.x + this.width / 2, this.y - (this.isBonus ? 24 : 14));
      ctx.restore();
    }

    // Mini Health Bar
    if (!this.isPlayer && this.maxHp > 1 && this.hp > 0) {
      const barW = 22;
      const barH = 3;
      const barX = this.x + this.width / 2 - barW / 2;
      const barY = this.y - 7;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      
      const hpPercent = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = hpPercent > 0.5 ? '#10b981' : (hpPercent > 0.25 ? '#f59e0b' : '#ef4444');
      ctx.fillRect(barX, barY, barW * hpPercent, barH);
    }

    // Shield
    if (this.shieldTime > 0) {
      const time = performance.now();
      const radius = this.width / 2 + 4 + Math.sin(time * 0.01) * 2;
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -time * 0.05;
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

export class PlayerTank extends Tank {
  constructor(x, y) {
    super(x, y, TANK_TYPES.PLAYER, true);
    this.lives = 3;
    this.score = 0;
    this.dir = DIR.UP;
    this.shieldTime = 2000;
  }

  respawn(spawnPos) {
    this.x = spawnPos.x;
    this.y = spawnPos.y;
    this.dir = DIR.UP;
    this.hp = this.maxHp;
    this.destroyed = false;
    this.shieldTime = 2000;
  }

  upgradeGun() {
    if (this.upgradeLevel < 3) {
      this.upgradeLevel++;
      if (this.upgradeLevel === 1) this.cooldown = 320;
      if (this.upgradeLevel >= 2) this.cooldown = 260;
    }
  }

  resetGunUpgrade() {
    this.upgradeLevel = 0;
    this.cooldown = TANK_TYPES.PLAYER.cooldown;
  }
}

export class EnemyTank extends Tank {
  constructor(x, y, typeConfig, isBonus = false, dropType = null) {
    super(x, y, typeConfig, false);
    this.dir = DIR.DOWN;
    this.isBonus = isBonus;
    this.dropType = dropType;
    this.freezeTime = 0;
    this.shootTimer = 0;
    this.shootInterval = Math.random() * 300 + typeConfig.cooldown;

    // Stealth, Hearing & Vision Cone State
    this.aiState = "PATROL"; // "PATROL", "INVESTIGATE", "ALERT"
    this.investigateTarget = null;
    this.lastSeenPlayerPos = null;
    this.alertIcon = "";
    this.alertIconTimer = 0;

    // Map-Wide Active Patrol Route (Seeks all battlefield sectors if player not at spawn)
    this.patrolWaypoints = [
      { gx: 5, gy: 14 },  // 1. Player base sector
      { gx: 1, gy: 11 },  // 2. Lower-left flank
      { gx: 1, gy: 6 },   // 3. Mid-left flank
      { gx: 5, gy: 7 },   // 4. Center arena chokepoint
      { gx: 10, gy: 6 },  // 5. Mid-right flank
      { gx: 10, gy: 11 }, // 6. Lower-right flank
      { gx: 5, gy: 4 }    // 7. North midfield
    ];
    this.patrolIndex = 0;

    // Tactical Pathfinding State
    this.path = [];
    this.pathTimer = 0;
    this.currentTargetGX = -1;
    this.currentTargetGY = -1;
    this.stuckTimer = 0;
    this.lastX = x;
    this.lastY = y;

    // Bullet Threat Evasion State
    this.dodgeTimer = 0;
    this.dodgeDir = null;

    // Convoy Queuing & Traffic Coordination State
    this.isQueuedBehindTank = false;
    this.isShootingObstacle = false;

    // Tactical Flanking State
    this.flankTimer = 0;
    this.flankTarget = null;
  }

  checkFriendlyTankAhead(moveDir, otherTanks) {
    const lookDist = 12;
    let checkRect;
    if (moveDir === DIR.UP) {
      checkRect = { x: this.x + 2, y: this.y - lookDist, width: this.width - 4, height: lookDist };
    } else if (moveDir === DIR.DOWN) {
      checkRect = { x: this.x + 2, y: this.y + this.height, width: this.width - 4, height: lookDist };
    } else if (moveDir === DIR.LEFT) {
      checkRect = { x: this.x - lookDist, y: this.y + 2, width: lookDist, height: this.height - 4 };
    } else if (moveDir === DIR.RIGHT) {
      checkRect = { x: this.x + this.width, y: this.y + 2, width: lookDist, height: this.height - 4 };
    } else {
      return null;
    }

    for (const other of otherTanks) {
      if (other !== this && !other.destroyed && !other.isPlayer) {
        if (
          checkRect.x < other.x + other.width &&
          checkRect.x + checkRect.width > other.x &&
          checkRect.y < other.y + other.height &&
          checkRect.y + checkRect.height > other.y
        ) {
          return other;
        }
      }
    }
    return null;
  }

  getCurrentPatrolWaypoint(map) {
    for (let i = 0; i < this.patrolWaypoints.length; i++) {
      const idx = (this.patrolIndex + i) % this.patrolWaypoints.length;
      const wp = this.patrolWaypoints[idx];
      if (map.getTile(wp.gx, wp.gy) !== TILES.STEEL) {
        return wp;
      }
    }
    return { gx: 5, gy: 8 };
  }

  advancePatrolWaypoint(map) {
    this.patrolIndex = (this.patrolIndex + 1) % this.patrolWaypoints.length;
  }

  hearNoise(noiseX, noiseY, soundType = "gunfire") {
    if (this.destroyed) return;
    const nGX = Math.floor((noiseX + 12) / TILE_SIZE);
    const nGY = Math.floor((noiseY + 12) / TILE_SIZE);

    // If not in visual combat, investigate the sound source
    if (this.aiState !== "ALERT") {
      this.aiState = "INVESTIGATE";
      this.investigateTarget = { gx: nGX, gy: nGY };
      this.alertIcon = "❓";
      this.alertIconTimer = 900;
      this.path = []; // Recalculate path toward sound
    }
  }

  updateAI(dt, map, playerTank, otherTanks, bullets = [], campTracker = null) {
    if (this.freezeTime > 0) {
      return null;
    }

    this.shootTimer += dt;
    this.pathTimer += dt;

    if (this.alertIconTimer > 0) this.alertIconTimer -= dt;
    if (this.dodgeTimer > 0) this.dodgeTimer -= dt;
    if (this.flankTimer > 0) this.flankTimer -= dt;

    this.isQueuedBehindTank = false;
    this.isShootingObstacle = false;

    if (!playerTank || playerTank.destroyed) {
      this.tryMove(this.dir, dt, map, otherTanks);
      return null;
    }

    // Bullet Threat Detection & Evasion (Anti-Bullet Wall Tactics)
    let closestThreat = null;
    let minThreatDist = Infinity;

    for (const b of bullets) {
      if (!b || b.destroyed || !b.isPlayer) continue;

      const bCenterX = b.x + b.width / 2;
      const bCenterY = b.y + b.height / 2;
      const tCenterX = this.x + this.width / 2;
      const tCenterY = this.y + this.height / 2;

      let isHeadingTowards = false;
      let dist = 0;

      // Bullet travelling DOWN towards tank below
      if (b.dir === DIR.DOWN && bCenterY < tCenterY + this.height / 2 && bCenterY > tCenterY - 240) {
        if (Math.abs(bCenterX - tCenterX) < (this.width / 2 + 8)) {
          isHeadingTowards = true;
          dist = tCenterY - bCenterY;
        }
      }
      // Bullet travelling UP towards tank above
      else if (b.dir === DIR.UP && bCenterY > tCenterY - this.height / 2 && bCenterY < tCenterY + 240) {
        if (Math.abs(bCenterX - tCenterX) < (this.width / 2 + 8)) {
          isHeadingTowards = true;
          dist = bCenterY - tCenterY;
        }
      }
      // Bullet travelling RIGHT towards tank to the right
      else if (b.dir === DIR.RIGHT && bCenterX < tCenterX + this.width / 2 && bCenterX > tCenterX - 240) {
        if (Math.abs(bCenterY - tCenterY) < (this.height / 2 + 8)) {
          isHeadingTowards = true;
          dist = tCenterX - bCenterX;
        }
      }
      // Bullet travelling LEFT towards tank to the left
      else if (b.dir === DIR.LEFT && bCenterX > tCenterX - this.width / 2 && bCenterX < tCenterX + 240) {
        if (Math.abs(bCenterY - tCenterY) < (this.height / 2 + 8)) {
          isHeadingTowards = true;
          dist = bCenterX - tCenterX;
        }
      }

      if (isHeadingTowards && dist > 0 && dist < minThreatDist) {
        // Only consider a threat if there is direct line of sight (in same corridor/lane, not blocked by wall)
        if (hasLineOfSight(map, bCenterX, bCenterY, tCenterX, tCenterY)) {
          minThreatDist = dist;
          closestThreat = b;
        }
      }
    }

    if (closestThreat) {
      const counterDir = (closestThreat.dir === DIR.DOWN) ? DIR.UP :
                         (closestThreat.dir === DIR.UP) ? DIR.DOWN :
                         (closestThreat.dir === DIR.RIGHT) ? DIR.LEFT : DIR.RIGHT;

      // 1. Tactical Evasion: Determine perpendicular dodge options
      let primaryDodgeDir = null;
      const isVerticalThreat = (closestThreat.dir === DIR.DOWN || closestThreat.dir === DIR.UP);

      if (isVerticalThreat) {
        // Perpendicular flanks: LEFT and RIGHT
        const leftClear = !map.isSolidAt(this.x - 18, this.y, this.width, this.height);
        const rightClear = !map.isSolidAt(this.x + 18, this.y, this.width, this.height);

        if (leftClear && !rightClear) {
          primaryDodgeDir = DIR.LEFT;
        } else if (rightClear && !leftClear) {
          primaryDodgeDir = DIR.RIGHT;
        } else if (leftClear && rightClear) {
          // If both flanks open, maintain active dodge direction or move away from player X
          if (this.dodgeDir === DIR.LEFT || this.dodgeDir === DIR.RIGHT) {
            primaryDodgeDir = this.dodgeDir;
          } else {
            primaryDodgeDir = (playerTank && playerTank.x > this.x) ? DIR.LEFT : DIR.RIGHT;
          }
        }
      } else {
        // Perpendicular flanks: UP and DOWN
        const upClear = !map.isSolidAt(this.x, this.y - 18, this.width, this.height);
        const downClear = !map.isSolidAt(this.x, this.y + 18, this.width, this.height);

        if (upClear && !downClear) {
          primaryDodgeDir = DIR.UP;
        } else if (downClear && !upClear) {
          primaryDodgeDir = DIR.DOWN;
        } else if (upClear && downClear) {
          if (this.dodgeDir === DIR.UP || this.dodgeDir === DIR.DOWN) {
            primaryDodgeDir = this.dodgeDir;
          } else {
            primaryDodgeDir = (playerTank && playerTank.y > this.y) ? DIR.UP : DIR.DOWN;
          }
        }
      }

      if (primaryDodgeDir !== null) {
        // Sidestep out of the bullet lane into side cover / corridor
        this.dodgeDir = primaryDodgeDir;
        this.dodgeTimer = 350;
        this.tryMove(primaryDodgeDir, dt, map, otherTanks);
        return null;
      } else {
        // 2. Hallway Retreat: Flanks are blocked by walls (tight 1-tile corridor).
        // Turn around and flee down the hallway away from the player's bullet.
        const retreatDir = closestThreat.dir; // Move in bullet direction (away from incoming fire)
        const couldRetreat = this.tryMove(retreatDir, dt, map, otherTanks);
        if (!couldRetreat) {
          // If cornered against a dead end, halt and face the threat front-on!
          this.isMoving = false;
          this.dir = counterDir;
          if (this.canShoot(performance.now())) {
            return this.shoot(performance.now());
          }
        }
        // Fleeing down hallway: tank is driving away with its back turned, NEVER shoots backwards
        return null;
      }
    } else if (this.dodgeTimer > 0 && this.dodgeDir !== null) {
      // Complete active sideways evasion maneuver to ensure full clearance behind cover
      this.tryMove(this.dodgeDir, dt, map, otherTanks);
      return null;
    }

    const curGX = Math.floor((this.x + this.width / 2) / TILE_SIZE);
    const curGY = Math.floor((this.y + this.height / 2) / TILE_SIZE);
    const playerGX = Math.floor((playerTank.x + playerTank.width / 2) / TILE_SIZE);
    const playerGY = Math.floor((playerTank.y + playerTank.height / 2) / TILE_SIZE);

    const enemyCenterX = this.x + this.width / 2;
    const enemyCenterY = this.y + this.height / 2;
    const playerCenterX = playerTank.x + playerTank.width / 2;
    const playerCenterY = playerTank.y + playerTank.height / 2;

    // 1. Sensory Perception: Forward Vision Cone + Strict Wall Obscuration
    const inVisionCone = isInVisionCone(
      enemyCenterX,
      enemyCenterY,
      this.dir,
      playerCenterX,
      playerCenterY
    );

    // Pixel raycast checking for blocking yellow/orange bricks or steel
    const hasLOS = hasLineOfSight(map, enemyCenterX, enemyCenterY, playerCenterX, playerCenterY);

    if (inVisionCone && hasLOS) {
      // Clear visual contact!
      if (this.aiState !== "ALERT") {
        this.alertIcon = "❗";
        this.alertIconTimer = 1100;
      }
      this.aiState = "ALERT";
      this.lastSeenPlayerPos = { gx: playerGX, gy: playerGY };
    } else {
      // Line of sight blocked by blocks or player is behind in blind spot:
      // NEVER track player through blocks! Switch to investigate last known spot
      if (this.aiState === "ALERT") {
        this.aiState = "INVESTIGATE";
        this.investigateTarget = this.lastSeenPlayerPos || { gx: playerGX, gy: playerGY };
      }
    }

    // Wall of Fire Detection & Danger Corridor Calculation
    const playerBullets = bullets.filter(b => b && !b.destroyed && b.isPlayer);
    const hasPlayerBarrage = playerBullets.length >= 1;
    let playerBarrageDir = null;
    if (hasPlayerBarrage) {
      playerBarrageDir = playerBullets[0].dir;
    }

    const isDangerCorridor = (gx, gy) => {
      if (playerBarrageDir === null || playerBarrageDir === undefined) return false;
      if (playerBarrageDir === DIR.UP) {
        return gy <= playerGY && Math.abs(gx - playerGX) <= 1;
      } else if (playerBarrageDir === DIR.DOWN) {
        return gy >= playerGY && Math.abs(gx - playerGX) <= 1;
      } else if (playerBarrageDir === DIR.RIGHT) {
        return gx >= playerGX && Math.abs(gy - playerGY) <= 1;
      } else if (playerBarrageDir === DIR.LEFT) {
        return gx <= playerGX && Math.abs(gy - playerGY) <= 1;
      }
      return false;
    };

    const amIInDangerLine = isDangerCorridor(curGX, curGY);

    // Anti-Corner-Camping & Barrage Flank Trigger:
    // If player is camping a corner choke, or laying down a wall of fire, force tanks to flank around!
    const isPlayerCamping = campTracker && campTracker.cornerCampActive;
    const shouldFlank = (hasPlayerBarrage && !amIInDangerLine && !closestThreat) || (isPlayerCamping && !hasLOS && !closestThreat);

    if (shouldFlank) {
      this.aiState = "FLANK";
      this.flankTimer = 3500;
      this.alertIcon = "⚡";
      this.alertIconTimer = 1600;

      // Smart Flank Target: Choose opposite side of map or player's blind rear
      let fGX, fGY;
      if (isPlayerCamping) {
        // Player is camping in a corner; choose an entry point from the OPPOSITE side
        // If player is on left half (gx < 6), route to right flank (gx = 10)
        // If player is on right half (gx >= 6), route to left flank (gx = 1)
        const targetSideCol = (playerGX < 6) ? 10 : 1;
        const targetSideRow = (playerGY < 8) ? 1 : 14;
        fGX = targetSideCol;
        fGY = (Math.abs(curGY - playerGY) < 3) ? targetSideRow : playerGY;
      } else {
        const vF = DIR_VECTORS[playerBarrageDir];
        fGX = playerGX - vF.x * 2;
        fGY = playerGY - vF.y * 2;
      }

      fGX = Math.max(1, Math.min(MAP_GRID_COLS - 2, fGX));
      fGY = Math.max(1, Math.min(MAP_GRID_ROWS - 2, fGY));

      if (map.getTile(fGX, fGY) === TILES.STEEL) {
        fGX = curGX > playerGX ? Math.min(MAP_GRID_COLS - 2, playerGX + 2) : Math.max(1, playerGX - 2);
        fGY = Math.max(1, Math.min(MAP_GRID_ROWS - 2, playerGY));
      }
      this.flankTarget = { gx: fGX, gy: fGY };
    }


    // 2. Direct Combat Line of Sight Check (Blind Spot & Obstacle Protection)
    const sameCol = Math.abs(enemyCenterX - playerCenterX) < 12;
    const sameRow = Math.abs(enemyCenterY - playerCenterY) < 12;

    // ONLY engage in line-of-sight combat if there are NO blocks in the way
    if (sameCol && hasLOS) {
      const targetDir = (playerTank.y > this.y) ? DIR.DOWN : DIR.UP;
      if (this.dir === targetDir) {
        if (this.canShoot(performance.now())) {
          return this.shoot(performance.now());
        }
      } else if (inVisionCone && this.aiState === "ALERT") {
        this.dir = targetDir;
        if (this.canShoot(performance.now())) {
          return this.shoot(performance.now());
        }
      }
    } else if (sameRow && hasLOS) {
      const targetDir = (playerTank.x > this.x) ? DIR.RIGHT : DIR.LEFT;
      if (this.dir === targetDir) {
        if (this.canShoot(performance.now())) {
          return this.shoot(performance.now());
        }
      } else if (inVisionCone && this.aiState === "ALERT") {
        this.dir = targetDir;
        if (this.canShoot(performance.now())) {
          return this.shoot(performance.now());
        }
      }
    }

    // 3. Target Position Resolution (Flanking vs Seeking vs Alert Chasing vs Investigating)
    let targetGX, targetGY;
    let pathDangerCheck = null;

    if (this.aiState === "FLANK" && this.flankTarget && (this.flankTimer > 0 || hasPlayerBarrage)) {
      targetGX = this.flankTarget.gx;
      targetGY = this.flankTarget.gy;
      pathDangerCheck = isDangerCorridor;

      // Transition to direct ALERT combat if ambush reached or direct sight on player
      if ((curGX === targetGX && curGY === targetGY) || (inVisionCone && hasLOS)) {
        this.aiState = "ALERT";
        this.flankTarget = null;
        this.flankTimer = 0;
      }
    } else if (this.aiState === "ALERT") {
      targetGX = playerGX;
      targetGY = playerGY;
    } else if (this.aiState === "INVESTIGATE" && this.investigateTarget) {
      targetGX = this.investigateTarget.gx;
      targetGY = this.investigateTarget.gy;
      // If reached investigated position, resume actively seeking player
      if (curGX === targetGX && curGY === targetGY) {
        this.aiState = "SEEK";
        this.investigateTarget = null;
      }
    } else {
      // SEEK MODE: Actively hunt and seek out the player across the map!
      this.aiState = "SEEK";
      targetGX = playerGX;
      targetGY = playerGY;
    }

    // 4. Tactical Pathfinding Recalculation
    const campKillZone = (campTracker && campTracker.cornerCampActive && campTracker.campKillZoneGX >= 0)
      ? { gx: campTracker.campKillZoneGX, gy: campTracker.campKillZoneGY }
      : null;

    const targetChanged = (targetGX !== this.currentTargetGX || targetGY !== this.currentTargetGY);
    if (this.pathTimer > 250 || this.path.length === 0 || targetChanged) {
      this.pathTimer = 0;
      this.currentTargetGX = targetGX;
      this.currentTargetGY = targetGY;
      this.path = findTacticalPath(curGX, curGY, targetGX, targetGY, map, pathDangerCheck, campKillZone) || [];
    }

    // Stuck watchdog
    const movedDist = Math.hypot(this.x - this.lastX, this.y - this.lastY);
    if (movedDist < 0.25) {
      if (!this.isQueuedBehindTank && !this.isShootingObstacle) {
        this.stuckTimer += dt;
      } else {
        this.stuckTimer = 0;
      }
    } else {
      this.stuckTimer = 0;
    }
    this.lastX = this.x;
    this.lastY = this.y;

    if (this.stuckTimer > 2500) {
      this.stuckTimer = 0;
      this.path = findTacticalPath(curGX, curGY, targetGX, targetGY, map, pathDangerCheck, campKillZone) || [];
    }


    // 5. Follow Path & Demolish Obstacles
    if (this.path.length > 0) {
      let wp = this.path[0];
      if (wp.gx === curGX && wp.gy === curGY) {
        this.path.shift();
        wp = this.path.length > 0 ? this.path[0] : null;
      }

      if (wp) {
        const tileAtWP = map.getTile(wp.gx, wp.gy);
        const wpTargetX = wp.gx * TILE_SIZE + (TILE_SIZE - this.width) / 2;
        const wpTargetY = wp.gy * TILE_SIZE + (TILE_SIZE - this.height) / 2;
        const dx = wpTargetX - this.x;
        const dy = wpTargetY - this.y;

        let moveDir = this.dir;
        if (Math.abs(dx) > Math.abs(dy)) {
          moveDir = dx > 0 ? DIR.RIGHT : DIR.LEFT;
          if (Math.abs(dy) > 0.8) {
            const shiftY = Math.sign(dy) * Math.min(Math.abs(dy), this.speed * 0.9 * (dt / 16.67));
            const newY = this.y + shiftY;
            if (!map.isSolidAt(this.x, newY, this.width, this.height)) {
              let blocked = false;
              for (const other of otherTanks) {
                if (other !== this && !other.destroyed) {
                  if (
                    this.x < other.x + other.width &&
                    this.x + this.width > other.x &&
                    newY < other.y + other.height &&
                    newY + this.height > other.y
                  ) {
                    blocked = true;
                    break;
                  }
                }
              }
              if (!blocked) {
                this.y = newY;
              }
            }
          }
        } else {
          moveDir = dy > 0 ? DIR.DOWN : DIR.UP;
          if (Math.abs(dx) > 0.8) {
            const shiftX = Math.sign(dx) * Math.min(Math.abs(dx), this.speed * 0.9 * (dt / 16.67));
            const newX = this.x + shiftX;
            if (!map.isSolidAt(newX, this.y, this.width, this.height)) {
              let blocked = false;
              for (const other of otherTanks) {
                if (other !== this && !other.destroyed) {
                  if (
                    newX < other.x + other.width &&
                    newX + this.width > other.x &&
                    this.y < other.y + other.height &&
                    this.y + this.height > other.y
                  ) {
                    blocked = true;
                    break;
                  }
                }
              }
              if (!blocked) {
                this.x = newX;
              }
            }
          }
        }

        // If waypoint is Orange/Yellow Brick, aim and fire!
        if (tileAtWP === TILES.BRICK) {
          const wpDir = (wp.dir !== undefined && wp.dir !== -1) ? wp.dir : moveDir;
          this.dir = wpDir;
          this.isShootingObstacle = true;
          this.isQueuedBehindTank = false;
          this.stuckTimer = 0;
          if (this.canShoot(performance.now())) {
            return this.shoot(performance.now());
          }
        } else {
          this.isShootingObstacle = false;
          // Check if friendly tank is directly ahead in our lane
          const friendlyAhead = this.checkFriendlyTankAhead(moveDir, otherTanks);
          if (friendlyAhead) {
            this.isQueuedBehindTank = true;
            this.isMoving = false;
            this.stuckTimer = 0;
          } else {
            this.isQueuedBehindTank = false;
            this.tryMove(moveDir, dt, map, otherTanks);
          }
        }
      }
    } else {
      const dx = targetGX * TILE_SIZE + 4 - this.x;
      const dy = targetGY * TILE_SIZE + 4 - this.y;
      const moveDir = Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? DIR.DOWN : DIR.UP) : (dx > 0 ? DIR.RIGHT : DIR.LEFT);
      const friendlyAhead = this.checkFriendlyTankAhead(moveDir, otherTanks);
      if (friendlyAhead) {
        this.isQueuedBehindTank = true;
        this.isMoving = false;
        this.stuckTimer = 0;
      } else {
        this.isQueuedBehindTank = false;
        this.tryMove(moveDir, dt, map, otherTanks);
      }
    }

    // 6. Front Brick Proactive Demolition
    const v = DIR_VECTORS[this.dir];
    const frontGX = Math.floor((this.x + this.width / 2 + v.x * 20) / TILE_SIZE);
    const frontGY = Math.floor((this.y + this.height / 2 + v.y * 20) / TILE_SIZE);
    const frontTile = map.getTile(frontGX, frontGY);
    if (frontTile === TILES.BRICK && this.canShoot(performance.now())) {
      return this.shoot(performance.now());
    }

    // Only fire periodic shots if in direct visual alert combat (never through walls or into steel)
    if (this.shootTimer > this.shootInterval) {
      this.shootTimer = 0;
      this.shootInterval = Math.random() * 400 + this.typeConfig.cooldown;
      if (frontTile !== TILES.STEEL && this.aiState === "ALERT" && hasLOS && inVisionCone) {
        return this.shoot(performance.now());
      }
    }

    return null;
  }

  draw(ctx) {
    super.draw(ctx);

    // Floating Alert Status Badge (❗ Spotted / ❓ Heard noise / ⚡ Flanking)
    if (this.alertIconTimer > 0 && !this.destroyed) {
      ctx.save();
      const cx = this.x + this.width / 2;
      const cy = this.y - 12;

      const isAlert = this.alertIcon === "❗";
      const isFlank = this.alertIcon === "⚡";

      ctx.fillStyle = isAlert ? "#ef4444" : (isFlank ? "#06b6d4" : "#f59e0b");
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(isAlert ? "!" : (isFlank ? "⚡" : "?"), cx, cy + 0.5);
      ctx.restore();
    }
  }
}

// Continuous Tank Overlap Separation
export function resolveTankOverlaps(allTanks, map = null) {
  for (let i = 0; i < allTanks.length; i++) {
    for (let j = i + 1; j < allTanks.length; j++) {
      const a = allTanks[i];
      const b = allTanks[j];
      if (!a || a.destroyed || !b || b.destroyed) continue;

      const aCenterX = a.x + a.width / 2;
      const aCenterY = a.y + a.height / 2;
      const bCenterX = b.x + b.width / 2;
      const bCenterY = b.y + b.height / 2;

      const overlapX = (a.width / 2 + b.width / 2) - Math.abs(aCenterX - bCenterX);
      const overlapY = (a.height / 2 + b.height / 2) - Math.abs(aCenterY - bCenterY);

      if (overlapX > 0 && overlapY > 0) {
        if (overlapX < overlapY) {
          const push = overlapX / 2 + 0.2;
          const aDir = aCenterX < bCenterX ? -1 : 1;
          const bDir = -aDir;

          const aNewX = Math.max(0, Math.min(CANVAS_WIDTH - a.width, a.x + aDir * push));
          const bNewX = Math.max(0, Math.min(CANVAS_WIDTH - b.width, b.x + bDir * push));

          const aSolid = map ? map.isSolidAt(aNewX, a.y, a.width, a.height) : false;
          const bSolid = map ? map.isSolidAt(bNewX, b.y, b.width, b.height) : false;

          if (!aSolid && !bSolid) {
            a.x = aNewX;
            b.x = bNewX;
          } else if (!aSolid && bSolid) {
            const aFullX = Math.max(0, Math.min(CANVAS_WIDTH - a.width, a.x + aDir * (overlapX + 0.4)));
            if (!map || !map.isSolidAt(aFullX, a.y, a.width, a.height)) {
              a.x = aFullX;
            }
          } else if (aSolid && !bSolid) {
            const bFullX = Math.max(0, Math.min(CANVAS_WIDTH - b.width, b.x + bDir * (overlapX + 0.4)));
            if (!map || !map.isSolidAt(bFullX, b.y, b.width, b.height)) {
              b.x = bFullX;
            }
          }
        } else {
          const push = overlapY / 2 + 0.2;
          const aDir = aCenterY < bCenterY ? -1 : 1;
          const bDir = -aDir;

          const aNewY = Math.max(0, Math.min(CANVAS_HEIGHT - a.height, a.y + aDir * push));
          const bNewY = Math.max(0, Math.min(CANVAS_HEIGHT - b.height, b.y + bDir * push));

          const aSolid = map ? map.isSolidAt(a.x, aNewY, a.width, a.height) : false;
          const bSolid = map ? map.isSolidAt(b.x, bNewY, b.width, b.height) : false;

          if (!aSolid && !bSolid) {
            a.y = aNewY;
            b.y = bNewY;
          } else if (!aSolid && bSolid) {
            const aFullY = Math.max(0, Math.min(CANVAS_HEIGHT - a.height, a.y + aDir * (overlapY + 0.4)));
            if (!map || !map.isSolidAt(a.x, aFullY, a.width, a.height)) {
              a.y = aFullY;
            }
          } else if (aSolid && !bSolid) {
            const bFullY = Math.max(0, Math.min(CANVAS_HEIGHT - b.height, b.y + bDir * (overlapY + 0.4)));
            if (!map || !map.isSolidAt(a.x, bFullY, a.width, a.height)) {
              b.y = bFullY;
            }
          }
        }
      }
    }
  }
}
