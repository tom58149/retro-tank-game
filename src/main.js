// Main Game Loop and Orchestrator
import { CANVAS_WIDTH, CANVAS_HEIGHT, GAME_STATES, GAME_MODES, TANK_TYPES, DIR, ARCADE_BOOSTER_CHANCE } from './constants.js';
import { sound } from './audio.js';
import { InputHandler } from './input.js';
import { GameMap } from './map.js';
import { PlayerTank, EnemyTank, resolveTankOverlaps } from './tank.js';
import { EffectManager } from './effects.js';
import { PowerUpManager, getLevelPowerUpDrops } from './powerup.js';
import { UIRenderer } from './ui.js';
import { logger } from './logger.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.ctx.imageSmoothingEnabled = false;

    this.input = new InputHandler();
    this.map = new GameMap();
    this.effects = new EffectManager();
    this.powerupManager = new PowerUpManager();
    this.ui = new UIRenderer();

    this.mode = GAME_MODES.CAMPAIGN;
    this.selectedModeIndex = 0; // 0 = CAMPAIGN, 1 = ARCADE

    this.state = GAME_STATES.TITLE;
    this.stage = 1;
    this.maxStages = this.map.totalLevels;
    this.player = null;
    this.enemies = [];
    this.bullets = [];

    this.stageScheduledDrops = [];
    this.sessionPowerups = { star: 0, shield: 0, clock: 0, bomb: 0, life: 0 };

    this.totalEnemiesToSpawn = 1;
    this.enemiesSpawned = 0;
    this.victoryTimer = 0;
    this.gameOverTimer = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 4000;
    this.lastTime = performance.now();

    // Arcade Endless Mode Director state
    this.arcadeStats = {
      wave: 1,
      totalKills: 0,
      tanksSpawnedThisWave: 0,
      leadTankColor: '#6AE11E',
      nextMilestoneScore: 1000
    };

    // Anti-Corner-Camping Telemetry & Kill Zone Tracking
    this.campTracker = {
      playerLastGX: -1,
      playerLastGY: -1,
      stationaryTimer: 0,
      killCountInZone: 0,
      cornerCampActive: false,
      campDirection: null,
      campKillZoneGX: -1,
      campKillZoneGY: -1,
      bannerShown: false
    };

    this.initDOM();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  initDOM() {
    const btnSound = document.getElementById('btn-sound');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        const enabled = sound.toggleSound();
        btnSound.textContent = enabled ? '🔊' : '🔇';
      });
    }

    const handleCanvasClick = (e) => {
      if (performance.now() < (this.titleClickDebounceUntil || 0)) {
        return;
      }
      sound.init();
      if (this.state === GAME_STATES.TITLE) {
        // Allow clicking either Campaign card or Arcade card directly
        const rect = this.canvas.getBoundingClientRect();
        const clientY = e.clientY - rect.top;
        const scaleY = CANVAS_HEIGHT / rect.height;
        const canvasY = clientY * scaleY;

        if (canvasY >= 95 && canvasY < 166) {
          this.selectedModeIndex = 0;
          this.startGame(GAME_MODES.CAMPAIGN);
        } else if (canvasY >= 166 && canvasY < 242) {
          this.selectedModeIndex = 1;
          this.startGame(GAME_MODES.ARCADE);
        } else {
          const chosenMode = this.selectedModeIndex === 1 ? GAME_MODES.ARCADE : GAME_MODES.CAMPAIGN;
          this.startGame(chosenMode);
        }
      } else if (this.state === GAME_STATES.GAME_OVER && (this.gameOverTimer || 0) > 1500) {
        this.startGame(this.mode);
      } else if (this.state === GAME_STATES.VICTORY && (this.victoryTimer || 0) > 1500) {
        this.startGame(this.mode);
      }
    };

    this.canvas.addEventListener('pointerdown', handleCanvasClick);
    document.getElementById('stage-wrapper')?.addEventListener('pointerdown', (e) => {
      if (performance.now() < (this.titleClickDebounceUntil || 0)) {
        return;
      }
      if (e.target !== this.canvas) {
        sound.init();
        if (this.state === GAME_STATES.TITLE) {
          const chosenMode = this.selectedModeIndex === 1 ? GAME_MODES.ARCADE : GAME_MODES.CAMPAIGN;
          this.startGame(chosenMode);
        } else if (this.state === GAME_STATES.GAME_OVER && (this.gameOverTimer || 0) > 1500) {
          this.startGame(this.mode);
        } else if (this.state === GAME_STATES.VICTORY && (this.victoryTimer || 0) > 1500) {
          this.startGame(this.mode);
        }
      }
    });

    const btnHome = document.getElementById('btn-home');
    const modal = document.getElementById('home-confirm-modal');
    const btnModalCancel = document.getElementById('btn-modal-cancel');
    const btnModalConfirm = document.getElementById('btn-modal-confirm');

    if (modal) {
      const stopModalPropagation = (e) => {
        e.stopPropagation();
      };
      modal.addEventListener('pointerdown', stopModalPropagation);
      modal.addEventListener('pointerup', stopModalPropagation);
      modal.addEventListener('touchstart', stopModalPropagation, { passive: true });
      modal.addEventListener('touchend', stopModalPropagation, { passive: true });
      modal.addEventListener('click', stopModalPropagation);
    }

    if (btnHome) {
      btnHome.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        sound.init();
        if (this.state === GAME_STATES.TITLE) {
          return; // Already at home/title screen
        }
        if (this.state === GAME_STATES.GAME_OVER || this.state === GAME_STATES.VICTORY) {
          // Mission finished, return immediately
          this.state = GAME_STATES.TITLE;
          this.titleClickDebounceUntil = performance.now() + 500;
          this.effects.clear();
          this.input.reset();
          return;
        }
        // Active gameplay: pause game and warn user
        if (this.state === GAME_STATES.PLAYING) {
          this.state = GAME_STATES.PAUSED;
        }
        modal?.classList.remove('hidden');
      });
    }

    if (btnModalCancel) {
      const handleCancel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        sound.init();
        modal?.classList.add('hidden');
        if (this.state === GAME_STATES.PAUSED) {
          this.state = GAME_STATES.PLAYING;
        }
      };
      btnModalCancel.addEventListener('click', handleCancel);
      btnModalCancel.addEventListener('pointerdown', (e) => e.stopPropagation());
    }

    if (btnModalConfirm) {
      const handleConfirm = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        sound.init();
        modal?.classList.add('hidden');
        logger.info('navigation', 'Player confirmed exit to Main Menu');
        this.titleClickDebounceUntil = performance.now() + 500;
        this.state = GAME_STATES.TITLE;
        this.enemies = [];
        this.bullets = [];
        this.effects.clear();
        this.input.reset();
      };
      btnModalConfirm.addEventListener('click', handleConfirm);
      btnModalConfirm.addEventListener('pointerdown', (e) => e.stopPropagation());
    }

    const btnCRT = document.getElementById('btn-crt');
    if (btnCRT) {
      btnCRT.addEventListener('click', () => {
        document.getElementById('crt-overlay')?.classList.toggle('active');
      });
    }
  }

  startGame(mode = GAME_MODES.CAMPAIGN) {
    this.mode = mode;
    this.player = new PlayerTank(this.map.playerSpawn.x, this.map.playerSpawn.y);
    this.player.score = 0;
    this.sessionPowerups = { star: 0, shield: 0, clock: 0, bomb: 0, life: 0 };
    this.powerupManager.clear();

    logger.setTag('game_mode', mode);
    logger.event('game_start', { mode });

    if (this.mode === GAME_MODES.ARCADE) {
      this.player.maxHp = 10;
      this.player.hp = 10;
      this.startArcadeMode();
    } else {
      this.player.maxHp = 8;
      this.player.hp = 8;
      this.stage = 1;
      this.maxStages = this.map.totalLevels;
      this.startStage(this.stage);
    }
  }

  startArcadeMode() {
    logger.info('mode', 'Arcade Endless mode initiated');
    this.state = GAME_STATES.PLAYING;
    this.map.loadArcadeMap();
    this.enemies = [];
    this.bullets = [];
    this.effects.clear();
    this.powerupManager.clear();

    this.totalEnemiesToSpawn = Infinity;
    this.enemiesSpawned = 0;
    this.victoryTimer = 0;
    this.gameOverTimer = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 3200; // Paced starting interval

    this.arcadeStats = {
      wave: 1,
      totalKills: 0,
      tanksSpawnedThisWave: 0,
      leadTankColor: '#6AE11E',
      nextMilestoneScore: 1000
    };

    this.campTracker = {
      playerLastGX: -1,
      playerLastGY: -1,
      stationaryTimer: 0,
      killCountInZone: 0,
      cornerCampActive: false,
      campDirection: null,
      campKillZoneGX: -1,
      campKillZoneGY: -1,
      bannerShown: false
    };

    if (this.player) {
      this.player.maxHp = 10;
      this.player.hp = 10;
      this.player.respawn(this.map.playerSpawn);
    }

    // Spawn first enemy after brief tactical delay
    this.spawnEnemy();

    sound.playStageStart();
    this.effects.addFloatingText('ARCADE: ENDLESS ONSLAUGHT', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20, '#fbbf24');
    this.effects.addFloatingText('SURVIVE & GET HIGHEST SCORE!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 6, '#38bdf8');
  }

  startStage(stageNum) {
    this.stage = stageNum;
    this.state = GAME_STATES.PLAYING;
    this.ui.saveCampaignStage(stageNum);
    logger.setTag('stage', stageNum);

    this.map.loadLevel(this.stage);
    this.enemies = [];
    this.bullets = [];
    this.effects.clear();
    this.powerupManager.clear();

    // Gun upgrade only lasts the level it was gained; lives carry over!
    if (this.player) {
      this.player.resetGunUpgrade();
      this.player.respawn(this.map.playerSpawn);
    }

    // Load deterministic drops for this stage
    this.stageScheduledDrops = [...getLevelPowerUpDrops(this.stage, this.map.tankCount)];

    logger.event('stage_start', {
      stage: stageNum,
      levelName: this.map.levelName || `LEVEL ${stageNum}`,
      lives: this.player ? this.player.lives : 3,
      scheduledDrops: this.stageScheduledDrops,
      maxStage: this.ui.campaignMaxStage
    });

    this.campTracker = {
      playerLastGX: -1,
      playerLastGY: -1,
      stationaryTimer: 0,
      killCountInZone: 0,
      cornerCampActive: false,
      campDirection: null,
      campKillZoneGX: -1,
      campKillZoneGY: -1,
      bannerShown: false
    };

    this.totalEnemiesToSpawn = this.map.tankCount;
    this.enemiesSpawned = 0;
    this.victoryTimer = 0;
    this.gameOverTimer = 0;
    this.spawnTimer = 0;
    this.spawnInterval = this.map.spawnInterval || 4000;

    // Support instant simultaneous spawning or staggered interval spawning
    if (this.map.spawnAllAtOnce) {
      let canSpawn = true;
      while (this.enemiesSpawned < this.totalEnemiesToSpawn && canSpawn) {
        canSpawn = this.spawnEnemy();
      }
    } else {
      this.spawnEnemy();
    }

    sound.playStageStart();

    const stageLabel = this.map.levelName || `LEVEL ${stageNum}`;
    this.effects.addFloatingText(stageLabel, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20, '#fbbf24');
  }

  isSpawnPointClear(pos) {
    const margin = 14; // Ensures previous tank moves completely clear before next spawn
    const spawnRect = {
      x: pos.x - margin,
      y: pos.y - margin,
      width: 24 + margin * 2,
      height: 24 + margin * 2
    };


    // Check if any existing active enemy is still sitting on this spawn location
    for (const enemy of this.enemies) {
      if (!enemy.destroyed) {
        if (
          spawnRect.x < enemy.x + enemy.width &&
          spawnRect.x + spawnRect.width > enemy.x &&
          spawnRect.y < enemy.y + enemy.height &&
          spawnRect.y + spawnRect.height > enemy.y
        ) {
          return false;
        }
      }
    }

    // Check if player is on this spawn point
    if (this.player && !this.player.destroyed) {
      if (
        spawnRect.x < this.player.x + this.player.width &&
        spawnRect.x + spawnRect.width > this.player.x &&
        spawnRect.y < this.player.y + this.player.height &&
        spawnRect.y + spawnRect.height > this.player.y
      ) {
        return false;
      }
    }

    return true;
  }

  getClearSpawnPoint() {
    const numPoints = this.map.spawnPoints.length;
    for (let i = 0; i < numPoints; i++) {
      const idx = (this.enemiesSpawned + i) % numPoints;
      const pt = this.map.spawnPoints[idx];
      if (this.isSpawnPointClear(pt)) {
        return pt;
      }
    }
    return null; // All spawn points currently occupied by tanks
  }

  spawnEnemy() {
    if (this.enemiesSpawned >= this.totalEnemiesToSpawn) return false;

    // Only spawn when an enemy spawn point is clear (old tank has driven away!)
    const pos = this.getClearSpawnPoint();
    if (!pos) {
      return false; // Wait until the previous tank moves off the location
    }

    let typeConfig = TANK_TYPES.LEVEL_1;

    if (this.mode === GAME_MODES.ARCADE) {
      // Dynamic Arcade Tier Distribution based on Wave Milestone
      const wave = this.arcadeStats.wave;
      const roll = Math.random();

      if (wave === 1) {
        // Wave 1: Pure Scouts
        typeConfig = TANK_TYPES.LEVEL_1;
      } else if (wave === 2) {
        // Wave 2: 75% Scouts, 25% Armored
        typeConfig = roll < 0.25 ? TANK_TYPES.LEVEL_2 : TANK_TYPES.LEVEL_1;
      } else if (wave === 3) {
        // Wave 3: 50% Scouts, 50% Armored
        typeConfig = roll < 0.50 ? TANK_TYPES.LEVEL_2 : TANK_TYPES.LEVEL_1;
      } else if (wave === 4) {
        // Wave 4: 50% Scouts, 35% Armored, 15% Commander
        if (roll < 0.15) typeConfig = TANK_TYPES.LEVEL_3;
        else if (roll < 0.50) typeConfig = TANK_TYPES.LEVEL_2;
        else typeConfig = TANK_TYPES.LEVEL_1;
      } else {
        // Wave 5+: 40% Scouts, 40% Armored, 20% Commander
        if (roll < 0.20) typeConfig = TANK_TYPES.LEVEL_3;
        else if (roll < 0.60) typeConfig = TANK_TYPES.LEVEL_2;
        else typeConfig = TANK_TYPES.LEVEL_1;
      }

      this.arcadeStats.tanksSpawnedThisWave++;
    } else {
      // Campaign mode: mixed or single tank rosters
      let rawType = "level_1";
      if (this.map.tankTypes && this.map.tankTypes.length > 0) {
        rawType = this.map.tankTypes[this.enemiesSpawned % this.map.tankTypes.length];
      } else if (this.map.tankType) {
        rawType = this.map.tankType;
      }
      if (Array.isArray(rawType)) rawType = rawType[0];

      const key = String(rawType).toLowerCase().trim();
      if (key === "level_2" || key === "lvl_2" || key === "lvl2" || key === "2") {
        typeConfig = TANK_TYPES.LEVEL_2;
      } else if (key === "level_3" || key === "lvl_3" || key === "lvl3" || key === "3") {
        typeConfig = TANK_TYPES.LEVEL_3;
      }
    }

    let isBonus = false;
    let dropType = null;

    if (this.mode === GAME_MODES.CAMPAIGN) {
      if (this.stageScheduledDrops && this.stageScheduledDrops.length > 0) {
        isBonus = true;
        dropType = this.stageScheduledDrops.shift();
      }
    } else {
      // Arcade mode: low percentage chance (~6% per spawned tank, making boosters rare and rewarding)
      if (Math.random() < ARCADE_BOOSTER_CHANCE) {
        isBonus = true;
        const pool = ['STAR', 'SHIELD', 'CLOCK', 'BOMB', 'LIFE'];
        dropType = pool[Math.floor(Math.random() * pool.length)];
      }
    }

    const enemy = new EnemyTank(pos.x, pos.y, typeConfig, isBonus, dropType);
    this.enemies.push(enemy);
    this.enemiesSpawned++;
    this.effects.addSparks(pos.x + 12, pos.y + 12, 12);
    return true;
  }

  updateArcadeDirector(dt) {
    if (this.mode !== GAME_MODES.ARCADE) return;

    // Check Score Milestones for Wave Advancement
    const currentScore = this.player ? this.player.score : 0;
    if (currentScore >= this.arcadeStats.nextMilestoneScore) {
      this.arcadeStats.wave++;
      this.arcadeStats.nextMilestoneScore += 1200 + this.arcadeStats.wave * 300;

      // Gradually increase spawn tempo (starts at 3200ms down to 1000ms minimum)
      this.spawnInterval = Math.max(1000, 3200 - (this.arcadeStats.wave - 1) * 350);

      logger.event('arcade_wave_milestone', {
        wave: this.arcadeStats.wave,
        score: currentScore,
        spawnInterval: this.spawnInterval
      });

      // Play milestone celebration audio and floating banner
      sound.playPowerup();
      this.effects.addFloatingText(`WAVE ${this.arcadeStats.wave} MILESTONE!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20, '#fbbf24');
      this.effects.addScreenShake(5, 200);

      if (this.arcadeStats.wave === 2) {
        this.arcadeStats.leadTankColor = '#961EE1';
        this.effects.addFloatingText('ARMORED TANKS INCOMING!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 5, '#a855f7');
      } else if (this.arcadeStats.wave === 4) {
        this.arcadeStats.leadTankColor = '#E1341E';
        this.effects.addFloatingText('COMMANDER TANKS SPOTTED!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 5, '#ef4444');
      }
    }
  }

  handlePowerUp(typeKey, config) {
    sound.playPowerup();
    const keyLower = typeKey.toLowerCase();
    this.sessionPowerups[keyLower] = (this.sessionPowerups[keyLower] || 0) + 1;

    logger.event('powerup_collected', {
      type: typeKey,
      name: config?.name || typeKey,
      stage: this.stage,
      mode: this.mode,
      playerLives: this.player ? this.player.lives : 0,
      playerHp: this.player ? this.player.hp : 0,
      upgradeLevel: this.player ? this.player.upgradeLevel : 0
    });

    switch (typeKey) {
      case 'STAR':
        if (this.player) {
          this.player.upgradeGun();
          this.effects.addFloatingText(`⭐ GUN UPGRADE! (Lv ${this.player.upgradeLevel})`, this.player.x + 12, this.player.y - 14, '#fbbf24');
          this.effects.addSparks(this.player.x + 12, this.player.y + 12, 16);
        }
        break;
      case 'SHIELD':
        if (this.player) {
          this.player.shieldTime = 10000;
          this.effects.addFloatingText('🛡️ INVULNERABLE! (10s)', this.player.x + 12, this.player.y - 14, '#38bdf8');
          this.effects.addSparks(this.player.x + 12, this.player.y + 12, 16);
        }
        break;
      case 'CLOCK':
        this.enemies.forEach(e => {
          if (!e.destroyed) e.freezeTime = 8000;
        });
        this.effects.addFloatingText('⏱️ ENEMIES FROZEN! (8s)', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20, '#a78bfa');
        this.effects.addScreenShake(3, 200);
        break;
      case 'BOMB':
        this.effects.addFloatingText('💣 TACTICAL NUKE!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20, '#f87171');
        this.effects.addScreenShake(7, 350);
        this.enemies.forEach(e => {
          if (!e.destroyed) {
            e.takeDamage(999);
            sound.playExplosion(e.typeConfig.type === 'level_3');
            this.effects.addExplosion(e.x + e.width / 2, e.y + e.height / 2, 24, true);
            if (this.mode === GAME_MODES.ARCADE) {
              this.player.score += e.typeConfig.scoreValue;
              this.arcadeStats.totalKills++;
            }
          }
        });
        break;
      case 'LIFE':
        if (this.player) {
          this.player.lives++;
          this.effects.addFloatingText(`❤️ EXTRA TANK! (x${this.player.lives})`, this.player.x + 12, this.player.y - 14, '#f43f5e');
          this.effects.addSparks(this.player.x + 12, this.player.y + 12, 16);
        }
        break;
    }
  }

  update(dt) {
    if (this.input.consumePause()) {
      if (this.state === GAME_STATES.PLAYING) this.state = GAME_STATES.PAUSED;
      else if (this.state === GAME_STATES.PAUSED) this.state = GAME_STATES.PLAYING;
    }

    // Allow returning to Title / Menu on Game Over or Victory with M or Escape
    if (this.input.consumeMenu()) {
      if (this.state === GAME_STATES.GAME_OVER || this.state === GAME_STATES.VICTORY || this.state === GAME_STATES.PAUSED) {
        this.state = GAME_STATES.TITLE;
        this.titleClickDebounceUntil = performance.now() + 500;
        this.input.reset();
        return;
      }
    }

    if (this.state === GAME_STATES.TITLE) {
      if (performance.now() < (this.titleClickDebounceUntil || 0)) {
        this.input.consumeFire();
        this.input.consumeRestart();
        return;
      }

      // Menu Navigation with Up/Down arrows or W/S
      const dir = this.input.getDirection();
      if (dir === DIR.UP) {
        this.selectedModeIndex = 0;
      } else if (dir === DIR.DOWN) {
        this.selectedModeIndex = 1;
      }

      if (this.input.consumeFire() || this.input.consumeRestart()) {
        sound.init();
        const chosenMode = this.selectedModeIndex === 1 ? GAME_MODES.ARCADE : GAME_MODES.CAMPAIGN;
        this.startGame(chosenMode);
      }
    } else if (this.state === GAME_STATES.GAME_OVER) {
      this.gameOverTimer = (this.gameOverTimer || 0) + dt;
      if (this.gameOverTimer > 1500 && (this.input.consumeRestart() || this.input.consumeFire())) {
        sound.init();
        this.startGame(this.mode);
      }
    } else if (this.state === GAME_STATES.VICTORY) {
      this.victoryTimer = (this.victoryTimer || 0) + dt;
      if (this.victoryTimer > 1500 && (this.input.consumeRestart() || this.input.consumeFire())) {
        sound.init();
        this.startGame(this.mode);
      }
    }

    this.effects.update(dt);
    if (this.state !== GAME_STATES.PLAYING) return;

    // Power-up updates & collision checks
    this.powerupManager.update(dt, this.player, (type, config) => {
      this.handlePowerUp(type, config);
    });

    // Update Arcade wave tempo & milestones
    this.updateArcadeDirector(dt);

    if (this.player && !this.player.destroyed) {
      this.player.update(dt);
      const moveDir = this.input.getDirection();
      if (moveDir !== null) {
        this.player.tryMove(moveDir, dt, this.map, this.enemies);
      } else {
        this.player.isMoving = false;
      }

      // Track Corner Camping Telemetry
      const pGX = Math.floor((this.player.x + this.player.width / 2) / 32);
      const pGY = Math.floor((this.player.y + this.player.height / 2) / 32);

      if (pGX === this.campTracker.playerLastGX && pGY === this.campTracker.playerLastGY) {
        this.campTracker.stationaryTimer += dt;
      } else {
        // Player moved significantly; decay stationary timer and kill count
        this.campTracker.playerLastGX = pGX;
        this.campTracker.playerLastGY = pGY;
        this.campTracker.stationaryTimer = 0;
        this.campTracker.killCountInZone = Math.max(0, this.campTracker.killCountInZone - 1);
        if (this.campTracker.killCountInZone < 2) {
          this.campTracker.cornerCampActive = false;
          this.campTracker.bannerShown = false;
        }
      }

      // Check if player has been camped for > 3.0s or scored >= 2 kills while stationary
      if ((this.campTracker.stationaryTimer > 3000 && this.campTracker.killCountInZone >= 1) || this.campTracker.killCountInZone >= 2) {
        if (!this.campTracker.cornerCampActive) {
          this.campTracker.cornerCampActive = true;
          this.campTracker.campDirection = this.player.dir;
          // Projected choke point the player is aiming at
          const vP = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }][this.player.dir];
          this.campTracker.campKillZoneGX = Math.max(0, Math.min(11, pGX + vP.x * 2));
          this.campTracker.campKillZoneGY = Math.max(0, Math.min(15, pGY + vP.y * 2));

          logger.warn('tactical_ai', 'Corner camping detected - enemies executing flank maneuver', {
            playerGX: pGX,
            playerGY: pGY,
            aimDir: this.campTracker.campDirection,
            chokeGX: this.campTracker.campKillZoneGX,
            chokeGY: this.campTracker.campKillZoneGY
          });

          this.campTracker.bannerShown = true;
        }
      }

      if (this.input.consumeFire()) {
        const bullet = this.player.shoot(performance.now());
        if (bullet) {
          this.bullets.push(bullet);
          sound.playShoot(true);
          this.effects.addSparks(bullet.x, bullet.y, 4);
          // Audio cue: firing cannon alerts enemies to investigate gunshot position
          this.enemies.forEach(e => {
            if (!e.destroyed) e.hearNoise(this.player.x, this.player.y, "gunfire");
          });
        }
      }
    }

    this.spawnTimer += dt;
    if (this.spawnTimer > this.spawnInterval) {
      const didSpawn = this.spawnEnemy();
      if (didSpawn) {
        this.spawnTimer = 0; // Only reset countdown when a tank successfully spawned into a clear location
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.destroyed) {
        this.enemies.splice(i, 1);
        continue;
      }
      enemy.update(dt);
      const bullet = enemy.updateAI(dt, this.map, this.player, [this.player, ...this.enemies], this.bullets, this.campTracker);
      if (bullet) {
        this.bullets.push(bullet);
        sound.playShoot(false);
      }
    }


    // Continuous non-sticking separation pass
    const allActiveTanks = [];
    if (this.player && !this.player.destroyed) allActiveTanks.push(this.player);
    this.enemies.forEach(e => {
      if (!e.destroyed) allActiveTanks.push(e);
    });
    resolveTankOverlaps(allActiveTanks, this.map);

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(dt);
      if (b.destroyed) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Mid-Air Bullet Clash: Player shell vs Enemy shell
      let clashed = false;
      for (let j = 0; j < this.bullets.length; j++) {
        if (i === j) continue;
        const otherB = this.bullets[j];
        if (otherB && !otherB.destroyed && b.isPlayer !== otherB.isPlayer) {
          if (b.collidesWith(otherB)) {
            b.destroyed = true;
            otherB.destroyed = true;
            sound.playHit();
            this.effects.addSparks((b.x + otherB.x) / 2, (b.y + otherB.y) / 2, 8);
            clashed = true;
            break;
          }
        }
      }
      if (clashed || b.destroyed) {
        this.bullets.splice(i, 1);
        continue;
      }

      const terrainHit = this.map.checkBulletCollision(b);
      if (terrainHit.hit) {
        b.destroyed = true;
        this.bullets.splice(i, 1);
        if (terrainHit.hitSteel) {
          sound.playHit();
          this.effects.addSparks(b.x, b.y, 6);
        } else {
          sound.playHit();
          this.effects.addExplosion(b.x, b.y, 8, false);
          // Audio cue: exploding brick wall alerts enemies to investigate demolition
          this.enemies.forEach(e => {
            if (!e.destroyed) e.hearNoise(b.x, b.y, "demolition");
          });
        }
        continue;
      }

      if (b.isPlayer) {
        for (const enemy of this.enemies) {
          if (!enemy.destroyed && b.collidesWith(enemy)) {
            b.destroyed = true;

            // Back Shot Detection: bullet travelling in same direction as tank struck its rear!
            const isBackHit = (b.dir === enemy.dir);

            let damageDealt = 1;
            if (enemy.typeConfig.type === 'level_2') {
              damageDealt = isBackHit ? 2 : 1;
            } else if (enemy.typeConfig.type === 'level_3') {
              damageDealt = isBackHit ? 2 : 1;
            } else {
              damageDealt = 1;
            }

            const result = enemy.takeDamage(damageDealt);

            if (isBackHit && (enemy.typeConfig.type === 'level_2' || enemy.typeConfig.type === 'level_3')) {
              sound.playCriticalHit();
              this.effects.addSparks(b.x, b.y, 14);
              this.effects.addFloatingText('💥 REAR HIT! (2x)', enemy.x + 12, enemy.y - 12, '#f43f5e');
            } else {
              sound.playHit();
              this.effects.addSparks(b.x, b.y, 8);
            }

            if (result.killed) {
              const isBigBoss = enemy.typeConfig.type === 'level_3';
              sound.playExplosion(isBigBoss);
              this.effects.addExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, isBigBoss ? 28 : 20, isBigBoss);
              this.effects.addScreenShake(isBigBoss ? 7 : 5, 250);

              // Power-up Drop from Bonus Tank
              if (enemy.isBonus && enemy.dropType) {
                this.powerupManager.spawn(enemy.x, enemy.y, enemy.dropType);
                sound.playPowerup();
                this.effects.addFloatingText('🎁 POWER-UP DROPPED!', enemy.x + 12, enemy.y - 14, '#38bdf8');
                logger.event('powerup_spawned', {
                  type: enemy.dropType,
                  stage: this.stage,
                  mode: this.mode
                });
              }

              // Points scoring only in Arcade mode
              if (this.mode === GAME_MODES.ARCADE) {
                const pts = enemy.typeConfig.scoreValue;
                this.player.score += pts;
                this.effects.addFloatingText(`+${pts}`, enemy.x + 12, enemy.y, '#fbbf24');
                this.arcadeStats.totalKills++;
              }

              // Track kills performed from stationary / corner camp position
              if (this.campTracker) {
                this.campTracker.killCountInZone++;
              }

              logger.info('combat', 'Enemy destroyed', {
                type: enemy.typeConfig.type,
                rearHit: isBackHit,
                isBonus: enemy.isBonus,
                score: this.player.score,
                stage: this.stage,
                mode: this.mode,
                totalKills: this.arcadeStats.totalKills
              });
            }
            break;

          }
        }
      } else if (this.player && !this.player.destroyed) {
        if (b.collidesWith(this.player)) {
          b.destroyed = true;
          if (this.player.shieldTime <= 0) {
            const damage = b.damage || 2;
            const result = this.player.takeDamage(damage);
            this.effects.addSparks(b.x, b.y, 8);

            if (result.killed) {
              sound.playExplosion(true);
              this.effects.addExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, 25, true);
              this.effects.addScreenShake(8, 350);
              this.player.lives--;
              logger.info('combat', 'Player lost a life', { livesRemaining: this.player.lives, stage: this.stage, mode: this.mode });
              if (this.player.lives >= 0) {
                setTimeout(() => {
                  if (this.state === GAME_STATES.PLAYING) {
                    if (this.mode === GAME_MODES.ARCADE) {
                      this.player.maxHp = 10;
                    }
                    this.player.respawn(this.map.playerSpawn);
                  }
                }, 800);
              } else {
                sound.playGameOver();
                this.state = GAME_STATES.GAME_OVER;
                this.gameOverTimer = 0;
                if (this.mode === GAME_MODES.ARCADE) {
                  this.ui.saveHighScore(this.player.score, this.mode);
                } else {
                  this.ui.saveCampaignStage(this.stage);
                }
                this.input.consumeFire();
                this.input.consumeRestart();

                logger.event('game_over', {
                  score: this.player.score,
                  mode: this.mode,
                  stage: this.stage,
                  maxStage: this.ui.campaignMaxStage,
                  powerupsCollected: this.sessionPowerups,
                  totalKills: this.arcadeStats.totalKills,
                  wave: this.arcadeStats.wave
                });
              }
            } else {
              sound.playHit();
              this.effects.addScreenShake(3, 150);
              this.effects.addFloatingText(`-${damage} HP`, this.player.x + 12, this.player.y - 8, '#f87171');
            }
          } else {
            sound.playHit();
            this.effects.addSparks(b.x, b.y, 6);
          }
        }
      }
    }

    // Check Campaign Stage Completion (Arcade Mode continues infinitely!)
    if (this.mode === GAME_MODES.CAMPAIGN) {
      const remainingEnemies = (this.totalEnemiesToSpawn - this.enemiesSpawned) + this.enemies.length;
      if (remainingEnemies === 0 && this.enemies.length === 0) {
        logger.event('stage_completed', {
          stage: this.stage,
          livesRemaining: this.player ? this.player.lives : 0,
          hpRemaining: this.player ? this.player.hp : 0,
          powerupsCollected: this.sessionPowerups,
          maxStageReached: this.ui.campaignMaxStage
        });

        if (this.stage < this.maxStages) {
          this.stage++;
          this.ui.saveCampaignStage(this.stage);
          this.startStage(this.stage);
        } else {
          this.state = GAME_STATES.VICTORY;
          this.victoryTimer = 0;
          this.ui.saveCampaignStage(this.maxStages);
          sound.playVictory();
          this.input.consumeFire();
          this.input.consumeRestart();

          logger.event('campaign_victory', {
            totalStages: this.maxStages,
            livesRemaining: this.player ? this.player.lives : 0,
            powerupsCollected: this.sessionPowerups
          });
        }
      }
    }
  }

  draw() {
    this.ctx.save();
    if (this.effects.shakeDuration > 0) {
      this.ctx.translate(this.effects.shakeOffsetX, this.effects.shakeOffsetY);
    }
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.map.draw(this.ctx);
    this.powerupManager.draw(this.ctx);

    if (this.player && !this.player.destroyed) this.player.draw(this.ctx);
    this.enemies.forEach(e => {
      if (!e.destroyed) e.draw(this.ctx);
    });
    this.bullets.forEach(b => b.draw(this.ctx));
    this.effects.draw(this.ctx);
    this.ctx.restore();

    const remainingEnemies = (this.totalEnemiesToSpawn - this.enemiesSpawned) + this.enemies.length;
    if (this.state === GAME_STATES.PLAYING || this.state === GAME_STATES.STAGE_START || this.state === GAME_STATES.PAUSED) {
      this.ui.drawHUD(this.ctx, this.player, this.stage, remainingEnemies, this.mode, this.arcadeStats);
    }
    if (this.state === GAME_STATES.TITLE) this.ui.drawTitleScreen(this.ctx, this.selectedModeIndex);
    else if (this.state === GAME_STATES.PAUSED) this.ui.drawPause(this.ctx);
    else if (this.state === GAME_STATES.GAME_OVER) this.ui.drawGameOver(this.ctx, this.player ? this.player.score : 0, this.mode, this.arcadeStats, this.stage, remainingEnemies);
    else if (this.state === GAME_STATES.VICTORY) this.ui.drawVictory(this.ctx, (this.victoryTimer || 0) > 1500, this.player ? this.player.lives : 3);
  }


  loop(timestamp) {
    const dt = Math.min(50, timestamp - this.lastTime);
    this.lastTime = timestamp;
    this.update(dt);
    this.draw();
    requestAnimationFrame(this.loop);
  }
}

window.addEventListener('error', (event) => {
  logger.error(event.error || event.message, { filename: event.filename, lineno: event.lineno, colno: event.colno });
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error(event.reason || 'Unhandled Promise Rejection');
});

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
