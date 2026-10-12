// Input handling for Keyboard and Mobile Multi-Touch Virtual Controls
import { DIR } from './constants.js';

export class InputHandler {
  constructor() {
    this.keys = {};
    this.moveDir = null;     // Current requested movement direction
    this.fireRequested = false;
    this.fireHeld = false;
    this.pauseRequested = false;
    this.restartRequested = false;
    this.menuRequested = false;

    // Virtual D-pad touch tracking
    this.dpadTouchId = null;
    this.dpadCenter = { x: 0, y: 0 };
    this.dpadCurrent = { x: 0, y: 0 };
    this.dpadActive = false;

    // Fire touch tracking
    this.fireTouchId = null;

    this.initKeyboard();
    this.initTouch();
  }

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // Prevent window scrolling on arrow keys and space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'KeyP') {
        this.pauseRequested = true;
      }
      if (e.code === 'KeyM' || e.code === 'Escape') {
        this.menuRequested = true;
      }
      if (e.code === 'KeyR' || e.code === 'Enter' || e.code === 'Space') {
        this.restartRequested = true;
      }
      if (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyK') {
        this.fireRequested = true;
        this.fireHeld = true;
      }
    });


    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyK') {
        this.fireHeld = false;
      }
    });
  }

  initTouch() {
    const dpadEl = document.getElementById('virtual-dpad');
    const fireEl = document.getElementById('btn-fire');
    const pauseEl = document.getElementById('btn-pause');

    if (pauseEl) {
      pauseEl.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.pauseRequested = true;
      });
    }

    // Direct D-pad buttons if present
    const dpadUp = document.getElementById('dpad-up');
    const dpadDown = document.getElementById('dpad-down');
    const dpadLeft = document.getElementById('dpad-left');
    const dpadRight = document.getElementById('dpad-right');

    const bindButton = (el, dir) => {
      if (!el) return;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.classList.add('active');
        this.touchDir = dir;
      });
      const clear = (e) => {
        e.preventDefault();
        el.classList.remove('active');
        if (this.touchDir === dir) {
          this.touchDir = null;
        }
      };
      el.addEventListener('pointerup', clear);
      el.addEventListener('pointercancel', clear);
      el.addEventListener('pointerleave', clear);
    };

    bindButton(dpadUp, DIR.UP);
    bindButton(dpadDown, DIR.DOWN);
    bindButton(dpadLeft, DIR.LEFT);
    bindButton(dpadRight, DIR.RIGHT);

    // Dynamic analog thumbstick touch zone
    if (dpadEl) {
      dpadEl.addEventListener('touchstart', (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (this.dpadTouchId === null) {
            this.dpadTouchId = touch.identifier;
            const rect = dpadEl.getBoundingClientRect();
            this.dpadCenter = {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2
            };
            this.updateTouchDirection(touch.clientX, touch.clientY);
            this.dpadActive = true;
            break;
          }
        }
      }, { passive: false });

      dpadEl.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === this.dpadTouchId) {
            this.updateTouchDirection(touch.clientX, touch.clientY);
            break;
          }
        }
      }, { passive: false });

      const endDpad = (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.dpadTouchId) {
            this.dpadTouchId = null;
            this.dpadActive = false;
            this.stickDir = null;
            const knob = document.getElementById('dpad-knob');
            if (knob) {
              knob.style.transform = 'translate(0px, 0px)';
            }
            break;
          }
        }
      };

      dpadEl.addEventListener('touchend', endDpad);
      dpadEl.addEventListener('touchcancel', endDpad);
    }

    if (fireEl) {
      fireEl.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.fireRequested = true;
        this.fireHeld = true;
        fireEl.classList.add('active');
      }, { passive: false });

      const endFire = (e) => {
        e.preventDefault();
        this.fireHeld = false;
        fireEl.classList.remove('active');
      };
      fireEl.addEventListener('touchend', endFire);
      fireEl.addEventListener('touchcancel', endFire);

      // Desktop click support on the virtual button
      fireEl.addEventListener('mousedown', (e) => {
        this.fireRequested = true;
        this.fireHeld = true;
      });
      window.addEventListener('mouseup', () => {
        this.fireHeld = false;
      });
    }
  }

  updateTouchDirection(clientX, clientY) {
    const dx = clientX - this.dpadCenter.x;
    const dy = clientY - this.dpadCenter.y;
    const dist = Math.hypot(dx, dy);

    // Limit stick knob visual movement
    const maxRadius = 35;
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    const knob = document.getElementById('dpad-knob');
    if (knob) {
      knob.style.transform = `translate(${knobX}px, ${knobY}px)`;
    }

    // Deadzone
    if (dist < 10) {
      this.stickDir = null;
      return;
    }

    // Determine primary 4-directional direction based on angle
    // -PI to PI
    if (Math.abs(dx) > Math.abs(dy)) {
      this.stickDir = dx > 0 ? DIR.RIGHT : DIR.LEFT;
    } else {
      this.stickDir = dy > 0 ? DIR.DOWN : DIR.UP;
    }
  }

  getDirection() {
    // Check touch controls first
    if (this.touchDir !== undefined && this.touchDir !== null) {
      return this.touchDir;
    }
    if (this.stickDir !== undefined && this.stickDir !== null) {
      return this.stickDir;
    }

    // Check keyboard controls
    if (this.keys['ArrowUp'] || this.keys['KeyW']) return DIR.UP;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) return DIR.RIGHT;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) return DIR.DOWN;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) return DIR.LEFT;

    return null;
  }

  consumeFire() {
    const fire = this.fireRequested;
    this.fireRequested = false;
    return fire || this.fireHeld;
  }

  consumePause() {
    const p = this.pauseRequested;
    this.pauseRequested = false;
    return p;
  }

  consumeRestart() {
    const r = this.restartRequested;
    this.restartRequested = false;
    return r;
  }

  consumeMenu() {
    const m = this.menuRequested;
    this.menuRequested = false;
    return m;
  }

  reset() {
    this.fireRequested = false;
    this.fireHeld = false;
    this.pauseRequested = false;
    this.restartRequested = false;
    this.menuRequested = false;
    this.touchDir = null;
    this.stickDir = null;
    this.moveDir = null;
    this.keys = {};
    const fireEl = document.getElementById('btn-fire');
    if (fireEl) fireEl.classList.remove('active');
    const knob = document.getElementById('dpad-knob');
    if (knob) knob.style.transform = 'translate(0px, 0px)';
  }
}

