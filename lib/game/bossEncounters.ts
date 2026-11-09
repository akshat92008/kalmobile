// ============================================================================
// KALIYUGA: PILLAR 2 — BESPOKE 3-PHASE BOSS ENCOUNTERS & ARENA HAZARDS
// Pure, deterministic logic + high-contrast 2.5D canvas rendering for:
// 1. Dundubhi (Chamber 4: Chola Bronze War-Demon) & Vrikodara (Chamber 8: Sovereign of the Infernal Maw)
//    3-Phase Signature Attack Suites with explicit counterplay telegraphs
// 2. Interactive Pillar-Baiting Trajectory & Cracked War-Drum Punish Multiplier
// 3. Vrikodara Arena-Splitting Molten Slag Fissures (point-to-segment hazard & rendering)
// 4. Dundubhi Cymatic Sonic War-Drum Resonance Zones (delayed floor detonation rings)
// ============================================================================

import { MoltenSlagFissure } from '@/engine/lanternShaderEngine';

export type BossArchetypeId = 'xuemo' | 'vrikodara';

export type BossCounterplayKind =
  | 'parry_gold'
  | 'dodge_crimson'
  | 'bait_pillar'
  | 'pillar_stance_vault'
  | 'dash_outward';

export interface BossSignatureMoveSpec {
  id: string;
  bossType: BossArchetypeId;
  minPhase: 1 | 2 | 3;
  title: string;
  sanskritSubtitle: string;
  counterplayHint: string;
  counterplayKind: BossCounterplayKind;
  attackKind: 'cone' | 'corridor' | 'shockwave';
  windupDurationSec: number;
  telegraphRadiusPx: number;
  corridorLengthPx: number;
  comboFollowups: number;
  damageMultiplier: number;
  spawnsMoltenSlag: boolean;
  spawnsSonicZone: boolean;
  triggersVacuumPull: boolean;
}

export interface SonicDrumZone {
  id: number;
  x: number;
  y: number;
  radius: number;
  timer: number;
  maxTimer: number;
  detonated: boolean;
}

