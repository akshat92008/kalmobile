import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateParryImpact,
  evaluateSeeThroughOrRiposte,
  pushTemporalSnapshot,
  computeKalaRewindState,
  planShadowAssassination,
  computeCombatStyleStatus,
} from './modernCombat';

test('God of War 2-Tier Parry: Perfect Golden window negates 100% damage, grants Riposte & Focus Orb', () => {
  const perfect = evaluateParryImpact({
    parryElapsedSec: 0.12,
    incomingDamage: 48,
    attackerMaxPosture: 120,
    isUnblockableCrimsonAttack: false,
  });
  assert.equal(perfect.tier, 'perfect_golden');
  assert.equal(perfect.damageTaken, 0);
  assert.equal(perfect.grantsRiposteWindow, true);
  assert.equal(perfect.focusOrbsGranted, 1);
  assert.ok(perfect.postureDamageDealt >= 70);

  const standard = evaluateParryImpact({
    parryElapsedSec: 0.42,
    incomingDamage: 40,
    attackerMaxPosture: 120,
    isUnblockableCrimsonAttack: false,
  });
  assert.equal(standard.tier, 'standard_guard');
  assert.equal(standard.damageTaken, 6);
  assert.equal(standard.grantsRiposteWindow, false);

  const crimson = evaluateParryImpact({
    parryElapsedSec: 0.08,
    incomingDamage: 60,
    attackerMaxPosture: 200,
    isUnblockableCrimsonAttack: true,
  });
  assert.equal(crimson.tier, 'whiff');
  assert.ok(crimson.damageTaken > 0);
});

test('Black Myth See-Through & God of War Riposte counters boost damage and grant invulnerability', () => {
  const riposte = evaluateSeeThroughOrRiposte({
    playerInLightCombo: false,
    nearbyEnemyWindingUp: false,
    focusOrbs: 1,
    riposteWindowActive: true,
  });
  assert.equal(riposte.triggeredRiposteBurst, true);
  assert.equal(riposte.damageMultiplier, 2.65);

  const seeThrough = evaluateSeeThroughOrRiposte({
    playerInLightCombo: true,
    nearbyEnemyWindingUp: true,
    focusOrbs: 2,
    riposteWindowActive: false,
  });
  assert.equal(seeThrough.triggeredSeeThrough, true);
  assert.equal(seeThrough.damageMultiplier, 2.15);
  assert.equal(seeThrough.refundsFocusOrb, true);
});

test('Prince of Persia Kala-Rewind buffer restores position and highest recorded HP within 3s window', () => {
  let buf = pushTemporalSnapshot([], { timestampSec: 1.0, x: 200, y: 300, hp: 140 });
  buf = pushTemporalSnapshot(buf, { timestampSec: 2.5, x: 260, y: 320, hp: 110 });
  buf = pushTemporalSnapshot(buf, { timestampSec: 3.8, x: 310, y: 350, hp: 75 });

  const rewind = computeKalaRewindState(buf, 310, 350, 75, 150);
  assert.equal(rewind.canRewind, true);
  assert.equal(rewind.targetX, 200);
  assert.equal(rewind.targetY, 300);
  assert.equal(rewind.restoredHp, 140);
  assert.equal(rewind.hpRecoveredDelta, 65);
});

test('Assassins Creed Shadow Prana Blink prioritizes broken/low-HP enemies, teleports behind them, and resets on kill', () => {
  const plan = planShadowAssassination(100, 100, 50, [
    {
      id: 1,
      x: 220,
      y: 120,
      hp: 300,
      maxHp: 300,
      posture: 100,
      maxPosture: 100,
      facing: 1,
      isBoss: false,
      postureBroken: false,
    },
    {
      id: 2,
      x: 340,
      y: 150,
      hp: 90,
      maxHp: 200,
      posture: 40,
      maxPosture: 100,
      facing: -1,
      isBoss: false,
      postureBroken: false,
    },
  ]);

  assert.equal(plan.targetId, 2);
  // Target 2 faces -1 (left), so behind them is +42 to the right (340 + 42 = 382)
  assert.equal(plan.blinkX, 382);
  assert.equal(plan.newFacing, -1);
  assert.equal(plan.isLethalExecute, true);
  assert.equal(plan.resetsCooldownOnKillOrBreak, true);
});

test('Hades / DMC Combat Style Rank scales from D to SSS with damage and karma multipliers', () => {
  const rankD = computeCombatStyleStatus(10);
  const rankS = computeCombatStyleStatus(480);
  const rankSSS = computeCombatStyleStatus(950);

  assert.equal(rankD.grade, 'D');
  assert.equal(rankS.grade, 'S');
  assert.equal(rankSSS.grade, 'SSS');
  assert.ok(rankSSS.damageBonusMultiplier > rankS.damageBonusMultiplier);
  assert.ok(rankS.damageBonusMultiplier > rankD.damageBonusMultiplier);
});
