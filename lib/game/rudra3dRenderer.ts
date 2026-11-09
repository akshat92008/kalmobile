import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { IS_SOFTWARE_WEBGL } from '../../engine/ue5GraphicsEngine';
import { loadFbxCached, simplifyGroupGeometries } from './meshSimplifier';
import type { StaffStance } from './rules';

export type RudraAnimState =
  | 'idle'
  | 'run'
  | 'dash'
  | 'combo1'
  | 'combo2'
  | 'combo3'
  | 'combo4'
  | 'heavy'
  | 'parry'
  | 'cast'
  | 'heal'
  | 'hurt'
  | 'defeat';

export interface Rudra3DRenderParams {
  dt: number;
  vx: number;
  vy: number;
  facingX: number;
  facingY: number;
  slashAngle: number;
  isAttacking: boolean;
  isHeavyAttack: boolean;
  comboStep: number;
  attackProgress: number; // 0..1
  isDodging: boolean;
  isParrying: boolean;
  isCasting: boolean;
  isHealing: boolean;
  isHurt: boolean;
  isDefeated: boolean;
  stance: StaffStance;
  focusOrbs: number;
  elevationY: number;
}

interface TrailSample {
  tip: THREE.Vector3;
  base: THREE.Vector3;
  age: number;
}

export class Rudra3DRenderer {
  public canvas: HTMLCanvasElement;
  public isReady = false;
  public loadError: string | null = null;
  public loadProgress = 0;
  private disposed = false;

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private rootGroup: THREE.Group;
  private charObject: THREE.Group | null = null;
  private weaponObject: THREE.Object3D | null = null;
  private weaponTipNode: THREE.Object3D;
  private weaponBaseNode: THREE.Object3D;
  private mixer: THREE.AnimationMixer | null = null;
  private actions: Map<string, THREE.AnimationAction> = new Map();
  private activeActionName = '';
  private currentAnimState: RudraAnimState = 'idle';

  // Cached Mixamo bones for clean Hades-grade upper-body axe cleave articulation
  private spine1Bone: THREE.Object3D | null = null;
  private spine2Bone: THREE.Object3D | null = null;
  private rightArmBone: THREE.Object3D | null = null;
  private rightForeArmBone: THREE.Object3D | null = null;
  private rightHandBone: THREE.Object3D | null = null;

  // Single-strike window so each click plays strictly ONE clean, fluid swing
  private attackHoldTimer = 0;
  private attackHoldDuration = 0.32;
  private activeStrikeKind: 'none' | 'combo1' | 'combo2' | 'combo3' | 'combo4' | 'heavy' = 'none';
  private lastAttackTriggerStep = 0;
  private wasAttackingLastFrame = false;

  // Balanced PBR Lighting (preserves dark iron & blood-crimson textures)
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;
  private axeGlowLight: THREE.PointLight;

  // 3D Weapon Slash Ribbon in Scene
  private trailMesh: THREE.Mesh;
  private trailGeometry: THREE.BufferGeometry;
  private trailMaterial: THREE.MeshBasicMaterial;
  private trailSamples: TrailSample[] = [];
  private readonly maxTrailSamples = 14;

  // Smooth 360-degree isometric yaw
  private currentYaw = 0;
  private targetYaw = 0;
  private elapsedTime = 0;
  private lastSoftwareRenderTime = -999;
  private charMaterials: THREE.MeshStandardMaterial[] = [];
  private wepMaterials: THREE.MeshStandardMaterial[] = [];

  constructor(size = 256) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;

    this.scene = new THREE.Scene();

    // True 2.5D Hades Dimetric (2:1) Isometric Orthographic Camera (~27° elevation, never 90° top-down)
    const halfExtent = 132;
    this.camera = new THREE.OrthographicCamera(
      -halfExtent,
      halfExtent,
      halfExtent,
      -halfExtent,
      1,
      1000
    );
    this.camera.position.set(0, 152, 295);
    this.camera.lookAt(0, 76, 0);

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.weaponTipNode = new THREE.Object3D();
    this.weaponBaseNode = new THREE.Object3D();

