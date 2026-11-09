import test from 'node:test';
import assert from 'node:assert/strict';
import {
  selectBossSignatureMove,
  computeBossVulnerabilityMultiplier,
  evaluateMoltenSlagHazard,
  findBaitablePillarOnTrajectory,
} from './bossEncounters';

test('selectBossSignatureMove returns phase-locked signature attacks and prioritizes pillar gore at range', () => {
  const p1Gore = selectBossSignatureMove({
    bossType: 'xuemo',
    phase: 1,
    attackPatternIndex: 0,
    distanceToPlayerPx: 240,
    hasIntactPillars: true,
  });
  assert.equal(p1Gore.id, 'brahmadanda_horn_gore');
  assert.equal(p1Gore.attackKind, 'corridor');

  const p2Gore = selectBossSignatureMove({
    bossType: 'xuemo',
    phase: 2,
    attackPatternIndex: 2,
    distanceToPlayerPx: 250,
    hasIntactPillars: true,
  });
  assert.equal(p2Gore.id, 'rakta_double_gore');
  assert.equal(p2Gore.comboFollowups, 1);

  const vrikodaraP2Slag = selectBossSignatureMove({
    bossType: 'vrikodara',
    phase: 2,
    attackPatternIndex: 1,
    distanceToPlayerPx: 150,
    hasIntactPillars: false,
  });
  assert.equal(vrikodaraP2Slag.id, 'vaitarani_slag_eruption');
  assert.equal(vrikodaraP2Slag.spawnsMoltenSlag, true);
});

test('computeBossVulnerabilityMultiplier rewards pillar tusk-lodging and cracked drum armor', () => {
  const intact = computeBossVulnerabilityMultiplier({
    bossType: 'xuemo',
    phase: 1,
    armorCracked: false,
    tuskLodgedTimer: 0,
    aiState: 'chase',
  });
  assert.equal(intact.damageMultiplier, 0.85);

  const lodged = computeBossVulnerabilityMultiplier({
    bossType: 'xuemo',
    phase: 1,
    armorCracked: true,
    tuskLodgedTimer: 2.4,
    aiState: 'recover',
  });
  assert.equal(lodged.damageMultiplier, 1.65);
  assert.ok(lodged.vulnerabilityCallout?.includes('TUSKS LODGED'));

  const vrikodaraExposed = computeBossVulnerabilityMultiplier({
    bossType: 'vrikodara',
    phase: 2,
    armorCracked: false,
    tuskLodgedTimer: 0,
    aiState: 'recover',
  });
  assert.equal(vrikodaraExposed.damageMultiplier, 1.35);
});

test('evaluateMoltenSlagHazard detects grounded actors inside magma fissures and exempts elevated Pillar stance', () => {
  const fissures = [
    {
      x1: 200,
      y1: 300,
      x2: 500,
      y2: 300,
      width: 36,
      life: 5.0,
      maxLife: 6.5,
    },
  ];

  const insideGrounded = evaluateMoltenSlagHazard({
    px: 350,
    py: 306,
    elevationY: 0,
    fissures,
  });
  assert.equal(insideGrounded.inSlag, true);
  assert.equal(insideGrounded.burnDamagePerTick, 9);
  assert.equal(insideGrounded.moveSpeedMultiplier, 0.76);

  const insideElevated = evaluateMoltenSlagHazard({
    px: 350,
    py: 306,
    elevationY: 16,
    fissures,
  });
  assert.equal(insideElevated.inSlag, false);
});

test('findBaitablePillarOnTrajectory locks onto intact dragon pillars along Dundubhi charge line', () => {
  const pillars = [
    { id: 1, x: 420, y: 300, destroyed: false, type: 'dragon_pillar' },
    { id: 2, x: 180, y: 650, destroyed: false, type: 'dragon_pillar' },
  ];
  const res = findBaitablePillarOnTrajectory({
    bossX: 200,
    bossY: 300,
    aimAngle: 0,
    pillars,
  });
  assert.ok(res);
  assert.equal(res.id, 1);
  assert.equal(res.willImpact, true);
});
