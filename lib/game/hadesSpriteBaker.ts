import * as THREE from 'three';

export type HadesPaletteProfile = 'rudra_bronze' | 'dundubhi_chola' | 'vrikodara_crimson';

export interface RgbPixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/**
 * Pure pixel-level color grading function that preserves the authentic original
 * hues of Rudra, Dundubhi, and Vrikodara while removing washed-out grey flatness
 * via natural S-curve contrast, crisp dark ink crevices, and true pigment saturation
 * (without any artificial orange/copper "oiled" color override).
 */
export function gradePixelToHadesPalette(
  r: number,
  g: number,
  b: number,
  a: number,
  profile: HadesPaletteProfile
): RgbPixel {
  if (a === 0) return { r, g, b, a };

  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const chroma = maxC - minC;

  // 1. Deep ink shadow crevices (muscle & armor outlines baked into texture)
  if (luma < 36) {
    return {
      r: clampByte(r * 0.62),
      g: clampByte(g * 0.60),
      b: clampByte(b * 0.64),
      a,
    };
  }

  // 2. Sacred Vibhuti ash markings, bone trim & bright highlights
  if (luma > 202 && chroma < 38) {
    return {
      r: clampByte(Math.min(255, r * 1.12 + 12)),
      g: clampByte(Math.min(255, g * 1.12 + 12)),
      b: clampByte(Math.min(255, b * 1.10 + 10)),
      a,
    };
  }

  // 3. Crimson dhoti / blood-ribbon / warlord crimson accents
  if (r - g > 22 && r > 70) {
    return {
      r: clampByte(r * 1.24 + 10),
      g: clampByte(g * 0.84),
      b: clampByte(b * 0.84),
      a,
    };
  }

  // 4. Preserve original hue of skin, hide, and armor while applying crisp S-curve contrast
  // and natural saturation boost so it never looks washed-out grey OR artificially oiled orange.
  const contrastFactor = profile === 'rudra_bronze' ? 1.16 : 1.18;
  const satBoost = profile === 'rudra_bronze' ? 1.24 : 1.26;
  const targetLuma = 122 + (luma - 122) * contrastFactor;

  const dr = (r - luma) * satBoost;
  const dg = (g - luma) * satBoost;
  const db = (b - luma) * satBoost;

  return {
    r: clampByte(targetLuma + dr),
    g: clampByte(targetLuma + dg),
    b: clampByte(targetLuma + db),
    a,
  };
}

/**
 * Applies `gradePixelToHadesPalette` to a loaded Three.js texture once at load time,
 * returning a crisp `THREE.CanvasTexture` with natural original colors and dark ink crevices.
 */
export function regradeTextureToHadesPalette(
  tex: THREE.Texture | null,
  profile: HadesPaletteProfile
): THREE.Texture | null {
  if (!tex || typeof document === 'undefined') return tex;
  const img = tex.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | undefined;
  if (!img || !('width' in img) || !('height' in img) || img.width <= 0 || img.height <= 0) {
    return tex;
  }

  try {
    const workCanvas = document.createElement('canvas');
    const w = Math.min(1024, img.width);
    const h = Math.min(1024, img.height);
    workCanvas.width = w;
    workCanvas.height = h;
    const ctx = workCanvas.getContext('2d');
    if (!ctx) return tex;

    ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const graded = gradePixelToHadesPalette(
        data[i],
        data[i + 1],
        data[i + 2],
        data[i + 3],
        profile
      );
      data[i] = graded.r;
      data[i + 1] = graded.g;
      data[i + 2] = graded.b;
      data[i + 3] = graded.a;
    }

    ctx.putImageData(imgData, 0, 0);
    const gradedTex = new THREE.CanvasTexture(workCanvas);
    gradedTex.colorSpace = THREE.SRGBColorSpace;
    gradedTex.flipY = tex.flipY;
    gradedTex.wrapS = tex.wrapS;
    gradedTex.wrapT = tex.wrapT;
    gradedTex.needsUpdate = true;
    return gradedTex;
  } catch {
    return tex;
  }
}

/**
 * Quantizes continuous animation time and 360° yaw into bounded cyclic Hades 2D sprite-sheet steps
 * so every character animation loop hits the GPU-baked frame cache after 1 cycle with zero stutter.
 */
