import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import type { EnemyTrait, Warden3DRigKey } from './assets';
import {
  applyHadesCelShadingToHierarchy,
  bake2DSpriteFrameFromCanvas,
} from './hadesSpriteBaker';
import { loadFbxCached, simplifyBufferGeometry } from './meshSimplifier';
import { IS_SOFTWARE_WEBGL } from '../../engine/ue5GraphicsEngine';

const sharedAnimFbxCache = new Map<string, Promise<THREE.Group | null>>();

export type RegularEnemy3DKind =
  | 'wolf_guai'
  | 'fire_monk'
  | 'stone_golem'
  | 'furnace_titan';

export type EnemyArchetype = 'grunt' | 'archer' | 'brute' | 'witch' | 'shield' | 'bomber';
export type Enemy3DAnimState = 'idle' | 'chase' | 'windup' | 'attack' | 'hurt' | 'death';

export interface Enemy3DRenderInput {
  id: number;
  kind: RegularEnemy3DKind;
  wardenRigKey?: Warden3DRigKey;
  trait?: EnemyTrait;
  animTime: number;
  stateProgress?: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  aimAngle: number;
  aiState: 'idle' | 'chase' | 'windup' | 'attack' | 'recover' | 'ko';
  windupProgress: number;
  isPostureBroken: boolean;
  isHitFlash: boolean;
  isParrying: boolean;
}

type EnemyWeaponKind = 'minotaur_axe' | 'trident_axe' | 'none';

interface EnemyModelSlot {
  key: string;
  generateFbxUrl: string;
  textureFbxUrl: string;
  diffuseUrl: string;
  weaponKind: EnemyWeaponKind;
  animUrls: Record<Enemy3DAnimState, string>;
  rimColor: number;
  rimIntensity: number;
  scaleMultiplier: number;
  standingHipY: number;
  group: THREE.Group | null;
  mixer: THREE.AnimationMixer | null;
  actions: Partial<Record<Enemy3DAnimState, THREE.AnimationAction>>;
  ready: boolean;
}

const ANIM_BASE = '/new_3d_assets/Animations';
const MODEL_BASE = '/new_3d_assets/3D Models';
const MINOTAUR_AXE_FBX_URL = `${MODEL_BASE}/Weapons/Minotaur_War_Axe_20261111/Meshy_AI_Minotaur_War_Axe_20261111_texture.fbx`;
const TRIDENT_AXE_FBX_URL = `${MODEL_BASE}/Weapons/Bloodforged_Trident_Axe_20261025/Meshy_AI_Bloodforged_Trident_Axe_20261025_texture.fbx`;
const TRIDENT_AXE_TEX_URL = `/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.png`;

/**
 * Curated, zero-lag roster of verified 3D enemy models with 1:1 UV texture maps
 * and real 3D weapons (Minotaur_War_Axe or Bloodforged_Trident_Axe).
 * Only the 1-2 enemy rigs present in the current chamber are lazy-loaded.
 */
const ENEMY_MODEL_SLOTS: Record<
  string,
  Omit<EnemyModelSlot, 'group' | 'mixer' | 'actions' | 'ready' | 'standingHipY'>