export const BOSS_SIGNATURE_MOVES: Record<BossArchetypeId, BossSignatureMoveSpec[]> = {
  xuemo: [
    {
      id: 'brahmadanda_horn_gore',
      bossType: 'xuemo',
      minPhase: 1,
      title: 'HORN GORE STAMPEDE',
      sanskritSubtitle: 'BRAHMADANDA SHRINGA-VEGA',
      counterplayHint: 'BAIT CHARGE INTO PILLAR OR [SPACE] SIDESTEP',
      counterplayKind: 'bait_pillar',
      attackKind: 'corridor',
      windupDurationSec: 0.78,
      telegraphRadiusPx: 110,
      corridorLengthPx: 320,
      comboFollowups: 0,
      damageMultiplier: 1.1,
      spawnsMoltenSlag: false,
      spawnsSonicZone: false,
      triggersVacuumPull: false,
    },
    {
      id: 'chola_cymbal_cleave',
      bossType: 'xuemo',
      minPhase: 1,
      title: 'CHOLA BRONZE CLEAVE',
      sanskritSubtitle: 'KAMSYA-CHAKRA PRAHARA',
      counterplayHint: '[Q / MMB] GOLDEN PARRY FOR POSTURE SHATTER',
      counterplayKind: 'parry_gold',
      attackKind: 'cone',
      windupDurationSec: 0.72,
      telegraphRadiusPx: 124,
      corridorLengthPx: 0,
      comboFollowups: 0,
      damageMultiplier: 1.0,
      spawnsMoltenSlag: false,
      spawnsSonicZone: false,
      triggersVacuumPull: false,
    },
    {
      id: 'karna_sonic_drum',
      bossType: 'xuemo',
      minPhase: 1,
      title: 'DUNDUBHI WAR-DRUM PULSE',
      sanskritSubtitle: 'BHUMI-NADA DUNDUBHI',
      counterplayHint: '[TAB] PILLAR STANCE VAULT OR [SPACE] DASH OUT',
      counterplayKind: 'pillar_stance_vault',
      attackKind: 'shockwave',
      windupDurationSec: 0.84,
      telegraphRadiusPx: 138,
      corridorLengthPx: 0,
      comboFollowups: 0,
      damageMultiplier: 1.05,
      spawnsMoltenSlag: false,
      spawnsSonicZone: true,
      triggersVacuumPull: false,
    },
    {
      id: 'rakta_double_gore',
      bossType: 'xuemo',
      minPhase: 2,
      title: 'TWIN-HORN BLOOD STAMPEDE',
      sanskritSubtitle: 'RAKTA-SHRINGA DVANDVA',
      counterplayHint: '2-HIT CHAIN CHARGE · BAIT INTO PILLAR',
      counterplayKind: 'bait_pillar',
      attackKind: 'corridor',
      windupDurationSec: 0.68,
      telegraphRadiusPx: 122,
      corridorLengthPx: 350,
      comboFollowups: 1,
      damageMultiplier: 1.2,
      spawnsMoltenSlag: false,
      spawnsSonicZone: true,
      triggersVacuumPull: false,
    },
    {
      id: 'kurukshetra_bell_quake',
      bossType: 'xuemo',
      minPhase: 2,
      title: 'BELL OF KURUKSHETRA QUAKE',
      sanskritSubtitle: 'MAHA-GHANTA BHUKAMPA',
      counterplayHint: 'UNBLOCKABLE CRIMSON QUAKE · [SPACE] EVADE RING',
      counterplayKind: 'dodge_crimson',
      attackKind: 'shockwave',
      windupDurationSec: 0.76,
      telegraphRadiusPx: 158,
      corridorLengthPx: 0,
      comboFollowups: 1,
      damageMultiplier: 1.25,
      spawnsMoltenSlag: false,
      spawnsSonicZone: true,
      triggersVacuumPull: false,
    },
    {
      id: 'pralaya_triple_trample',
      bossType: 'xuemo',
      minPhase: 3,
      title: 'PRALAYA TRIPLE STAMPEDE',
      sanskritSubtitle: 'PRALAYA-TANDAVA GATI',
      counterplayHint: '3-HIT CATACLYSM · [Q] PARRY FINAL CLEAVE',
      counterplayKind: 'parry_gold',
      attackKind: 'cone',
      windupDurationSec: 0.62,
      telegraphRadiusPx: 146,
      corridorLengthPx: 360,
      comboFollowups: 2,
      damageMultiplier: 1.35,
      spawnsMoltenSlag: false,
      spawnsSonicZone: true,
      triggersVacuumPull: false,
    },
  ],
  vrikodara: [
    {
      id: 'agni_furnace_inhale',
      bossType: 'vrikodara',
      minPhase: 1,
      title: 'ABDOMINAL FURNACE VACUUM',
      sanskritSubtitle: 'JATHARAGNI GRAHANA',
      counterplayHint: 'VORTEX PULL · [SPACE] DASH OUTWARD BEFORE SLAM',
      counterplayKind: 'dash_outward',
      attackKind: 'shockwave',
      windupDurationSec: 0.86,
      telegraphRadiusPx: 144,
      corridorLengthPx: 0,
      comboFollowups: 0,
      damageMultiplier: 1.12,
      spawnsMoltenSlag: false,
      spawnsSonicZone: false,
      triggersVacuumPull: true,
    },
    {
      id: 'trishula_iron_sweep',
      bossType: 'vrikodara',
      minPhase: 1,
      title: 'TRISHULA IRON CLEAVE',
      sanskritSubtitle: 'LAUHA-SHULA CHEDANA',
      counterplayHint: '[Q / MMB] GOLDEN PARRY FOR RIPOSTE OPENING',
      counterplayKind: 'parry_gold',
      attackKind: 'cone',
      windupDurationSec: 0.74,
      telegraphRadiusPx: 132,
      corridorLengthPx: 0,
      comboFollowups: 0,
      damageMultiplier: 1.05,
      spawnsMoltenSlag: false,
      spawnsSonicZone: false,
      triggersVacuumPull: false,
    },
    {
      id: 'kurukshetra_chariot_rush',
      bossType: 'vrikodara',
      minPhase: 1,
      title: 'BURNING CHARIOT CRUSH',
      sanskritSubtitle: 'DAHANA-RATHA VEGITA',
      counterplayHint: '[SPACE] DODGE CORRIDOR CHARGE',
      counterplayKind: 'dodge_crimson',
      attackKind: 'corridor',
      windupDurationSec: 0.76,
      telegraphRadiusPx: 118,
      corridorLengthPx: 335,
      comboFollowups: 0,
      damageMultiplier: 1.15,
      spawnsMoltenSlag: false,
      spawnsSonicZone: false,
      triggersVacuumPull: false,
    },
    {
      id: 'vaitarani_slag_eruption',
      bossType: 'vrikodara',
      minPhase: 2,
      title: 'VAITARANI MOLTEN SLAG SPLIT',
      sanskritSubtitle: 'VAITARANI-LAVA SPHOTANA',
      counterplayHint: 'SPLITS ARENA WITH MAGMA FISSURE · AVOID SLAG',
      counterplayKind: 'dodge_crimson',
      attackKind: 'shockwave',
      windupDurationSec: 0.78,
      telegraphRadiusPx: 162,
      corridorLengthPx: 0,
      comboFollowups: 1,
      damageMultiplier: 1.25,
      spawnsMoltenSlag: true,
      spawnsSonicZone: false,
      triggersVacuumPull: true,
    },
    {
      id: 'rudra_jaw_guillotine',
      bossType: 'vrikodara',
      minPhase: 2,
      title: 'INFERNAL JAW GUILLOTINE',
      sanskritSubtitle: 'NARAKA-DAMSHTRA PATA',
      counterplayHint: '2-HIT CHAIN CLEAVE · [Q] PARRY OR [RMB] SEE-THROUGH',
      counterplayKind: 'parry_gold',
      attackKind: 'cone',
      windupDurationSec: 0.66,
      telegraphRadiusPx: 148,
      corridorLengthPx: 0,
      comboFollowups: 1,
      damageMultiplier: 1.22,
      spawnsMoltenSlag: true,
      spawnsSonicZone: false,
      triggersVacuumPull: false,
    },
    {
      id: 'kalagni_cataclysm_vortex',
      bossType: 'vrikodara',
      minPhase: 3,
      title: 'KALAGNI APOCALYPSE VORTEX',
      sanskritSubtitle: 'KALAGNI-RUDRA SAMHARA',
      counterplayHint: '3-HIT TITAN MAELSTROM · [SPACE] EVADE MAGMA RINGS',
      counterplayKind: 'dash_outward',
      attackKind: 'shockwave',
      windupDurationSec: 0.64,
      telegraphRadiusPx: 178,
      corridorLengthPx: 365,
      comboFollowups: 2,
      damageMultiplier: 1.38,
      spawnsMoltenSlag: true,
      spawnsSonicZone: false,
      triggersVacuumPull: true,
    },
  ],
};

