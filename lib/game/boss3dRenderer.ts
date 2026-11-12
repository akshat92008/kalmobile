'use client';

// ============================================================================
// REAL-TIME 60FPS 3D BOSS RENDERER FOR DUNDUBHI & VRIKODARA (THREE.JS + FBX)
// - Native skeleton-matched animations & native scale preservation:
//   * Dundubhi (Runebound Minotaur Warlord): Mixamo Mutant Y-Up Rig (Hips Y = 73.15)
//     uses Mutant FBX combat clips at native scale (~1.05x)
//   * Vrikodara (Crimson Skull Warlord): Meshy Biped Y-Up Rig (Hips Y = 0.90, Armature scale = 100)
//     uses the exact same native (1, 1, 1) scale, balanced hand-painted PBR material settings,
//     and Meshy Biped animations as Rudra (Ashen Warborn) so Vrikodara looks 100% authentic,
//     sharp, and lag-free!
// ============================================================================

import * as THREE from 'three';
import { IS_SOFTWARE_WEBGL } from '../../engine/ue5GraphicsEngine';
import { loadFbxCached } from './meshSimplifier';
import {
  bindTexturedGeometryToSkeleton,
  buildStabilizedInPlaceClip,
  extractStandingHipY,
} from './enemy3dRenderer';
import {
  applyHadesCelShadingToHierarchy,
  bake2DSpriteFrameFromCanvas,
  computeSpriteSheetFrameKey,
} from './hadesSpriteBaker';
import { GAME_ASSETS } from './assets';

export type Boss3DKind = 'dundubhi' | 'vrikodara';

export interface Boss3DUpdateParams {
  kind: Boss3DKind;
  dt: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  aimAngle: number;
  aiState: 'idle' | 'chase' | 'windup' | 'attack' | 'recover' | 'ko';
  attackKind: 'cone' | 'corridor' | 'shockwave';
  attackPattern?: number;
  windupProgress: number;
  phase: 1 | 2 | 3;
  armorCracked: boolean;
  isPostureBroken: boolean;
  isHitFlash: boolean;
  isParrying?: boolean;
}

type BossClipKey =
  | 'idle'
  | 'run'
  | 'charge'
  | 'swipe'
  | 'cleave'
  | 'combo'
  | 'whirlwind'
  | 'slam'
  | 'jumpAttack'
  | 'stagger';

interface BossUpperBodyBones {
  spine1: THREE.Object3D | null;
  spine2: THREE.Object3D | null;
  rightArm: THREE.Object3D | null;
  rightForeArm: THREE.Object3D | null;
  rightHand: THREE.Object3D | null;
  leftArm: THREE.Object3D | null;
}

interface LoadedBossRig {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Partial<Record<BossClipKey, THREE.AnimationAction>>;
  activeKey: BossClipKey | null;
  materials: THREE.MeshStandardMaterial[];
  weaponMaterials: THREE.MeshStandardMaterial[];
  rightWeaponSocket: THREE.Group | null;
  leftWeaponSocket: THREE.Group | null;
  weaponTipNode: THREE.Object3D;
  weaponBaseNode: THREE.Object3D;
  bones: BossUpperBodyBones;
}

interface TrailSample {
  tip: THREE.Vector3;
  base: THREE.Vector3;
  age: number;
}

/**
 * Strips horizontal root drift from a Mixamo Mutant clip while keeping vertical hip bounce
 * grounded at `standingHipY` (`73.15` for Dundubhi).
 */
function buildMutantInPlaceClip(
  clip: THREE.AnimationClip,
  targetRoot: THREE.Object3D,
  standingHipY: number,
  maxBounce: number,
  customName: string
): THREE.AnimationClip {
  const boneMap = new Map<string, string>();
  targetRoot.traverse((obj) => {
    const clean = obj.name.replace(/^mixamorig:?/i, '');
    boneMap.set(clean.toLowerCase(), obj.name);
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
      if (cleanNode !== 'hips' && cleanNode !== 'target_character') continue;
      const cloned = track.clone();
      cloned.name = `${mappedBone}.position`;
      const vals = cloned.values;
      const baseX = vals[0] || 0;
      const baseY = vals[1] || standingHipY;
      const baseZ = vals[2] || 0;

      for (let i = 0; i < vals.length; i += 3) {
        vals[i] = (vals[i] - baseX) * 0.03;
        vals[i + 2] = (vals[i + 2] - baseZ) * 0.03;
        const dy = vals[i + 1] - standingHipY;
        const clampedDy = Math.max(-maxBounce * 0.5, Math.min(maxBounce * 0.65, dy * 0.35));
        vals[i + 1] = standingHipY + clampedDy;
      }
      newTracks.push(cloned);
    } else if (prop === 'quaternion') {
      const cloned = track.clone();
      cloned.name = `${mappedBone}.quaternion`;
      newTracks.push(cloned);
    }
  }

  return new THREE.AnimationClip(customName, clip.duration, newTracks);
}

export class Boss3DRenderer {
  public canvas: HTMLCanvasElement;
  private readonly webglCanvas: HTMLCanvasElement;
  private readonly size: number;
  private readonly frameCache = new Map<string, HTMLCanvasElement>();
  public isReady = false;
  public loadProgress = 0;

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;

