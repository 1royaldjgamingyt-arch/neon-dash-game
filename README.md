# NEON DASH ⚡ — 3D Cyber Railway Endless Runner

An arcade endless runner game built in vanilla HTML5 Canvas 2D, CSS3, and JavaScript, bundled and optimized with Vite. Inspired by the gameplay of classic mobile lane-runners, featuring a colorful 3D pseudo-perspective railway environment, cartoon streetwear runner, subway trains, hurdles, cargo crates, and power-ups. Designed specifically for modern mobile browsers (Android/iOS), desktop platforms, and immediate export & publication on **Playgama**.

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
  - Mobile audio autoplay unlock on first gesture.

- **Adaptive Controls & Mobile Optimization**:
  - **Touch Swipes**: Swipe Left/Right to change lanes, Up to jump, Down to slide/roll.
  - **On-Screen Touch Buttons**: Tactile LEFT, RIGHT, JUMP, SLIDE buttons with optional toggle.
  - **Keyboard Controls**: Arrow keys or WASD, Space to Jump/Start, P or Esc to Pause, M to Mute.
  - Zero accidental zoom or scroll during gameplay (`touch-action: none`).
  - Auto-pause when switching tabs or losing window focus.

- **High-Score Persistence**:
  - Saves all-time best scores and lifetime collected coins using `localStorage`.
  - Automatic synchronization with Playgama Cloud Storage if running inside the Playgama Bridge environment.

---

## 📁 File Structure

```text
├── index.html            # Main HTML5 game shell, viewport meta, HUD, modals
├── style.css             # Responsive styling, neon theme, mobile touch layout
├── game.js               # Pseudo-3D Canvas engine, railway renderer, runner animations, audio synth
├── rules.js              # Decoupled core physics, collisions, powerups, and scoring logic
├── rules.test.js         # Native Node.js unit tests (node:test)
├── vite.config.ts        # Vite configuration with relative base ('./') for standalone export
├── package.json          # Dependencies and build/test/export scripts
├── export-zip.js         # Automated zip packager for Playgama and standalone HTML5
├── vercel.json           # Vercel deployment configuration
└── README.md             # Complete project and submission documentation
```

---

## 🚀 Development & Testing Commands

| Command | Action |
|---|---|
| `npm run dev` | Start local Vite development server on port 3000 |
| `npm test` | Run unit tests for physics, collisions, and scoring (`node:test`) |
| `npm run lint` | Type-check project with TypeScript (`tsc --noEmit`) |
| `npm run build` | Compile optimized production bundle to `dist/` with relative paths |
| `npm run package:zip` | Package archives (`neon-dash-playgama.zip` and `neon-dash-standalone.zip`) |
| `npm run export` | Build + package both ZIP archives in one step |

---

## 🕹️ Playgama Submission Guide

NEON DASH satisfies all Playgama platform requirements:

### Platform Compliance Checklist
1. **Archive Structure**: `index.html` is located directly at the root of the ZIP file.
2. **File Size**: The compiled `neon-dash-playgama.zip` is ~17 KB, well within the 300 MB limit (and far below the 30 MB threshold for YouTube Playables).
3. **No External Network Dependencies**: 100% self-contained. All styles, scripts, canvas graphics, and procedural audio are local. No external CDNs, fonts, or tracking scripts that would fail offline or in restricted iframes.
4. **Playgama Bridge Integration**: Automatically connects to `window.bridge` when available:
   - Initializes Bridge via `bridge.initialize()`
   - Emits `bridge.game.gameplayStart()` and `bridge.game.gameplayStop()`
   - Displays interstitial ads on game over via `bridge.advertisement.showInterstitial()`
   - Automatically mutes audio during ads and resumes on close
   - Synchronizes best scores and coin totals with cloud storage
5. **Display & Controls**:
   - Supports touch swipes and on-screen touch buttons for mobile.
   - Supports keyboard (Arrows/WASD/Space/P/M) for desktop.
   - Auto-centers on desktop and fills viewport on mobile.
   - Prevents page bounce/scrolling via `touch-action: none`.
6. **Autoplay Audio Policy**:
   - Web Audio context is initialized on first user interaction anywhere on the screen (`pointerdown`, `touchstart`, `keydown`).
   - Automatically pauses game and suspends audio when document is hidden (`visibilitychange` or `blur`).

### How to Export for Playgama
Run the single export command:
```bash
npm run export
```
This generates:
- **`neon-dash-playgama.zip`**: The production-ready archive containing `dist/index.html` and bundled assets. Upload this ZIP directly in the Playgama Developer Portal under **Game Upload**.
- **`neon-dash-standalone.zip`**: The raw vanilla source archive (unminified `index.html`, `style.css`, `game.js`, `rules.js`).

---

## 🌐 Deploying to Vercel or GitHub Pages

### Deploying to Vercel:
1. Push your repository to GitHub/GitLab.
2. Import the repository in Vercel.
3. Vercel will automatically detect `vercel.json` and build using `vite build` with output directory `dist`.

### Deploying to GitHub Pages:
1. Run `npm run build`.
2. Commit `dist/` or push the project repository.
3. In GitHub Settings > Pages, select the deployment branch (or `/dist` folder) and click Save.
