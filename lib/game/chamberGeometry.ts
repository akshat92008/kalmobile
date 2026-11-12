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
  // Chamber 1: Vaitarani River Ghat (Grounded Stone Platform — Never Enters Sky/Walls)
  {
    outerPolygon: [
      { x: 0.22, y: 0.35 },
      { x: 0.50, y: 0.33 },
      { x: 0.78, y: 0.35 },
      { x: 0.89, y: 0.48 },
      { x: 0.86, y: 0.74 },
      { x: 0.50, y: 0.90 },
      { x: 0.14, y: 0.74 },
      { x: 0.11, y: 0.48 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.37, y: 0.36, angle: -0.35 },
    rightGate: { x: 0.63, y: 0.36, angle: 0.35 },
    traps: [],
  },
  // Chamber 2: Raktabija Blood-Kunda Courtyard (Wide Octagonal Courtyard)
  {
    outerPolygon: [
      { x: 0.22, y: 0.35 },
      { x: 0.78, y: 0.35 },
      { x: 0.89, y: 0.46 },
      { x: 0.89, y: 0.74 },
      { x: 0.72, y: 0.90 },
      { x: 0.28, y: 0.90 },
      { x: 0.11, y: 0.74 },
      { x: 0.11, y: 0.46 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.37, y: 0.36, angle: -0.35 },
    rightGate: { x: 0.63, y: 0.36, angle: 0.35 },
    traps: [],
  },
  // Chamber 3: Kurukshetra Chariot Bonefield
  {
    outerPolygon: [
      { x: 0.22, y: 0.35 },
      { x: 0.78, y: 0.35 },
      { x: 0.89, y: 0.46 },
      { x: 0.87, y: 0.78 },
      { x: 0.70, y: 0.90 },
      { x: 0.30, y: 0.90 },
      { x: 0.13, y: 0.78 },
      { x: 0.11, y: 0.46 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.37, y: 0.36, angle: -0.35 },
    rightGate: { x: 0.63, y: 0.36, angle: 0.35 },
    traps: [],
  },
  // Chamber 4: Mandapa of the War-Drum (Dundubhi Mid-Boss)
  {
    outerPolygon: [
      { x: 0.22, y: 0.35 },
      { x: 0.78, y: 0.35 },
      { x: 0.90, y: 0.48 },
      { x: 0.87, y: 0.80 },
      { x: 0.72, y: 0.90 },
      { x: 0.28, y: 0.90 },
      { x: 0.13, y: 0.80 },
      { x: 0.10, y: 0.48 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.38, y: 0.36, angle: -0.32 },
    rightGate: { x: 0.62, y: 0.36, angle: 0.32 },
    traps: [],
  },
  // Chamber 5: Bhairava Soul-Fire Sanctum
  {
    outerPolygon: [
      { x: 0.22, y: 0.35 },
      { x: 0.78, y: 0.35 },
      { x: 0.89, y: 0.46 },
      { x: 0.87, y: 0.78 },
      { x: 0.70, y: 0.90 },
      { x: 0.30, y: 0.90 },
      { x: 0.13, y: 0.78 },
      { x: 0.11, y: 0.46 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.37, y: 0.36, angle: -0.35 },
    rightGate: { x: 0.63, y: 0.36, angle: 0.35 },
    traps: [],
  },
  // Chamber 6: Shattered Gopuram Causeway
  {
    outerPolygon: [
      { x: 0.22, y: 0.35 },
      { x: 0.78, y: 0.35 },
      { x: 0.89, y: 0.46 },
      { x: 0.87, y: 0.78 },
      { x: 0.70, y: 0.90 },
      { x: 0.30, y: 0.90 },
      { x: 0.13, y: 0.78 },
      { x: 0.11, y: 0.46 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.37, y: 0.36, angle: -0.35 },
    rightGate: { x: 0.63, y: 0.36, angle: 0.35 },
    traps: [],
  },
  // Chamber 7: Sealed Gate of Jatharagni (Asura Lava Sanctum Locked -> Unlocked)
  {
    outerPolygon: [
      { x: 0.22, y: 0.35 },
      { x: 0.78, y: 0.35 },
      { x: 0.88, y: 0.48 },
      { x: 0.85, y: 0.80 },
      { x: 0.68, y: 0.90 },
      { x: 0.32, y: 0.90 },
      { x: 0.15, y: 0.80 },
      { x: 0.12, y: 0.48 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.40, y: 0.36, angle: 0 },
    rightGate: { x: 0.60, y: 0.36, angle: 0 },
    traps: [],
  },
  // Chamber 8: Sanctum of the Infernal Maw (Final Boss Vrikodara: Circular Naga / Eclipse Platform)
  {
    outerPolygon: [
      { x: 0.24, y: 0.35 },
      { x: 0.50, y: 0.33 },
      { x: 0.76, y: 0.35 },
      { x: 0.89, y: 0.48 },
      { x: 0.84, y: 0.78 },
      { x: 0.50, y: 0.90 },
      { x: 0.16, y: 0.78 },
      { x: 0.11, y: 0.48 },
    ],
    chasmIslands: [],
    leftGate: { x: 0.38, y: 0.36, angle: -0.32 },
    rightGate: { x: 0.62, y: 0.36, angle: 0.32 },
    traps: [],
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
    Math.hypot(nextX - lGx, nextY - lGy) < 82 || Math.hypot(nextX - rGx, nextY - rGy) < 82;
  if (nearGateAlcove) {
    return {
      x: Math.max(worldW * 0.14, Math.min(worldW * 0.86, nextX)),
      y: Math.max(worldH * 0.32, Math.min(worldH * 0.88, nextY)),
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

// Singleton Low-End-Optimized Arena Video Pool (Only 1 active decoder at a time + 30Hz offscreen frame blit cache)
const arenaVideoPool = new Map<string, HTMLVideoElement>();
let currentPlayingVideoUrl: string | null = null;
let offscreenVideoCanvas: HTMLCanvasElement | null = null;
let offscreenVideoCtx: CanvasRenderingContext2D | null = null;
let lastVideoBlitTimeMs = 0;
let lastBlittedVideoUrl: string | null = null;

const arenaVideoPlayPending = new Set<string>();

export function getOrStartArenaVideo(videoUrl: string | undefined, paused: boolean = false): HTMLVideoElement | null {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !videoUrl) {
    return null;
  }
  let video = arenaVideoPool.get(videoUrl);
  if (!video) {
    video = document.createElement('video');
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = videoUrl;
    const targetVid = video;
    targetVid.addEventListener('canplay', () => {
      if (currentPlayingVideoUrl === videoUrl && targetVid.paused) {
        targetVid.play().catch(() => {});
      }
    });
    targetVid.load();
    arenaVideoPool.set(videoUrl, video);
  }

  // Pause all other chamber videos so low-end devices only ever decode 1 stream
  if (currentPlayingVideoUrl !== videoUrl) {
    arenaVideoPool.forEach((otherVid, url) => {
      if (url !== videoUrl && !otherVid.paused) {
        try {
          otherVid.pause();
        } catch {}
      }
    });
    currentPlayingVideoUrl = videoUrl;
  }

  if (paused) {
    if (!video.paused) {
      try {
        video.pause();
      } catch {}
    }
  } else if (video.paused && video.readyState >= 2 && !arenaVideoPlayPending.has(videoUrl)) {
    arenaVideoPlayPending.add(videoUrl);
    video
      .play()
      .catch(() => {})
      .finally(() => {
        arenaVideoPlayPending.delete(videoUrl);
      });
  }

  return video;
}

// Render Seamless Vast 2.5D Hand-Painted Isometric Sanctuary + HD Animated Video Arena + Surface Craters + Exit Gates
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
  renderSurfaceDetailsCallback: () => void,
  activeVideoUrl?: string,
  disableVideoBg: boolean = false
) {
  ctx.save();

  const geom = getChamberGeometry(chamberIndex);
  const resolvedVideoUrl = !disableVideoBg ? activeVideoUrl : undefined;
  const activeVideo = resolvedVideoUrl ? getOrStartArenaVideo(resolvedVideoUrl, false) : null;
  const isVideoReady =
    Boolean(activeVideo) &&
    activeVideo!.readyState >= 2 &&
    activeVideo!.videoWidth > 0 &&
    activeVideo!.videoHeight > 0;

  // 1. Full Bleed 1080p HD Animated Arena Video OR Hand-Painted 16:9 Isometric Chamber Artwork
  if (isVideoReady && activeVideo) {
    const targetVidW = Math.min(1920, activeVideo.videoWidth || 1920);
    const targetVidH = Math.min(1080, activeVideo.videoHeight || 1080);
    if (
      (!offscreenVideoCanvas ||
        offscreenVideoCanvas.width !== targetVidW ||
        offscreenVideoCanvas.height !== targetVidH) &&
      typeof document !== 'undefined'
    ) {
      offscreenVideoCanvas = document.createElement('canvas');
      offscreenVideoCanvas.width = targetVidW;
      offscreenVideoCanvas.height = targetVidH;
      offscreenVideoCtx = offscreenVideoCanvas.getContext('2d', { alpha: false });
    }
    if (
      offscreenVideoCanvas &&
      offscreenVideoCtx &&
      (now - lastVideoBlitTimeMs >= 16 || lastBlittedVideoUrl !== resolvedVideoUrl)
    ) {
      offscreenVideoCtx.drawImage(
        activeVideo,
        0,
        0,
        offscreenVideoCanvas.width,
        offscreenVideoCanvas.height
      );
      lastVideoBlitTimeMs = now;
      lastBlittedVideoUrl = resolvedVideoUrl || null;
    }
    ctx.drawImage(offscreenVideoCanvas || activeVideo, 0, 0, worldW, worldH);
  } else if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
    ctx.drawImage(bgImg, 0, 0, worldW, worldH);
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

  // 1.5. Kurukshetra Blood-Eclipse Grade: Hades-level value hierarchy (Dark Floors 30-42% -> Bright Characters 75-90% -> Luminous VFX 100%)
  ctx.save();
  // Warm obsidian-amber dusk multiply pass that tames overly bright cream/sandstone floors (especially Chamber 1)
  ctx.globalCompositeOperation = 'multiply';
  const isBrightSandstoneChamber = chamberIndex === 0 || chamberIndex === 2;
  const eclipseTone = ctx.createRadialGradient(
    worldW * 0.5,
    worldH * 0.56,
    worldW * 0.08,
    worldW * 0.5,
    worldH * 0.54,
    worldW * 0.66
  );
  if (isBrightSandstoneChamber) {
    eclipseTone.addColorStop(0, 'rgba(138, 102, 78, 0.92)');
    eclipseTone.addColorStop(0.55, 'rgba(98, 66, 52, 0.95)');
    eclipseTone.addColorStop(1, 'rgba(42, 22, 20, 0.98)');
  } else {
    eclipseTone.addColorStop(0, 'rgba(176, 142, 118, 0.92)');
    eclipseTone.addColorStop(0.6, 'rgba(128, 92, 76, 0.95)');
    eclipseTone.addColorStop(1, 'rgba(56, 30, 28, 0.98)');
  }
  ctx.fillStyle = eclipseTone;
  ctx.fillRect(0, 0, worldW, worldH);

  // Subtle atmospheric obsidian-crimson perimeter vignette + top canopy shadow for crisp HUD & character contrast
  ctx.globalCompositeOperation = 'source-over';
  const vignette = ctx.createRadialGradient(
    worldW * 0.5,
    worldH * 0.56,
    worldW * 0.24,
    worldW * 0.5,
    worldH * 0.54,
    worldW * 0.68
  );
  vignette.addColorStop(0, isBrightSandstoneChamber ? 'rgba(18, 8, 10, 0.18)' : 'rgba(14, 6, 8, 0.10)');
  vignette.addColorStop(0.68, 'rgba(14, 6, 8, 0.34)');
  vignette.addColorStop(1, 'rgba(8, 3, 5, 0.66)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, worldW, worldH);

  if (floorTint) {
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = floorTint;
    ctx.fillRect(0, 0, worldW, worldH);
  }
  ctx.restore();

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

      // 4.1. Flush Recessed Isometric Floor Portal & Vedic Yantra Threshold (Embedded flat into stone floor, never floating in air!)
      ctx.save();
      ctx.translate(gx, gy + 4);
      ctx.scale(1, 0.52);

      // Outer carved obsidian & Chola-bronze floor ring
      const outerR = isChamberCleared ? 78 : 66;
      ctx.fillStyle = 'rgba(12, 7, 6, 0.88)';
      ctx.beginPath();
      ctx.arc(0, 0, outerR + 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isChamberCleared ? g.accent : 'rgba(198, 146, 84, 0.55)';
      ctx.lineWidth = isChamberCleared ? 3.5 : 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, outerR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = isChamberCleared ? '#fff0c8' : 'rgba(160, 88, 54, 0.42)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, outerR * 0.74, 0, Math.PI * 2);
      ctx.stroke();

      // 8-point Vedic Ashtadala Lotus / Yantra spokes carved flat into the floor
      const rot = isChamberCleared ? now * 0.0008 * (gIdx === 0 ? 1 : -1) : 0;
      ctx.save();
      ctx.rotate(rot);
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        ctx.strokeStyle = isChamberCleared ? g.accent + 'cc' : 'rgba(210, 95, 55, 0.35)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (outerR * 0.28), Math.sin(a) * (outerR * 0.28));
        ctx.lineTo(Math.cos(a) * (outerR * 0.94), Math.sin(a) * (outerR * 0.94));
        ctx.stroke();
      }
      ctx.restore();

      // Inner glowing portal well
      const gatePool = ctx.createRadialGradient(0, 0, 6, 0, 0, outerR);
      gatePool.addColorStop(0, isChamberCleared ? g.accent + 'cc' : 'rgba(255, 68, 36, 0.45)');
      gatePool.addColorStop(0.58, isChamberCleared ? g.accent + '44' : 'rgba(180, 42, 24, 0.18)');
      gatePool.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gatePool;
      ctx.beginPath();
      ctx.arc(0, 0, outerR, 0, Math.PI * 2);
      ctx.fill();

      // Project gate overlay rune flat onto the isometric floor plane
      if (gateOverlaysAsset && gateOverlaysAsset.frames.length >= 2) {
        const overlayIdx = isChamberCleared ? 1 : 0;
        const f = gateOverlaysAsset.frames[overlayIdx] || gateOverlaysAsset.frames[0];
        const ovSize = outerR * 1.65;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = isChamberCleared ? 0.85 * pulse : 0.65;
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
      ctx.restore();

      // 4.2. Grounded Next-Path Reward Sigil & Path Inscription (Appears once the chamber is cleared so nothing floats in the air during combat!)
      if (isChamberCleared && rewardOrbsAsset && rewardOrbsAsset.frames.length > 0) {
        const orbIdx = Math.min(rewardOrbsAsset.frames.length - 1, g.orbFrame);
        const of = rewardOrbsAsset.frames[orbIdx];
        const bobY = Math.sin(now * 0.004 + g.orbFrame * 1.7) * 4;
        const orbSize = 52;

        ctx.save();
        ctx.translate(gx, gy - 22 + bobY);
        ctx.globalAlpha = isChamberCleared ? 1.0 : 0.84;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const oGlow = ctx.createRadialGradient(0, 0, 4, 0, 0, orbSize * 0.95);
        oGlow.addColorStop(0, g.accent + 'bb');
        oGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = oGlow;
        ctx.beginPath();
        ctx.arc(0, 0, orbSize * 0.95, 0, Math.PI * 2);
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
        const titleText = isChamberCleared ? `UNSEALED · ${g.label}` : `SEALED · ${g.label}`;
        ctx.strokeText(titleText, 0, orbSize * 0.54 + 12);
        ctx.fillStyle = isChamberCleared ? g.accent : '#d8b48a';
        ctx.fillText(titleText, 0, orbSize * 0.54 + 12);

        if (isChamberCleared) {
          ctx.font = "600 10px 'Plus Jakarta Sans', sans-serif";
          ctx.strokeText(g.subLabel, 0, orbSize * 0.54 + 26);
          ctx.fillStyle = '#f5ebd6';
          ctx.fillText(g.subLabel, 0, orbSize * 0.54 + 26);
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
