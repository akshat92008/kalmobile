// ============================================================================
// KALIYUGA: PILLARS 4 & 5 — DEEP RPG ASPECT FORGE, RELIC SET RESONANCE,
// DIEGETIC [E] LOOK CHRONICLE ENGINE & ENDGAME PACT OF THE BLEEDING CROWN
// ============================================================================

import { WeaponId } from './rules';
import { EquippedGearMap, GEAR_ITEMS } from './partySystem';
import { ACT1_LOOK_OBJECTS, LookObjectSpec, SANJAYA_CORRECTIONS, SanjayaCorrectionSpec } from '@/engine/v7StoryEngine';

// ============================================================================
// PILLAR 4: VISHWAKARMA WEAPON ASPECT FORGE & SOVEREIGN RELIC SET RESONANCE
// ============================================================================

export type WeaponAspectRanks = Record<WeaponId, number>;

export const INITIAL_WEAPON_ASPECT_RANKS: WeaponAspectRanks = {
  twin_blades: 1,
  jingu_bang: 1,
  dragon_glaive: 1,
};

export interface WeaponAspectSpec {
  weaponId: WeaponId;
  aspectName: string;
  sanskritTitle: string;
  passiveTitle: string;
  passiveDescription: string;
  accentColor: string;
  baseProcDamage: number;
  procDamagePerRank: number;
  bonusCritPctPerRank: number;
  bonusPosturePctPerRank: number;
}

export const WEAPON_ASPECT_SPECS: Record<WeaponId, WeaponAspectSpec> = {
  twin_blades: {
    weaponId: 'twin_blades',
    aspectName: 'Aspect of Raktabeeja’s Fang',
    sanskritTitle: 'रक्तबीज दंष्ट्रा · HEMORRHAGE CLEAVERS',
    passiveTitle: 'Crimson Hemorrhage Detonation',
    passiveDescription:
      'Every 4th-hit combo finisher and Shadow Assassination detonates a Crimson Hemorrhage burst and grants +Crit Chance per rank.',
    accentColor: '#ff4d5e',
    baseProcDamage: 42,
    procDamagePerRank: 16,
    bonusCritPctPerRank: 4,
    bonusPosturePctPerRank: 5,
  },
  jingu_bang: {
    weaponId: 'jingu_bang',
    aspectName: 'Aspect of Mahabali’s Oath',
    sanskritTitle: 'महाबलि गदा · SEISMIC KHANDA-PARASHU',
    passiveTitle: 'Patala Tectonic Tremor',
    passiveDescription:
      'Heavy Stance Unleash and Golden Parry Ripostes trigger a secondary Patala Seismic Shockwave and amplify Posture Shatter per rank.',
    accentColor: '#f5c451',
    baseProcDamage: 56,
    procDamagePerRank: 20,
    bonusCritPctPerRank: 3,
    bonusPosturePctPerRank: 9,
  },
  dragon_glaive: {
    weaponId: 'dragon_glaive',
    aspectName: 'Aspect of the Brahmashira',
    sanskritTitle: 'ब्रह्मशिर त्रिशूल · ASTRAL TRIDENT-AXE',
    passiveTitle: 'White-Fire Astral Lance',
    passiveDescription:
      'Dash-Strikes and Heavy Lunges project a piercing White-Fire Astral Lance that arcs through enemies and boosts Crit & Posture damage.',
    accentColor: '#38bdf8',
    baseProcDamage: 64,
    procDamagePerRank: 22,
    bonusCritPctPerRank: 5,
    bonusPosturePctPerRank: 7,
  },
};

export function getWeaponAspectUpgradeCost(currentRank: number): number {
  const clamped = Math.max(1, Math.min(5, currentRank));
  return 75 + (clamped - 1) * 55;
}

export function upgradeWeaponAspectRank(
  weaponId: WeaponId,
  ranks: WeaponAspectRanks,
  availableKarma: number
): {
  ranks: WeaponAspectRanks;
  availableKarma: number;
  upgraded: boolean;
} {
  const current = ranks[weaponId] ?? 1;
  if (current >= 5) {
    return { ranks, availableKarma, upgraded: false };
  }
  const cost = getWeaponAspectUpgradeCost(current);
  if (availableKarma < cost) {
    return { ranks, availableKarma, upgraded: false };
  }
  return {
    ranks: {
      ...ranks,
      [weaponId]: current + 1,
    },
    availableKarma: availableKarma - cost,
    upgraded: true,
  };
}

