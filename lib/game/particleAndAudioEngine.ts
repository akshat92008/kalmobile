// ============================================================================
// KALIYUGA: PILLAR 3 — HIGH-PERFORMANCE CANVAS PARTICLE ENGINE & SPATIAL AUDIO
// Pure, deterministic simulation + zero-allocation Canvas 2D batch renderer for:
// 1. Multi-Archetype Particle Physics ('blood_splatter', 'ember_dust', 'magic_spell', 'bronze_spark')
//    with floor-plane collision, curl turbulence, tangential spell swirl, and elastic bounce
// 2. 2.5D Stereo Spatial Audio Panning & Distance Attenuation
// 3. Dynamic Combat Intensity Audio Profile (Style Rank, Boss Phase, Low-HP Heartbeat, Slow-Mo Filter)
// 4. Material-Specific Combat Foley Specifications (Flesh, Bronze Armor, Obsidian Stone, Golden Parry, Astral Spell)
// ============================================================================

export type ParticleArchetype =
  | 'blood_splatter'
  | 'ember_dust'
  | 'magic_spell'
  | 'bronze_spark';

export interface SimParticleNode {
  active: boolean;
  archetype: ParticleArchetype;
  x: number;
  y: number;
  vx: number;
  vy: number;
  floorY: number;
  size: number;
  color: string;
  coreColor: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
  turbulenceFreq: number;
  turbulenceAmp: number;
  swirlAngularVel: number;
  phase: number;
  bounced: boolean;
  landedOnFloor: boolean;
}

export interface ParticleBurstConfig {
  archetype: ParticleArchetype;
  originX: number;
  originY: number;
  floorY?: number;
  count: number;
  baseSpeed: number;
  directionRad?: number;
  spreadRad?: number;
  primaryColor?: string;
  secondaryColor?: string;
  sizeScale?: number;
  seedOffset?: number;
}

export type FoleyMaterialKind =
  | 'flesh_cleave'
  | 'bronze_armor'
  | 'obsidian_stone'
  | 'golden_parry'
  | 'astral_spell';

export interface SpatialAudioParams {
  sourceX: number;
  sourceY: number;
  listenerX: number;
  listenerY: number;
  viewportW: number;
  maxAudibleDistPx?: number;
}

export interface SpatialPanAndGain {
  pan: number; // [-1, 1]
  gainMultiplier: number; // [0.08, 1.0]
  distancePx: number;
}

export interface DynamicCombatAudioProfile {
  bgmDriveBoost: number; // [1.0, 1.35]
  lowpassCutoffHz: number; // [420, 20000]
  subBassHeartbeatGain: number; // [0, 0.45]
  percussionLayerActive: boolean;
}

