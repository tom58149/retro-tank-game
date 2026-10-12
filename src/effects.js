// Particle effects, floating damage text, and screen shake

export class EffectManager {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }

  addScreenShake(intensity = 6, duration = 300) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  addExplosion(x, y, count = 18, isLarge = false) {
    const colors = ['#f59e0b', '#ef4444', '#fef08a', '#ffffff', '#475569'];
    const total = isLarge ? count * 2 : count;

    for (let i = 0; i < total; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 3 + 1.5) * (isLarge ? 1.5 : 1);
      const size = Math.random() * (isLarge ? 6 : 4) + 2;
      const lifetime = Math.random() * 400 + (isLarge ? 400 : 250);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: lifetime,
        maxLife: lifetime
      });
    }
  }

  addSparks(x, y, count = 6) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2,
        color: '#fef08a',
        life: 150,
        maxLife: 150
      });
    }
  }

  addFloatingText(text, x, y, color = '#fbbf24') {
    this.floatingTexts.push({
      text,
      x,
      y,
      vy: -0.8,
      color,
      life: 1000,
      maxLife: 1000
    });
  }

  update(dt) {
    // Screen shake update
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      this.shakeOffsetX = (Math.random() * 2 - 1) * this.shakeIntensity;
      this.shakeOffsetY = (Math.random() * 2 - 1) * this.shakeIntensity;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    // Particles update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * (dt / 16.67);
      p.y += p.vy * (dt / 16.67);
      p.vx *= 0.96;
      p.vy *= 0.96;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Floating text update
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * (dt / 16.67);

      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    // Draw particles
    this.particles.forEach(p => {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    });

    // Draw floating text
    this.floatingTexts.forEach(ft => {
      const alpha = Math.max(0, ft.life / ft.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000000';
      ctx.fillText(ft.text, ft.x + 1, ft.y + 1); // Outline
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
  }

  clear() {
    this.particles = [];
    this.floatingTexts = [];
    this.shakeDuration = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }
}
