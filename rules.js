/**
 * NEON DASH - Pure Game Logic & Collision Rules
 * Decoupled from DOM/Canvas for deterministic unit testing.
 */

export const LANES = {
  LEFT: -1,
  CENTER: 0,
  RIGHT: 1
};

export const OBSTACLE_TYPES = {
  HURDLE: 'hurdle',       // Low barrier: Must jump over
  BARRIER: 'barrier',     // Railway construction hurdle: Must jump over
  LASER: 'laser',         // High laser beam / overhead beam: Must slide under
  OVERHEAD: 'overhead',   // Low tunnel / bridge gantry: Must slide under
  PILLAR: 'pillar',       // Full height pillar: Must switch lanes
  DRONE: 'drone',         // Mid-height floating hazard: Must switch lanes
  TRAIN: 'train',         // Subway / railway car: Solid, must switch lanes
  CRATE: 'crate'          // Solid railway cargo crate: Must switch lanes
};

export const POWERUP_TYPES = {
  MAGNET: 'magnet',       // Attracts nearby coins across all lanes
  SHIELD: 'shield',       // Protects against 1 collision impact
  BOOST: 'boost',         // Invincible super-speed dash
  DOUBLE: 'double'        // 2x Double Coins reward multiplier
};

/**
 * Calculates current combo multiplier from consecutive coin collection count.
 * @param {number} count - Consecutive coins collected
 * @returns {number} Multiplier (1, 2, 3, 5, or 10)
 */
export function getComboMultiplier(count = 0) {
  if (count >= 25) return 10;
  if (count >= 15) return 5;
  if (count >= 8) return 3;
  if (count >= 3) return 2;
  return 1;
}

/**
 * Calculates coin reward based on active power-ups.
 * @param {number} baseCoins
 * @param {boolean} isDoubleActive
 * @returns {number} Coins to award
 */
export function calculateCoinReward(baseCoins = 1, isDoubleActive = false) {
  return isDoubleActive ? baseCoins * 2 : baseCoins;
};

export const CONFIG = {
  BASE_SPEED: 420,
  MAX_SPEED: 950,
  SPEED_ACCELERATION: 1.8, // Speed added per 100 meters
  LANE_SPACING: 130,       // Width between lanes
  JUMP_CLEAR_HEIGHT: 38,   // Minimum jump height to clear hurdles/barriers
  COLLISION_Z_THRESHOLD: 42, // Distance tolerance on Z-axis
  COLLISION_X_THRESHOLD: 46  // Distance tolerance on X-axis
};

/**
 * Calculates target X position for a given lane index.
 * @param {number} lane - -1, 0, or 1
 * @param {number} centerX - Center of road
 * @param {number} spacing - Spacing between lanes
 * @returns {number} Target X
 */
export function getLaneX(lane, centerX = 200, spacing = CONFIG.LANE_SPACING) {
  const clampedLane = Math.max(-1, Math.min(1, Math.round(lane)));
  return centerX + clampedLane * spacing;
}

/**
 * Calculates runner speed based on distance traveled.
 * @param {number} distance - Distance traveled in meters
 * @param {number} baseSpeed
 * @param {number} maxSpeed
 * @param {number} acceleration
 * @returns {number} Current speed
 */
export function calculateSpeed(
  distance,
  baseSpeed = CONFIG.BASE_SPEED,
  maxSpeed = CONFIG.MAX_SPEED,
  acceleration = CONFIG.SPEED_ACCELERATION
) {
  if (distance < 0) distance = 0;
  const speed = baseSpeed + (distance / 100) * acceleration * 12;
  return Math.min(maxSpeed, Math.round(speed));
}

/**
 * Calculates total score from distance and coins.
 * @param {number} distance - Distance in meters
 * @param {number} coins - Total coins collected
 * @param {number} multiplier - Score multiplier
 * @returns {number} Total score
 */
export function calculateScore(distance, coins = 0, multiplier = 1) {
  const distPoints = Math.floor(Math.max(0, distance));
  const coinPoints = Math.max(0, coins) * 25;
  return Math.floor((distPoints + coinPoints) * Math.max(1, multiplier));
}

