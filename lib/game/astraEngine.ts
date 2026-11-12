import type { StaffStance } from './rules';

export type GadhaStance = StaffStance;

export type AstraId = 'agneyastra' | 'vayavyastra' | 'vajrastra';

export type CombatDifficulty = 'story' | 'normal' | 'hard';

export type EnemyRole = 'grunt' | 'spear_wraith' | 'guardian' | 'rakshasa_brute';

export interface AstraManifestationSpec {
  astraId: AstraId;
  stance: GadhaStance;
  title: string;
  sanskritSubtitle: string;
  energyCost: number;
  cooldownSec: number;
  supportsUpasamhara: boolean;
  upasamharaRefund: number;
  damageMultiplier: number;
  postureDamage: number;
  radius: number;
  range: number;
  statusApplied: 'burning' | 'soaked' | 'staggered' | 'marked';
  description: string;
}

export interface ActiveAstraZone {
  id: string;
  astraId: AstraId;
  stance: GadhaStance;
  x: number;
  y: number;
  radius: number;
  remainingSec: number;
  maxSec: number;
  tickTimer: number;
  followsPlayer: boolean;
  color: string;
}

export interface NarayanastraTrialState {
  active: boolean;
  invokerEnemyId: string | null;
  invokerName: string;
  calmTimerSec: number;
  requiredCalmSec: number;
  escalationStacks: number;
  remainingWindowSec: number;
  resolved: 'none' | 'surrendered_passed' | 'violated_escalated';
}

export interface RunSummaryStats {
  chambersCleared: number;
  enemiesDefeated: number;
  damageDealt: number;
  parriesLanded: number;
  dodgesExecuted: number;
  postureBreaks: number;
  astrasInvoked: number;
  upasamharaWithdrawals: number;
  discoveriesUnlocked: number;
  narayanastraTrialsPassed: number;
  outcome: 'victory' | 'defeat' | 'in_progress';
  timestamp: number;
}

export const ASTRA_ENERGY_GAINS = {
  LIGHT_HIT: 4,
  HEAVY_HIT: 12,
  PERFECT_DODGE: 14,
  PERFECT_PARRY: 28,
  EXECUTION: 30,
  UPASAMHARA_REFUND: 10,
} as const;

export const DIFFICULTY_MODIFIERS: Record<
  CombatDifficulty,
  {
    label: string;
    subtitle: string;
    enemyDamageMult: number;
    enemyHpMult: number;
    parryWindowBonusSec: number;
    staminaRegenMult: number;
    astraGainMult: number;
  }
> = {
  story: {
    label: 'Story Mode (Kathakara)',
    subtitle: 'Generous parry windows, +40% Astra Energy gain, and reduced incoming damage for experiencing the tragedy of the Bleeding Crown.',
    enemyDamageMult: 0.6,
    enemyHpMult: 0.8,
    parryWindowBonusSec: 0.1,
    staminaRegenMult: 1.35,
    astraGainMult: 1.4,
  },
  normal: {
    label: 'Normal (Dharma-Yuddha)',
    subtitle: 'Balanced posture pressure, authentic 0.26s parry timing, and the intended challenge of the Vaitarani ascent.',
    enemyDamageMult: 1.0,
    enemyHpMult: 1.0,
    parryWindowBonusSec: 0,
    staminaRegenMult: 1.0,
    astraGainMult: 1.0,
  },
  hard: {
    label: 'Hard (Kaliyuga Unbound)',
    subtitle: 'Relentless enemy aggression, heavier posture thresholds, and punishing boss phases.',
    enemyDamageMult: 1.35,
    enemyHpMult: 1.25,
    parryWindowBonusSec: -0.04,
    staminaRegenMult: 0.9,
    astraGainMult: 0.9,
  },
};