export interface ComputedWeaponAspectBonuses {
  aspectRank: number;
  aspectSpec: WeaponAspectSpec;
  procDamage: number;
  bonusCritChance: number;
  postureMultiplier: number;
  damageMultiplier: number;
}

export function computeWeaponAspectBonuses(
  weaponId: WeaponId,
  ranks: WeaponAspectRanks
): ComputedWeaponAspectBonuses {
  const spec = WEAPON_ASPECT_SPECS[weaponId];
  const rank = Math.max(1, Math.min(5, ranks[weaponId] ?? 1));
  const extraRanks = rank - 1;

  const procDamage = Math.round(spec.baseProcDamage + extraRanks * spec.procDamagePerRank);
  const bonusCritChance = Number((( rank * spec.bonusCritPctPerRank) / 100).toFixed(3));
  const postureMultiplier = Number((1 + (rank * spec.bonusPosturePctPerRank) / 100).toFixed(3));
  const damageMultiplier = Number((1 + extraRanks * 0.06).toFixed(3));

  return {
    aspectRank: rank,
    aspectSpec: spec,
    procDamage,
    bonusCritChance,
    postureMultiplier,
    damageMultiplier,
  };
}

export interface RelicSetResonance {
  activeSetName: string | null;
  sovereignCount: number;
  setDamageBonusMultiplier: number;
  setCritBonus: number;
  chamberWardShieldHp: number;
}

/**
 * Evaluates whether the player's 3 equipped relics activate the Chola Sovereign Set Resonance.
 */
export function computeRelicSetResonance(equipped: EquippedGearMap): RelicSetResonance {
  const equippedSpecs = Object.values(equipped)
    .map((id) => GEAR_ITEMS.find((g) => g.id === id))
    .filter(Boolean);

  const sovereignCount = equippedSpecs.filter((g) => g?.rarity === 'Sovereign').length;

  if (sovereignCount >= 3) {
    return {
      activeSetName: 'CHOLA SOVEREIGN SET (3/3)',
      sovereignCount,
      setDamageBonusMultiplier: 1.15,
      setCritBonus: 0.1,
      chamberWardShieldHp: 35,
    };
  }
  if (sovereignCount === 2) {
    return {
      activeSetName: 'SOVEREIGN HARMONY (2/3)',
      sovereignCount,
      setDamageBonusMultiplier: 1.07,
      setCritBonus: 0.05,
      chamberWardShieldHp: 15,
    };
  }
  return {
    activeSetName: null,
    sovereignCount,
    setDamageBonusMultiplier: 1.0,
    setCritBonus: 0,
    chamberWardShieldHp: 0,
  };
}

// ============================================================================
// PILLAR 5: DIEGETIC IN-ARENA [E] LOOK DISCOVERY, SANJAYA LIVE CHRONICLE
// & ENDGAME PACT OF THE BLEEDING CROWN (CALAMITY HEAT SYSTEM)
// ============================================================================

export type CalamityOathId =
  | 'fury_of_sabha'
  | 'ironclad_vetalas'
  | 'starving_furnace'
  | 'dimming_wick';

export interface CalamityOathSpec {
  id: CalamityOathId;
  title: string;
  sanskritName: string;
  heatValue: number;
  description: string;
  rewardBonusLabel: string;
}

export const CALAMITY_OATH_SPECS: CalamityOathSpec[] = [
  {
    id: 'fury_of_sabha',
    title: 'Oath of the Burning Sabha',
    sanskritName: 'सभा क्रोध · +20% FOE AGGRESSION',
    heatValue: 2,
    description: 'Enemies and Bosses strike with 20% faster windups and pursuit speed.',
    rewardBonusLabel: '+30% Ashen Karma & XP',
  },
  {
    id: 'ironclad_vetalas',
    title: 'Oath of Chola Bronze',
    sanskritName: 'चोल कवच · +25% FOE VITALITY & POSTURE',
    heatValue: 3,
    description: 'All Kurukshetra foes and Wardens gain +25% Max HP and Posture resilience.',
    rewardBonusLabel: '+45% Ashen Karma & XP',
  },
  {
    id: 'starving_furnace',
    title: 'Oath of the Starving Furnace',
    sanskritName: 'वृकोदर क्षुधा · +30% HAZARD LETHALITY',
    heatValue: 3,
    description: 'Enemy heavy cleaves, magma slag fissures, and pressure traps deal +30% damage.',
    rewardBonusLabel: '+45% Ashen Karma & XP',
  },
  {
    id: 'dimming_wick',
    title: 'Oath of the Dimming Wick',
    sanskritName: 'सावित्री दीप · -1 KALASHA SIP',
    heatValue: 4,
    description: 'Savitri’s lantern burns cooler; begins each run with 1 fewer Amrita Kalasha sip.',
    rewardBonusLabel: '+60% Ashen Karma & XP',
  },
];

