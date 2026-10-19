/**
 * NEON DASH — Professional 3D Endless Runner
 * Optimized for Android Mobile Browsers, Desktop HTML5 & Playgama
 * Pure HTML5 Canvas 2D Pseudo-3D Engine & Web Audio Synthesizer
 */

import {
  LANES,
  OBSTACLE_TYPES,
  POWERUP_TYPES,
  CONFIG,
  getLaneX,
  calculateSpeed,
  calculateScore,
  isPatternSolvable,
  checkCollision,
  checkCoinPickup,
  checkPowerupPickup,
  attractCoinTowardPlayer
} from './rules.js';

// ============================================================================
// AUDIO SYNTHESIZER (Web Audio API - Zero External Files)
// ============================================================================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.isMuted = false;
    this.sfxEnabled = true;
    this.musicEnabled = true;
    this.musicTimer = null;
    this.musicStep = 0;
    this.melodyStep = 0;
    // Upbeat energetic synthwave progression: A minor -> F major -> C major -> G major
    this.bassNotes = [
      110, 110, 164.8, 110, 87.3, 87.3, 130.8, 87.3,
      130.8, 130.8, 196, 130.8, 98, 98, 146.8, 98
    ];
    this.leadNotes = [
      440, 523.25, 659.25, 523.25, 349.23, 440, 523.25, 440,
      523.25, 659.25, 783.99, 659.25, 392, 493.88, 587.33, 493.88
    ];
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();

      this.masterGain.gain.value = this.isMuted ? 0 : 0.75;
      this.sfxGain.gain.value = this.sfxEnabled ? 0.85 : 0;
      this.musicGain.gain.value = this.musicEnabled ? 0.22 : 0;

      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Web Audio not available:', e);
    }
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.75, this.ctx.currentTime);
    }
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = enabled;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(enabled ? 0.85 : 0, this.ctx.currentTime);
    }
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(enabled ? 0.22 : 0, this.ctx.currentTime);
    }
    if (enabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  playJump() {
    this.ensureContext();
    if (!this.ctx || this.isMuted || !this.sfxEnabled) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(620, t + 0.16);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.18);
    } catch (e) {}
  }

  playSlide() {
    this.ensureContext();
    if (!this.ctx || this.isMuted || !this.sfxEnabled) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(360, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.22);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.22);
    } catch (e) {}
  }

  playCoin() {
    this.ensureContext();
    if (!this.ctx || this.isMuted || !this.sfxEnabled) return;
    try {
      const t = this.ctx.currentTime;
      const notes = [987.77, 1318.51]; // B5, E6 crystal bell chime
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.045);
        gain.gain.setValueAtTime(0.28, t + idx * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.045 + 0.24);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t + idx * 0.045);
        osc.stop(t + idx * 0.045 + 0.24);
      });
    } catch (e) {}
  }

  playPowerup() {
    this.ensureContext();
    if (!this.ctx || this.isMuted || !this.sfxEnabled) return;
    try {
      const t = this.ctx.currentTime;
      const chords = [523.25, 659.25, 783.99, 1046.5]; // C major fanfare
      chords.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.05);
        gain.gain.setValueAtTime(0.3, t + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.3);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t + idx * 0.05);
        osc.stop(t + idx * 0.05 + 0.3);
      });
    } catch (e) {}
  }

  playShieldBreak() {
    this.ensureContext();
    if (!this.ctx || this.isMuted || !this.sfxEnabled) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.25);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.25);
    } catch (e) {}
  }

  playLaneSwitch() {
    this.ensureContext();
    if (!this.ctx || this.isMuted || !this.sfxEnabled) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(480, t + 0.07);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.07);
    } catch (e) {}
  }

  playCrash() {
    this.ensureContext();
    if (!this.ctx || this.isMuted || !this.sfxEnabled) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.45);
      gain.gain.setValueAtTime(0.65, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.45);
    } catch (e) {}
  }

  startMusic() {
    this.ensureContext();
    if (this.musicTimer || !this.ctx || !this.musicEnabled || this.isMuted) return;

    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.ctx.state === 'suspended' || !this.musicEnabled || this.isMuted) return;
      try {
        const t = this.ctx.currentTime;
        const note = this.bassNotes[this.musicStep % this.bassNotes.length];
        this.musicStep++;

        // Bass oscillator
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(note, t);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(380, t);
        filter.frequency.exponentialRampToValueAtTime(180, t + 0.16);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.17);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(t);
        osc.stop(t + 0.17);

        // Hi-hat pulse every other beat
        if (this.musicStep % 2 === 0) {
          const hatOsc = this.ctx.createOscillator();
          const hatGain = this.ctx.createGain();
          const hatFilter = this.ctx.createBiquadFilter();
          hatOsc.type = 'square';
          hatFilter.type = 'highpass';
          hatFilter.frequency.setValueAtTime(6500, t);
          hatOsc.frequency.setValueAtTime(8000, t);
          hatGain.gain.setValueAtTime(0.035, t);
          hatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
          hatOsc.connect(hatFilter);
          hatFilter.connect(hatGain);
          hatGain.connect(this.musicGain);
          hatOsc.start(t);
          hatOsc.stop(t + 0.04);
        }
      } catch (e) {}
    }, 145);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