  private rigs: Partial<Record<Boss3DKind, LoadedBossRig>> = {};
  private loadingByKind: Partial<Record<Boss3DKind, Promise<void>>> = {};
  private activeKind: Boss3DKind | null = null;
  private currentYaw = 0;
  private targetYaw = 0;
  private lastAiState: Boss3DUpdateParams['aiState'] = 'idle';
  private lockedAttackClip: BossClipKey | null = null;
  private locomotionRunning = false;
  private idleHysteresisTimer = 0;
  private attackSwingTimer = 0;
  private attackSwingDuration = 0.36;
  private elapsedTime = 0;
  private clipAnimTime = 0;
  private lastRenderTime = -999;
  private disposed = false;

  // Real-time 3D Boss Weapon Trail Ribbon
  private trailGeometry: THREE.BufferGeometry;
  private trailMaterial: THREE.MeshBasicMaterial;
  private trailMesh: THREE.Mesh;
  private trailSamples: TrailSample[] = [];
  private readonly maxTrailSamples = 14;

  private readonly scratchRotQ = new THREE.Quaternion();
  private readonly scratchEuler = new THREE.Euler();
  private readonly scratchTipWorld = new THREE.Vector3();
  private readonly scratchBaseWorld = new THREE.Vector3();

  constructor(size = 288) {
    this.size = size;
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;

    this.webglCanvas = document.createElement('canvas');
    this.webglCanvas.width = size;
    this.webglCanvas.height = size;

    this.scene = new THREE.Scene();

    // True 2.5D Hades Dimetric (2:1) Isometric Orthographic Camera (~27° elevation, matching Rudra3DRenderer)
    const frustumHalf = 108;
    this.camera = new THREE.OrthographicCamera(
      -frustumHalf,
      frustumHalf,
      frustumHalf,
      -frustumHalf,
      1,
      1200
    );
    this.camera.position.set(0, 154, 300);
    this.camera.lookAt(0, 84, 0);

    // Flat 2D Illustration Lighting Rig (zero glossy specular hotspots, preserves true painted boss colors)
    const ambient = new THREE.AmbientLight(0xf2ece4, 2.15);
    this.scene.add(ambient);

    this.keyLight = new THREE.DirectionalLight(0xfff6e8, 1.18);
    this.keyLight.position.set(-140, 245, 215);
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0xffe6a8, 0.72);
    this.rimLight.position.set(150, 200, -215);
    this.scene.add(this.rimLight);

    this.fillLight = new THREE.DirectionalLight(0xc8c0b8, 0.85);
    this.fillLight.position.set(165, 70, 135);
    this.scene.add(this.fillLight);

