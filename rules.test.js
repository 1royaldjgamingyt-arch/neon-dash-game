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
  attractCoinTowardPlayer,
  getDifficultyTier,
  MISSIONS,
  evaluateMission,
  MILESTONES,
  checkNewMilestones,
  SKINS,
  checkNearMiss,
  ZONES,
  getComboMultiplier,
  calculateCoinReward
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

test('getDifficultyTier scales difficulty fairly over 3 distinct zones', () => {
  // Zone 1: NEON METRO (0-40s)
  const t0 = getDifficultyTier(0);
  assert.equal(t0.tier, 1);
  assert.equal(t0.name, 'NEON METRO');
  assert.equal(t0.maxObstaclesPerWave, 1);

  const t25 = getDifficultyTier(25);
  assert.equal(t25.tier, 1);
  assert.equal(t25.id, 'metro');

  // Zone 2: CYBER TUNNEL (40-90s)
  const t40 = getDifficultyTier(40);
  assert.equal(t40.tier, 2);
  assert.equal(t40.name, 'CYBER TUNNEL');
  assert.equal(t40.id, 'tunnel');

  const t75 = getDifficultyTier(75);
  assert.equal(t75.tier, 2);

  // Zone 3: SKYWAY (90s+)
  const t95 = getDifficultyTier(95);
  assert.equal(t95.tier, 3);
  assert.equal(t95.name, 'SKYWAY');
  assert.equal(t95.id, 'skyway');
});

test('evaluateMission accurately tracks coins, time, and dodged obstacles', () => {
  const coinMission = MISSIONS.find(m => m.type === 'collect_coins');
  assert.ok(coinMission, 'Coin mission must exist');
  const res1 = evaluateMission(coinMission, { coins: 15 });
  assert.equal(res1.progress, 15);
  assert.equal(res1.completed, false);
  assert.equal(res1.percentage, 75);

  const res2 = evaluateMission(coinMission, { coins: 25 });
  assert.equal(res2.progress, 20);
  assert.equal(res2.completed, true);
  assert.equal(res2.percentage, 100);

  const surviveMission = MISSIONS.find(m => m.type === 'survive_time');
  assert.ok(surviveMission, 'Survive mission must exist');
  const res3 = evaluateMission(surviveMission, { time: 62 });
  assert.equal(res3.completed, true);

  const dodgeMission = MISSIONS.find(m => m.type === 'dodge_obstacles');
  assert.ok(dodgeMission, 'Dodge mission must exist');
  const res4 = evaluateMission(dodgeMission, { dodged: 10 });
  assert.equal(res4.completed, false);
  assert.equal(res4.progress, 10);
});

test('checkNewMilestones awards correct score thresholds (1000, 2500, 5000)', () => {
  const newAt500 = checkNewMilestones(500, []);
  assert.equal(newAt500.length, 0);

  const newAt1200 = checkNewMilestones(1200, []);
  assert.equal(newAt1200.length, 1);
  assert.equal(newAt1200[0].score, 1000);

  // When 1000 is already completed, check next
  const newAt3000 = checkNewMilestones(3000, ['ms_1000']);
  assert.equal(newAt3000.length, 1);
  assert.equal(newAt3000[0].score, 2500);

  const newAt6000 = checkNewMilestones(6000, ['ms_1000', 'ms_2500']);
  assert.equal(newAt6000.length, 1);
  assert.equal(newAt6000[0].score, 5000);
});

test('SKINS defines 5 balanced cyberpunk suit options', () => {
  const skinKeys = Object.keys(SKINS);
  assert.equal(skinKeys.length, 5);
  assert.equal(SKINS.classic.price, 0);
  assert.equal(SKINS.gold.price, 150);
  assert.equal(SKINS.violet.price, 300);
  assert.equal(SKINS.matrix.price, 500);
  assert.equal(SKINS.plasma.price, 800);

  for (const s of Object.values(SKINS)) {
    assert.ok(s.hoodie, `${s.id} must define hoodie color`);
    assert.ok(s.backpack, `${s.id} must define backpack color`);
    assert.ok(s.sneakers, `${s.id} must define sneakers color`);
  }
});

test('checkNearMiss awards bonus when player closely clears an obstacle without crashing', () => {
  // 1. Close jump over low hurdle
  const hurdle = { type: OBSTACLE_TYPES.HURDLE, x: 240, z: 12 };
  const jumpingPlayer = { x: 240, z: 0, isJumping: true, jumpY: 48, isSliding: false };
  assert.equal(checkNearMiss(jumpingPlayer, hurdle), true);

  // Too far away shouldn't trigger near miss
  const farPlayer = { x: 240, z: 0, isJumping: true, jumpY: 48, isSliding: false };
  const farHurdle = { type: OBSTACLE_TYPES.HURDLE, x: 240, z: 95 };
  assert.equal(checkNearMiss(farPlayer, farHurdle), false);

  // 2. Close slide under overhead beam
  const overhead = { type: OBSTACLE_TYPES.OVERHEAD, x: 240, z: 14 };
  const slidingPlayer = { x: 240, z: 0, isJumping: false, jumpY: 0, isSliding: true };
  assert.equal(checkNearMiss(slidingPlayer, overhead), true);

  // 3. Close lateral evasion past subway train in adjacent lane
  const train = { type: OBSTACLE_TYPES.TRAIN, x: 120, z: 10 };
  const dodgingPlayer = { x: 195, z: 0, isJumping: false, jumpY: 0, isSliding: false };
  assert.equal(checkNearMiss(dodgingPlayer, train), true);
});

test('ZONES defines 3 rich distinct environments with balanced progression', () => {
  assert.equal(ZONES.METRO.name, 'NEON METRO');
  assert.equal(ZONES.TUNNEL.name, 'CYBER TUNNEL');
  assert.equal(ZONES.SKYWAY.name, 'SKYWAY');
  assert.equal(ZONES.METRO.maxTime, 40);
  assert.equal(ZONES.TUNNEL.maxTime, 90);
  assert.equal(ZONES.SKYWAY.maxTime, Infinity);
});

test('POWERUP_TYPES includes double coins power-up', () => {
  assert.equal(POWERUP_TYPES.DOUBLE, 'double');
});

test('getComboMultiplier scales multiplier based on consecutive streak', () => {
  assert.equal(getComboMultiplier(0), 1);
  assert.equal(getComboMultiplier(1), 1);
  assert.equal(getComboMultiplier(2), 1);
  assert.equal(getComboMultiplier(3), 2);
  assert.equal(getComboMultiplier(7), 2);
  assert.equal(getComboMultiplier(8), 3);
  assert.equal(getComboMultiplier(14), 3);
  assert.equal(getComboMultiplier(15), 5);
  assert.equal(getComboMultiplier(24), 5);
  assert.equal(getComboMultiplier(25), 10);
  assert.equal(getComboMultiplier(100), 10);
});

test('calculateCoinReward doubles reward when double coins power-up is active', () => {
  assert.equal(calculateCoinReward(1, false), 1);
  assert.equal(calculateCoinReward(1, true), 2);
  assert.equal(calculateCoinReward(5, false), 5);
  assert.equal(calculateCoinReward(5, true), 10);
});


