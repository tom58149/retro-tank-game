// UI & HUD Rendering Engine
import { GAME_STATES, GAME_MODES, CANVAS_WIDTH, CANVAS_HEIGHT, TANK_TYPES } from './constants.js';

export class UIRenderer {
  constructor() {
    this.campaignMaxStage = parseInt(localStorage.getItem('retro_tank_campaign_max_stage') || '1', 10);
    this.arcadeHighScore = parseInt(localStorage.getItem('retro_tank_arcade_highscore') || '0', 10);
    this.selectedModeIndex = 0; // 0 = CAMPAIGN, 1 = ARCADE
  }

  saveCampaignStage(stage) {
    if (stage > this.campaignMaxStage) {
      this.campaignMaxStage = stage;
      localStorage.setItem('retro_tank_campaign_max_stage', this.campaignMaxStage.toString());
    }
  }

  saveHighScore(score, mode = GAME_MODES.CAMPAIGN) {
    if (mode === GAME_MODES.ARCADE) {
      if (score > this.arcadeHighScore) {
        this.arcadeHighScore = score;
        localStorage.setItem('retro_tank_arcade_highscore', this.arcadeHighScore.toString());
      }
    }
  }

  getHighScore(mode = GAME_MODES.CAMPAIGN) {
    return mode === GAME_MODES.ARCADE ? this.arcadeHighScore : this.campaignMaxStage;
  }