export interface CalamityPactModifiers {
  totalHeat: number;
  enemyHpMultiplier: number;
  enemyPostureMultiplier: number;
  enemySpeedMultiplier: number;
  enemyDamageMultiplier: number;
  kalashaSipPenalty: number;
  karmaAndXpMultiplier: number;
}

export function computeCalamityPactModifiers(
  activeOaths: CalamityOathId[]
): CalamityPactModifiers {
  const set = new Set<CalamityOathId>(activeOaths);
  let totalHeat = 0;
  let enemyHpMultiplier = 1.0;
  let enemyPostureMultiplier = 1.0;
  let enemySpeedMultiplier = 1.0;
  let enemyDamageMultiplier = 1.0;
  let kalashaSipPenalty = 0;
  let bonusRewardPct = 0;

  for (const spec of CALAMITY_OATH_SPECS) {
    if (set.has(spec.id)) {
      totalHeat += spec.heatValue;
    }
  }

  if (set.has('fury_of_sabha')) {
    enemySpeedMultiplier = 1.2;
    bonusRewardPct += 30;
  }
  if (set.has('ironclad_vetalas')) {
    enemyHpMultiplier = 1.25;
    enemyPostureMultiplier = 1.25;
    bonusRewardPct += 45;
  }
  if (set.has('starving_furnace')) {
    enemyDamageMultiplier = 1.3;
    bonusRewardPct += 45;
  }
  if (set.has('dimming_wick')) {
    kalashaSipPenalty = 1;
    bonusRewardPct += 60;
  }

  return {
    totalHeat,
    enemyHpMultiplier: Number(enemyHpMultiplier.toFixed(2)),
    enemyPostureMultiplier: Number(enemyPostureMultiplier.toFixed(2)),
    enemySpeedMultiplier: Number(enemySpeedMultiplier.toFixed(2)),
    enemyDamageMultiplier: Number(enemyDamageMultiplier.toFixed(2)),
    kalashaSipPenalty,
    karmaAndXpMultiplier: Number((1 + bonusRewardPct / 100).toFixed(2)),
  };
}

/**
 * Finds the LookObjectSpec in the given chamber and determines if Rudra is within interactive range.
 */
export function findChamberLookArtifactState(params: {
  chamberId: number;
  playerX: number;
  playerY: number;
  discoveredLooks: string[];
  interactionRadiusPx?: number;
}): {
  artifact: LookObjectSpec | null;
  alreadyExamined: boolean;
  distancePx: number;
  inRange: boolean;
} {
  const artifact = ACT1_LOOK_OBJECTS.find((obj) => obj.chamberId === params.chamberId) ?? null;
  if (!artifact) {
    return {
      artifact: null,
      alreadyExamined: false,
      distancePx: Infinity,
      inRange: false,
    };
  }
  const alreadyExamined = params.discoveredLooks.includes(artifact.id);
  const dist = Math.hypot(params.playerX - artifact.x, params.playerY - artifact.y);
  const radius = params.interactionRadiusPx ?? 185;

  return {
    artifact,
    alreadyExamined,
    distancePx: Math.round(dist),
    inRange: dist <= radius,
  };
}

/**
 * Computes which of Sanjaya's 7 Strikethrough Corrections are unlocked based on
 * collected Shards and discovered [E] Look threads.
 */
export function getUnlockedSanjayaCorrections(params: {
  shardsCollected: number;
  looksCount: number;
  dundubhiCleared: boolean;
}): {
  unlockedCount: number;
  latestCorrection: SanjayaCorrectionSpec;
  sparrowWingBandaged: boolean;
} {
  const progressScore =
    Math.max(0, params.shardsCollected) * 2 +
    Math.floor(Math.max(0, params.looksCount) / 1) +
    (params.dundubhiCleared ? 1 : 0);

  const unlockedCount = Math.max(
    1,
    Math.min(SANJAYA_CORRECTIONS.length, 1 + Math.floor(progressScore / 2))
  );
  const latestCorrection =
    SANJAYA_CORRECTIONS[Math.min(SANJAYA_CORRECTIONS.length - 1, unlockedCount - 1)];

  return {
    unlockedCount,
    latestCorrection,
    sparrowWingBandaged: params.looksCount >= 3,
  };
}
