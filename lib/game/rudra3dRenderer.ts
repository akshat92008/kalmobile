import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import {
  bindTexturedGeometryToSkeleton,
  buildStabilizedInPlaceClip,
  extractStandingHipY,
} from './enemy3dRenderer';
import {
  applyHadesCelShadingToHierarchy,
  bake2DSpriteFrameFromCanvas,
} from './hadesSpriteBaker';
import { loadFbxCached, simplifyBufferGeometry } from './meshSimplifier';

export type RudraAnimState =
  | 'idle'
  | 'run'
  | 'dash'
  | 'attack1'
  | 'attack2'
  | 'attack3'
  | 'heavy'
  | 'cast'
  | 'block'
  | 'hurt';

export interface RudraRenderInput {
  dt: number;
  vx: number;
  vy: number;
  facingX: number;
  facingY: number;
  slashAngle: number;
  isAttacking: boolean;
  isHeavyAttack: boolean;
  comboStep: number;
  attackProgress: number;
  isDodging: boolean;
  isParrying: boolean;
  isCasting: boolean;
  isHealing: boolean;
  isHurt: boolean;
  isDefeated: boolean;
  stance: string;
  focusOrbs: number;
  elevationY: number;
}

// Exact 1:1 vertex match (493,632 verts === 493,632 verts) between Pro Melee Axe Pack rig & Ashen_Warborn texture FBX!
const RUDRA_RIGGED_FBX_URL =
  '/new_3d_assets/Animations/Pro Melee Axe Pack/Meshy_AI_Ashen_Warborn_20261025_generate.fbx';
const RUDRA_TEXTURE_FBX_URL =
  '/models/Meshy_AI_Ashen_Warborn_20261025_texture_fbx/Meshy_AI_Ashen_Warborn_20261025_texture.fbx';
const RUDRA_DIFFUSE_URL =
  '/models/Meshy_AI_Ashen_Warborn_20261025_texture_fbx/Meshy_AI_Ashen_Warborn_20261025_texture.png';

// 3D Parashu Battle-Axe attached to Rudra's mixamorigRightHand bone
const PARASHU_WEAPON_FBX_URL =
  '/new_3d_assets/3D Models/Weapons/Bloodforged_Trident_Axe_20261025/Meshy_AI_Bloodforged_Trident_Axe_20261025_texture.fbx';
const PARASHU_DIFFUSE_URL =
  '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.png';

const RUDRA_ANIM_URLS: Record<RudraAnimState, string> = {
  idle: '/new_3d_assets/Animations/Pro Melee Axe Pack/standing idle.fbx',
  run: '/new_3d_assets/Animations/Pro Melee Axe Pack/standing run forward.fbx',
  dash: '/new_3d_assets/Animations/Pro Melee Axe Pack/standing run forward.fbx',
  attack1: '/new_3d_assets/Animations/Pro Melee Axe Pack/standing melee combo attack ver. 1.fbx',
  attack2: '/new_3d_assets/Animations/Pro Melee Axe Pack/standing melee combo attack ver. 2.fbx',
  attack3: '/new_3d_assets/Animations/Pro Melee Axe Pack/standing melee combo attack ver. 3.fbx',
  heavy: '/new_3d_assets/Animations/Pro Melee Axe Pack/standing melee attack downward.fbx',
  cast: '/new_3d_assets/Animations/Pro Melee Axe Pack/standing melee attack 360 high.fbx',
  block: '/new_3d_assets/Animations/Pro Melee Axe Pack/standing block idle.fbx',
  hurt: '/new_3d_assets/Animations/Pro Melee Axe Pack/standing react large from left.fbx',
};

export class Rudra3DRenderer {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private wrapper: THREE.Group;
  private model: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private actions: Partial<Record<RudraAnimState, THREE.AnimationAction>> = {};
  private standingHipY = 107.11;
  public isReady = false;
  public loadProgress = 0;
  public canvas: HTMLCanvasElement;
  private elapsedSec = 0;
  private frameCache: Map<string, HTMLCanvasElement> = new Map();