export function computeSpriteSheetFrameKey(params: {
  id: string;
  animName: string;
  animTime: number;
  clipDuration?: number;
  yawRad: number;
  isAttacking: boolean;
  isHurt: boolean;
  isParrying: boolean;
  phase?: number;
  yawDirections?: number;
  stepsPerClip?: number;
}): {
  frameKey: string;
  quantizedYaw: number;
  quantizedTimeStep: number;
} {
  const dur = Math.max(0.2, params.clipDuration ?? 1.0);
  const steps = Math.max(6, params.stepsPerClip ?? (params.isAttacking ? 60 : 30));
  const normPhase = ((Math.max(0, params.animTime) % dur) / dur);
  const quantizedTimeStep = Math.min(steps - 1, Math.floor(normPhase * steps));

  const dirSteps = Math.max(8, params.yawDirections ?? 36);
  const twoPi = Math.PI * 2;
  const normYaw = ((params.yawRad % twoPi) + twoPi) % twoPi;
  const yawIdx = Math.round((normYaw / twoPi) * dirSteps) % dirSteps;
  const quantizedYaw = (yawIdx / dirSteps) * twoPi;

  const flags = `${params.isAttacking ? 'A' : ''}${params.isHurt ? 'H' : ''}${
    params.isParrying ? 'P' : ''
  }${params.phase ?? 1}`;

  const frameKey = `${params.id}:${params.animName}:t${quantizedTimeStep}:d${yawIdx}:${flags}`;
  return {
    frameKey,
    quantizedYaw,
    quantizedTimeStep,
  };
}

/**
 * Converts raw 3D WebGL character renders into Hades-grade 2D ink-outlined
 * sprite frames while preserving authentic original colors without artificial warm/oiled blowout.
 */
export class Hades2DSpriteBaker {
  private readonly size: number;
  private readonly inkCanvas: HTMLCanvasElement;
  private readonly inkCtx: CanvasRenderingContext2D | null;
  private readonly cache = new Map<string, HTMLCanvasElement>();
  private readonly maxCacheFrames: number;
  private lastFrameKey = '';

  constructor(size: number, maxCacheFrames = 96) {
    this.size = size;
    this.maxCacheFrames = maxCacheFrames;

    this.inkCanvas = document.createElement('canvas');
    this.inkCanvas.width = size;
    this.inkCanvas.height = size;
    this.inkCtx = this.inkCanvas.getContext('2d');
  }

  public hasCachedFrame(frameKey: string): boolean {
    return this.cache.has(frameKey);
  }

  public drawCachedFrame(frameKey: string, targetCanvas: HTMLCanvasElement): boolean {
    if (frameKey === this.lastFrameKey) {
      return true;
    }
    const cached = this.cache.get(frameKey);
    if (!cached) return false;

    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return false;
    ctx.clearRect(0, 0, this.size, this.size);
    ctx.drawImage(cached, 0, 0);
    this.lastFrameKey = frameKey;
    return true;
  }

  /**
   * Stylizes the rendered 3D `webglCanvas` into a true 2D Hades hand-painted sprite on `targetCanvas`
   * with crisp #120806 silhouette outline and clean color-true sRGB diffuse rendering.
   */
  public bakeSpriteFrame(
    webglCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement,
    options: {
      frameKey: string;
      rimColor?: string;
      outlinePx?: number;
      isHurt?: boolean;
      cacheFrame?: boolean;
    }
  ): void {
    const outCtx = targetCanvas.getContext('2d');
    if (!outCtx) return;

    const baked = bake2DSpriteFrameFromCanvas(webglCanvas, options.frameKey, {
      outlineColor: options.isHurt ? '#ffffff' : '#120806',
      outlineThickness: options.outlinePx ?? 2,
      hitFlash: Boolean(options.isHurt),
      cacheFrame: options.cacheFrame,
    });
    outCtx.clearRect(0, 0, this.size, this.size);
    outCtx.drawImage(baked, 0, 0, this.size, this.size);
    this.lastFrameKey = options.frameKey;
  }
}

/**
 * Applies clean, color-true sRGB diffuse material settings to a 3D hierarchy
 * (zero muddy step-shader banding, zero plastic specular glare) so models show
 * the exact colors of their uploaded .png textures.
 */
