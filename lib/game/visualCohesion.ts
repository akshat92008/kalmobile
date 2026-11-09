// ============================================================================
// KALIYUGA: THE BLEEDING CROWN — PILLAR 1: VISUAL COHESION & 2.5D/3D PIPELINE
// Pure deterministic math & canvas rendering helpers for:
// 1. Unified 3D Pipeline Default ('all_3d' across Rudra, Bosses, Enemies, Companions)
// 2. Grounded Ambient-Occlusion & Directional Brazier Contact Shadows
// 3. Persistent Battle Scars & Floor Decals (Blood Splatters, Scorch Craters,
//    Shattered Chola Armor Shards, and Planted Footstep Ash Prints)
// 4. Weapon-Bone Tapered Mesh Slash Ribbons (14-segment swept blade polygon)
// 5. 3D Weapon-Tip 4-Point Starburst Threat Glints (Gold Parriable / Crimson Unblockable)
// ============================================================================

import type { StaffStance } from './rules';

export type BattleScarKind =
  | 'blood_splatter'
  | 'scorch_crater'
  | 'shattered_armor'
  | 'footstep_ash';

export interface BattleScarDroplet {
  offsetX: number;
  offsetY: number;
  radiusX: number;
  radiusY: number;
  rotation: number;
}

export interface BattleScarDecal {
  id: number;
  kind: BattleScarKind;
  x: number;
  y: number;
  angle: number;
  radius: number;
  alpha: number;
  age: number;
  maxAge: number;
  primaryColor: string;
  secondaryColor: string;
  droplets: BattleScarDroplet[];
}

export const MAX_BATTLE_SCARS = 56;

/**
 * Deterministic pseudo-random generator from a numeric seed so decals are
 * reproducible in unit tests and free of frame-to-frame shimmer.
 */
export function seededUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Spawns a persistent battle scar on the arena stone floor and enforces a FIFO cap.
 */
export function spawnBattleScar(
  existing: BattleScarDecal[],
  params: {
    id: number;
    kind: BattleScarKind;
    x: number;
    y: number;
    angle?: number;
    scale?: number;
  }
): BattleScarDecal[] {
  const angle = params.angle ?? 0;
  const scale = Math.max(0.4, Math.min(2.4, params.scale ?? 1.0));
  const seedBase = params.id * 17.3 + params.x * 0.13 + params.y * 0.07;

  let radius = 24 * scale;
  let maxAge = 90; // Persistent across wave
  let alpha = 0.82;
  let primaryColor = '#5e0b14';
  let secondaryColor = '#2b0408';
  const droplets: BattleScarDroplet[] = [];

  if (params.kind === 'blood_splatter') {
    radius = 22 * scale;
    maxAge = 120;
    alpha = 0.84;
    primaryColor = '#6e0d18';
    secondaryColor = '#2a0408';
    for (let i = 0; i < 6; i++) {
      const s1 = seededUnit(seedBase + i * 3.1);
      const s2 = seededUnit(seedBase + i * 7.7);
      const s3 = seededUnit(seedBase + i * 11.3);
      const spreadAng = angle + (s1 - 0.5) * 0.95;
      const dist = radius * (0.45 + s2 * 1.15);
      droplets.push({
        offsetX: Math.cos(spreadAng) * dist,
        offsetY: Math.sin(spreadAng) * dist * 0.54,
        radiusX: (3.2 + s3 * 5.4) * scale,
        radiusY: (1.8 + s3 * 3.0) * scale,
        rotation: spreadAng,
      });
    }
  } else if (params.kind === 'scorch_crater') {
    radius = 34 * scale;
    maxAge = 140;
    alpha = 0.88;
    primaryColor = '#140f0d';
    secondaryColor = '#ff6a2b';
    for (let i = 0; i < 5; i++) {
      const s1 = seededUnit(seedBase + i * 5.3);
      const s2 = seededUnit(seedBase + i * 9.1);
      const rayAng = (i * Math.PI * 2) / 5 + (s1 - 0.5) * 0.4;
      const dist = radius * (0.55 + s2 * 0.55);
      droplets.push({
        offsetX: Math.cos(rayAng) * dist,
        offsetY: Math.sin(rayAng) * dist * 0.52,
        radiusX: 7.5 * scale,
        radiusY: 1.6 * scale,
        rotation: rayAng,
      });
    }
  } else if (params.kind === 'shattered_armor') {
    radius = 26 * scale;
    maxAge = 150;
    alpha = 0.86;
    primaryColor = '#c89d46';
    secondaryColor = '#3b3d46';
    for (let i = 0; i < 5; i++) {
      const s1 = seededUnit(seedBase + i * 4.7);
      const s2 = seededUnit(seedBase + i * 8.9);
      const s3 = seededUnit(seedBase + i * 13.1);
      const shardAng = s1 * Math.PI * 2;
      const dist = radius * (0.3 + s2 * 0.85);
      droplets.push({
        offsetX: Math.cos(shardAng) * dist,
        offsetY: Math.sin(shardAng) * dist * 0.54,
        radiusX: (4.0 + s3 * 4.5) * scale,
        radiusY: (2.2 + s3 * 2.4) * scale,
        rotation: shardAng + 0.5,
      });
    }
  } else {
    // 'footstep_ash'
    radius = 8.5 * scale;
    maxAge = 14;
    alpha = 0.44;
    primaryColor = '#231d18';
    secondaryColor = '#8c7a64';
  }

  const scar: BattleScarDecal = {
    id: params.id,
    kind: params.kind,
    x: params.x,
    y: params.y,
    angle,
    radius,
    alpha,
    age: 0,
    maxAge,
    primaryColor,
    secondaryColor,
    droplets,
  };

  const next = [...existing, scar];
  if (next.length > MAX_BATTLE_SCARS) {
    return next.slice(next.length - MAX_BATTLE_SCARS);
  }
  return next;
}