> = {
  grunt_ghoul: {
    key: 'grunt_ghoul',
    generateFbxUrl: `${ANIM_BASE}/Great Sword Pack/Meshy_AI_Bleeding_Crown_Ghoul_20261111_generate.fbx`,
    textureFbxUrl: `${MODEL_BASE}/Bleeding_Crown_Ghoul/Meshy_AI_Bleeding_Crown_Ghoul_20261111_texture_fbx/Meshy_AI_Bleeding_Crown_Ghoul_20261111_texture.fbx`,
    diffuseUrl: `${MODEL_BASE}/Bleeding_Crown_Ghoul/Meshy_AI_Bleeding_Crown_Ghoul_20261111_texture_fbx/Meshy_AI_Bleeding_Crown_Ghoul_20261111_texture.png`,
    weaponKind: 'minotaur_axe',
    animUrls: {
      idle: `${ANIM_BASE}/Pro Melee Axe Pack/standing idle.fbx`,
      chase: `${ANIM_BASE}/Pro Melee Axe Pack/standing run forward.fbx`,
      windup: `${ANIM_BASE}/Pro Melee Axe Pack/standing melee attack backhand.fbx`,
      attack: `${ANIM_BASE}/Pro Melee Axe Pack/standing melee combo attack ver. 1.fbx`,
      hurt: `${ANIM_BASE}/Pro Melee Axe Pack/standing react large from right.fbx`,
      death: `${ANIM_BASE}/Pro Magic Pack/Standing React Death Backward.fbx`,
    },
    rimColor: 0xffffff,
    rimIntensity: 0.0,
    scaleMultiplier: 1.02,
  },
  witch_oracle: {
    key: 'witch_oracle',
    generateFbxUrl: `${ANIM_BASE}/Pro Magic Pack/Meshy_AI_Ashen_Oracle_20261111_generate.fbx`,
    textureFbxUrl: `${MODEL_BASE}/Ashen_Oracle/Meshy_AI_Ashen_Oracle_20261111_texture_fbx/Meshy_AI_Ashen_Oracle_20261111_texture.fbx`,
    diffuseUrl: `${MODEL_BASE}/Ashen_Oracle/Meshy_AI_Ashen_Oracle_20261111_texture_fbx/Meshy_AI_Ashen_Oracle_20261111_texture.png`,
    weaponKind: 'none',
    animUrls: {
      idle: `${ANIM_BASE}/Pro Magic Pack/Standing Idle 03.fbx`,
      chase: `${ANIM_BASE}/Pro Magic Pack/Standing Walk Forward.fbx`,
      windup: `${ANIM_BASE}/Pro Magic Pack/Standing 1H Magic Attack 01.fbx`,
      attack: `${ANIM_BASE}/Pro Magic Pack/Standing 2H Magic Attack 01.fbx`,
      hurt: `${ANIM_BASE}/Pro Magic Pack/Standing React Small From Front.fbx`,
      death: `${ANIM_BASE}/Pro Magic Pack/Standing React Death Forward.fbx`,
    },
    rimColor: 0xffffff,
    rimIntensity: 0.0,
    scaleMultiplier: 1.0,
  },
  shield_gladiator: {
    key: 'shield_gladiator',
    generateFbxUrl: `${ANIM_BASE}/Pro Melee Axe Pack/Meshy_AI_Ironhide_Warlord_20261111_generate.fbx`,
    textureFbxUrl: `${MODEL_BASE}/Ironmaw_Gladiator/Meshy_AI_Ironmaw_Gladiator_20261111_texture_fbx/Meshy_AI_Ironmaw_Gladiator_20261111_texture.fbx`,
    diffuseUrl: `${MODEL_BASE}/Ironmaw_Gladiator/Meshy_AI_Ironmaw_Gladiator_20261111_texture_fbx/Meshy_AI_Ironmaw_Gladiator_20261111_texture.png`,
    weaponKind: 'trident_axe',
    animUrls: {
      idle: `${ANIM_BASE}/Pro Melee Axe Pack/standing block idle.fbx`,
      chase: `${ANIM_BASE}/Pro Melee Axe Pack/standing walk forward.fbx`,
      windup: `${ANIM_BASE}/Pro Melee Axe Pack/standing melee attack horizontal.fbx`,
      attack: `${ANIM_BASE}/Pro Melee Axe Pack/standing melee attack downward.fbx`,
      hurt: `${ANIM_BASE}/Pro Melee Axe Pack/standing block react large.fbx`,
      death: `${ANIM_BASE}/Pro Magic Pack/Standing React Death Backward.fbx`,
    },
    rimColor: 0xffffff,
    rimIntensity: 0.0,
    scaleMultiplier: 1.10,
  },
};

function selectSlotKeyFromInput(
  kind: RegularEnemy3DKind,
  _id: number,
  wardenRigKey?: Warden3DRigKey,
  trait?: EnemyTrait
): string {
  if (wardenRigKey === 'sovereign_titan' || wardenRigKey === 'furnace_titan' || wardenRigKey === 'stone_golem') {
    return 'shield_gladiator';
  }
  if (wardenRigKey === 'fire_monk') {
    return 'witch_oracle';
  }
  if (trait === 'vajra_shield') return 'shield_gladiator';
  if (trait === 'agni_aura') return 'witch_oracle';

  switch (kind) {
    case 'wolf_guai':
      return 'grunt_ghoul';
    case 'fire_monk':
      return 'witch_oracle';
    case 'stone_golem':
    case 'furnace_titan':
      return 'shield_gladiator';
    default:
      return 'grunt_ghoul';
  }
}

function selectSlotKey(archetype: EnemyArchetype, _idHash: number): string {
  switch (archetype) {
    case 'grunt':
      return 'grunt_ghoul';
    case 'archer':
    case 'witch':
      return 'witch_oracle';
    case 'brute':
    case 'shield':
    case 'bomber':
      return 'shield_gladiator';
    default:
      return 'grunt_ghoul';
  }
}

/**
 * Extracts the exact Mixamo standing hip elevation (`mixamorigHips.position.y`) from the
 * rigged character's embedded T-pose track (`animations[0]`), where the character's feet rest on Y=0.
 */
export function extractStandingHipY(riggedGroup: THREE.Group): number {
  let boneHipY = 0;
  riggedGroup.traverse((obj) => {
    if (!boneHipY && /hips$/i.test(obj.name)) {
      boneHipY = obj.position.y;
    }
  });
  const clip0 = riggedGroup.animations?.[0];
  if (clip0) {
    const pTrack = clip0.tracks.find((t) => /hips\.position$/i.test(t.name));
    if (pTrack && pTrack.values.length >= 2 && Math.abs(pTrack.values[1]) > 0.01) {
      return pTrack.values[1];
    }
  }
  if (Math.abs(boneHipY) > 0.01) {
    return boneHipY;
  }
  return 100;
}

/**
 * Eliminates horizontal X/Z Mixamo root-motion drift and anchors vertical hip height to
 * `standingHipY` so the character never floats into the air or walks out of the 256x256 frame!
 */
