# NEON DASH ⚡ — 3D Cyber Railway Endless Runner

An arcade endless runner game built in vanilla HTML5 Canvas 2D, CSS3, and JavaScript. Inspired by the gameplay of classic mobile lane-runners, featuring a colorful 3D pseudo-perspective railway environment, cartoon streetwear runner, subway trains, hurdles, cargo crates, and power-ups. Designed specifically for modern mobile browsers (Android/iOS) and desktop platforms with full offline capability and ready for publication on Playgama.

---

## 🎮 Game Features

- **3-Lane 3D Railway Running Track**:
  - 3 sets of steel railway tracks with metallic specular reflections and dual rails per lane.
  - Spaced timber and concrete railway sleepers (ties) receding in smooth forward motion.
  - Ballast gravel textured track bed, side fences, and catenary power masts with cables.
  - Periodic overhead bridges, gantries, and tunnel archways passing overhead seamlessly.
  - Lively cyberpunk city skyline with illuminated windows, neon billboards, and flying hovercars.

- **Cartoon 3D Runner Character**:
  - Detailed cartoon runner in an electric cyan hoodie, pink/magenta streetwear backpack with glowing battery cell, dark joggers, and chunky sneakers.
  - Full animated running cycle with natural swinging arms and kicking sneakers.
  - Athletic jumping animation with tucked knees and downward sneaker soles.
  - Dynamic parkour rolling/sliding animation for slipping under overhead barriers.
  - Smooth banking tilt when switching lanes, accompanied by drop shadows projected directly onto the tracks.

- **Diverse Obstacle Types**:
  - **Subway Train Cars (⚠ DODGE)**: Full-height train cars with glowing headlights, windshield, and corrugated sides blocking lanes.
  - **Railway Hurdles & Barriers (▲ JUMP)**: Construction barricades with hazard chevron stripes and warning light.
  - **Overhead Signal Gantries (▼ SLIDE)**: Low bridge crossbars requiring players to roll or slide underneath.
  - **Cargo Crates (⚠ DODGE)**: Heavy railway shipping containers with corner steel brackets.
  - **Solvability Guarantee**: Algorithmic obstacle generation ensures impossible combinations never spawn.

- **Power-Ups & Collectibles**:
  - **Coin Magnet (🧲)**: Attracts all nearby coins across all 3 tracks directly to the runner.
  - **Energy Shield (🛡️)**: Absorbs 1 collision impact without ending the run, granting 1.2s invulnerability.
  - **Turbo Boost (⚡)**: Blazing invincibility sprint that smashes obstacles and awards bonus points.
  - **HUD Countdown Bars**: Clean, non-intrusive progress meters displaying active power-up timers.
  - **Spinning Gold Coins**: 3D spinning coins with metallic bevels and sparkling collection bursts.

- **Procedural Web Audio Synthesizer**:
  - Energetic retro-futuristic bassline and hi-hat beat.
  - Synthesized sound effects for jumps, slides, coin chimes, power-up fanfare, shield breaks, and impacts.
  - Individual SFX, music, and mute toggles with local storage persistence.

- **Adaptive Controls & Mobile Optimization**:
  - **Touch Swipes**: Swipe Left/Right to change lanes, Up to jump, Down to slide/roll.
  - **On-Screen Touch Buttons**: Tactile LEFT, RIGHT, JUMP, SLIDE buttons with optional toggle.
  - **Keyboard Controls**: Arrow keys or WASD, Space to Jump/Start, P or Esc to Pause, M to Mute.
  - Zero accidental zoom or scroll during gameplay (`touch-action: none`).

- **High-Score Persistence**:
  - Saves all-time best scores and lifetime collected coins using `localStorage`.

---

## 📁 File Structure

```text
├── index.html       # Game shell, viewport meta, semantic DOM HUD, powerup meters, overlays
├── style.css        # Responsive styling, neon theme, mobile touch layout, powerup meters
├── game.js          # Pseudo-3D Canvas engine, railway renderer, runner animations, audio synth
├── rules.js         # Decoupled core physics, collisions, powerups, and scoring logic
├── rules.test.js    # Native Node.js unit tests (node:test)
└── README.md        # Documentation and deployment instructions
```

---

## 🚀 Running the Game Locally

NEON DASH uses pure client-side web technologies and requires no build step or backend database:

### Option A: Using Python (Recommended)
```bash
python3 -m http.server 3000
# Open in browser: http://localhost:3000
```

### Option B: Using Node.js `serve` or `npx`
```bash
npx serve . -p 3000
```

### Option C: Using Vite Dev Server
```bash
npm run dev
```

### Testing on a Real Android Device on Local Wi-Fi:
1. Find your computer's local IP address (`ip addr` on Linux/macOS or `ipconfig` on Windows, e.g., `192.168.1.50`).
2. Run `python3 -m http.server 3000 --bind 0.0.0.0`.
3. Open Chrome or Samsung Internet on your Android device and visit `http://192.168.1.50:3000`.

---

## 🧪 Running Unit Tests

The core rules, collision mathematics, power-up logic, and obstacle solvability are decoupled into `rules.js` and tested using Node's native test runner:

```bash
node --test rules.test.js
```

---

## 📦 Exporting to GitHub & GitHub Pages

1. Initialize git in your local project folder:
   ```bash
   git init
   git add index.html style.css game.js rules.js rules.test.js README.md
   git commit -m "Upgrade NEON DASH: 3D Railway Runner with Cartoon Hero & Power-ups"
   ```

2. Push to your GitHub repository:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-username>/neon-dash.git
   git push -u origin main
   ```

3. Enable GitHub Pages:
   - Go to **Settings** > **Pages**.
   - Under **Build and deployment**, select `main` branch and `/ (root)` folder.
   - Click **Save**. The game will be live at `https://<your-username>.github.io/neon-dash/`.

---

## 🕹️ Playgama Submission Ready

- **Zero External Dependencies**: 100% self-contained vanilla HTML5, CSS3, JavaScript.
- **Offline Capable**: Works with no internet connection after initial download.
- **Responsive Layout**: Designed for Android portrait mobile viewports and desktop browsers.
- **Zipping for Submission**:
  ```bash
  zip -r neon-dash.zip index.html style.css game.js rules.js
  ```