/**
 * Advances battle scar ages and removes expired footprints while keeping
 * heavy combat scars intact for the chamber duration.
 */
export function updateBattleScars(
  scars: BattleScarDecal[],
  dt: number
): BattleScarDecal[] {
  if (scars.length === 0) return scars;
  const out: BattleScarDecal[] = [];
  for (let i = 0; i < scars.length; i++) {
    const s = scars[i];
    const nextAge = s.age + dt;
    if (nextAge >= s.maxAge) continue;
    out.push({
      ...s,
      age: nextAge,
    });
  }
  return out;
}

export interface GroundedShadowParams {
  aoCoreRadiusX: number;
  aoCoreRadiusY: number;
  aoCoreAlpha: number;
  penumbraRadiusX: number;
  penumbraRadiusY: number;
  penumbraAlpha: number;
  directionalSkewX: number;
  directionalOffsetX: number;
  directionalOffsetY: number;
  warmBounceAlpha: number;
}

/**
 * Computes dual-layer Ambient Occlusion + Directional Brazier Shadow parameters
 * so 3D models and characters feel physically planted on the stone floor.
 */
export function computeGroundedContactShadow(params: {
  worldX: number;
  worldY: number;
  baseRadius: number;
  elevationY: number;
  lightSourceX: number;
  lightSourceY?: number;
}): GroundedShadowParams {
  const elevAtten = Math.max(0.28, Math.min(1, 1 - params.elevationY / 135));
  const dx = params.worldX - params.lightSourceX;
  const dy = params.worldY - (params.lightSourceY ?? params.worldY - 120);
  const distToLight = Math.hypot(dx, dy);

  const directionalSkewX = Math.max(-0.58, Math.min(0.58, dx / 420));
  const directionalOffsetX = Math.max(-14, Math.min(14, (dx / Math.max(120, distToLight)) * 9.5));
  const directionalOffsetY = Math.max(-6, Math.min(8, (dy / Math.max(120, distToLight)) * 4.5));

  const lightProximity = Math.max(0, Math.min(1, 1 - distToLight / 520));

  return {
    aoCoreRadiusX: Number((params.baseRadius * 0.72 * elevAtten).toFixed(2)),
    aoCoreRadiusY: Number((params.baseRadius * 0.32 * elevAtten).toFixed(2)),
    aoCoreAlpha: Number((0.78 * elevAtten).toFixed(3)),
    penumbraRadiusX: Number((params.baseRadius * 1.42 * (1.08 - elevAtten * 0.08)).toFixed(2)),
    penumbraRadiusY: Number((params.baseRadius * 0.62 * (1.08 - elevAtten * 0.08)).toFixed(2)),
    penumbraAlpha: Number((0.46 * elevAtten).toFixed(3)),
    directionalSkewX: Number(directionalSkewX.toFixed(3)),
    directionalOffsetX: Number(directionalOffsetX.toFixed(2)),
    directionalOffsetY: Number(directionalOffsetY.toFixed(2)),
    warmBounceAlpha: Number((0.16 + lightProximity * 0.24).toFixed(3)),
  };
}

