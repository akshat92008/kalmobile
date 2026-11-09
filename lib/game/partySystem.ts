import { GAME_ASSETS } from './assets';

export type CompanionId = 'savitri' | 'sanjaya' | 'vishnu_guardian';
export type CompanionRole = 'healer_support' | 'ranged_tactician' | 'vanguard_tank';
export type PartyTacticMode = 'aggressive' | 'protective' | 'boss_focus';

export interface CompanionSpec {
  id: CompanionId;
  name: string;
  sanskritTitle: string;
  role: CompanionRole;
  roleLabel: string;
  portraitUrl: string;
  spriteUrl: string;
  accentColor: string;
  auraColor: string;
  baseHp: number;
  baseDamage: number;
  basePostureDamage: number;
  attackRangePx: number;
  attackCooldownSec: number;
  moveSpeedPx: number;
  passiveName: string;
  passiveDesc: string;
  linkUltimateName: string;
  linkUltimateDesc: string;
  linkCooldownSec: number;
}

export const COMPANION_SPECS: Record<CompanionId, CompanionSpec> = {
  savitri: {
    id: 'savitri',
    name: 'Savitri',
    sanskritTitle: 'VAITARANI FLAME-WEAVER',
    role: 'healer_support',
    roleLabel: 'HEALER · SHIELD',
    portraitUrl: GAME_ASSETS.portraits.savitri,
    spriteUrl: GAME_ASSETS.rudra.heal,
    accentColor: '#3ee0a8',
    auraColor: 'rgba(62, 224, 168, 0.35)',
    baseHp: 210,
    baseDamage: 24,
    basePostureDamage: 32,
    attackRangePx: 230,
    attackCooldownSec: 1.05,
    moveSpeedPx: 225,
    passiveName: 'Suvarna Lantern Grace',
    passiveDesc: '+18% Amrita Healing & periodically mends Rudra for 12 HP in combat',
    linkUltimateName: 'LOTUS SANCTUARY NOVA',
    linkUltimateDesc: 'Heals Rudra for 55+ HP, grants 3s Invulnerability Ward & blasts nearby foes',
    linkCooldownSec: 12,
  },
  sanjaya: {
    id: 'sanjaya',
    name: 'Sanjaya',
    sanskritTitle: 'DIVYA-DRISHTI SEER',
    role: 'ranged_tactician',
    roleLabel: 'ARCHER · CRIT MARK',
    portraitUrl: GAME_ASSETS.portraits.sanjaya,
    spriteUrl: GAME_ASSETS.rudra.astra,
    accentColor: '#38bdf8',
    auraColor: 'rgba(56, 189, 248, 0.35)',
    baseHp: 195,
    baseDamage: 34,
    basePostureDamage: 44,
    attackRangePx: 320,
    attackCooldownSec: 0.92,
    moveSpeedPx: 235,
    passiveName: 'All-Seeing Divya-Drishti',
    passiveDesc: '+15% Critical Hit Chance & marks enemies to take +20% Posture Damage',
    linkUltimateName: 'AGNEYASTRA ARROW STORM',
    linkUltimateDesc: 'Rains blazing astral arrows across all enemies & applies Scorch DoT',
    linkCooldownSec: 11,
  },
  vishnu_guardian: {
    id: 'vishnu_guardian',
    name: 'Sudarshana Sentinel',
    sanskritTitle: 'BLUE-GOLD DIVINE GUARDIAN',
    role: 'vanguard_tank',
    roleLabel: 'VANGUARD · BREAKER',
    portraitUrl: GAME_ASSETS.portraits.preserver,
    spriteUrl: GAME_ASSETS.rudra.slam,
    accentColor: '#f5c451',
    auraColor: 'rgba(245, 196, 81, 0.38)',
    baseHp: 290,
    baseDamage: 38,
    basePostureDamage: 68,
    attackRangePx: 92,
    attackCooldownSec: 0.85,
    moveSpeedPx: 255,
    passiveName: 'Kavacha Bulwark',
    passiveDesc: '-15% Damage Taken for Rudra & +25% Party Posture Break Power',
    linkUltimateName: 'CHAKRA CATACLYSM SLAM',
    linkUltimateDesc: 'Crushes enemy shields across a 240px radius & inflicts massive Posture Break',
    linkCooldownSec: 13,
  },
};

export const ALL_COMPANION_IDS: CompanionId[] = ['savitri', 'sanjaya', 'vishnu_guardian'];

export type CompanionBondRanks = Record<CompanionId, number>;

export const INITIAL_COMPANION_BONDS: CompanionBondRanks = {
  savitri: 1,
  sanjaya: 1,
  vishnu_guardian: 1,
};