export function buildStabilizedInPlaceClip(
  clip: THREE.AnimationClip,
  targetRoot: THREE.Object3D,
  standingHipY: number
): THREE.AnimationClip {
  const boneMap = new Map<string, string>();
  targetRoot.traverse((obj) => {
    const clean = obj.name.replace(/^mixamorig:?/i, '').toLowerCase();
    boneMap.set(clean, obj.name);
    boneMap.set(obj.name.toLowerCase(), obj.name);
  });

  const newTracks: THREE.KeyframeTrack[] = [];

  for (const track of clip.tracks) {
    const dotIdx = track.name.indexOf('.');
    if (dotIdx < 0) continue;
    const rawNode = track.name.slice(0, dotIdx).replace(/^Armature\|/i, '');
    const prop = track.name.slice(dotIdx + 1);
    const cleanNode = rawNode.replace(/^mixamorig:?/i, '').toLowerCase();
    const mappedBone = boneMap.get(cleanNode) || boneMap.get(rawNode.toLowerCase());
    if (!mappedBone) continue;
    if (prop === 'scale') continue;

    if (prop === 'position') {
      if (cleanNode !== 'hips' && !cleanNode.endsWith('hips')) continue;
      const cloned = track.clone();
      cloned.name = `${mappedBone}.position`;
      const vals = cloned.values;
      const baseX = vals[0] || 0;
      const baseY = vals[1] || standingHipY;
      const baseZ = vals[2] || 0;

      const hipUnitRatio =
        Math.abs(baseY) > 10 && Math.abs(standingHipY) < 5
          ? standingHipY / Math.abs(baseY)
          : Math.abs(baseY) < 5 && Math.abs(standingHipY) > 10
            ? standingHipY / Math.max(0.1, Math.abs(baseY))
            : 1.0;
      const maxBounce = Math.max(0.04, 0.12 * Math.abs(standingHipY));

      for (let i = 0; i < vals.length; i += 3) {
        vals[i] = (vals[i] - baseX) * hipUnitRatio * 0.04;
        const dy = (vals[i + 1] - baseY) * hipUnitRatio;
        const clampedDy = Math.max(-maxBounce, Math.min(maxBounce, dy * 0.45));
        vals[i + 1] = standingHipY + clampedDy;
        vals[i + 2] = (vals[i + 2] - baseZ) * hipUnitRatio * 0.04;
      }
      newTracks.push(cloned);
    } else if (prop === 'quaternion') {
      const cloned = track.clone();
      cloned.name = `${mappedBone}.quaternion`;
      newTracks.push(cloned);
    }
  }

  return new THREE.AnimationClip(clip.name, clip.duration, newTracks);
}

/**
 * Transfers `skinIndex` and `skinWeight` from `rGeo` onto a decimated `tGeo` (which retains 100%
 * of its native hand-painted UV islands) after normalizing any meter-to-centimeter scale difference,
 * using a fast 48×48×48 3D BFS spatial grid so every vertex binds cleanly without twisting.
 */