/**
 * Checks whether an obstacle pattern across lanes is solvable.
 * A pattern is solvable if at least one lane is:
 * - Empty (null/undefined)
 * - A jumpable HURDLE or BARRIER
 * - A slideable LASER or OVERHEAD
 * If all 3 lanes are blocked by unavoidable solid obstacles (PILLAR, TRAIN, CRATE, DRONE), it is unsolvable.
 * @param {Array<string|null>} laneObstacles - Array of 3 obstacle types [left, center, right]
 * @returns {boolean} True if solvable
 */
export function isPatternSolvable(laneObstacles) {
  if (!Array.isArray(laneObstacles) || laneObstacles.length !== 3) {
    return false;
  }

  const impassableTypes = [
    OBSTACLE_TYPES.PILLAR,
    OBSTACLE_TYPES.DRONE,
    OBSTACLE_TYPES.TRAIN,
    OBSTACLE_TYPES.CRATE
  ];

  const blockedLanes = laneObstacles.filter(
    type => type && impassableTypes.includes(type)
  ).length;

  return blockedLanes < 3;
}

/**
 * Evaluates collision between player and an obstacle.
 * @param {Object} player
 * @param {number} player.x - Player X position
 * @param {number} player.z - Player Z position
 * @param {number} player.jumpY - Player jump height (0 = ground, > 0 = airborne)
 * @param {boolean} player.isSliding - Whether player is sliding
 * @param {Object} obstacle
 * @param {number} obstacle.x - Obstacle X position
 * @param {number} obstacle.z - Obstacle Z position
 * @param {string} obstacle.type - Obstacle type
 * @returns {boolean} True if collision occurred
 */
export function checkCollision(player, obstacle) {
  if (!player || !obstacle) return false;

  // Check Z overlap
  const dz = Math.abs(player.z - obstacle.z);
  if (dz > CONFIG.COLLISION_Z_THRESHOLD) {
    return false;
  }

  // Check X overlap
  const dx = Math.abs(player.x - obstacle.x);
  if (dx > CONFIG.COLLISION_X_THRESHOLD) {
    return false;
  }

  // Check specific obstacle evasion rules
  switch (obstacle.type) {
    case OBSTACLE_TYPES.HURDLE:
    case OBSTACLE_TYPES.BARRIER:
      // Cleared if jumping high enough
      if (player.jumpY >= CONFIG.JUMP_CLEAR_HEIGHT) {
        return false;
      }
      return true;

    case OBSTACLE_TYPES.LASER:
    case OBSTACLE_TYPES.OVERHEAD:
      // Cleared if sliding under beam / low bridge
      if (player.isSliding) {
        return false;
      }
      return true;

    case OBSTACLE_TYPES.PILLAR:
    case OBSTACLE_TYPES.DRONE:
    case OBSTACLE_TYPES.TRAIN:
    case OBSTACLE_TYPES.CRATE:
    default:
      // Full barrier, cannot be jumped or slid under
      return true;
  }
}

/**
 * Evaluates whether player collects a coin.
 * @param {Object} player
 * @param {Object} coin
 * @returns {boolean}
 */
export function checkCoinPickup(player, coin) {
  if (!player || !coin || coin.collected) return false;

  const dz = Math.abs(player.z - coin.z);
  const dx = Math.abs(player.x - coin.x);
  const dy = Math.abs(player.jumpY - (coin.jumpY || 0));

  return dz < 38 && dx < 44 && dy < 48;
}

/**
 * Evaluates whether player collects a powerup.
 * @param {Object} player
 * @param {Object} powerup
 * @returns {boolean}
 */
export function checkPowerupPickup(player, powerup) {
  if (!player || !powerup || powerup.collected) return false;

  const dz = Math.abs(player.z - powerup.z);
  const dx = Math.abs(player.x - powerup.x);
  const dy = Math.abs(player.jumpY - (powerup.jumpY || 0));

  return dz < 40 && dx < 44 && dy < 50;
}

/**
 * Pulls a coin toward the player when magnet powerup is active.
 * @param {Object} coin
 * @param {Object} player
 * @param {number} dt
 * @param {number} magnetSpeed
 */
export function attractCoinTowardPlayer(coin, player, dt, magnetSpeed = 650) {
  if (!coin || !player || coin.collected) return;
  const dx = player.x - coin.x;
  const dz = player.z - coin.z;
  const dist = Math.hypot(dx, dz);
  if (dist > 0.01) {
    const move = Math.min(dist, magnetSpeed * dt);
    coin.x += (dx / dist) * move;
    coin.z += (dz / dist) * move;
  }
}

