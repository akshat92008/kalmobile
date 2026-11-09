import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_COMPANION_BONDS,
  upgradeCompanionBond,
  computeCompanionStats,
  getNextPartyTacticMode,
  computePartyPassiveBonuses,
  selectCompanionTarget,
  INITIAL_EQUIPPED_GEAR,
  INITIAL_GEAR_LEVELS,
  upgradeGearItem,
  computeEquippedGearBonuses,
  INITIAL_QUEST_STATE,
  incrementQuestMetric,
  claimQuestReward,
  computePlayerLevelFromXp,
} from './partySystem';

test('companion bond upgrading deducts karma and increases companion stats', () => {
  const baseStats = computeCompanionStats('savitri', 1);
  const res = upgradeCompanionBond('savitri', INITIAL_COMPANION_BONDS, 200);
  assert.equal(res.upgraded, true);
  assert.equal(res.bonds.savitri, 2);
  assert.equal(res.availableKarma, 140);

  const upgradedStats = computeCompanionStats('savitri', res.bonds.savitri);
  assert.ok(upgradedStats.maxHp > baseStats.maxHp);
  assert.ok(upgradedStats.attackDamage > baseStats.attackDamage);
  assert.ok(upgradedStats.healPower > baseStats.healPower);
});

test('party tactic mode cycles through aggressive -> protective -> boss_focus', () => {
  assert.equal(getNextPartyTacticMode('aggressive'), 'protective');
  assert.equal(getNextPartyTacticMode('protective'), 'boss_focus');
  assert.equal(getNextPartyTacticMode('boss_focus'), 'aggressive');
});

test('party passive bonuses combine active companions accurately', () => {
  const bonuses = computePartyPassiveBonuses(['savitri', 'sanjaya'], {
    savitri: 2,
    sanjaya: 2,
    vishnu_guardian: 1,
  });
  assert.ok(bonuses.bonusHealMultiplier > 1.18);
  assert.ok(bonuses.bonusCritChance >= 0.18);
  assert.ok(bonuses.passiveRegenPer5Sec >= 13);
});

test('selectCompanionTarget respects aggressive, protective, and boss_focus tactics', () => {
  const candidates = [
    { id: 1, x: 120, y: 100, hp: 80, maxHp: 80, isBoss: false },
    { id: 2, x: 400, y: 400, hp: 500, maxHp: 500, isBoss: true },
    { id: 3, x: 210, y: 205, hp: 90, maxHp: 90, isBoss: false },
  ];

  // Aggressive picks closest to companion (100, 100) -> id 1
  const aggTarget = selectCompanionTarget({
    companionX: 100,
    companionY: 100,
    playerX: 200,
    playerY: 200,
    tactic: 'aggressive',
    candidates,
  });
  assert.equal(aggTarget?.id, 1);

  // Protective picks closest to player (200, 200) -> id 3
  const protTarget = selectCompanionTarget({
    companionX: 100,
    companionY: 100,
    playerX: 200,
    playerY: 200,
    tactic: 'protective',
    candidates,
  });
  assert.equal(protTarget?.id, 3);

  // Boss Focus picks boss -> id 2
  const bossTarget = selectCompanionTarget({
    companionX: 100,
    companionY: 100,
    playerX: 200,
    playerY: 200,
    tactic: 'boss_focus',
    candidates,
  });
  assert.equal(bossTarget?.id, 2);
});

test('gear loadout bonuses and upgrades scale stats and gearScore', () => {
  const baseGear = computeEquippedGearBonuses(INITIAL_EQUIPPED_GEAR, INITIAL_GEAR_LEVELS);
  assert.ok(baseGear.bonusMaxHp > 0);
  assert.ok(baseGear.damageMultiplier > 1.0);
  assert.ok(baseGear.critChance > 0);

  const upg = upgradeGearItem('surya_kavacha', INITIAL_GEAR_LEVELS, 200);
  assert.equal(upg.upgraded, true);
  assert.equal(upg.levels.surya_kavacha, 2);

  const nextGear = computeEquippedGearBonuses(INITIAL_EQUIPPED_GEAR, upg.levels);
  assert.ok(nextGear.bonusMaxHp > baseGear.bonusMaxHp);
  assert.ok(nextGear.gearScore > baseGear.gearScore);
});

test('quest progression and reward claiming updates karma and xp', () => {
  let qState = { ...INITIAL_QUEST_STATE };
  const step1 = incrementQuestMetric(qState, 'party_link_strikes', 1);
  assert.equal(step1.newlyCompleted, null);
  qState = step1.nextState;

  const step2 = incrementQuestMetric(qState, 'party_link_strikes', 1);
  assert.equal(step2.newlyCompleted?.id, 'party_link_strikes');
  qState = step2.nextState;

  const claimRes = claimQuestReward(qState, 'party_link_strikes', 500, 100);
  assert.equal(claimRes.claimed, true);
  assert.equal(claimRes.availableKarma, 660);
  assert.equal(claimRes.nextXp, 300);

  const lvlInfo = computePlayerLevelFromXp(claimRes.nextXp);
  assert.equal(lvlInfo.level, 2);
  assert.ok(lvlInfo.bonusMaxHp > 0);
});
