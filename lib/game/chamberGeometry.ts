// Hades-Style Isometric Chamber Collision Boundaries, Asset-Driven Exit Gates, Reward Orbs, Floor Traps & Foreground Parallax
import { GAME_ASSETS } from './assets';
import { getProcessedSpriteSync } from './spriteProcessor';

export interface NormPoint {
  x: number;
  y: number;
}

export interface ChamberTrapSpec {
  id: string;
  kind: 'agni_vent' | 'chakram_slicer';
  x: number;
  y: number;
  radius: number;
}

export interface ChamberTrapRuntime {
  id: string;
  kind: 'agni_vent' | 'chakram_slicer';
  x: number;
  y: number;
  radius: number;
  state: 'idle' | 'priming' | 'erupting' | 'cooldown';
  timer: number;
}

export interface ChamberGeometrySpec {
  outerPolygon: NormPoint[];
  chasmIslands: NormPoint[][];
  leftGate: { x: number; y: number; angle: number };
  rightGate: { x: number; y: number; angle: number };
  traps: ChamberTrapSpec[];
}

// Calibrated expansive walkable stone platform polygons matching the 8 hand-painted 16:9 isometric arenas
// Top terrace vertices encompass both Left & Right Sanctuary Exit Gates so Rudra can walk straight into either door!
const CHAMBER_GEOMETRIES: ChamberGeometrySpec[] = [
  // Chamber 1: Vaitarani River Ghat (Expansive Sanctuary Platform with Full Gate Access)
  {
    outerPolygon: [
      { x: 0.20, y: 0.12 },
      { x: 0.50, y: 0.10 },
      { x: 0.80, y: 0.12 },
      { x: 0.90, y: 0.42 },
      { x: 0.86, y: 0.72 },
      { x: 0.50, y: 0.90 },
      { x: 0.14, y: 0.72 },
      { x: 0.10, y: 0.42 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.29, y: 0.22, angle: -0.52 },
    rightGate: { x: 0.71, y: 0.22, angle: 0.52 },
    traps: [
      { id: 'c1_t1', kind: 'agni_vent', x: 0.40, y: 0.52, radius: 58 },
      { id: 'c1_t2', kind: 'chakram_slicer', x: 0.60, y: 0.52, radius: 58 },
      { id: 'c1_t3', kind: 'agni_vent', x: 0.50, y: 0.38, radius: 56 },
    ],
  },
  // Chamber 2: Raktabija Blood-Kunda Courtyard (Wide Octagonal Courtyard)
  {
    outerPolygon: [
      { x: 0.20, y: 0.12 },
      { x: 0.80, y: 0.12 },
      { x: 0.90, y: 0.36 },
      { x: 0.90, y: 0.74 },
      { x: 0.72, y: 0.90 },
      { x: 0.28, y: 0.90 },
      { x: 0.10, y: 0.74 },
      { x: 0.10, y: 0.36 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.30, y: 0.21, angle: -0.45 },
    rightGate: { x: 0.70, y: 0.21, angle: 0.45 },
    traps: [
      { id: 'c2_t1', kind: 'chakram_slicer', x: 0.38, y: 0.54, radius: 58 },
      { id: 'c2_t2', kind: 'agni_vent', x: 0.62, y: 0.54, radius: 58 },
      { id: 'c2_t3', kind: 'chakram_slicer', x: 0.50, y: 0.40, radius: 58 },
    ],
  },
  // Chamber 3: Kurukshetra Chariot Bonefield
  {
    outerPolygon: [
      { x: 0.20, y: 0.12 },
      { x: 0.80, y: 0.12 },
      { x: 0.90, y: 0.40 },
      { x: 0.87, y: 0.78 },
      { x: 0.70, y: 0.90 },
      { x: 0.30, y: 0.90 },
      { x: 0.13, y: 0.78 },
      { x: 0.10, y: 0.40 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.31, y: 0.21, angle: -0.42 },
    rightGate: { x: 0.69, y: 0.21, angle: 0.42 },
    traps: [
      { id: 'c3_t1', kind: 'agni_vent', x: 0.42, y: 0.48, radius: 58 },
      { id: 'c3_t2', kind: 'chakram_slicer', x: 0.60, y: 0.60, radius: 58 },
      { id: 'c3_t3', kind: 'agni_vent', x: 0.52, y: 0.34, radius: 58 },
    ],
  },
  // Chamber 4: Mandapa of the War-Drum (3D Dundubhi Mid-Boss)
  {
    outerPolygon: [
      { x: 0.20, y: 0.12 },
      { x: 0.80, y: 0.12 },
      { x: 0.91, y: 0.44 },
      { x: 0.87, y: 0.80 },
      { x: 0.72, y: 0.90 },
      { x: 0.28, y: 0.90 },
      { x: 0.13, y: 0.80 },
      { x: 0.09, y: 0.44 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.32, y: 0.21, angle: -0.38 },
    rightGate: { x: 0.68, y: 0.21, angle: 0.38 },
    traps: [
      { id: 'c4_t1', kind: 'agni_vent', x: 0.50, y: 0.44, radius: 60 },
      { id: 'c4_t2', kind: 'chakram_slicer', x: 0.50, y: 0.68, radius: 60 },
    ],
  },
  // Chamber 5: Bhairava Soul-Fire Sanctum
  {
    outerPolygon: [
      { x: 0.20, y: 0.12 },
      { x: 0.80, y: 0.12 },
      { x: 0.90, y: 0.40 },
      { x: 0.87, y: 0.78 },
      { x: 0.70, y: 0.90 },
      { x: 0.30, y: 0.90 },
      { x: 0.13, y: 0.78 },
      { x: 0.10, y: 0.40 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.32, y: 0.21, angle: -0.44 },
    rightGate: { x: 0.68, y: 0.21, angle: 0.44 },
    traps: [
      { id: 'c5_t1', kind: 'chakram_slicer', x: 0.40, y: 0.52, radius: 58 },
      { id: 'c5_t2', kind: 'agni_vent', x: 0.60, y: 0.52, radius: 58 },
    ],
  },
  // Chamber 6: Shattered Gopuram Causeway
  {
    outerPolygon: [
      { x: 0.20, y: 0.12 },
      { x: 0.80, y: 0.12 },
      { x: 0.90, y: 0.42 },
      { x: 0.87, y: 0.78 },
      { x: 0.70, y: 0.90 },
      { x: 0.30, y: 0.90 },
      { x: 0.13, y: 0.78 },
      { x: 0.10, y: 0.42 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.31, y: 0.21, angle: -0.45 },
    rightGate: { x: 0.69, y: 0.21, angle: 0.45 },
    traps: [
      { id: 'c6_t1', kind: 'agni_vent', x: 0.36, y: 0.48, radius: 58 },
      { id: 'c6_t2', kind: 'chakram_slicer', x: 0.50, y: 0.58, radius: 58 },
      { id: 'c6_t3', kind: 'agni_vent', x: 0.64, y: 0.48, radius: 58 },
    ],
  },
  // Chamber 7: Sealed Gate of Jatharagni (Asura Lava Sanctum Locked -> Unlocked)
  {
    outerPolygon: [
      { x: 0.20, y: 0.12 },
      { x: 0.80, y: 0.12 },
      { x: 0.89, y: 0.44 },
      { x: 0.85, y: 0.80 },
      { x: 0.68, y: 0.90 },
      { x: 0.32, y: 0.90 },
      { x: 0.15, y: 0.80 },
      { x: 0.11, y: 0.44 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.40, y: 0.22, angle: 0 },
    rightGate: { x: 0.60, y: 0.22, angle: 0 },
    traps: [
      { id: 'c7_t1', kind: 'chakram_slicer', x: 0.42, y: 0.56, radius: 58 },
      { id: 'c7_t2', kind: 'agni_vent', x: 0.58, y: 0.56, radius: 58 },
    ],
  },
  // Chamber 8: Sanctum of the Infernal Maw (Final 3D Boss Vrikodara: Circular Naga / Eclipse Platform)
  {
    outerPolygon: [
      { x: 0.22, y: 0.12 },
      { x: 0.50, y: 0.11 },
      { x: 0.78, y: 0.12 },
      { x: 0.90, y: 0.46 },
      { x: 0.84, y: 0.78 },
      { x: 0.50, y: 0.90 },
      { x: 0.16, y: 0.78 },
      { x: 0.10, y: 0.46 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.34, y: 0.21, angle: -0.4 },
    rightGate: { x: 0.66, y: 0.21, angle: 0.4 },
    traps: [
      { id: 'c8_t1', kind: 'agni_vent', x: 0.36, y: 0.52, radius: 58 },
      { id: 'c8_t2', kind: 'chakram_slicer', x: 0.64, y: 0.52, radius: 58 },
    ],
  },
];

export function getChamberGeometry(chamberIndex: number): ChamberGeometrySpec {
  const idx = Math.max(0, Math.min(CHAMBER_GEOMETRIES.length - 1, chamberIndex));
  return CHAMBER_GEOMETRIES[idx];
}

export function createChamberTrapsRuntime(
  chamberIndex: number,
  worldW: number,
  worldH: number
): ChamberTrapRuntime[] {
  const geom = getChamberGeometry(chamberIndex);
  return geom.traps.map((t) => ({
    id: t.id,
    kind: t.kind,
    x: t.x * worldW,
    y: t.y * worldH,
    radius: Math.round(t.radius * 1.18),
    state: 'idle',
    timer: 0,
  }));
}

function isPointInPolygon(px: number, py: number, poly: NormPoint[], w: number, h: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x * w;
    const yi = poly[i].y * h;
    const xj = poly[j].x * w;
    const yj = poly[j].y * h;
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 0.00001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function closestPointOnPolygon(
  px: number,
  py: number,
  poly: NormPoint[],
  w: number,
  h: number
): { x: number; y: number; nx: number; ny: number } {
  let bestX = px;
  let bestY = py;
  let bestDistSq = Infinity;
  let bestNx = 0;
  let bestNy = -1;

  const cx = w * 0.5;
  const cy = h * 0.52;

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ax = a.x * w;
    const ay = a.y * h;
    const bx = b.x * w;
    const by = b.y * h;
    const abx = bx - ax;
    const aby = by - ay;
    const abLenSq = abx * abx + aby * aby || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / abLenSq));
    const qx = ax + abx * t;
    const qy = ay + aby * t;
    const dx = px - qx;
    const dy = py - qy;
    const dSq = dx * dx + dy * dy;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestX = qx;
      bestY = qy;
      const toCenterLen = Math.hypot(cx - qx, cy - qy) || 1;
      bestNx = (cx - qx) / toCenterLen;
      bestNy = (cy - qy) / toCenterLen;
    }
  }
  return { x: bestX, y: bestY, nx: bestNx, ny: bestNy };
}

export function constrainActorToChamber(
  nextX: number,
  nextY: number,
  vx: number,
  vy: number,
  worldW: number,
  worldH: number,
  chamberIndex: number,
  _isDodging: boolean,
  _isBoss: boolean,
  marginPx: number = 12
): {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hitOuterWall: boolean;
  hitChasmEdge: boolean;
  vaultedChasm: boolean;
  normalX: number;
  normalY: number;
} {
  const geom = getChamberGeometry(chamberIndex);

  // Allow unobstructed entry into the Left & Right Sanctuary Exit Gate alcoves!
  const lGx = geom.leftGate.x * worldW;
  const lGy = geom.leftGate.y * worldH;
  const rGx = geom.rightGate.x * worldW;
  const rGy = geom.rightGate.y * worldH;
  const nearGateAlcove =
    Math.hypot(nextX - lGx, nextY - lGy) < 135 || Math.hypot(nextX - rGx, nextY - rGy) < 135;
  if (nearGateAlcove) {
    return {
      x: Math.max(40, Math.min(worldW - 40, nextX)),
      y: Math.max(40, Math.min(worldH - 40, nextY)),
      vx,
      vy,
      hitOuterWall: false,
      hitChasmEdge: false,
      vaultedChasm: false,
      normalX: 0,
      normalY: -1,
    };
  }

  const insideOuter = isPointInPolygon(nextX, nextY, geom.outerPolygon, worldW, worldH);

  if (!insideOuter) {
    const closest = closestPointOnPolygon(nextX, nextY, geom.outerPolygon, worldW, worldH);
    const clampedX = closest.x + closest.nx * marginPx;
    const clampedY = closest.y + closest.ny * marginPx;
    const dot = vx * closest.nx + vy * closest.ny;
    const outVx = dot < 0 ? vx - closest.nx * dot : vx;
    const outVy = dot < 0 ? vy - closest.ny * dot : vy;
    return {
      x: clampedX,
      y: clampedY,
      vx: outVx,
      vy: outVy,
      hitOuterWall: true,
      hitChasmEdge: false,
      vaultedChasm: false,
      normalX: closest.nx,
      normalY: closest.ny,
    };
  }

  return {
    x: nextX,
    y: nextY,
    vx,
    vy,
    hitOuterWall: false,
    hitChasmEdge: false,
    vaultedChasm: false,
    normalX: 0,
    normalY: -1,
  };
}

// Deep Obsidian Underworld Backdrop (Seamless Hades-style void behind chamber bounds)
export function renderParallaxAbyss(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  _camX: number,
  _camY: number,
  _now: number,
  chamberIndex: number
) {
  ctx.save();
  const abyssGrad = ctx.createLinearGradient(0, 0, 0, ch);
  if (chamberIndex >= 6) {
    abyssGrad.addColorStop(0, '#090306');
    abyssGrad.addColorStop(0.55, '#120407');
    abyssGrad.addColorStop(1, '#1c0605');
  } else {
    abyssGrad.addColorStop(0, '#050407');
    abyssGrad.addColorStop(0.55, '#0b0608');
    abyssGrad.addColorStop(1, '#140807');
  }
  ctx.fillStyle = abyssGrad;
  ctx.fillRect(0, 0, cw, ch);
  ctx.restore();
}

// Render Seamless Vast 2.5D Hand-Painted Isometric Sanctuary + Surface Craters + Exit Gates
export function renderIsometricChamberPlatform(
  ctx: CanvasRenderingContext2D,
  worldW: number,
  worldH: number,
  bgImg: HTMLImageElement | undefined,
  floorTint: string,
  chamberIndex: number,
  now: number,
  isChamberCleared: boolean,
  isNextChamberBoss: boolean,
  renderSurfaceDetailsCallback: () => void
) {
  ctx.save();

  const geom = getChamberGeometry(chamberIndex);

  // 1. Full Bleed Hand-Painted 16:9 Isometric Chamber Artwork (with rich carved Vedic courtyard fallback while streaming)
  if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
    ctx.drawImage(bgImg, 0, 0, worldW, worldH);
    if (floorTint) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = floorTint;
      ctx.fillRect(0, 0, worldW, worldH);
      ctx.restore();
    }
  } else {
    // Instant Painted-Style Vedic Stone Sanctuary Floor Fallback while high-res PNG finishes streaming
    const floorGrad = ctx.createRadialGradient(
      worldW * 0.5,
      worldH * 0.52,
      worldW * 0.06,
      worldW * 0.5,
      worldH * 0.52,
      worldW * 0.65
    );
    floorGrad.addColorStop(0, '#3a241b');
    floorGrad.addColorStop(0.55, '#241612');
    floorGrad.addColorStop(1, '#120a09');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, 0, worldW, worldH);

    // Walkable Sanctuary Platform Stone Polygon
    ctx.save();
    ctx.beginPath();
    geom.outerPolygon.forEach((pt, idx) => {
      const px = pt.x * worldW;
      const py = pt.y * worldH;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(58, 38, 28, 0.72)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(212, 165, 72, 0.45)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  // 2. Surface decals, craters, and ambient brazier floor pools
  renderSurfaceDetailsCallback();

  // ============================================================================
  // 4. MONUMENTAL ISOMETRIC "GATE TO ANOTHER PATH" ARCHWAYS, CAUSEWAYS & REWARD ORBS
  // ============================================================================
  const gatesAsset = getProcessedSpriteSync(GAME_ASSETS.exitGateArchways2x1);
  const gateOverlaysAsset = getProcessedSpriteSync(GAME_ASSETS.gateOverlays2x2);
  const rewardOrbsAsset = getProcessedSpriteSync(GAME_ASSETS.rewardOrbs2x2);

  if (chamberIndex < 7) {
    const gates = [
      {
        pos: geom.leftGate,
        orbFrame: isNextChamberBoss ? 3 : 0,
        label: isNextChamberBoss ? 'PATH OF THE SOVEREIGN' : 'PATH OF DEVA BOONS',
        subLabel: isNextChamberBoss ? 'BOSS SANCTUM AHEAD' : 'DIVINE ASTRAS & BLESSINGS',
        accent: isNextChamberBoss ? '#ff384c' : '#ffd86b',
        angle: -0.34,
      },
      {
        pos: geom.rightGate,
        orbFrame: isNextChamberBoss ? 2 : 1,
        label: isNextChamberBoss ? 'PATH OF THE SHRINE' : 'PATH OF AMRITA',
        subLabel: isNextChamberBoss ? 'SANCTUARY + RESTORE' : 'SACRED NECTAR +35 HP',
        accent: isNextChamberBoss ? '#38e8ff' : '#3ee0a8',
        angle: 0.34,
      },
    ];

    gates.forEach((g, gIdx) => {
      const gx = g.pos.x * worldW;
      const gy = g.pos.y * worldH;
      const pulse = 0.85 + Math.sin(now * 0.005 + gIdx * 1.6) * 0.15;

      // 4.1. Receding Isometric Stone Causeway Bridge ("Another Path Beyond the Gate")
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(g.angle * 0.45);

      const bridgeLen = 185;
      const bridgeW = 94;
      const bridgeGrad = ctx.createLinearGradient(0, 12, 0, -bridgeLen);
      bridgeGrad.addColorStop(0, 'rgba(28, 19, 16, 0.92)');
      bridgeGrad.addColorStop(0.55, isChamberCleared ? 'rgba(62, 34, 22, 0.85)' : 'rgba(18, 12, 12, 0.72)');
      bridgeGrad.addColorStop(1, 'rgba(6, 4, 5, 0)');

      ctx.fillStyle = bridgeGrad;
      ctx.beginPath();
      ctx.moveTo(-bridgeW * 0.55, 14);
      ctx.lineTo(bridgeW * 0.55, 14);
      ctx.lineTo(bridgeW * 0.34, -bridgeLen);
      ctx.lineTo(-bridgeW * 0.34, -bridgeLen);
      ctx.closePath();
      ctx.fill();

      // Stepped Flagstone Slabs & Glowing Runic Mortar along the receding path
      for (let step = 0; step < 6; step++) {
        const t0 = step / 6;
        const sy = 6 - t0 * (bridgeLen * 0.86);
        const sw = bridgeW * (0.96 - t0 * 0.36);
        ctx.strokeStyle = isChamberCleared
          ? `${g.accent}${Math.round((0.68 - t0 * 0.48) * 255).toString(16).padStart(2, '0')}`
          : 'rgba(180, 120, 65, 0.22)';
        ctx.lineWidth = isChamberCleared ? 2.0 : 1.1;
        ctx.strokeRect(-sw * 0.5, sy - 16, sw, 13);
      }

      // Volumetric Portal God-Ray spilling from the gate onto the arena floor
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const rayLen = isChamberCleared ? 165 : 78;
      const rayGrad = ctx.createLinearGradient(0, -24, 0, rayLen);
      rayGrad.addColorStop(0, isChamberCleared ? g.accent + 'aa' : 'rgba(255, 72, 36, 0.45)');
      rayGrad.addColorStop(0.45, isChamberCleared ? g.accent + '44' : 'rgba(255, 72, 36, 0.14)');
      rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(-42, -18);
      ctx.lineTo(42, -18);
      ctx.lineTo(84, rayLen);
      ctx.lineTo(-84, rayLen);
      ctx.closePath();
      ctx.fill();

      // Animated Glowing Path Chevrons beckoning Rudra through the unsealed gate
      if (isChamberCleared) {
        for (let c = 0; c < 3; c++) {
          const cy = 62 - ((now * 0.048 + c * 26) % 78);
          const cAlpha = Math.max(0, Math.min(1, (62 - cy) / 55)) * (1 - Math.max(0, (12 - cy) / 30));
          ctx.globalAlpha = cAlpha * 0.85;
          ctx.strokeStyle = g.accent;
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(-18, cy + 8);
          ctx.lineTo(0, cy - 4);
          ctx.lineTo(18, cy + 8);
          ctx.stroke();
        }
      }
      ctx.restore();
      ctx.restore();

      // 4.2. Ground Portal Mandala Pool under each exit gate
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.translate(gx, gy + 8);
      ctx.scale(1, 0.52);
      const gatePool = ctx.createRadialGradient(0, 0, 10, 0, 0, isChamberCleared ? 165 : 108);
      gatePool.addColorStop(0, isChamberCleared ? g.accent + '99' : 'rgba(255, 68, 36, 0.42)');
      gatePool.addColorStop(0.55, isChamberCleared ? g.accent + '38' : 'rgba(255, 120, 42, 0.14)');
      gatePool.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gatePool;
      ctx.beginPath();
      ctx.arc(0, 0, isChamberCleared ? 165 : 108, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 4.3. Hand-Painted Isometric Gopuram Gate Archway + Chained/Unsealed Portal Overlay
      if (chamberIndex !== 6 && gatesAsset && gatesAsset.frames.length >= 2) {
        const frameIdx = isChamberCleared ? 1 : 0;
        const f = gatesAsset.frames[frameIdx] || gatesAsset.frames[0];
        const gateH = 228;
        const gateW = (f.sw / Math.max(1, f.sh)) * gateH;
        ctx.save();
        ctx.translate(gx, gy);
        ctx.drawImage(
          gatesAsset.cleanCanvas,
          f.sx,
          f.sy,
          f.sw,
          f.sh,
          -gateW * 0.5,
          -gateH * 0.78,
          gateW,
          gateH
        );
        ctx.restore();
      }

      if (gateOverlaysAsset && gateOverlaysAsset.frames.length >= 2) {
        const overlayIdx = isChamberCleared ? 1 : 0;
        const f = gateOverlaysAsset.frames[overlayIdx] || gateOverlaysAsset.frames[0];
        const ovSize = chamberIndex === 6 ? 164 : 132;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = isChamberCleared ? 0.92 * pulse : 0.84;
        ctx.translate(gx, gy - 46);
        ctx.drawImage(
          gateOverlaysAsset.cleanCanvas,
          f.sx,
          f.sy,
          f.sw,
          f.sh,
          -ovSize * 0.5,
          -ovSize * 0.5,
          ovSize,
          ovSize
        );
        ctx.restore();
      }

      // 4.4. Floating Next-Path Reward Sigil & Path Inscription
      if (rewardOrbsAsset && rewardOrbsAsset.frames.length > 0) {
        const orbIdx = Math.min(rewardOrbsAsset.frames.length - 1, g.orbFrame);
        const of = rewardOrbsAsset.frames[orbIdx];
        const bobY = Math.sin(now * 0.004 + g.orbFrame * 1.7) * 8;
        const orbSize = isChamberCleared ? 82 : 58;

        ctx.save();
        ctx.translate(gx, gy - 104 + bobY);
        ctx.globalAlpha = isChamberCleared ? 1.0 : 0.82;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const oGlow = ctx.createRadialGradient(0, 0, 4, 0, 0, orbSize * 0.98);
        oGlow.addColorStop(0, g.accent + 'bb');
        oGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = oGlow;
        ctx.beginPath();
        ctx.arc(0, 0, orbSize * 0.98, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.drawImage(
          rewardOrbsAsset.cleanCanvas,
          of.sx,
          of.sy,
          of.sw,
          of.sh,
          -orbSize * 0.5,
          -orbSize * 0.5,
          orbSize,
          orbSize
        );

        ctx.font = "bold 12px 'Cinzel', Georgia, serif";
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.95)';
        ctx.lineWidth = 3.5;
        const titleText = isChamberCleared ? `GATE UNSEALED · ${g.label}` : `SEALED · ${g.label}`;
        ctx.strokeText(titleText, 0, orbSize * 0.54 + 10);
        ctx.fillStyle = isChamberCleared ? g.accent : '#d8b48a';
        ctx.fillText(titleText, 0, orbSize * 0.54 + 10);

        if (isChamberCleared) {
          ctx.font = "600 10px 'Plus Jakarta Sans', sans-serif";
          ctx.strokeText(g.subLabel, 0, orbSize * 0.54 + 24);
          ctx.fillStyle = '#f5ebd6';
          ctx.fillText(g.subLabel, 0, orbSize * 0.54 + 24);
        }
        ctx.restore();
      }
    });
  }

  ctx.restore();
}

// 100% Asset-Driven 4-Stage Isometric Floor Traps (zhy8c6zhy8c6zhy8_5d2df495.png 2x2 Sheet)
// Top-Left (0): Dormant Stone Plate | Top-Right (1): Priming Molten Plate
// Bottom-Left (2): Erupted Bloodied Iron Spikes | Bottom-Right (3): Roaring Agni Lotus Fire Plume
export function updateAndRenderPressureTraps(
  ctx: CanvasRenderingContext2D,
  traps: ChamberTrapRuntime[],
  dt: number,
  now: number,
  player: { x: number; y: number; hp: number; invulnTimer: number; hitFlashTimer: number; elevationY: number },
  enemies: Array<{
    x: number;
    y: number;
    hp: number;
    posture: number;
    maxPosture: number;
    postureBrokenTimer: number;
    hitFlashTimer: number;
    aiState: string;
    scorchTimer: number;
  }>,
  callbacks: {
    onTrapTriggered: (x: number, y: number) => void;
    onTrapErupt: (trap: ChamberTrapRuntime, hitPlayer: boolean, enemiesHitCount: number) => void;
  }
) {
  const trapsAsset = getProcessedSpriteSync(GAME_ASSETS.floorTraps2x2);

  for (let i = 0; i < traps.length; i++) {
    const trap = traps[i];

    if (trap.state === 'idle') {
      const playerOnPlate =
        player.elevationY < 10 &&
        Math.hypot(player.x - trap.x, (player.y - trap.y) * 1.35) <= trap.radius * 0.85;
      const enemyOnPlate = enemies.some(
        (e) =>
          e.aiState !== 'ko' &&
          Math.hypot(e.x - trap.x, (e.y - trap.y) * 1.35) <= trap.radius * 0.85
      );
      if (playerOnPlate || enemyOnPlate) {
        trap.state = 'priming';
        trap.timer = 0.52;
        callbacks.onTrapTriggered(trap.x, trap.y);
      }
    } else if (trap.state === 'priming') {
      trap.timer -= dt;
      if (trap.timer <= 0) {
        trap.state = 'erupting';
        trap.timer = 0.65;

        let hitPlayer = false;
        if (
          player.invulnTimer <= 0 &&
          player.elevationY < 12 &&
          Math.hypot(player.x - trap.x, (player.y - trap.y) * 1.3) <= trap.radius * 1.15
        ) {
          player.hp = Math.max(0, player.hp - 24);
          player.hitFlashTimer = 0.12;
          hitPlayer = true;
        }

        let enemiesHitCount = 0;
        enemies.forEach((e) => {
          if (e.aiState === 'ko') return;
          if (Math.hypot(e.x - trap.x, (e.y - trap.y) * 1.3) <= trap.radius * 1.25) {
            e.hp = Math.max(0, e.hp - 145);
            e.hitFlashTimer = 0.14;
            if (trap.kind === 'agni_vent') {
              e.scorchTimer = Math.max(e.scorchTimer, 4.0);
            }
            e.posture = Math.max(0, e.posture - 160);
            if (e.posture <= 0 && e.postureBrokenTimer <= 0) {
              e.postureBrokenTimer = 4.0;
              e.aiState = 'recover';
            }
            enemiesHitCount++;
          }
        });

        callbacks.onTrapErupt(trap, hitPlayer, enemiesHitCount);
      }
    } else if (trap.state === 'erupting') {
      trap.timer -= dt;
      if (trap.timer <= 0) {
        trap.state = 'cooldown';
        trap.timer = 2.6;
      }
    } else if (trap.state === 'cooldown') {
      trap.timer -= dt;
      if (trap.timer <= 0) {
        trap.state = 'idle';
      }
    }

    // Render using the hand-painted 2x2 Isometric Floor Trap Sprite Sheet (zhy8c6zhy8c6zhy8_5d2df495.png)
    if (trapsAsset && trapsAsset.frames.length >= 4) {
      let frameIdx = 0;
      if (trap.state === 'priming') {
        frameIdx = 1; // Armed glowing molten-cracked plate
      } else if (trap.state === 'erupting') {
        frameIdx = trap.kind === 'chakram_slicer' ? 2 : 3; // 2: Erupted Iron Spikes, 3: Roaring Agni Lotus Plume
      } else {
        frameIdx = 0; // Dormant plate
      }

      const f = trapsAsset.frames[frameIdx] || trapsAsset.frames[0];
      const baseSize = trap.radius * 2.35;
      const drawW = baseSize;
      const drawH = (f.sh / Math.max(1, f.sw)) * drawW;

      ctx.save();
      ctx.translate(trap.x, trap.y);

      if (trap.state === 'priming') {
        const pulse = 0.85 + Math.sin(now * 0.035) * 0.15;
        ctx.scale(pulse, pulse);
      }

      ctx.drawImage(
        trapsAsset.cleanCanvas,
        f.sx,
        f.sy,
        f.sw,
        f.sh,
        -drawW * 0.5,
        trap.state === 'erupting' && frameIdx === 3 ? -drawH * 0.72 : -drawH * 0.55,
        drawW,
        drawH
      );
      ctx.restore();
    }
  }
}

// Smooth Chamber Transition Wipe (no hanging corner foreground overlays)
export function renderForegroundParallaxAndWipe(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  _camX: number,
  _camY: number,
  wipeProgress: number
) {
  // Smooth Hades Diamond Iris Chamber Transition Wipe
  if (wipeProgress > 0 && wipeProgress < 1) {
    const alpha = Math.sin((1 - wipeProgress) * Math.PI);
    ctx.save();
    ctx.fillStyle = `rgba(5, 3, 4, ${(alpha * 0.85).toFixed(3)})`;
    ctx.fillRect(0, 0, cw, ch);
    ctx.restore();
  }
}