/**
 * Selects a deterministic, distance- and phase-appropriate Signature Move for Dundubhi or Vrikodara.
 */
export function selectBossSignatureMove(params: {
  bossType: BossArchetypeId;
  phase: 1 | 2 | 3;
  attackPatternIndex: number;
  distanceToPlayerPx: number;
  hasIntactPillars: boolean;
}): BossSignatureMoveSpec {
  const pool = BOSS_SIGNATURE_MOVES[params.bossType].filter(
    (m) => m.minPhase <= params.phase
  );
  if (pool.length === 0) {
    return BOSS_SIGNATURE_MOVES[params.bossType][0];
  }

  // If Dundubhi is at medium-long range and intact pillars exist, prioritize Horn Gore Stampede so player can bait him!
  if (
    params.bossType === 'xuemo' &&
    params.distanceToPlayerPx > 165 &&
    params.hasIntactPillars &&
    params.attackPatternIndex % 2 === 0
  ) {
    const gore =
      pool.find((m) => m.id === 'rakta_double_gore') ||
      pool.find((m) => m.id === 'brahmadanda_horn_gore');
    if (gore) return gore;
  }

  // If Vrikodara is in Phase 2/3 and pattern index hits slag cycle, prioritize Vaitarani Molten Slag Split
  if (
    params.bossType === 'vrikodara' &&
    params.phase >= 2 &&
    params.attackPatternIndex % 3 === 1
  ) {
    const slagMove =
      params.phase === 3
        ? pool.find((m) => m.id === 'kalagni_cataclysm_vortex')
        : pool.find((m) => m.id === 'vaitarani_slag_eruption');
    if (slagMove) return slagMove;
  }

  const idx = Math.abs(params.attackPatternIndex) % pool.length;
  return pool[idx];
}

/**
 * Computes the damage multiplier against a Boss accounting for:
 * - Dundubhi's 3.0s Tusk-Lodge Punish Window (1.65x bonus damage)
 * - Dundubhi's Intact Bronze War-Drum Armor (0.78x damage until cracked by pillar or heavy slam, 1.25x after cracked)
 * - Vrikodara's Phase 2/3 Exposed Abdominal Furnace Core during recovery (1.35x bonus damage)
 */