function transferSkinWeightsViaSpatialGrid(
  rGeo: THREE.BufferGeometry,
  tGeo: THREE.BufferGeometry
): THREE.BufferGeometry {
  rGeo.computeBoundingBox();
  tGeo.computeBoundingBox();
  const rBB = rGeo.boundingBox!;
  const tBB = tGeo.boundingBox!;

  const rSpanX = Math.max(1e-5, rBB.max.x - rBB.min.x);
  const rSpanY = Math.max(1e-5, rBB.max.y - rBB.min.y);
  const rSpanZ = Math.max(1e-5, rBB.max.z - rBB.min.z);

  const tSpanX = Math.max(1e-5, tBB.max.x - tBB.min.x);
  const tSpanY = Math.max(1e-5, tBB.max.y - tBB.min.y);
  const tSpanZ = Math.max(1e-5, tBB.max.z - tBB.min.z);

  const rMaxSpan = Math.max(rSpanX, rSpanY, rSpanZ);
  const tMaxSpan = Math.max(tSpanX, tSpanY, tSpanZ);
  const scaleRatio = rMaxSpan / tMaxSpan;

  const tPosAttr = tGeo.attributes.position as THREE.BufferAttribute;
  const tCount = tPosAttr.count;
  const tArr = tPosAttr.array as Float32Array;

  // Apply 100x meter-to-centimeter coordinate scale alignment if needed before skin transfer
  if (Math.abs(scaleRatio - 1.0) > 0.25) {
    const rCenterX = (rBB.min.x + rBB.max.x) * 0.5;
    const rCenterY = (rBB.min.y + rBB.max.y) * 0.5;
    const rCenterZ = (rBB.min.z + rBB.max.z) * 0.5;
    const tCenterX = (tBB.min.x + tBB.max.x) * 0.5;
    const tCenterY = (tBB.min.y + tBB.max.y) * 0.5;
    const tCenterZ = (tBB.min.z + tBB.max.z) * 0.5;

    for (let i = 0; i < tCount; i++) {
      const i3 = i * 3;
      tArr[i3] = (tArr[i3] - tCenterX) * scaleRatio + rCenterX;
      tArr[i3 + 1] = (tArr[i3 + 1] - tCenterY) * scaleRatio + rCenterY;
      tArr[i3 + 2] = (tArr[i3 + 2] - tCenterZ) * scaleRatio + rCenterZ;
    }
    tPosAttr.needsUpdate = true;
    tGeo.computeBoundingBox();
    tGeo.computeBoundingSphere();
  }

  const G = 48;
  const totalCells = G * G * G;
  const cellVertex = new Int32Array(totalCells).fill(-1);
  const queue = new Int32Array(totalCells);
  let qHead = 0;
  let qTail = 0;

  const rPosAttr = rGeo.attributes.position as THREE.BufferAttribute;
  const rArr = rPosAttr.array as Float32Array;
  const rCount = rPosAttr.count;

  const sx = rSpanX / G;
  const sy = rSpanY / G;
  const sz = rSpanZ / G;

  for (let i = 0; i < rCount; i++) {
    const i3 = i * 3;
    const gx = Math.min(G - 1, Math.max(0, ((rArr[i3] - rBB.min.x) / sx) | 0));
    const gy = Math.min(G - 1, Math.max(0, ((rArr[i3 + 1] - rBB.min.y) / sy) | 0));
    const gz = Math.min(G - 1, Math.max(0, ((rArr[i3 + 2] - rBB.min.z) / sz) | 0));
    const cid = gx + gy * G + gz * G * G;
    if (cellVertex[cid] === -1) {
      cellVertex[cid] = i;
      queue[qTail++] = cid;
    }
  }

  const G2 = G * G;
  while (qHead < qTail) {
    const cid = queue[qHead++];
    const vIdx = cellVertex[cid];
    const gz = (cid / G2) | 0;
    const rem = cid - gz * G2;
    const gy = (rem / G) | 0;
    const gx = rem - gy * G;

    if (gx > 0 && cellVertex[cid - 1] === -1) {
      cellVertex[cid - 1] = vIdx;
      queue[qTail++] = cid - 1;
    }
    if (gx + 1 < G && cellVertex[cid + 1] === -1) {
      cellVertex[cid + 1] = vIdx;
      queue[qTail++] = cid + 1;
    }
    if (gy > 0 && cellVertex[cid - G] === -1) {
      cellVertex[cid - G] = vIdx;
      queue[qTail++] = cid - G;
    }
    if (gy + 1 < G && cellVertex[cid + G] === -1) {
      cellVertex[cid + G] = vIdx;
      queue[qTail++] = cid + G;
    }
    if (gz > 0 && cellVertex[cid - G2] === -1) {
      cellVertex[cid - G2] = vIdx;
      queue[qTail++] = cid - G2;
    }
    if (gz + 1 < G && cellVertex[cid + G2] === -1) {
      cellVertex[cid + G2] = vIdx;
      queue[qTail++] = cid + G2;
    }
  }

  const rSkinIdx = rGeo.attributes.skinIndex as THREE.BufferAttribute;
  const rSkinWgt = rGeo.attributes.skinWeight as THREE.BufferAttribute;
  const siSrc = rSkinIdx.array as Uint16Array | Float32Array;
  const swSrc = rSkinWgt.array as Float32Array;

  const outSkinIdx = new Uint16Array(tCount * 4);
  const outSkinWgt = new Float32Array(tCount * 4);

  for (let i = 0; i < tCount; i++) {
    const i3 = i * 3;
    const gx = Math.min(G - 1, Math.max(0, ((tArr[i3] - rBB.min.x) / sx) | 0));
    const gy = Math.min(G - 1, Math.max(0, ((tArr[i3 + 1] - rBB.min.y) / sy) | 0));
    const gz = Math.min(G - 1, Math.max(0, ((tArr[i3 + 2] - rBB.min.z) / sz) | 0));
    const cid = gx + gy * G + gz * G * G;
    const rv = Math.max(0, cellVertex[cid]);
    const rv4 = rv * 4;
    const dst4 = i * 4;

    outSkinIdx[dst4] = siSrc[rv4];
    outSkinIdx[dst4 + 1] = siSrc[rv4 + 1];
    outSkinIdx[dst4 + 2] = siSrc[rv4 + 2];
    outSkinIdx[dst4 + 3] = siSrc[rv4 + 3];

    outSkinWgt[dst4] = swSrc[rv4];
    outSkinWgt[dst4 + 1] = swSrc[rv4 + 1];
    outSkinWgt[dst4 + 2] = swSrc[rv4 + 2];
    outSkinWgt[dst4 + 3] = swSrc[rv4 + 3];
  }

  tGeo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(outSkinIdx, 4));
  tGeo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(outSkinWgt, 4));
  return tGeo;
}

/**
 * Pairs a Mixamo-rigged `SkinnedMesh` (`*_generate.fbx`) with its UV texture mesh (`*_texture.fbx`)
 * using a fine 56×56×56 decimation grid:
 *  - Path 1 (Exact 1:1 Vertex Match — Rudra `Ashen_Warborn`, `Bleeding_Crown_Ghoul`, `Ashen_Oracle`):
 *    Copies `tUv` directly onto `rGeo` and simplifies with a 56×56×56 grid.
 *  - Path 2 (Separate `*_texture.fbx` mesh — Ironmaw Heavy Brute):
 *    Simplifies `tGeo` with a 56×56×56 grid (preserving 100% of its native UV islands), normalizes
 *    coordinate scale if needed, and transfers `skinIndex` & `skinWeight` from `rGeo` via 3D BFS grid.
 *  - Path 3 (Native `SkinnedMesh` with its own UVs — Dundubhi & Vrikodara):
 *    Simplifies `rGeo` with a 56×56×56 grid while preserving native UVs and skinning untouched.
 */