/**
 * Evaluates whether player collects a floating letter.
 * @param {Object} player
 * @param {Object} letter
 * @returns {boolean}
 */
export function checkLetterPickup(player, letter) {
  if (!player || !letter || letter.collected) return false;

  const dz = Math.abs(player.z - letter.z);
  const dx = Math.abs(player.x - letter.x);
  const dy = Math.abs(player.jumpY - (letter.jumpY || 0));

  return dz < 42 && dx < 46 && dy < 50;
}

/**
 * Pulls a collectible letter toward player when magnet powerup is active.
 * @param {Object} letter
 * @param {Object} player
 * @param {number} dt
 * @param {number} magnetSpeed
 */
export function attractLetterTowardPlayer(letter, player, dt, magnetSpeed = 680) {
  if (!letter || !player || letter.collected) return;
  const dx = player.x - letter.x;
  const dz = player.z - letter.z;
  const dist = Math.hypot(dx, dz);
  if (dist > 0.01) {
    const move = Math.min(dist, magnetSpeed * dt);
    letter.x += (dx / dist) * move;
    letter.z += (dz / dist) * move;
  }
}

// ============================================================================
// AAA VISUAL ZONES & PROGRESSIVE DIFFICULTY
// ============================================================================
export const ZONES = {
  METRO: {
    id: 'metro',
    tier: 1,
    name: 'NEON METRO',
    subtitle: 'DISTRICT 01',
    minTime: 0,
    maxTime: 40,
    skyColors: ['#040612', '#0d1330', '#1e1b4b', '#3b0764'],
    fogColor: 'rgba(255, 0, 128, 0.4)',
    railGlow: '#00f3ff',
    railAccent: '#ff007f',
    gridLine: '#00f3ff',
    sleeperColor: '#1e293b',
    ambientHue: '#00f3ff',
    speedMultiplier: 0.96,
    minSpacing: 620,
    maxObstaclesPerWave: 1,
    coinFrequency: 0.75,
    description: 'Neon railway metropolis with city skyscrapers and hovercars'
  },
  TUNNEL: {
    id: 'tunnel',
    tier: 2,
    name: 'CYBER TUNNEL',
    subtitle: 'HIGH-SPEED CONDUIT',
    minTime: 40,
    maxTime: 90,
    skyColors: ['#030308', '#0b0817', '#1a0d2e', '#2e1065'],
    fogColor: 'rgba(168, 85, 247, 0.45)',
    railGlow: '#a855f7',
    railAccent: '#00ff88',
    gridLine: '#a855f7',
    sleeperColor: '#18122b',
    ambientHue: '#a855f7',
    speedMultiplier: 1.08,
    minSpacing: 540,
    maxObstaclesPerWave: 2,
    coinFrequency: 0.65,
    description: 'Futuristic tunnel with animated neon light ribs and overhead lasers'
  },
  SKYWAY: {
    id: 'skyway',
    tier: 3,
    name: 'SKYWAY',
    subtitle: 'ORBITAL HIGHWAY',
    minTime: 90,
    maxTime: Infinity,
    skyColors: ['#050e1a', '#0a1d37', '#1a2e4a', '#312e81'],
    fogColor: 'rgba(255, 184, 0, 0.45)',
    railGlow: '#ffb800',
    railAccent: '#00f3ff',
    gridLine: '#ffb800',
    sleeperColor: '#1e1b4b',
    ambientHue: '#ffb800',
    speedMultiplier: 1.22,
    minSpacing: 460,
    maxObstaclesPerWave: 2,
    coinFrequency: 0.55,
    description: 'Elevated futuristic tracks suspended over luminous planetary horizons'
  }
};

export const DIFFICULTY_TIERS = [
  ZONES.METRO,
  ZONES.TUNNEL,
  ZONES.SKYWAY
];

/**
 * Gets difficulty tier and visual zone based on run duration in seconds.
 * @param {number} elapsedSeconds
 * @returns {Object} Tier and zone definition
 */
export function getDifficultyTier(elapsedSeconds = 0) {
  const safeTime = Math.max(0, elapsedSeconds);
  for (const tier of DIFFICULTY_TIERS) {
    if (safeTime >= tier.minTime && safeTime < tier.maxTime) {
      return tier;
    }
  }
  return DIFFICULTY_TIERS[DIFFICULTY_TIERS.length - 1];
}

