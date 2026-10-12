# ⚡ Retro Tank Fodder (iOS & Android 2D Arcade Game)

A fast, retro 2D top-down tank combat arcade game inspired by classic NES Battle City / Atari Combat. Built with modular HTML5 Canvas and configured with Capacitor for native iOS and Android deployment.

---

## 🕹️ Gameplay Features

- **Classic Top-Down Combat**: Navigate destructible brick labyrinths, defend your Golden Eagle HQ base, and wipe out incoming waves of enemy tanks.
- **Synthesized 8-Bit Web Audio**: Laser shots, shell explosions, damage impacts, and retro fanfare built directly with the Web Audio API (zero external sound files needed).
- **Multiple Enemy Classes**:
  - 🏎️ **Scout Tank**: High mobility, standard cannon.
  - 🛡️ **Armor Tank (Heavy)**: Heavily armored, takes 4 hits to destroy.
  - 🎯 **Speed / Sniper Tank**: Fires high-velocity ballistic shells.
  - 👾 **Mega Boss Tank**: Giant purple tank with high armor and rapid firing rate.
- **Power-Ups System** (dropped by flashing bonus enemy tanks):
  - ⭐ **Star**: Upgrades player cannon (faster firing rate, double shells, armor-piercing steel-breaker rounds).
  - 🛡️ **Shield**: Temporary invulnerability bubble.
  - 💣 **Nuke Bomb**: Instantly wipes out all on-screen enemy tanks.
  - ⏱️ **Clock**: Freezes all enemy tanks in place for 8 seconds.
  - 🏰 **Shovel / Fortify**: Reinforces your base walls with indestructible steel for 12 seconds.
  - ❤️ **Life**: Extra tank life.
- **Mobile-First Touch Controls**:
  - Dynamic virtual 4-way D-Pad / Analog thumbstick on the left.
  - Responsive arcade FIRE action button on the right.
  - Supports multi-touch (moving and shooting simultaneously).
- **Desktop Keyboard Support**:
  - `WASD` or `Arrow Keys`: Move tank
  - `Space` / `J` / `K`: Shoot
  - `P`: Pause
  - `R` / `Enter`: Start / Retry

---

## 🚀 Running Locally (Instant Web & Mobile Browser Preview)

1. Install dependencies:
```bash
npm install
```

2. (Optional) Copy environment template for telemetry:
```bash
cp .env.example .env
```

3. Start the local development server:
```bash
npm run dev
# Or run with Node directly: node server.js
```

Open **`http://localhost:5173`** (or `http://localhost:3000`) in your browser.

---

## 📱 Packaging for iOS (iPhone & iPad) and Android

This project includes pre-configured `capacitor.config.json` settings for packaging into native iOS and Android apps.

### 1. Install Capacitor Tools
Run the following in the project root:
```bash
npm install
```

### 2. Export to iOS (Xcode)
```bash
# Add iOS native project
npx cap add ios

# Sync your web files to the native container
npx cap sync ios

# Open the project directly in Xcode
npx cap open ios
```
*In Xcode: Select your connected iPhone or a Simulator from the top device list and press **Run (Cmd + R)**.*

---

### 3. Export to Android (Android Studio)
```bash
# Add Android native project
npx cap add android

# Sync your web files to the native container
npx cap sync android

# Open the project directly in Android Studio
npx cap open android
```
*In Android Studio: Click **Run 'app' (Shift + F10)** to launch on an Android emulator or connected Android device via USB.*

---

## 📁 File Structure

```
retro-tank-game/
├── index.html              # Mobile-optimized HTML viewport and touch layout
├── style.css               # Arcade CRT styling and responsive controllers
├── server.js               # Zero-dependency local dev server
├── capacitor.config.json   # Native iOS & Android app configuration
├── package.json            # Project dependencies & Capacitor build scripts
└── src/
    ├── main.js             # Master game loop and state manager
    ├── constants.js        # Physics constants, tile types, tank stats
    ├── audio.js            # Synthesized 8-bit Web Audio engine
    ├── input.js            # Multi-touch virtual gamepad & keyboard handler
    ├── map.js              # Tile collision, destructible terrain, level maps
    ├── tank.js             # Tank physics, corner-snapping, and AI pathfinding
    ├── bullet.js           # Ballistic projectiles and collision checks
    ├── powerup.js          # Drops, timers, and buff system
    ├── effects.js          # Particle explosions, floating score text, screen shake
    └── ui.js               # HUD, title screen, game over, stage cards
```