export function bindTexturedGeometryToSkeleton(
  riggedRoot: THREE.Group,
  texturedRoot: THREE.Group | null,
  material: THREE.MeshStandardMaterial
): void {
  let riggedSkinned: THREE.SkinnedMesh | null = null;
  riggedRoot.traverse((child) => {
    if ((child as THREE.SkinnedMesh).isSkinnedMesh && !riggedSkinned) {
      riggedSkinned = child as THREE.SkinnedMesh;
    }
  });

  const simpGrid = 56;
  const simpMin = 32000;

  if (!riggedSkinned) {
    riggedRoot.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        m.frustumCulled = false;
        m.geometry = simplifyBufferGeometry(m.geometry, simpGrid, simpMin);
        m.material = material;
      }
    });
    return;
  }

  const rMesh = riggedSkinned as THREE.SkinnedMesh;
  rMesh.frustumCulled = false;
  const rGeo = rMesh.geometry;
  const rPos = rGeo.attributes.position;

  if (texturedRoot && riggedRoot !== texturedRoot && rPos) {
    let texMesh: THREE.Mesh | null = null;
    texturedRoot.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && !texMesh) {
        texMesh = child as THREE.Mesh;
      }
    });
    if (texMesh) {
      const tGeo = (texMesh as THREE.Mesh).geometry;
      const tPos = tGeo.attributes.position;
      const tUv = tGeo.attributes.uv;
      if (tPos && tUv) {
        if (rPos.count === tPos.count) {
          // PATH 1: Exact 1:1 vertex count match — direct UV attribute copy onto native SkinnedMesh!
          rGeo.setAttribute('uv', tUv);
          rMesh.geometry = simplifyBufferGeometry(rGeo, simpGrid, simpMin);
          rMesh.material = material;
          return;
        } else if (rGeo.attributes.skinIndex && rGeo.attributes.skinWeight) {
          // PATH 2: Bind the simplified *_texture.fbx mesh (keeping 100% of its native UV islands)
          const simpTexGeo = simplifyBufferGeometry(tGeo, simpGrid, simpMin);
          rMesh.geometry = transferSkinWeightsViaSpatialGrid(rGeo, simpTexGeo);
          rMesh.material = material;
          return;
        }
      }
    }
  }

  // PATH 3: Native SkinnedMesh with its own embedded UVs (Dundubhi & Vrikodara)
  rMesh.geometry = simplifyBufferGeometry(rGeo, simpGrid, simpMin);
  rMesh.material = material;
}

export class Enemy3DRenderer {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private slots: Map<string, EnemyModelSlot> = new Map();
  private loadingSlots: Set<string> = new Set();
  private size: number;
  private activeSlotKey: string | null = null;
  private atlasFrameCache: Map<string, HTMLCanvasElement> = new Map();
  private slotLastCanvas: Map<string, HTMLCanvasElement> = new Map();
  private lastActiveCanvas: HTMLCanvasElement | null = null;
  private frameBudgetWindowMs = 0;
  private rendersInCurrentWindow = 0;
  private sharedWeaponTemplates: Partial<Record<'minotaur_axe' | 'trident_axe', Promise<THREE.Group | null>>> = {};

