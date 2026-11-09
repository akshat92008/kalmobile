import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_WEAPON_ASPECT_RANKS,
  upgradeWeaponAspectRank,
  computeWeaponAspectBonuses,
  computeRelicSetResonance,
  computeCalamityPactModifiers,
  findChamberLookArtifactState,
  getUnlockedSanjayaCorrections,
} from './pillars4And5Engine';

test('Pillar 4: upgradeWeaponAspectRank deducts karma and scales aspect proc & posture bonuses up to rank 5', () => {
  const initial = { ...INITIAL_WEAPON_ASPECT_RANKS };
  const baseBonus = computeWeaponAspectBonuses('jingu_bang', initial);
  assert.equal(baseBonus.aspectRank, 1);

  const res = upgradeWeaponAspectRank('jingu_bang', initial, 200);
  assert.equal(res.upgraded, true);
  assert.equal(res.ranks.jingu_bang, 2);
  assert.equal(res.availableKarma, 125); // 200 - 75

  const rank2Bonus = computeWeaponAspectBonuses('jingu_bang', res.ranks);
  assert.equal(rank2Bonus.procDamage > baseBonus.procDamage, true);
  assert.equal(rank2Bonus.postureMultiplier > baseBonus.postureMultiplier, true);
  assert.equal(rank2Bonus.damageMultiplier > 1.0, true);
});

test('Pillar 4: computeRelicSetResonance detects 3/3 Chola Sovereign Set and 2/3 Sovereign Harmony', () => {
  const fullSovereign = computeRelicSetResonance({
    kavacha_plate: 'surya_kavacha',
    divya_ring: 'kaustubha_signet',
    war_warhorn: 'panchajanya_conch',
  });
  assert.equal(fullSovereign.sovereignCount, 3);
  assert.equal(fullSovereign.setDamageBonusMultiplier, 1.15);
  assert.equal(fullSovereign.chamberWardShieldHp, 35);

  const twoSovereign = computeRelicSetResonance({
    kavacha_plate: 'raktabija_mail',
    divya_ring: 'kaustubha_signet',
    war_warhorn: 'panchajanya_conch',
  });
  assert.equal(twoSovereign.sovereignCount, 2);
  assert.equal(twoSovereign.setDamageBonusMultiplier, 1.07);
});

test('Pillar 5: computeCalamityPactModifiers aggregates Heat, enemy scaling, and Karma/XP reward multipliers', () => {
  const zeroPact = computeCalamityPactModifiers([]);
  assert.equal(zeroPact.totalHeat, 0);
  assert.equal(zeroPact.karmaAndXpMultiplier, 1.0);

  const activePact = computeCalamityPactModifiers([
    'fury_of_sabha',
    'ironclad_vetalas',
    'starving_furnace',
  ]);
  assert.equal(activePact.totalHeat, 8);
  assert.equal(activePact.enemySpeedMultiplier, 1.2);
  assert.equal(activePact.enemyHpMultiplier, 1.25);
  assert.equal(activePact.enemyDamageMultiplier, 1.3);
  assert.equal(activePact.karmaAndXpMultiplier, 2.2); // +120%
});

test('Pillar 5: findChamberLookArtifactState locates chamber Look object and checks proximity & examined status', () => {
  const near = findChamberLookArtifactState({
    chamberId: 1,
    playerX: 250,
    playerY: 450,
    discoveredLooks: [],
  });
  assert.equal(near.artifact?.id, 'boat_folded_page');
  assert.equal(near.inRange, true);
  assert.equal(near.alreadyExamined, false);

  const examined = findChamberLookArtifactState({
    chamberId: 1,
    playerX: 250,
    playerY: 450,
    discoveredLooks: ['boat_folded_page'],
  });
  assert.equal(examined.alreadyExamined, true);
});

test('Pillar 5: getUnlockedSanjayaCorrections unlocks strikethrough truths and bandages sparrow wing at 3+ looks', () => {
  const start = getUnlockedSanjayaCorrections({
    shardsCollected: 0,
    looksCount: 1,
    dundubhiCleared: false,
  });
  assert.equal(start.sparrowWingBandaged, false);
  assert.equal(start.unlockedCount, 1);

  const progressed = getUnlockedSanjayaCorrections({
    shardsCollected: 1,
    looksCount: 3,
    dundubhiCleared: true,
  });
  assert.equal(progressed.sparrowWingBandaged, true);
  assert.equal(progressed.unlockedCount >= 4, true);
});