export interface SlashRibbonNode {
  innerX: number;
  innerY: number;
  outerX: number;
  outerY: number;
  spineX: number;
  spineY: number;
  t: number;
  thickness: number;
}

export interface WeaponSlashRibbonMesh {
  nodes: SlashRibbonNode[];
  coreColor: string;
  plasmaColor: string;
  outerGlowColor: string;
  tipX: number;
  tipY: number;
}

/**
 * Generates a 14-segment tapered weapon-bone slash ribbon mesh in isometric space.
 * Replaces flat oval strokes with a swept crescent polygon that tapers at tail and tip.
 */
export function computeWeaponSlashRibbon(params: {
  originX: number;
  originY: number;
  aimAngle: number;
  swingProgress: number;
  radius: number;
  stance: StaffStance;
  isHeavy: boolean;
  isRiposte?: boolean;
  comboStep?: number;
}): WeaponSlashRibbonMesh {
  const segments = 14;
  const prog = Math.max(0, Math.min(1, params.swingProgress));
  const arcSpan = params.isHeavy ? Math.PI * 1.32 : Math.PI * 0.98;
  const reverseDir = !params.isHeavy && params.comboStep === 2 ? -1 : 1;

  const startAngle = params.aimAngle - reverseDir * (arcSpan * 0.52);
  const activeSweep = arcSpan * (0.35 + prog * 0.65);

  let coreColor = '#fff9e6';
  let plasmaColor = '#ff9d2e';
  let outerGlowColor = '#e0281e';

  if (params.isRiposte) {
    coreColor = '#ffffff';
    plasmaColor = '#ffd86b';
    outerGlowColor = '#38bdf8';
  } else if (params.stance === 'pillar') {
    coreColor = '#fffbe8';
    plasmaColor = '#ffd24c';
    outerGlowColor = '#ff7b1c';
  } else if (params.stance === 'thrust') {
    coreColor = '#eaffff';
    plasmaColor = '#4ce8ff';
    outerGlowColor = '#14b8a6';
  }

  const maxThickness = params.isHeavy ? params.radius * 0.38 : params.radius * 0.28;
  const isoSquashY = 0.66;
  const nodes: SlashRibbonNode[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const theta = startAngle + reverseDir * activeSweep * t;
    // Taper profile: sharp tail (t=0), wide belly (t=0.68), razor tip (t=1.0)
    const taper = Math.sin(Math.pow(t, 0.72) * Math.PI);
    const thickness = maxThickness * taper;

    const rInner = Math.max(8, params.radius - thickness * 0.65);
    const rOuter = params.radius + thickness * 0.45;
    const rSpine = (rInner + rOuter) * 0.5;

    const cosA = Math.cos(theta);
    const sinA = Math.sin(theta) * isoSquashY;

    nodes.push({
      innerX: params.originX + cosA * rInner,
      innerY: params.originY + sinA * rInner,
      outerX: params.originX + cosA * rOuter,
      outerY: params.originY + sinA * rOuter,
      spineX: params.originX + cosA * rSpine,
      spineY: params.originY + sinA * rSpine,
      t,
      thickness,
    });
  }

  const lastNode = nodes[nodes.length - 1];
  return {
    nodes,
    coreColor,
    plasmaColor,
    outerGlowColor,
    tipX: lastNode ? lastNode.spineX : params.originX,
    tipY: lastNode ? lastNode.spineY : params.originY,
  };
}