  constructor(size = 256) {
    this.size = size;
    this.scene = new THREE.Scene();

    // Verified camera framing: world y=0 (feet) projects to pixel y=197 (anchorY=0.78),
    // world y=1.55 (head) projects to pixel y=61, leaving 61px headroom for overhead swings!
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    this.camera.position.set(0, 2.1, 4.4);
    this.camera.lookAt(0, 0.82, 0);

    // Bright, color-true neutral sRGB studio lighting so 3D diffuse textures match the uploaded .png files 1:1
    const ambient = new THREE.AmbientLight(0xffffff, 2.45);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfffaf2, 1.55);
    keyLight.position.set(3.2, 5.5, 4.0);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xf1f5f9, 0.75);
    fillLight.position.set(-3.5, 2.5, 2.0);
    this.scene.add(fillLight);

    if (typeof window !== 'undefined') {
      try {
        this.renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: !IS_SOFTWARE_WEBGL,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        });
        this.renderer.setSize(size, size);
        this.renderer.setPixelRatio(1);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.NoToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.setClearColor(0x000000, 0);
        this.lastActiveCanvas = this.renderer.domElement;

        Object.values(ENEMY_MODEL_SLOTS).forEach((config) => {
          this.slots.set(config.key, {
            ...config,
            standingHipY: 100,
            group: null,
            mixer: null,
            actions: {},
            ready: false,
          });
        });
      } catch (e) {
        console.warn('[Enemy3DRenderer] WebGL initialization skipped:', e);
      }
    }
  }

  private getSharedWeaponTemplate(kind: 'minotaur_axe' | 'trident_axe'): Promise<THREE.Group | null> {
    if (this.sharedWeaponTemplates[kind]) {
      return this.sharedWeaponTemplates[kind]!;
    }
    const texLoader = new THREE.TextureLoader();
    const fbxUrl = kind === 'minotaur_axe' ? MINOTAUR_AXE_FBX_URL : TRIDENT_AXE_FBX_URL;
    const promise = loadFbxCached(fbxUrl)
      .then(
        (group) =>
          new Promise<THREE.Group | null>((resolve) => {
            texLoader.load(
              encodeURI(TRIDENT_AXE_TEX_URL),
              (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.needsUpdate = true;
                const wepMat = new THREE.MeshStandardMaterial({
                  color: kind === 'minotaur_axe' ? 0xe0a85c : 0xffffff,
                  map: tex,
                  roughness: 0.72,
                  metalness: 0.22,
                });
                group.traverse((c) => {
                  if ((c as THREE.Mesh).isMesh) {
                    const wm = c as THREE.Mesh;
                    wm.geometry = simplifyBufferGeometry(wm.geometry, 56, 32000);
                    wm.material = wepMat;
                    wm.frustumCulled = false;
                  }
                });
                resolve(group);
              },
              undefined,
              () => resolve(group)
            );
          })
      )
      .catch(() => null);
    this.sharedWeaponTemplates[kind] = promise;
    return promise;
  }

  private attachWeaponToRig(baseGroup: THREE.Group, slot: EnemyModelSlot): void {
    if (slot.weaponKind === 'none') return;
    baseGroup.updateMatrixWorld(true);

    const findBone = (names: string[]): THREE.Object3D | null => {
      for (const n of names) {
        const found = baseGroup.getObjectByName(n);
        if (found) return found;
      }
      let matched: THREE.Object3D | null = null;
      baseGroup.traverse((obj) => {
        if (matched) return;
        const lower = obj.name.toLowerCase();
        if (names.some((n) => lower.endsWith(n.toLowerCase()))) {
          matched = obj;
        }
      });
      return matched;
    };

    const rightHand = findBone(['mixamorigRightHand', 'RightHand']);
    if (!rightHand) return;

    const handScaleVec = new THREE.Vector3();
    rightHand.getWorldScale(handScaleVec);
    const handScale = Math.max(1e-5, handScaleVec.x);

    this.getSharedWeaponTemplate(slot.weaponKind).then((template) => {
      if (!template) return;
      const clonedWep = template.clone(true);
      const wepBox = new THREE.Box3().setFromObject(clonedWep);
      const wepSize = new THREE.Vector3();
      wepBox.getSize(wepSize);
      const maxDim = Math.max(0.001, wepSize.x, wepSize.y, wepSize.z);
      const desiredWorldLen = 1.02 * slot.scaleMultiplier;
      const localWepScale = desiredWorldLen / (maxDim * handScale);

      const weaponSocket = new THREE.Group();
      clonedWep.scale.setScalar(localWepScale);
      if (slot.weaponKind === 'minotaur_axe') {
        // Minotaur_War_Axe blade is already along +X (thumb-up/forward axis of RightHand)
        clonedWep.rotation.set(0, 0, 0);
      } else {
        // Bloodforged_Trident_Axe blade is along +Y of group -> rotate onto +X of RightHand
        clonedWep.rotation.set(-Math.PI * 0.5, 0, -Math.PI * 0.5);
      }
      clonedWep.position.set(0.26 * maxDim * localWepScale, 0, 0);
      weaponSocket.add(clonedWep);
      applyHadesCelShadingToHierarchy(weaponSocket);
      rightHand.add(weaponSocket);
      const prefix = `${slot.key}:`;
      for (const cacheKey of Array.from(this.atlasFrameCache.keys())) {
        if (cacheKey.startsWith(prefix)) {
          this.atlasFrameCache.delete(cacheKey);
        }
      }
    });
  }

  private ensureSlotLoaded(slotKey: string): void {
    if (this.loadingSlots.has(slotKey)) return;
    const slot = this.slots.get(slotKey);
    if (!slot || slot.ready) return;

    this.loadingSlots.add(slotKey);
    const fbxLoader = new FBXLoader();
    const texLoader = new THREE.TextureLoader();

    const loadTex = (url: string): Promise<THREE.Texture | null> =>
      new Promise((resolve) => {
        if (!url) {
          resolve(null);
          return;
        }
        texLoader.load(
          encodeURI(url),
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;
            resolve(tex);
          },
          undefined,
          () => resolve(null)
        );
      });

    const loadRawFbx = (url: string, cacheableAnim = false): Promise<THREE.Group | null> => {
      if (!url) return Promise.resolve(null);
      if (cacheableAnim && sharedAnimFbxCache.has(url)) {
        return sharedAnimFbxCache.get(url)!;
      }
      const p = new Promise<THREE.Group | null>((resolve) => {
        fbxLoader.load(
          encodeURI(url),
          (group) => resolve(group),
          undefined,
          () => resolve(null)
        );
      });
      if (cacheableAnim) {
        sharedAnimFbxCache.set(url, p);
      }
      return p;
    };

    // STAGE 1: Load character rig, 1:1 texture FBX, diffuse PNG, and idle & chase clips first
    Promise.all([
      loadRawFbx(slot.generateFbxUrl),
      slot.textureFbxUrl ? loadRawFbx(slot.textureFbxUrl) : Promise.resolve(null),
      loadTex(slot.diffuseUrl),
      loadRawFbx(slot.animUrls.idle, true),
      loadRawFbx(slot.animUrls.chase, true),
    ]).then(([riggedGroup, texturedGroup, diffuseMap, idleAnimGroup, chaseAnimGroup]) => {
      const baseGroup = riggedGroup || texturedGroup;
      if (!baseGroup) return;

      slot.standingHipY = extractStandingHipY(baseGroup);

      const pbrMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: diffuseMap || null,
        roughness: 0.86,
        metalness: 0.08,
      });

      if (riggedGroup) {
        bindTexturedGeometryToSkeleton(riggedGroup, texturedGroup, pbrMat);
      } else {
        baseGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.frustumCulled = false;
            m.material = pbrMat;
          }
        });
      }

      // Compute raw height from bind box BEFORE attaching weapon so weapon bounds do not shrink character
      const rawBox = new THREE.Box3().setFromObject(baseGroup);
      const rawHeight = Math.max(0.001, rawBox.max.y - rawBox.min.y);
      const targetHeight = 1.54 * slot.scaleMultiplier;
      const scale = targetHeight / rawHeight;
      baseGroup.scale.setScalar(scale);
      baseGroup.position.set(0, -0.06, 0);

      this.attachWeaponToRig(baseGroup, slot);
      applyHadesCelShadingToHierarchy(baseGroup);

      const wrapper = new THREE.Group();
      wrapper.add(baseGroup);
      wrapper.visible = false;
      this.scene.add(wrapper);

      const mixer = new THREE.AnimationMixer(baseGroup);
      slot.group = wrapper;
      slot.mixer = mixer;

      const registerClip = (state: Enemy3DAnimState, animGroup: THREE.Group | null) => {
        if (!animGroup?.animations?.[0]) return;
        const cleanClip = buildStabilizedInPlaceClip(
          animGroup.animations[0],
          baseGroup,
          slot.standingHipY
        );
        if (cleanClip.tracks.length === 0) return;
        const action = mixer.clipAction(cleanClip);
        if (state === 'death') {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        }
        slot.actions[state] = action;
      };

      registerClip('idle', idleAnimGroup);
      registerClip('chase', chaseAnimGroup);

      if (slot.actions.idle) {
        slot.actions.idle.play();
      }

      slot.ready = true;

      // STAGE 2: Stream windup, attack, hurt, and death clips in the background and refresh cache
      Promise.all([
        loadRawFbx(slot.animUrls.windup, true),
        loadRawFbx(slot.animUrls.attack, true),
        loadRawFbx(slot.animUrls.hurt, true),
        loadRawFbx(slot.animUrls.death, true),
      ]).then(([windupAnimGroup, attackAnimGroup, hurtAnimGroup, deathAnimGroup]) => {
        registerClip('windup', windupAnimGroup);
        registerClip('attack', attackAnimGroup);
        registerClip('hurt', hurtAnimGroup);
        registerClip('death', deathAnimGroup);

        const prefix = `${slot.key}:`;
        for (const cacheKey of Array.from(this.atlasFrameCache.keys())) {
          if (cacheKey.startsWith(prefix)) {
            this.atlasFrameCache.delete(cacheKey);
          }
        }
      });
    });
  }

  public isReady(archetype?: EnemyArchetype, idHash = 0): boolean {
    if (!this.renderer) return false;
    if (!archetype) {
      for (const slot of this.slots.values()) {
        if (slot.ready) return true;
      }
      return false;
    }
    const slotKey = selectSlotKey(archetype, idHash);
    const slot = this.slots.get(slotKey);
    return Boolean(slot && slot.ready);
  }

  private renderSlotFrame(
    slotKey: string,
    state: Enemy3DAnimState,
    animTimeSec: number,
    facingAngleRad: number,
    hitFlash: boolean,
    isElite: boolean,
    stateProgress?: number
  ): HTMLCanvasElement | null {
    if (!this.renderer) return null;
    this.ensureSlotLoaded(slotKey);
    const slot = this.slots.get(slotKey);

    // Never swap an enemy into a different enemy's 3D model mid-battle
    if (!slot || !slot.ready || !slot.group || !slot.mixer) {
      return null;
    }

    const activeKey = slot.key;
    const normalizedYaw = ((facingAngleRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const yawIndex = Math.round((normalizedYaw / (Math.PI * 2)) * 12) % 12;
    const quantizedYaw = (yawIndex / 12) * Math.PI * 2;

    const isActionState =
      state === 'windup' || state === 'attack' || state === 'hurt' || state === 'death';
    const targetAction =
      slot.actions[state] ||
      (state === 'windup' || state === 'attack' ? slot.actions.attack || slot.actions.chase : undefined) ||
      slot.actions.idle;
    const clipDur = targetAction ? Math.max(0.4, targetAction.getClip().duration) : 1.0;
    const stepsPerCycle = state === 'idle' ? 10 : 12;

    const stepIndex =
      isActionState && typeof stateProgress === 'number' && Number.isFinite(stateProgress)
        ? Math.min(
            stepsPerCycle - 1,
            Math.floor(Math.max(0, Math.min(0.999, stateProgress)) * stepsPerCycle)
          )
        : Math.floor(((Math.max(0, animTimeSec) % clipDur) / clipDur) * stepsPerCycle);
    const quantizedTime = (stepIndex / stepsPerCycle) * clipDur;

    const flashTag = hitFlash ? 'flash' : isElite ? 'elite' : 'norm';
    const cacheKey = `${activeKey}:${state}:y${yawIndex}:f${stepIndex}:${flashTag}`;

    const cached = this.atlasFrameCache.get(cacheKey);
    if (cached) {
      this.lastActiveCanvas = cached;
      return cached;
    }

    // Per-frame WebGL render budget: cap at 2 uncached enemy WebGL renders per 8ms window
    const nowMs = typeof performance !== 'undefined' ? performance.now() : 0;
    if (nowMs - this.frameBudgetWindowMs > 8) {
      this.frameBudgetWindowMs = nowMs;
      this.rendersInCurrentWindow = 0;
    }
    const fallbackCanvas = this.slotLastCanvas.get(activeKey);
    if (this.rendersInCurrentWindow >= 2 && fallbackCanvas && !hitFlash) {
      this.lastActiveCanvas = fallbackCanvas;
      return fallbackCanvas;
    }
    this.rendersInCurrentWindow += 1;

    if (!slot.group || !slot.mixer) return null;

    if (this.activeSlotKey && this.activeSlotKey !== activeKey) {
      const prev = this.slots.get(this.activeSlotKey);
      if (prev && prev.group) prev.group.visible = false;
    }
    slot.group.visible = true;
    this.activeSlotKey = activeKey;

    if (targetAction) {
      slot.mixer.stopAllAction();
      targetAction.reset();
      targetAction.play();
      slot.mixer.setTime(quantizedTime);
    }

    slot.group.rotation.y = Math.PI * 0.5 - quantizedYaw;

    this.renderer.render(this.scene, this.camera);

    const outlineHex = hitFlash ? '#ffffff' : isElite ? '#ffd166' : '#120806';

    const bakedCanvas = bake2DSpriteFrameFromCanvas(this.renderer.domElement, cacheKey, {
      outlineColor: outlineHex,
      outlineThickness: isElite ? 2.5 : 2,
      hitFlash,
      cacheFrame: false,
    });

    if (this.atlasFrameCache.size > 2400) {
      const oldestKey = this.atlasFrameCache.keys().next().value;
      if (oldestKey) this.atlasFrameCache.delete(oldestKey);
    }
    this.atlasFrameCache.set(cacheKey, bakedCanvas);
    if (!hitFlash) {
      this.slotLastCanvas.set(activeKey, bakedCanvas);
    }
    this.lastActiveCanvas = bakedCanvas;

    return bakedCanvas;
  }

  public renderEnemy(input: Enemy3DRenderInput): boolean {
    const slotKey = selectSlotKeyFromInput(
      input.kind,
      input.id,
      input.wardenRigKey,
      input.trait
    );

    let animState: Enemy3DAnimState = 'idle';
    if (input.aiState === 'ko') {
      animState = 'death';
    } else if (input.isHitFlash || input.isPostureBroken) {
      animState = 'hurt';
    } else if (input.aiState === 'attack') {
      animState = 'attack';
    } else if (input.aiState === 'windup') {
      animState = 'windup';
    } else if (input.aiState === 'chase' || Math.hypot(input.vx, input.vy) > 12) {
      animState = 'chase';
    }

    const facingRad = Number.isFinite(input.aimAngle)
      ? input.aimAngle
      : input.facing === 1
        ? 0
        : Math.PI;
    const isElite = Boolean(input.wardenRigKey || input.trait);
    const resolvedProgress =
      typeof input.stateProgress === 'number'
        ? input.stateProgress
        : animState === 'windup'
          ? input.windupProgress
          : undefined;

    const canvas = this.renderSlotFrame(
      slotKey,
      animState,
      input.animTime,
      facingRad,
      input.isHitFlash,
      isElite,
      resolvedProgress
    );
    return Boolean(canvas);
  }

  public getActiveCanvas(): HTMLCanvasElement {
    return this.lastActiveCanvas || this.renderer!.domElement;
  }

  public renderEnemyFrame(
    archetype: EnemyArchetype,
    idHash: number,
    state: Enemy3DAnimState,
    animTimeSec: number,
    facingAngleRad: number,
    hitFlash = false,
    isElite = false
  ): HTMLCanvasElement | null {
    const slotKey = selectSlotKey(archetype, idHash);
    return this.renderSlotFrame(
      slotKey,
      state,
      animTimeSec,
      facingAngleRad,
      hitFlash,
      isElite
    );
  }

  public dispose(): void {
    this.atlasFrameCache.clear();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