export interface MaterialFoleySpec {
  material: FoleyMaterialKind;
  fundamentalHz: number;
  overtoneHz: number;
  noiseBandHz: number;
  durationSec: number;
  subBassHz: number;
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Allocates a fixed-capacity pool of SimParticleNode objects to guarantee zero GC spikes at 60fps.
 */
export function createParticlePool(capacity: number = 560): SimParticleNode[] {
  const pool: SimParticleNode[] = [];
  for (let i = 0; i < capacity; i++) {
    pool.push({
      active: false,
      archetype: 'ember_dust',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      floorY: 0,
      size: 3,
      color: '#ff6a2b',
      coreColor: '#fff5d6',
      alpha: 1,
      life: 0,
      maxLife: 1,
      gravity: 0,
      drag: 0.98,
      turbulenceFreq: 0,
      turbulenceAmp: 0,
      swirlAngularVel: 0,
      phase: 0,
      bounced: false,
      landedOnFloor: false,
    });
  }
  return pool;
}

/**
 * Emits a specialized burst of particles ('blood_splatter', 'ember_dust', 'magic_spell', or 'bronze_spark')
 * into the pre-allocated pool.
 */
export function emitParticleBurst(
  pool: SimParticleNode[],
  cfg: ParticleBurstConfig
): number {
  let spawned = 0;
  const count = Math.max(1, Math.min(pool.length, Math.round(cfg.count)));
  const spread = cfg.spreadRad ?? Math.PI * 2;
  const baseDir = cfg.directionRad ?? 0;
  const sizeMult = cfg.sizeScale ?? 1.0;
  const seedBase = (cfg.seedOffset ?? 1) * 97.31 + cfg.originX * 0.13 + cfg.originY * 0.07;

  for (let i = 0; i < pool.length && spawned < count; i++) {
    const pt = pool[i];
    if (pt.active) continue;

    const r1 = pseudoRandom(seedBase + spawned * 3.1);
    const r2 = pseudoRandom(seedBase + spawned * 7.7);
    const r3 = pseudoRandom(seedBase + spawned * 13.3);

    const angle =
      spread >= Math.PI * 1.99
        ? r1 * Math.PI * 2
        : baseDir + (r1 - 0.5) * spread;
    const speed = cfg.baseSpeed * (0.38 + r2 * 0.84);

    pt.active = true;
    pt.archetype = cfg.archetype;
    pt.x = cfg.originX + (r3 - 0.5) * 8;
    pt.y = cfg.originY + (r1 - 0.5) * 6;
    pt.vx = Math.cos(angle) * speed;
    pt.vy = Math.sin(angle) * speed;
    pt.floorY = cfg.floorY ?? cfg.originY + 26 + (r2 - 0.5) * 18;
    pt.phase = r3 * Math.PI * 2;
    pt.bounced = false;
    pt.landedOnFloor = false;

    if (cfg.archetype === 'blood_splatter') {
      // Ballistic arterial blood droplets: strong downward gravity, crimson-obsidian palette
      pt.vy -= 45 + r2 * 65; // initial upward arc before falling to floorY
      pt.size = (2.8 + r3 * 3.4) * sizeMult;
      pt.color = cfg.primaryColor ?? (r2 > 0.35 ? '#d9162a' : '#8a0a18');
      pt.coreColor = cfg.secondaryColor ?? '#ff5e6c';
      pt.maxLife = 0.36 + r1 * 0.28;
      pt.life = pt.maxLife;
      pt.gravity = 420;
      pt.drag = 0.96;
      pt.turbulenceFreq = 0;
      pt.turbulenceAmp = 0;
      pt.swirlAngularVel = 0;
    } else if (cfg.archetype === 'ember_dust') {
      // Buoyant thermal embers & Kurukshetra ash: upward thermal lift + curl turbulence
      pt.vy -= 25 + r2 * 40;
      pt.size = (2.0 + r3 * 2.8) * sizeMult;
      pt.color = cfg.primaryColor ?? (r2 > 0.45 ? '#ff7b29' : '#ffd86b');
      pt.coreColor = cfg.secondaryColor ?? '#fff6d6';
      pt.maxLife = 0.52 + r1 * 0.48;
      pt.life = pt.maxLife;
      pt.gravity = -68 - r2 * 45;
      pt.drag = 0.94;
      pt.turbulenceFreq = 7.5 + r3 * 5.0;
      pt.turbulenceAmp = 48 + r1 * 42;
      pt.swirlAngularVel = 0;
    } else if (cfg.archetype === 'magic_spell') {
      // Astral Prana / Kala-Sands / Savitri Lotus spell motes: tangential swirl + harmonic glow
      pt.size = (2.6 + r3 * 3.2) * sizeMult;
      pt.color = cfg.primaryColor ?? '#3ee0a8';
      pt.coreColor = cfg.secondaryColor ?? '#e0f2fe';
      pt.maxLife = 0.48 + r1 * 0.36;
      pt.life = pt.maxLife;
      pt.gravity = -22;
      pt.drag = 0.95;
      pt.turbulenceFreq = 9.0;
      pt.turbulenceAmp = 24;
      pt.swirlAngularVel = (r2 > 0.5 ? 1 : -1) * (3.8 + r3 * 3.2);
    } else {
      // 'bronze_spark': High-velocity Chola bronze ricochet sparks with elastic floor bounce
      pt.vy -= 55 + r2 * 70;
      pt.size = (2.2 + r3 * 2.2) * sizeMult;
      pt.color = cfg.primaryColor ?? '#ffd86b';
      pt.coreColor = '#ffffff';
      pt.maxLife = 0.34 + r1 * 0.24;
      pt.life = pt.maxLife;
      pt.gravity = 380;
      pt.drag = 0.97;
      pt.turbulenceFreq = 0;
      pt.turbulenceAmp = 0;
      pt.swirlAngularVel = 0;
    }

    pt.alpha = 1.0;
    spawned++;
  }

  return spawned;
}

/**
 * Advances all active particles in the pool by `dt` seconds and returns coordinates of any blood droplets
 * that struck the chamber floor during this step so callers can optionally stamp floor micro-decals.
 */
export function stepParticleSimulation(
  pool: SimParticleNode[],
  dt: number
): Array<{ x: number; y: number; angle: number }> {
  const floorImpacts: Array<{ x: number; y: number; angle: number }> = [];
  const frameDrag = Math.pow(0.96, dt * 60);

  for (let i = 0; i < pool.length; i++) {
    const pt = pool[i];
    if (!pt.active) continue;

    pt.life -= dt;
    if (pt.life <= 0) {
      pt.active = false;
      continue;
    }

    pt.phase += dt * pt.turbulenceFreq;

    // Tangential swirl rotation for 'magic_spell' particles
    if (pt.swirlAngularVel !== 0) {
      const cosA = Math.cos(pt.swirlAngularVel * dt);
      const sinA = Math.sin(pt.swirlAngularVel * dt);
      const nvx = pt.vx * cosA - pt.vy * sinA;
      const nvy = pt.vx * sinA + pt.vy * cosA;
      pt.vx = nvx;
      pt.vy = nvy;
    }

    // Curl turbulence for 'ember_dust' & 'magic_spell'
    if (pt.turbulenceAmp > 0) {
      pt.vx += Math.sin(pt.phase) * pt.turbulenceAmp * dt;
      pt.vy += Math.cos(pt.phase * 0.85) * pt.turbulenceAmp * 0.65 * dt;
    }

    pt.vx *= Math.pow(pt.drag, dt * 60) || frameDrag;
    pt.vy = pt.vy * (Math.pow(pt.drag, dt * 60) || frameDrag) + pt.gravity * dt;

    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;

    // Floor-plane interaction for ballistic 'blood_splatter' and 'bronze_spark'
    if (pt.y >= pt.floorY && pt.vy > 0) {
      if (pt.archetype === 'blood_splatter' && !pt.landedOnFloor) {
        pt.landedOnFloor = true;
        pt.y = pt.floorY;
        const impactAngle = Math.atan2(pt.vy, pt.vx);
        if (floorImpacts.length < 4) {
          floorImpacts.push({ x: pt.x, y: pt.y, angle: impactAngle });
        }
        pt.vx *= 0.25;
        pt.vy = 0;
        pt.gravity = 0;
        pt.life = Math.min(pt.life, 0.08);
      } else if (pt.archetype === 'bronze_spark' && !pt.bounced) {
        pt.bounced = true;
        pt.y = pt.floorY;
        pt.vy = -pt.vy * 0.48;
        pt.vx *= 0.72;
      }
    }

    pt.alpha = Math.max(0, Math.min(1, pt.life / Math.max(0.01, pt.maxLife)));
  }

  return floorImpacts;
}

/**
 * Renders all active particles in the pool using archetype-specific geometry:
 * - 'blood_splatter': Rich normal-blended arterial crimson teardrop streaks (never washed out by screen blend!)
 * - 'ember_dust': Screen-blended incandescent diamond embers with hot inner core
 * - 'magic_spell': Screen-blended 4-point astral star motes with pulsing aura
 * - 'bronze_spark': Razor-sharp white-gold metallic ricochet needles
 */
export function renderParticlePoolCanvas(
  ctx: CanvasRenderingContext2D,
  pool: SimParticleNode[]
): void {
  // Pass 1: Normal-blended arterial 'blood_splatter' droplets so deep crimson reads with visceral contrast
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < pool.length; i++) {
    const pt = pool[i];
    if (!pt.active || pt.archetype !== 'blood_splatter') continue;

    const spd = Math.hypot(pt.vx, pt.vy);
    const ux = spd > 1 ? pt.vx / spd : 1;
    const uy = spd > 1 ? pt.vy / spd : 0;
    const px = -uy;
    const py = ux;
    const stretch = Math.min(16, Math.max(4, spd * 0.032));
    const r = Math.max(1.3, pt.size * 0.52);

    ctx.globalAlpha = Math.min(0.95, pt.alpha * 1.15);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.moveTo(pt.x + ux * r * 1.3, pt.y + uy * r * 1.3);
    ctx.lineTo(pt.x + px * r, pt.y + py * r);
    ctx.lineTo(pt.x - ux * stretch, pt.y - uy * stretch);
    ctx.lineTo(pt.x - px * r, pt.y - py * r);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Pass 2: Additive/Screen-blended 'ember_dust', 'magic_spell', and 'bronze_spark'
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < pool.length; i++) {
    const pt = pool[i];
    if (!pt.active || pt.archetype === 'blood_splatter') continue;

    ctx.globalAlpha = pt.alpha;

    if (pt.archetype === 'magic_spell') {
      const pulse = 0.8 + 0.25 * Math.sin(pt.phase * 2.0);
      const r = Math.max(1.8, pt.size * 0.75 * pulse);
      const inner = r * 0.32;

      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y - r * 1.45);
      ctx.lineTo(pt.x + inner, pt.y - inner);
      ctx.lineTo(pt.x + r * 1.45, pt.y);
      ctx.lineTo(pt.x + inner, pt.y + inner);
      ctx.lineTo(pt.x, pt.y + r * 1.45);
      ctx.lineTo(pt.x - inner, pt.y + inner);
      ctx.lineTo(pt.x - r * 1.45, pt.y);
      ctx.lineTo(pt.x - inner, pt.y - inner);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = pt.coreColor;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, inner * 0.85, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 'ember_dust' or 'bronze_spark'
      const spd = Math.hypot(pt.vx, pt.vy);
      if (spd > 45) {
        const ux = pt.vx / spd;
        const uy = pt.vy / spd;
        const px = -uy;
        const py = ux;
        const tailLen =
          pt.archetype === 'bronze_spark'
            ? Math.min(22, Math.max(7, spd * 0.036))
            : Math.min(16, Math.max(5, spd * 0.024));
        const halfW = Math.min(2.2, Math.max(0.8, pt.size * 0.38));

        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.moveTo(pt.x + ux * (halfW * 1.5), pt.y + uy * (halfW * 1.5));
        ctx.lineTo(pt.x + px * halfW, pt.y + py * halfW);
        ctx.lineTo(pt.x - ux * tailLen, pt.y - uy * tailLen);
        ctx.lineTo(pt.x - px * halfW, pt.y - py * halfW);
        ctx.closePath();
        ctx.fill();
      } else {
        const r = Math.min(2.6, Math.max(1.0, pt.size * 0.48));
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y - r);
        ctx.lineTo(pt.x + r, pt.y);
        ctx.lineTo(pt.x, pt.y + r);
        ctx.lineTo(pt.x - r, pt.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

/**
 * Computes 2.5D stereo pan [-1, 1] and distance attenuation gain [0.08, 1.0]
 * for any world-space sound event relative to the listener/camera center.
 */
export function computeSpatialAudioPanAndGain(
  params: SpatialAudioParams
): SpatialPanAndGain {
  const dx = params.sourceX - params.listenerX;
  const dy = params.sourceY - params.listenerY;
  const dist = Math.hypot(dx, dy);
  const halfView = Math.max(320, (params.viewportW || 1440) * 0.55);
  const maxDist = params.maxAudibleDistPx ?? 1100;

  const rawPan = dx / halfView;
  const pan = Number(Math.max(-0.92, Math.min(0.92, rawPan)).toFixed(3));
  const normDist = Math.min(1, dist / Math.max(1, maxDist));
  const gainMultiplier = Number(
    Math.max(0.08, Math.min(1.0, 1 - normDist * 0.82)).toFixed(3)
  );

  return {
    pan,
    gainMultiplier,
    distancePx: Math.round(dist),
  };
}

/**
 * Computes the dynamic combat audio profile (BGM drive, low-pass cutoff filter for slow-mo/low-HP,
 * and sub-bass heartbeat pulse) from live combat telemetry.
 */
export function computeDynamicCombatAudioProfile(params: {
  stylePoints: number;
  bossPhase: 0 | 1 | 2 | 3;
  playerHpRatio: number;
  slowMoActive: boolean;
}): DynamicCombatAudioProfile {
  const styleNorm = Math.max(0, Math.min(1, params.stylePoints / 900));
  const phaseBoost = params.bossPhase >= 3 ? 0.18 : params.bossPhase === 2 ? 0.1 : 0;
  const bgmDriveBoost = Number(
    Math.min(1.35, 1.0 + styleNorm * 0.18 + phaseBoost).toFixed(2)
  );

  let lowpassCutoffHz = 18500;
  if (params.slowMoActive) {
    // Time-Dilation / Kala-Mirage underwater low-pass sweep
    lowpassCutoffHz = 680;
  } else if (params.playerHpRatio > 0 && params.playerHpRatio < 0.3) {
    lowpassCutoffHz = 2400;
  }

  const subBassHeartbeatGain =
    params.playerHpRatio > 0 && params.playerHpRatio < 0.32
      ? Number(((0.32 - params.playerHpRatio) * 1.25).toFixed(2))
      : 0;

  return {
    bgmDriveBoost,
    lowpassCutoffHz,
    subBassHeartbeatGain,
    percussionLayerActive: params.stylePoints >= 250 || params.bossPhase >= 2,
  };
}

/**
 * Returns the acoustic synthesizer parameters for material-specific combat foley.
 */
export function computeMaterialFoleySpec(
  material: FoleyMaterialKind
): MaterialFoleySpec {
  switch (material) {
    case 'flesh_cleave':
      return {
        material,
        fundamentalHz: 142,
        overtoneHz: 285,
        noiseBandHz: 620,
        durationSec: 0.19,
        subBassHz: 54,
      };
    case 'bronze_armor':
      return {
        material,
        fundamentalHz: 460,
        overtoneHz: 920,
        noiseBandHz: 1850,
        durationSec: 0.34,
        subBassHz: 82,
      };
    case 'obsidian_stone':
      return {
        material,
        fundamentalHz: 88,
        overtoneHz: 176,
        noiseBandHz: 410,
        durationSec: 0.42,
        subBassHz: 42,
      };
    case 'golden_parry':
      return {
        material,
        fundamentalHz: 587.33,
        overtoneHz: 1174.66,
        noiseBandHz: 2400,
        durationSec: 0.48,
        subBassHz: 68,
      };
    case 'astral_spell':
      return {
        material,
        fundamentalHz: 528,
        overtoneHz: 792,
        noiseBandHz: 1480,
        durationSec: 0.45,
        subBassHz: 62,
      };
  }
}
