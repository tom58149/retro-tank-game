// Bullet & Projectile System
import { DIR, DIR_VECTORS, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';

export class Bullet {
  constructor(x, y, dir, speed, damage, isPlayer, ownerId) {
    this.dir = dir;
    this.speed = speed;
    this.damage = damage || 1;
    this.power = this.damage;
    this.isPlayer = isPlayer;
    this.ownerId = ownerId;
    this.width = 6;
    this.height = 6;
    this.x = x - this.width / 2;
    this.y = y - this.height / 2;
    this.destroyed = false;
  }

  update(dt) {
    const v = DIR_VECTORS[this.dir];
    const moveDist = this.speed * (dt / 16.67);
    this.x += v.x * moveDist;
    this.y += v.y * moveDist;

    // Check canvas boundaries
    if (this.x < 0 || this.x + this.width > CANVAS_WIDTH ||
        this.y < 0 || this.y + this.height > CANVAS_HEIGHT) {
      this.destroyed = true;
    }
  }

  draw(ctx) {
    ctx.fillStyle = this.isPlayer ? '#38bdf8' : '#fda4af';
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
    ctx.fill();

    // Bullet tracer trail
    ctx.fillStyle = this.isPlayer ? '#0284c7' : '#e11d48';
    const v = DIR_VECTORS[this.dir];
    ctx.fillRect(
      this.x + this.width / 2 - v.x * 3 - 1,
      this.y + this.height / 2 - v.y * 3 - 1,
      3,
      3
    );
  }

  // AABB collision check
  collidesWith(other) {
    return (
      this.x < other.x + other.width &&
      this.x + this.width > other.x &&
      this.y < other.y + other.height &&
      this.y + this.height > other.y
    );
  }
}
