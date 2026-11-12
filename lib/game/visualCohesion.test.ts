import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_BATTLE_SCARS,
  computeGroundedContactShadow,
  computeWeaponSlashRibbon,
  computeWeaponTipGlintPosition,
  spawnBattleScar,
  updateBattleScars,
} from './visualCohesion';

test('Pillar 1: spawnBattleScar creates deterministic blood splatters, scorch craters, and enforces FIFO cap', () => {
  let scars = spawnBattleScar([], {
    id: 1,
    kind: 'blood_splatter',
    x: 420,
    y: 310,
    angle: 0.5,
    scale: 1.2,
  });
  assert.equal(scars.length, 1);
  assert.equal(scars[0].kind, 'blood_splatter');
  assert.equal(scars[0].droplets.length, 6);
  assert.ok(scars[0].radius > 24);

  scars = spawnBattleScar(scars, {
    id: 2,
    kind: 'scorch_crater',
    x: 500,
    y: 340,
    scale: 1.0,
  });
  assert.equal(scars.length, 2);
  assert.equal(scars[1].kind, 'scorch_crater');
  assert.equal(scars[1].droplets.length, 5);

  // Fill beyond MAX_BATTLE_SCARS and verify FIFO trimming
  for (let i = 3; i <= MAX_BATTLE_SCARS + 5; i++) {
    scars = spawnBattleScar(scars, {
      id: i,
      kind: 'shattered_armor',
      x: 100 + i * 5,
      y: 200,
    });
  }
  assert.equal(scars.length, MAX_BATTLE_SCARS);
  assert.equal(scars[0].id, 6);
});

test('Pillar 1: updateBattleScars ages decals and expires short-lived footstep ash while keeping battle scars', () => {
  let scars = spawnBattleScar([], {
    id: 10,
    kind: 'footstep_ash',
    x: 300,
    y: 300,
  });
  scars = spawnBattleScar(scars, {
    id: 11,
    kind: 'blood_splatter',
    x: 320,
    y: 310,
  });

  // Advance by 15s: footstep_ash (maxAge 14s) expires, blood_splatter (maxAge 120s) remains
  const after = updateBattleScars(scars, 15);
  assert.equal(after.length, 1);
  assert.equal(after[0].id, 11);
  assert.equal(after[0].kind, 'blood_splatter');
});

test('Pillar 1: computeGroundedContactShadow skews shadow away from brazier light and attenuates with elevation', () => {
  const grounded = computeGroundedContactShadow({
    worldX: 600,
    worldY: 400,
    baseRadius: 24,
    elevationY: 0,
    lightSourceX: 400,
  });
  const airborne = computeGroundedContactShadow({
    worldX: 600,
    worldY: 400,
    baseRadius: 24,
    elevationY: 60,
    lightSourceX: 400,
  });

  assert.ok(grounded.directionalSkewX > 0);
  assert.ok(grounded.aoCoreAlpha > airborne.aoCoreAlpha);
  assert.ok(grounded.aoCoreRadiusX > airborne.aoCoreRadiusX);
});

test('Pillar 1: computeWeaponSlashRibbon generates 15 tapered nodes with stance-specific plasma colors', () => {
  const smashRibbon = computeWeaponSlashRibbon({
    originX: 500,
    originY: 400,
    aimAngle: 0,
    swingProgress: 0.75,
    radius: 88,
    stance: 'smash',
    isHeavy: true,
    isRiposte: false,
  });
  assert.equal(smashRibbon.nodes.length, 15);
  // Belly node thickness is wider than tail node thickness
  assert.ok(smashRibbon.nodes[7].thickness > smashRibbon.nodes[0].thickness);

  const riposteRibbon = computeWeaponSlashRibbon({
    originX: 500,
    originY: 400,
    aimAngle: 0,
    swingProgress: 0.9,
    radius: 96,
    stance: 'thrust',
    isHeavy: false,
    isRiposte: true,
  });
  assert.equal(riposteRibbon.outerGlowColor, '#38bdf8');
});

test('Pillar 1: computeWeaponTipGlintPosition distinguishes parriable Golden Glints from unblockable Crimson Glints', () => {
  const golden = computeWeaponTipGlintPosition({
    enemyX: 400,
    enemyY: 300,
    facing: 1,
    windupProgress: 0.8,
    isBoss: false,
    attackKind: 'cone',
  });
  assert.equal(golden.isParriable, true);
  assert.equal(golden.primaryColor, '#ffd86b');
  assert.ok(golden.y < 300);

  const crimson = computeWeaponTipGlintPosition({
    enemyX: 400,
    enemyY: 300,
    facing: -1,
    windupProgress: 0.9,
    isBoss: true,
    attackKind: 'shockwave',
  });
  assert.equal(crimson.isParriable, false);
  assert.equal(crimson.primaryColor, '#ff2a3c');
  assert.ok(crimson.starRadius > golden.starRadius);
});