export const ASTRA_METADATA: Record<
  AstraId,
  {
    id: AstraId;
    keybind: 'Q' | 'E' | 'R';
    name: string;
    deity: string;
    element: string;
    mantra: string;
    color: string;
    accentHex: string;
    baseEnergyCost: number;
    summary: string;
  }
> = {
  agneyastra: {
    id: 'agneyastra',
    keybind: 'Q',
    name: 'Agneyastra',
    deity: 'Agni, Lord of Sacred & Charnel Fire',
    element: 'Fire / Ash',
    mantra: 'OM AGNAYE SWAHA — IGNITE THE PYRE',
    color: '#ff6b1a',
    accentHex: '#ff9e44',
    baseEnergyCost: 35,
    summary: 'Wreathes the Kaumodaki gada in cremation fire. Supports Upasamhara [Q] withdrawal on persistent craters to refund +10 Astra Energy.',
  },
  vayavyastra: {
    id: 'vayavyastra',
    keybind: 'E',
    name: 'Vayavyastra',
    deity: 'Vayu, Lord of the Gale',
    element: 'Wind / Vacuum',
    mantra: 'OM VAYAVE NAMAHA — UNLEASH THE GALE',
    color: '#38bdf8',
    accentHex: '#7dd3fc',
    baseEnergyCost: 30,
    summary: 'Commands concussive cyclones that hurl foes into pillars or deflect projectiles. Supports Upasamhara [E] withdrawal on Pillar Wind Rings.',
  },
  vajrastra: {
    id: 'vajrastra',
    keybind: 'R',
    name: 'Vajrastra',
    deity: 'Indra, Wielder of the Thunderbolt',
    element: 'Lightning / Fulmination',
    mantra: 'OM INDRAYA VAJRINE — SHATTER THE BRONZE',
    color: '#facc15',
    accentHex: '#fef08a',
    baseEnergyCost: 45,
    summary: 'Calls down celestial thunder that shatters Guardian shields instantly and chains massive posture damage across Soaked or Marked targets.',
  },
};