    // Initialize 3D Weapon Slash Ribbon Mesh
    this.trailGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxTrailSamples * 2 * 3);
    const uvs = new Float32Array(this.maxTrailSamples * 2 * 2);
    const indices: number[] = [];

    for (let i = 0; i < this.maxTrailSamples; i++) {
      const u = i / (this.maxTrailSamples - 1);
      uvs[i * 4 + 0] = u;
      uvs[i * 4 + 1] = 0;
      uvs[i * 4 + 2] = u;
      uvs[i * 4 + 3] = 1;
      if (i < this.maxTrailSamples - 1) {
        const a = i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        indices.push(a, b, c, b, d, c);
      }
    }

    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.trailGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.trailGeometry.setIndex(indices);

    this.trailMaterial = new THREE.MeshBasicMaterial({
      color: 0xff2a3c,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.trailMesh = new THREE.Mesh(this.trailGeometry, this.trailMaterial);
    this.trailMesh.frustumCulled = false;
    this.scene.add(this.trailMesh);

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.webglCanvas,
        alpha: true,
        antialias: !IS_SOFTWARE_WEBGL,
        powerPreference: 'high-performance',
      });
      this.renderer.setSize(size, size, false);
      this.renderer.setPixelRatio(1);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.NoToneMapping;
      this.renderer.toneMappingExposure = 1.0;
      this.renderer.shadowMap.enabled = false;
      this.scene.environment = null;
    } catch {
      this.renderer = null;
    }
  }

  private loadTex(url: string, isColor = false): Promise<THREE.Texture | null> {
    const texLoader = new THREE.TextureLoader();
    return new Promise<THREE.Texture | null>((resolve) => {
      if (IS_SOFTWARE_WEBGL && !isColor) {
        resolve(null);
        return;
      }
      texLoader.load(
        url,
        (t) => {
          if (isColor) t.colorSpace = THREE.SRGBColorSpace;
          if (IS_SOFTWARE_WEBGL) {
            t.generateMipmaps = false;
            t.minFilter = THREE.LinearFilter;
          }
          t.needsUpdate = true;
          resolve(t);
        },
        undefined,
        () => resolve(null)
      );
    });
  }

  public ensureBossLoaded(kind: Boss3DKind): void {
    if (this.rigs[kind] || this.loadingByKind[kind]) return;
    this.loadingByKind[kind] =
      kind === 'dundubhi' ? this.loadDundubhiRig() : this.loadVrikodaraRig();
  }

  private async loadDundubhiRig(): Promise<void> {
    try {
      this.loadProgress = Math.max(this.loadProgress, 15);
      const [
        dundubhiGroup,
        mIdleFbx,
        mRunFbx,
        mSwipeFbx,
        mJumpFbx,
        mRoarFbx,
        dunBase,
        dunNorm,
      ] = await Promise.all([
        loadFbxCached(GAME_ASSETS.models3d.dundubhiFbx, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.idle, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.run, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.swipe, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.jumpAttack, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.roar, false),
        this.loadTex(GAME_ASSETS.models3d.dundubhiTex.baseColor, true),
        this.loadTex(GAME_ASSETS.models3d.dundubhiTex.normal, false),
      ]);

      if (this.disposed) return;

      const dundubhiRoot = new THREE.Group();
      dundubhiGroup.position.set(0, 0, 0);
      dundubhiGroup.scale.setScalar(1.05);
      dundubhiRoot.add(dundubhiGroup);

      const dundubhiMaterials: THREE.MeshStandardMaterial[] = [];
      const dunCharMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xffffff),
        map: dunBase || undefined,
        normalMap: dunNorm || undefined,
        normalScale: new THREE.Vector2(0.35, 0.35),
        roughness: 0.88,
        metalness: 0.08,
        envMapIntensity: 0.0,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0.0,
      });
      dundubhiMaterials.push(dunCharMat);

      // Simplify Dundubhi's native 741k-vertex SkinnedMesh to ~12k vertices while preserving native UVs & skinning
      bindTexturedGeometryToSkeleton(dundubhiGroup, null, dunCharMat);
      applyHadesCelShadingToHierarchy(dundubhiGroup);

      const dunBones: BossUpperBodyBones = {
        spine1: dundubhiGroup.getObjectByName('mixamorigSpine1') || null,
        spine2: dundubhiGroup.getObjectByName('mixamorigSpine2') || null,
        rightArm: dundubhiGroup.getObjectByName('mixamorigRightArm') || null,
        rightForeArm: dundubhiGroup.getObjectByName('mixamorigRightForeArm') || null,
        rightHand: dundubhiGroup.getObjectByName('mixamorigRightHand') || null,
        leftArm: dundubhiGroup.getObjectByName('mixamorigLeftArm') || null,
      };

      const dunTipNode = new THREE.Object3D();
      const dunBaseNode = new THREE.Object3D();
      let dunRightSocket: THREE.Group | null = null;
      if (dunBones.rightHand) {
        dunRightSocket = new THREE.Group();
        dunTipNode.position.set(52, 0, 0);
        dunBaseNode.position.set(14, 0, 0);
        dunRightSocket.add(dunTipNode);
        dunRightSocket.add(dunBaseNode);
        dunBones.rightHand.add(dunRightSocket);
      }

      const dunMixer = new THREE.AnimationMixer(dundubhiGroup);
      const dunActions: Partial<Record<BossClipKey, THREE.AnimationAction>> = {};
      const mIdle = mIdleFbx.animations?.[0] || dundubhiGroup.animations?.[0];
      const mRun = mRunFbx.animations?.[0] || mIdle;
      const mSwipe = mSwipeFbx.animations?.[0] || mIdle;
      const mJump = mJumpFbx.animations?.[0] || mSwipe;
      const mRoar = mRoarFbx.animations?.[0] || mJump;

      const regMutant = (
        key: BossClipKey,
        src: THREE.AnimationClip | undefined,
        hipY: number,
        bounce: number,
        loop: boolean
      ) => {
        if (!src) return;
        const clip = buildMutantInPlaceClip(
          src,
          dundubhiGroup,
          hipY,
          bounce,
          `dundubhi_${key}`
        );
        const act = dunMixer.clipAction(clip);
        act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
        act.clampWhenFinished = !loop;
        dunActions[key] = act;
      };

      regMutant('idle', mIdle, 73.15, 3.0, true);
      regMutant('run', mRun, 73.15, 4.0, true);
      regMutant('charge', mRun, 73.15, 4.5, true);
      regMutant('swipe', mSwipe, 73.15, 4.0, false);
      regMutant('cleave', mSwipe, 73.15, 4.0, false);
      regMutant('combo', mSwipe, 73.15, 4.0, false);
      regMutant('whirlwind', mSwipe, 73.15, 4.0, false);
      regMutant('slam', mRoar, 73.15, 4.5, false);
      regMutant('jumpAttack', mJump, 73.15, 5.5, false);
      regMutant('stagger', mRoar, 73.15, 2.5, true);

      this.rigs.dundubhi = {
        root: dundubhiRoot,
        mixer: dunMixer,
        actions: dunActions,
        activeKey: null,
        materials: dundubhiMaterials,
        weaponMaterials: [],
        rightWeaponSocket: dunRightSocket,
        leftWeaponSocket: null,
        weaponTipNode: dunTipNode,
        weaponBaseNode: dunBaseNode,
        bones: dunBones,
      };

      this.transitionToClip(this.rigs.dundubhi, 'idle', 0.05, 1.0, 0, true);
      this.rigs.dundubhi.mixer.update(0.016);
      this.loadProgress = 100;
      this.isReady = true;
    } catch (err) {
      console.warn('Boss3DRenderer Dundubhi load warning:', err);
      this.loadProgress = 100;
    }
  }

  private async loadVrikodaraRig(): Promise<void> {
    try {
      this.loadProgress = Math.max(this.loadProgress, 15);
      const wepBase = '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx';
      const axePackDir = '/new_3d_assets/Animations/Pro Melee Axe Pack';

      const [
        vrikodaraGroup,
        vIdleFbx,
        vRunFbx,
        vCombo1Fbx,
        vCombo2Fbx,
        vSpinFbx,
        vSlamFbx,
        tridentFbx,
        vrikBase,
        vrikNorm,
        wepBaseTex,
        wepNormTex,
      ] = await Promise.all([
        loadFbxCached(GAME_ASSETS.models3d.vrikodaraFbx, false),
        loadFbxCached(`${axePackDir}/standing idle.fbx`, false),
        loadFbxCached(`${axePackDir}/standing run forward.fbx`, false),
        loadFbxCached(`${axePackDir}/standing melee combo attack ver. 1.fbx`, false),
        loadFbxCached(`${axePackDir}/standing melee combo attack ver. 2.fbx`, false),
        loadFbxCached(`${axePackDir}/standing melee attack 360 high.fbx`, false),
        loadFbxCached(`${axePackDir}/standing melee attack downward.fbx`, false),
        loadFbxCached(GAME_ASSETS.models3d.tridentFbx, true),
        this.loadTex(GAME_ASSETS.models3d.vrikodaraTex.baseColor, true),
        this.loadTex(GAME_ASSETS.models3d.vrikodaraTex.normal, false),
        this.loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.png`, true),
        this.loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_normal.png`, false),
      ]);

      if (this.disposed) return;

      const vrikStandingHipY = extractStandingHipY(vrikodaraGroup);
      const vrikRawBox = new THREE.Box3().setFromObject(vrikodaraGroup);
      const vrikRawH = Math.max(0.01, vrikRawBox.max.y - vrikRawBox.min.y);
      const vrikScale = 158 / vrikRawH;

      const vrikodaraRoot = new THREE.Group();
      vrikodaraGroup.scale.setScalar(vrikScale);
      vrikodaraGroup.position.set(0, -vrikRawBox.min.y * vrikScale, 0);
      vrikodaraRoot.add(vrikodaraGroup);

      const vrikMaterials: THREE.MeshStandardMaterial[] = [];
      const vrikWepMat = new THREE.MeshStandardMaterial({
        map: wepBaseTex || undefined,
        normalMap: wepNormTex || undefined,
        normalScale: new THREE.Vector2(0.45, 0.45),
        roughness: 0.92,
        metalness: 0.0,
        envMapIntensity: 0.0,
        emissive: new THREE.Color(0x38080c),
        emissiveIntensity: 0.14,
      });

      const vrikCharMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xffffff),
        map: vrikBase || undefined,
        normalMap: vrikNorm || undefined,
        normalScale: new THREE.Vector2(0.35, 0.35),
        roughness: 0.88,
        metalness: 0.08,
        envMapIntensity: 0.0,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0.0,
      });
      vrikMaterials.push(vrikCharMat);

      // Simplify Vrikodara's native 842k-vertex SkinnedMesh to ~12k vertices while preserving native UVs & skinning
      bindTexturedGeometryToSkeleton(vrikodaraGroup, null, vrikCharMat);
      applyHadesCelShadingToHierarchy(vrikodaraGroup);
      vrikodaraGroup.updateMatrixWorld(true);

      const findVrikBone = (names: string[]): THREE.Object3D | null => {
        for (const n of names) {
          const found = vrikodaraGroup.getObjectByName(n);
          if (found) return found;
        }
        let matched: THREE.Object3D | null = null;
        vrikodaraGroup.traverse((obj) => {
          if (matched) return;
          const lower = obj.name.toLowerCase();
          if (names.some((n) => lower.endsWith(n.toLowerCase()))) {
            matched = obj;
          }
        });
        return matched;
      };

      const vrikBones: BossUpperBodyBones = {
        spine1: findVrikBone(['mixamorigSpine1', 'Spine1']),
        spine2: findVrikBone(['mixamorigSpine2', 'Spine2']),
        rightArm: findVrikBone(['mixamorigRightArm', 'RightArm']),
        rightForeArm: findVrikBone(['mixamorigRightForeArm', 'RightForeArm']),
        rightHand: findVrikBone(['mixamorigRightHand', 'RightHand']),
        leftArm: findVrikBone(['mixamorigLeftArm', 'LeftArm']),
      };

      const vrikTipNode = new THREE.Object3D();
      const vrikBaseNode = new THREE.Object3D();
      let vrikRightSocket: THREE.Group | null = null;
      let vrikLeftSocket: THREE.Group | null = null;

      if (vrikBones.rightHand && tridentFbx) {
        const handScaleVec = new THREE.Vector3();
        vrikBones.rightHand.getWorldScale(handScaleVec);
        const handScale = Math.max(1e-5, handScaleVec.x);

        const rightWepGroup = tridentFbx.clone(true);
        rightWepGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.material = vrikWepMat;
            m.frustumCulled = false;
          }
        });
        const wepBox = new THREE.Box3().setFromObject(rightWepGroup);
        const wepSize = new THREE.Vector3();
        wepBox.getSize(wepSize);
        const maxDim = Math.max(0.001, wepSize.x, wepSize.y, wepSize.z);
        const desiredWorldLen = 104;
        const localWepScale = desiredWorldLen / (maxDim * handScale);

        vrikRightSocket = new THREE.Group();
        rightWepGroup.scale.setScalar(localWepScale);
        // Bloodforged_Trident_Axe blade is at +Y of rightWepGroup; rotation(-pi/2, 0, -pi/2) maps +Y -> +X of RightHand
        rightWepGroup.rotation.set(-Math.PI * 0.5, 0, -Math.PI * 0.5);
        rightWepGroup.position.set(0.26 * maxDim * localWepScale, 0, 0);

        vrikTipNode.position.set(0.45 * maxDim * localWepScale, 0, 0);
        vrikBaseNode.position.set(0.12 * maxDim * localWepScale, 0, 0);
        vrikRightSocket.add(vrikTipNode);
        vrikRightSocket.add(vrikBaseNode);
        vrikRightSocket.add(rightWepGroup);

        applyHadesCelShadingToHierarchy(vrikRightSocket);
        vrikBones.rightHand.add(vrikRightSocket);
      }

      const vrikLeftHand = findVrikBone(['mixamorigLeftHand', 'LeftHand']);
      if (vrikLeftHand && tridentFbx) {
        const handScaleVec = new THREE.Vector3();
        vrikLeftHand.getWorldScale(handScaleVec);
        const handScale = Math.max(1e-5, handScaleVec.x);

        const leftWepGroup = tridentFbx.clone(true);
        leftWepGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.material = vrikWepMat;
            m.frustumCulled = false;
          }
        });
        const wepBox = new THREE.Box3().setFromObject(leftWepGroup);
        const wepSize = new THREE.Vector3();
        wepBox.getSize(wepSize);
        const maxDim = Math.max(0.001, wepSize.x, wepSize.y, wepSize.z);
        const desiredWorldLen = 96;
        const localWepScale = desiredWorldLen / (maxDim * handScale);

        vrikLeftSocket = new THREE.Group();
        leftWepGroup.scale.setScalar(localWepScale);
        leftWepGroup.rotation.set(-Math.PI * 0.5, 0, Math.PI * 0.5);
        leftWepGroup.position.set(-0.26 * maxDim * localWepScale, 0, 0);

        vrikLeftSocket.add(leftWepGroup);
        vrikLeftSocket.visible = false;
        applyHadesCelShadingToHierarchy(vrikLeftSocket);
        vrikLeftHand.add(vrikLeftSocket);
      }

      const vrikMixer = new THREE.AnimationMixer(vrikodaraGroup);
      const vrikActions: Partial<Record<BossClipKey, THREE.AnimationAction>> = {};

      const vIdle = vIdleFbx.animations?.[0] || vrikodaraGroup.animations?.[0];
      const vRun = vRunFbx.animations?.[0] || vrikodaraGroup.animations?.[0] || vIdle;
      const vCombo1 = vCombo1Fbx.animations?.[0] || vRun;
      const vCombo2 = vCombo2Fbx.animations?.[0] || vCombo1;
      const vSpin = vSpinFbx.animations?.[0] || vCombo2;
      const vSlam = vSlamFbx.animations?.[0] || vSpin;

      const regVrik = (
        key: BossClipKey,
        src: THREE.AnimationClip | undefined,
        loop: boolean
      ) => {
        if (!src) return;
        const processed = buildStabilizedInPlaceClip(src, vrikodaraGroup, vrikStandingHipY);
        if (processed.tracks.length === 0) return;
        processed.name = `vrikodara_${key}`;
        const act = vrikMixer.clipAction(processed);
        act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
        act.clampWhenFinished = !loop;
        vrikActions[key] = act;
      };

      regVrik('idle', vIdle, true);
      regVrik('run', vRun, true);
      regVrik('charge', vRun, true);
      regVrik('swipe', vCombo1, false);
      regVrik('cleave', vCombo2, false);
      regVrik('combo', vCombo2, false);
      regVrik('whirlwind', vSpin, false);
      regVrik('slam', vSlam, false);
      regVrik('jumpAttack', vSlam, false);
      regVrik('stagger', vIdle, true);

      this.rigs.vrikodara = {
        root: vrikodaraRoot,
        mixer: vrikMixer,
        actions: vrikActions,
        activeKey: null,
        materials: vrikMaterials,
        weaponMaterials: [vrikWepMat],
        rightWeaponSocket: vrikRightSocket,
        leftWeaponSocket: vrikLeftSocket,
        weaponTipNode: vrikTipNode,
        weaponBaseNode: vrikBaseNode,
        bones: vrikBones,
      };

      this.transitionToClip(this.rigs.vrikodara, 'idle', 0.05, 1.0, 0, true);
      this.rigs.vrikodara.mixer.update(0.016);
      this.loadProgress = 100;
      this.isReady = true;
    } catch (err) {
      console.warn('Boss3DRenderer Vrikodara load warning:', err);
      this.loadProgress = 100;
    }
  }

  private transitionToClip(
    rig: LoadedBossRig,
    key: BossClipKey,
    fadeDuration = 0.14,
    timeScale = 1.0,
    startTimeOffset = 0,
    forceRestart = false
  ): void {
    const nextAction = rig.actions[key] || rig.actions.idle;
    if (!nextAction) return;

    if (rig.activeKey === key && !forceRestart) {
      nextAction.setEffectiveTimeScale(timeScale);
      return;
    }

    const prevAction = rig.activeKey ? rig.actions[rig.activeKey] : null;

    for (const act of Object.values(rig.actions)) {
      if (act && act !== nextAction && act !== prevAction) {
        act.stop();
        act.enabled = false;
        act.setEffectiveWeight(0);
      }
    }

    nextAction.reset();
    nextAction.enabled = true;
    nextAction.setEffectiveTimeScale(timeScale);
    nextAction.setEffectiveWeight(1);
    if (startTimeOffset > 0) {
      nextAction.time = startTimeOffset;
    }
    nextAction.play();

    if (prevAction && prevAction !== nextAction) {
      prevAction.crossFadeTo(nextAction, fadeDuration, false);
    }

    rig.activeKey = key;
    this.clipAnimTime = startTimeOffset;
  }

  private selectDesiredClip(params: Boss3DUpdateParams, dt: number): BossClipKey {
    if (params.isPostureBroken || params.aiState === 'ko') {
      this.lockedAttackClip = null;
      return 'stagger';
    }

    if (params.aiState === 'windup' || params.aiState === 'attack') {
      if (this.lockedAttackClip && params.aiState === 'attack') {
        return this.lockedAttackClip;
      }
      const pat = (params.attackPattern ?? 0) % 6;
      let chosen: BossClipKey = 'swipe';
      if (params.attackKind === 'corridor') {
        chosen = 'jumpAttack';
      } else if (params.attackKind === 'shockwave') {
        chosen = pat === 3 ? 'whirlwind' : 'slam';
      } else {
        chosen = pat === 2 ? 'combo' : pat % 2 === 0 ? 'swipe' : 'cleave';
      }
      this.lockedAttackClip = chosen;
      return chosen;
    }

    if (params.aiState === 'recover' && this.lockedAttackClip && this.attackSwingTimer > 0.08) {
      return this.lockedAttackClip;
    }
    this.lockedAttackClip = null;

    const speed = Math.hypot(params.vx, params.vy);
    if (speed > 22) {
      this.locomotionRunning = true;
      this.idleHysteresisTimer = 0.22;
      return speed > 215 ? 'charge' : 'run';
    }
    if (this.locomotionRunning) {
      if (speed < 10) {
        this.idleHysteresisTimer = Math.max(0, this.idleHysteresisTimer - dt);
        if (this.idleHysteresisTimer <= 0) {
          this.locomotionRunning = false;
        } else {
          return 'run';
        }
      } else {
        return 'run';
      }
    }

    return 'idle';
  }

  public updateAndRender(params: Boss3DUpdateParams): boolean {
    if (!this.renderer) return false;
    this.ensureBossLoaded(params.kind);
    const rig = this.rigs[params.kind];
    if (!rig) return false;

    if (this.activeKind !== params.kind) {
      if (this.activeKind && this.rigs[this.activeKind]) {
        this.scene.remove(this.rigs[this.activeKind]!.root);
      }
      this.scene.add(rig.root);
      this.activeKind = params.kind;
      this.trailSamples.length = 0;
      this.lockedAttackClip = null;
      this.lastAiState = 'idle';
    }

    const dt = Math.min(0.05, Math.max(0.001, params.dt));
    this.elapsedTime += dt;

    // Frame-rate optimization: throttle software WebGL offscreen re-renders to 45 FPS while keeping main game at 60 FPS
    if (
      IS_SOFTWARE_WEBGL &&
      !params.isHitFlash &&
      this.elapsedTime - this.lastRenderTime < 0.022
    ) {
      return true;
    }
    this.lastRenderTime = this.elapsedTime;

    const speed = Math.hypot(params.vx, params.vy);
    const phaseBoost = 1 + (params.phase - 1) * 0.10;

    if (rig.leftWeaponSocket) {
      rig.leftWeaponSocket.visible = params.phase >= 2;
    }
    const targetScale = params.kind === 'vrikodara' && params.phase >= 2 ? 1.12 : 1.0;
    const currentScale = rig.root.scale.x || 1.0;
    rig.root.scale.setScalar(currentScale + (targetScale - currentScale) * Math.min(1, dt * 6));

    const prevAiState = this.lastAiState;
    const enteredWindup = params.aiState === 'windup' && prevAiState !== 'windup';
    const enteredAttack = params.aiState === 'attack' && prevAiState !== 'attack';
    this.lastAiState = params.aiState;

    if (enteredWindup) {
      this.lockedAttackClip = null;
    }
    if (enteredAttack) {
      this.attackSwingDuration = params.attackKind === 'shockwave' ? 0.52 : 0.40;
      this.attackSwingTimer = this.attackSwingDuration;
    }
    if (this.attackSwingTimer > 0) {
      this.attackSwingTimer = Math.max(0, this.attackSwingTimer - dt);
    }

    const desiredClip = this.selectDesiredClip(params, dt);

    let targetTimeScale = 1.0 * phaseBoost;
    if (params.aiState === 'windup') {
      targetTimeScale = (0.72 + params.windupProgress * 0.35) * phaseBoost;
    } else if (params.aiState === 'attack') {
      targetTimeScale = 1.42 * phaseBoost;
    } else if (desiredClip === 'run' || desiredClip === 'charge') {
      targetTimeScale = Math.min(1.45, Math.max(0.88, speed / 150)) * phaseBoost;
    } else if (desiredClip === 'stagger') {
      targetTimeScale = 0.45;
    }

    const forceRestart = enteredWindup || (enteredAttack && prevAiState !== 'windup');
    const startOffset = enteredWindup ? 0.08 : 0;

    if (forceRestart || rig.activeKey !== desiredClip) {
      this.transitionToClip(
        rig,
        desiredClip,
        enteredWindup ? 0.12 : 0.16,
        targetTimeScale,
        startOffset,
        forceRestart
      );
    } else {
      this.transitionToClip(rig, desiredClip, 0.14, targetTimeScale, 0, false);
    }

    let aimDx = Math.cos(params.aimAngle);
    let aimDy = Math.sin(params.aimAngle);
    if (params.aiState === 'chase' && speed > 24) {
      aimDx = params.vx;
      aimDy = params.vy;
    }
    if (Math.hypot(aimDx, aimDy) > 0.001) {
      this.targetYaw = Math.atan2(aimDx, aimDy);
    } else {
      this.targetYaw = Math.atan2(params.facing, 0.35);
    }

    let angleDiff = this.targetYaw - this.currentYaw;
    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
    const turnSpeed = params.aiState === 'attack' || params.aiState === 'windup' ? 24 : 14;
    this.currentYaw += angleDiff * Math.min(1, turnSpeed * dt);

    // Compute Hades 2D Stepped Sprite-Sheet Frame Key (16 directions x 14 steps for zero cache thrashing)
    this.clipAnimTime += dt * targetTimeScale;
    const isBossAction =
      params.aiState === 'windup' ||
      params.aiState === 'attack' ||
      this.attackSwingTimer > 0;
    const activeAction = rig.actions[rig.activeKey || desiredClip];
    const clipDuration = Math.max(0.25, activeAction?.getClip().duration || 1.0);
    const { frameKey: baseKey, quantizedYaw } = computeSpriteSheetFrameKey({
      id: params.kind,
      animName: rig.activeKey || desiredClip,
      animTime: this.clipAnimTime,
      clipDuration,
      yawRad: this.currentYaw,
      isAttacking: isBossAction,
      isHurt: params.isHitFlash,
      isParrying: Boolean(params.isParrying),
      phase: params.phase,
      yawDirections: 16,
      stepsPerClip: 14,
    });
    const actionSubStep =
      params.aiState === 'windup'
        ? `w${Math.round(params.windupProgress * 6)}`
        : params.aiState === 'attack'
        ? `a${Math.round((1 - this.attackSwingTimer / Math.max(0.05, this.attackSwingDuration)) * 8)}`
        : 'loc';
    const frameKey = `${baseKey}:${actionSubStep}`;

    const cached = !params.isHitFlash ? this.frameCache.get(frameKey) : undefined;
    if (cached) {
      this.canvas = cached;
      rig.mixer.update(dt);
      return true;
    }

    // Advance base FBX animation mixer
    rig.mixer.update(dt);

    // Apply Rudra-style upper-body weapon swing articulation on Vrikodara so his trident/axe cleaves with authority
    if (params.kind === 'vrikodara') {
      if (params.aiState === 'windup') {
        const w = params.windupProgress;
        this.applyProceduralBossPose(rig.bones, -0.32 * w, -0.18 * w, -0.75 * w, -0.35 * w, -0.15 * w);
      } else if (params.aiState === 'attack' || this.attackSwingTimer > 0) {
        const prog =
          this.attackSwingDuration > 0
            ? Math.min(1, 1 - this.attackSwingTimer / this.attackSwingDuration)
            : 0.5;
        const cleave = Math.sin(prog * Math.PI);
        this.applyProceduralBossPose(rig.bones, 0.42 * cleave, 0.24 * cleave, 0.95 * cleave, 0.25 * cleave, 0.32 * cleave);
      }
    }

    // Subtle 360-degree spin during Whirlwind shockwave
    let spinYawOffset = 0;
    const pat = (params.attackPattern ?? 0) % 6;
    if ((params.aiState === 'attack' || this.attackSwingTimer > 0) && params.attackKind === 'shockwave' && pat === 3) {
      const p =
        this.attackSwingDuration > 0
          ? 1 - this.attackSwingTimer / this.attackSwingDuration
          : 0.6;
      spinYawOffset = Math.min(1, p * 1.15) * Math.PI * 2;
    }

    rig.root.rotation.y = quantizedYaw + spinYawOffset;

    const leanTarget =
      params.aiState === 'attack'
        ? 0.14
        : params.aiState === 'windup'
        ? -0.07 * params.windupProgress
        : speed > 110
        ? 0.10
        : 0;
    rig.root.rotation.x = THREE.MathUtils.lerp(
      rig.root.rotation.x,
      leanTarget * Math.cos(quantizedYaw),
      dt * 12
    );
    rig.root.rotation.z = THREE.MathUtils.lerp(
      rig.root.rotation.z,
      -leanTarget * Math.sin(quantizedYaw),
      dt * 12
    );

    // Clean Rim Light & Hit-Flash Response (preserves true painted texture colors!)
    if (params.isParrying) {
      this.rimLight.color.setHex(0xffe082);
      this.rimLight.intensity = 2.1;
    } else if (params.aiState === 'attack' || params.aiState === 'windup') {
      this.rimLight.color.setHex(0xffd0c0);
      this.rimLight.intensity = 1.85;
    } else {
      this.rimLight.color.setHex(0xe4ecff);
      this.rimLight.intensity = 1.55;
    }

    for (const mat of rig.materials) {
      if (params.isHitFlash) {
        mat.emissive.setHex(0xfff0d0);
        mat.emissiveIntensity = 0.52;
      } else if (params.isParrying) {
        mat.emissive.setHex(0xffd86b);
        mat.emissiveIntensity = 0.24;
      } else {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0.0;
      }
    }

    for (const wMat of rig.weaponMaterials) {
      wMat.emissive.setHex(0x3a0c10);
      wMat.emissiveIntensity =
        params.aiState === 'attack' ? 0.28 : params.aiState === 'windup' ? 0.14 : 0.06;
    }

    this.scene.updateMatrixWorld(true);

    const trailActive =
      params.aiState === 'attack' ||
      this.attackSwingTimer > 0.04;
    const trailColor =
      params.phase === 3 ? 0xff2a18 : params.attackKind === 'shockwave' ? 0xff7722 : 0xd92638;
    this.updateWeaponTrail(rig, dt, trailActive, trailColor);

    this.renderer.render(this.scene, this.camera);
    const baked = bake2DSpriteFrameFromCanvas(this.webglCanvas, frameKey, {
      outlineColor: params.isHitFlash ? '#ffffff' : '#120806',
      outlineThickness: 2.2,
      hitFlash: params.isHitFlash,
      cacheFrame: false,
    });
    this.canvas = baked;
    if (!params.isHitFlash) {
      if (this.frameCache.size > 1200) {
        const oldest = this.frameCache.keys().next().value;
        if (oldest) this.frameCache.delete(oldest);
      }
      this.frameCache.set(frameKey, baked);
    }
    return true;
  }

  private applyProceduralBossPose(
    bones: BossUpperBodyBones,
    spineYaw: number,
    spinePitch: number,
    _armSweep: number,
    _foreArmBend: number,
    _wristPitch: number
  ): void {
    const rotQ = this.scratchRotQ;
    const euler = this.scratchEuler;

    // Gentle torso lean only — preserves natural Mixamo shoulder/elbow/wrist animations
    if (bones.spine1) {
      euler.set(spinePitch * 0.4, spineYaw * 0.4, 0, 'XYZ');
      rotQ.setFromEuler(euler);
      bones.spine1.quaternion.multiply(rotQ);
    }
    if (bones.spine2) {
      euler.set(spinePitch * 0.45, spineYaw * 0.45, 0, 'XYZ');
      rotQ.setFromEuler(euler);
      bones.spine2.quaternion.multiply(rotQ);
    }
  }

  private updateWeaponTrail(
    rig: LoadedBossRig,
    dt: number,
    active: boolean,
    colorHex: number
  ): void {
    for (let i = this.trailSamples.length - 1; i >= 0; i--) {
      this.trailSamples[i].age += dt;
      if (this.trailSamples[i].age > 0.12) {
        this.trailSamples.splice(i, 1);
      }
    }

    if (active && rig.rightWeaponSocket) {
      rig.weaponTipNode.getWorldPosition(this.scratchTipWorld);
      rig.weaponBaseNode.getWorldPosition(this.scratchBaseWorld);

      this.trailSamples.unshift({
        tip: this.scratchTipWorld.clone(),
        base: this.scratchBaseWorld.clone(),
        age: 0,
      });

      if (this.trailSamples.length > this.maxTrailSamples) {
        this.trailSamples.length = this.maxTrailSamples;
      }
    }

    if (this.trailSamples.length < 2) {
      this.trailMaterial.opacity = 0;
      return;
    }

    this.trailMaterial.color.setHex(colorHex);
    this.trailMaterial.opacity = active ? 0.64 : 0.20;

    const posAttr = this.trailGeometry.getAttribute('position') as THREE.BufferAttribute;
    const count = this.trailSamples.length;

    for (let i = 0; i < this.maxTrailSamples; i++) {
      const sample = this.trailSamples[Math.min(i, count - 1)];
      const idx = i * 6;
      posAttr.array[idx] = sample.tip.x;
      posAttr.array[idx + 1] = sample.tip.y;
      posAttr.array[idx + 2] = sample.tip.z;
      posAttr.array[idx + 3] = sample.base.x;
      posAttr.array[idx + 4] = sample.base.y;
      posAttr.array[idx + 5] = sample.base.z;
    }
    posAttr.needsUpdate = true;
  }

  public dispose(): void {
    this.disposed = true;
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