/**
 * Evaluates whether player scored an exciting near-miss without colliding.
 * @param {Object} player
 * @param {Object} obstacle
 * @returns {boolean} True if near-miss occurred
 */
export function checkNearMiss(player, obstacle) {
  if (!player || !obstacle || obstacle.nearMissAwarded) return false;

  const dz = Math.abs(player.z - obstacle.z);
  const dx = Math.abs(player.x - obstacle.x);

  if (dz > 32) return false;

  // Jump near-miss: close vertical brush over hurdle/barrier
  if (obstacle.type === OBSTACLE_TYPES.HURDLE || obstacle.type === OBSTACLE_TYPES.BARRIER) {
    if (player.jumpY >= CONFIG.JUMP_CLEAR_HEIGHT && player.jumpY <= CONFIG.JUMP_CLEAR_HEIGHT + 26 && dx < 44) {
      return true;
    }
  }

  // Slide near-miss: close slide brush under laser/overhead
  if (obstacle.type === OBSTACLE_TYPES.LASER || obstacle.type === OBSTACLE_TYPES.OVERHEAD) {
    if (player.isSliding && dx < 44) {
      return true;
    }
  }

  // Lateral near-miss: close pass adjacent to train or crate
  if (obstacle.type === OBSTACLE_TYPES.TRAIN || obstacle.type === OBSTACLE_TYPES.CRATE || obstacle.type === OBSTACLE_TYPES.PILLAR) {
    if (dx > 36 && dx < 82) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// MISSIONS & LONG-TERM REWARDS
// ============================================================================
export const MISSIONS = [
  {
    id: 'coins_20',
    title: 'Collect 20 Coins',
    type: 'collect_coins',
    target: 20,
    reward: 50,
    icon: '🪙'
  },
  {
    id: 'survive_60',
    title: 'Survive 60 Seconds',
    type: 'survive_time',
    target: 60,
    reward: 75,
    icon: '⏱️'
  },
  {
    id: 'dodge_15',
    title: 'Dodge 15 Obstacles',
    type: 'dodge_obstacles',
    target: 15,
    reward: 60,
    icon: '⚡'
  }
];

/**
 * Checks progress of a mission against current run stats.
 * @param {Object} mission
 * @param {Object} stats
 * @returns {{progress: number, target: number, completed: boolean, percentage: number}}
 */
export function evaluateMission(mission, stats = {}) {
  let current = 0;
  if (mission.type === 'collect_coins') {
    current = stats.coins || 0;
  } else if (mission.type === 'survive_time') {
    current = Math.floor(stats.time || 0);
  } else if (mission.type === 'dodge_obstacles') {
    current = stats.dodged || 0;
  }
  const progress = Math.min(mission.target, current);
  const completed = current >= mission.target;
  const percentage = Math.min(100, Math.round((progress / mission.target) * 100));
  return { progress, target: mission.target, completed, percentage };
}

// ============================================================================
// SCORE MILESTONES
// ============================================================================
export const MILESTONES = [
  { id: 'ms_1000', score: 1000, title: 'Novice Runner', reward: 30, icon: '🥉' },
  { id: 'ms_2500', score: 2500, title: 'Metro Sprinter', reward: 75, icon: '🥈' },
  { id: 'ms_5000', score: 5000, title: 'Cyber Legend', reward: 150, icon: '🥇' }
];

/**
 * Evaluates which new milestones have been unlocked by achieving a score.
 * @param {number} currentScore
 * @param {Array<string>} completedMilestoneIds
 * @returns {Array<Object>} Newly unlocked milestones
 */
export function checkNewMilestones(currentScore, completedMilestoneIds = []) {
  const completedSet = new Set(completedMilestoneIds);
  return MILESTONES.filter(ms => currentScore >= ms.score && !completedSet.has(ms.id));
}

// ============================================================================
// UNLOCKABLE PLAYER SKINS (Neon Runner, Cyber Ninja, Golden Robot, Shadow Runner, Rainbow Hero, Alphabet Master)
// ============================================================================
export const SKINS = {
  classic: {
    id: 'classic',
    name: 'Neon Runner',
    price: 0,
    hoodie: '#00f3ff',
    backpack: '#ff007f',
    sneakers: '#00f3ff',
    visor: '#fef08a',
    accent: '#06b6d4',
    trailColor: '#00f3ff',
    desc: 'Default electric metro streetwear runner'
  },
  ninja: {
    id: 'ninja',
    name: 'Cyber Ninja',
    price: 150,
    hoodie: '#0f172a',
    backpack: '#00ff88',
    sneakers: '#00ff88',
    visor: '#00f3ff',
    accent: '#10b981',
    trailColor: '#00ff88',
    desc: 'Sleek stealth cyber suit with green plasma trail'
  },
  robot: {
    id: 'robot',
    name: 'Golden Robot',
    price: 300,
    hoodie: '#ffb800',
    backpack: '#ea580c',
    sneakers: '#fbbf24',
    visor: '#ffffff',
    accent: '#d97706',
    trailColor: '#ffb800',
    desc: 'Polished titanium chassis with radiant gold trails'
  },
  shadow: {
    id: 'shadow',
    name: 'Shadow Runner',
    price: 500,
    hoodie: '#3b0764',
    backpack: '#a855f7',
    sneakers: '#c084fc',
    visor: '#e879f9',
    accent: '#7e22ce',
    trailColor: '#c084fc',
    desc: 'Deep phantom violet runner shrouded in shadow'
  },
  rainbow: {
    id: 'rainbow',
    name: 'Rainbow Hero',
    price: 800,
    hoodie: '#ec4899',
    backpack: '#00f3ff',
    sneakers: '#fbbf24',
    visor: '#a855f7',
    accent: '#06b6d4',
    trailColor: '#f43f5e',
    desc: 'Prismatic multi-chromatic suit with shifting spectral trails'
  },
  master: {
    id: 'master',
    name: 'Alphabet Master',
    price: 1200,
    hoodie: '#ffd700',
    backpack: '#00f3ff',
    sneakers: '#ffffff',
    visor: '#38bdf8',
    accent: '#b45309',
    trailColor: '#ffd700',
    desc: 'Legendary scholar suit engraved with luminous letter glyphs'
  }
};

export const LEGACY_SKIN_MAP = {
  gold: 'robot',
  violet: 'shadow',
  matrix: 'ninja',
  plasma: 'rainbow'
};

export function getSkin(skinId) {
  if (SKINS[skinId]) return SKINS[skinId];
  if (LEGACY_SKIN_MAP[skinId] && SKINS[LEGACY_SKIN_MAP[skinId]]) {
    return SKINS[LEGACY_SKIN_MAP[skinId]];
  }
  return SKINS.classic;
}

// ============================================================================
// COMPLETE A–Z ALPHABET MISSIONS (26 Letters, 3 copies each)
// ============================================================================
export const ALPHABET_MISSIONS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter, index) => ({
  id: `alpha_${letter}`,
  letter,
  targetCount: 3,
  rewardCoins: 50 + index * 5,
  rewardXp: 80 + index * 5,
  index
}));