/**
 * Computes the exact world-space coordinates of an enemy's raised weapon tip
 * during attack windup so the Sekiro/God-of-War 4-point starburst glint flashes
 * directly on the weapon hand rather than only on the floor.
 */
export function computeWeaponTipGlintPosition(params: {
  enemyX: number;
  enemyY: number;
  facing: 1 | -1;
  windupProgress: number;
  isBoss: boolean;
  attackKind: 'cone' | 'corridor' | 'shockwave';
}): {
  x: number;
  y: number;
  starRadius: number;
  isParriable: boolean;
  primaryColor: string;
  coreColor: string;
} {
  const wp = Math.max(0, Math.min(1, params.windupProgress));
  const liftY = (params.isBoss ? 58 : 42) + wp * (params.isBoss ? 18 : 12);
  const reachX = params.facing * ((params.isBoss ? 24 : 16) - wp * 4);
  const isParriable = params.attackKind !== 'shockwave';

  return {
    x: Number((params.enemyX + reachX).toFixed(2)),
    y: Number((params.enemyY - liftY).toFixed(2)),
    starRadius: Number(((params.isBoss ? 22 : 15) * (0.85 + wp * 0.35)).toFixed(2)),
    isParriable,
    primaryColor: isParriable ? '#ffd86b' : '#ff2a3c',
    coreColor: isParriable ? '#fffdf2' : '#ffd6d9',
  };
}

// ============================================================================
// CANVAS RENDERING HELPERS FOR PILLAR 1
// ============================================================================