    // High-Contrast Hades Dark-Mythology Rim & Key Lighting Rig
    const ambient = new THREE.AmbientLight(0xd8d4e8, 1.65);
    this.scene.add(ambient);

    this.keyLight = new THREE.DirectionalLight(0xfff5e4, 2.95);
    this.keyLight.position.set(-140, 240, 210);
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0xffcf78, 2.55);
    this.rimLight.position.set(145, 195, -220);
    this.scene.add(this.rimLight);

    this.fillLight = new THREE.DirectionalLight(0x68a8ff, 1.45);
    this.fillLight.position.set(165, 65, 135);
    this.scene.add(this.fillLight);

    this.axeGlowLight = new THREE.PointLight(0xff4e2a, 1.15, 175);
    this.axeGlowLight.position.set(0, 90, 45);
    this.rootGroup.add(this.axeGlowLight);

    // Real-time 3D Axe Blade Trail Ribbon
    this.trailGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxTrailSamples * 2 * 3);
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const indices: number[] = [];
    for (let i = 0; i < this.maxTrailSamples - 1; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, b, c, b, d, c);
    }
    this.trailGeometry.setIndex(indices);

    this.trailMaterial = new THREE.MeshBasicMaterial({
      color: 0xff9d2e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.trailMesh = new THREE.Mesh(this.trailGeometry, this.trailMaterial);
    this.trailMesh.frustumCulled = false;
    this.trailMesh.visible = false;
    this.scene.add(this.trailMesh);

    this.initWebGL(size);
  }

  private initWebGL(size: number) {
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
      this.renderer.toneMappingExposure = 0.98;
      this.renderer.shadowMap.enabled = false;

      // UE5 Lumen-Style Studio IBL Environment Map for Metallic Armor & Broken Gada Reflections
      if (!IS_SOFTWARE_WEBGL) {
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
        pmremGenerator.dispose();
      }

      this.loadAssets();
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : 'WebGL initialization failed';
    }
  }

  /**
   * Builds a composite 8-part 3D Broken Gada (v7 Section 5 & 29: heavy cracked iron mace
   * stamped with the spiral mark of Suvarna's forge and glowing molten slag fissures).
   */
  private buildProceduralBrokenGadaGroup(
    ironMat: THREE.MeshStandardMaterial
  ): THREE.Group {
    const gadaGroup = new THREE.Group();
    gadaGroup.name = 'BrokenGada3DGroup';

    const forgedIronMat = ironMat.clone();
    forgedIronMat.roughness = 0.42;
    forgedIronMat.metalness = 0.86;
    forgedIronMat.envMapIntensity = 1.55;
    this.wepMaterials.push(forgedIronMat);

    const brassSpiralMat = new THREE.MeshStandardMaterial({
      color: 0xe6b85c,
      roughness: 0.28,
      metalness: 0.92,
      envMapIntensity: 1.65,
      emissive: new THREE.Color(0x3a2005),
      emissiveIntensity: 0.18,
    });
    this.wepMaterials.push(brassSpiralMat);

    const moltenCrackMat = new THREE.MeshStandardMaterial({
      color: 0xff5a1f,
      roughness: 0.2,
      metalness: 0.15,
      emissive: new THREE.Color(0xff4518),
      emissiveIntensity: 1.6,
    });
    this.wepMaterials.push(moltenCrackMat);

    // 1. Primary Silhouette: Heavy Fluted Iron Gada Bulb (aligned along +Z shaft at z = 0.62)
    const bulbGeo = new THREE.SphereGeometry(0.19, 16, 14);
    bulbGeo.scale(1.0, 1.0, 1.18);
    const bulbMesh = new THREE.Mesh(bulbGeo, forgedIronMat);
    bulbMesh.position.set(0, 0, 0.62);
    gadaGroup.add(bulbMesh);

    // 2. Primary Fracture: Glowing Molten Slag Core inside the Cracked Crown
    const coreGeo = new THREE.DodecahedronGeometry(0.145, 0);
    const coreMesh = new THREE.Mesh(coreGeo, moltenCrackMat);
    coreMesh.position.set(0.02, 0.01, 0.68);
    gadaGroup.add(coreMesh);

    // 3. Accent Detail: 6 Radial Armor-Crushing Iron Flanges around the Gada Bulb
    const flangeGeo = new THREE.BoxGeometry(0.036, 0.41, 0.22);
    for (let i = 0; i < 6; i++) {
      const flange = new THREE.Mesh(flangeGeo, i % 2 === 0 ? forgedIronMat : brassSpiralMat);
      flange.position.set(0, 0, 0.62);
      flange.rotation.z = (i * Math.PI) / 6;
      gadaGroup.add(flange);
    }

    // 4. Secondary Read: Reinforced Chola-Iron Shaft (along local Z axis from -0.45 to +0.52)
    const shaftGeo = new THREE.CylinderGeometry(0.032, 0.042, 1.02, 12);
    shaftGeo.rotateX(Math.PI / 2);
    const shaftMesh = new THREE.Mesh(shaftGeo, forgedIronMat);
    shaftMesh.position.set(0, 0, 0.04);
    gadaGroup.add(shaftMesh);

    // 5. Secondary Read: Upper & Lower Brass Lotus Collars framing the Gada Head
    const collarGeo = new THREE.TorusGeometry(0.068, 0.018, 10, 18);
    const lowerCollar = new THREE.Mesh(collarGeo, brassSpiralMat);
    lowerCollar.position.set(0, 0, 0.44);
    gadaGroup.add(lowerCollar);

    const crownSpikeGeo = new THREE.ConeGeometry(0.065, 0.14, 8);
    crownSpikeGeo.rotateX(Math.PI / 2);
    const crownSpike = new THREE.Mesh(crownSpikeGeo, brassSpiralMat);
    crownSpike.position.set(0, 0, 0.86);
    gadaGroup.add(crownSpike);

    // 6. Accent Detail: Suvarna's Spiral Forge-Mark Ring above the Grip
    const spiralRingGeo = new THREE.TorusGeometry(0.048, 0.012, 8, 20);
    const spiralRing = new THREE.Mesh(spiralRingGeo, brassSpiralMat);
    spiralRing.position.set(0, 0, 0.24);
    gadaGroup.add(spiralRing);

    // 7. Accent Detail: Heavy Pommel Counterweight Ring at -0.44
    const pommelGeo = new THREE.TorusGeometry(0.055, 0.016, 10, 16);
    const pommel = new THREE.Mesh(pommelGeo, brassSpiralMat);
    pommel.position.set(0, 0, -0.44);
    gadaGroup.add(pommel);

    return gadaGroup;
  }

  private async loadAssets() {
    const texLoader = new THREE.TextureLoader();

    const loadTex = (url: string, isColor = false, attempt = 0): Promise<THREE.Texture | null> =>
      new Promise((resolve, reject) => {
        if (IS_SOFTWARE_WEBGL && !isColor) {
          resolve(null);
          return;
        }
        texLoader.load(
          url,
          (tex) => {
            if (isColor) {
              tex.colorSpace = THREE.SRGBColorSpace;
            }
            if (IS_SOFTWARE_WEBGL) {
              tex.generateMipmaps = false;
              tex.minFilter = THREE.LinearFilter;
            }
            tex.needsUpdate = true;
            resolve(tex);
          },
          undefined,
          (err) => {
            if (attempt < 3) {
              setTimeout(() => {
                loadTex(url, isColor, attempt + 1).then(resolve).catch(reject);
              }, 700 * (attempt + 1));
            } else {
              reject(err);
            }
          }
        );
      });

    const loadFbx = (url: string): Promise<THREE.Group> =>
      loadFbxCached(url, false).then((obj) => {
        this.loadProgress = 0.95;
        return obj;
      });

    try {
      const charBase = '/models/Meshy_AI_Ashen_Warborn_biped';
      const wepBase = '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx';

      const [
        charObj,
        wepObj,
        charAlbedo,
        charNormal,
        charRough,
        charMetal,
        wepAlbedo,
        wepNormal,
        wepRough,
        wepMetal,
      ] = await Promise.all([
        loadFbx(`${charBase}/Meshy_AI_Ashen_Warborn_biped_Meshy_Merged_Animations.fbx`),
        loadFbx(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.fbx`),
        loadTex(`${charBase}/Meshy_AI_Ashen_Warborn_biped_texture_0.png`, true),
        loadTex(`${charBase}/Meshy_AI_Ashen_Warborn_biped_texture_0_normal.png`, false),
        loadTex(`${charBase}/Meshy_AI_Ashen_Warborn_biped_texture_0_roughness.png`, false),
        loadTex(`${charBase}/Meshy_AI_Ashen_Warborn_biped_texture_0_metallic.png`, false),
        loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.png`, true),
        loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_normal.png`, false),
        loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_roughness.png`, false),
        loadTex(`${wepBase}/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_metallic.png`, false),
      ]);

      if (this.disposed) return;

      // 1. Configure Character PBR Material graded to match the warm hand-painted 2D Kurukshetra palette
      const charMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xd8b692),
        roughness: 0.76,
        metalness: 0.22,
        envMapIntensity: 0.82,
        emissive: new THREE.Color(0x1c0d06),
        emissiveIntensity: 0.16,
      });
      if (charAlbedo) charMat.map = charAlbedo;
      if (charNormal) {
        charMat.normalMap = charNormal;
        charMat.normalScale.set(1.15, 1.15);
      }
      if (charRough) charMat.roughnessMap = charRough;
      if (charMetal) charMat.metalnessMap = charMetal;
      this.charMaterials.push(charMat);

      charObj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.material = charMat;
          mesh.castShadow = false;
          mesh.receiveShadow = false;
          mesh.frustumCulled = false;
        }
      });

      this.charObject = charObj;
      this.rootGroup.add(charObj);

      // Cache Mixamo upper-body bones
      this.spine1Bone = charObj.getObjectByName('mixamorigSpine1') || null;
      this.spine2Bone = charObj.getObjectByName('mixamorigSpine2') || null;
      this.rightArmBone = charObj.getObjectByName('mixamorigRightArm') || null;
      this.rightForeArmBone = charObj.getObjectByName('mixamorigRightForeArm') || null;
      this.rightHandBone =
        charObj.getObjectByName('mixamorigRightHand') ||
        charObj.getObjectByName('RightHand') ||
        null;

      // 2. Configure 3D Weapon Material & Socket a SINGLE Clean Weapon (no overlapping double weapons)
      const wepMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xe6be82),
        roughness: 0.42,
        metalness: 0.78,
        envMapIntensity: 1.15,
        emissive: new THREE.Color(0x381206),
        emissiveIntensity: 0.18,
      });
      if (wepAlbedo) wepMat.map = wepAlbedo;
      if (wepNormal) {
        wepMat.normalMap = wepNormal;
        wepMat.normalScale.set(1.25, 1.25);
      }
      if (wepRough) wepMat.roughnessMap = wepRough;
      if (wepMetal) wepMat.metalnessMap = wepMetal;
      this.wepMaterials.push(wepMat);

      let weaponMesh: THREE.Mesh | null = null;
      wepObj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && !weaponMesh) {
          weaponMesh = child as THREE.Mesh;
        }
      });

      if (this.rightHandBone) {
        const weaponHolder = new THREE.Group();
        weaponHolder.name = 'BrokenGadaWeaponHolder';

        if (weaponMesh) {
          const mesh = weaponMesh as THREE.Mesh;
          mesh.material = wepMat;
          mesh.frustumCulled = false;
          const axeScale = 0.44;
          mesh.scale.set(axeScale, axeScale, axeScale);
          mesh.rotation.set(0, 0, -Math.PI / 2);
          mesh.position.set(0, 0, 0.16);
          weaponHolder.add(mesh);
        } else {
          const brokenGadaGroup = this.buildProceduralBrokenGadaGroup(wepMat);
          brokenGadaGroup.scale.set(0.46, 0.46, 0.46);
          brokenGadaGroup.position.set(0, 0, 0.12);
          weaponHolder.add(brokenGadaGroup);
        }

        this.weaponTipNode.position.set(0, 0, 0.56);
        this.weaponBaseNode.position.set(0, 0, 0.16);
        weaponHolder.add(this.weaponTipNode);
        weaponHolder.add(this.weaponBaseNode);

        weaponHolder.position.set(0.0, 0.072, 0.01);
        weaponHolder.rotation.set(0.0, Math.PI / 2, 0.22);

        this.rightHandBone.add(weaponHolder);
        this.weaponObject = weaponHolder;
      }

      // 3. Process Embedded Animations & Strip Horizontal Root Drift
      this.mixer = new THREE.AnimationMixer(charObj);
      const rawClips = charObj.animations || [];

      const oneShotClipNames = new Set([
        'Attack',
        'Triple_Combo_Attack',
        'Skill_01',
        'Skill_03',
        'Arise',
      ]);

      for (const rawClip of rawClips) {
        const clip = this.makeInPlaceClip(rawClip);
        const action = this.mixer.clipAction(clip);
        if (oneShotClipNames.has(clip.name)) {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        }
        this.actions.set(clip.name, action);
      }

      // Create poised, breathing Hades Combat Idle clip
      const idleClip = this.createCombatIdleClip(rawClips);
      if (idleClip) {
        const idleAction = this.mixer.clipAction(idleClip);
        idleAction.setLoop(THREE.LoopRepeat, Infinity);
        this.actions.set('Combat_Idle', idleAction);
      }

      this.transitionToAction(
        this.actions.has('Combat_Idle') ? 'Combat_Idle' : 'Casual_Walk',
        0.05,
        1.0
      );
      this.mixer.update(0.016);

      this.loadProgress = 1;
      this.isReady = true;
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : 'Failed to load 3D assets';
      this.loadProgress = 1;
    }
  }

  private makeInPlaceClip(sourceClip: THREE.AnimationClip): THREE.AnimationClip {
    const clip = sourceClip.clone();
    const isArise = clip.name === 'Arise';

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

  private createCombatIdleClip(clips: THREE.AnimationClip[]): THREE.AnimationClip | null {
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

      const isSpine =
        track.name.includes('Spine') && track.name.endsWith('.quaternion');
      const isRightArm =
        track.name.includes('RightArm') && track.name.endsWith('.quaternion');
      const isHipsPos =
        track.name.includes('Hips') && track.name.endsWith('.position');

      const outValues: number[] = [];
      for (let step = 0; step < times.length; step++) {
        const phase = Math.sin((step / (times.length - 1)) * Math.PI * 2);
        if (isHipsPos && itemSize === 3) {
          outValues.push(0, (baseVal[1] || 0.92) + phase * 0.012, 0);
        } else if ((isSpine || isRightArm) && itemSize === 4) {
          const q = new THREE.Quaternion(baseVal[0], baseVal[1], baseVal[2], baseVal[3]);
          const breathQ = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(
              isSpine ? phase * 0.02 : phase * 0.03,
              0,
              isRightArm ? phase * 0.02 : 0
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

    return new THREE.AnimationClip('Combat_Idle', duration, newTracks);
  }

  private transitionToAction(
    clipName: string,
    fadeDuration = 0.08,
    timeScale = 1.0,
    startTimeOffset = 0,
    forceRestart = false
  ) {
    if (!this.mixer) return;
    const nextAction =
      this.actions.get(clipName) ||
      this.actions.get('Combat_Idle') ||
      Array.from(this.actions.values())[0];
    if (!nextAction) return;

    if (this.activeActionName === clipName && !forceRestart) {
      nextAction.setEffectiveTimeScale(timeScale);
      return;
    }

    const prevAction = this.actions.get(this.activeActionName);

    // Strictly stop all other non-active actions and clear active fades so animations NEVER glitch to bind-pose!
    for (const [, act] of this.actions.entries()) {
      act.stopFading();
      if (act !== nextAction && act !== prevAction) {
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
      prevAction.enabled = true;
      prevAction.setEffectiveWeight(1);
      prevAction.crossFadeTo(nextAction, fadeDuration, false);
    }

    this.activeActionName = clipName;
  }

  public updateAndRender(params: Rudra3DRenderParams): boolean {
    if (!this.isReady || !this.renderer || !this.mixer || !this.charObject) {
      return false;
    }

    const dt = Math.min(0.05, Math.max(0.001, params.dt));
    this.elapsedTime += dt;

    // Detect fresh attack trigger or combo step progression — strictly ONE clean swing per trigger
    const isNowAttacking = params.isAttacking || params.isHeavyAttack;
    if (
      isNowAttacking &&
      (!this.wasAttackingLastFrame || params.comboStep !== this.lastAttackTriggerStep)
    ) {
      this.lastAttackTriggerStep = params.comboStep;
      if (params.isHeavyAttack) {
        this.activeStrikeKind = 'heavy';
        this.currentAnimState = 'heavy';
        if (params.stance === 'smash') {
          this.attackHoldDuration = 0.44;
          this.attackHoldTimer = 0.44;
          this.transitionToAction('Skill_03', 0.08, 1.42, 0.08, true);
        } else if (params.stance === 'pillar') {
          this.attackHoldDuration = 0.42;
          this.attackHoldTimer = 0.42;
          this.transitionToAction('Skill_01', 0.08, 1.52, 0.05, true);
        } else {
          this.attackHoldDuration = 0.4;
          this.attackHoldTimer = 0.4;
          this.transitionToAction('Attack', 0.08, 1.55, 0.1, true);
        }
      } else {
        const step = ((params.comboStep - 1) % 4) + 1;
        this.attackHoldDuration = step === 4 ? 0.36 : 0.28;
        this.attackHoldTimer = this.attackHoldDuration;
        if (step === 1) {
          this.activeStrikeKind = 'combo1';
          this.currentAnimState = 'combo1';
          this.transitionToAction('Attack', 0.07, 1.65, 0.06, true);
        } else if (step === 2) {
          this.activeStrikeKind = 'combo2';
          this.currentAnimState = 'combo2';
          this.transitionToAction('Skill_01', 0.07, 1.68, 0.05, true);
        } else if (step === 3) {
          this.activeStrikeKind = 'combo3';
          this.currentAnimState = 'combo3';
          this.transitionToAction('Triple_Combo_Attack', 0.07, 1.6, 0.08, true);
        } else {
          this.activeStrikeKind = 'combo4';
          this.currentAnimState = 'combo4';
          this.transitionToAction('Skill_03', 0.08, 1.55, 0.08, true);
        }
      }
    }
    this.wasAttackingLastFrame = isNowAttacking;

    if (this.attackHoldTimer > 0) {
      this.attackHoldTimer = Math.max(0, this.attackHoldTimer - dt);
      if (params.isDodging) {
        // Dash-cancel immediately interrupts attack follow-through (Hades responsiveness!)
        this.attackHoldTimer = 0;
        this.activeStrikeKind = 'none';
      }
    } else {
      this.activeStrikeKind = 'none';
    }

    // 1. Determine Desired Locomotion / Action State when not in active strike hold
    const speed = Math.hypot(params.vx, params.vy);
    const runThreshold = this.currentAnimState === 'run' ? 14 : 26;
    let nextState: RudraAnimState = 'idle';

    if (params.isDefeated) {
      nextState = 'defeat';
    } else if (params.isDodging) {
      nextState = 'dash';
    } else if (this.attackHoldTimer > 0) {
      nextState = this.activeStrikeKind === 'none' ? 'combo1' : this.activeStrikeKind;
    } else if (params.isParrying) {
      nextState = 'parry';
    } else if (params.isCasting) {
      nextState = 'cast';
    } else if (params.isHealing) {
      nextState = 'heal';
    } else if (params.isHurt) {
      nextState = 'hurt';
    } else if (speed > runThreshold) {
      nextState = 'run';
    } else {
      nextState = 'idle';
    }

    if (nextState !== this.currentAnimState && this.attackHoldTimer <= 0) {
      this.currentAnimState = nextState;
      switch (nextState) {
        case 'idle':
          this.transitionToAction(
            this.actions.has('Combat_Idle') ? 'Combat_Idle' : 'Walking',
            0.1,
            1.0
          );
          break;
        case 'run':
          this.transitionToAction(
            speed > 205 && this.actions.has('Run_03') ? 'Run_03' : 'Running',
            0.08,
            Math.min(1.48, Math.max(0.85, speed / 240))
          );
          break;
        case 'dash':
          this.transitionToAction('RunFast', 0.05, 1.6);
          break;
        case 'parry':
          this.transitionToAction('Attack', 0.06, 0.85, 0.14, true);
          break;
        case 'cast':
          this.transitionToAction('Skill_03', 0.07, 1.35, 0.12, true);
          break;
        case 'heal':
          this.transitionToAction('Arise', 0.08, 1.15, 0.65, true);
          break;
        case 'hurt':
          this.transitionToAction('Arise', 0.06, 1.2, 0.45, true);
          break;
        case 'defeat':
          this.transitionToAction('Arise', 0.15, 0.05, 0.15, true);
          break;
      }
    } else if (nextState === 'run' && this.attackHoldTimer <= 0) {
      const desiredRunClip = speed > 205 && this.actions.has('Run_03') ? 'Run_03' : 'Running';
      if (this.activeActionName !== desiredRunClip) {
        this.transitionToAction(
          desiredRunClip,
          0.08,
          Math.min(1.48, Math.max(0.85, speed / 240))
        );
      } else {
        const runAct = this.actions.get(this.activeActionName);
        if (runAct) {
          runAct.setEffectiveTimeScale(Math.min(1.48, Math.max(0.85, speed / 240)));
        }
      }
    }

    // 2. Calculate True 360-Degree Isometric Facing Angle
    let aimDx = params.facingX;
    let aimDy = params.facingY;

    if (this.attackHoldTimer > 0 || params.isAttacking || params.isHeavyAttack || params.isCasting) {
      aimDx = Math.cos(params.slashAngle);
      aimDy = Math.sin(params.slashAngle);
    } else if (speed > 18) {
      aimDx = params.vx;
      aimDy = params.vy;
    }

    if (Math.hypot(aimDx, aimDy) > 0.001) {
      this.targetYaw = Math.atan2(aimDx, aimDy);
    }

    let angleDiff = this.targetYaw - this.currentYaw;
    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
    const turnSpeed = this.attackHoldTimer > 0 || params.isDodging ? 32 : 18;
    this.currentYaw += angleDiff * Math.min(1, turnSpeed * dt);

    // Advance base FBX animation mixer
    this.mixer.update(dt);

    // 3. Subtle Natural Torso Turn During Strikes (No Destructive Arm/Forearm Bone Twisting!)
    let spinYawOffset = 0;
    if (this.attackHoldTimer > 0 && this.activeStrikeKind !== 'none') {
      const p = 1 - this.attackHoldTimer / Math.max(0.01, this.attackHoldDuration);
      const swingCurve = Math.sin(Math.min(1, p * 1.1) * Math.PI);
      const sweepSigned = -1 + 2 * Math.min(1, Math.pow(p, 0.78));

      if (this.activeStrikeKind === 'combo1') {
        this.applyProceduralSwingPose(sweepSigned * 0.16, 0.07 * swingCurve, 0, 0, 0);
      } else if (this.activeStrikeKind === 'combo2') {
        this.applyProceduralSwingPose(-sweepSigned * 0.16, 0.07 * swingCurve, 0, 0, 0);
      } else if (
        this.activeStrikeKind === 'combo3' ||
        (this.activeStrikeKind === 'heavy' && params.stance === 'pillar')
      ) {
        this.applyProceduralSwingPose(0.14 * sweepSigned, 0.09 * swingCurve, 0, 0, 0);
      } else {
        this.applyProceduralSwingPose(0.12 * sweepSigned, 0.1 * swingCurve, 0, 0, 0);
      }
    }

    this.rootGroup.rotation.y = this.currentYaw + spinYawOffset;

    // Kinetic sprint/dash lean
    const leanTarget =
      params.isDodging
        ? 0.18
        : this.attackHoldTimer > 0
        ? 0.1
        : speed > 120
        ? 0.08
        : 0;
    this.rootGroup.rotation.x = THREE.MathUtils.lerp(
      this.rootGroup.rotation.x,
      leanTarget * Math.cos(this.currentYaw),
      dt * 14
    );
    this.rootGroup.rotation.z = THREE.MathUtils.lerp(
      this.rootGroup.rotation.z,
      -leanTarget * Math.sin(this.currentYaw),
      dt * 14
    );

    // Keep character grounded inside the 3D orthographic frustum (2D elevationY is applied in screen space)
    this.rootGroup.position.y = 0;

    // 4. Authentic Warm Kurukshetra PBR Rim & Material Response
    if (params.isParrying) {
      this.rimLight.color.setHex(0xffd86b);
      this.rimLight.intensity = 3.1;
    } else if (params.isDodging) {
      this.rimLight.color.setHex(0xffb84d);
      this.rimLight.intensity = 2.8;
    } else if (this.attackHoldTimer > 0) {
      this.rimLight.color.setHex(0xff7733);
      this.rimLight.intensity = 2.6;
    } else {
      this.rimLight.color.setHex(0xd99652);
      this.rimLight.intensity = 1.95;
    }

    for (const mat of this.charMaterials) {
      if (params.isHurt) {
        mat.emissive.setHex(0xb8221e);
        mat.emissiveIntensity = 0.48;
      } else if (params.isParrying) {
        mat.emissive.setHex(0x8a5a18);
        mat.emissiveIntensity = 0.28;
      } else if (params.isDodging) {
        mat.emissive.setHex(0x583212);
        mat.emissiveIntensity = 0.25;
      } else {
        mat.emissive.setHex(0x1c0d06);
        mat.emissiveIntensity = 0.16;
      }
    }

    for (const mat of this.wepMaterials) {
      mat.emissive.setHex(0x4a1608);
      mat.emissiveIntensity = this.attackHoldTimer > 0 ? 0.35 : 0.14;
    }

    this.scene.updateMatrixWorld(true);

    // 5. Update 3D Parashu Axe Blade Trail Ribbon (warm golden-vermilion Agni arc)
    const trailActive = this.attackHoldTimer > 0.05;
    const trailColor =
      this.activeStrikeKind === 'heavy' || this.activeStrikeKind === 'combo4'
        ? 0xff7722
        : 0xffaa33;
    this.updateWeaponTrail(dt, trailActive, trailColor);

    // 6. Render Isometric 3D Character + Axe to Offscreen Canvas
    if (!IS_SOFTWARE_WEBGL || this.elapsedTime - this.lastSoftwareRenderTime >= 0.022) {
      this.lastSoftwareRenderTime = this.elapsedTime;
      this.renderer.render(this.scene, this.camera);
    }
    return true;
  }

  private readonly scratchRotQ = new THREE.Quaternion();
  private readonly scratchEuler = new THREE.Euler();

  private applyProceduralSwingPose(
    spineYaw: number,
    spinePitch: number,
    _armSweep: number,
    _foreArmBend: number,
    _wristPitch: number
  ) {
    const rotQ = this.scratchRotQ;
    const euler = this.scratchEuler;

    // Gentle torso follow-through only — preserves natural Mixamo shoulder/elbow/wrist animations
    if (this.spine1Bone) {
      euler.set(spinePitch * 0.45, spineYaw * 0.45, 0, 'XYZ');
      rotQ.setFromEuler(euler);
      this.spine1Bone.quaternion.multiply(rotQ);
    }
    if (this.spine2Bone) {
      euler.set(spinePitch * 0.45, spineYaw * 0.5, 0, 'XYZ');
      rotQ.setFromEuler(euler);
      this.spine2Bone.quaternion.multiply(rotQ);
    }
  }

  private updateWeaponTrail(dt: number, active: boolean, colorHex: number) {
    for (let i = this.trailSamples.length - 1; i >= 0; i--) {
      this.trailSamples[i].age += dt;
      if (this.trailSamples[i].age > 0.09) {
        this.trailSamples.splice(i, 1);
      }
    }

    if (active && this.weaponObject) {
      const tipWorld = new THREE.Vector3();
      const baseWorld = new THREE.Vector3();
      this.weaponTipNode.getWorldPosition(tipWorld);
      this.weaponBaseNode.getWorldPosition(baseWorld);

      this.trailSamples.unshift({
        tip: tipWorld,
        base: baseWorld,
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
    this.trailMaterial.opacity = active ? 0.46 : 0.14;

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

  public dispose() {
    this.disposed = true;
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
    for (const m of this.charMaterials) m.dispose();
    for (const m of this.wepMaterials) m.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