// ============================================================================
// PARTICLE SYSTEM (Sparks, Coin Glows, Exhaust Trails, Debris)
// ============================================================================
class ParticleSystem {
  constructor(maxParticles = 180) {
    this.pool = [];
    this.maxParticles = maxParticles;
    for (let i = 0; i < maxParticles; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 3,
        color: '#00f3ff',
        gravity: 0,
        decay: 1
      });
    }
  }

  spawn(x, y, vx, vy, life, size, color, gravity = 0) {
    const p = this.pool.find(item => !item.active);
    if (!p) return;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.maxLife = life;
    p.size = size;
    p.color = color;
    p.gravity = gravity;
  }

  burst(x, y, count = 12, color = '#00f3ff', speed = 140) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const spd = speed * (0.6 + Math.random() * 0.8);
      this.spawn(
        x,
        y,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd - 40,
        0.35 + Math.random() * 0.35,
        2.5 + Math.random() * 3.5,
        color,
        280
      );
    }
  }

  sparks(x, y, count = 8, color = '#ffb800') {
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 160;
      const vy = -Math.random() * 120 - 20;
      this.spawn(x, y, vx, vy, 0.2 + Math.random() * 0.25, 2.0, color, 400);
    }
  }

  update(dt) {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
    }
  }

  render(ctx) {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ============================================================================
// MAIN GAME CONTROLLER & PSEUDO-3D RAILWAY RUNNER ENGINE
// ============================================================================
export class NeonDashGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    // Virtual Internal Resolution (optimally balanced for mobile & desktop)
    this.V_WIDTH = 480;
    this.V_HEIGHT = 854;
    this.scaleX = 1;
    this.scaleY = 1;

    // Pseudo-3D Perspective Camera Projection
    this.horizonY = this.V_HEIGHT * 0.34;
    this.roadBottomY = this.V_HEIGHT * 0.88;
    this.roadBottomWidth = 420;
    this.roadTopWidth = 72;
    this.cameraDepth = 300;

    // Persistent Storage & State
    this.storage = this.initStorage();
    this.state = 'title'; // 'title' | 'playing' | 'paused' | 'gameover'
    this.audio = new SoundFX();
    this.particles = new ParticleSystem(180);

    // Dynamic Gameplay Variables
    this.distance = 0;
    this.coins = 0;
    this.runCoins = 0;
    this.speed = CONFIG.BASE_SPEED;
    this.score = 0;
    this.roadGridOffset = 0;
    this.hitstopTimer = 0;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.invulnerableTimer = 0;

    // Active Power-ups State
    this.activePowerups = {
      magnet: 0, // timer in seconds
      shield: false, // 1 hit protection
      boost: 0   // timer in seconds
    };

    // Player Entity (Detailed Cartoon 3D Streetwear Runner)
    this.player = {
      lane: LANES.CENTER,
      targetLane: LANES.CENTER,
      x: this.V_WIDTH * 0.5,
      z: 0,
      jumpY: 0,
      vy: 0,
      isJumping: false,
      isSliding: false,
      slideTimer: 0,
      tilt: 0,
      runCycle: 0,
      collisionAnim: 0
    };

    // Environment & Scenery
    this.obstacles = [];
    this.coinsList = [];
    this.powerupsList = [];
    this.overheadBridges = [];
    this.clouds = this.generateClouds();
    this.cityBuildings = this.generateCitySkyline();
    this.flyingCars = this.generateFlyingCars();
    this.nextSpawnZ = 1350; // Opening runway distance

    // Touch & Swipe Tracking
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.isSwiping = false;

    // Cache DOM Elements for zero garbage collection during gameplay
    this.hudScore = document.getElementById('hud-score');
    this.hudCoins = document.getElementById('hud-coins');
    this.hudDistance = document.getElementById('hud-distance');
    this.hudBestChip = document.getElementById('hud-best-chip');
    this.hudSpeedVal = document.getElementById('hud-speed-val');

    // Power-up HUD Elements
    this.puMagnet = document.getElementById('powerup-magnet');
    this.puShield = document.getElementById('powerup-shield');
    this.puBoost = document.getElementById('powerup-boost');
    this.meterMagnet = document.getElementById('meter-magnet');
    this.meterShield = document.getElementById('meter-shield');
    this.meterBoost = document.getElementById('meter-boost');

    // Modals
    this.titleBestScore = document.getElementById('title-best-score');
    this.titleTotalCoins = document.getElementById('title-total-coins');
    this.goScore = document.getElementById('go-score');
    this.goDistance = document.getElementById('go-distance');
    this.goCoins = document.getElementById('go-coins');
    this.goBest = document.getElementById('go-best');
    this.goNewBest = document.getElementById('go-new-best');

    this.lastTime = 0;

    // Initialization
    this.setupEventListeners();
    this.setupTouchControls();
    this.setupSettingsToggles();
    this.initPlaygamaBridge();
    this.handleResize();

    window.game = this;

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      this.startGame();
    } else {
      this.setState('title');
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  // ==========================================================================
  // PLAYGAMA BRIDGE SDK ADAPTER (Safe fallback if SDK is absent)
  // ==========================================================================
  initPlaygamaBridge() {
    if (typeof window !== 'undefined' && window.bridge) {
      try {
        const b = window.bridge;
        b.initialize?.()
          ?.then(() => {
            console.log('Playgama Bridge SDK initialized successfully');
            // Check for cloud storage support
            if (b.storage?.isSupported?.(b.storage?.StorageType?.PLATFORM_INTERNAL)) {
              b.storage.get(['neon_dash_best_score', 'neon_dash_total_coins'])
                .then((data) => {
                  if (data && data[0]) {
                    const cloudBest = parseInt(data[0], 10) || 0;
                    if (cloudBest > this.storage.bestScore) {
                      this.storage.bestScore = cloudBest;
                    }
                  }
                  if (data && data[1]) {
                    const cloudCoins = parseInt(data[1], 10) || 0;
                    if (cloudCoins > this.storage.totalCoins) {
                      this.storage.totalCoins = cloudCoins;
                    }
                  }
                  if (this.state === 'title') {
                    this.titleBestScore.textContent = this.storage.bestScore.toLocaleString();
                    this.titleTotalCoins.textContent = this.storage.totalCoins.toLocaleString();
                  }
                })
                .catch(() => {});
            }

            // Listen for ad state changes to mute/unmute audio automatically
            if (b.advertisement?.on) {
              b.advertisement.on('interstitial_state_changed', (state) => {
                if (state === 'opened') {
                  this.audio.setMuted(true);
                  if (this.state === 'playing') this.setState('paused');
                } else if (state === 'closed') {
                  if (!this.storage.muted) this.audio.setMuted(false);
                }
              });
            }
          })
          ?.catch((err) => {
            console.warn('Playgama Bridge initialization info:', err);
          });
      } catch (e) {
        console.warn('Playgama Bridge init skipped:', e);
      }
    }
  }

  // ==========================================================================
  // STORAGE & PREFERENCES
  // ==========================================================================
  initStorage() {
    const defaultData = {
      bestScore: 0,
      totalCoins: 0,
      muted: false,
      sfx: true,
      music: true,
      touchButtons: true
    };

    try {
      const best = localStorage.getItem('neon_dash_best_score');
      const coins = localStorage.getItem('neon_dash_total_coins');
      const muted = localStorage.getItem('neon_dash_muted');
      const sfx = localStorage.getItem('neon_dash_sfx');
      const music = localStorage.getItem('neon_dash_music');
      const touchBtns = localStorage.getItem('neon_dash_touch_buttons');

      if (best !== null) defaultData.bestScore = parseInt(best, 10) || 0;
      if (coins !== null) defaultData.totalCoins = parseInt(coins, 10) || 0;
      if (muted !== null) defaultData.muted = muted === 'true';
      if (sfx !== null) defaultData.sfx = sfx === 'true';
      if (music !== null) defaultData.music = music === 'true';
      if (touchBtns !== null) defaultData.touchButtons = touchBtns === 'true';
    } catch (e) {
      console.warn('LocalStorage unavailable, using in-memory state:', e);
    }
    return defaultData;
  }

  saveStorage() {
    try {
      localStorage.setItem('neon_dash_best_score', this.storage.bestScore.toString());
      localStorage.setItem('neon_dash_total_coins', this.storage.totalCoins.toString());
      localStorage.setItem('neon_dash_muted', this.storage.muted.toString());
      localStorage.setItem('neon_dash_sfx', this.storage.sfx.toString());
      localStorage.setItem('neon_dash_music', this.storage.music.toString());
      localStorage.setItem('neon_dash_touch_buttons', this.storage.touchButtons.toString());
    } catch (e) {}

    // Cloud storage sync if running on Playgama Bridge
    if (typeof window !== 'undefined' && window.bridge?.storage?.set) {
      try {
        window.bridge.storage.set(
          ['neon_dash_best_score', 'neon_dash_total_coins'],
          [this.storage.bestScore.toString(), this.storage.totalCoins.toString()]
        );
      } catch (e) {}
    }
  }

  // ==========================================================================
  // SCENERY PROCEDURAL GENERATION
  // ==========================================================================
  generateClouds() {
    const clouds = [];
    for (let i = 0; i < 6; i++) {
      clouds.push({
        x: Math.random() * this.V_WIDTH,
        y: 20 + Math.random() * (this.horizonY - 50),
        w: 60 + Math.random() * 80,
        h: 22 + Math.random() * 20,
        speed: 8 + Math.random() * 12,
        opacity: 0.15 + Math.random() * 0.2
      });
    }
    return clouds;
  }

  generateFlyingCars() {
    return [
      { x: -60, y: 80, speed: 50, color: '#00f3ff', len: 32 },
      { x: this.V_WIDTH + 80, y: 130, speed: -60, color: '#ff007f', len: 36 },
      { x: -120, y: 175, speed: 65, color: '#ffb800', len: 28 }
    ];
  }

  generateCitySkyline() {
    const buildings = [];
    const count = 18;
    for (let i = 0; i < count; i++) {
      const w = 28 + Math.random() * 34;
      const h = 85 + Math.random() * 160;
      const x = (i / count) * this.V_WIDTH * 1.35 - this.V_WIDTH * 0.18;
      const hue = Math.random() > 0.5 ? '#00f3ff' : '#ff007f';
      const billboard = Math.random() > 0.65 ? (Math.random() > 0.5 ? 'METRO' : 'DASH') : null;
      buildings.push({
        x,
        w,
        h,
        windows: Math.floor(Math.random() * 7) + 3,
        hue,
        billboard
      });
    }
    return buildings;
  }

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================
  setState(newState) {
    this.state = newState;
    document.body.dataset.state = newState;

    if (newState === 'title') {
      this.titleBestScore.textContent = this.storage.bestScore.toLocaleString();
      this.titleTotalCoins.textContent = this.storage.totalCoins.toLocaleString();
      this.audio.stopMusic();
    } else if (newState === 'playing') {
      this.audio.startMusic();
    } else if (newState === 'paused') {
      this.audio.stopMusic();
    } else if (newState === 'gameover') {
      this.audio.stopMusic();
      const isNewBest = this.score > this.storage.bestScore;
      if (isNewBest) {
        this.storage.bestScore = this.score;
        this.goNewBest.style.display = 'inline-block';
      } else {
        this.goNewBest.style.display = 'none';
      }

      this.storage.totalCoins += this.runCoins;
      this.saveStorage();

      this.goScore.textContent = this.score.toLocaleString();
      this.goDistance.textContent = `${Math.floor(this.distance)}m`;
      this.goCoins.textContent = `+${this.runCoins}`;
      this.goBest.textContent = this.storage.bestScore.toLocaleString();

      // Notify Playgama Bridge if present
      if (typeof window !== 'undefined' && window.bridge) {
        try {
          window.bridge.game?.gameplayStop?.();
          window.bridge.advertisement?.showInterstitial?.();
        } catch (e) {}
      }
    }
  }

  startGame() {
    this.audio.ensureContext();

    // Notify Playgama Bridge if present
    if (typeof window !== 'undefined' && window.bridge?.game?.gameplayStart) {
      try {
        window.bridge.game.gameplayStart();
      } catch (e) {}
    }

    this.distance = 0;
    this.coins = 0;
    this.runCoins = 0;
    this.speed = CONFIG.BASE_SPEED;
    this.score = 0;
    this.obstacles = [];
    this.coinsList = [];
    this.powerupsList = [];
    this.overheadBridges = [];
    this.nextSpawnZ = 1950; // Generous 4.5s opening runway
    this.hitstopTimer = 0;
    this.shakeDuration = 0;
    this.invulnerableTimer = 0;

    // Reset powerups
    this.activePowerups = {
      magnet: 0,
      shield: false,
      boost: 0
    };

    // Introductory reward coins down the center track
    for (let c = 0; c < 8; c++) {
      this.coinsList.push({
        lane: LANES.CENTER,
        x: getLaneX(LANES.CENTER, this.V_WIDTH * 0.5, CONFIG.LANE_SPACING),
        z: 360 + c * 85,
        jumpY: 0,
        collected: false
      });
    }

    // Reset player position & physics
    this.player.lane = LANES.CENTER;
    this.player.targetLane = LANES.CENTER;
    this.player.x = this.V_WIDTH * 0.5;
    this.player.jumpY = 0;
    this.player.vy = 0;
    this.player.isJumping = false;
    this.player.isSliding = false;
    this.player.slideTimer = 0;
    this.player.tilt = 0;
    this.player.collisionAnim = 0;

    this.updateHUD();
    this.setState('playing');
  }

  // ==========================================================================
  // INPUT CONTROLS & EVENT LISTENERS
  // ==========================================================================
  moveLane(direction) {
    if (this.state !== 'playing') return;
    const newLane = Math.max(-1, Math.min(1, this.player.targetLane + direction));
    if (newLane !== this.player.targetLane) {
      this.player.targetLane = newLane;
      this.player.tilt = direction * 0.32; // natural banking lean
      this.audio.playLaneSwitch();
      this.particles.sparks(this.player.x, this.roadBottomY - 10, 6, '#00f3ff');
    }
  }

  jump() {
    if (this.state !== 'playing') return;
    if (!this.player.isJumping) {
      this.player.isJumping = true;
      this.player.vy = 520; // upward jump impulse
      this.player.isSliding = false;
      this.audio.playJump();
      this.particles.burst(this.player.x, this.roadBottomY - 5, 8, '#00f3ff', 140);
    }
  }

  slide() {
    if (this.state !== 'playing') return;
    if (this.player.isJumping) {
      this.player.vy = -680; // fast downward dive
    }
    this.player.isSliding = true;
    this.player.slideTimer = 0.65; // slide duration
    this.audio.playSlide();
    this.particles.sparks(this.player.x, this.roadBottomY - 8, 10, '#ffb800');
  }

  togglePause() {
    if (this.state === 'playing') {
      this.setState('paused');
    } else if (this.state === 'paused') {
      this.setState('playing');
    }
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.handleResize());

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (this.state === 'title' || this.state === 'gameover') {
        if (e.code === 'Space' || e.code === 'Enter') {
          this.startGame();
          return;
        }
      }

      if (this.state === 'playing') {
        switch (e.code) {
          case 'ArrowLeft':
          case 'KeyA':
            this.moveLane(-1);
            break;
          case 'ArrowRight':
          case 'KeyD':
            this.moveLane(1);
            break;
          case 'ArrowUp':
          case 'KeyW':
          case 'Space':
            this.jump();
            break;
          case 'ArrowDown':
          case 'KeyS':
            this.slide();
            break;
          case 'KeyP':
          case 'Escape':
            this.togglePause();
            break;
          case 'KeyM':
            this.toggleMute();
            break;
        }
      } else if (this.state === 'paused') {
        if (e.code === 'KeyP' || e.code === 'Escape') {
          this.togglePause();
        }
      }
    });

    // Button Clicks
    const btnStart = document.getElementById('btn-start');
    if (btnStart) btnStart.addEventListener('click', () => this.startGame());

    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) btnRestart.addEventListener('click', () => this.startGame());

    const btnPauseRestart = document.getElementById('btn-pause-restart');
    if (btnPauseRestart) btnPauseRestart.addEventListener('click', () => this.startGame());

    const btnResume = document.getElementById('btn-resume');
    if (btnResume) btnResume.addEventListener('click', () => this.setState('playing'));

    const btnMenu = document.getElementById('btn-menu');
    if (btnMenu) btnMenu.addEventListener('click', () => this.setState('title'));

    const btnPauseTitle = document.getElementById('btn-pause-title');
    if (btnPauseTitle) btnPauseTitle.addEventListener('click', () => this.setState('title'));

    const btnPause = document.getElementById('btn-pause');
    if (btnPause) btnPause.addEventListener('click', () => this.togglePause());

    const btnAudio = document.getElementById('btn-audio');
    if (btnAudio) btnAudio.addEventListener('click', () => this.toggleMute());

    const btnTouchToggle = document.getElementById('btn-touch-toggle');
    if (btnTouchToggle) {
      btnTouchToggle.addEventListener('click', () => {
        this.toggleTouchButtons();
      });
    }

    // Unmute & unlock Web Audio on first user interaction anywhere
    const unlockAudio = () => {
      this.audio.ensureContext();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });

    // Handle tab visibility changes (Playgama / mobile app switching compliance)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.state === 'playing') {
          this.setState('paused');
        }
        this.audio.setMusicEnabled(false);
      } else {
        if (this.storage.music && this.state === 'playing') {
          this.audio.setMusicEnabled(true);
        }
      }
    });

    // Handle window blur (user clicks outside iframe or switches window)
    window.addEventListener('blur', () => {
      if (this.state === 'playing') {
        this.setState('paused');
      }
    });

    // Mobile orientation change listener
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.handleResize(), 120);
    });
  }

  setupTouchControls() {
    // Touch Swipes on Canvas / Game Container
    const container = document.getElementById('game-container');
    if (!container) return;

    container.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 1) {
          this.touchStartX = e.touches[0].clientX;
          this.touchStartY = e.touches[0].clientY;
          this.touchStartTime = performance.now();
          this.isSwiping = true;
        }
      },
      { passive: false }
    );

    container.addEventListener(
      'touchmove',
      (e) => {
        if (this.isSwiping && this.state === 'playing') {
          e.preventDefault(); // Prevent scroll during active swipe
        }
      },
      { passive: false }
    );

    container.addEventListener(
      'touchend',
      (e) => {
        if (!this.isSwiping) return;
        this.isSwiping = false;

        if (this.state !== 'playing') return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const dx = touchEndX - this.touchStartX;
        const dy = touchEndY - this.touchStartY;
        const dt = performance.now() - this.touchStartTime;

        const minSwipeDist = 28;

        if (dt < 450) {
          if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal Swipe
            if (dx > minSwipeDist) {
              this.moveLane(1);
            } else if (dx < -minSwipeDist) {
              this.moveLane(-1);
            }
          } else {
            // Vertical Swipe
            if (dy < -minSwipeDist) {
              this.jump();
            } else if (dy > minSwipeDist) {
              this.slide();
            }
          }
        }
      },
      { passive: false }
    );

    // On-Screen Touch Buttons (Alternative Controls)
    const btnLeft = document.getElementById('btn-ctrl-left');
    const btnRight = document.getElementById('btn-ctrl-right');
    const btnJump = document.getElementById('btn-ctrl-jump');
    const btnSlide = document.getElementById('btn-ctrl-slide');

    if (btnLeft) {
      btnLeft.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.moveLane(-1);
      });
    }
    if (btnRight) {
      btnRight.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.moveLane(1);
      });
    }
    if (btnJump) {
      btnJump.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.jump();
      });
    }
    if (btnSlide) {
      btnSlide.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.slide();
      });
    }
  }

  toggleTouchButtons(forceState) {
    if (forceState !== undefined) {
      this.storage.touchButtons = forceState;
    } else {
      this.storage.touchButtons = !this.storage.touchButtons;
    }

    const touchNav = document.getElementById('touch-controls');
    const toggleSwitch = document.getElementById('toggle-touch-pad');
    if (this.storage.touchButtons) {
      touchNav.style.display = 'flex';
      if (toggleSwitch) toggleSwitch.classList.add('active');
    } else {
      touchNav.style.display = 'none';
      if (toggleSwitch) toggleSwitch.classList.remove('active');
    }
    this.saveStorage();
  }

  toggleMute() {
    this.storage.muted = !this.storage.muted;
    this.audio.setMuted(this.storage.muted);
    this.updateAudioIcons();
    this.saveStorage();
  }

  updateAudioIcons() {
    const iconOn = document.getElementById('icon-sound-on');
    const iconOff = document.getElementById('icon-sound-off');
    if (this.storage.muted) {
      iconOn.style.display = 'none';
      iconOff.style.display = 'block';
    } else {
      iconOn.style.display = 'block';
      iconOff.style.display = 'none';
    }
  }

  setupSettingsToggles() {
    const toggleSfx = document.getElementById('toggle-sfx');
    toggleSfx.addEventListener('click', () => {
      this.storage.sfx = !this.storage.sfx;
      toggleSfx.classList.toggle('active', this.storage.sfx);
      this.audio.setSfxEnabled(this.storage.sfx);
      this.saveStorage();
    });

    const toggleMusic = document.getElementById('toggle-music');
    toggleMusic.addEventListener('click', () => {
      this.storage.music = !this.storage.music;
      toggleMusic.classList.toggle('active', this.storage.music);
      this.audio.setMusicEnabled(this.storage.music);
      this.saveStorage();
    });

    const toggleTouch = document.getElementById('toggle-touch-pad');
    toggleTouch.addEventListener('click', () => {
      this.toggleTouchButtons();
    });

    if (this.storage.muted) this.audio.setMuted(true);
    if (!this.storage.sfx) {
      toggleSfx.classList.remove('active');
      this.audio.setSfxEnabled(false);
    }
    if (!this.storage.music) {
      toggleMusic.classList.remove('active');
      this.audio.setMusicEnabled(false);
    }
    this.toggleTouchButtons(this.storage.touchButtons);
    this.updateAudioIcons();
  }

  handleResize() {
    const container = document.getElementById('game-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const w = Math.max(300, Math.round(rect.width || window.innerWidth));
    const h = Math.max(480, Math.round(rect.height || window.innerHeight));

    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.scaleX = this.canvas.width / this.V_WIDTH;
    this.scaleY = this.canvas.height / this.V_HEIGHT;
  }

  // ==========================================================================
  // SPAWNING MECHANICS (Railway Tracks, Trains, Barriers, Powerups, Coins)
  // ==========================================================================
  spawnWave() {
    const laneKeys = [LANES.LEFT, LANES.CENTER, LANES.RIGHT];
    const availableTypes = [
      OBSTACLE_TYPES.BARRIER,   // Jump over
      OBSTACLE_TYPES.HURDLE,    // Jump over
      OBSTACLE_TYPES.OVERHEAD,  // Slide under
      OBSTACLE_TYPES.TRAIN,     // Dodge lane (subway car)
      OBSTACLE_TYPES.CRATE      // Dodge lane (rail cargo)
    ];

    // Early run (< 120m): 1 obstacle at a time for fair learning curve!
    let numObstacles = 1;
    if (this.distance > 120) {
      numObstacles = Math.random() > 0.45 ? 2 : 1;
    }

    const shuffledLanes = [...laneKeys].sort(() => Math.random() - 0.5);
    const waveObstacles = [null, null, null];

    for (let i = 0; i < numObstacles; i++) {
      const lane = shuffledLanes[i];
      const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      waveObstacles[lane + 1] = type;
    }

    // Ensure pattern is fair and solvable
    if (!isPatternSolvable(waveObstacles)) {
      const freeIdx = Math.floor(Math.random() * 3);
      waveObstacles[freeIdx] = Math.random() > 0.5 ? OBSTACLE_TYPES.BARRIER : null;
    }

    const spawnZ = 920;

    waveObstacles.forEach((type, laneIdx) => {
      const lane = laneIdx - 1;
      const laneX = getLaneX(lane, this.V_WIDTH * 0.5, CONFIG.LANE_SPACING);

      if (type) {
        this.obstacles.push({
          type,
          lane,
          x: laneX,
          z: spawnZ,
          height: (type === OBSTACLE_TYPES.BARRIER || type === OBSTACLE_TYPES.HURDLE) ? 42 : 80,
          cleared: false
        });

        // Spawn bonus coin arc on top of jumpable barriers!
        if ((type === OBSTACLE_TYPES.BARRIER || type === OBSTACLE_TYPES.HURDLE) && Math.random() > 0.25) {
          this.coinsList.push({
            lane,
            x: laneX,
            z: spawnZ,
            jumpY: 58,
            collected: false
          });
        }
      } else {
        // In open lane, occasionally spawn power-up or coin trail
        const roll = Math.random();
        if (roll < 0.16) {
          // Spawn Power-Up Capsule!
          const powerTypes = [POWERUP_TYPES.MAGNET, POWERUP_TYPES.SHIELD, POWERUP_TYPES.BOOST];
          const chosenPU = powerTypes[Math.floor(Math.random() * powerTypes.length)];
          this.powerupsList.push({
            lane,
            x: laneX,
            z: spawnZ,
            type: chosenPU,
            jumpY: 18,
            collected: false
          });
        } else if (roll < 0.65) {
          // Spawn 3-coin trail in open track
          const coinCount = Math.floor(Math.random() * 3) + 2;
          for (let c = 0; c < coinCount; c++) {
            this.coinsList.push({
              lane,
              x: laneX,
              z: spawnZ + c * 40,
              jumpY: 0,
              collected: false
            });
          }
        }
      }
    });

    // Generous, fair spacing between obstacle waves: 520 to 740 units!
    const minSpacing = 520 + (this.speed / CONFIG.MAX_SPEED) * 200;
    this.nextSpawnZ = spawnZ + minSpacing + Math.random() * 80;
  }

  // ==========================================================================
  // UPDATE LOOP & PHYSICS
  // ==========================================================================
  update(dt) {
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
    }

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    this.particles.update(dt);

    // Update ambient clouds & flying cars
    this.clouds.forEach(c => {
      c.x += c.speed * dt;
      if (c.x > this.V_WIDTH + 80) c.x = -c.w - 40;
    });

    this.flyingCars.forEach(car => {
      car.x += car.speed * dt;
      if (car.speed > 0 && car.x > this.V_WIDTH + 80) car.x = -80;
      if (car.speed < 0 && car.x < -80) car.x = this.V_WIDTH + 80;
    });

    if (this.state !== 'playing') {
      this.player.runCycle += dt * 4;
      return;
    }

    // Update active power-up timers
    if (this.activePowerups.magnet > 0) {
      this.activePowerups.magnet -= dt;
      if (this.activePowerups.magnet <= 0) this.activePowerups.magnet = 0;
    }
    if (this.activePowerups.boost > 0) {
      this.activePowerups.boost -= dt;
      if (this.activePowerups.boost <= 0) this.activePowerups.boost = 0;
    }

    // Determine current speed (boost applies 1.5x multiplier)
    const baseSpeed = calculateSpeed(this.distance);
    this.speed = this.activePowerups.boost > 0 ? baseSpeed * 1.48 : baseSpeed;

    const stepDist = this.speed * dt;
    this.distance += stepDist * 0.05; // 1 unit = 0.05 meters
    this.score = calculateScore(this.distance, this.runCoins);
    this.roadGridOffset = (this.roadGridOffset + stepDist) % 60;

    // Smooth lane transition (Lerp)
    const targetX = getLaneX(this.player.targetLane, this.V_WIDTH * 0.5, CONFIG.LANE_SPACING);
    this.player.x += (targetX - this.player.x) * Math.min(1, 16 * dt);
    this.player.tilt *= Math.max(0, 1 - 9 * dt);

    // Player Jump Physics
    if (this.player.isJumping) {
      this.player.jumpY += this.player.vy * dt;
      this.player.vy -= 1350 * dt; // gravity

      if (this.player.jumpY <= 0) {
        this.player.jumpY = 0;
        this.player.vy = 0;
        this.player.isJumping = false;
        this.particles.sparks(this.player.x, this.roadBottomY - 5, 6, '#00f3ff');
      }
    }

    // Player Slide Physics
    if (this.player.isSliding) {
      this.player.slideTimer -= dt;
      if (this.player.slideTimer <= 0) {
        this.player.isSliding = false;
      } else {
        if (Math.random() > 0.3) {
          this.particles.sparks(this.player.x, this.roadBottomY - 10, 3, '#ffb800');
        }
      }
    }

    this.player.runCycle += dt * (this.speed / 34);

    // Thruster / Speed trail particles behind runner
    if (this.activePowerups.boost > 0 || Math.random() > 0.28) {
      const trailY = this.roadBottomY - this.player.jumpY - (this.player.isSliding ? 14 : 32);
      const color = this.activePowerups.boost > 0 ? '#ffb800' : '#00f3ff';
      this.particles.spawn(
        this.player.x + (Math.random() - 0.5) * 14,
        trailY,
        (Math.random() - 0.5) * 35,
        40 + Math.random() * 50,
        0.28,
        3.2,
        color
      );
    }

    // Advance spawn distance
    this.nextSpawnZ -= stepDist;
    if (this.nextSpawnZ <= 920) {
      this.spawnWave();
    }

    // Move and test obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.z -= stepDist;

      // Check collision
      if (this.invulnerableTimer <= 0 && checkCollision(this.player, obs)) {
        if (this.activePowerups.boost > 0) {
          // Boost smashes obstacle!
          this.obstacles.splice(i, 1);
          this.particles.burst(this.player.x, this.roadBottomY - 30, 16, '#ffb800', 180);
          this.score += 150;
          this.shakeCamera(0.2, 5);
          continue;
        }

        if (this.activePowerups.shield) {
          // Shield absorbs impact!
          this.activePowerups.shield = false;
          this.invulnerableTimer = 1.2;
          this.hitstopTimer = 0.05;
          this.audio.playShieldBreak();
          this.shakeCamera(0.25, 7);
          this.particles.burst(this.player.x, this.roadBottomY - 40, 20, '#00ff88', 200);
          this.obstacles.splice(i, 1);
          continue;
        }

        // Fatal crash
        this.triggerCrash();
        return;
      }

      if (obs.z < this.player.z - 70) {
        this.obstacles.splice(i, 1);
      }
    }

    // Move, attract, and test coins
    for (let i = this.coinsList.length - 1; i >= 0; i--) {
      const coin = this.coinsList[i];
      coin.z -= stepDist;

      // Magnet attraction
      if (this.activePowerups.magnet > 0) {
        const dz = coin.z - this.player.z;
        if (dz > -20 && dz < 260) {
          attractCoinTowardPlayer(coin, this.player, dt, 720);
        }
      }

      // Check pickup
      if (checkCoinPickup(this.player, coin)) {
        coin.collected = true;
        this.runCoins++;
        this.coins++;
        this.audio.playCoin();
        const p = this.project(coin.x, coin.z);
        this.particles.burst(p.x, p.y - 15 * p.scale, 8, '#ffb800', 110);
        this.coinsList.splice(i, 1);
        continue;
      }

      if (coin.z < this.player.z - 50) {
        this.coinsList.splice(i, 1);
      }
    }

    // Move and test power-ups
    for (let i = this.powerupsList.length - 1; i >= 0; i--) {
      const pu = this.powerupsList[i];
      pu.z -= stepDist;

      if (checkPowerupPickup(this.player, pu)) {
        pu.collected = true;
        this.audio.playPowerup();
        const p = this.project(pu.x, pu.z);
        this.particles.burst(p.x, p.y - 20 * p.scale, 16, '#00ff88', 160);

        if (pu.type === POWERUP_TYPES.MAGNET) {
          this.activePowerups.magnet = 8.5; // 8.5s magnet
        } else if (pu.type === POWERUP_TYPES.SHIELD) {
          this.activePowerups.shield = true;
        } else if (pu.type === POWERUP_TYPES.BOOST) {
          this.activePowerups.boost = 4.0; // 4s boost dash
        }

        this.powerupsList.splice(i, 1);
        continue;
      }

      if (pu.z < this.player.z - 50) {
        this.powerupsList.splice(i, 1);
      }
    }

    this.updateHUD();
  }

  shakeCamera(duration = 0.35, intensity = 8) {
    this.shakeDuration = duration;
    this.shakeIntensity = intensity;
  }

  triggerCrash() {
    this.hitstopTimer = 0.08;
    this.shakeCamera(0.45, 12);
    this.audio.playCrash();
    this.particles.burst(this.player.x, this.roadBottomY - 40, 24, '#ff0044', 220);
    this.setState('gameover');
  }

  updateHUD() {
    this.hudScore.textContent = this.score.toLocaleString();
    this.hudCoins.textContent = this.runCoins.toString();
    this.hudDistance.textContent = `${Math.floor(this.distance)}m`;
    this.hudBestChip.textContent = Math.max(this.score, this.storage.bestScore).toLocaleString();

    const spdFactor = (this.speed / CONFIG.BASE_SPEED).toFixed(1);
    this.hudSpeedVal.textContent = `${spdFactor}x`;

    // Power-up indicators
    if (this.activePowerups.magnet > 0) {
      this.puMagnet.style.display = 'flex';
      const pct = (this.activePowerups.magnet / 8.5) * 100;
      this.meterMagnet.style.width = `${pct}%`;
    } else {
      this.puMagnet.style.display = 'none';
    }

    if (this.activePowerups.shield) {
      this.puShield.style.display = 'flex';
      this.meterShield.style.width = '100%';
    } else {
      this.puShield.style.display = 'none';
    }

    if (this.activePowerups.boost > 0) {
      this.puBoost.style.display = 'flex';
      const pct = (this.activePowerups.boost / 4.0) * 100;
      this.meterBoost.style.width = `${pct}%`;
    } else {
      this.puBoost.style.display = 'none';
    }
  }

  // ==========================================================================
  // 3D PERSPECTIVE PROJECTION
  // ==========================================================================
  project(worldX, worldZ) {
    const relZ = Math.max(1, worldZ - this.player.z);
    const maxZ = 850;
    const normZ = Math.min(1, relZ / maxZ);

    const persp = 1 / (1 + relZ / this.cameraDepth);
    const y = this.horizonY + (this.roadBottomY - this.horizonY) * Math.pow(1 - normZ, 1.4);
    const roadWidthAtZ = this.roadTopWidth + (this.roadBottomWidth - this.roadTopWidth) * Math.pow(1 - normZ, 1.4);

    const laneOffsetFromCenter = (worldX - this.V_WIDTH * 0.5) / (this.roadBottomWidth * 0.5);
    const x = this.V_WIDTH * 0.5 + laneOffsetFromCenter * (roadWidthAtZ * 0.5);

    return {
      x,
      y,
      scale: Math.max(0.08, Math.min(1.0, persp * 1.55)),
      roadWidthAtZ,
      normZ
    };
  }

  // ==========================================================================
  // RENDERING ENGINE (Atmosphere, Railway, Obstacles, Runner, FX)
  // ==========================================================================
  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.scaleX, this.scaleY);

    // Camera Shake
    if (this.shakeDuration > 0) {
      const decay = this.shakeDuration / 0.45;
      const ox = (Math.random() - 0.5) * this.shakeIntensity * decay;
      const oy = (Math.random() - 0.5) * this.shakeIntensity * decay;
      ctx.translate(ox, oy);
    }

    // 1. Atmosphere: Sky, Clouds, Horizon Sun, City Buildings, Hovercars
    this.renderAtmosphere(ctx);

    // 2. Railway Track: Rails, Sleepers, Ballast, Bridges, Signals
    this.renderRailwayTracks(ctx);

    // 3. Dynamic Entities: Trains, Hurdles, Gantries, Powerups, Coins
    this.renderEntities(ctx);

    // 4. Hero Player: Cartoon 3D Runner (Hoodie, Backpack, Sneakers)
    this.renderPlayer(ctx);

    // 5. Particles: Sparks, FX, Boost fire
    this.particles.render(ctx);

    ctx.restore();
  }

  renderAtmosphere(ctx) {
    // Rich twilight / sunset sky gradient with vibrant electric hues
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.horizonY);
    skyGrad.addColorStop(0, '#040612');
    skyGrad.addColorStop(0.4, '#0d1330');
    skyGrad.addColorStop(0.75, '#1e1b4b');
    skyGrad.addColorStop(1, '#3b0764');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.V_WIDTH, this.horizonY);

    // Clouds
    this.clouds.forEach(c => {
      ctx.save();
      ctx.fillStyle = `rgba(168, 85, 247, ${c.opacity})`;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.w * 0.5, c.h * 0.5, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x + c.w * 0.25, c.y - c.h * 0.2, c.w * 0.35, c.h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Synthwave Sun / Distant Radiant Core at Horizon
    const sunRadius = 68;
    const sunGrad = ctx.createRadialGradient(
      this.V_WIDTH * 0.5,
      this.horizonY - 10,
      10,
      this.V_WIDTH * 0.5,
      this.horizonY - 10,
      sunRadius
    );
    sunGrad.addColorStop(0, 'rgba(255, 220, 100, 0.95)');
    sunGrad.addColorStop(0.45, 'rgba(255, 0, 128, 0.85)');
    sunGrad.addColorStop(1, 'rgba(255, 0, 128, 0)');

    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(this.V_WIDTH * 0.5, this.horizonY - 10, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    // Horizontal Sun Segment Lines
    ctx.fillStyle = '#0f172a';
    for (let s = -sunRadius + 14; s < sunRadius; s += 8) {
      const lineY = this.horizonY - 10 + s;
      if (lineY < this.horizonY && lineY > this.horizonY - 10) {
        ctx.fillRect(this.V_WIDTH * 0.5 - sunRadius, lineY, sunRadius * 2, 2.5);
      }
    }

    // Distant City Skyscrapers with Glowing Windows
    this.cityBuildings.forEach(b => {
      const by = this.horizonY - b.h;
      ctx.fillStyle = '#070b1a';
      ctx.fillRect(b.x, by, b.w, b.h);

      // Building top neon rim
      ctx.fillStyle = b.hue;
      ctx.fillRect(b.x, by, b.w, 2);

      // Illuminated Windows
      ctx.fillStyle = b.hue;
      ctx.globalAlpha = 0.5;
      for (let r = 0; r < b.windows; r++) {
        for (let c = 0; c < 2; c++) {
          ctx.fillRect(b.x + 4 + c * (b.w - 12), by + 10 + r * 16, 4, 6);
        }
      }
      ctx.globalAlpha = 1.0;

      // Hologram Sign
      if (b.billboard) {
        ctx.fillStyle = b.hue;
        ctx.font = '900 9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(b.billboard, b.x + b.w * 0.5, by + 18);
      }
    });

    // Flying Hovercars
    this.flyingCars.forEach(car => {
      ctx.save();
      ctx.fillStyle = car.color;
      ctx.shadowColor = car.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(car.x, car.y, car.len, 2.5);

      const trail = ctx.createLinearGradient(car.x - (car.speed > 0 ? 30 : -30), car.y, car.x, car.y);
      trail.addColorStop(0, 'rgba(0, 243, 255, 0)');
      trail.addColorStop(1, car.color);
      ctx.fillStyle = trail;
      ctx.fillRect(car.x - (car.speed > 0 ? 30 : -car.len), car.y, 30, 2);
      ctx.restore();
    });

    // Horizon Atmospheric Fog
    const fogGrad = ctx.createLinearGradient(0, this.horizonY - 6, 0, this.horizonY + 20);
    fogGrad.addColorStop(0, 'rgba(59, 7, 100, 0)');
    fogGrad.addColorStop(0.5, 'rgba(255, 0, 128, 0.45)');
    fogGrad.addColorStop(1, 'rgba(10, 14, 30, 0.95)');
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, this.horizonY - 6, this.V_WIDTH, 26);
  }

  renderRailwayTracks(ctx) {
    const topLeftX = this.V_WIDTH * 0.5 - this.roadTopWidth * 0.5;
    const topRightX = this.V_WIDTH * 0.5 + this.roadTopWidth * 0.5;
    const bottomLeftX = this.V_WIDTH * 0.5 - this.roadBottomWidth * 0.5;
    const bottomRightX = this.V_WIDTH * 0.5 + this.roadBottomWidth * 0.5;

    // 1. Ballast Gravel Track Bed
    const ballastGrad = ctx.createLinearGradient(0, this.horizonY, 0, this.roadBottomY);
    ballastGrad.addColorStop(0, '#060a17');
    ballastGrad.addColorStop(0.5, '#0b1126');
    ballastGrad.addColorStop(1, '#111836');

    ctx.fillStyle = ballastGrad;
    ctx.beginPath();
    ctx.moveTo(topLeftX, this.horizonY);
    ctx.lineTo(topRightX, this.horizonY);
    ctx.lineTo(bottomRightX, this.roadBottomY + 70);
    ctx.lineTo(bottomLeftX, this.roadBottomY + 70);
    ctx.closePath();
    ctx.fill();

    // 2. Railway Sleepers (Ties) spaced in perspective
    const sleeperCount = 18;
    for (let i = 0; i < sleeperCount; i++) {
      const z = (i * 48 - this.roadGridOffset + 850) % 850;
      const proj = this.project(this.V_WIDTH * 0.5, this.player.z + z);
      const halfW = proj.roadWidthAtZ * 0.48;
      const sleeperH = Math.max(2, 6 * proj.scale);

      // Wooden / Concrete Sleeper
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(proj.x - halfW, proj.y - sleeperH * 0.5, halfW * 2, sleeperH);

      // Sleeper top highlight
      ctx.fillStyle = '#334155';
      ctx.fillRect(proj.x - halfW, proj.y - sleeperH * 0.5, halfW * 2, Math.max(1, sleeperH * 0.35));
    }

    // 3. Three Pairs of Steel Railway Rails (One pair for each lane)
    const laneCenters = [
      -CONFIG.LANE_SPACING, // Left lane
      0,                    // Center lane
      CONFIG.LANE_SPACING   // Right lane
    ];

    const railGauge = 34; // Gauge width between two steel rails of a lane

    laneCenters.forEach((laneXOff, idx) => {
      const leftRailX = this.V_WIDTH * 0.5 + laneXOff - railGauge * 0.5;
      const rightRailX = this.V_WIDTH * 0.5 + laneXOff + railGauge * 0.5;

      const pTopL = this.project(leftRailX, this.player.z + 850);
      const pBotL = this.project(leftRailX, this.player.z);
      const pTopR = this.project(rightRailX, this.player.z + 850);
      const pBotR = this.project(rightRailX, this.player.z);

      // Base Rail Shadow
      ctx.strokeStyle = '#090d1f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(pTopL.x, pTopL.y);
      ctx.lineTo(pBotL.x, pBotL.y + 70);
      ctx.moveTo(pTopR.x, pTopR.y);
      ctx.lineTo(pBotR.x, pBotR.y + 70);
      ctx.stroke();

      // Polished Steel Specular Rail Head
      const railColor = idx === 0 ? '#00f3ff' : (idx === 1 ? '#e2e8f0' : '#ff007f');
      ctx.strokeStyle = railColor;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(pTopL.x, pTopL.y);
      ctx.lineTo(pBotL.x, pBotL.y + 70);
      ctx.moveTo(pTopR.x, pTopR.y);
      ctx.lineTo(pBotR.x, pBotR.y + 70);
      ctx.stroke();
    });

    // 4. Side Guardrails & Fences
    ctx.lineWidth = 3;
    // Left Barrier (Cyan Glow)
    ctx.strokeStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(topLeftX, this.horizonY);
    ctx.lineTo(bottomLeftX, this.roadBottomY + 70);
    ctx.stroke();

    // Right Barrier (Magenta Glow)
    ctx.strokeStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(topRightX, this.horizonY);
    ctx.lineTo(bottomRightX, this.roadBottomY + 70);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 5. Catenary Poles (Railway overhead power masts)
    const poleCount = 6;
    for (let p = 0; p < poleCount; p++) {
      const pZ = (p * 140 - this.roadGridOffset + 850) % 850;
      const leftP = this.project(this.V_WIDTH * 0.5 - CONFIG.LANE_SPACING * 1.6, this.player.z + pZ);
      const rightP = this.project(this.V_WIDTH * 0.5 + CONFIG.LANE_SPACING * 1.6, this.player.z + pZ);
      const scale = leftP.scale;
      const poleH = 65 * scale;
      const poleW = 6 * scale;

      // Left Catenary Pole
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(leftP.x - poleW * 0.5, leftP.y - poleH, poleW, poleH);
      // Mast arm
      ctx.fillRect(leftP.x, leftP.y - poleH, 18 * scale, 3 * scale);
      // Signal beacon
      ctx.fillStyle = '#00f3ff';
      ctx.fillRect(leftP.x + 16 * scale, leftP.y - poleH - 2 * scale, 4 * scale, 4 * scale);

      // Right Catenary Pole
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(rightP.x - poleW * 0.5, rightP.y - poleH, poleW, poleH);
      ctx.fillRect(rightP.x - 18 * scale, rightP.y - poleH, 18 * scale, 3 * scale);
      ctx.fillStyle = '#ff007f';
      ctx.fillRect(rightP.x - 20 * scale, rightP.y - poleH - 2 * scale, 4 * scale, 4 * scale);
    }

    // 6. Overhead Bridges & Tunnel Arches passing overhead
    const archCount = 2;
    for (let a = 0; a < archCount; a++) {
      const aZ = (a * 440 - this.roadGridOffset + 850) % 850;
      const proj = this.project(this.V_WIDTH * 0.5, this.player.z + aZ);
      const s = proj.scale;
      if (s > 0.28) {
        const spanW = proj.roadWidthAtZ * 1.15;
        const archH = 80 * s;

        // Concrete Bridge Arch Pillars
        ctx.fillStyle = '#0b1226';
        ctx.fillRect(proj.x - spanW * 0.5, proj.y - archH, 10 * s, archH);
        ctx.fillRect(proj.x + spanW * 0.5 - 10 * s, proj.y - archH, 10 * s, archH);

        // Overhead Bridge Span Crossbar
        ctx.fillStyle = '#151e3a';
        ctx.fillRect(proj.x - spanW * 0.5, proj.y - archH, spanW, 14 * s);

        // Illuminated Neon Gantry Sign
        ctx.fillStyle = '#00f3ff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 8 * s;
        ctx.fillRect(proj.x - spanW * 0.35, proj.y - archH + 3 * s, spanW * 0.7, 4 * s);
        ctx.shadowBlur = 0;
      }
    }
  }

  renderEntities(ctx) {
    // Sort all obstacles, coins, and powerups by distance Z descending (draw farthest first)
    const entities = [
      ...this.obstacles.map(o => ({ ...o, kind: 'obstacle' })),
      ...this.coinsList.map(c => ({ ...c, kind: 'coin' })),
      ...this.powerupsList.map(p => ({ ...p, kind: 'powerup' }))
    ];

    entities.sort((a, b) => b.z - a.z);

    entities.forEach(ent => {
      if (ent.kind === 'obstacle') {
        this.renderObstacle(ctx, ent);
      } else if (ent.kind === 'coin') {
        this.renderCoin(ctx, ent);
      } else if (ent.kind === 'powerup') {
        this.renderPowerup(ctx, ent);
      }
    });
  }

  renderObstacle(ctx, obs) {
    const proj = this.project(obs.x, obs.z);
    const scale = proj.scale;
    if (scale <= 0.08) return;

    ctx.save();
    ctx.translate(proj.x, proj.y);

    switch (obs.type) {
      case OBSTACLE_TYPES.TRAIN: {
        // ====================================================================
        // SUBWAY / RAILWAY TRAIN CAR (Solid Obstacle: Must Dodge!)
        // ====================================================================
        const trainW = 76 * scale;
        const trainH = 110 * scale;

        // Drop shadow onto tracks
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.beginPath();
        ctx.ellipse(0, 2, trainW * 0.55, 12 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Train Car Body (Front Face)
        const bodyGrad = ctx.createLinearGradient(-trainW * 0.5, -trainH, trainW * 0.5, 0);
        bodyGrad.addColorStop(0, '#1e293b');
        bodyGrad.addColorStop(0.5, '#0f172a');
        bodyGrad.addColorStop(1, '#090d1a');

        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.roundRect(-trainW * 0.5, -trainH, trainW, trainH, 10 * scale);
        ctx.fill();

        // Train Front Cab Windshield (Tinted Cyan Glass)
        ctx.fillStyle = '#00f3ff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 12 * scale;
        ctx.beginPath();
        ctx.roundRect(-trainW * 0.4, -trainH + 16 * scale, trainW * 0.8, 32 * scale, 6 * scale);
        ctx.fill();

        // Windshield glare reflection
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.fillRect(-trainW * 0.35, -trainH + 20 * scale, trainW * 0.4, 4 * scale);

        // Twin Front Train Headlights (High-intensity beams)
        ctx.fillStyle = '#ffb800';
        ctx.shadowColor = '#ffb800';
        ctx.shadowBlur = 16 * scale;
        ctx.beginPath();
        ctx.arc(-trainW * 0.3, -24 * scale, 7 * scale, 0, Math.PI * 2);
        ctx.arc(trainW * 0.3, -24 * scale, 7 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Train Cowcatcher / Fender Grill (Hazard Stripes)
        ctx.fillStyle = '#ff0044';
        ctx.fillRect(-trainW * 0.45, -12 * scale, trainW * 0.9, 10 * scale);
        ctx.fillStyle = '#ffffff';
        for (let s = -trainW * 0.4; s < trainW * 0.4; s += 12 * scale) {
          ctx.fillRect(s, -12 * scale, 4 * scale, 10 * scale);
        }

        ctx.shadowBlur = 0;
        break;
      }

      case OBSTACLE_TYPES.BARRIER:
      case OBSTACLE_TYPES.HURDLE: {
        // ====================================================================
        // RAILWAY HURDLE / BARRIER GATE (Must Jump Over!)
        // ====================================================================
        const barrierW = 82 * scale;
        const barrierH = 38 * scale;

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.beginPath();
        ctx.ellipse(0, 2, barrierW * 0.52, 6 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Side Support Legs
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-barrierW * 0.5, -barrierH, 8 * scale, barrierH);
        ctx.fillRect(barrierW * 0.5 - 8 * scale, -barrierH, 8 * scale, barrierH);

        // Crossbeam with Red/White or Yellow/Black Hazard Stripes
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(-barrierW * 0.5, -barrierH + 6 * scale, barrierW, 16 * scale);

        ctx.fillStyle = '#ffffff';
        for (let s = -barrierW * 0.5; s < barrierW * 0.5; s += 16 * scale) {
          ctx.beginPath();
          ctx.moveTo(s, -barrierH + 6 * scale);
          ctx.lineTo(s + 8 * scale, -barrierH + 6 * scale);
          ctx.lineTo(s + 4 * scale, -barrierH + 22 * scale);
          ctx.lineTo(s - 4 * scale, -barrierH + 22 * scale);
          ctx.closePath();
          ctx.fill();
        }

        // Flashing Warning Light on top
        ctx.fillStyle = '#00f3ff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 10 * scale;
        ctx.beginPath();
        ctx.arc(0, -barrierH - 2 * scale, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
      }

      case OBSTACLE_TYPES.OVERHEAD:
      case OBSTACLE_TYPES.LASER: {
        // ====================================================================
        // LOW TUNNEL / BRIDGE GANTRY / LASER (Must Slide / Roll Under!)
        // ====================================================================
        const beamW = 86 * scale;
        const totalH = 78 * scale;
        const clearanceH = 36 * scale; // Area open underneath to slide

        // Tall side support pillars
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-beamW * 0.5, -totalH, 8 * scale, totalH);
        ctx.fillRect(beamW * 0.5 - 8 * scale, -totalH, 8 * scale, totalH);

        // Low Overhead Horizontal Crossbar
        ctx.fillStyle = '#090d1a';
        ctx.fillRect(-beamW * 0.5, -totalH, beamW, totalH - clearanceH);

        // Glowing Low Plasma Conduit / Warning Strip
        ctx.fillStyle = '#00f3ff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 14 * scale;
        ctx.fillRect(-beamW * 0.5, -clearanceH - 6 * scale, beamW, 7 * scale);
        ctx.shadowBlur = 0;

        // Slide arrow label
        if (scale > 0.38) {
          ctx.fillStyle = '#00f3ff';
          ctx.font = `900 ${Math.round(11 * scale)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('▼ SLIDE', 0, -clearanceH - 12 * scale);
        }
        break;
      }

      case OBSTACLE_TYPES.CRATE:
      case OBSTACLE_TYPES.PILLAR:
      default: {
        // ====================================================================
        // RAILWAY CARGO CRATE / SOLID MONOLITH (Must Dodge!)
        // ====================================================================
        const crateW = 66 * scale;
        const crateH = 64 * scale;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.ellipse(0, 2, crateW * 0.52, 8 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Crate Body (Industrial Wood / Metal Container)
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-crateW * 0.5, -crateH, crateW, crateH);

        // Corner Steel Brackets & Cross Bracing
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3 * scale;
        ctx.strokeRect(-crateW * 0.5, -crateH, crateW, crateH);

        ctx.beginPath();
        ctx.moveTo(-crateW * 0.5, -crateH);
        ctx.lineTo(crateW * 0.5, 0);
        ctx.moveTo(crateW * 0.5, -crateH);
        ctx.lineTo(-crateW * 0.5, 0);
        ctx.stroke();

        // Neon warning tag
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8 * scale;
        ctx.beginPath();
        ctx.arc(0, -crateH * 0.5, 5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
      }
    }

    ctx.restore();
  }

  renderCoin(ctx, coin) {
    const proj = this.project(coin.x, coin.z);
    const scale = proj.scale;
    if (scale <= 0.08) return;

    ctx.save();
    const coinY = proj.y - (coin.jumpY || 0) * scale;
    ctx.translate(proj.x, coinY);

    // Dynamic 3D spinning rotation
    const spin = performance.now() * 0.005 + coin.x * 0.1;
    const spinWidth = Math.cos(spin);
    const r = 16 * scale;

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(0, (coin.jumpY || 0) * scale + 2, r * Math.abs(spinWidth), 4 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Floating bob
    const bob = Math.sin(performance.now() * 0.008 + coin.z * 0.1) * 3 * scale;
    ctx.translate(0, -20 * scale + bob);

    // Glowing Gold Coin Disc
    ctx.fillStyle = '#ffb800';
    ctx.shadowColor = '#ffb800';
    ctx.shadowBlur = 12 * scale;
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(1, r * Math.abs(spinWidth)), r, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner Specular Rim
    if (Math.abs(spinWidth) > 0.35) {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.65 * Math.abs(spinWidth), r * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();

      // Coin Star Motif
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(0, 0, 3 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  renderPowerup(ctx, pu) {
    const proj = this.project(pu.x, pu.z);
    const scale = proj.scale;
    if (scale <= 0.08) return;

    ctx.save();
    const puY = proj.y - (pu.jumpY || 18) * scale;
    ctx.translate(proj.x, puY);

    const bob = Math.sin(performance.now() * 0.006) * 4 * scale;
    ctx.translate(0, -22 * scale + bob);

    const size = 22 * scale;

    // Luminous Powerup Orb
    let color = '#00f3ff';
    let icon = '🧲';
    if (pu.type === POWERUP_TYPES.SHIELD) {
      color = '#00ff88';
      icon = '🛡️';
    } else if (pu.type === POWERUP_TYPES.BOOST) {
      color = '#ffb800';
      icon = '⚡';
    }

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18 * scale;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();

    // Inner White Core
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Icon glyph
    ctx.shadowBlur = 0;
    ctx.font = `${Math.round(16 * scale)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 0, 0);

    ctx.restore();
  }

  // ==========================================================================
  // CARTOON 3D RUNNER (Hoodie, Backpack, Trousers, Sneakers)
  // ==========================================================================
  renderPlayer(ctx) {
    const px = this.player.x;
    const py = this.roadBottomY - this.player.jumpY;
    const isSliding = this.player.isSliding;

    ctx.save();
    ctx.translate(px, py);

    // Lean into turns
    ctx.rotate(this.player.tilt);

    // Invulnerability Blink Effect
    if (this.invulnerableTimer > 0 && Math.floor(performance.now() / 80) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // Dynamic Ground Shadow (projects directly onto railway tracks)
    const shadowScale = Math.max(0.3, 1 - this.player.jumpY / 180);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 30 * shadowScale, 9 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // SHIELD BUBBLE (When Shield Power-Up is Active)
    if (this.activePowerups.shield) {
      ctx.save();
      const shieldPulse = Math.sin(performance.now() * 0.008) * 3;
      ctx.strokeStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 20;
      ctx.lineWidth = 3.5;
      ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
      ctx.beginPath();
      ctx.arc(0, isSliding ? -18 : -50, (isSliding ? 34 : 52) + shieldPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // BOOST DASH FIRE TRAILS (When Boost is Active)
    if (this.activePowerups.boost > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 184, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, -45, 36, 56, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (isSliding) {
      // ======================================================================
      // PARKOUR ROLL / SLIDING RUNNER (Low clearance under barriers)
      // ======================================================================
      const slideRoll = (1 - this.player.slideTimer / 0.65) * Math.PI * 2;

      ctx.save();
      ctx.translate(0, -18);
      ctx.rotate(slideRoll * 0.3);

      // Hoodie Body (Tucked into low roll)
      ctx.fillStyle = '#00f3ff';
      ctx.beginPath();
      ctx.roundRect(-24, -14, 48, 26, 12);
      ctx.fill();

      // Streetwear Backpack tucked tight
      ctx.fillStyle = '#ff007f';
      ctx.beginPath();
      ctx.roundRect(-22, -18, 16, 16, 6);
      ctx.fill();

      // Jogger Legs tucked back
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-28, -6, 20, 14, 6);
      ctx.fill();

      // Chunky Sneaker
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-32, -4, 12, 8);
      ctx.fillStyle = '#ffb800';
      ctx.fillRect(-32, -1, 12, 3);

      // Head / Hood
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(14, -4, 12, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Visor / Goggles
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = '#fef08a';
      ctx.shadowBlur = 10;
      ctx.fillRect(16, -6, 8, 5);
      ctx.shadowBlur = 0;

      ctx.restore();
    } else {
      // ======================================================================
      // CARTOON 3D RUNNER (Rear Perspective: Hoodie, Backpack, Joggers, Sneakers)
      // ======================================================================
      const runCycle = this.player.runCycle;
      const bob = Math.sin(runCycle * 2) * 3.5;

      const leftLegAngle = Math.sin(runCycle) * 0.65;
      const rightLegAngle = -Math.sin(runCycle) * 0.65;
      const leftArmAngle = -Math.sin(runCycle) * 0.75;
      const rightArmAngle = Math.sin(runCycle) * 0.75;

      // 1. Jogger Legs & Chunky Sneakers
      if (this.player.isJumping) {
        // Athletic Jump: Knees tucked upward, sneakers pointing downward
        ctx.fillStyle = '#1e293b';
        // Left Leg
        ctx.save();
        ctx.translate(-10, -32);
        ctx.rotate(-0.35);
        ctx.fillRect(-5, 0, 10, 22);
        // Chunky Sneaker with Sole
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(-6, 20, 14, 10, 4);
        ctx.fill();
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(-6, 26, 14, 4);
        ctx.restore();

        // Right Leg
        ctx.fillStyle = '#1e293b';
        ctx.save();
        ctx.translate(10, -32);
        ctx.rotate(0.35);
        ctx.fillRect(-5, 0, 10, 22);
        // Sneaker
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(-8, 20, 14, 10, 4);
        ctx.fill();
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(-8, 26, 14, 4);
        ctx.restore();
      } else {
        // Full Running Stride (Alternating legs with articulated knees and sneakers)
        // Left Leg
        ctx.save();
        ctx.translate(-8, -32 + bob);
        ctx.rotate(leftLegAngle);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-5, 0, 10, 26);
        // Sneaker (sole kicks up on back-stride)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(-6, 24, 14, 9, 3);
        ctx.fill();
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(-6, 29, 14, 4);
        ctx.restore();

        // Right Leg
        ctx.save();
        ctx.translate(8, -32 + bob);
        ctx.rotate(rightLegAngle);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-5, 0, 10, 26);
        // Sneaker
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(-8, 24, 14, 9, 3);
        ctx.fill();
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(-8, 29, 14, 4);
        ctx.restore();
      }

      // 2. Arms (Swing behind/forward at sides)
      if (this.player.isJumping) {
        // Arms spread for aerial balance
        ctx.fillStyle = '#06b6d4';
        ctx.save();
        ctx.translate(-19, -60 + bob);
        ctx.rotate(-0.85);
        ctx.fillRect(-4, 0, 9, 24);
        ctx.fillStyle = '#ffedd5';
        ctx.beginPath();
        ctx.arc(0, 25, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#06b6d4';
        ctx.save();
        ctx.translate(19, -60 + bob);
        ctx.rotate(0.85);
        ctx.fillRect(-5, 0, 9, 24);
        ctx.fillStyle = '#ffedd5';
        ctx.beginPath();
        ctx.arc(0, 25, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Left Arm swinging naturally
        ctx.save();
        ctx.translate(-19, -60 + bob);
        ctx.rotate(leftArmAngle);
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(-4, 0, 8, 22);
        ctx.fillStyle = '#ffedd5';
        ctx.beginPath();
        ctx.arc(0, 23, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Right Arm swinging opposite
        ctx.save();
        ctx.translate(19, -60 + bob);
        ctx.rotate(rightArmAngle);
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(-4, 0, 8, 22);
        ctx.fillStyle = '#ffedd5';
        ctx.beginPath();
        ctx.arc(0, 23, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 3. Torso: Vibrant Electric Cyan Hoodie (Back View)
      ctx.fillStyle = '#00f3ff';
      ctx.beginPath();
      ctx.roundRect(-19, -68 + bob, 38, 38, 9);
      ctx.fill();

      // Hoodie Shoulder Seams
      ctx.strokeStyle = '#0891b2';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-16, -64 + bob);
      ctx.lineTo(-8, -68 + bob);
      ctx.moveTo(16, -64 + bob);
      ctx.lineTo(8, -68 + bob);
      ctx.stroke();

      // 4. Streetwear Cyber Backpack (Prominently worn ON TOP of hoodie back!)
      ctx.fillStyle = '#ff007f';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(-14, -65 + bob, 28, 26, 8);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Backpack Zip Pocket & Flap
      ctx.fillStyle = '#9d174d';
      ctx.beginPath();
      ctx.roundRect(-10, -56 + bob, 20, 14, 5);
      ctx.fill();

      // Glowing Neon Energy Battery Core on Backpack
      ctx.fillStyle = '#ffb800';
      ctx.shadowColor = '#ffb800';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, -49 + bob, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Shoulder Straps holding the backpack
      ctx.fillStyle = '#4c0519';
      ctx.fillRect(-14, -68 + bob, 4, 12);
      ctx.fillRect(10, -68 + bob, 4, 12);

      // 5. Head & Streetwear Hood (Back of head with hood pulled up)
      ctx.fillStyle = '#0891b2';
      ctx.beginPath();
      ctx.arc(0, -82 + bob, 15, 0, Math.PI * 2);
      ctx.fill();

      // Center Hood Seam
      ctx.strokeStyle = '#0e7490';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -97 + bob);
      ctx.lineTo(0, -70 + bob);
      ctx.stroke();

      // Neon Headphones / Collar resting around neck
      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, -74 + bob, 14, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  // ==========================================================================
  // MAIN GAME TICK
  // ==========================================================================
  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const rawDt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    const dt = Math.min(rawDt, 0.05);

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }
}

// Bootstrap on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  new NeonDashGame();
});
