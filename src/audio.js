// 8-Bit Retro Sound Synthesizer using Web Audio API

class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initialized = true;
      }
    } catch (e) {
      console.warn('Web Audio API not supported on this device', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playShoot(isPlayer = true) {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isPlayer ? 'square' : 'sawtooth';
    osc.frequency.setValueAtTime(isPlayer ? 440 : 280, t);
    osc.frequency.exponentialRampToValueAtTime(isPlayer ? 110 : 80, t + 0.12);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  playHit() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  playCriticalHit() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(580, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.18);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  playExplosion(isLarge = false) {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const dur = isLarge ? 0.45 : 0.25;

    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isLarge ? 400 : 800, t);
    filter.frequency.linearRampToValueAtTime(50, t + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isLarge ? 0.35 : 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + dur);
  }

  playStageStart() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const fanfare = [
      { f: 261.63, d: 0.1 },
      { f: 329.63, d: 0.1 },
      { f: 392.00, d: 0.1 },
      { f: 523.25, d: 0.25 }
    ];

    let cur = t;
    fanfare.forEach((n) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(n.f, cur);
      gain.gain.setValueAtTime(0.18, cur);
      gain.gain.linearRampToValueAtTime(0.01, cur + n.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(cur);
      osc.stop(cur + n.d);
      cur += n.d;
    });
  }

  playVictory() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const fanfare = [
      { freq: 261.63, time: 0.00, dur: 0.15 }, // C4
      { freq: 329.63, time: 0.14, dur: 0.15 }, // E4
      { freq: 392.00, time: 0.28, dur: 0.15 }, // G4
      { freq: 523.25, time: 0.42, dur: 0.22 }, // C5
      { freq: 392.00, time: 0.65, dur: 0.12 }, // G4
      { freq: 523.25, time: 0.78, dur: 0.45 }  // C5 (hold)
    ];

    fanfare.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(note.freq, t + note.time);
      gain.gain.setValueAtTime(0.2, t + note.time);
      gain.gain.exponentialRampToValueAtTime(0.01, t + note.time + note.dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + note.time);
      osc.stop(t + note.time + note.dur);
    });
  }

  playGameOver() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const notes = [440, 415, 392, 349];
    let cur = t;

    notes.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, cur);
      gain.gain.setValueAtTime(0.25, cur);
      gain.gain.linearRampToValueAtTime(0.01, cur + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(cur);
      osc.stop(cur + 0.25);
      cur += 0.22;
    });
  }

  playPowerup() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.linearRampToValueAtTime(660, t + 0.2);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.2);
  }
}

export const sound = new SoundManager();