export function applyHadesCelShadingToHierarchy(
  root: THREE.Object3D,
  _options?: {
    rimColor?: number;
    rimIntensity?: number;
  }
): void {
  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    const updated = mats.map((m) => {
      if (!m) return m;
      const std = m as THREE.MeshStandardMaterial;
      if ('roughness' in std) {
        std.roughness = 0.85;
      }
      if ('metalness' in std) {
        std.metalness = 0.08;
      }
      if ('emissive' in std && std.emissive) {
        std.emissive.setHex(0x000000);
        std.emissiveIntensity = 0.0;
      }
      std.needsUpdate = true;
      return std;
    });

    mesh.material = Array.isArray(mesh.material) ? updated : updated[0];
  });
}

const sharedFrameCache = new Map<string, HTMLCanvasElement>();
let sharedSilhouetteCanvas: HTMLCanvasElement | null = null;
let sharedSilhouetteCtx: CanvasRenderingContext2D | null = null;

function getSharedSilhouetteCanvas(w: number, h: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
} {
  if (!sharedSilhouetteCanvas) {
    sharedSilhouetteCanvas = document.createElement('canvas');
    sharedSilhouetteCtx = sharedSilhouetteCanvas.getContext('2d');
  }
  if (sharedSilhouetteCanvas.width !== w || sharedSilhouetteCanvas.height !== h) {
    sharedSilhouetteCanvas.width = w;
    sharedSilhouetteCanvas.height = h;
  } else if (sharedSilhouetteCtx) {
    sharedSilhouetteCtx.clearRect(0, 0, w, h);
  }
  return { canvas: sharedSilhouetteCanvas, ctx: sharedSilhouetteCtx };
}

/**
 * Fast GPU-accelerated 2D Sprite Baker that converts a rendered 3D WebGL frame into a crisp
 * Hades-style 2D sprite with #120806 dark comic-ink silhouette outlines, warm upper rim highlight,
 * and optional 3-frame white-gold hit-flash.
 */
export function bake2DSpriteFrameFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  cacheKey: string,
  options?: {
    outlineColor?: string;
    outlineThickness?: number;
    hitFlash?: boolean;
    cacheFrame?: boolean;
  }
): HTMLCanvasElement {
  if (options?.cacheFrame !== false && sharedFrameCache.has(cacheKey)) {
    return sharedFrameCache.get(cacheKey)!;
  }

  const w = sourceCanvas.width || 256;
  const h = sourceCanvas.height || 256;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  const thickness = options?.outlineThickness ?? 2;
  const outlineColor = options?.outlineColor ?? '#120806';

  // 1. Draw crisp 2D silhouette outline using GPU-composited directional offsets on reused scratch canvas
  const { canvas: silhouetteCanvas, ctx: sCtx } = getSharedSilhouetteCanvas(w, h);
  if (sCtx) {
    sCtx.globalCompositeOperation = 'source-over';
    sCtx.drawImage(sourceCanvas, 0, 0, w, h);
    sCtx.globalCompositeOperation = 'source-in';
    sCtx.fillStyle = outlineColor;
    sCtx.fillRect(0, 0, w, h);

    const offsets = [
      [-thickness, 0],
      [thickness, 0],
      [0, -thickness],
      [0, thickness],
    ];
    for (let i = 0; i < offsets.length; i++) {
      ctx.drawImage(silhouetteCanvas, offsets[i][0], offsets[i][1], w, h);
    }

    // Subtle upper-left warm rim highlight so characters pop against dark & bright arenas
    sCtx.globalCompositeOperation = 'source-in';
    sCtx.fillStyle = 'rgba(255, 200, 110, 0.38)';
    sCtx.fillRect(0, 0, w, h);
    ctx.drawImage(silhouetteCanvas, -1.2, -1.2, w, h);
  }

  // 2. Draw crisp character sprite over the dark ink outline
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(sourceCanvas, 0, 0, w, h);

  // 3. Apply 3-frame Hades white hit-flash when struck
  if (options?.hitFlash) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255, 248, 225, 0.82)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  if (options?.cacheFrame !== false) {
    if (sharedFrameCache.size > 2400) {
      const oldest = sharedFrameCache.keys().next().value;
      if (oldest) sharedFrameCache.delete(oldest);
    }
    sharedFrameCache.set(cacheKey, outCanvas);
  }

  return outCanvas;
}

