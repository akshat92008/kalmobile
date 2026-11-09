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
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { IS_SOFTWARE_WEBGL } from '../../engine/ue5GraphicsEngine';
import { loadFbxCached } from './meshSimplifier';
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
        vals[i] = (vals[i] - baseX) * 0.04;
        vals[i + 2] = (vals[i + 2] - baseZ) * 0.04;
        const dy = vals[i + 1] - baseY;
        const clampedDy = Math.max(-maxBounce, Math.min(maxBounce * 1.25, dy * 0.55));
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

/**
 * Exact same in-place Meshy Biped clip processor used by Rudra3DRenderer so Vrikodara
 * (Crimson Skull Warlord Biped) animates with 100% authentic proportions and zero distortion!
 */
function makeBipedInPlaceClip(
  sourceClip: THREE.AnimationClip,
  customName: string
): THREE.AnimationClip {
  const clip = sourceClip.clone();
  clip.name = customName;
  const isArise = sourceClip.name === 'Arise';

  for (const track of clip.tracks) {
    if (
      track.name.endsWith('mixamorigHips.position') ||
      track.name.endsWith('Hips.position') ||
      track.name.endsWith('target_character.position')
    ) {
      const values = track.values;
      const baseX = values[0] || 0;
      const baseY = values[1] || 0.92;
      const baseZ = values[2] || 0;

      for (let i = 0; i < values.length; i += 3) {
        values[i] = (values[i] - baseX) * 0.05;
        values[i + 2] = (values[i + 2] - baseZ) * 0.05;
        if (isArise) {
          values[i + 1] = Math.max(0.35, values[i + 1] + 0.55);
        } else {
          values[i + 1] = Math.max(0.58, baseY + (values[i + 1] - baseY) * 0.6);
        }
      }
    }
  }
  return clip;
}

/**
 * Generates a poised, breathing Hades-style Combat Idle clip for Vrikodara from Meshy Biped
 * locomotion frames (identical to Rudra3DRenderer's createCombatIdleClip).
 */
function createBipedCombatIdleClip(clips: THREE.AnimationClip[]): THREE.AnimationClip | null {
  const baseClip =
    clips.find((c) => c.name === 'Walking') ||
    clips.find((c) => c.name === 'Casual_Walk') ||
    clips[0];
  if (!baseClip) return null;

  const duration = 2.0;
  const times = [0, 0.5, 1.0, 1.5, 2.0];
  const newTracks: THREE.KeyframeTrack[] = [];

  for (const track of baseClip.tracks) {
    const itemSize = track.getValueSize();
    const interpolant = (
      track as THREE.KeyframeTrack & {
        createInterpolant: () => { evaluate: (t: number) => Float32Array | number[] };
      }
    ).createInterpolant();
    const baseVal = Array.from(interpolant.evaluate(0.18));

    const isSpine = track.name.includes('Spine') && track.name.endsWith('.quaternion');
    const isRightArm = track.name.includes('RightArm') && track.name.endsWith('.quaternion');
    const isHipsPos = track.name.includes('Hips') && track.name.endsWith('.position');

    const outValues: number[] = [];
    for (let step = 0; step < times.length; step++) {
      const phase = Math.sin((step / (times.length - 1)) * Math.PI * 2);
      if (isHipsPos && itemSize === 3) {
        outValues.push(0, 0.92 + phase * 0.014, 0);
      } else if ((isSpine || isRightArm) && itemSize === 4) {
        const q = new THREE.Quaternion(baseVal[0], baseVal[1], baseVal[2], baseVal[3]);
        const breathQ = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            isSpine ? phase * 0.022 : phase * 0.032,
            0,
            isRightArm ? phase * 0.022 : 0
          )
        );
        q.multiply(breathQ).normalize();
        outValues.push(q.x, q.y, q.z, q.w);
      } else {
        outValues.push(...baseVal);
      }
    }

    if (itemSize === 4 && track instanceof THREE.QuaternionKeyframeTrack) {
      newTracks.push(new THREE.QuaternionKeyframeTrack(track.name, times, outValues));
    } else {
      newTracks.push(new THREE.VectorKeyframeTrack(track.name, times, outValues));
    }
  }

  return new THREE.AnimationClip('Vrikodara_Combat_Idle', duration, newTracks);
}