export function getCompanionBondUpgradeCost(currentRank: number): number {
  return 60 + Math.max(0, currentRank - 1) * 45;
}

export function upgradeCompanionBond(
  id: CompanionId,
  bonds: CompanionBondRanks,
  availableKarma: number
): { bonds: CompanionBondRanks; availableKarma: number; upgraded: boolean } {
  const rank = bonds[id] ?? 1;
  if (rank >= 5) {
    return { bonds, availableKarma, upgraded: false };
  }
  const cost = getCompanionBondUpgradeCost(rank);
  if (availableKarma < cost) {
    return { bonds, availableKarma, upgraded: false };
  }
  return {
    bonds: {
      ...bonds,
      [id]: rank + 1,
    },
    availableKarma: availableKarma - cost,
    upgraded: true,
  };
}

export function computeCompanionStats(id: CompanionId, bondRank: number): {
  maxHp: number;
  attackDamage: number;
  postureDamage: number;
  healPower: number;
  cooldownMultiplier: number;
} {
  const spec = COMPANION_SPECS[id];
  const rank = Math.max(1, Math.min(5, bondRank));
  const scale = 1 + (rank - 1) * 0.18;
  return {
    maxHp: Math.round(spec.baseHp * scale),
    attackDamage: Math.round(spec.baseDamage * scale),
    postureDamage: Math.round(spec.basePostureDamage * scale),
    healPower: Math.round((48 + (rank - 1) * 14)),
    cooldownMultiplier: Number(Math.max(0.68, 1 - (rank - 1) * 0.06).toFixed(2)),
  };
}

export function getNextPartyTacticMode(current: PartyTacticMode): PartyTacticMode {
  if (current === 'aggressive') return 'protective';
  if (current === 'protective') return 'boss_focus';
  return 'aggressive';
}

export function computePartyPassiveBonuses(
  activeCompanions: CompanionId[],
  bonds: CompanionBondRanks
): {
  bonusHealMultiplier: number;
  bonusCritChance: number;
  bonusPostureMultiplier: number;
  damageReductionRatio: number;
  passiveRegenPer5Sec: number;
} {
  let bonusHealMultiplier = 1.0;
  let bonusCritChance = 0;
  let bonusPostureMultiplier = 1.0;
  let damageReductionRatio = 0;
  let passiveRegenPer5Sec = 0;

  for (const id of activeCompanions) {
    const rank = Math.max(1, bonds[id] ?? 1);
    if (id === 'savitri') {
      bonusHealMultiplier += 0.18 + (rank - 1) * 0.04;
      passiveRegenPer5Sec += 10 + (rank - 1) * 3;
    } else if (id === 'sanjaya') {
      bonusCritChance += 0.15 + (rank - 1) * 0.03;
      bonusPostureMultiplier += 0.2 + (rank - 1) * 0.04;
    } else if (id === 'vishnu_guardian') {
      damageReductionRatio += Math.min(0.32, 0.15 + (rank - 1) * 0.03);
      bonusPostureMultiplier += 0.25 + (rank - 1) * 0.05;
    }
  }

  return {
    bonusHealMultiplier: Number(bonusHealMultiplier.toFixed(2)),
    bonusCritChance: Number(Math.min(0.65, bonusCritChance).toFixed(2)),
    bonusPostureMultiplier: Number(bonusPostureMultiplier.toFixed(2)),
    damageReductionRatio: Number(Math.min(0.45, damageReductionRatio).toFixed(2)),
    passiveRegenPer5Sec: Math.round(passiveRegenPer5Sec),
  };
}

export interface CompanionTargetCandidate {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  isBoss: boolean;
}

/**
 * Selects the optimal enemy target for a Party Companion based on active PartyTacticMode:
 * - 'boss_focus': prioritizes bosses or highest maxHp targets
 * - 'protective': prioritizes enemies closest to Rudra
 * - 'aggressive': prioritizes enemies closest to the companion
 */
