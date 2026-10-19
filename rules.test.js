import test from 'node:test';
import assert from 'node:assert/strict';
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

test('getLaneX positions player correctly across 3 lanes', () => {
  const center = 200;
  const spacing = 120;
  assert.equal(getLaneX(LANES.LEFT, center, spacing), 80);
  assert.equal(getLaneX(LANES.CENTER, center, spacing), 200);
  assert.equal(getLaneX(LANES.RIGHT, center, spacing), 320);

  // Clamps out of bound lanes
  assert.equal(getLaneX(-5, center, spacing), 80);
  assert.equal(getLaneX(5, center, spacing), 320);
});

test('calculateSpeed increases smoothly and respects max speed cap', () => {
  const initialSpeed = calculateSpeed(0);
  assert.equal(initialSpeed, CONFIG.BASE_SPEED);

  const midSpeed = calculateSpeed(1000);
  assert.ok(midSpeed > initialSpeed, 'Speed should increase with distance');

  const ultraSpeed = calculateSpeed(100000);
  assert.equal(ultraSpeed, CONFIG.MAX_SPEED, 'Speed must not exceed max speed');
});

test('calculateScore calculates distance and coin rewards accurately', () => {
  assert.equal(calculateScore(100, 0), 100);
  assert.equal(calculateScore(100, 4), 200); // 100 + 4*25
  assert.equal(calculateScore(100, 4, 2), 400); // Double multiplier
});

test('isPatternSolvable ensures fair game design across classic and railway obstacles', () => {
  // 1 lane open
  assert.equal(isPatternSolvable([OBSTACLE_TYPES.PILLAR, null, OBSTACLE_TYPES.PILLAR]), true);

  // Jumpable hurdle/barrier present
  assert.equal(isPatternSolvable([OBSTACLE_TYPES.TRAIN, OBSTACLE_TYPES.HURDLE, OBSTACLE_TYPES.TRAIN]), true);
  assert.equal(isPatternSolvable([OBSTACLE_TYPES.TRAIN, OBSTACLE_TYPES.BARRIER, OBSTACLE_TYPES.TRAIN]), true);

  // Slideable laser/overhead bridge present
  assert.equal(isPatternSolvable([OBSTACLE_TYPES.TRAIN, OBSTACLE_TYPES.LASER, OBSTACLE_TYPES.TRAIN]), true);
  assert.equal(isPatternSolvable([OBSTACLE_TYPES.CRATE, OBSTACLE_TYPES.OVERHEAD, OBSTACLE_TYPES.TRAIN]), true);

  // Unsolvable: all 3 blocked by solid pillars / trains / crates
  assert.equal(isPatternSolvable([OBSTACLE_TYPES.PILLAR, OBSTACLE_TYPES.PILLAR, OBSTACLE_TYPES.PILLAR]), false);
  assert.equal(isPatternSolvable([OBSTACLE_TYPES.TRAIN, OBSTACLE_TYPES.CRATE, OBSTACLE_TYPES.TRAIN]), false);
  assert.equal(isPatternSolvable([OBSTACLE_TYPES.DRONE, OBSTACLE_TYPES.PILLAR, OBSTACLE_TYPES.TRAIN]), false);
});

test('checkCollision handles jumping over low hurdles and railway barriers', () => {
  const barrier = {
    x: 200,
    z: 100,
    type: OBSTACLE_TYPES.BARRIER
  };

  // Player on ground hits barrier
  const playerGrounded = { x: 200, z: 100, jumpY: 0, isSliding: false };
  assert.equal(checkCollision(playerGrounded, barrier), true);

  // Player jumping clears barrier
  const playerJumping = { x: 200, z: 100, jumpY: 50, isSliding: false };
  assert.equal(checkCollision(playerJumping, barrier), false);

  // Player in different lane does not hit
  const playerLeftLane = { x: 80, z: 100, jumpY: 0, isSliding: false };
  assert.equal(checkCollision(playerLeftLane, barrier), false);
});

test('checkCollision handles sliding under overhead bridge beams and lasers', () => {
  const overhead = {
    x: 200,
    z: 100,
    type: OBSTACLE_TYPES.OVERHEAD
  };

  // Standing player hits overhead beam
  const playerStanding = { x: 200, z: 100, jumpY: 0, isSliding: false };
  assert.equal(checkCollision(playerStanding, overhead), true);

  // Sliding player dodges overhead beam
  const playerSliding = { x: 200, z: 100, jumpY: 0, isSliding: true };
  assert.equal(checkCollision(playerSliding, overhead), false);
});

test('checkCollision detects solid subway trains and crates that cannot be jumped or slid', () => {
  const train = {
    x: 200,
    z: 100,
    type: OBSTACLE_TYPES.TRAIN
  };

  // Jumping still hits train
  assert.equal(checkCollision({ x: 200, z: 100, jumpY: 60, isSliding: false }, train), true);

  // Sliding still hits train
  assert.equal(checkCollision({ x: 200, z: 100, jumpY: 0, isSliding: true }, train), true);

  // Avoiding lane dodges train
  assert.equal(checkCollision({ x: 320, z: 100, jumpY: 0, isSliding: false }, train), false);
});

test('checkCoinPickup collects coins within proximity', () => {
  const coin = { x: 200, z: 100, jumpY: 0, collected: false };
  const playerNear = { x: 205, z: 102, jumpY: 0 };
  const playerFar = { x: 80, z: 100, jumpY: 0 };

  assert.equal(checkCoinPickup(playerNear, coin), true);
  assert.equal(checkCoinPickup(playerFar, coin), false);
});

test('checkPowerupPickup collects powerups within proximity', () => {
  const pUp = { x: 200, z: 100, type: POWERUP_TYPES.MAGNET, collected: false };
  const playerNear = { x: 202, z: 98, jumpY: 0 };
  const playerFar = { x: 80, z: 100, jumpY: 0 };

  assert.equal(checkPowerupPickup(playerNear, pUp), true);
  assert.equal(checkPowerupPickup(playerFar, pUp), false);
});

test('attractCoinTowardPlayer pulls coins closer over time', () => {
  const coin = { x: 80, z: 200, collected: false };
  const player = { x: 200, z: 100 };

  attractCoinTowardPlayer(coin, player, 0.1, 500);
  assert.ok(coin.x > 80, 'Coin X should move toward player X');
  assert.ok(coin.z < 200, 'Coin Z should move toward player Z');
});