export function computeBossVulnerabilityMultiplier(params: {
  bossType: BossArchetypeId;
  phase: 1 | 2 | 3;
  armorCracked: boolean;
  tuskLodgedTimer: number;
  aiState: 'idle' | 'chase' | 'windup' | 'attack' | 'recover' | 'ko';
}): {
  damageMultiplier: number;
  postureMultiplier: number;
  vulnerabilityCallout: string | null;
} {
  if (params.bossType === 'xuemo') {
    if (params.tuskLodgedTimer > 0) {
      return {
        damageMultiplier: 1.65,
        postureMultiplier: 1.85,
        vulnerabilityCallout: 'TUSKS LODGED PUNISH! ×1.65',
      };
    }
    if (params.armorCracked) {
      return {
        damageMultiplier: 1.25,
        postureMultiplier: 1.3,
        vulnerabilityCallout: 'CRACKED DRUM EXPOSED! ×1.25',
      };
    }
    return {
      damageMultiplier: 0.85,
      postureMultiplier: 0.9,
      vulnerabilityCallout: null,
    };
  }

  // Vrikodara: when recovering in Phase 2/3, his unsealed abdominal furnace is open to critical strikes
  if (params.phase >= 2 && params.aiState === 'recover') {
    return {
      damageMultiplier: 1.35,
      postureMultiplier: 1.4,
      vulnerabilityCallout: 'FURNACE CORE EXPOSED! ×1.35',
    };
  }

  return {
    damageMultiplier: 1.0,
    postureMultiplier: 1.0,
    vulnerabilityCallout: null,
  };
}

/**
 * Evaluates whether an actor at (px, py) is standing inside any active Molten Slag Fissure segment.
 */
