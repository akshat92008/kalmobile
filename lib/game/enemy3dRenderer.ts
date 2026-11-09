'use client';

// ============================================================================
// MERU ENGINE v3.0 — REAL-TIME 60FPS 3D ENEMY SQUADRON RENDERER + GPU T-POSE ANIMATOR
// - Loads the 5 bespoke 3D Warlord FBX models uploaded in /public/models/:
//   1) Ash-Stalker (`wolf_guai`): `Meshy_AI_Skullclad_Warlord_20261031_texture.fbx`
//      + Twin Obsidian Katar Claws
//   2) Dhanur-Preta (`fire_monk`): `Meshy_AI_Crimson_Skull_Warlord_biped_Animation_Running_withSkin.fbx`
//      + Blazing Agni Greatbow & Drawn Ember Arrow
//   3) Vetala Gada-Guard (`stone_golem`): `Meshy_AI_Horned_Warlord_of_the_Bloodforge_20261031_texture.fbx`
//      + Chola War-Drum Shield + Heavy Iron Gada Mace
//   4) Furnace Colossus (`furnace_titan`): `Meshy_AI_Molten_Warlord_20261031_texture.fbx`
//      + Two-Handed Molten Siege Greathammer
//   5) Kaliyuga Sovereign (`furnace_titan` with `vajra_shield`):
//      `Meshy_AI_Sovereign_of_the_Eternal_Wheel_20261031_texture.fbx`
// - Animates static T-Pose / A-Pose 3D Warlord meshes on the GPU via a custom
//   Skeletal Vertex Shader (`onBeforeCompile`) that lowers T-pose arms into a
//   natural warrior guard stance and drives full bipedal leg strides, arm swings,
//   torso twists, overhead attack windups, and fierce downward weapon cleaves!
// - Uses a per-enemy offscreen frame cache + staggered sequential FBX streaming
//   so main-thread frame times remain locked at 60 FPS!
// ============================================================================

import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { IS_SOFTWARE_WEBGL } from '../../engine/ue5GraphicsEngine';
import { loadFbxCached } from './meshSimplifier';
import type { EnemyTrait, Warden3DRigKey } from './assets';

export type RegularEnemy3DKind = 'wolf_guai' | 'fire_monk' | 'stone_golem' | 'furnace_titan';
type ArchetypeSlotKey = RegularEnemy3DKind | 'sovereign_titan';

export interface Enemy3DRenderParams {
  id: number;
  kind: RegularEnemy3DKind;
  wardenRigKey?: Warden3DRigKey;
  trait?: EnemyTrait;
  animTime: number;
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

interface TPoseShaderUniforms {
  uRestArmDrop: { value: number };
  uLeftArmPitch: { value: number };
  uRightArmPitch: { value: number };
  uLegStride: { value: number };
  uTorsoLean: { value: number };
  uTorsoTwist: { value: number };
  uBreath: { value: number };
}

interface Archetype3DRig {
  root: THREE.Group;
  isTPoseShaderRig: boolean;
  tPoseUniforms: TPoseShaderUniforms | null;
  baseRestArmDrop: number;
  rightHandPivot: THREE.Group | null;
  leftHandPivot: THREE.Group | null;
  mixer: THREE.AnimationMixer | null;
  idleAction: THREE.AnimationAction | null;
  runAction: THREE.AnimationAction | null;
  attackAction: THREE.AnimationAction | null;
  spine1: THREE.Object3D | null;
  spine2: THREE.Object3D | null;
  rightArm: THREE.Object3D | null;
  rightForeArm: THREE.Object3D | null;
  leftArm: THREE.Object3D | null;
  leftForeArm: THREE.Object3D | null;
  materials: THREE.MeshStandardMaterial[];
}

interface CachedEnemyFrame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  lastAnimTime: number;
  lastState: string;
  lastHitFlash: boolean;
}

export class Enemy3DRenderer {
  public readonly canvas: HTMLCanvasElement;
  public isReady = false;

  private readonly size: number;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;
  private traitPointLight: THREE.PointLight;

  private rigs: Partial<Record<ArchetypeSlotKey, Archetype3DRig>> = {};
  private perEnemyYaw: Map<number, number> = new Map();
  private perEnemyCache: Map<number, CachedEnemyFrame> = new Map();
  private activeCompositeCanvas: HTMLCanvasElement;
  private disposed = false;

  constructor(size = 320) {
    this.size = size;
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;
    this.activeCompositeCanvas = this.canvas;

    this.scene = new THREE.Scene();

    // True 2.5D Hades Dimetric (2:1) Isometric Orthographic Camera (~27° elevation)
    const halfExtent = 118;
    this.camera = new THREE.OrthographicCamera(
      -halfExtent,
      halfExtent,
      halfExtent,
      -halfExtent,
      1,
      1000
    );
    this.camera.position.set(0, 148, 285);
    this.camera.lookAt(0, 76, 0);

    const ambient = new THREE.AmbientLight(0xe4dff0, 1.9);
    this.scene.add(ambient);

    this.keyLight = new THREE.DirectionalLight(0xfff4df, 3.35);
    this.keyLight.position.set(-135, 240, 215);
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0xffc258, 2.95);
    this.rimLight.position.set(145, 195, -205);
    this.scene.add(this.rimLight);

    this.fillLight = new THREE.DirectionalLight(0x78a4d8, 1.55);
    this.fillLight.position.set(150, 75, 140);
    this.scene.add(this.fillLight);

    this.traitPointLight = new THREE.PointLight(0xff6a2b, 1.65, 250);
    this.traitPointLight.position.set(0, 88, 60);
    this.scene.add(this.traitPointLight);

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
      this.renderer.toneMappingExposure = 1.18;

