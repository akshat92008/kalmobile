import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateMudraButtonPress,
  computeNextMudraHints,
  MUDRA_COMBO_WINDOW_MS,
} from '../mobileComboEngine';

describe('mobileComboEngine', () => {
  it('evaluates D -> S as Shadow-Blink Assassination (dash_strike_blink)', () => {
    const step1 = evaluateMudraButtonPress([], 'D', 1000);
    assert.equal(step1.triggeredCombo, null);
    assert.deepEqual(step1.activeSequence, ['D']);
    assert.equal(step1.nextHints.S.isFinisherReady, true);
    assert.equal(step1.nextHints.S.subLabel, 'BLINK-CUT');
    assert.equal(step1.nextHints.H.isFinisherReady, true);
    assert.equal(step1.nextHints.H.subLabel, 'METEOR');

    const step2 = evaluateMudraButtonPress(step1.updatedBuffer, 'S', 1450);
    assert.ok(step2.triggeredCombo);
    assert.equal(step2.triggeredCombo.id, 'dash_strike_blink');
    assert.deepEqual(step2.activeFilamentPair, ['D', 'S']);
    assert.equal(step2.updatedBuffer.length, 0);
  });

  it('evaluates S -> S -> H as Sky-Sunder Cyclone Slam (strike_strike_heavy_whirlwind)', () => {
    const s1 = evaluateMudraButtonPress([], 'S', 1000);
    const s2 = evaluateMudraButtonPress(s1.updatedBuffer, 'S', 1300);
    assert.equal(s2.triggeredCombo, null);
    assert.equal(s2.nextHints.H.isFinisherReady, true);
    assert.equal(s2.nextHints.H.subLabel, 'CYCLONE');

    const s3 = evaluateMudraButtonPress(s2.updatedBuffer, 'H', 1650);
    assert.ok(s3.triggeredCombo);
    assert.equal(s3.triggeredCombo.id, 'strike_strike_heavy_whirlwind');
  });

  it('evaluates S -> H -> S as Ashen Phantom Tri-Slash (strike_heavy_strike_mirage)', () => {
    const s1 = evaluateMudraButtonPress([], 'S', 2000);
    const s2 = evaluateMudraButtonPress(s1.updatedBuffer, 'H', 2350);
    assert.equal(s2.triggeredCombo, null);
    assert.equal(s2.nextHints.S.isFinisherReady, true);
    assert.equal(s2.nextHints.S.subLabel, 'PHANTOMS');

    const s3 = evaluateMudraButtonPress(s2.updatedBuffer, 'S', 2700);
    assert.ok(s3.triggeredCombo);
    assert.equal(s3.triggeredCombo.id, 'strike_heavy_strike_mirage');
  });

  it('evaluates P -> H and P -> D and H -> H combos', () => {
    const p1 = evaluateMudraButtonPress([], 'P', 3000);
    assert.equal(p1.nextHints.H.subLabel, 'NOVA LINK');
    assert.equal(p1.nextHints.D.subLabel, 'REWIND');
    assert.equal(p1.nextHints.S.subLabel, 'THUNDER');

    const pH = evaluateMudraButtonPress(p1.updatedBuffer, 'H', 3400);
    assert.equal(pH.triggeredCombo?.id, 'parry_heavy_cataclysm');

    const pD = evaluateMudraButtonPress(p1.updatedBuffer, 'D', 3400);
    assert.equal(pD.triggeredCombo?.id, 'parry_dash_rewind');

    const h1 = evaluateMudraButtonPress([], 'H', 4000);
    const h2 = evaluateMudraButtonPress(h1.updatedBuffer, 'H', 4500);
    assert.equal(h2.triggeredCombo?.id, 'heavy_heavy_kopa');
  });

  it('expires stale inputs beyond MUDRA_COMBO_WINDOW_MS', () => {
    const s1 = evaluateMudraButtonPress([], 'D', 1000);
    const s2 = evaluateMudraButtonPress(
      s1.updatedBuffer,
      'S',
      1000 + MUDRA_COMBO_WINDOW_MS + 200
    );
    assert.equal(s2.triggeredCombo, null);
    assert.deepEqual(s2.activeSequence, ['S']);
  });

  it('returns default hints when sequence is empty', () => {
    const hints = computeNextMudraHints([]);
    assert.equal(hints.S.subLabel, 'STRIKE');
    assert.equal(hints.H.subLabel, 'HEAVY');
    assert.equal(hints.D.subLabel, 'DASH');
    assert.equal(hints.P.subLabel, 'PARRY');
  });
});