  constructor(size = 256) {
    this.scene = new THREE.Scene();
    this.wrapper = new THREE.Group();
    this.scene.add(this.wrapper);

    // Same verified camera framing as Enemy3DRenderer: feet at y=0 project to pixel y=197 (anchorY=0.77)
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    this.camera.position.set(0, 2.1, 4.4);
    this.camera.lookAt(0, 0.82, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 2.35);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff5e4, 2.75);
    keyLight.position.set(2.8, 5.2, 4.0);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xcbd5e1, 1.2);
    fillLight.position.set(-3.0, 2.5, 2.0);
    this.scene.add(fillLight);

    if (typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.canvas.width = size;
      this.canvas.height = size;
    } else {
      this.canvas = null as unknown as HTMLCanvasElement;
    }

    if (typeof window !== 'undefined') {
      try {
        this.renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        });
        this.renderer.setSize(size, size);
        this.renderer.setPixelRatio(1);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.NoToneMapping;
        this.renderer.setClearColor(0x000000, 0);
        this.canvas = this.renderer.domElement;

        this.loadRudraModelAndAnimations();
      } catch (e) {
        console.warn('[Rudra3DRenderer] WebGL initialization skipped:', e);
      }
    }
  }

  private loadRudraModelAndAnimations(): void {
    const loader = new FBXLoader();
    const texLoader = new THREE.TextureLoader();
    this.loadProgress = 0.25;

    const loadTex = (url: string): Promise<THREE.Texture | null> =>
      new Promise((resolve) => {
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

    const loadFbx = (url: string): Promise<THREE.Group | null> =>
      new Promise((resolve) => {
        loader.load(
          encodeURI(url),
          (group) => resolve(group),
          undefined,
          () => resolve(null)
        );
      });

    Promise.all([
      loadFbxCached(RUDRA_RIGGED_FBX_URL).catch(() => loadFbx(RUDRA_RIGGED_FBX_URL)),
      loadFbx(RUDRA_TEXTURE_FBX_URL),
      loadFbxCached(PARASHU_WEAPON_FBX_URL).catch(() => loadFbx(PARASHU_WEAPON_FBX_URL)),
      loadTex(RUDRA_DIFFUSE_URL),
      loadTex(PARASHU_DIFFUSE_URL),
      loadFbx(RUDRA_ANIM_URLS.idle),
      loadFbx(RUDRA_ANIM_URLS.run),
    ]).then(
      ([
        riggedGroup,
        texturedGroup,
        weaponGroup,
        diffuseMap,
        weaponDiffuseMap,
        idleAnimGroup,
        runAnimGroup,
      ]) => {
        const baseGroup = riggedGroup || texturedGroup;
        if (!baseGroup) {
          this.loadProgress = 1.0;
          return;
        }

        this.standingHipY = extractStandingHipY(baseGroup);

        const mat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: diffuseMap || null,
          roughness: 0.86,
          metalness: 0.08,
        });

        if (riggedGroup) {
          bindTexturedGeometryToSkeleton(riggedGroup, texturedGroup, mat);
        } else {
          baseGroup.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const m = child as THREE.Mesh;
              m.frustumCulled = false;
              m.material = mat;
            }
          });
        }

        // Normalize height to 1.56m BEFORE attaching weapon so weapon bounds do not shrink character
        const rawBox = new THREE.Box3().setFromObject(baseGroup);
        const rawHeight = Math.max(0.001, rawBox.max.y - rawBox.min.y);
        const scale = 1.56 / rawHeight;
        baseGroup.scale.setScalar(scale);
        baseGroup.position.set(0, -0.06, 0);

        // Attach 3D Parashu Battle-Axe to Rudra's right hand bone with exact world-scale normalization
        baseGroup.updateMatrixWorld(true);
        const rightHand =
          baseGroup.getObjectByName('mixamorigRightHand') ||
          baseGroup.getObjectByName('RightHand');
        if (rightHand && weaponGroup) {
          const wepMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: weaponDiffuseMap || null,
            roughness: 0.82,
            metalness: 0.12,
          });
          weaponGroup.traverse((c) => {
            if ((c as THREE.Mesh).isMesh) {
              const wm = c as THREE.Mesh;
              wm.geometry = simplifyBufferGeometry(wm.geometry, 56, 32000);
              wm.material = wepMat;
              wm.frustumCulled = false;
            }
          });
          const handScaleVec = new THREE.Vector3();
          rightHand.getWorldScale(handScaleVec);
          const handScale = Math.max(1e-5, handScaleVec.x);

          const wepBox = new THREE.Box3().setFromObject(weaponGroup);
          const wepSize = new THREE.Vector3();
          wepBox.getSize(wepSize);
          const maxDim = Math.max(0.001, wepSize.x, wepSize.y, wepSize.z);
          const desiredWorldLen = 1.04;
          const localWepScale = desiredWorldLen / (maxDim * handScale);

          const weaponSocket = new THREE.Group();
          weaponGroup.scale.setScalar(localWepScale);
          weaponGroup.rotation.set(-Math.PI * 0.5, 0, -Math.PI * 0.5);
          weaponGroup.position.set(0.26 * maxDim * localWepScale, 0, 0);
          weaponSocket.add(weaponGroup);
          rightHand.add(weaponSocket);
        }

        applyHadesCelShadingToHierarchy(baseGroup);

        this.wrapper.add(baseGroup);
        this.model = baseGroup;
        this.mixer = new THREE.AnimationMixer(baseGroup);

        if (idleAnimGroup?.animations?.[0]) {
          const cleanIdle = buildStabilizedInPlaceClip(
            idleAnimGroup.animations[0],
            baseGroup,
            this.standingHipY
          );
          if (cleanIdle.tracks.length > 0) {
            const idleAction = this.mixer.clipAction(cleanIdle);
            idleAction.play();
            this.actions.idle = idleAction;
          }
        }
        if (runAnimGroup?.animations?.[0]) {
          const cleanRun = buildStabilizedInPlaceClip(
            runAnimGroup.animations[0],
            baseGroup,
            this.standingHipY
          );
          if (cleanRun.tracks.length > 0) {
            this.actions.run = this.mixer.clipAction(cleanRun);
          }
        }

        this.isReady = true;
        this.loadProgress = 1.0;

        (Object.keys(RUDRA_ANIM_URLS) as RudraAnimState[]).forEach((state) => {
          if (state === 'idle' || state === 'run') return;
          const url = RUDRA_ANIM_URLS[state];
          loadFbx(url).then((animGroup) => {
            if (!animGroup || !animGroup.animations || animGroup.animations.length === 0 || !this.mixer) {
              return;
            }
            const rawClip = animGroup.animations[0];
            const cleanClip = buildStabilizedInPlaceClip(rawClip, baseGroup, this.standingHipY);
            if (cleanClip.tracks.length === 0) return;

            const action = this.mixer.clipAction(cleanClip);
            this.actions[state] = action;
            const prefix = `rudra:${state}:`;
            for (const k of Array.from(this.frameCache.keys())) {
              if (k.startsWith(prefix)) this.frameCache.delete(k);
            }
          });
        });
      }
    );
  }

  public updateAndRender(input: RudraRenderInput): boolean {
    if (!this.isReady || !this.renderer) return false;
    this.elapsedSec += Math.max(0, Math.min(0.1, input.dt || 0.016));

    let state: RudraAnimState = 'idle';
    let animClock = this.elapsedSec;

    if (input.isHurt || input.isDefeated) {
      state = 'hurt';
    } else if (input.isParrying) {
      state = 'block';
    } else if (input.isCasting) {
      state = 'cast';
    } else if (input.isHeavyAttack) {
      state = 'heavy';
      animClock = Math.max(0, Math.min(0.99, input.attackProgress));
    } else if (input.isAttacking) {
      state =
        input.comboStep === 2
          ? 'attack2'
          : input.comboStep >= 3
            ? 'attack3'
            : 'attack1';
      animClock = Math.max(0, Math.min(0.99, input.attackProgress));
    } else if (input.isDodging) {
      state = 'dash';
    } else if (Math.hypot(input.vx, input.vy) > 14) {
      state = 'run';
    }

    const facingAngle =
      input.isAttacking || input.isHeavyAttack
        ? input.slashAngle
        : Math.atan2(input.facingY || 0, input.facingX || 1);

    const baked = this.renderFrame(state, animClock, facingAngle, input.isHurt);
    if (baked) {
      this.canvas = baked;
      return true;
    }
    return false;
  }

  public renderFrame(
    state: RudraAnimState,
    animTimeSec: number,
    facingAngleRad: number,
    hitFlash = false
  ): HTMLCanvasElement | null {
    if (!this.renderer || !this.isReady || !this.model || !this.mixer) return null;

    const normalizedYaw = ((facingAngleRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const yawIndex = Math.round((normalizedYaw / (Math.PI * 2)) * 16) % 16;
    const quantizedYaw = (yawIndex / 16) * Math.PI * 2;

    const isAttack =
      state === 'attack1' ||
      state === 'attack2' ||
      state === 'attack3' ||
      state === 'heavy' ||
      state === 'cast';

    const action =
      this.actions[state] ||
      (isAttack ? this.actions.attack1 || this.actions.run : undefined) ||
      this.actions.idle;

    const clipDur = action ? Math.max(0.4, action.getClip().duration) : 1.0;
    const steps = isAttack ? 18 : 14;

    // For attacks, animTimeSec is normalized progress [0..1]; for locomotion, it's elapsed seconds
    const stepIndex = isAttack
      ? Math.min(steps - 1, Math.floor(Math.max(0, Math.min(0.999, animTimeSec)) * steps))
      : Math.floor(((animTimeSec % clipDur) / clipDur) * steps);
    const quantizedTime = (stepIndex / steps) * clipDur;

    const flashTag = hitFlash ? 'flash' : 'norm';
    const cacheKey = `rudra:${state}:y${yawIndex}:f${stepIndex}:${flashTag}`;

    const cached = this.frameCache.get(cacheKey);
    if (cached) return cached;

    if (action) {
      this.mixer.stopAllAction();
      action.reset();
      action.play();
      this.mixer.setTime(quantizedTime);
    }

    this.wrapper.rotation.y = Math.PI * 0.5 - quantizedYaw;
    this.wrapper.rotation.x = 0;

    this.renderer.render(this.scene, this.camera);

    const baked = bake2DSpriteFrameFromCanvas(this.renderer.domElement, cacheKey, {
      outlineColor: hitFlash ? '#ffffff' : '#120806',
      outlineThickness: 2,
      hitFlash,
      cacheFrame: false,
    });

    if (this.frameCache.size > 2000) {
      const oldest = this.frameCache.keys().next().value;
      if (oldest) this.frameCache.delete(oldest);
    }
    this.frameCache.set(cacheKey, baked);

    return baked;
  }

  public dispose(): void {
    this.frameCache.clear();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
