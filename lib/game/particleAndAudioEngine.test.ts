import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createParticlePool,
  emitParticleBurst,
  stepParticleSimulation,
  computeSpatialAudioPanAndGain,
  computeDynamicCombatAudioProfile,
  computeMaterialFoleySpec,
} from './particleAndAudioEngine';

test('createParticlePool allocates exact fixed capacity with inactive nodes', () => {
  const pool = createParticlePool(120);
  assert.equal(pool.length, 120);
  assert.equal(pool.every((pt) => pt.active === false), true);
});

test('emitParticleBurst activates requested count and configures archetype physics', () => {
  const pool = createParticlePool(64);
  const spawnedBlood = emitParticleBurst(pool, {
    archetype: 'blood_splatter',
    originX: 400,
    originY: 300,
    floorY: 330,
    count: 16,
    baseSpeed: 220,
  });
  assert.equal(spawnedBlood, 16);
  const activeBlood = pool.filter((pt) => pt.active && pt.archetype === 'blood_splatter');
  assert.equal(activeBlood.length, 16);
  assert.equal(activeBlood[0].gravity, 420);
  assert.equal(activeBlood[0].floorY, 330);

  const spawnedMagic = emitParticleBurst(pool, {
    archetype: 'magic_spell',
    originX: 500,
    originY: 320,
    count: 12,
    baseSpeed: 180,
    primaryColor: '#38bdf8',
  });
  assert.equal(spawnedMagic, 12);
  const activeMagic = pool.filter((pt) => pt.active && pt.archetype === 'magic_spell');
  assert.equal(activeMagic.length, 12);
  assert.notEqual(activeMagic[0].swirlAngularVel, 0);
});

test('stepParticleSimulation detects blood_splatter floor impacts and bounces bronze_spark', () => {
  const pool = createParticlePool(16);
  emitParticleBurst(pool, {
    archetype: 'blood_splatter',
    originX: 250,
    originY: 295,
    floorY: 300,
    count: 4,
    baseSpeed: 60,
  });
  // Force downward velocity near floor to test floor collision deterministically
  pool[0].y = 299;
  pool[0].vy = 180;
  pool[0].floorY = 300;

  const impacts = stepParticleSimulation(pool, 0.05);
  assert.equal(impacts.length >= 1, true);
  assert.equal(pool[0].landedOnFloor, true);
  assert.equal(pool[0].y, 300);

  // Test bronze_spark elastic bounce
  const sparkPool = createParticlePool(8);
  emitParticleBurst(sparkPool, {
    archetype: 'bronze_spark',
    originX: 400,
    originY: 298,
    floorY: 300,
    count: 2,
    baseSpeed: 120,
  });
  sparkPool[0].y = 299;
  sparkPool[0].vy = 200;
  sparkPool[0].floorY = 300;

  stepParticleSimulation(sparkPool, 0.05);
  assert.equal(sparkPool[0].bounced, true);
  assert.equal(sparkPool[0].vy < 0, true);
});

test('computeSpatialAudioPanAndGain pans stereo left/right and attenuates by distance', () => {
  const leftEvent = computeSpatialAudioPanAndGain({
    sourceX: 200,
    sourceY: 400,
    listenerX: 600,
    listenerY: 400,
    viewportW: 1440,
  });
  const rightEvent = computeSpatialAudioPanAndGain({
    sourceX: 1000,
    sourceY: 400,
    listenerX: 600,
    listenerY: 400,
    viewportW: 1440,
  });
  const farEvent = computeSpatialAudioPanAndGain({
    sourceX: 1600,
    sourceY: 400,
    listenerX: 600,
    listenerY: 400,
    viewportW: 1440,
  });

  assert.equal(leftEvent.pan < -0.3, true);
  assert.equal(rightEvent.pan > 0.3, true);
  assert.equal(farEvent.gainMultiplier < leftEvent.gainMultiplier, true);
});

test('computeDynamicCombatAudioProfile scales BGM drive and lowpass filter on slowMo & low HP', () => {
  const normal = computeDynamicCombatAudioProfile({
    stylePoints: 100,
    bossPhase: 1,
    playerHpRatio: 0.9,
    slowMoActive: false,
  });
  const slowMo = computeDynamicCombatAudioProfile({
    stylePoints: 850,
    bossPhase: 3,
    playerHpRatio: 0.2,
    slowMoActive: true,
  });

  assert.equal(normal.lowpassCutoffHz, 18500);
  assert.equal(normal.subBassHeartbeatGain, 0);
  assert.equal(slowMo.lowpassCutoffHz, 680);
  assert.equal(slowMo.bgmDriveBoost > normal.bgmDriveBoost, true);
  assert.equal(slowMo.subBassHeartbeatGain > 0, true);
  assert.equal(slowMo.percussionLayerActive, true);
});

test('computeMaterialFoleySpec returns distinct frequency profiles per material', () => {
  const flesh = computeMaterialFoleySpec('flesh_cleave');
  const bronze = computeMaterialFoleySpec('bronze_armor');
  const parry = computeMaterialFoleySpec('golden_parry');
  const stone = computeMaterialFoleySpec('obsidian_stone');

  assert.equal(bronze.fundamentalHz > flesh.fundamentalHz, true);
  assert.equal(parry.overtoneHz > bronze.overtoneHz, true);
  assert.equal(stone.subBassHz < flesh.subBassHz, true);
});