export const ASTRA_MANIFESTATION_MATRIX: Record<AstraId, Record<GadhaStance, AstraManifestationSpec>> = {
  agneyastra: {
    smash: {
      astraId: 'agneyastra',
      stance: 'smash',
      title: 'Cremation Pyre Crater',
      sanskritSubtitle: 'Agni-Kunda (Persistent Ground Pyre)',
      energyCost: 35,
      cooldownSec: 4.5,
      supportsUpasamhara: true,
      upasamharaRefund: 10,
      damageMultiplier: 2.35,
      postureDamage: 48,
      radius: 175,
      range: 175,
      statusApplied: 'burning',
      description: 'Slams a molten crater into the stone that burns enemies for 6s. Press [Q] again to invoke Upasamhara Withdrawal, detonating the embers early and refunding +10 Astra Energy.',
    },
    pillar: {
      astraId: 'agneyastra',
      stance: 'pillar',
      title: 'Solar Parikrama Ring',
      sanskritSubtitle: 'Agni-Mandala (360° Flame Sweep)',
      energyCost: 35,
      cooldownSec: 4.0,
      supportsUpasamhara: false,
      upasamharaRefund: 0,
      damageMultiplier: 1.95,
      postureDamage: 38,
      radius: 195,
      range: 195,
      statusApplied: 'burning',
      description: 'Vaults on the gada shaft and sweeps a 360° ring of solar fire that clears surrounding crowds and ignites all nearby foes.',
    },
    thrust: {
      astraId: 'agneyastra',
      stance: 'thrust',
      title: 'Searing Javelin Wave',
      sanskritSubtitle: 'Agni-Shula (Piercing Flame Line)',
      energyCost: 35,
      cooldownSec: 3.8,
      supportsUpasamhara: false,
      upasamharaRefund: 0,
      damageMultiplier: 2.15,
      postureDamage: 42,
      radius: 90,
      range: 340,
      statusApplied: 'burning',
      description: 'Drives a concentrated lance of cremation fire forward in a long corridor, scorching every enemy in line.',
    },
  },
  vayavyastra: {
    smash: {
      astraId: 'vayavyastra',
      stance: 'smash',
      title: 'Prabhanjana Gale Shockwave',
      sanskritSubtitle: 'Vayu-Praghata (Outward Wall-Slam)',
      energyCost: 30,
      cooldownSec: 4.0,
      supportsUpasamhara: false,
      upasamharaRefund: 0,
      damageMultiplier: 1.75,
      postureDamage: 56,
      radius: 210,
      range: 210,
      statusApplied: 'staggered',
      description: 'Unleashes a violent outward gale that hurls enemies back; foes slammed into arena walls or pillars suffer heavy bonus posture damage.',
    },
    pillar: {
      astraId: 'vayavyastra',
      stance: 'pillar',
      title: 'Aegis of Marut',
      sanskritSubtitle: 'Vayu-Kavacha (Defensive Wind Vortex)',
      energyCost: 30,
      cooldownSec: 5.0,
      supportsUpasamhara: true,
      upasamharaRefund: 10,
      damageMultiplier: 1.45,
      postureDamage: 34,
      radius: 155,
      range: 155,
      statusApplied: 'marked',
      description: 'Sustains a swirling vortex around Rudra for 6s that deflects projectiles and pushes attackers back. Press [E] again for Upasamhara Withdrawal (+10 Astra Energy + vacuum snap).',
    },
    thrust: {
      astraId: 'vayavyastra',
      stance: 'thrust',
      title: 'Zephyr Piercing Corridor',
      sanskritSubtitle: 'Vayu-rekha (Slipstream Lunge)',
      energyCost: 30,
      cooldownSec: 3.5,
      supportsUpasamhara: false,
      upasamharaRefund: 0,
      damageMultiplier: 1.9,
      postureDamage: 44,
      radius: 85,
      range: 360,
      statusApplied: 'marked',
      description: 'Cuts a pressurized wind tunnel ahead of Rudra, pulling distant Spear Wraiths off balance and Marking them for +25% crit vulnerability.',
    },
  },
  vajrastra: {
    smash: {
      astraId: 'vajrastra',
      stance: 'smash',
      title: 'Indra’s Heaven-Splitter',
      sanskritSubtitle: 'Vajra-Pata (Shield-Breaker Thunder Strike)',
      energyCost: 45,
      cooldownSec: 5.5,
      supportsUpasamhara: false,
      upasamharaRefund: 0,
      damageMultiplier: 2.85,
      postureDamage: 85,
      radius: 185,
      range: 185,
      statusApplied: 'staggered',
      description: 'Calls a vertical pillar of golden lightning onto the impact point, instantaneously shattering Guardian shields and breaking enemy posture.',
    },
    pillar: {
      astraId: 'vajrastra',
      stance: 'pillar',
      title: 'Thunderhead Conductive Spire',
      sanskritSubtitle: 'Vajra-Stambha (Chain Lightning Counter)',
      energyCost: 45,
      cooldownSec: 5.0,
      supportsUpasamhara: false,
      upasamharaRefund: 0,
      damageMultiplier: 2.4,
      postureDamage: 68,
      radius: 230,
      range: 230,
      statusApplied: 'staggered',
      description: 'Turns the planted gada into a lightning rod that discharges high-voltage arcs across up to 5 enemies (deals +50% damage in Vaitarani water).',
    },
    thrust: {
      astraId: 'vajrastra',
      stance: 'thrust',
      title: 'Dadhichi’s Spine Bolt',
      sanskritSubtitle: 'Vajra-Vedha (Hyper-Velocity Rail Strike)',
      energyCost: 45,
      cooldownSec: 4.8,
      supportsUpasamhara: false,
      upasamharaRefund: 0,
      damageMultiplier: 3.1,
      postureDamage: 75,
      radius: 75,
      range: 420,
      statusApplied: 'marked',
      description: 'Projects a blinding bolt of celestial lightning across the chamber, piercing shields and Leaving targets Marked and Staggered.',
    },
  },
};