export function selectCompanionTarget(params: {
  companionX: number;
  companionY: number;
  playerX: number;
  playerY: number;
  tactic: PartyTacticMode;
  candidates: CompanionTargetCandidate[];
}): CompanionTargetCandidate | null {
  if (params.candidates.length === 0) return null;

  if (params.tactic === 'boss_focus') {
    const boss = params.candidates.find((c) => c.isBoss);
    if (boss) return boss;
    return [...params.candidates].sort((a, b) => b.maxHp - a.maxHp)[0] ?? null;
  }

  if (params.tactic === 'protective') {
    let best: CompanionTargetCandidate | null = null;
    let bestDist = Infinity;
    for (const c of params.candidates) {
      const d = Math.hypot(c.x - params.playerX, c.y - params.playerY);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    return best;
  }

  let best: CompanionTargetCandidate | null = null;
  let bestDist = Infinity;
  for (const c of params.candidates) {
    const d = Math.hypot(c.x - params.companionX, c.y - params.companionY);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

// ============================================================================
// MODERN RPG GEAR, RELICS & LOADOUT SYSTEM
// ============================================================================

export type GearSlot = 'kavacha_plate' | 'divya_ring' | 'war_warhorn';
export type GearRarity = 'Epic' | 'Mythic' | 'Sovereign';

export interface GearItemSpec {
  id: string;
  slot: GearSlot;
  name: string;
  sanskritName: string;
  rarity: GearRarity;
  description: string;
  accentColor: string;
  baseMaxHpBonus: number;
  baseDamagePct: number;
  baseCritChancePct: number;
  baseLifestealPct: number;
  baseSynergyGainPct: number;
}

export const GEAR_ITEMS: GearItemSpec[] = [
  // Slot 1: Kavacha Armor Plates
  {
    id: 'surya_kavacha',
    slot: 'kavacha_plate',
    name: 'Solar Kavacha of Karna',
    sanskritName: 'सूर्य कवच',
    rarity: 'Sovereign',
    description: 'Sun-forged golden breastplate that bolsters Max Vitality and Critical Strike lethality.',
    accentColor: '#f5c451',
    baseMaxHpBonus: 45,
    baseDamagePct: 12,
    baseCritChancePct: 8,
    baseLifestealPct: 0,
    baseSynergyGainPct: 15,
  },
  {
    id: 'raktabija_mail',
    slot: 'kavacha_plate',
    name: 'Blood-forged Asura Hauberk',
    sanskritName: 'रक्तबीज वर्म',
    rarity: 'Mythic',
    description: 'Drinks battlefield marrow, granting Lifesteal on every Heavy and Combo Finisher strike.',
    accentColor: '#ff4d5e',
    baseMaxHpBonus: 30,
    baseDamagePct: 16,
    baseCritChancePct: 5,
    baseLifestealPct: 6,
    baseSynergyGainPct: 10,
  },
  // Slot 2: Divya Talisman Rings
  {
    id: 'kaustubha_signet',
    slot: 'divya_ring',
    name: 'Kaustubha Ocean Signet',
    sanskritName: 'कौस्तुभ मुद्रिका',
    rarity: 'Sovereign',
    description: 'Born from the Churning of the Ocean; amplifies Critical Chance and Party Link charge speed.',
    accentColor: '#38bdf8',
    baseMaxHpBonus: 20,
    baseDamagePct: 14,
    baseCritChancePct: 14,
    baseLifestealPct: 3,
    baseSynergyGainPct: 25,
  },
  {
    id: 'rudraksha_agni_band',
    slot: 'divya_ring',
    name: 'Ashen Rudraksha Band',
    sanskritName: 'रुद्राक्ष अग्नि',
    rarity: 'Epic',
    description: 'Charred Rudraksha beads that intensify raw weapon and stance damage.',
    accentColor: '#ff7a2b',
    baseMaxHpBonus: 25,
    baseDamagePct: 20,
    baseCritChancePct: 6,
    baseLifestealPct: 0,
    baseSynergyGainPct: 12,
  },
  // Slot 3: Warhorns & Relics
  {
    id: 'panchajanya_conch',
    slot: 'war_warhorn',
    name: 'Panchajanya War-Conch',
    sanskritName: 'पाञ्चजन्य शङ्ख',
    rarity: 'Sovereign',
    description: 'Resonates across Kurukshetra, accelerating Companion Link Strikes and boosting Party HP.',
    accentColor: '#3ee0a8',
    baseMaxHpBonus: 35,
    baseDamagePct: 10,
    baseCritChancePct: 8,
    baseLifestealPct: 4,
    baseSynergyGainPct: 35,
  },
  {
    id: 'bhima_dundubhi_horn',
    slot: 'war_warhorn',
    name: 'Brazen Horn of Dundubhi',
    sanskritName: 'दुन्दुभि शृङ्ग',
    rarity: 'Mythic',
    description: 'Shatters enemy composure with thunderous vibrations, boosting damage and vitality.',
    accentColor: '#e5a93b',
    baseMaxHpBonus: 40,
    baseDamagePct: 18,
    baseCritChancePct: 5,
    baseLifestealPct: 2,
    baseSynergyGainPct: 18,
  },
];

export type EquippedGearMap = Record<GearSlot, string>;
export type GearUpgradeLevels = Record<string, number>;

export const INITIAL_EQUIPPED_GEAR: EquippedGearMap = {
  kavacha_plate: 'surya_kavacha',
  divya_ring: 'kaustubha_signet',
  war_warhorn: 'panchajanya_conch',
};

export const INITIAL_GEAR_LEVELS: GearUpgradeLevels = {
  surya_kavacha: 1,
  raktabija_mail: 1,
  kaustubha_signet: 1,
  rudraksha_agni_band: 1,
  panchajanya_conch: 1,
  bhima_dundubhi_horn: 1,
};

export function getGearUpgradeCost(currentLevel: number): number {
  return 55 + Math.max(0, currentLevel - 1) * 40;
}

export function upgradeGearItem(
  gearId: string,
  levels: GearUpgradeLevels,
  availableKarma: number
): { levels: GearUpgradeLevels; availableKarma: number; upgraded: boolean } {
  const lvl = levels[gearId] ?? 1;
  if (lvl >= 5) return { levels, availableKarma, upgraded: false };
  const cost = getGearUpgradeCost(lvl);
  if (availableKarma < cost) return { levels, availableKarma, upgraded: false };
  return {
    levels: {
      ...levels,
      [gearId]: lvl + 1,
    },
    availableKarma: availableKarma - cost,
    upgraded: true,
  };
}

export function computeEquippedGearBonuses(
  equipped: EquippedGearMap,
  levels: GearUpgradeLevels
): {
  bonusMaxHp: number;
  damageMultiplier: number;
  critChance: number;
  lifestealRatio: number;
  synergyGainMultiplier: number;
  gearScore: number;
} {
  let bonusMaxHp = 0;
  let totalDmgPct = 0;
  let totalCritPct = 0;
  let totalLifestealPct = 0;
  let totalSynergyPct = 0;
  let gearScore = 0;

  const slots: GearSlot[] = ['kavacha_plate', 'divya_ring', 'war_warhorn'];
  for (const slot of slots) {
    const itemId = equipped[slot];
    const spec = GEAR_ITEMS.find((g) => g.id === itemId);
    if (!spec) continue;
    const lvl = Math.max(1, Math.min(5, levels[itemId] ?? 1));
    const mult = 1 + (lvl - 1) * 0.2;
    bonusMaxHp += Math.round(spec.baseMaxHpBonus * mult);
    totalDmgPct += spec.baseDamagePct * mult;
    totalCritPct += spec.baseCritChancePct * mult;
    totalLifestealPct += spec.baseLifestealPct * mult;
    totalSynergyPct += spec.baseSynergyGainPct * mult;
    gearScore += Math.round((spec.RarityScore ?? 120) + lvl * 35);
  }

  return {
    bonusMaxHp,
    damageMultiplier: Number((1 + totalDmgPct / 100).toFixed(3)),
    critChance: Number(Math.min(0.75, totalCritPct / 100).toFixed(3)),
    lifestealRatio: Number(Math.min(0.25, totalLifestealPct / 100).toFixed(3)),
    synergyGainMultiplier: Number((1 + totalSynergyPct / 100).toFixed(3)),
    gearScore: gearScore || 360,
  };
}

declare module './partySystem' {
  interface GearItemSpec {
    RarityScore?: number;
  }
}

// ============================================================================
// MODERN QUESTS, BOUNTIES & ACHIEVEMENTS TRACKER
// ============================================================================

export type QuestId =
  | 'slay_dharma_foes'
  | 'unleash_heavy_styles'
  | 'party_link_strikes'
  | 'shatter_posture'
  | 'kalaripayattu_parries'
  | 'vanquish_wardens';

export interface QuestSpec {
  id: QuestId;
  title: string;
  category: 'WARRIOR BOUNTY' | 'PARTY TRIAL' | 'MASTERY DEED';
  description: string;
  targetCount: number;
  karmaReward: number;
  xpReward: number;
}

export const QUEST_SPECS: QuestSpec[] = [
  {
    id: 'slay_dharma_foes',
    title: 'Purge the Vaitarani Vanguard',
    category: 'WARRIOR BOUNTY',
    description: 'Vanquish Dharma-Rot legions and Rakshasa wardens across the Kurukshetra arenas.',
    targetCount: 5,
    karmaReward: 150,
    xpReward: 180,
  },
  {
    id: 'unleash_heavy_styles',
    title: 'Wrath of the Three Stances',
    category: 'MASTERY DEED',
    description: 'Unleash God-of-War Heavy Stance Attacks (Pralaya Slam, Sudarshana Vortex, or Brahmashira Lunge).',
    targetCount: 3,
    karmaReward: 125,
    xpReward: 140,
  },
  {
    id: 'party_link_strikes',
    title: 'Sworn Blood-Oath Synergy',
    category: 'PARTY TRIAL',
    description: 'Trigger Coordinated Party Link Strikes [G] with Savitri, Sanjaya, or the Divine Guardian.',
    targetCount: 2,
    karmaReward: 160,
    xpReward: 200,
  },
  {
    id: 'shatter_posture',
    title: 'Shatter the Iron Guard',
    category: 'WARRIOR BOUNTY',
    description: 'Inflict Posture Breaks or Lethal Executions [F] on enemy warriors.',
    targetCount: 2,
    karmaReward: 140,
    xpReward: 160,
  },
  {
    id: 'kalaripayattu_parries',
    title: 'Unyielding Kalaripayattu Stance',
    category: 'MASTERY DEED',
    description: 'Execute Kalaripayattu Guard Parries [T] or Pinaka Bow Immobilize casts [Q].',
    targetCount: 3,
    karmaReward: 120,
    xpReward: 130,
  },
  {
    id: 'vanquish_wardens',
    title: 'Slayer of Chola Sovereigns',
    category: 'WARRIOR BOUNTY',
    description: 'Clear Chamber Waves or defeat Mini-Boss Wardens & Sovereign Bosses.',
    targetCount: 2,
    karmaReward: 220,
    xpReward: 280,
  },
];

export interface QuestProgressItem {
  progress: number;
  claimed: boolean;
}

export type QuestStateMap = Record<QuestId, QuestProgressItem>;

export const INITIAL_QUEST_STATE: QuestStateMap = {
  slay_dharma_foes: { progress: 1, claimed: false },
  unleash_heavy_styles: { progress: 1, claimed: false },
  party_link_strikes: { progress: 0, claimed: false },
  shatter_posture: { progress: 0, claimed: false },
  kalaripayattu_parries: { progress: 1, claimed: false },
  vanquish_wardens: { progress: 0, claimed: false },
};

export function incrementQuestMetric(
  state: QuestStateMap,
  questId: QuestId,
  amount = 1
): { nextState: QuestStateMap; newlyCompleted: QuestSpec | null } {
  const spec = QUEST_SPECS.find((q) => q.id === questId);
  if (!spec) return { nextState: state, newlyCompleted: null };
  const current = state[questId] ?? { progress: 0, claimed: false };
  if (current.claimed) return { nextState: state, newlyCompleted: null };

  const wasCompleted = current.progress >= spec.targetCount;
  const nextProgress = Math.min(spec.targetCount, current.progress + Math.max(1, amount));
  const nowCompleted = nextProgress >= spec.targetCount;

  return {
    nextState: {
      ...state,
      [questId]: {
        ...current,
        progress: nextProgress,
      },
    },
    newlyCompleted: !wasCompleted && nowCompleted ? spec : null,
  };
}

export function claimQuestReward(
  state: QuestStateMap,
  questId: QuestId,
  availableKarma: number,
  currentXp: number
): {
  nextState: QuestStateMap;
  availableKarma: number;
  nextXp: number;
  claimed: boolean;
} {
  const spec = QUEST_SPECS.find((q) => q.id === questId);
  if (!spec) {
    return { nextState: state, availableKarma, nextXp: currentXp, claimed: false };
  }
  const item = state[questId];
  if (!item || item.claimed || item.progress < spec.targetCount) {
    return { nextState: state, availableKarma, nextXp: currentXp, claimed: false };
  }
  return {
    nextState: {
      ...state,
      [questId]: {
        ...item,
        claimed: true,
      },
    },
    availableKarma: availableKarma + spec.karmaReward,
    nextXp: currentXp + spec.xpReward,
    claimed: true,
  };
}

export function computePlayerLevelFromXp(xp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPct: number;
  bonusMaxHp: number;
  bonusDamageMultiplier: number;
} {
  const safeXp = Math.max(0, Math.floor(xp));
  const xpPerLevel = 200;
  const level = Math.min(30, 1 + Math.floor(safeXp / xpPerLevel));
  const currentLevelXp = safeXp % xpPerLevel;
  const progressPct = Math.min(100, Math.round((currentLevelXp / xpPerLevel) * 100));
  return {
    level,
    currentLevelXp,
    nextLevelXp: xpPerLevel,
    progressPct,
    bonusMaxHp: (level - 1) * 12,
    bonusDamageMultiplier: Number((1 + (level - 1) * 0.04).toFixed(2)),
  };
}
