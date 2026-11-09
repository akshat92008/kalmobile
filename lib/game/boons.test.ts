import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CELESTIAL_BOONS,
  computeBoonModifiers,
  isShadowStrikeBackstab,
  rollCelestialBoonOffer,
} from './boons';

test('computeBoonModifiers computes accurate baseline and stacked Immortal Boon bonuses', () => {
  const base = computeBoonModifiers([]);
  assert.equal(base.damageMultiplier, 1.0);
  assert.equal(base.backstabMultiplier, 1.35);
  assert.equal(base.dashStrikeMultiplier, 1.35);
  assert.equal(base.scorchDps, 0);

  const stacked = computeBoonModifiers([
    'nezha_scorch_strike',
    'erlang_chain_lightning',
    'erlang_third_eye_crit',
    'sage_phantom_echo',
    'subhuti_spell_mastery',
  ]);
  assert.equal(stacked.scorchDps, 32);
  assert.equal(stacked.chainLightningDamage, 48);
  assert.equal(stacked.backstabMultiplier, 1.8);
  assert.equal(stacked.echoStrikeRatio, 0.35);
  assert.equal(stacked.spellCooldownMultiplier, 0.68);
});

test('isShadowStrikeBackstab detects when Wukong strikes from behind enemy facing vector', () => {
  // Enemy at x=500 facing right (+1): player at x=450 is behind
  assert.equal(isShadowStrikeBackstab({ playerX: 450, enemyX: 500, enemyFacing: 1 }), true);
  assert.equal(isShadowStrikeBackstab({ playerX: 550, enemyX: 500, enemyFacing: 1 }), false);

  // Enemy at x=500 facing left (-1): player at x=550 is behind
  assert.equal(isShadowStrikeBackstab({ playerX: 550, enemyX: 500, enemyFacing: -1 }), true);
  assert.equal(isShadowStrikeBackstab({ playerX: 450, enemyX: 500, enemyFacing: -1 }), false);
});

test('rollCelestialBoonOffer returns 3 unique unowned Celestial Boons', () => {
  const offer = rollCelestialBoonOffer(['nezha_scorch_strike'], () => 0.25);
  assert.equal(offer.length, 3);
  const ids = new Set(offer.map((b) => b.id));
  assert.equal(ids.size, 3);
  assert.equal(ids.has('nezha_scorch_strike'), false);
  assert.equal(CELESTIAL_BOONS.length, 15);
});