export function renderBattleScarsOnFloor(
  ctx: CanvasRenderingContext2D,
  scars: BattleScarDecal[]
): void {
  if (scars.length === 0) return;
  ctx.save();
  for (let i = 0; i < scars.length; i++) {
    const s = scars[i];
    const fadeRatio =
      s.age > s.maxAge * 0.75
        ? Math.max(0, 1 - (s.age - s.maxAge * 0.75) / (s.maxAge * 0.25))
        : 1;
    const alpha = s.alpha * fadeRatio;
    if (alpha <= 0.02) continue;

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.globalAlpha = alpha;

    if (s.kind === 'blood_splatter') {
      // Dark arterial pool in isometric foreshortening
      ctx.save();
      ctx.scale(1, 0.52);
      ctx.rotate(s.angle);
      const grad = ctx.createRadialGradient(0, 0, s.radius * 0.1, 0, 0, s.radius);
      grad.addColorStop(0, s.secondaryColor);
      grad.addColorStop(0.65, s.primaryColor);
      grad.addColorStop(1, 'rgba(42, 4, 8, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(s.radius * 0.18, 0, s.radius, s.radius * 0.68, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Directional arterial droplets
      ctx.fillStyle = s.primaryColor;
      for (let d = 0; d < s.droplets.length; d++) {
        const drop = s.droplets[d];
        ctx.beginPath();
        ctx.ellipse(
          drop.offsetX,
          drop.offsetY,
          drop.radiusX,
          drop.radiusY,
          drop.rotation,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    } else if (s.kind === 'scorch_crater') {
      ctx.save();
      ctx.scale(1, 0.52);
      const cGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, s.radius);
      cGrad.addColorStop(0, 'rgba(10, 7, 6, 0.92)');
      cGrad.addColorStop(0.55, 'rgba(28, 16, 12, 0.76)');
      cGrad.addColorStop(0.82, 'rgba(255, 106, 43, 0.24)');
      cGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Glowing radial magma fissures inside crater
      ctx.strokeStyle = s.secondaryColor;
      ctx.lineWidth = 1.3;
      for (let d = 0; d < s.droplets.length; d++) {
        const crack = s.droplets[d];
        ctx.beginPath();
        ctx.moveTo(crack.offsetX * 0.22, crack.offsetY * 0.22);
        ctx.lineTo(crack.offsetX, crack.offsetY);
        ctx.stroke();
      }
    } else if (s.kind === 'shattered_armor') {
      for (let d = 0; d < s.droplets.length; d++) {
        const shard = s.droplets[d];
        ctx.save();
        ctx.translate(shard.offsetX, shard.offsetY);
        ctx.rotate(shard.rotation);
        ctx.fillStyle = d % 2 === 0 ? s.primaryColor : s.secondaryColor;
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(-shard.radiusX, -shard.radiusY * 0.5);
        ctx.lineTo(shard.radiusX * 0.8, -shard.radiusY);
        ctx.lineTo(shard.radiusX, shard.radiusY * 0.7);
        ctx.lineTo(-shard.radiusX * 0.6, shard.radiusY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    } else {
      // 'footstep_ash'
      ctx.save();
      ctx.scale(1, 0.5);
      ctx.rotate(s.angle);
      ctx.fillStyle = s.primaryColor;
      ctx.strokeStyle = s.secondaryColor;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, s.radius, s.radius * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }
  ctx.restore();
}

export function drawGrounded3DContactShadow(
  ctx: CanvasRenderingContext2D,
  params: {
    worldX: number;
    worldY: number;
    baseRadius: number;
    elevationY: number;
    lightSourceX: number;
    accentColor?: string;
  }
): void {
  const shadow = computeGroundedContactShadow(params);

  ctx.save();
  ctx.translate(params.worldX, params.worldY);

  // 1. Directional skewed soft penumbra cast away from nearest brazier light
  ctx.save();
  ctx.translate(shadow.directionalOffsetX, shadow.directionalOffsetY);
  ctx.transform(1, 0, shadow.directionalSkewX, 1, 0, 0);
  const penGrad = ctx.createRadialGradient(
    0,
    0,
    shadow.penumbraRadiusX * 0.1,
    0,
    0,
    shadow.penumbraRadiusX
  );
  penGrad.addColorStop(0, `rgba(0, 0, 0, ${shadow.penumbraAlpha})`);
  penGrad.addColorStop(0.6, `rgba(0, 0, 0, ${(shadow.penumbraAlpha * 0.45).toFixed(3)})`);
  penGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = penGrad;
  ctx.scale(1, shadow.penumbraRadiusY / Math.max(1, shadow.penumbraRadiusX));
  ctx.beginPath();
  ctx.arc(0, 0, shadow.penumbraRadiusX, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Tight boot-level Ambient Occlusion contact shadow core (anchors feet to stone)
  ctx.save();
  const aoGrad = ctx.createRadialGradient(
    0,
    0,
    shadow.aoCoreRadiusX * 0.08,
    0,
    0,
    shadow.aoCoreRadiusX
  );
  aoGrad.addColorStop(0, `rgba(0, 0, 0, ${shadow.aoCoreAlpha})`);
  aoGrad.addColorStop(0.65, `rgba(5, 3, 4, ${(shadow.aoCoreAlpha * 0.58).toFixed(3)})`);
  aoGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = aoGrad;
  ctx.scale(1, shadow.aoCoreRadiusY / Math.max(1, shadow.aoCoreRadiusX));
  ctx.beginPath();
  ctx.arc(0, 0, shadow.aoCoreRadiusX, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3. Subtle warm subsurface firelight rim bounce on the stone under the warrior
  if (params.accentColor) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = shadow.warmBounceAlpha * 0.55;
    ctx.strokeStyle = params.accentColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, shadow.aoCoreRadiusX * 0.92, shadow.aoCoreRadiusY * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

export function renderWeaponBoneSlashRibbon(
  ctx: CanvasRenderingContext2D,
  mesh: WeaponSlashRibbonMesh,
  alpha: number
): void {
  if (mesh.nodes.length < 3 || alpha <= 0.01) return;

  const first = mesh.nodes[0];
  const last = mesh.nodes[mesh.nodes.length - 1];

  // Layer 0: Hand-Painted Dark Obsidian Ink Outer Underlay (matches 2D sprite sheet ink style)
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < mesh.nodes.length; i++) {
    const n = mesh.nodes[i];
    if (i === 0) ctx.moveTo(n.outerX, n.outerY);
    else ctx.lineTo(n.outerX, n.outerY);
  }
  for (let i = mesh.nodes.length - 1; i >= 0; i--) {
    const n = mesh.nodes[i];
    ctx.lineTo(n.innerX, n.innerY);
  }
  ctx.closePath();
  ctx.fillStyle = `rgba(18, 8, 5, ${Math.min(0.68, alpha * 0.65).toFixed(3)})`;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // Layer 1: Outer Crimson/Amber Agni Plasma Distortion Ribbon
  ctx.beginPath();
  for (let i = 0; i < mesh.nodes.length; i++) {
    const n = mesh.nodes[i];
    if (i === 0) ctx.moveTo(n.outerX, n.outerY);
    else ctx.lineTo(n.outerX, n.outerY);
  }
  for (let i = mesh.nodes.length - 1; i >= 0; i--) {
    const n = mesh.nodes[i];
    ctx.lineTo(n.innerX, n.innerY);
  }
  ctx.closePath();

  const grad = ctx.createLinearGradient(first.spineX, first.spineY, last.spineX, last.spineY);
  grad.addColorStop(0, 'rgba(255, 82, 36, 0)');
  grad.addColorStop(0.28, mesh.outerGlowColor);
  grad.addColorStop(0.72, mesh.plasmaColor);
  grad.addColorStop(1, mesh.coreColor);

  ctx.globalAlpha = Math.min(1, alpha * 0.92);
  ctx.fillStyle = grad;
  ctx.fill();

  // Layer 2: Razor-Sharp White-Gold Leading Edge Blade Spine + Inner Streak
  ctx.beginPath();
  for (let i = 0; i < mesh.nodes.length; i++) {
    const n = mesh.nodes[i];
    const leadX = n.spineX + (n.outerX - n.spineX) * 0.64;
    const leadY = n.spineY + (n.outerY - n.spineY) * 0.64;
    if (i === 0) ctx.moveTo(leadX, leadY);
    else ctx.lineTo(leadX, leadY);
  }
  ctx.strokeStyle = mesh.coreColor;
  ctx.lineWidth = 3.2;
  ctx.globalAlpha = Math.min(1, alpha * 0.98);
  ctx.stroke();

  // Secondary parallel inner Agni speed-arc
  ctx.beginPath();
  for (let i = 2; i < mesh.nodes.length; i++) {
    const n = mesh.nodes[i];
    const innerArcX = n.spineX + (n.innerX - n.spineX) * 0.35;
    const innerArcY = n.spineY + (n.innerY - n.spineY) * 0.35;
    if (i === 2) ctx.moveTo(innerArcX, innerArcY);
    else ctx.lineTo(innerArcX, innerArcY);
  }
  ctx.strokeStyle = mesh.plasmaColor;
  ctx.lineWidth = 1.6;
  ctx.globalAlpha = Math.min(1, alpha * 0.78);
  ctx.stroke();

  // Layer 3: Leading-Edge Blade Tip Star Flare
  if (last) {
    const tipGrad = ctx.createRadialGradient(mesh.tipX, mesh.tipY, 1, mesh.tipX, mesh.tipY, 18);
    tipGrad.addColorStop(0, mesh.coreColor);
    tipGrad.addColorStop(0.45, mesh.plasmaColor);
    tipGrad.addColorStop(1, 'rgba(255, 82, 36, 0)');
    ctx.fillStyle = tipGrad;
    ctx.globalAlpha = Math.min(1, alpha * 0.95);
    ctx.beginPath();
    ctx.arc(mesh.tipX, mesh.tipY, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function renderWeaponTipStarburstGlint(
  ctx: CanvasRenderingContext2D,
  glint: ReturnType<typeof computeWeaponTipGlintPosition>,
  nowMs: number
): void {
  const rot = nowMs * 0.0055;
  const rOuter = glint.starRadius;
  const rInner = rOuter * 0.24;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.translate(glint.x, glint.y);

  // Outer halo ring
  ctx.strokeStyle = glint.primaryColor;
  ctx.lineWidth = 1.8;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(0, 0, rOuter * 0.62, 0, Math.PI * 2);
  ctx.stroke();

  // 4-Point Razor Starburst Flare (Sekiro / God of War weapon-tip threat glint)
  ctx.rotate(rot);
  ctx.fillStyle = glint.coreColor;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4;
    const r = i % 2 === 0 ? rOuter * (i % 4 === 0 ? 1.25 : 0.85) : rInner;
    const px = Math.cos(ang) * r;
    const py = Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