// ============================================================================
// 50 WORD COLLECTION CHALLENGES (Beginner, Easy, Medium, Advanced, Expert)
// ============================================================================
export const WORD_CHALLENGES = [
  // BEGINNER (10 words)
  ...['CAT', 'DOG', 'SUN', 'CAR', 'BUS', 'HAT', 'PEN', 'CUP', 'BOX', 'MAP'].map((w, idx) => ({
    id: `word_${w}`,
    word: w,
    category: 'BEGINNER',
    rewardCoins: 60,
    rewardXp: 90,
    order: idx
  })),
  // EASY (10 words)
  ...['BALL', 'FISH', 'BIRD', 'BOOK', 'TREE', 'CAKE', 'STAR', 'MOON', 'MILK', 'HAND'].map((w, idx) => ({
    id: `word_${w}`,
    word: w,
    category: 'EASY',
    rewardCoins: 90,
    rewardXp: 130,
    order: 10 + idx
  })),
  // MEDIUM (10 words)
  ...['APPLE', 'GRAPE', 'HOUSE', 'TIGER', 'HORSE', 'WATER', 'HAPPY', 'SMILE', 'ROBOT', 'CLOUD'].map((w, idx) => ({
    id: `word_${w}`,
    word: w,
    category: 'MEDIUM',
    rewardCoins: 140,
    rewardXp: 190,
    order: 20 + idx
  })),
  // ADVANCED (10 words)
  ...['MONKEY', 'BANANA', 'ORANGE', 'PLANET', 'ROCKET', 'FLOWER', 'MONSTER', 'RAINBOW', 'JUNGLE', 'CASTLE'].map((w, idx) => ({
    id: `word_${w}`,
    word: w,
    category: 'ADVANCED',
    rewardCoins: 200,
    rewardXp: 270,
    order: 30 + idx
  })),
  // EXPERT (10 words)
  ...['ELEPHANT', 'BUTTERFLY', 'DINOSAUR', 'CHOCOLATE', 'ADVENTURE', 'CHALLENGE', 'TREASURE', 'LIGHTNING', 'SUPERHERO', 'PLAYGROUND'].map((w, idx) => ({
    id: `word_${w}`,
    word: w,
    category: 'EXPERT',
    rewardCoins: 300,
    rewardXp: 400,
    order: 40 + idx
  }))
];