  drawHUD(ctx, playerTank, currentStage, enemiesRemaining, gameMode = GAME_MODES.CAMPAIGN, arcadeStats = null) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 28);
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';

    // Lives
    ctx.fillStyle = '#ef4444';
    ctx.fillText('❤️', 6, 18);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`x${playerTank ? Math.max(0, playerTank.lives) : 0}`, 22, 18);

    // Player Armor / HP Bar
    const currentHp = playerTank ? Math.max(0, playerTank.hp) : 0;
    const maxHp = playerTank ? playerTank.maxHp : (TANK_TYPES.PLAYER?.hp || 8);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('HP:', 48, 18);
    
    const barW = 42;
    const barH = 8;
    const barX = 70;
    const barY = 11;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, barY, barW, barH);
    const hpWidth = Math.min(barW, Math.max(0, (currentHp / maxHp) * barW));
    ctx.fillStyle = currentHp > (maxHp / 2) ? '#1ECBE1' : (currentHp > (maxHp / 4) ? '#f59e0b' : '#ef4444');
    ctx.fillRect(barX, barY, hpWidth, barH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(barX, barY, barW, barH);

    if (gameMode === GAME_MODES.ARCADE && arcadeStats) {
      // Score in Arcade mode
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('SCORE:', 120, 18);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`${playerTank ? playerTank.score : 0}`, 164, 18);

      // Arcade HUD: Wave Milestone and Kill count
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`W${arcadeStats.wave}`, 228, 18);

      ctx.fillStyle = arcadeStats.leadTankColor || '#6AE11E';
      ctx.fillRect(256, 11, 8, 8);

      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(`K:${arcadeStats.totalKills}`, 272, 18);

      // Best high score badge
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'right';
      ctx.fillText(`HI:${this.arcadeHighScore}`, CANVAS_WIDTH - 6, 18);
    } else {
      // Campaign HUD: No score point accumulation! Track stage & best stage
      if (playerTank && playerTank.upgradeLevel > 0) {
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`⭐+${playerTank.upgradeLevel}`, 118, 18);
      }

      ctx.fillStyle = '#1ECBE1';
      ctx.fillText(`STAGE ${currentStage}/200`, 155, 18);

      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`BEST:${this.campaignMaxStage}`, 245, 18);

      let tankBadge = '#6AE11E';
      if (currentStage >= 10 && (currentStage % 5 === 0 || currentStage >= 80)) {
        tankBadge = '#E1341E'; // Commander
      } else if (currentStage >= 4) {
        tankBadge = (currentStage % 2 === 0) ? '#961EE1' : '#6AE11E'; // Armored or Scout
      }
      ctx.fillStyle = tankBadge;
      ctx.fillRect(320, 11, 8, 8);

      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(`x${enemiesRemaining}`, 332, 18);
    }
  }

  drawTitleScreen(ctx, selectedModeIndex = 0) {
    this.selectedModeIndex = selectedModeIndex;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#eab308';
    ctx.font = '900 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RETRO TANK FODDER', CANVAS_WIDTH / 2, 54);
    ctx.fillStyle = '#ef4444';
    ctx.font = '900 17px monospace';
    ctx.fillText('BATTLE 1990', CANVAS_WIDTH / 2, 78);

    // Mode Selection Buttons / Cards
    const modes = [
      {
        title: '⭐ CAMPAIGN MISSIONS',
        desc: 'Tactical duel stages 1 through 200',
        badge: '200 STAGES',
        badgeCol: '#38bdf8',
        color: '#1ECBE1',
        metric: `BEST: STAGE ${this.campaignMaxStage}`
      },
      {
        title: '⚡ ARCADE ENDLESS ONSLAUGHT',
        desc: 'Infinite waves! Dynamic scaling spawns',
        badge: 'SURVIVAL',
        badgeCol: '#f59e0b',
        color: '#fbbf24',
        metric: `BEST SCORE: ${this.arcadeHighScore}`
      }
    ];

    modes.forEach((mode, idx) => {
      const isSelected = (idx === selectedModeIndex);
      const cardY = 98 + idx * 72;
      const cardW = CANVAS_WIDTH - 36;
      const cardH = 64;
      const cardX = 18;

      ctx.fillStyle = isSelected ? 'rgba(30, 58, 138, 0.55)' : 'rgba(30, 41, 59, 0.6)';
      ctx.fillRect(cardX, cardY, cardW, cardH);

      ctx.strokeStyle = isSelected ? '#38bdf8' : '#334155';
      ctx.lineWidth = isSelected ? 2.5 : 1;
      ctx.strokeRect(cardX, cardY, cardW, cardH);

      if (isSelected) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(cardX, cardY, 6, cardH);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('▶', cardX + 12, cardY + 28);
      }

      ctx.textAlign = 'left';
      ctx.fillStyle = isSelected ? '#ffffff' : '#cbd5e1';
      ctx.font = 'bold 12.5px monospace';
      ctx.fillText(mode.title, cardX + (isSelected ? 32 : 16), cardY + 22);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10.5px monospace';
      ctx.fillText(mode.desc, cardX + (isSelected ? 32 : 16), cardY + 39);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(mode.metric, cardX + (isSelected ? 32 : 16), cardY + 54);

      // Badge on top right of card
      ctx.textAlign = 'right';
      ctx.fillStyle = mode.badgeCol;
      ctx.font = 'bold 10px monospace';
      ctx.fillText(mode.badge, cardX + cardW - 12, cardY + 22);
    });

    // Tank Specs Quick Reference
    ctx.textAlign = 'left';
    const drawMiniTank = (y, color, label, note) => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(18, y, CANVAS_WIDTH - 36, 28);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(18, y, CANVAS_WIDTH - 36, 28);

      ctx.fillStyle = color;
      ctx.fillRect(25, y + 6, 16, 16);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(31, y + 2, 4, 6);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(label, 48, y + 13);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9.5px monospace';
      ctx.fillText(note, 48, y + 23);
    };

    drawMiniTank(250, TANK_TYPES.PLAYER.color, `${TANK_TYPES.PLAYER.name.toUpperCase()} (YOU)`, `${TANK_TYPES.PLAYER.hp} HP uniform armor • No rear weakpoint`);
    drawMiniTank(282, TANK_TYPES.LEVEL_1.color, `${TANK_TYPES.LEVEL_1.name.toUpperCase()} (LVL 1)`, `${TANK_TYPES.LEVEL_1.hp} HP • Fast tactical cannon`);
    drawMiniTank(314, TANK_TYPES.LEVEL_2.color, `${TANK_TYPES.LEVEL_2.name.toUpperCase()} (LVL 2)`, `${TANK_TYPES.LEVEL_2.hp} HP front • 1 REAR SHOT KILL`);
    drawMiniTank(346, TANK_TYPES.LEVEL_3.color, `${TANK_TYPES.LEVEL_3.name.toUpperCase()} (LVL 3)`, `Heavy ${TANK_TYPES.LEVEL_3.hp} HP • 2 REAR SHOTS KILL`);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10.5px monospace';
    ctx.fillText('⬆/⬇ or TAP to choose • Space/FIRE to start', CANVAS_WIDTH / 2, 404);

    const blink = Math.floor(performance.now() / 400) % 2 === 0;
    if (blink) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('PRESS FIRE OR TAP TO LAUNCH', CANVAS_WIDTH / 2, 436);
    }
  }

  drawStageStart(ctx, stageNum) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(0, CANVAS_HEIGHT / 2 - 45, CANVAS_WIDTH, 90);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, CANVAS_HEIGHT / 2 - 45, CANVAS_WIDTH, 90);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${stageNum}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 5);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '12px monospace';
    ctx.fillText('DUEL START!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 28);
  }

  drawGameOver(ctx, finalScore, gameMode = GAME_MODES.CAMPAIGN, arcadeStats = null, currentStage = 1, enemiesRemaining = 0) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#ef4444';
    ctx.font = '900 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, 130);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '13px monospace';
    ctx.fillText('YOUR TANK WAS DESTROYED!', CANVAS_WIDTH / 2, 160);

    // Debrief Card
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    ctx.fillRect(36, 185, CANVAS_WIDTH - 72, 120);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(36, 185, CANVAS_WIDTH - 72, 120);

    if (gameMode === GAME_MODES.ARCADE && arcadeStats) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('ARCADE DEBRIEF', 52, 210);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '12px monospace';
      ctx.fillText('FINAL SCORE:', 52, 238);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${finalScore}`, CANVAS_WIDTH - 52, 238);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#f8fafc';
      ctx.font = '12px monospace';
      ctx.fillText('BEST HIGH SCORE:', 52, 264);
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${this.arcadeHighScore}`, CANVAS_WIDTH - 52, 264);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px monospace';
      ctx.fillText(`WAVE REACHED: ${arcadeStats.wave}  •  KILLS: ${arcadeStats.totalKills}`, 52, 290);
    } else {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('CAMPAIGN MISSION REPORT', 52, 210);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '12px monospace';
      ctx.fillText('STAGE REACHED:', 52, 238);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`LEVEL ${currentStage} / 200`, CANVAS_WIDTH - 52, 238);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#f8fafc';
      ctx.font = '12px monospace';
      ctx.fillText('BEST STAGE:', 52, 264);
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`LEVEL ${this.campaignMaxStage} / 200`, CANVAS_WIDTH - 52, 264);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px monospace';
      ctx.fillText(`ENEMIES REMAINING: ${enemiesRemaining}`, 52, 290);
    }

    const blink = Math.floor(performance.now() / 400) % 2 === 0;
    if (blink) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('TAP OR PRESS R TO RETRY', CANVAS_WIDTH / 2, 360);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px monospace';
      ctx.fillText('PRESS ESC OR M FOR MENU', CANVAS_WIDTH / 2, 385);
    }
  }

  drawVictory(ctx, readyToRestart = true, playerLives = 3) {
    ctx.fillStyle = "rgba(15, 23, 42, 0.96)";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Golden laurel border
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, CANVAS_WIDTH - 32, CANVAS_HEIGHT - 32);

    // Stars & Medals
    ctx.fillStyle = "#fbbf24";
    ctx.font = "26px monospace";
    ctx.textAlign = "center";
    ctx.fillText("⭐⭐⭐", CANVAS_WIDTH / 2, 70);

    // Main Victory Headline: "YOU WON THE WAR!"
    ctx.fillStyle = "#34d399";
    ctx.font = "900 28px monospace";
    ctx.shadowColor = "#059669";
    ctx.shadowBlur = 10;
    ctx.fillText("YOU WON THE WAR!", CANVAS_WIDTH / 2, 120);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 13px monospace";
    ctx.fillText("ALL 200 SECTORS LIBERATED", CANVAS_WIDTH / 2, 150);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px monospace";
    ctx.fillText("THE BATTLEFIELD IS SECURE", CANVAS_WIDTH / 2, 172);

    // Mission Debrief Card
    ctx.fillStyle = "rgba(30, 41, 59, 0.85)";
    ctx.fillRect(36, 205, CANVAS_WIDTH - 72, 110);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(36, 205, CANVAS_WIDTH - 72, 110);

    ctx.textAlign = "left";
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 12px monospace";
    ctx.fillText("CAMPAIGN MISSION REPORT", 52, 230);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "12px monospace";
    ctx.fillText("STAGES CLEARED:", 52, 260);
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "right";
    ctx.fillText("200 / 200 (100%)", CANVAS_WIDTH - 52, 260);

    ctx.textAlign = "left";
    ctx.fillStyle = "#f8fafc";
    ctx.font = "12px monospace";
    ctx.fillText("LIVES REMAINING:", 52, 290);
    ctx.fillStyle = "#34d399";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`❤️ x${Math.max(0, playerLives)}`, CANVAS_WIDTH - 52, 290);

    // Restart prompt (active only after debounce so the final bullet tap doesn't skip)
    ctx.textAlign = "center";
    if (readyToRestart) {
      const blink = Math.floor(performance.now() / 400) % 2 === 0;
      if (blink) {
        ctx.fillStyle = "#1ECBE1";
        ctx.font = "bold 14px monospace";
        ctx.fillText("TAP OR PRESS ENTER TO PLAY AGAIN", CANVAS_WIDTH / 2, 380);
      }
    } else {
      ctx.fillStyle = "#64748b";
      ctx.font = "12px monospace";
      ctx.fillText("VICTORY DEBRIEF...", CANVAS_WIDTH / 2, 380);
    }
  }

  drawPause(ctx) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }
}