export class Boss3DRenderer {
  public readonly canvas: HTMLCanvasElement;
  public isReady = false;
  public loadProgress = 0;

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;

  private rigs: Partial<Record<Boss3DKind, LoadedBossRig>> = {};
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

  constructor(size = 384) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;

    this.scene = new THREE.Scene();

    // True 2.5D Hades Dimetric (2:1) Isometric Orthographic Camera (~27° elevation, matching Rudra3DRenderer)
    const frustumHalf = 136;
    this.camera = new THREE.OrthographicCamera(
      -frustumHalf,
      frustumHalf,
      frustumHalf,
      -frustumHalf,
      1,
      1200
    );
    this.camera.position.set(0, 158, 308);
    this.camera.lookAt(0, 80, 0);

    // Balanced Hades Hand-Painted Studio Lighting (matches Rudra3DRenderer so textures pop cleanly!)
    const ambient = new THREE.AmbientLight(0xdcd8ec, 1.72);
    this.scene.add(ambient);

    this.keyLight = new THREE.DirectionalLight(0xfff5e4, 2.98);
    this.keyLight.position.set(-140, 240, 215);
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0xffcf78, 2.55);
    this.rimLight.position.set(150, 195, -215);
    this.scene.add(this.rimLight);

    this.fillLight = new THREE.DirectionalLight(0x68a8ff, 1.45);
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
        canvas: this.canvas,
        alpha: true,
        antialias: !IS_SOFTWARE_WEBGL,
        powerPreference: 'high-performance',
      });
      this.renderer.setSize(size, size, false);
      this.renderer.setPixelRatio(1);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.12;
      this.renderer.shadowMap.enabled = !IS_SOFTWARE_WEBGL;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      if (!IS_SOFTWARE_WEBGL) {
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
        pmremGenerator.dispose();
      }

      this.loadAllBossAssets();
    } catch {
      this.renderer = null;
    }
  }

  private async loadAllBossAssets(): Promise<void> {
    const texLoader = new THREE.TextureLoader();

    const loadTex = (url: string, isColor = false) =>
      new Promise<THREE.Texture | null>((resolve) => {
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

    try {
      this.loadProgress = 12;
      const wepBase = '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx';

      // Share cached FBX geometries across renderers to eliminate Vrikodara loading lag!
      const [
        dundubhiGroup,
        mIdleFbx,
        mRunFbx,
        mSwipeFbx,
        mJumpFbx,
        mRoarFbx,
        vrikodaraGroup,
        bipedMergedAnimsFbx,
        tridentFbx,
        dunBase,
        dunNorm,
        dunRough,
        dunMet,
        vrikBase,
        vrikMet,
        vrikNorm,
        vrikRough,
        wepBaseTex,
        wepNormTex,
        wepRoughTex,
        wepMetTex,
      ] = await Promise.all([
        loadFbxCached(GAME_ASSETS.models3d.dundubhiFbx, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.idle, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.run, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.swipe, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.jumpAttack, false),
        loadFbxCached(GAME_ASSETS.models3d.dundubhiAnims.roar, false),
        loadFbxCached(GAME_ASSETS.models3d.vrikodaraFbx, false),
        loadFbxCached(GAME_ASSETS.models3d.rudraMergedFbx, false),
        loadFbxCached(GAME_ASSETS.models3d.tridentFbx, true),
        loadTex(GAME_ASSETS.models3d.dundubhiTex.baseColor, true),
        loadTex(GAME_ASSETS.models3d.dundubhiTex.normal, false),
        loadTex(GAME_ASSETS.models3d.dundubhiTex.roughness, false),
        loadTex(GAME_ASSETS.models3d.dundubhiTex.metallic, false),
        loadTex(GAME_ASSETS.models3d.vrikodaraTex.baseColor, true),
        loadTex(GAME_ASSETS.models3d.vrikodaraTex.metallic, false),
        loadTex(GAME_ASSETS.models3d.vrikodaraTex.normal, false),
        loadTex(GAME_ASSETS.models3d.vrikodaraTex.roughness, false),
        loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.png`, true),
        loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_normal.png`, false),
        loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_roughness.png`, false),
        loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_metallic.png`, false),
      ]);

      if (this.disposed) return;
      this.loadProgress = 78;

      let rawWeaponMesh: THREE.Mesh | null = null;
      tridentFbx.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && !rawWeaponMesh) {
          rawWeaponMesh = child as THREE.Mesh;
        }
      });

      const createWepMat = () =>
        new THREE.MeshStandardMaterial({
          map: wepBaseTex || undefined,
          normalMap: wepNormTex || undefined,
          normalScale: new THREE.Vector2(1.35, 1.35),
          roughnessMap: wepRoughTex || undefined,
          metalnessMap: wepMetTex || undefined,
          roughness: 0.38,
          metalness: 0.85,
          envMapIntensity: 1.55,
          emissive: new THREE.Color(0x280408),
          emissiveIntensity: 0.08,
        });

      // ======================================================================
      // 1. CONFIGURE DUNDUBHI (Runebound Minotaur Warlord — 65-Bone SkinnedMesh)
      // ======================================================================
      const dundubhiRoot = new THREE.Group();
      dundubhiGroup.position.set(0, 0, 0);
      dundubhiGroup.scale.setScalar(1.05);
      dundubhiRoot.add(dundubhiGroup);

      const dundubhiMaterials: THREE.MeshStandardMaterial[] = [];
      const dunWepMat = createWepMat();

      dundubhiGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.frustumCulled = false;
          mesh.castShadow = !IS_SOFTWARE_WEBGL;
          mesh.receiveShadow = !IS_SOFTWARE_WEBGL;
          const mat = new THREE.MeshStandardMaterial({
            map: dunBase || undefined,
            normalMap: dunNorm || undefined,
            normalScale: new THREE.Vector2(1.25, 1.25),
            roughnessMap: dunRough || undefined,
            metalnessMap: dunMet || undefined,
            roughness: 0.58,
            metalness: 0.48,
            envMapIntensity: 1.45,
            emissive: new THREE.Color(0x0c0608),
            emissiveIntensity: 0.06,
          });
          mesh.material = mat;
          dundubhiMaterials.push(mat);
        }
      });

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
      if (dunBones.rightHand && rawWeaponMesh) {
        dunRightSocket = new THREE.Group();
        const dunMesh = (rawWeaponMesh as THREE.Mesh).clone();
        dunMesh.material = dunWepMat;
        dunMesh.frustumCulled = false;
        dunMesh.scale.setScalar(42);
        dunMesh.rotation.set(0, 0, -Math.PI / 2);
        dunMesh.position.set(0, 0, 14);

        dunTipNode.position.set(0, 0, 0.92);
        dunBaseNode.position.set(0, 0, 0.34);
        dunMesh.add(dunTipNode);
        dunMesh.add(dunBaseNode);

        dunRightSocket.add(dunMesh);
        dunRightSocket.position.set(0, 7.5, 1.0);
        dunRightSocket.rotation.set(0, Math.PI / 2, 0.28);
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

      regMutant('idle', mIdle, 73.15, 4.5, true);
      regMutant('run', mRun, 73.15, 6.5, true);
      regMutant('charge', mRun, 73.15, 7.5, true);
      regMutant('swipe', mSwipe, 73.15, 6.5, false);
      regMutant('cleave', mSwipe, 73.15, 6.5, false);
      regMutant('combo', mSwipe, 73.15, 6.5, false);
      regMutant('whirlwind', mSwipe, 73.15, 6.5, false);
      regMutant('slam', mRoar, 73.15, 9.5, false);
      regMutant('jumpAttack', mJump, 73.15, 11.0, false);
      regMutant('stagger', mIdle, 62.0, 2.5, true);

      this.rigs.dundubhi = {
        root: dundubhiRoot,
        mixer: dunMixer,
        actions: dunActions,
        activeKey: null,
        materials: dundubhiMaterials,
        weaponMaterials: [dunWepMat],
        rightWeaponSocket: dunRightSocket,
        leftWeaponSocket: null,
        weaponTipNode: dunTipNode,
        weaponBaseNode: dunBaseNode,
        bones: dunBones,
      };

      // ======================================================================
      // 2. CONFIGURE VRIKODARA (Crimson Skull Warlord — Native Meshy Biped Rig)
      //    Exact same native scale (1, 1, 1), balanced PBR shader, and Meshy Biped
      //    animations as Rudra so Vrikodara looks 100% like the uploaded model!
      // ======================================================================
      const vrikodaraRoot = new THREE.Group();
      vrikodaraGroup.position.set(0, 0, 0);
      vrikodaraGroup.scale.setScalar(1.0); // Native Meshy Biped Armature is already 100x (~180 units tall)!
      vrikodaraRoot.add(vrikodaraGroup);

      const vrikMaterials: THREE.MeshStandardMaterial[] = [];
      const vrikWepMat = createWepMat();

      // Match Rudra3DRenderer's exact PBR material balance so Crimson Skull Warlord's hand-painted
      // red/bone/iron texture_0.png shines with zero metallic washout!
      const vrikCharMat = new THREE.MeshStandardMaterial({
        map: vrikBase || undefined,
        normalMap: vrikNorm || undefined,
        normalScale: new THREE.Vector2(1.25, 1.25),
        roughnessMap: vrikRough || undefined,
        metalnessMap: vrikMet || undefined,
        roughness: 0.60,
        metalness: 0.46,
        envMapIntensity: 1.42,
        emissive: new THREE.Color(0x0c0506),
        emissiveIntensity: 0.06,
      });
      vrikMaterials.push(vrikCharMat);

      vrikodaraGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.frustumCulled = false;
          mesh.castShadow = !IS_SOFTWARE_WEBGL;
          mesh.receiveShadow = !IS_SOFTWARE_WEBGL;
          mesh.material = vrikCharMat;
        }
      });

      const vrikBones: BossUpperBodyBones = {
        spine1: vrikodaraGroup.getObjectByName('mixamorigSpine1') || null,
        spine2: vrikodaraGroup.getObjectByName('mixamorigSpine2') || null,
        rightArm: vrikodaraGroup.getObjectByName('mixamorigRightArm') || null,
        rightForeArm: vrikodaraGroup.getObjectByName('mixamorigRightForeArm') || null,
        rightHand:
          vrikodaraGroup.getObjectByName('mixamorigRightHand') ||
          vrikodaraGroup.getObjectByName('RightHand') ||
          null,
        leftArm: vrikodaraGroup.getObjectByName('mixamorigLeftArm') || null,
      };

      const vrikTipNode = new THREE.Object3D();
      const vrikBaseNode = new THREE.Object3D();
      let vrikRightSocket: THREE.Group | null = null;
      let vrikLeftSocket: THREE.Group | null = null;

      if (vrikBones.rightHand && rawWeaponMesh) {
        vrikRightSocket = new THREE.Group();
        const rightMesh = (rawWeaponMesh as THREE.Mesh).clone();
        rightMesh.material = vrikWepMat;
        rightMesh.frustumCulled = false;
        rightMesh.scale.setScalar(0.54);
        rightMesh.rotation.set(0, 0, -Math.PI / 2);
        rightMesh.position.set(0, 0, 0.18);

        vrikTipNode.position.set(0, 0, 0.92);
        vrikBaseNode.position.set(0, 0, 0.34);
        rightMesh.add(vrikTipNode);
        rightMesh.add(vrikBaseNode);

        vrikRightSocket.add(rightMesh);
        vrikRightSocket.position.set(0, 0.076, 0.01);
        vrikRightSocket.rotation.set(0, Math.PI / 2, 0.28);
        vrikBones.rightHand.add(vrikRightSocket);
      }

      const vrikLeftHand =
        vrikodaraGroup.getObjectByName('mixamorigLeftHand') ||
        vrikodaraGroup.getObjectByName('LeftHand');
      if (vrikLeftHand && rawWeaponMesh) {
        vrikLeftSocket = new THREE.Group();
        const leftMesh = (rawWeaponMesh as THREE.Mesh).clone();
        leftMesh.material = vrikWepMat;
        leftMesh.frustumCulled = false;
        leftMesh.scale.setScalar(0.50);
        leftMesh.rotation.set(0, 0, Math.PI / 2);
        leftMesh.position.set(0, 0, 0.18);

        vrikLeftSocket.add(leftMesh);
        vrikLeftSocket.position.set(0, 0.076, 0.01);
        vrikLeftSocket.rotation.set(0, -Math.PI / 2, -0.28);
        vrikLeftSocket.visible = false;
        vrikLeftHand.add(vrikLeftSocket);
      }

      const vrikMixer = new THREE.AnimationMixer(vrikodaraGroup);
      const vrikActions: Partial<Record<BossClipKey, THREE.AnimationAction>> = {};

      // Extract native Meshy Biped animations from Rudra's merged biped animation library
      // + Vrikodara's own embedded Running clip!
      const bipedClips = bipedMergedAnimsFbx.animations || [];
      const findBipedClip = (name: string) =>
        bipedClips.find((c) => c.name.toLowerCase() === name.toLowerCase());

      const vrikNativeRun =
        vrikodaraGroup.animations?.[0] ||
        findBipedClip('Running') ||
        findBipedClip('Walking') ||
        bipedClips[0];
      const bipedWalk = findBipedClip('Walking') || findBipedClip('Casual_Walk') || vrikNativeRun;
      const bipedAttack = findBipedClip('Attack') || vrikNativeRun;
      const bipedCombo = findBipedClip('Triple_Combo_Attack') || bipedAttack;
      const bipedSkill1 = findBipedClip('Skill_01') || bipedCombo;
      const bipedSkill3 = findBipedClip('Skill_03') || bipedSkill1;
      const bipedArise = findBipedClip('Arise') || bipedWalk;

      const regBiped = (
        key: BossClipKey,
        src: THREE.AnimationClip | undefined,
        loop: boolean
      ) => {
        if (!src) return;
        const processed = makeBipedInPlaceClip(src, `vrikodara_${key}`);
        const act = vrikMixer.clipAction(processed);
        act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
        act.clampWhenFinished = !loop;
        vrikActions[key] = act;
      };

      const poisedIdle = createBipedCombatIdleClip(
        bipedClips.length > 0 ? bipedClips : vrikNativeRun ? [vrikNativeRun] : []
      );
      if (poisedIdle) {
        const idleAct = vrikMixer.clipAction(poisedIdle);
        idleAct.setLoop(THREE.LoopRepeat, Infinity);
        vrikActions.idle = idleAct;
      } else {
        regBiped('idle', bipedWalk, true);
      }

      regBiped('run', vrikNativeRun, true);
      regBiped('charge', vrikNativeRun, true);
      regBiped('swipe', bipedAttack, false);
      regBiped('cleave', bipedAttack, false);
      regBiped('combo', bipedCombo, false);
      regBiped('whirlwind', bipedSkill3, false);
      regBiped('slam', bipedSkill1, false);
      regBiped('jumpAttack', bipedSkill3, false);
      regBiped('stagger', bipedArise, false);

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

      // Warm up both rigs for 1 frame so shaders compile during preload
      this.transitionToClip(this.rigs.dundubhi, 'idle', 0.05, 1.0, 0, true);
      this.rigs.dundubhi.mixer.update(0.016);
      this.transitionToClip(this.rigs.vrikodara, 'idle', 0.05, 1.0, 0, true);
      this.rigs.vrikodara.mixer.update(0.016);

      this.loadProgress = 100;
      this.isReady = true;
    } catch (err) {
      console.warn('Boss3DRenderer load warning:', err);
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
    if (!this.isReady || !this.renderer) return false;
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
    rig.root.rotation.y = this.currentYaw + spinYawOffset;

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
      leanTarget * Math.cos(this.currentYaw),
      dt * 12
    );
    rig.root.rotation.z = THREE.MathUtils.lerp(
      rig.root.rotation.z,
      -leanTarget * Math.sin(this.currentYaw),
      dt * 12
    );

    // Clean Rim Light & Hit-Flash Response (preserves true painted texture colors!)
    if (params.isParrying) {
      this.rimLight.color.setHex(0xffe082);
      this.rimLight.intensity = 3.2;
    } else if (params.aiState === 'attack' || params.aiState === 'windup') {
      this.rimLight.color.setHex(0xff5238);
      this.rimLight.intensity = 2.8;
    } else {
      this.rimLight.color.setHex(0xffcf78);
      this.rimLight.intensity = 2.55;
    }

    for (const mat of rig.materials) {
      if (params.isHitFlash) {
        mat.emissive.setHex(0xfff0d0);
        mat.emissiveIntensity = 0.65;
      } else if (params.isParrying) {
        mat.emissive.setHex(0xffd86b);
        mat.emissiveIntensity = 0.32;
      } else {
        mat.emissive.setHex(0x0c0506);
        mat.emissiveIntensity = 0.06;
      }
    }

    for (const wMat of rig.weaponMaterials) {
      wMat.emissive.setHex(0x44080a);
      wMat.emissiveIntensity =
        params.aiState === 'attack' ? 0.30 : params.aiState === 'windup' ? 0.16 : 0.06;
    }

    this.scene.updateMatrixWorld(true);

    const trailActive =
      params.aiState === 'attack' ||
      this.attackSwingTimer > 0.04;
    const trailColor =
      params.phase === 3 ? 0xff2a18 : params.attackKind === 'shockwave' ? 0xff7722 : 0xd92638;
    this.updateWeaponTrail(rig, dt, trailActive, trailColor);

    this.renderer.render(this.scene, this.camera);
    return true;
  }

  private applyProceduralBossPose(
    bones: BossUpperBodyBones,
    spineYaw: number,
    spinePitch: number,
    armSweep: number,
    foreArmBend: number,
    wristPitch: number
  ): void {
    const rotQ = this.scratchRotQ;
    const euler = this.scratchEuler;

    if (bones.spine1) {
      euler.set(spinePitch * 0.5, spineYaw * 0.5, 0, 'XYZ');
      rotQ.setFromEuler(euler);
      bones.spine1.quaternion.multiply(rotQ);
    }
    if (bones.spine2) {
      euler.set(spinePitch * 0.5, spineYaw * 0.6, 0, 'XYZ');
      rotQ.setFromEuler(euler);
      bones.spine2.quaternion.multiply(rotQ);
    }
    if (bones.rightArm) {
      euler.set(armSweep * 0.55, armSweep * 0.7, -0.15, 'XYZ');
      rotQ.setFromEuler(euler);
      bones.rightArm.quaternion.multiply(rotQ);
    }
    if (bones.rightForeArm) {
      euler.set(foreArmBend, 0, 0, 'XYZ');
      rotQ.setFromEuler(euler);
      bones.rightForeArm.quaternion.multiply(rotQ);
    }
    if (bones.rightHand) {
      euler.set(wristPitch, 0, 0, 'XYZ');
      rotQ.setFromEuler(euler);
      bones.rightHand.quaternion.multiply(rotQ);
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
