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
  BOOST: 'boost'          // Invincible super-speed dash
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