      if (!IS_SOFTWARE_WEBGL) {
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
        pmremGenerator.dispose();
      }

      this.loadArchetypes();
    } catch {
      this.renderer = null;
    }
  }

  public getActiveCanvas(): HTMLCanvasElement {
    return this.activeCompositeCanvas;
  }

  /**
   * Injects a real-time 60FPS GPU Skeletal Vertex Shader into static T-pose / A-pose
   * Meshy AI Warlord meshes (`y` in [-95.15, +94.77], centered at origin).
   * - Drops outstretched T-pose arms down around the shoulder joints (`x = ±18.5, y = 44`)
   *   into an authentic martial guard stance (`uRestArmDrop`).
   * - Swings left/right arms (`uLeftArmPitch`, `uRightArmPitch`) for sprinting, bow draw,
   *   shield block, overhead windups, and weapon cleaves.
   * - Articulates left/right legs (`uLegStride`) around the hip joints (`x = ±10, y = -6`)
   *   with automatic trailing-knee flexion for smooth bipedal running.
   * - Twists and leans the upper torso (`uTorsoLean`, `uTorsoTwist`, `uBreath`).
   */
  private injectTPoseSkeletalShader(
    mat: THREE.MeshStandardMaterial,
    restArmDropRad: number
  ): TPoseShaderUniforms {
    const uniforms: TPoseShaderUniforms = {
      uRestArmDrop: { value: restArmDropRad },
      uLeftArmPitch: { value: 0 },
      uRightArmPitch: { value: 0 },
      uLegStride: { value: 0 },
      uTorsoLean: { value: 0.08 },
      uTorsoTwist: { value: 0 },
      uBreath: { value: 0 },
    };

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uRestArmDrop = uniforms.uRestArmDrop;
      shader.uniforms.uLeftArmPitch = uniforms.uLeftArmPitch;
      shader.uniforms.uRightArmPitch = uniforms.uRightArmPitch;
      shader.uniforms.uLegStride = uniforms.uLegStride;
      shader.uniforms.uTorsoLean = uniforms.uTorsoLean;
      shader.uniforms.uTorsoTwist = uniforms.uTorsoTwist;
      shader.uniforms.uBreath = uniforms.uBreath;

      shader.vertexShader =
        `
        uniform float uRestArmDrop;
        uniform float uLeftArmPitch;
        uniform float uRightArmPitch;
        uniform float uLegStride;
        uniform float uTorsoLean;
        uniform float uTorsoTwist;
        uniform float uBreath;
        ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        {
          // Local FBX coordinates: Y in [-95.15, +94.77], X in [-94, +94], Z in [-32, +32]
          float side = transformed.x >= 0.0 ? 1.0 : -1.0;
          float absX = abs(transformed.x);

          // 1. T-Pose / A-Pose Shoulder Arm Drop & Elbow Guard Bend
          // Shoulder pivot at (side * 18.5, 44.0, 0.0)
          float armMask = smoothstep(16.0, 27.0, absX) * smoothstep(6.0, 24.0, transformed.y);
          if (armMask > 0.001) {
            float sx = side * 18.5;
            float sy = 44.0;
            float dx = transformed.x - sx;
            float dy = transformed.y - sy;

            // Rotate arm downward toward waist by uRestArmDrop
            float dropAng = -side * uRestArmDrop * armMask;
            float cDrop = cos(dropAng);
            float sDrop = sin(dropAng);
            transformed.x = sx + dx * cDrop - dy * sDrop;
            transformed.y = sy + dx * sDrop + dy * cDrop;

            // Natural forearm forward guard bend (+Z) and slight inward tuck
            float forearmMask = smoothstep(38.0, 66.0, absX) * armMask;
            transformed.z += forearmMask * 14.5;
            transformed.y += forearmMask * 4.5;

            // 2. Dynamic Combat Arm Pitch (Swing forward/back around shoulder YZ plane)
            float armPitch = (side < 0.0 ? uRightArmPitch : uLeftArmPitch) * armMask;
            float dy2 = transformed.y - sy;
            float dz2 = transformed.z;
            float cPitch = cos(armPitch);
            float sPitch = sin(armPitch);
            transformed.y = sy + dy2 * cPitch - dz2 * sPitch;
            transformed.z = dy2 * sPitch + dz2 * cPitch;
          }

          // 3. Upper Torso Breathing, Combat Lean (YZ) & Spine Twist (XZ)
          float torsoMask = smoothstep(-6.0, 42.0, transformed.y);
          if (torsoMask > 0.001) {
            // Subtle ribcage breathing expansion
            float chestMask = smoothstep(10.0, 45.0, transformed.y) * (1.0 - smoothstep(55.0, 75.0, transformed.y));
            transformed.z += chestMask * uBreath * 2.4;
            transformed.y += torsoMask * uBreath * 1.6;

            // Spine Y-axis twist
            float twistAng = uTorsoTwist * torsoMask;
            float cTw = cos(twistAng);
            float sTw = sin(twistAng);
            float tx = transformed.x;
            float tz = transformed.z;
            transformed.x = tx * cTw - tz * sTw;
            transformed.z = tx * sTw + tz * cTw;

            // Waist forward/backward lean around hip pivot Y = -4.0
            float leanAng = uTorsoLean * torsoMask;
            float cLn = cos(leanAng);
            float sLn = sin(leanAng);
            float ty = transformed.y - (-4.0);
            float tz2 = transformed.z;
            transformed.y = -4.0 + ty * cLn - tz2 * sLn;
            transformed.z = ty * sLn + tz2 * cLn;
          }

          // 4. Bipedal Leg Stride & Knee Flexion (below hip pivot Y = -6.0)
          float legMask = smoothstep(-4.0, -20.0, transformed.y) * smoothstep(1.2, 6.5, absX);
          if (legMask > 0.001) {
            float hipY = -6.0;
            float legAng = side * uLegStride * legMask;
            float ly = transformed.y - hipY;
            float lz = transformed.z;
            float cLg = cos(legAng);
            float sLg = sin(legAng);
            transformed.y = hipY + ly * cLg - lz * sLg;
            transformed.z = ly * sLg + lz * cLg;

            // Bend knee backward (-Z) and lift foot (+Y) when calf swings back
            float calfMask = smoothstep(-42.0, -72.0, transformed.y) * legMask;
            float kneeFlex = max(0.0, -side * uLegStride);
            transformed.z -= calfMask * kneeFlex * 16.0;
            transformed.y += calfMask * abs(uLegStride) * 9.5;
          }
        }
        `
      );
    };
    mat.needsUpdate = true;
    return uniforms;
  }

  /**
   * Builds composite multi-part 3D weapons & shields for each Act I enemy archetype
   * following the v7 Game Design Document (Section 9).
   */
  private attachArchetype3DWeapons(
    kind: RegularEnemy3DKind,
    rightHand: THREE.Object3D | null,
    leftForeArm: THREE.Object3D | null,
    unitScale = 1.0
  ): THREE.MeshStandardMaterial[] {
    const mats: THREE.MeshStandardMaterial[] = [];

    const darkIronMat = new THREE.MeshStandardMaterial({
      color: 0x3b3d46,
      roughness: 0.34,
      metalness: 0.88,
      envMapIntensity: 1.65,
    });
    const cholaBronzeMat = new THREE.MeshStandardMaterial({
      color: 0xd8a248,
      roughness: 0.28,
      metalness: 0.92,
      envMapIntensity: 1.75,
      emissive: new THREE.Color(0x281404),
      emissiveIntensity: 0.16,
    });
    const agniEmberMat = new THREE.MeshStandardMaterial({
      color: 0xff5a1f,
      roughness: 0.22,
      metalness: 0.2,
      emissive: new THREE.Color(0xff4214),
      emissiveIntensity: 1.85,
    });
    mats.push(darkIronMat, cholaBronzeMat, agniEmberMat);

    if (kind === 'wolf_guai') {
      // Ash-Stalker: Twin Curved Obsidian Katar Claws on right hand
      if (rightHand) {
        const holder = new THREE.Group();
        holder.scale.setScalar(unitScale);
        const guardGeo = new THREE.BoxGeometry(0.14, 0.06, 0.12);
        const guard = new THREE.Mesh(guardGeo, cholaBronzeMat);
        holder.add(guard);

        const bladeGeo = new THREE.ConeGeometry(0.04, 0.58, 6);
        bladeGeo.rotateX(Math.PI / 2);
        for (const offset of [-0.045, 0.045]) {
          const blade = new THREE.Mesh(bladeGeo, darkIronMat);
          blade.position.set(offset, 0, 0.29);
          holder.add(blade);
        }
        holder.position.set(0, 0.06 * unitScale, 0.02 * unitScale);
        holder.rotation.set(0, Math.PI / 2, 0.25);
        rightHand.add(holder);
      }
    } else if (kind === 'fire_monk') {
      // Dhanur-Preta Bowman: Blazing Agni Greatbow on left arm + drawn ember arrow
      if (leftForeArm) {
        const bowGroup = new THREE.Group();
        bowGroup.scale.setScalar(unitScale);
        const arcGeo = new THREE.TorusGeometry(0.48, 0.03, 8, 20, Math.PI * 1.15);
        const bowArc = new THREE.Mesh(arcGeo, cholaBronzeMat);
        bowArc.rotation.z = -Math.PI * 0.57;
        bowGroup.add(bowArc);

        const arrowShaftGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.74, 6);
        arrowShaftGeo.rotateZ(Math.PI / 2);
        const arrowShaft = new THREE.Mesh(arrowShaftGeo, darkIronMat);
        arrowShaft.position.set(0.18, 0, 0);
        bowGroup.add(arrowShaft);

        const arrowHeadGeo = new THREE.ConeGeometry(0.045, 0.17, 6);
        arrowHeadGeo.rotateZ(-Math.PI / 2);
        const arrowHead = new THREE.Mesh(arrowHeadGeo, agniEmberMat);
        arrowHead.position.set(0.56, 0, 0);
        bowGroup.add(arrowHead);

        bowGroup.position.set(0, 0.12 * unitScale, 0.08 * unitScale);
        leftForeArm.add(bowGroup);
      }
    } else if (kind === 'stone_golem') {
      // Vetala Gada-Guard: War-Drum Stamped Bronze Shield on Left Forearm + Heavy Iron Mace on Right Hand
      if (leftForeArm) {
        const shieldGroup = new THREE.Group();
        shieldGroup.scale.setScalar(unitScale);
        const discGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.048, 18);
        discGeo.rotateX(Math.PI / 2);
        const disc = new THREE.Mesh(discGeo, darkIronMat);
        shieldGroup.add(disc);

        const rimGeo = new THREE.TorusGeometry(0.33, 0.034, 10, 22);
        const rim = new THREE.Mesh(rimGeo, cholaBronzeMat);
        rim.position.set(0, 0, 0.026);
        shieldGroup.add(rim);

        const spiralRingGeo = new THREE.TorusGeometry(0.155, 0.024, 8, 18);
        const spiralRing = new THREE.Mesh(spiralRingGeo, cholaBronzeMat);
        spiralRing.position.set(0, 0, 0.034);
        shieldGroup.add(spiralRing);

        shieldGroup.position.set(0, 0.14 * unitScale, 0.14 * unitScale);
        leftForeArm.add(shieldGroup);
      }
      if (rightHand) {
        const maceGroup = new THREE.Group();
        maceGroup.scale.setScalar(unitScale);
        const shaftGeo = new THREE.CylinderGeometry(0.028, 0.034, 0.82, 8);
        shaftGeo.rotateX(Math.PI / 2);
        const shaft = new THREE.Mesh(shaftGeo, darkIronMat);
        shaft.position.set(0, 0, 0.24);
        maceGroup.add(shaft);

        const headGeo = new THREE.DodecahedronGeometry(0.15, 0);
        const head = new THREE.Mesh(headGeo, cholaBronzeMat);
        head.position.set(0, 0, 0.58);
        maceGroup.add(head);

        maceGroup.position.set(0, 0.07 * unitScale, 0.01 * unitScale);
        maceGroup.rotation.set(0, Math.PI / 2, 0.28);
        rightHand.add(maceGroup);
      }
    } else if (kind === 'furnace_titan') {
      // Furnace Colossus: Two-Handed Molten Siege Greathammer
      if (rightHand) {
        const hammerGroup = new THREE.Group();
        hammerGroup.scale.setScalar(unitScale);
        const shaftGeo = new THREE.CylinderGeometry(0.034, 0.04, 0.98, 10);
        shaftGeo.rotateX(Math.PI / 2);
        const shaft = new THREE.Mesh(shaftGeo, darkIronMat);
        shaft.position.set(0, 0, 0.28);
        hammerGroup.add(shaft);

        const blockGeo = new THREE.BoxGeometry(0.29, 0.44, 0.25);
        const block = new THREE.Mesh(blockGeo, darkIronMat);
        block.position.set(0, 0, 0.68);
        hammerGroup.add(block);

        const coreGeo = new THREE.CylinderGeometry(0.115, 0.115, 0.48, 10);
        const core = new THREE.Mesh(coreGeo, agniEmberMat);
        core.position.set(0, 0, 0.68);
        hammerGroup.add(core);

        hammerGroup.position.set(0, 0.075 * unitScale, 0.01 * unitScale);
        hammerGroup.rotation.set(0, Math.PI / 2, 0.28);
        rightHand.add(hammerGroup);
      }
    }

    return mats;
  }

  private makeInPlaceClip(sourceClip: THREE.AnimationClip): THREE.AnimationClip {
    const clip = sourceClip.clone();
    for (const track of clip.tracks) {
      if (track.name.endsWith('.scale')) continue;
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
          values[i] = (values[i] - baseX) * 0.04;
          values[i + 2] = (values[i + 2] - baseZ) * 0.04;
          values[i + 1] = Math.max(0.56, baseY + (values[i + 1] - baseY) * 0.5);
        }
      }
    }
    return clip;
  }

  private replaceSlotRig(slot: ArchetypeSlotKey, nextRig: Archetype3DRig): void {
    const prev = this.rigs[slot];
    if (prev) {
      this.scene.remove(prev.root);
    }
    this.rigs[slot] = nextRig;
    this.perEnemyCache.clear();
    this.isReady = true;
  }

  /**
   * Builds a GPU-Animated 3D Warlord Rig from one of the static T-Pose / A-Pose `.fbx` models
   * (`Skullclad_Warlord`, `Horned_Warlord_of_the_Bloodforge`, `Molten_Warlord`, `Sovereign_of_the_Eternal_Wheel`).
   */
  private buildTPoseWarlordRig(
    kind: RegularEnemy3DKind,
    fbxGroup: THREE.Group,
    albedo: THREE.Texture | null,
    normal: THREE.Texture | null,
    rough: THREE.Texture | null,
    metal: THREE.Texture | null,
    scaleVec: [number, number, number],
    restArmDropRad: number
  ): Archetype3DRig {
    const bodyMat = new THREE.MeshStandardMaterial({
      map: albedo,
      normalMap: normal,
      normalScale: new THREE.Vector2(1.25, 1.25),
      roughnessMap: rough,
      metalnessMap: metal,
      color: new THREE.Color(0xffffff),
      roughness: rough ? 0.60 : 0.52,
      metalness: metal ? 0.46 : 0.35,
      envMapIntensity: 1.42,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
    });

    const tPoseUniforms = this.injectTPoseSkeletalShader(bodyMat, restArmDropRad);

    // Measure local bounding box so feet sit cleanly on y = 0
    const box = new THREE.Box3().setFromObject(fbxGroup);
    const minY = Number.isFinite(box.min.y) ? box.min.y : -95.15;

    fbxGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.material = bodyMat;
        m.frustumCulled = false;
      }
    });

    // Shift mesh up so feet rest on y = 0 in root space (total height ~190 units)
    fbxGroup.position.set(0, -minY * scaleVec[1], 0);
    fbxGroup.scale.set(scaleVec[0], scaleVec[1], scaleVec[2]);

    // Shoulder-mounted weapon/shield pivot groups that track uRightArmPitch & uLeftArmPitch
    const rightShoulderPivot = new THREE.Group();
    rightShoulderPivot.position.set(-22 * scaleVec[0], 136 * scaleVec[1], 6 * scaleVec[2]);
    const rightHandMount = new THREE.Group();
    rightHandMount.position.set(-4 * scaleVec[0], -38 * scaleVec[1], 22 * scaleVec[2]);
    rightShoulderPivot.add(rightHandMount);

    const leftShoulderPivot = new THREE.Group();
    leftShoulderPivot.position.set(22 * scaleVec[0], 136 * scaleVec[1], 6 * scaleVec[2]);
    const leftHandMount = new THREE.Group();
    leftHandMount.position.set(4 * scaleVec[0], -34 * scaleVec[1], 24 * scaleVec[2]);
    leftShoulderPivot.add(leftHandMount);

    const wepMats = this.attachArchetype3DWeapons(kind, rightHandMount, leftHandMount, 78);

    const root = new THREE.Group();
    root.visible = false;
    root.add(fbxGroup);
    root.add(rightShoulderPivot);
    root.add(leftShoulderPivot);
    this.scene.add(root);

    return {
      root,
      isTPoseShaderRig: true,
      tPoseUniforms,
      baseRestArmDrop: restArmDropRad,
      rightHandPivot: rightShoulderPivot,
      leftHandPivot: leftShoulderPivot,
      mixer: null,
      idleAction: null,
      runAction: null,
      attackAction: null,
      spine1: null,
      spine2: null,
      rightArm: null,
      rightForeArm: null,
      leftArm: null,
      leftForeArm: null,
      materials: [bodyMat, ...wepMats],
    };
  }

  /**
   * Builds a Skeletal SkinnedMesh Rig (used for `Crimson_Skull_Warlord_biped`).
   * Note: Meshy Biped FBX models already have an internal `Armature` with `scale = 100`,
   * so `charGroup.scale` MUST remain ~1.0 (just like Rudra and Vrikodara).
   */
  private buildSkinnedWarlordRig(
    kind: RegularEnemy3DKind,
    sourceFbx: THREE.Group,
    clips: THREE.AnimationClip[],
    albedo: THREE.Texture | null,
    normal: THREE.Texture | null,
    rough: THREE.Texture | null,
    metal: THREE.Texture | null,
    scaleVec: [number, number, number],
    cloneMesh = false
  ): Archetype3DRig {
    const charGroup = cloneMesh ? (SkeletonUtils.clone(sourceFbx) as THREE.Group) : sourceFbx;
    charGroup.scale.set(scaleVec[0], scaleVec[1], scaleVec[2]);
    charGroup.position.set(0, 0, 0);

    const bodyMat = new THREE.MeshStandardMaterial({
      map: albedo,
      normalMap: normal,
      normalScale: new THREE.Vector2(1.25, 1.25),
      roughnessMap: rough,
      metalnessMap: metal,
      color: new THREE.Color(0xffffff),
      roughness: rough ? 0.60 : 0.52,
      metalness: metal ? 0.46 : 0.35,
      envMapIntensity: 1.42,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
    });

    charGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.material = bodyMat;
        m.frustumCulled = false;
      }
    });

    const spine1 = charGroup.getObjectByName('mixamorigSpine1') || charGroup.getObjectByName('Spine1') || null;
    const spine2 = charGroup.getObjectByName('mixamorigSpine2') || charGroup.getObjectByName('Spine2') || null;
    const rightArm = charGroup.getObjectByName('mixamorigRightArm') || charGroup.getObjectByName('RightArm') || null;
    const rightForeArm =
      charGroup.getObjectByName('mixamorigRightForeArm') || charGroup.getObjectByName('RightForeArm') || null;
    const rightHand = charGroup.getObjectByName('mixamorigRightHand') || charGroup.getObjectByName('RightHand') || null;
    const leftArm = charGroup.getObjectByName('mixamorigLeftArm') || charGroup.getObjectByName('LeftArm') || null;
    const leftForeArm =
      charGroup.getObjectByName('mixamorigLeftForeArm') || charGroup.getObjectByName('LeftForeArm') || null;

    const wepMats = this.attachArchetype3DWeapons(kind, rightHand, leftForeArm, 1.0);

    const root = new THREE.Group();
    root.visible = false;
    root.add(charGroup);
    this.scene.add(root);

    const inPlaceClips = clips.map((c) => this.makeInPlaceClip(c));
    const findClip = (name: string) =>
      inPlaceClips.find((c) => c.name.toLowerCase().includes(name.toLowerCase())) || inPlaceClips[0];

    const idleClip = findClip('Walking') || findClip('Casual_Walk') || inPlaceClips[0];
    const runClip = findClip('Running') || findClip('Run') || idleClip;
    const attackClip = findClip('Attack') || findClip('Skill_01') || runClip;

    const mixer = new THREE.AnimationMixer(charGroup);
    const idleAction = idleClip ? mixer.clipAction(idleClip) : null;
    const runAction = runClip ? mixer.clipAction(runClip) : null;
    const attackAction = attackClip ? mixer.clipAction(attackClip) : null;

    if (idleAction) idleAction.play();

    return {
      root,
      isTPoseShaderRig: false,
      tPoseUniforms: null,
      baseRestArmDrop: 0,
      rightHandPivot: null,
      leftHandPivot: null,
      mixer,
      idleAction,
      runAction,
      attackAction,
      spine1,
      spine2,
      rightArm,
      rightForeArm,
      leftArm,
      leftForeArm,
      materials: [bodyMat, ...wepMats],
    };
  }

  private async loadArchetypes(): Promise<void> {
    const texLoader = new THREE.TextureLoader();

    const loadFbx = (url: string, shared = false) => loadFbxCached(url, shared);

    const loadTex = (url: string, isColor = false) => {
      if (IS_SOFTWARE_WEBGL && !isColor) {
        return Promise.resolve<THREE.Texture | null>(null);
      }
      return new Promise<THREE.Texture | null>((resolve) => {
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
    };

    const skullcladBase = '/models/Meshy_AI_Skullclad_Warlord_20261031_texture_fbx';
    const crimsonSkullBase = '/models/Meshy_AI_Crimson_Skull_Warlord_biped';
    const hornedBloodforgeBase =
      '/models/Meshy_AI_Horned_Warlord_of_the_Bloodforge_20261031_texture_fbx';
    const moltenWarlordBase = '/models/Meshy_AI_Molten_Warlord_20261031_texture_fbx';
    const sovereignWheelBase =
      '/models/Meshy_AI_Sovereign_of_the_Eternal_Wheel_20261031_texture_fbx';
    const rudraMergedUrl =
      '/models/Meshy_AI_Ashen_Warborn_biped/Meshy_AI_Ashen_Warborn_biped_Meshy_Merged_Animations.fbx';

    try {
      const [
        skullcladFbx,
        skullcladAlbedo,
        skullcladNorm,
        skullcladRough,
        skullcladMet,
        crimsonAlbedo,
        crimsonNorm,
        crimsonRough,
        crimsonMet,
        hornedAlbedo,
        hornedNorm,
        hornedRough,
        hornedMet,
        moltenAlbedo,
        moltenNorm,
        moltenRough,
        moltenMet,
        sovereignAlbedo,
        sovereignNorm,
        sovereignRough,
        sovereignMet,
      ] = await Promise.all([
        loadFbx(`${skullcladBase}/Meshy_AI_Skullclad_Warlord_20261031_texture.fbx`),
        loadTex(`${skullcladBase}/Meshy_AI_Skullclad_Warlord_20261031_texture.png`, true),
        loadTex(`${skullcladBase}/Meshy_AI_Skullclad_Warlord_20261031_texture_normal.png`, false),
        loadTex(`${skullcladBase}/Meshy_AI_Skullclad_Warlord_20261031_texture_roughness.png`, false),
        loadTex(`${skullcladBase}/Meshy_AI_Skullclad_Warlord_20261031_texture_metallic.png`, false),
        loadTex(`${crimsonSkullBase}/Meshy_AI_Crimson_Skull_Warlord_biped_texture_0.png`, true),
        loadTex(`${crimsonSkullBase}/Meshy_AI_Crimson_Skull_Warlord_biped_normal.png`, false),
        loadTex(`${crimsonSkullBase}/Meshy_AI_Crimson_Skull_Warlord_biped_roughness.png`, false),
        loadTex(`${crimsonSkullBase}/Meshy_AI_Crimson_Skull_Warlord_biped_metallic.png`, false),
        loadTex(`${hornedBloodforgeBase}/Meshy_AI_Horned_Warlord_of_the_Bloodforge_20261031_texture.png`, true),
        loadTex(`${hornedBloodforgeBase}/Meshy_AI_Horned_Warlord_of_the_Bloodforge_20261031_texture_normal.png`, false),
        loadTex(`${hornedBloodforgeBase}/Meshy_AI_Horned_Warlord_of_the_Bloodforge_20261031_texture_roughness.png`, false),
        loadTex(`${hornedBloodforgeBase}/Meshy_AI_Horned_Warlord_of_the_Bloodforge_20261031_texture_metallic.png`, false),
        loadTex(`${moltenWarlordBase}/Meshy_AI_Molten_Warlord_20261031_texture.png`, true),
        loadTex(`${moltenWarlordBase}/Meshy_AI_Molten_Warlord_20261031_texture_normal.png`, false),
        loadTex(`${moltenWarlordBase}/Meshy_AI_Molten_Warlord_20261031_texture_roughness.png`, false),
        loadTex(`${moltenWarlordBase}/Meshy_AI_Molten_Warlord_20261031_texture_metallic.png`, false),
        loadTex(`${sovereignWheelBase}/Meshy_AI_Sovereign_of_the_Eternal_Wheel_20261031_texture.png`, true),
        loadTex(`${sovereignWheelBase}/Meshy_AI_Sovereign_of_the_Eternal_Wheel_20261031_texture_normal.png`, false),
        loadTex(`${sovereignWheelBase}/Meshy_AI_Sovereign_of_the_Eternal_Wheel_20261031_texture_roughness.png`, false),
        loadTex(`${sovereignWheelBase}/Meshy_AI_Sovereign_of_the_Eternal_Wheel_20261031_texture_metallic.png`, false),
      ]);

      if (this.disposed) return;

      // Stage 1: Build Skullclad Warlord with its OWN matching UV textures (never apply mismatched UV textures from other models!)
      this.replaceSlotRig(
        'wolf_guai',
        this.buildTPoseWarlordRig(
          'wolf_guai',
          skullcladFbx,
          skullcladAlbedo,
          skullcladNorm,
          skullcladRough,
          skullcladMet,
          [0.95, 0.92, 0.95],
          0.56
        )
      );

      // Stage 2: Load each bespoke Warlord FBX with its own matching UV textures & animations
      const streamQueue: Array<() => Promise<void>> = [
        async () => {
          const [fbx, rudraFbx] = await Promise.all([
            loadFbx(
              `${crimsonSkullBase}/Meshy_AI_Crimson_Skull_Warlord_biped_Animation_Running_withSkin.fbx`
            ),
            loadFbx(rudraMergedUrl),
          ]);
          if (this.disposed) return;
          const combinedClips = [...(fbx.animations || []), ...(rudraFbx.animations || [])];
          this.replaceSlotRig(
            'fire_monk',
            this.buildSkinnedWarlordRig(
              'fire_monk',
              fbx,
              combinedClips,
              crimsonAlbedo,
              crimsonNorm,
              crimsonRough,
              crimsonMet,
              [0.98, 0.98, 0.98],
              false
            )
          );
        },
        async () => {
          const fbx = await loadFbx(
            `${hornedBloodforgeBase}/Meshy_AI_Horned_Warlord_of_the_Bloodforge_20261031_texture.fbx`
          );
          if (this.disposed) return;
          this.replaceSlotRig(
            'stone_golem',
            this.buildTPoseWarlordRig(
              'stone_golem',
              fbx,
              hornedAlbedo,
              hornedNorm,
              hornedRough,
              hornedMet,
              [1.02, 0.98, 1.02],
              0.92
            )
          );
        },
        async () => {
          const fbx = await loadFbx(
            `${moltenWarlordBase}/Meshy_AI_Molten_Warlord_20261031_texture.fbx`
          );
          if (this.disposed) return;
          this.replaceSlotRig(
            'furnace_titan',
            this.buildTPoseWarlordRig(
              'furnace_titan',
              fbx,
              moltenAlbedo,
              moltenNorm,
              moltenRough,
              moltenMet,
              [1.08, 1.04, 1.08],
              0.94
            )
          );
        },
        async () => {
          const fbx = await loadFbx(
            `${sovereignWheelBase}/Meshy_AI_Sovereign_of_the_Eternal_Wheel_20261031_texture.fbx`
          );
          if (this.disposed) return;
          this.replaceSlotRig(
            'sovereign_titan',
            this.buildTPoseWarlordRig(
              'furnace_titan',
              fbx,
              sovereignAlbedo,
              sovereignNorm,
              sovereignRough,
              sovereignMet,
              [1.1, 1.06, 1.1],
              0.48
            )
          );
        },
      ];

      for (const task of streamQueue) {
        if (this.disposed) break;
        await new Promise((r) => setTimeout(r, 120));
        try {
          await task();
        } catch {
          // Ignore individual model errors
        }
      }
    } catch {
      this.isReady = false;
    }
  }

  public renderEnemy(params: Enemy3DRenderParams): boolean {
    if (!this.isReady || !this.renderer) return false;

    const slotKey: ArchetypeSlotKey = params.wardenRigKey
      ? params.wardenRigKey
      : params.kind === 'furnace_titan' && params.trait === 'vajra_shield'
      ? 'sovereign_titan'
      : params.kind;

    const rig = this.rigs[slotKey];
    if (!rig) return false;

    // Check per-enemy frame cache (throttles WebGL re-renders to ~30fps per enemy while compositing at 60fps)
    let cacheEntry = this.perEnemyCache.get(params.id);
    if (!cacheEntry) {
      const c = document.createElement('canvas');
      c.width = this.size;
      c.height = this.size;
      const ctx = c.getContext('2d');
      if (ctx) {
        cacheEntry = {
          canvas: c,
          ctx,
          lastAnimTime: -999,
          lastState: '',
          lastHitFlash: false,
        };
        this.perEnemyCache.set(params.id, cacheEntry);
      }
    }

    const minFrameDelta = IS_SOFTWARE_WEBGL ? 0.065 : rig.isTPoseShaderRig ? 0.028 : 0.022;
    if (
      cacheEntry &&
      Math.abs(params.animTime - cacheEntry.lastAnimTime) < minFrameDelta &&
      params.aiState === cacheEntry.lastState &&
      params.isHitFlash === cacheEntry.lastHitFlash
    ) {
      this.activeCompositeCanvas = cacheEntry.canvas;
      return true;
    }

    // Hide all other archetype roots
    (Object.keys(this.rigs) as ArchetypeSlotKey[]).forEach((k) => {
      const r = this.rigs[k];
      if (r) r.root.visible = r === rig;
    });

    // Smooth per-enemy 360-degree isometric yaw tracking
    const targetYaw = Math.PI * 0.5 - params.aimAngle;
    const prevYaw = this.perEnemyYaw.get(params.id) ?? targetYaw;
    let diff = targetYaw - prevYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const nextYaw = prevYaw + diff * 0.25;
    this.perEnemyYaw.set(params.id, nextYaw);
    rig.root.rotation.set(0, nextYaw, 0);

    const speed = Math.hypot(params.vx, params.vy);
    const isMoving = speed > 14 || params.aiState === 'chase';

    if (rig.isTPoseShaderRig && rig.tPoseUniforms) {
      // ======================================================================
      // 60FPS GPU SKELETAL ANIMATION FOR STATIC T-POSE / A-POSE WARLORD MESHES
      // ======================================================================
      const u = rig.tPoseUniforms;
      const t = params.animTime;
      const runFreq = params.kind === 'wolf_guai' ? 10.5 : params.kind === 'stone_golem' ? 7.8 : 6.8;
      const phase = t * runFreq + (params.id % 7) * 0.9;

      let restDrop = rig.baseRestArmDrop;
      let leftPitch = Math.sin(t * 2.6) * 0.08;
      let rightPitch = -Math.sin(t * 2.6) * 0.08;
      let legStride = 0;
      let torsoLean = params.kind === 'wolf_guai' ? 0.22 : 0.09;
      let torsoTwist = Math.sin(t * 1.9) * 0.05;
      const breath = Math.sin(t * 3.2);
      let rootBobY = 0;

      if (params.isPostureBroken) {
        torsoLean = 0.42;
        torsoTwist = Math.sin(t * 6.0) * 0.14;
        leftPitch = 0.35;
        rightPitch = 0.35;
        restDrop = rig.baseRestArmDrop + 0.18;
        rootBobY = -6;
      } else if (params.aiState === 'windup') {
        const wp = Math.min(1, Math.max(0, params.windupProgress));
        rightPitch = -1.38 * wp;
        leftPitch = 0.42 * wp;
        restDrop = rig.baseRestArmDrop * (1 - wp * 0.35);
        torsoLean = -0.24 * wp;
        torsoTwist = 0.38 * wp;
        legStride = -0.32 * wp;
        rootBobY = wp * 4;
      } else if (params.aiState === 'attack') {
        rightPitch = 1.18;
        leftPitch = -0.52;
        restDrop = rig.baseRestArmDrop + 0.12;
        torsoLean = 0.38;
        torsoTwist = -0.44;
        legStride = 0.48;
        rootBobY = -4;
      } else if (isMoving) {
        const strideAmp = params.kind === 'wolf_guai' ? 0.68 : 0.54;
        legStride = Math.sin(phase) * strideAmp;
        rightPitch = -Math.sin(phase) * (strideAmp * 0.95);
        leftPitch = Math.sin(phase) * (strideAmp * 0.85);
        torsoTwist = Math.sin(phase) * 0.22;
        torsoLean = (params.kind === 'wolf_guai' ? 0.28 : 0.16) + Math.abs(Math.sin(phase)) * 0.06;
        rootBobY = Math.abs(Math.sin(phase)) * 6.5;
      } else {
        legStride = Math.sin(t * 1.8) * 0.06;
        rootBobY = Math.sin(t * 3.2) * 2.2;
      }

      if (params.isParrying) {
        leftPitch = -0.78;
        torsoTwist = -0.22;
      }

      u.uRestArmDrop.value = restDrop;
      u.uLeftArmPitch.value = leftPitch;
      u.uRightArmPitch.value = rightPitch;
      u.uLegStride.value = legStride;
      u.uTorsoLean.value = torsoLean;
      u.uTorsoTwist.value = torsoTwist;
      u.uBreath.value = breath;
      rig.root.position.y = rootBobY;

      if (rig.rightHandPivot) {
        rig.rightHandPivot.rotation.set(rightPitch + torsoLean * 0.6, torsoTwist, 0);
      }
      if (rig.leftHandPivot) {
        rig.leftHandPivot.rotation.set(leftPitch + torsoLean * 0.6, torsoTwist, 0);
      }
    } else if (rig.mixer) {
      rig.root.position.y = 0;
      rig.idleAction?.stop();
      rig.runAction?.stop();
      rig.attackAction?.stop();

      if (params.aiState === 'attack' || params.aiState === 'windup') {
        if (rig.attackAction) {
          rig.attackAction.play();
          const clipDur = rig.attackAction.getClip().duration || 1.0;
          const sampleT =
            params.aiState === 'windup'
              ? params.windupProgress * 0.38 * clipDur
              : (0.42 + (params.animTime % 0.35)) * clipDur;
          rig.mixer.setTime(sampleT);
        }
      } else if (isMoving) {
        if (rig.runAction) {
          rig.runAction.play();
          const clipDur = rig.runAction.getClip().duration || 0.8;
          rig.mixer.setTime((params.animTime * 1.15) % clipDur);
        }
      } else {
        if (rig.idleAction) {
          rig.idleAction.play();
          const clipDur = rig.idleAction.getClip().duration || 1.2;
          rig.mixer.setTime((params.animTime * 0.38) % clipDur);
        }
      }

      if (rig.spine1) {
        if (params.isPostureBroken) {
          rig.spine1.rotation.x += 0.42;
        } else if (params.aiState === 'windup') {
          rig.spine1.rotation.x -= 0.28 * params.windupProgress;
          rig.spine1.rotation.y += 0.36 * params.windupProgress;
        } else if (params.aiState === 'attack') {
          rig.spine1.rotation.x += 0.36;
          rig.spine1.rotation.y -= 0.42;
        } else if (params.kind === 'wolf_guai') {
          rig.spine1.rotation.x += 0.24;
        }
      }

      if (params.isParrying && rig.leftArm) {
        rig.leftArm.rotation.x -= 0.52;
        rig.leftArm.rotation.z += 0.34;
      }
    }

    if (params.trait === 'vajra_shield') {
      this.traitPointLight.color.setHex(0x5ce6ff);
      this.traitPointLight.intensity = 2.3;
    } else if (params.trait === 'agni_aura' || params.kind === 'furnace_titan') {
      this.traitPointLight.color.setHex(0xff6a2b);
      this.traitPointLight.intensity = 2.4;
    } else if (params.trait === 'rakshasa_frenzy') {
      this.traitPointLight.color.setHex(0xd946ef);
      this.traitPointLight.intensity = 2.2;
    } else {
      this.traitPointLight.color.setHex(0xffb44c);
      this.traitPointLight.intensity = 1.15;
    }

    for (const mat of rig.materials) {
      if (params.isHitFlash) {
        mat.emissive.setHex(0xffffff);
        mat.emissiveIntensity = 0.85;
      } else if (params.aiState === 'windup') {
        mat.emissive.setHex(0xff3b1f);
        mat.emissiveIntensity = 0.22 + params.windupProgress * 0.36;
      } else {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0.0;
      }
    }

    this.renderer.render(this.scene, this.camera);

    if (cacheEntry) {
      cacheEntry.ctx.clearRect(0, 0, this.size, this.size);
      cacheEntry.ctx.drawImage(this.canvas, 0, 0);
      cacheEntry.lastAnimTime = params.animTime;
      cacheEntry.lastState = params.aiState;
      cacheEntry.lastHitFlash = params.isHitFlash;
      this.activeCompositeCanvas = cacheEntry.canvas;
    } else {
      this.activeCompositeCanvas = this.canvas;
    }

    return true;
  }

  public dispose(): void {
    this.disposed = true;
    this.perEnemyCache.clear();
    this.renderer?.dispose();
    this.renderer = null;
  }
}