// ============================================================================
// DAILY CHALLENGES CONFIG
// ============================================================================
export const DAILY_CONFIG = [
  { id: 'letters', title: 'Collect 20 Letters', type: 'collect_letters', target: 20, rewardCoins: 100, rewardXp: 150, icon: '🔤' },
  { id: 'words', title: 'Complete 2 Word Missions', type: 'complete_words', target: 2, rewardCoins: 150, rewardXp: 200, icon: '📚' },
  { id: 'distance', title: 'Run 1,000 Meters', type: 'run_distance', target: 1000, rewardCoins: 120, rewardXp: 180, icon: '🏃' }
];

// ============================================================================
// ACHIEVEMENTS CONFIG
// ============================================================================
export const ACHIEVEMENTS = [
  { id: 'first_letter', title: 'First Letter', desc: 'Collect your first alphabet letter', target: 1, rewardCoins: 30, icon: '🔤' },
  { id: 'first_word', title: 'First Word', desc: 'Complete your first word mission', target: 1, rewardCoins: 50, icon: '📖' },
  { id: 'word_collector', title: 'Word Collector', desc: 'Complete 10 word challenges', target: 10, rewardCoins: 150, icon: '📚' },
  { id: 'alphabet_explorer', title: 'Alphabet Explorer', desc: 'Complete 13 alphabet missions', target: 13, rewardCoins: 200, icon: '🧭' },
  { id: 'alphabet_master', title: 'Alphabet Master', desc: 'Complete all 26 alphabet missions', target: 26, rewardCoins: 500, icon: '👑' },
  { id: 'word_champion', title: 'Word Champion', desc: 'Complete all 50 word challenges', target: 50, rewardCoins: 800, icon: '🏆' },
  { id: 'coin_collector', title: 'Coin Collector', desc: 'Collect 1,000 lifetime coins', target: 1000, rewardCoins: 250, icon: '🪙' },
  { id: 'daily_champion', title: 'Daily Champion', desc: 'Complete all 3 daily challenges in one day', target: 3, rewardCoins: 300, icon: '🌟' }
];

// ============================================================================
// PROGRESSION & WORD LOGIC HELPER FUNCTIONS
// ============================================================================

/**
 * Calculates current player level based on total experience points.
 * @param {number} xp
 * @returns {number} Level (starts at 1)
 */
export function calculateLevel(xp = 0) {
  if (xp <= 0) return 1;
  return Math.floor(xp / 200) + 1;
}

/**
 * Returns XP details for current level and progress to next level.
 * @param {number} xp
 * @returns {{level: number, currentXp: number, neededXp: number, percentage: number}}
 */
export function getLevelProgress(xp = 0) {
  const level = calculateLevel(xp);
  const currentXp = xp % 200;
  const neededXp = 200;
  const percentage = Math.min(100, Math.floor((currentXp / neededXp) * 100));
  return { level, currentXp, neededXp, percentage };
}

/**
 * Gets the next required character for a word given the count of collected letters.
 * @param {string} targetWord
 * @param {number} collectedCount
 * @returns {string|null}
 */
export function getNextRequiredLetter(targetWord = '', collectedCount = 0) {
  if (!targetWord || collectedCount >= targetWord.length) return null;
  return targetWord.charAt(collectedCount).toUpperCase();
}

/**
 * Checks if a collected letter matches the next required letter in word challenge.
 * @param {string} collectedLetter
 * @param {string} targetWord
 * @param {number} collectedCount
 * @returns {boolean}
 */
export function checkLetterMatch(collectedLetter, targetWord, collectedCount) {
  if (!collectedLetter || !targetWord) return false;
  const expected = getNextRequiredLetter(targetWord, collectedCount);
  return expected !== null && collectedLetter.toUpperCase() === expected;
}