export function evaluateMoltenSlagHazard(params: {
  px: number;
  py: number;
  elevationY: number;
  fissures: MoltenSlagFissure[];
}): {
  inSlag: boolean;
  burnDamagePerTick: number;
  moveSpeedMultiplier: number;
  closestFissureIndex: number;
} {
  if (params.elevationY > 8 || params.fissures.length === 0) {
    return {
      inSlag: false,
      burnDamagePerTick: 0,
      moveSpeedMultiplier: 1.0,
      closestFissureIndex: -1,
    };
  }

  for (let i = 0; i < params.fissures.length; i++) {
    const f = params.fissures[i];
    if (f.life <= 0) continue;
    const dx = f.x2 - f.x1;
    const dy = f.y2 - f.y1;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0.0001) {
      t = ((params.px - f.x1) * dx + (params.py - f.y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }
    const projX = f.x1 + t * dx;
    const projY = f.y1 + t * dy;
    const dist = Math.hypot(params.px - projX, params.py - projY);
    const halfWidth = Math.max(14, (f.width || 34) * 0.55);
    if (dist <= halfWidth) {
      return {
        inSlag: true,
        burnDamagePerTick: 9,
        moveSpeedMultiplier: 0.76,
        closestFissureIndex: i,
      };
    }
  }

  return {
    inSlag: false,
    burnDamagePerTick: 0,
    moveSpeedMultiplier: 1.0,
    closestFissureIndex: -1,
  };
}

/**
 * Finds the best intact Dragon Pillar near Dundubhi's charge corridor so the UI can highlight it as a Pillar-Bait target.
 */
export function findBaitablePillarOnTrajectory(params: {
  bossX: number;
  bossY: number;
  aimAngle: number;
  pillars: Array<{ id: number; x: number; y: number; destroyed: boolean; type: string }>;
}): { id: number; x: number; y: number; willImpact: boolean } | null {
  const intact = params.pillars.filter(
    (p) => !p.destroyed && p.type === 'dragon_pillar'
  );
  if (intact.length === 0) return null;

  const endX = params.bossX + Math.cos(params.aimAngle) * 350;
  const endY = params.bossY + Math.sin(params.aimAngle) * 350;
  const dx = endX - params.bossX;
  const dy = endY - params.bossY;
  const lenSq = dx * dx + dy * dy || 1;

  let best: { id: number; x: number; y: number; willImpact: boolean; dist: number } | null =
    null;

  for (const pil of intact) {
    const t = Math.max(
      0,
      Math.min(1, ((pil.x - params.bossX) * dx + (pil.y - params.bossY) * dy) / lenSq)
    );
    const projX = params.bossX + t * dx;
    const projY = params.bossY + t * dy;
    const perpDist = Math.hypot(pil.x - projX, pil.y - projY);
    const willImpact = t > 0.08 && perpDist <= 78;
    const scoreDist = willImpact ? perpDist : perpDist + 160;
    if (!best || scoreDist < best.dist) {
      best = {
        id: pil.id,
        x: pil.x,
        y: pil.y,
        willImpact,
        dist: scoreDist,
      };
    }
  }

  return best
    ? { id: best.id, x: best.x, y: best.y, willImpact: best.willImpact }
    : null;
}

/**
 * Renders Vrikodara's Arena-Splitting Molten Slag Fissures & Dundubhi's Sonic War-Drum Resonance Zones on the floor.
 */
export function renderBossArenaHazards(
  ctx: CanvasRenderingContext2D,
  timeSec: number,
  slagFissures: MoltenSlagFissure[],
  sonicZones: SonicDrumZone[],
  baitPillar: { x: number; y: number; willImpact: boolean } | null
): void {
  ctx.save();

  // 1. Render Vrikodara's Arena-Splitting Molten Slag Fissures
  for (let i = 0; i < slagFissures.length; i++) {
    const f = slagFissures[i];
    if (f.life <= 0) continue;
    const alpha = Math.min(1, f.life / Math.min(1.2, f.maxLife * 0.25));
    const pulse = 0.78 + 0.22 * Math.sin(timeSec * 6.5 + i * 1.7);
    const w = f.width || 34;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';

    // Charred obsidian outer crust
    ctx.strokeStyle = 'rgba(14, 9, 8, 0.92)';
    ctx.lineWidth = w * 1.15;
    ctx.beginPath();
    ctx.moveTo(f.x1, f.y1);
    ctx.lineTo(f.x2, f.y2);
    ctx.stroke();

    // Glowing crimson-orange magma channel
    ctx.strokeStyle = `rgba(255, 78, 24, ${(0.72 * pulse).toFixed(2)})`;
    ctx.lineWidth = w * 0.68;
    ctx.beginPath();
    ctx.moveTo(f.x1, f.y1);
    ctx.lineTo(f.x2, f.y2);
    ctx.stroke();

    // White-hot molten core vein
    ctx.strokeStyle = `rgba(255, 224, 122, ${(0.85 * pulse).toFixed(2)})`;
    ctx.lineWidth = w * 0.24;
    ctx.beginPath();
    ctx.moveTo(f.x1, f.y1);
    ctx.lineTo(f.x2, f.y2);
    ctx.stroke();

    ctx.restore();
  }

  // 2. Render Dundubhi's Cymatic Sonic War-Drum Resonance Zones
  for (let i = 0; i < sonicZones.length; i++) {
    const z = sonicZones[i];
    if (z.detonated || z.timer <= 0) continue;
    const prog = 1 - Math.max(0, z.timer / Math.max(0.01, z.maxTimer));
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.scale(1, 0.58);

    // Outer bronze resonance ring
    ctx.strokeStyle = `rgba(255, 196, 77, ${(0.45 + prog * 0.5).toFixed(2)})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, z.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Expanding inner detonation fill
    ctx.fillStyle = `rgba(255, 122, 42, ${(0.12 + prog * 0.28).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(0, 0, z.radius * prog, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 3. Render Dundubhi Pillar-Baiting Target Ring during Horn Gore Windup
  if (baitPillar) {
    const pulse = 0.65 + 0.35 * Math.sin(timeSec * 9.0);
    ctx.save();
    ctx.translate(baitPillar.x, baitPillar.y);
    ctx.scale(1, 0.58);
    ctx.strokeStyle = baitPillar.willImpact
      ? `rgba(62, 224, 168, ${(0.75 + pulse * 0.25).toFixed(2)})`
      : `rgba(255, 216, 107, ${(0.55 + pulse * 0.3).toFixed(2)})`;
    ctx.lineWidth = baitPillar.willImpact ? 3.2 : 2.2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = baitPillar.willImpact ? '#3ee0a8' : '#ffd86b';
    ctx.fillText(
      baitPillar.willImpact
        ? '⚡ PILLAR IMPACT LOCKED! (TUSK-LODGE)'
        : '🎯 BAIT CHARGE HERE',
      baitPillar.x,
      baitPillar.y - 88
    );
    ctx.restore();
  }

  ctx.restore();
}