export function getAstraManifestation(astraId: AstraId, stance: GadhaStance): AstraManifestationSpec {
  return ASTRA_MANIFESTATION_MATRIX[astraId][stance];
}

export function classifyEnemyRole(
  enemyType: string,
  trait?: string
): {
  role: EnemyRole;
  roleTitle: string;
  slotCategory: 'melee' | 'ranged' | 'heavy';
  hasFrontalShield: boolean;
} {
  if (trait === 'vajra_shield' || enemyType === 'stone_golem' || enemyType === 'shield_bearer') {
    return {
      role: 'guardian',
      roleTitle: 'Bronze Guardian',
      slotCategory: 'melee',
      hasFrontalShield: true,
    };
  }
  switch (enemyType) {
    case 'fire_monk':
    case 'archer':
    case 'shaman':
      return {
        role: 'spear_wraith',
        roleTitle: 'Spear Wraith',
        slotCategory: 'ranged',
        hasFrontalShield: false,
      };
    case 'furnace_titan':
    case 'executioner':
    case 'heavy_infantry':
    case 'cavalry':
      return {
        role: 'rakshasa_brute',
        roleTitle: 'Rakshasa Brute',
        slotCategory: 'heavy',
        hasFrontalShield: false,
      };
    default:
      return {
        role: 'grunt',
        roleTitle: 'Charnel Grunt',
        slotCategory: 'melee',
        hasFrontalShield: false,
      };
  }
}

export interface GroupAttackSlots {
  meleeAttackerId: number | string | null;
  rangedAttackerId: number | string | null;
  heavyAttackerId: number | string | null;
}

/**
 * Enforces the Hades-style Group Attack Coordinator:
 * At most 1 Melee attacker + 1 Ranged attacker + 1 Heavy Enforcer may actively wind up / strike at once.
 */
export function assignGroupAttackTokens<TId extends number | string>(
  enemies: Array<{
    id: TId;
    type: string;
    trait?: string;
    hp: number;
    x: number;
    y: number;
    aiState?: string;
    isBoss?: boolean;
  }>,
  playerX: number,
  playerY: number
): Set<TId> {
  const allowedIds = new Set<TId>();
  let meleeCount = 0;
  let rangedCount = 0;
  let heavyCount = 0;

  const living = enemies
    .filter((e) => e.hp > 0 && e.aiState !== 'ko')
    .map((e) => {
      const dist = Math.hypot(e.x - playerX, e.y - playerY);
      const roleInfo = classifyEnemyRole(e.type, e.trait);
      const alreadyWindingUp = e.aiState === 'windup' || e.aiState === 'attack';
      return {
        ...e,
        dist,
        slotCategory: roleInfo.slotCategory,
        priority: (alreadyWindingUp ? -1000 : 0) + dist,
      };
    })
    .sort((a, b) => a.priority - b.priority);

  for (const enemy of living) {
    if (enemy.isBoss) {
      allowedIds.add(enemy.id);
      continue;
    }
    if (enemy.slotCategory === 'melee' && meleeCount < 1) {
      meleeCount += 1;
      allowedIds.add(enemy.id);
    } else if (enemy.slotCategory === 'ranged' && rangedCount < 1) {
      rangedCount += 1;
      allowedIds.add(enemy.id);
    } else if (enemy.slotCategory === 'heavy' && heavyCount < 1) {
      heavyCount += 1;
      allowedIds.add(enemy.id);
    }
  }

  return allowedIds;
}

export function createInitialNarayanastraTrial(): NarayanastraTrialState {
  return {
    active: false,
    invokerEnemyId: null,
    invokerName: '',
    calmTimerSec: 0,
    requiredCalmSec: 1.75,
    escalationStacks: 0,
    remainingWindowSec: 0,
    resolved: 'none',
  };
}
