'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  CHAMBERS,
  GAME_ASSETS,
  ChamberSpec,
  PropType,
  EnemyTrait,
  Warden3DRigKey,
} from '@/lib/game/assets';
import {
  INITIAL_SHRINE_RANKS,
  INITIAL_ASHEN_KARMA,
  ShrineRanks,
  StaffStance,
  WeaponId,
  UpgradeId,
  STANCE_CONFIGS,
  WEAPON_CONFIGS,
  computeDerivedPlayerStats,
  calculateLightHitDamage,
  calculateStanceHeavyDamage,
  getNextStaffStance,
  computeBossPhase,
  applyPostureDamage,
  purchaseShrineUpgrade,
  isPointInConeTelegraph,
  isPointInDashCorridor,
  isPointInShockwaveRing,
  consumeDashStamina,
  computeSmartEnemyWindup,
  computeSmartEnemyRecovery,
  computePredictiveAimLead,
  computeAgniDashVelocityMultiplier,
  computeVirtualJoystickVector,
  computeGodOfWarHeavyStyleSpec,
} from '@/lib/game/rules';
import { soundEngine } from '@/lib/game/audio';
import {
  loadAndProcessSprite,
  getProcessedSpriteSync,
  ProcessedSpriteAsset,
  getMultiRowFrameBounds,
  isMultiRowSpriteUrl,
  SpriteFrameBounds,
} from '@/lib/game/spriteProcessor';
import { Rudra3DRenderer } from '@/lib/game/rudra3dRenderer';
import { Boss3DRenderer } from '@/lib/game/boss3dRenderer';
import { Enemy3DRenderer, RegularEnemy3DKind } from '@/lib/game/enemy3dRenderer';
import { TitleScreen } from './TitleScreen';
import KeepersShrineModal from './KeepersShrineModal';
import StoryCodexModal from './StoryCodexModal';
import OutcomeModal from './OutcomeModal';
import BoonModal from './BoonModal';
import MobileControls, { MobileControlsCallbacks } from './MobileControls';
import { NarrativeOverlay } from './NarrativeOverlay';
import { PartyCommandModal, ModernGameSettings } from './PartyCommandModal';
import { SacredChakraController } from './SacredChakraController';
import {
  MudraButtonId,
  MudraComboSpec,
  MudraInputStep,
  MUDRA_COMBO_WINDOW_MS,
  computeNextMudraHints,
  evaluateMudraButtonPress,
} from '@/lib/game/mobileComboEngine';
import {
  COMPANION_SPECS,
  CompanionBondRanks,
  CompanionId,
  EquippedGearMap,
  GearSlot,
  GearUpgradeLevels,
  INITIAL_COMPANION_BONDS,
  INITIAL_EQUIPPED_GEAR,
  INITIAL_GEAR_LEVELS,
  INITIAL_QUEST_STATE,
  PartyTacticMode,
  QUEST_SPECS,
  QuestId,
  QuestStateMap,
  claimQuestReward,
  computeCompanionStats,
  computeEquippedGearBonuses,
  computePartyPassiveBonuses,
  computePlayerLevelFromXp,
  getNextPartyTacticMode,
  incrementQuestMetric,
  selectCompanionTarget,
  upgradeCompanionBond,
  upgradeGearItem,
} from '@/lib/game/partySystem';
import {
  CombatStyleStatus,
  TemporalSnapshot,
  computeCombatStyleStatus,
  computeKalaRewindState,
  evaluateParryImpact,
  evaluateSeeThroughOrRiposte,
  planShadowAssassination,
  pushTemporalSnapshot,
} from '@/lib/game/modernCombat';
import {
  BattleScarDecal,
  computeWeaponSlashRibbon,
  computeWeaponTipGlintPosition,
  drawGrounded3DContactShadow,
  renderBattleScarsOnFloor,
  renderWeaponBoneSlashRibbon,
  renderWeaponTipStarburstGlint,
  spawnBattleScar,
  updateBattleScars,
} from '@/lib/game/visualCohesion';
import {
  BossCounterplayKind,
  SonicDrumZone,
  computeBossVulnerabilityMultiplier,
  evaluateMoltenSlagHazard,
  findBaitablePillarOnTrajectory,
  renderBossArenaHazards,
  selectBossSignatureMove,
} from '@/lib/game/bossEncounters';
import {
  ParticleArchetype,
  SimParticleNode,
  createParticlePool,
  emitParticleBurst,
  renderParticlePoolCanvas,
  stepParticleSimulation,
} from '@/lib/game/particleAndAudioEngine';
import {
  CalamityOathId,
  INITIAL_WEAPON_ASPECT_RANKS,
  WeaponAspectRanks,
  computeCalamityPactModifiers,
  computeRelicSetResonance,
  computeWeaponAspectBonuses,
  findChamberLookArtifactState,
  upgradeWeaponAspectRank,
} from '@/lib/game/pillars4And5Engine';
import {
  getLanternLightState,
  INITIAL_STORY_FLAGS,
  loadStoryMemoryFlags,
  LookObjectSpec,
  saveStoryMemoryFlags,
  SliceStageId,
  StoryMemoryFlags,
} from '@/engine/v7StoryEngine';
import {
  MoltenSlagFissure,
  renderAndFindChamberLookObject,
  renderBossMythicMechanics,
  renderLanternAtmosphereAndAshStorm,
} from '@/engine/lanternShaderEngine';
import {
  DEFAULT_UE5_GRAPHICS_SETTINGS,
  IS_SOFTWARE_WEBGL,
  loadMeruGraphicsSettings,
  LumenLightEmitter,
  MeruGraphicsSettings,
  MeruQualityTier,
  presetForQualityTier,
  renderUE5PostProcessingPass,
  renderWorldSpaceLumenGI,
  saveMeruGraphicsSettings,
} from '@/engine/ue5GraphicsEngine';
import {
  CelestialBoonId,
  CelestialBoonSpec,
  CELESTIAL_BOONS,
  IMMORTAL_PATRONS,
  computeBoonModifiers,
  getActiveSlashPalette,
  getBoonById,
  isShadowStrikeBackstab,
  rollCelestialBoonOffer,
} from '@/lib/game/boons';
import {
  ChamberTrapRuntime,
  createChamberTrapsRuntime,
  constrainActorToChamber,
  getChamberGeometry,
  renderParallaxAbyss,
  renderIsometricChamberPlatform,
  updateAndRenderPressureTraps,
  renderForegroundParallaxAndWipe,
} from '@/lib/game/chamberGeometry';


interface EnemyEntity {
  id: number;
  type: 'wolf_guai' | 'fire_monk' | 'stone_golem' | 'furnace_titan' | 'xuemo' | 'vrikodara';
  trait?: EnemyTrait;
  wardenRigKey?: Warden3DRigKey;
  isWarden3D?: boolean;
  spriteSheetUrl?: string;
  name: string;
  chineseTitle: string;
  isBoss: boolean;
  armorCracked?: boolean;
  tuskLodgedTimer?: number;
  vacuumActiveTimer?: number;
  lodgedCasts?: number;
  signatureMoveTitle?: string;
  signatureCounterplayHint?: string;
  signatureCounterplayKind?: BossCounterplayKind;
  signatureSpawnsSlag?: boolean;
  signatureSpawnsSonic?: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  displayHp: number;
  posture: number;
  maxPosture: number;
  postureBrokenTimer: number;
  immobilizedTimer: number;
  hitFlashTimer: number;
  parryStanceTimer: number;
  growthScale: number;
  animTime: number;
  aiState: 'idle' | 'chase' | 'windup' | 'attack' | 'recover' | 'ko';
  aiTimer: number;
  windupDuration: number;
  attackPattern: number;
  attackKind: 'cone' | 'corridor' | 'shockwave';
  aimAngle: number;
  corridorEndX: number;
  corridorEndY: number;
  comboHitsRemaining: number;
  slashArcAlpha: number;
  telegraphRadius: number;
  telegraphX: number;
  telegraphY: number;
  scaleX: number;
  scaleY: number;
  koTimer: number;
  phase: 1 | 2 | 3;
  scorchTimer: number;
  scorchTickAccum: number;
}

interface DestructiblePropEntity {
  id: number;
  type: PropType;
  frameIndex: 0 | 1 | 2 | 3;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  hitFlashTimer: number;
  shakeTimer: number;
  destroyed: boolean;
}

interface CloneEntity {
  id: number;
  x: number;
  y: number;
  facing: 1 | -1;
  life: number;
  maxLife: number;
  attackCooldown: number;
  animTime: number;
}

interface PartyCompanionEntity {
  id: CompanionId;
  x: number;
  y: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  attackCooldown: number;
  supportCooldown: number;
  animTime: number;
  hitFlashTimer: number;
}

interface ProjectileEntity {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: string;
  life: number;
  deflected?: boolean;
  isPlayerCast?: boolean;
}

type ParticleItem = SimParticleNode;

interface FloatingTextItem {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  subtext?: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

interface CraterDecal {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  decalFrame: 0 | 1 | 2 | 3;
  angle: number;
}

interface AfterimageItem {
  active: boolean;
  assetUrl: string;
  frameIndex: number;
  x: number;
  y: number;
  targetHeight: number;
  facing: 1 | -1;
  elevationY: number;
  life: number;
  maxLife: number;
  tint: 'gold' | 'jade';
}

interface ShockwaveRing {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  life: number;
  maxLife: number;
}

interface AmbientMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  alpha: number;
  isLeaf: boolean;
}

interface HudSnapshot {
  chamberId: number;
  chamberName: string;
  foesRemaining: number;
  score: number;
  comboCount: number;
  ashenKarma: number;
  karmaRunDelta: number;
  fps: number;
  playerHp: number;
  playerDisplayHp: number;
  playerMaxHp: number;
  focusOrbs: number;
  focusProgress: number;
  dashCharges: number;
  maxDashCharges: number;
  stance: StaffStance;
  weapon: WeaponId;
  gourdSips: number;
  maxGourdSips: number;
  immobilizeCd: number;
  parryCd: number;
  clonesCd: number;
  transformCd: number;
  transformActiveTimer: number;
  hasBrokenTarget: boolean;
  riposteWindowTimer: number;
  kalaRewindCd: number;
  shadowBlinkCd: number;
  stylePoints: number;
  styleStatus: CombatStyleStatus;
  partyLinkCd: number;
  partyCompanions: Array<{
    id: CompanionId;
    hp: number;
    maxHp: number;
  }>;
  boss: {
    active: boolean;
    type: string;
    aiState: string;
    name: string;
    chineseTitle: string;
    hp: number;
    displayHp: number;
    maxHp: number;
    posture: number;
    maxPosture: number;
    phase: 1 | 2 | 3;
    armorCracked?: boolean;
    tuskLodgedTimer?: number;
    signatureMoveTitle?: string;
    signatureCounterplayHint?: string;
    signatureCounterplayKind?: BossCounterplayKind;
  } | null;
}

const MAX_PARTICLES = 220;
const MAX_PROJECTILES = 32;
const MAX_FLOATING_TEXTS = 10;
const MAX_AFTERIMAGES = 20;
const MAX_SHOCKWAVES = 10;
const MAX_AMBIENT_MOTES = 48;
const WORLD_SCALE = 2.85;
const CANONICAL_WORLD_W = Math.round(1440 * WORLD_SCALE);
const CANONICAL_WORLD_H = Math.round(900 * WORLD_SCALE);
const BASE_CAMERA_ZOOM = 1.04;
type HadesCameraPreset = 'dynamic_action' | 'tactical_wide' | 'hades_close';
type EnemyRenderMode = 'hybrid_2d_3d' | 'all_3d';

export default function KaliyugaArena() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rudra3dRef = useRef<Rudra3DRenderer | null>(null);
  const boss3dRef = useRef<Boss3DRenderer | null>(null);
  const enemy3dRef = useRef<Enemy3DRenderer | null>(null);
  const gamepadPrevButtonsRef = useRef<boolean[]>([]);
  const [preloadProgress, setPreloadProgress] = useState<number>(18);
  const [cameraPreset, setCameraPreset] = useState<HadesCameraPreset>('dynamic_action');
  const [enemyRenderMode, setEnemyRenderMode] = useState<EnemyRenderMode>('hybrid_2d_3d');
  const [isMobile, setIsMobile] = useState<boolean>(true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        typeof window !== 'undefined' &&
          ('ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            window.innerWidth <= 1024)
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Path A Stylized Hybrid Pipeline — 60FPS 3D Animated Rudra + Hand-Painted 2D Enemy & Boss Horde
  useEffect(() => {
    const r3d = new Rudra3DRenderer(256);
    rudra3dRef.current = r3d;

    let ticks = 0;
    const preloadTimer = window.setInterval(() => {
      ticks += 1;
      const rProg =
        r3d.isReady || r3d.loadProgress >= 1
          ? 100
          : Math.min(95, Math.round((r3d.loadProgress || 0.45) * 100));
      const timeFloor = Math.min(100, 32 + ticks * 16);
      const combined = Math.min(100, Math.max(timeFloor, rProg));
      setPreloadProgress(combined);
      if (combined >= 100) {
        window.clearInterval(preloadTimer);
      }
    }, 150);

    // Load persisted Ashen Karma & Homa Fire Shrine upgrade ranks from localStorage
    try {
      const raw = window.localStorage.getItem('kaliyuga_save_v1');
      if (raw) {
        const parsed = JSON.parse(raw) as {
          ashenKarma?: number;
          ranks?: Partial<ShrineRanks>;
        };
        const mergedRanks: ShrineRanks = {
          ...INITIAL_SHRINE_RANKS,
          ...(parsed.ranks || {}),
        };
        const savedKarma =
          typeof parsed.ashenKarma === 'number' && Number.isFinite(parsed.ashenKarma)
            ? Math.max(0, Math.round(parsed.ashenKarma))
            : INITIAL_ASHEN_KARMA;
        simRef.current.ranks = mergedRanks;
        simRef.current.ashenKarma = savedKarma;
        const derived = computeDerivedPlayerStats(mergedRanks);
        simRef.current.player.maxHp = derived.maxHp;
        simRef.current.player.hp = derived.maxHp;
        simRef.current.player.displayHp = derived.maxHp;
        simRef.current.player.maxGourdSips = derived.maxGourdSips;
        simRef.current.player.gourdSips = derived.maxGourdSips;
        simRef.current.player.extraLives = derived.extraLives;
        simRef.current.player.focusOrbs = derived.startingFocusOrbs;
        setShrineRanks(mergedRanks);
        setAshenKarma(savedKarma);
      }
    } catch {
      // Ignore storage read errors in restricted environments
    }

    return () => {
      window.clearInterval(preloadTimer);
      r3d.dispose();
      enemy3dRef.current?.dispose();
      boss3dRef.current?.dispose();
      rudra3dRef.current = null;
      boss3dRef.current = null;
      enemy3dRef.current = null;
    };
  }, []);

  const triggerGamepadRumble = useCallback(
    (weakMagnitude = 0.4, strongMagnitude = 0.6, duration = 90) => {
      if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
      try {
        const pads = navigator.getGamepads();
        const pad = pads?.[0] || pads?.[1] || pads?.[2] || pads?.[3];
        const actuator = (
          pad as Gamepad & {
            vibrationActuator?: {
              playEffect?: (
                type: string,
                params: {
                  startDelay: number;
                  duration: number;
                  weakMagnitude: number;
                  strongMagnitude: number;
                }
              ) => Promise<unknown>;
            };
          }
        )?.vibrationActuator;
        if (actuator && typeof actuator.playEffect === 'function') {
          actuator
            .playEffect('dual-rumble', {
              startDelay: 0,
              duration,
              weakMagnitude,
              strongMagnitude,
            })
            .catch(() => {});
        }
      } catch {
        // Ignore rumble errors on unsupported browsers
      }
    },
    []
  );

  const triggerMobileHaptics = useCallback((pattern: number | number[] = 15) => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore vibration errors on unsupported browsers
      }
    }
  }, []);

  const [isMobileTouchMode, setIsMobileTouchMode] = useState<boolean>(false);
  const [joyPuckOffset, setJoyPuckOffset] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const mudraBufferRef = useRef<MudraInputStep[]>([]);
  const mudraResetTimeoutRef = useRef<number | null>(null);
  const mudraBannerTimeoutRef = useRef<number | null>(null);
  const [mudraSequence, setMudraSequence] = useState<MudraButtonId[]>([]);
  const [mudraHints, setMudraHints] = useState(() => computeNextMudraHints([]));
  const [lastTriggeredMudra, setLastTriggeredMudra] = useState<MudraComboSpec | null>(null);
  const [activeFilamentPair, setActiveFilamentPair] = useState<[MudraButtonId, MudraButtonId] | null>(
    null
  );
  const joyDragRef = useRef<{
    pointerId: number | null;
    centerX: number;
    centerY: number;
    lastTapAt: number;
  }>({
    pointerId: null,
    centerX: 0,
    centerY: 0,
    lastTapAt: 0,
  });
  const canvasTouchSwipeRef = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    active: boolean;
  }>({
    startX: 0,
    startY: 0,
    startTime: 0,
    active: false,
  });

  useEffect(() => {
    return () => {
      if (mudraResetTimeoutRef.current !== null) {
        window.clearTimeout(mudraResetTimeoutRef.current);
      }
      if (mudraBannerTimeoutRef.current !== null) {
        window.clearTimeout(mudraBannerTimeoutRef.current);
      }
    };
  }, []);

  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'gameover'>('title');
  const [outcomeMode, setOutcomeMode] = useState<'none' | 'paused' | 'victory' | 'defeat'>('none');
  const [sliceStage, setSliceStage] = useState<SliceStageId>('combat_arena');
  const [storyFlags, setStoryFlags] = useState<StoryMemoryFlags>(() => loadStoryMemoryFlags());
  const [activeLookModal, setActiveLookModal] = useState<LookObjectSpec | null>(null);
  const [graphicsSettings, setGraphicsSettings] = useState<MeruGraphicsSettings>(() =>
    loadMeruGraphicsSettings()
  );
  const [shrineOpen, setShrineOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [boonModalOpen, setBoonModalOpen] = useState(false);
  const [boonChoices, setBoonChoices] = useState<CelestialBoonSpec[]>([]);
  const [ownedBoons, setOwnedBoons] = useState<CelestialBoonId[]>([]);
  const [boonReadyCount, setBoonReadyCount] = useState<number>(1);
  const [boonRerolls, setBoonRerolls] = useState<number>(2);
  const [muted, setMuted] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [shrineRanks, setShrineRanks] = useState<ShrineRanks>(INITIAL_SHRINE_RANKS);
  const [ashenKarma, setAshenKarma] = useState<number>(INITIAL_ASHEN_KARMA);
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [partyModalTab, setPartyModalTab] = useState<'party' | 'gear' | 'quests' | 'settings' | 'pact'>('gear');
  const [activeParty, setActiveParty] = useState<CompanionId[]>([]);
  const [companionBonds, setCompanionBonds] = useState<CompanionBondRanks>(INITIAL_COMPANION_BONDS);
  const [partyTactic, setPartyTactic] = useState<PartyTacticMode>('aggressive');
  const [equippedGear, setEquippedGear] = useState<EquippedGearMap>(INITIAL_EQUIPPED_GEAR);
  const [gearLevels, setGearLevels] = useState<GearUpgradeLevels>(INITIAL_GEAR_LEVELS);
  const [weaponAspectRanks, setWeaponAspectRanks] = useState<WeaponAspectRanks>(INITIAL_WEAPON_ASPECT_RANKS);
  const [activeCalamityOaths, setActiveCalamityOaths] = useState<CalamityOathId[]>([]);
  const [questState, setQuestState] = useState<QuestStateMap>(INITIAL_QUEST_STATE);
  const [playerXp, setPlayerXp] = useState<number>(140);
  const [modernSettings, setModernSettings] = useState<ModernGameSettings>({
    showMinimap: false,
    showQuestTracker: false,
    showPartyCallouts: false,
    showDamageNumbers: true,
    autoLootMagnet: true,
  });

  const cycleGraphicsTier = useCallback(() => {
    setGraphicsSettings((prev) => {
      const order: MeruQualityTier[] = ['ultra', 'high', 'balanced'];
      const nextTier = order[(order.indexOf(prev.tier) + 1) % order.length];
      const next = presetForQualityTier(nextTier);
      simRef.current.graphicsSettings = next;
      saveMeruGraphicsSettings(next);
      return next;
    });
  }, []);

  const cycleCameraPreset = useCallback(() => {
    setCameraPreset((prev) => {
      const order: HadesCameraPreset[] = ['dynamic_action', 'tactical_wide', 'hades_close'];
      const next = order[(order.indexOf(prev) + 1) % order.length];
      simRef.current.cameraPreset = next;
      return next;
    });
  }, []);

  const toggleEnemyRenderMode = useCallback(() => {
    setEnemyRenderMode((prev) => {
      const next: EnemyRenderMode = prev === 'hybrid_2d_3d' ? 'all_3d' : 'hybrid_2d_3d';
      simRef.current.enemyRenderMode = next;
      return next;
    });
  }, []);

  const updateStoryFlags = useCallback((patch: Partial<StoryMemoryFlags>) => {
    setStoryFlags((prev) => {
      const next: StoryMemoryFlags = { ...prev, ...patch };
      simRef.current.storyFlags = next;
      saveStoryMemoryFlags(next);
      return next;
    });
  }, []);

  const [hud, setHud] = useState<HudSnapshot>(() => {
    const derived = computeDerivedPlayerStats(INITIAL_SHRINE_RANKS);
    return {
      chamberId: 1,
      chamberName: CHAMBERS[0].name,
      foesRemaining: CHAMBERS[0].spawns.length,
      score: 0,
      comboCount: 0,
      ashenKarma: INITIAL_ASHEN_KARMA,
      karmaRunDelta: 0,
      fps: 60,
      playerHp: derived.maxHp,
      playerDisplayHp: derived.maxHp,
      playerMaxHp: derived.maxHp,
      focusOrbs: derived.startingFocusOrbs,
      focusProgress: 0.35,
      dashCharges: 2,
      maxDashCharges: 2,
      stance: 'smash',
      weapon: 'jingu_bang',
      gourdSips: derived.maxGourdSips,
      maxGourdSips: derived.maxGourdSips,
      immobilizeCd: 0,
      parryCd: 0,
      clonesCd: 0,
      transformCd: 0,
      transformActiveTimer: 0,
      hasBrokenTarget: false,
      riposteWindowTimer: 0,
      kalaRewindCd: 0,
      shadowBlinkCd: 0,
      stylePoints: 0,
      styleStatus: computeCombatStyleStatus(0),
      partyLinkCd: 0,
      partyCompanions: [],
      boss: null,
    };
  });

  // Mutable simulation state inside useRef so 60fps loop never tears down canvas
  const simRef = useRef({
    state: 'title' as 'title' | 'playing' | 'paused' | 'gameover',
    deathTimer: 0,
    modalPaused: false,
    storyFlags: { ...INITIAL_STORY_FLAGS } as StoryMemoryFlags,
    graphicsSettings: { ...DEFAULT_UE5_GRAPHICS_SETTINGS } as MeruGraphicsSettings,
    nearestLookObject: null as LookObjectSpec | null,
    activeLookObject: null as LookObjectSpec | null,
    slagFissures: [] as MoltenSlagFissure[],
    sonicZones: [] as SonicDrumZone[],
    nextSonicZoneId: 0,
    slagTickAccum: 0,
    viewportW: 1440,
    viewportH: 900,
    worldW: CANONICAL_WORLD_W,
    worldH: CANONICAL_WORLD_H,
    camX: 0,
    camY: 0,
    dpr: 1,
    chamberIndex: 0,
    chamberBannerTimer: 0,
    chamberClearTimer: 0,
    bossPhaseBanner: null as {
      timer: number;
      title: string;
      speaker: string;
      strikethrough: string;
      correction: string;
    } | null,
    score: 0,
    comboCount: 0,
    comboResetTimer: 0,
    ashenKarma: INITIAL_ASHEN_KARMA,
    karmaRunDelta: 0,
    ranks: { ...INITIAL_SHRINE_RANKS } as ShrineRanks,
    activeBoons: [] as CelestialBoonId[],
    boonReadyCount: 1,
    boonRerollsRemaining: 2,
    runStartTimeMs: 0,
    runDamageDealt: 0,
    runParriesLanded: 0,
    runDodgesCompleted: 0,
    runPostureBreaks: 0,
    lightningArcs: [] as Array<{
      x1: number;
      y1: number;
      y2: number;
      x2: number;
      color: string;
      life: number;
      maxLife: number;
    }>,
    hitstopTimer: 0,
    slowMoTimer: 0,
    cameraShakeTrauma: 0,
    cameraZoom: BASE_CAMERA_ZOOM,
    cameraPreset: 'dynamic_action' as HadesCameraPreset,
    enemyRenderMode: 'hybrid_2d_3d' as EnemyRenderMode,
    screenFlashAlpha: 0,
    screenFlashColor: '#ffffff',
    gateWipeTimer: 0,
    chasmVaultCalloutCd: 0,
    traps: [] as ChamberTrapRuntime[],
    fps: 60,
    frameCounter: 0,
    fpsAccum: 0,
    afterimageSpawnAccum: 0,

    player: {
      x: 820,
      y: 780,
      vx: 0,
      vy: 0,
      plumeLagX: -28,
      plumeLagY: -10,
      lastMoveDirX: 1,
      lastMoveDirY: 0,
      dashStartX: 820,
      dashStartY: 780,
      dashStreakAlpha: 0,
      dashCharges: 2,
      maxDashCharges: 2,
      dashRechargeTimer: 0,
      dashStrikeWindowTimer: 0,
      weaponSwingProgress: 0,
      facing: 1 as 1 | -1,
      hp: 250,
      maxHp: 250,
      displayHp: 250,
      focusOrbs: 1,
      focusProgress: 0.35,
      stance: 'smash' as StaffStance,
      weapon: 'jingu_bang' as WeaponId,
      gourdSips: 3,
      maxGourdSips: 3,
      extraLives: 0,
      walkDistance: 0,
      lastFootstepDist: 0,
      scaleX: 1,
      scaleY: 1,
      elevationY: 0,
      action: 'idle' as
        | 'idle'
        | 'light_attack'
        | 'heavy_unleash'
        | 'dodge'
        | 'parry'
        | 'astra'
        | 'execute'
        | 'gourd',
      actionTimer: 0,
      actionDuration: 0,
      comboStep: 1 as 1 | 2 | 3 | 4,
      comboWindowTimer: 0,
      invulnTimer: 0,
      hitFlashTimer: 0,
      immobilizeCd: 0,
      parryCd: 0,
      parryElapsedSec: 0,
      riposteWindowTimer: 0,
      kalaRewindCd: 0,
      shadowBlinkCd: 0,
      stylePoints: 0,
      styleDecayTimer: 0,
      temporalBuffer: [] as TemporalSnapshot[],
      temporalRecordAccum: 0,
      clonesCd: 0,
      transformCd: 0,
      transformTimer: 0,
      slashAngle: 0,
      slashArcAlpha: 0,
    },

    decoy: {
      active: false,
      x: 0,
      y: 0,
      timer: 0,
    },

    enemies: [] as EnemyEntity[],
    props: [] as DestructiblePropEntity[],
    currentWave: 1,
    maxWave: 1,
    waveQueue: [] as Array<{
      type: EnemyEntity['type'];
      x: number;
      y: number;
      delay: number;
      wave: 1 | 2 | 3;
      trait?: EnemyTrait;
      wardenRigKey?: Warden3DRigKey;
      wardenTitle?: string;
    }>,
    summoningRifts: [] as Array<{
      type: EnemyEntity['type'];
      x: number;
      y: number;
      timer: number;
      maxTimer: number;
      trait?: EnemyTrait;
      wardenRigKey?: Warden3DRigKey;
      wardenTitle?: string;
    }>,
    pendingSpawns: [] as Array<{
      type: EnemyEntity['type'];
      x: number;
      y: number;
      timer: number;
      trait?: EnemyTrait;
      wardenRigKey?: Warden3DRigKey;
      wardenTitle?: string;
    }>,
    clones: [] as CloneEntity[],
    companions: [] as PartyCompanionEntity[],
    activeParty: [] as CompanionId[],
    companionBonds: { ...INITIAL_COMPANION_BONDS } as CompanionBondRanks,
    partyTactic: 'aggressive' as PartyTacticMode,
    equippedGear: { ...INITIAL_EQUIPPED_GEAR } as EquippedGearMap,
    gearLevels: { ...INITIAL_GEAR_LEVELS } as GearUpgradeLevels,
    weaponAspectRanks: { ...INITIAL_WEAPON_ASPECT_RANKS } as WeaponAspectRanks,
    activeCalamityOaths: [] as CalamityOathId[],
    questState: { ...INITIAL_QUEST_STATE } as QuestStateMap,
    playerXp: 140,
    partyLinkCd: 0,
    modernSettings: {
      showMinimap: false,
      showQuestTracker: false,
      showPartyCallouts: false,
      showDamageNumbers: true,
      autoLootMagnet: true,
    } as ModernGameSettings,
    craters: [] as CraterDecal[],
    battleScars: [] as BattleScarDecal[],
    nextScarId: 1,
    afterimages: Array.from({ length: MAX_AFTERIMAGES }, () => ({
      active: false,
      assetUrl: '',
      frameIndex: 0,
      x: 0,
      y: 0,
      targetHeight: 88,
      facing: 1 as 1 | -1,
      elevationY: 0,
      life: 0,
      maxLife: 0.25,
      tint: 'gold' as 'gold' | 'jade',
    })) as AfterimageItem[],
    shockwaves: Array.from({ length: MAX_SHOCKWAVES }, () => ({
      active: false,
      x: 0,
      y: 0,
      radius: 10,
      maxRadius: 120,
      color: '#ffd86b',
      life: 0,
      maxLife: 0.4,
    })) as ShockwaveRing[],
    ambientMotes: Array.from({ length: MAX_AMBIENT_MOTES }, (_, idx) => ({
      x: (idx * 97) % 1440,
      y: (idx * 67) % 900,
      vx: 16 + (idx % 5) * 6,
      vy: idx % 3 === 0 ? 14 + (idx % 4) * 5 : -18 - (idx % 5) * 6,
      size: 1.5 + (idx % 4) * 0.9,
      phase: idx * 0.7,
      alpha: 0.35 + (idx % 5) * 0.12,
      isLeaf: idx % 4 === 0,
    })) as AmbientMote[],
    projectiles: Array.from({ length: MAX_PROJECTILES }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 8,
      damage: 18,
      color: '#ff6422',
      life: 0,
    })) as ProjectileEntity[],
    particles: createParticlePool(MAX_PARTICLES) as ParticleItem[],
    floatingTexts: Array.from({ length: MAX_FLOATING_TEXTS }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: -36,
      text: '',
      subtext: undefined,
      color: '#ffffff',
      life: 0,
      maxLife: 0.78,
      scale: 1,
    })) as FloatingTextItem[],

    input: {
      keysHeld: new Set<string>(),
      justPressed: new Set<string>(),
      pointerScreenX: 640,
      pointerScreenY: 420,
      pointerX: 1020,
      pointerY: 660,
      pointerActive: false,
      touchMoveX: 0,
      touchMoveY: 0,
      touchAttackHeld: false,
      bufferedAction: null as 'light' | 'heavy' | 'dodge' | null,
      bufferTimer: 0,
    },
  });

  // Helper to spawn pooled particles through the Pillar 3 Canvas Particle Physics Engine
  const spawnParticles = useCallback(
    (
      x: number,
      y: number,
      count: number,
      color: string,
      speed: number = 140,
      size: number = 4,
      gravity: number = 180
    ) => {
      const pool = simRef.current.particles;
      const c = color.toLowerCase();
      let archetype: ParticleArchetype = 'ember_dust';
      if (
        c === '#ff2a3c' ||
        c === '#ff2a4b' ||
        c === '#d9162a' ||
        c === '#c91e2a' ||
        c === '#ff3b24' ||
        c === '#ff3824' ||
        c === '#ff384c'
      ) {
        archetype = 'blood_splatter';
      } else if (
        c === '#3ee0a8' ||
        c === '#38bdf8' ||
        c === '#63f2ff' ||
        c === '#52ffd8' ||
        c === '#5ce6ff' ||
        c === '#7dd3fc' ||
        c === '#a855f7' ||
        c === '#34d399'
      ) {
        archetype = 'magic_spell';
      } else if (
        (c === '#ffd86b' || c === '#f5c451' || c === '#f2c45a' || c === '#d4a548') &&
        gravity >= 75
      ) {
        archetype = 'bronze_spark';
      }

      emitParticleBurst(pool, {
        archetype,
        originX: x,
        originY: y,
        floorY: y + 28,
        count,
        baseSpeed: speed,
        primaryColor: color,
        sizeScale: Math.max(0.65, size / 4.0),
        seedOffset: Math.floor((x + y + count) * 1.7),
      });
    },
    []
  );

  // Helper to spawn pooled motion afterimages
  const spawnAfterimage = useCallback(
    (
      assetUrl: string,
      frameIndex: number,
      x: number,
      y: number,
      targetHeight: number,
      facing: 1 | -1,
      elevationY: number,
      tint: 'gold' | 'jade' = 'gold',
      duration: number = 0.24
    ) => {
      const pool = simRef.current.afterimages;
      for (let i = 0; i < pool.length; i++) {
        if (!pool[i].active) {
          pool[i].active = true;
          pool[i].assetUrl = assetUrl;
          pool[i].frameIndex = frameIndex;
          pool[i].x = x;
          pool[i].y = y;
          pool[i].targetHeight = targetHeight;
          pool[i].facing = facing;
          pool[i].elevationY = elevationY;
          pool[i].tint = tint;
          pool[i].maxLife = duration;
          pool[i].life = duration;
          return;
        }
      }
    },
    []
  );

  // Helper to spawn pooled isometric shockwave rings
  const spawnShockwave = useCallback(
    (x: number, y: number, maxRadius: number, color: string = '#ffd86b', duration: number = 0.38) => {
      const pool = simRef.current.shockwaves;
      for (let i = 0; i < pool.length; i++) {
        if (!pool[i].active) {
          pool[i].active = true;
          pool[i].x = x;
          pool[i].y = y;
          pool[i].radius = 12;
          pool[i].maxRadius = maxRadius;
          pool[i].color = color;
          pool[i].maxLife = duration;
          pool[i].life = duration;
          return;
        }
      }
    },
    []
  );

  const spawnFloatingText = useCallback(
    (
      x: number,
      y: number,
      text: string,
      color: string = '#f9e79f',
      scale: number = 1,
      _subtext?: string
    ) => {
      if (!simRef.current.modernSettings.showDamageNumbers) return;

      // Suppress noisy routine callout sentences so only crisp numbers & key combat cues appear
      const upper = text.toUpperCase();
      if (
        upper.includes('SPARTAN LEAP') ||
        upper.includes('STANCE') ||
        upper.includes('ASPECT OF') ||
        upper.includes('SHATTERED!') ||
        upper.includes('CAULDRON DETONATED')
      ) {
        return;
      }

      let cleanText = text;
      if (upper.includes('RIPOSTE')) {
        cleanText = '⚡ RIPOSTE!';
      } else if (upper.includes('SEE-THROUGH') || upper.includes('RESOLUTE')) {
        cleanText = '⚡ COUNTER!';
      } else if (upper.includes('POSTURE BROKEN')) {
        cleanText = 'BROKEN! [F]';
      } else if (upper.includes('PERFECT PARRY') || upper.includes('GOLDEN DEFLECT')) {
        cleanText = '✦ PARRY!';
      } else if (upper.includes('GUARD PARRIED') || upper.includes('BOSS PARRIED')) {
        cleanText = 'DEFLECTED';
      } else if (upper.includes('RUDRA-KOPA')) {
        cleanText = 'RUDRA-KOPA!';
      } else if (upper.includes('PRALAYA') || upper.includes('SUDARSHANA') || upper.includes('BRAHMASHIRA')) {
        return;
      } else if (cleanText.includes('·')) {
        cleanText = cleanText.split('·')[0].trim();
      }
      if (cleanText.length > 22) {
        cleanText = cleanText.slice(0, 20).trim();
      }

      const pool = simRef.current.floatingTexts;
      let adjustedY = y - 16;
      for (let i = 0; i < pool.length; i++) {
        if (
          pool[i].active &&
          pool[i].life > 0.22 &&
          Math.abs(pool[i].x - x) < 76 &&
          Math.abs(pool[i].y - adjustedY) < 24
        ) {
          adjustedY = Math.min(adjustedY, pool[i].y - 20);
        }
      }

      for (let i = 0; i < pool.length; i++) {
        if (!pool[i].active) {
          pool[i].active = true;
          pool[i].x = x + (Math.random() - 0.5) * 12;
          pool[i].y = adjustedY;
          pool[i].vx = (Math.random() - 0.5) * 22;
          pool[i].vy = -54 - Math.random() * 12;
          pool[i].text = cleanText;
          pool[i].subtext = undefined;
          pool[i].color = color;
          pool[i].maxLife = 0.52;
          pool[i].life = 0.52;
          pool[i].scale = Math.min(1.15, scale * 0.92);
          return;
        }
      }
    },
    []
  );

  const createEnemyFromSpec = useCallback(
    (
      type: EnemyEntity['type'],
      normX: number,
      normY: number,
      canvasW: number,
      canvasH: number,
      trait?: EnemyTrait,
      wardenRigKey?: Warden3DRigKey,
      wardenTitle?: string
    ): EnemyEntity => {
      const id = Math.floor(Math.random() * 1e9);
      const x = normX * canvasW;
      const y = normY * canvasH;

      if (type === 'xuemo') {
        return {
          id,
          type,
          spriteSheetUrl: GAME_ASSETS.bossSheets.dundubhiMinotaurSheetP1,
          name: 'DUNDUBHI, THE WAR-DRUM BEHEMOTH',
          chineseTitle: 'CHOLA WAR-DEMON · BAIT CHARGE INTO PILLARS TO CRACK ARMOR!',
          isBoss: true,
          armorCracked: false,
          signatureMoveTitle: 'HORN GORE STAMPEDE',
          signatureCounterplayHint: 'BAIT CHARGE INTO PILLAR OR [SPACE] SIDESTEP',
          signatureCounterplayKind: 'bait_pillar',
          x,
          y,
          vx: 0,
          vy: 0,
          facing: -1,
          hp: 2650,
          maxHp: 2650,
          displayHp: 2650,
          posture: 2250,
          maxPosture: 2250,
          postureBrokenTimer: 0,
          immobilizedTimer: 0,
          hitFlashTimer: 0,
          parryStanceTimer: 0,
          growthScale: 1.0,
          animTime: 0,
          aiState: 'chase',
          aiTimer: 0.42,
          windupDuration: 0.56,
          attackPattern: 0,
          attackKind: 'cone',
          aimAngle: Math.PI,
          corridorEndX: x - 165,
          corridorEndY: y,
          comboHitsRemaining: 0,
          slashArcAlpha: 0,
          telegraphRadius: 102,
          telegraphX: x,
          telegraphY: y,
          scaleX: 1,
          scaleY: 1,
          koTimer: 0,
          phase: 1,
          scorchTimer: 0,
          scorchTickAccum: 0,
        };
      }

      if (type === 'vrikodara') {
        return {
          id,
          type,
          spriteSheetUrl: GAME_ASSETS.bossSheets.vrikodaraDemonicKingSheet,
          name: 'VRIKODARA, THE IRON RAKSHASA',
          chineseTitle: 'SOVEREIGN OF THE INFERNAL MAW · WIELDER OF THE SPIKED GADA',
          isBoss: true,
          armorCracked: true,
          signatureMoveTitle: 'ABDOMINAL FURNACE VACUUM',
          signatureCounterplayHint: 'VORTEX PULL · [SPACE] DASH OUTWARD BEFORE SLAM',
          signatureCounterplayKind: 'dash_outward',
          x,
          y,
          vx: 0,
          vy: 0,
          facing: -1,
          hp: 3450,
          maxHp: 3450,
          displayHp: 3450,
          posture: 2950,
          maxPosture: 2950,
          postureBrokenTimer: 0,
          immobilizedTimer: 0,
          hitFlashTimer: 0,
          parryStanceTimer: 0,
          growthScale: 1.0,
          animTime: 0,
          aiState: 'chase',
          aiTimer: 0.38,
          windupDuration: 0.52,
          attackPattern: 0,
          attackKind: 'cone',
          aimAngle: Math.PI,
          corridorEndX: x - 185,
          corridorEndY: y,
          comboHitsRemaining: 0,
          slashArcAlpha: 0,
          telegraphRadius: 114,
          telegraphX: x,
          telegraphY: y,
          scaleX: 1,
          scaleY: 1,
          koTimer: 0,
          phase: 1,
          scorchTimer: 0,
          scorchTickAccum: 0,
        };
      }

      const wolfVariants = [
        {
          name: 'Kuru Bronze Spearman',
          zh: 'ASH-SWORN PHALANX LANCER',
          sheet: GAME_ASSETS.enemySheets.bronzeSpearmanSheet,
        },
        {
          name: 'Vaitarani Corpse-Ghoul',
          zh: 'BLOOD-RIVER STALKER',
          sheet: GAME_ASSETS.enemySheets.ghoulSheet,
        },
        {
          name: 'Vrika Bone-Stalker',
          zh: 'CREMATION HOUND FIEND',
          sheet: GAME_ASSETS.enemySheets.undeadMonsterSheet,
        },
      ];
      const monkVariants = [
        {
          name: 'Aghori Four-Armed Mage',
          zh: 'CREMATION PYRE SORCERER',
          sheet: GAME_ASSETS.enemySheets.hoodedMageSheet,
        },
        {
          name: 'Preta Bone-Bowman',
          zh: 'CURSEDDEADEYE ARCHER',
          sheet: GAME_ASSETS.enemySheets.undeadArcherSheet,
        },
      ];
      const golemVariants = [
        {
          name: 'Skull-Shield Iron Knight',
          zh: 'KURUKSHETRA DREAD VANGUARD',
          sheet: GAME_ASSETS.enemySheets.fantasyKnightSheet,
        },
        {
          name: 'Rakshasa Club-Ogre',
          zh: 'BONE-CRUSHER BRUISER',
          sheet: GAME_ASSETS.enemySheets.ogreWarriorSheet,
        },
        {
          name: 'Kuru Undead Swordsman',
          zh: 'ASHEN LEGION BLADE',
          sheet: GAME_ASSETS.enemySheets.undeadWarriorSheet,
        },
      ];
      const titanVariants = [
        {
          name: 'Naga Serpent-Blade Sovereign',
          zh: 'COILED VENOM GUARDIAN',
          sheet: GAME_ASSETS.enemySheets.nagaWarriorSheet,
        },
        {
          name: 'Crimson Horned Ogre',
          zh: 'BLOOD-FORGED WARLORD',
          sheet: GAME_ASSETS.enemySheets.demonicOgreSheet,
        },
        {
          name: 'Jatharagni Molten Golem',
          zh: 'LIVING MAGMA COLOSSUS',
          sheet: GAME_ASSETS.enemySheets.moltenGolemSheet,
        },
        {
          name: 'Kabandha Maw-Fiend',
          zh: 'HEADLESS BELLY-MAW DEMON',
          sheet: GAME_ASSETS.enemySheets.kabandhaMonsterSheet,
        },
      ];

      const pickedVariant =
        type === 'wolf_guai'
          ? wolfVariants[id % wolfVariants.length]
          : type === 'fire_monk'
          ? monkVariants[id % monkVariants.length]
          : type === 'stone_golem'
          ? golemVariants[id % golemVariants.length]
          : titanVariants[id % titanVariants.length];

      const configs: Record<
        'wolf_guai' | 'fire_monk' | 'stone_golem' | 'furnace_titan',
        { name: string; zh: string; hp: number; posture: number; radius: number; sheet: string }
      > = {
        wolf_guai: {
          name: pickedVariant.name,
          zh: pickedVariant.zh,
          hp: 490,
          posture: 420,
          radius: 76,
          sheet: pickedVariant.sheet,
        },
        fire_monk: {
          name: pickedVariant.name,
          zh: pickedVariant.zh,
          hp: 540,
          posture: 450,
          radius: 82,
          sheet: pickedVariant.sheet,
        },
        stone_golem: {
          name: pickedVariant.name,
          zh: pickedVariant.zh,
          hp: 780,
          posture: 680,
          radius: 86,
          sheet: pickedVariant.sheet,
        },
        furnace_titan: {
          name: pickedVariant.name,
          zh: pickedVariant.zh,
          hp: 1040,
          posture: 860,
          radius: 96,
          sheet: pickedVariant.sheet,
        },
      };

      const cfg = configs[type];
      if (typeof window !== 'undefined' && isMultiRowSpriteUrl(cfg.sheet)) {
        loadAndProcessSprite(cfg.sheet, {
          mode: 'character',
          gridLayout: 'multirow',
        });
      }
      const isWarden3D = false;
      const traitPrefix =
        trait === 'vajra_shield'
          ? '[SHIELDED] '
          : trait === 'agni_aura'
          ? '[AGNI-BORN] '
          : trait === 'rakshasa_frenzy'
          ? '[FRENZIED] '
          : '';
      const pactMods = computeCalamityPactModifiers(simRef.current.activeCalamityOaths);
      const hpMult = (trait ? 1.32 : 1.0) * (wardenTitle ? 1.42 : 1.0) * pactMods.enemyHpMultiplier;
      const finalHp = Math.round(cfg.hp * hpMult);
      const finalPosture = Math.round(cfg.posture * hpMult * pactMods.enemyPostureMultiplier);

      return {
        id,
        type,
        trait,
        wardenRigKey,
        isWarden3D,
        spriteSheetUrl: cfg.sheet,
        name: wardenTitle || `${traitPrefix}${cfg.name}`,
        chineseTitle: wardenTitle ? 'ELITE SANCTUM WARDEN' : cfg.zh,
        isBoss: false,
        x,
        y,
        vx: 0,
        vy: 0,
        facing: -1,
        hp: finalHp,
        maxHp: finalHp,
        displayHp: finalHp,
        posture: finalPosture,
        maxPosture: finalPosture,
        postureBrokenTimer: 0,
        immobilizedTimer: 0,
        hitFlashTimer: 0,
        parryStanceTimer: trait === 'vajra_shield' || type === 'stone_golem' ? 2.4 : 0,
        growthScale: 1.0,
        animTime: Math.random() * 5,
        aiState: 'chase',
        aiTimer: 0.16 + Math.random() * 0.18,
        windupDuration: trait === 'rakshasa_frenzy' ? 0.28 : 0.35,
        attackPattern: 0,
        attackKind: 'cone',
        aimAngle: Math.PI,
        corridorEndX: x,
        corridorEndY: y,
        comboHitsRemaining: 0,
        slashArcAlpha: 0,
        telegraphRadius: cfg.radius,
        telegraphX: x,
        telegraphY: y,
        scaleX: 1,
        scaleY: 1,
        koTimer: 0,
        phase: 1,
        scorchTimer: 0,
        scorchTickAccum: 0,
      };
    },
    []
  );

  // Helper to damage or shatter destructible 2.5D courtyard props (includes Hades environmental traps!)
  const damagePropsNearPoint = useCallback(
    (originX: number, originY: number, radius: number, damage: number) => {
      const sim = simRef.current;
      const p = sim.player;
      for (let i = 0; i < sim.props.length; i++) {
        const prop = sim.props[i];
        if (prop.destroyed) continue;
        const d = Math.hypot(prop.x - originX, (prop.y - originY) * 1.15);
        if (d <= radius) {
          prop.hp = Math.max(0, prop.hp - damage);
          prop.hitFlashTimer = 0.09;
          prop.shakeTimer = 0.22;
          const sparkColor =
            prop.type === 'incense_cauldron'
              ? '#ff7b24'
              : prop.type === 'pagoda_lantern'
              ? '#ffd86b'
              : prop.type === 'dragon_pillar'
              ? '#ff4d3b'
              : '#d6b47c';
          spawnParticles(prop.x, prop.y - 28, 12, sparkColor, 155, 3.8, 150);

          if (prop.hp <= 0) {
            prop.destroyed = true;
            sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.34);
            soundEngine.playHit('heavy');
            const blastRadius =
              prop.type === 'dragon_pillar'
                ? 175
                : prop.type === 'incense_cauldron'
                ? 160
                : 92;
            spawnShockwave(prop.x, prop.y, blastRadius, sparkColor, 0.42);
            spawnParticles(prop.x, prop.y - 32, 34, sparkColor, 240, 5.2, 170);
            spawnParticles(prop.x, prop.y - 20, 18, '#7a6f62', 180, 4.4, 190);
            sim.craters.push({
              x: prop.x,
              y: prop.y + 4,
              radius: prop.type === 'incense_cauldron' ? 76 : 56,
              alpha: 0.88,
              decalFrame: prop.type === 'incense_cauldron' ? 3 : 2,
              angle: (Math.random() - 0.5) * 0.6,
            });
            if (sim.craters.length > 12) sim.craters.shift();

            // Hades-Style Tactical Environmental Trap Damage:
            // Toppling a Kurukshetra Pillar or exploding a Homa Oil Cauldron crushes/scorches nearby foes!
            if (prop.type === 'dragon_pillar' || prop.type === 'incense_cauldron') {
              const envDmg = prop.type === 'dragon_pillar' ? 155 : 135;
              const envPosDmg = prop.type === 'dragon_pillar' ? 190 : 140;
              sim.enemies.forEach((foe) => {
                if (foe.aiState === 'ko') return;
                if (Math.hypot(foe.x - prop.x, foe.y - prop.y) <= blastRadius) {
                  foe.hp = Math.max(0, foe.hp - envDmg);
                  foe.hitFlashTimer = 0.14;
                  if (prop.type === 'incense_cauldron') {
                    foe.scorchTimer = Math.max(foe.scorchTimer, 4.5);
                  }
                  const posRes = applyPostureDamage({
                    currentPosture: foe.posture,
                    maxPosture: foe.maxPosture,
                    postureDamage: envPosDmg,
                    alreadyBroken: foe.postureBrokenTimer > 0,
                  });
                  foe.posture = posRes.nextPosture;
                  if (posRes.triggeredBreak) {
                    foe.postureBrokenTimer = 4.5;
                    foe.aiState = 'recover';
                    foe.aiTimer = 4.5;
                  }
                  spawnFloatingText(
                    foe.x,
                    foe.y - 74,
                    prop.type === 'dragon_pillar'
                      ? `PILLAR CRUSH! -${envDmg}`
                      : `AGNI OIL BLAST! -${envDmg}`,
                    '#ff9233',
                    1.18
                  );
                }
              });
            }

            sim.ashenKarma += 15;
            sim.karmaRunDelta += 15;
            sim.score += 90;
            p.focusProgress = Math.min(1, p.focusProgress + 0.25);
            if (p.focusProgress >= 1 && p.focusOrbs < 4) {
              p.focusProgress -= 1;
              p.focusOrbs += 1;
            }
            spawnFloatingText(
              prop.x,
              prop.y - 64,
              prop.type === 'dragon_pillar'
                ? 'PILLAR TOPPLED! +15 KARMA'
                : prop.type === 'incense_cauldron'
                ? 'CAULDRON DETONATED! +15 KARMA'
                : 'SHATTERED! +15 KARMA',
              '#ffd86b',
              0.98,
              '+25% FOCUS CHARGE'
            );
          }
        }
      }
    },
    [spawnFloatingText, spawnParticles, spawnShockwave]
  );

  // Load a specific chamber (0-indexed: 0..11)
  const loadChamber = useCallback(
    (index: number, resetFullRun: boolean = false) => {
      const sim = simRef.current;
      const clampedIdx = Math.max(0, Math.min(CHAMBERS.length - 1, index));
      const spec = CHAMBERS[clampedIdx];
      if (spec.isBossChamber && sim.enemyRenderMode === 'all_3d' && !boss3dRef.current) {
        boss3dRef.current = new Boss3DRenderer(256);
      }
      const cw = typeof window !== 'undefined' ? window.innerWidth || sim.viewportW || 1440 : sim.viewportW || 1440;
      const ch = typeof window !== 'undefined' ? window.innerHeight || sim.viewportH || 900 : sim.viewportH || 900;
      sim.viewportW = cw;
      sim.viewportH = ch;
      const worldW = CANONICAL_WORLD_W;
      const worldH = CANONICAL_WORLD_H;

      const derived = computeDerivedPlayerStats(sim.ranks);
      const gearBonuses = computeEquippedGearBonuses(sim.equippedGear, sim.gearLevels);
      const levelInfo = computePlayerLevelFromXp(sim.playerXp);
      const totalMaxHp = derived.maxHp + gearBonuses.bonusMaxHp + levelInfo.bonusMaxHp;

      sim.worldW = worldW;
      sim.worldH = worldH;
      sim.chamberIndex = clampedIdx;
      sim.chamberBannerTimer = 4.6;
      sim.chamberClearTimer = 0;
      sim.bossPhaseBanner = null;
      sim.cameraZoom = BASE_CAMERA_ZOOM;
      sim.slowMoTimer = 0;
      sim.gateWipeTimer = 0.32;
      sim.chasmVaultCalloutCd = 0;

      // Lazy-load current & next chamber backgrounds and multi-row enemy/boss sheets on demand
      [clampedIdx, Math.min(CHAMBERS.length - 1, clampedIdx + 1)].forEach((idxToLoad) => {
        const chToLoad = CHAMBERS[idxToLoad];
        if (!chToLoad) return;
        [chToLoad.backgroundUrl, chToLoad.unlockedBackgroundUrl, chToLoad.phase2BackgroundUrl].forEach(
          (bgUrl) => {
            if (bgUrl && !bgImagesRef.current.has(bgUrl) && typeof window !== 'undefined') {
              const img = new Image();
              img.src = bgUrl;
              bgImagesRef.current.set(bgUrl, img);
            }
          }
        );
        if (chToLoad.id === 4) {
          loadAndProcessSprite(GAME_ASSETS.bossSheets.dundubhiMinotaurSheetP1, {
            mode: 'character',
            gridLayout: 'multirow',
          });
          loadAndProcessSprite(GAME_ASSETS.bossSheets.dundubhiMinotaurSheetP2, {
            mode: 'character',
            gridLayout: 'multirow',
          });
        } else if (chToLoad.id === 8) {
          loadAndProcessSprite(GAME_ASSETS.bossSheets.vrikodaraDemonicKingSheet, {
            mode: 'character',
            gridLayout: 'multirow',
          });
        }
      });

      // Trigger Boss Intro Painted Story Cutscenes when entering Chamber 4 (Dundubhi) or Chamber 8 (Vrikodara) during a run
      if (!resetFullRun && sim.state === 'playing') {
        if (clampedIdx === 3) {
          setSliceStage('dundubhi_intro');
        } else if (clampedIdx === 7) {
          setSliceStage('vrikodara_intro');
        }
      }
      sim.traps = createChamberTrapsRuntime(clampedIdx, worldW, worldH);
      sim.craters = [];
      sim.battleScars = [];
      sim.clones = [];
      sim.decoy.active = false;
      sim.afterimages.forEach((a) => {
        a.active = false;
      });
      sim.shockwaves.forEach((s) => {
        s.active = false;
      });
      sim.projectiles.forEach((p) => {
        p.active = false;
      });

      // Spawn player on Western Ghat Entry Landing
      sim.player.x = worldW * 0.24;
      sim.player.y = worldH * 0.62;
      sim.player.dashStartX = sim.player.x;
      sim.player.dashStartY = sim.player.y;
      sim.player.dashStreakAlpha = 0;
      sim.player.dashCharges = 2;
      sim.player.maxDashCharges = 2;
      sim.player.dashRechargeTimer = 0;
      sim.player.weaponSwingProgress = 0;
      sim.player.vx = 0;
      sim.player.vy = 0;
      sim.player.plumeLagX = -16;
      sim.player.plumeLagY = -5;
      sim.player.facing = 1;
      sim.player.action = 'idle';
      sim.player.actionTimer = 0;
      sim.player.elevationY = 0;
      sim.player.invulnTimer = 1.4;
      sim.player.walkDistance = 0;
      sim.player.lastFootstepDist = 0;
      sim.player.dashStrikeWindowTimer = 0;
      sim.lightningArcs = [];
      sim.slagFissures = [];
      sim.sonicZones = [];
      sim.slagTickAccum = 0;
      sim.nearestLookObject = null;
      sim.activeLookObject = null;
      setActiveLookModal(null);

      // Solo Ash-Bound Warrior Combat (Savitri & Sanjaya remain narrative guides outside active combat)
      sim.activeParty = [];
      sim.companions = [];

      // Center Hades 2.5D Isometric Camera smoothly on Rudra at Western Ghat Entry Landing
      const initVw = sim.viewportW || 1440;
      const initVh = sim.viewportH || 900;
      sim.camX = sim.player.x - initVw * 0.5;
      sim.camY = sim.player.y - initVh * 0.54;

      if (resetFullRun) {
        sim.score = 0;
        sim.comboCount = 0;
        sim.karmaRunDelta = 0;
        sim.activeBoons = [];
        sim.boonReadyCount = 1;
        sim.boonRerollsRemaining = 2;
        sim.runStartTimeMs = performance.now();
        sim.runDamageDealt = 0;
        sim.runParriesLanded = 0;
        sim.runDodgesCompleted = 0;
        sim.runPostureBreaks = 0;
        sim.partyLinkCd = 0;
        setOwnedBoons([]);
        setBoonReadyCount(1);
        setBoonRerolls(2);
        setBoonModalOpen(false);
        const pactMods = computeCalamityPactModifiers(sim.activeCalamityOaths);
        sim.player.maxHp = totalMaxHp;
        sim.player.hp = totalMaxHp;
        sim.player.displayHp = totalMaxHp;
        sim.player.maxGourdSips = Math.max(1, derived.maxGourdSips - pactMods.kalashaSipPenalty);
        sim.player.gourdSips = sim.player.maxGourdSips;
        sim.player.extraLives = derived.extraLives;
        sim.player.focusOrbs = derived.startingFocusOrbs;
        sim.player.focusProgress = 0.45;
        sim.player.immobilizeCd = 0;
        sim.player.parryCd = 0;
        sim.player.clonesCd = 0;
        sim.player.transformCd = 0;
        sim.player.transformTimer = 0;
      } else {
        const boonMods = computeBoonModifiers(sim.activeBoons);
        // Between chambers, replenish 1 Gourd sip and ensure minimum Starting Focus Orbs
        sim.player.maxHp = totalMaxHp;
        sim.player.hp = Math.min(totalMaxHp, sim.player.hp + 55);
        sim.player.displayHp = sim.player.hp;
        sim.player.maxGourdSips = derived.maxGourdSips + boonMods.gourdBonusMaxSips;
        sim.player.gourdSips = Math.min(sim.player.maxGourdSips, sim.player.gourdSips + 1);
        const astralBonus = sim.activeBoons.includes('subhuti_astral_qi') ? 1 : 0;
        sim.player.focusOrbs = Math.max(
          sim.player.focusOrbs,
          Math.min(4, derived.startingFocusOrbs + astralBonus)
        );
      }

      // Populate Y-sorted destructible 2.5D temple courtyard props for this chamber
      const propFrameMap: Record<PropType, 0 | 1 | 2 | 3> = {
        incense_cauldron: 0,
        pagoda_lantern: 1,
        weapon_rack: 2,
        dragon_pillar: 3,
      };
      const propHpMap: Record<PropType, number> = {
        incense_cauldron: 75,
        pagoda_lantern: 65,
        weapon_rack: 55,
        dragon_pillar: 110,
      };
      sim.props = (spec.props || []).map((pr, idx) => ({
        id: idx + 1,
        type: pr.type,
        frameIndex: propFrameMap[pr.type],
        x: pr.x * worldW,
        y: pr.y * worldH,
        hp: propHpMap[pr.type],
        maxHp: propHpMap[pr.type],
        hitFlashTimer: 0,
        shakeTimer: 0,
        destroyed: false,
      }));

      sim.enemies = [];
      sim.pendingSpawns = [];
      sim.summoningRifts = [];
      sim.currentWave = 1;
      sim.maxWave = Math.max(1, ...spec.spawns.map((s) => s.wave || 1));
      sim.waveQueue = [];

      spec.spawns.forEach((s) => {
        const waveNum = s.wave || 1;
        if (waveNum === 1) {
          if (s.delay && s.delay > 0) {
            sim.pendingSpawns.push({
              type: s.type,
              x: s.x,
              y: s.y,
              timer: s.delay,
              trait: s.trait,
              wardenRigKey: s.wardenRigKey,
              wardenTitle: s.wardenTitle,
            });
          } else {
            sim.enemies.push(
              createEnemyFromSpec(
                s.type,
                s.x,
                s.y,
                worldW,
                worldH,
                s.trait,
                s.wardenRigKey,
                s.wardenTitle
              )
            );
          }
        } else {
          sim.waveQueue.push({
            type: s.type,
            x: s.x,
            y: s.y,
            delay: s.delay || 0.2,
            wave: waveNum,
            trait: s.trait,
            wardenRigKey: s.wardenRigKey,
            wardenTitle: s.wardenTitle,
          });
        }
      });

      soundEngine.playGong('chamber');
      soundEngine.syncBgmState(
        sim.state === 'title' ? 'title' : 'playing',
        spec.id,
        spec.isBossChamber
      );
    },
    [createEnemyFromSpec]
  );

  // Start or restart game
  const startGameAtChamber = useCallback(
    (chamberIndex: number = 0) => {
      const sim = simRef.current;
      sim.state = 'playing';
      sim.deathTimer = 0;
      document.body.dataset.state = 'playing';
      setGameState('playing');
      setOutcomeMode('none');
      setShrineOpen(false);
      setStoryOpen(false);
      setControlsOpen(false);
      setBoonModalOpen(false);
      setSliceStage('combat_arena');
      sim.storyFlags = loadStoryMemoryFlags();
      sim.input.keysHeld.clear();
      sim.input.justPressed.clear();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      loadChamber(chamberIndex, true);
      soundEngine.startMusic();
    },
    [loadChamber]
  );

  // Hades-Style Celestial Boon Altar Handlers
  const openBoonAltar = useCallback(() => {
    const sim = simRef.current;
    if (sim.boonReadyCount <= 0) return;
    const offer = rollCelestialBoonOffer(sim.activeBoons);
    if (offer.length === 0) {
      sim.boonReadyCount = 0;
      setBoonReadyCount(0);
      return;
    }
    setBoonChoices(offer);
    setBoonModalOpen(true);
    soundEngine.playGong('chamber');
  }, []);

  const handleSelectBoon = useCallback(
    (boonId: CelestialBoonId) => {
      const sim = simRef.current;
      if (!sim.activeBoons.includes(boonId)) {
        sim.activeBoons.push(boonId);
      }
      sim.boonReadyCount = Math.max(0, sim.boonReadyCount - 1);
      setOwnedBoons([...sim.activeBoons]);
      setBoonReadyCount(sim.boonReadyCount);
      setBoonModalOpen(false);

      const p = sim.player;
      if (boonId === 'guanyin_ambrosia_gourd') {
        p.maxGourdSips += 1;
        p.gourdSips += 1;
      } else if (boonId === 'subhuti_astral_qi') {
        p.focusOrbs = Math.min(4, p.focusOrbs + 1);
      }

      const boonDef = getBoonById(boonId);
      soundEngine.playSpell('gourd');
      spawnShockwave(p.x, p.y, 145, '#ffd86b', 0.42);
      spawnParticles(p.x, p.y - 30, 28, '#ffd86b', 180, 4.5, 40);
      if (boonDef) {
        const patron = IMMORTAL_PATRONS[boonDef.patronId];
        spawnFloatingText(
          p.x,
          p.y - 88,
          `BOON CLAIMED: ${boonDef.name.toUpperCase()}`,
          patron.accentColor,
          1.2,
          patron.name
        );
      }

      // If another Boon/Astra is still queued, present the next choice immediately; otherwise advance if chamber is cleared
      const totalRemaining = sim.enemies.length + sim.pendingSpawns.length;
      if (sim.boonReadyCount > 0 && totalRemaining === 0 && sim.chamberClearTimer > 0) {
        const nextOffer = rollCelestialBoonOffer(sim.activeBoons);
        if (nextOffer.length > 0) {
          setBoonChoices(nextOffer);
          setBoonModalOpen(true);
          sim.modalPaused = true;
          return;
        } else {
          sim.boonReadyCount = 0;
          setBoonReadyCount(0);
        }
      }

      if (
        totalRemaining === 0 &&
        sim.chamberClearTimer > 0 &&
        sim.chamberIndex < CHAMBERS.length - 1
      ) {
        const prevIdx = sim.chamberIndex;
        loadChamber(prevIdx + 1, false);
        if (prevIdx === 0) {
          setSliceStage('savitri_lantern_interlude');
        } else if (prevIdx === 1) {
          setSliceStage('preserver_interlude');
        } else if (prevIdx === 3) {
          setSliceStage('dundubhi_aftermath');
        }
      }
    },
    [loadChamber, spawnFloatingText, spawnParticles, spawnShockwave]
  );

  const handleRerollBoons = useCallback(() => {
    const sim = simRef.current;
    if (sim.boonRerollsRemaining <= 0) return;
    sim.boonRerollsRemaining -= 1;
    setBoonRerolls(sim.boonRerollsRemaining);
    const offer = rollCelestialBoonOffer(sim.activeBoons);
    setBoonChoices(offer);
    soundEngine.playSpell('immobilize');
  }, []);

  // Preload all chamber backgrounds and character sprite sheets on mount
  const bgImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const chParam = Number(params.get('chamber'));
      const autostart = params.get('autostart') === '1' || params.get('autostart') === 'true';
      if (Number.isFinite(chParam) && chParam >= 1 && chParam <= CHAMBERS.length) {
        document.body.dataset.state = 'playing';
        requestAnimationFrame(() => startGameAtChamber(chParam - 1));
      } else if (autostart) {
        document.body.dataset.state = 'playing';
        requestAnimationFrame(() => startGameAtChamber(0));
      } else {
        document.body.dataset.state = 'title';
        requestAnimationFrame(() => {
          loadChamber(0, true);
          soundEngine.startMusic();
          soundEngine.syncBgmState('title', 1, false);
        });
      }
    }

    const loadBgWithRetry = (url: string, attempt = 0) => {
      if (bgImagesRef.current.has(url)) {
        const existing = bgImagesRef.current.get(url)!;
        if (existing.complete && existing.naturalWidth > 0) return;
      }
      const img = new Image();
      if (/^https?:\/\//i.test(url)) {
        img.crossOrigin = 'anonymous';
      }
      img.onerror = () => {
        if (attempt < 3) {
          window.setTimeout(() => loadBgWithRetry(url, attempt + 1), 700 * (attempt + 1));
        }
      };
      img.src = url;
      bgImagesRef.current.set(url, img);
    };

    // Lightweight startup asset loading: preload only Title Screen + Chamber 1 & 2 backgrounds (other chambers lazy-load on transition)
    loadBgWithRetry(GAME_ASSETS.titleBackdrop);
    loadBgWithRetry(GAME_ASSETS.deathBackdrop);
    loadBgWithRetry(GAME_ASSETS.eclipsePortrait);

    CHAMBERS.slice(0, 2).forEach((c) => {
      loadBgWithRetry(c.backgroundUrl);
      if (c.unlockedBackgroundUrl) {
        loadBgWithRetry(c.unlockedBackgroundUrl);
      }
    });

    // Preload 5 bespoke 3D architectural prop sprites with 'prop' mode to preserve full aspect ratio
    Object.values(GAME_ASSETS.kaliyugaProps).forEach((url) => {
      loadAndProcessSprite(url, {
        removeBlackBg: true,
        stripCornerWatermark: true,
        frameCount: 1,
        mode: 'prop',
        gridLayout: '1xN',
      });
    });

    // Preload initial Chamber 1 & 2 Multi-Row Green-Screen Enemy Sprite Sheets (remaining sheets load on-demand per chamber)
    const initialMultiRowSheets: string[] = [
      GAME_ASSETS.enemySheets.bronzeSpearmanSheet,
      GAME_ASSETS.enemySheets.ghoulSheet,
      GAME_ASSETS.enemySheets.undeadWarriorSheet,
      GAME_ASSETS.enemySheets.hoodedMageSheet,
      GAME_ASSETS.enemySheets.fantasyKnightSheet,
    ];
    initialMultiRowSheets.forEach((url) => {
      loadAndProcessSprite(url, {
        mode: 'character',
        gridLayout: 'multirow',
      });
    });

    // Preload 4x1 Animated Roaring Agni Brazier Flame Flipbook
    loadAndProcessSprite(GAME_ASSETS.brazierFlame4x1, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'vfx',
      gridLayout: '1xN',
    });

    // Preload Bespoke Uploaded AAA Combat Slash Arcs, Molten Crater Decal & Blazing Agneyastra Fire-Arrow Sprites
    loadAndProcessSprite(GAME_ASSETS.bespokeSlashArc, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 1,
      mode: 'vfx',
      gridLayout: '1xN',
    });
    loadAndProcessSprite(GAME_ASSETS.agniSlashArcAlt, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 1,
      mode: 'vfx',
      gridLayout: '1xN',
    });
    loadAndProcessSprite(GAME_ASSETS.moltenCraterDecal, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 1,
      mode: 'vfx',
      gridLayout: '1xN',
    });
    loadAndProcessSprite(GAME_ASSETS.agneyastraArrow, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 1,
      mode: 'vfx',
      gridLayout: '1xN',
    });

    // Load ground telegraphs, 2x2 Vedic Combat VFX, Aghori Skull/Lotus VFX, Ground Ruptures, Lion Pillar/Traps, impacts & gates
    loadAndProcessSprite(GAME_ASSETS.vedicCombatVfx2x2, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'vfx',
      gridLayout: '2x2',
    });
    loadAndProcessSprite(GAME_ASSETS.vfxSkullAndLotus2x2, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'vfx',
      gridLayout: '2x2',
    });
    loadAndProcessSprite(GAME_ASSETS.groundDecals2x2, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'vfx',
      gridLayout: '2x2',
    });
    loadAndProcessSprite(GAME_ASSETS.groundRuptures2x2, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'vfx',
      gridLayout: '2x2',
    });
    loadAndProcessSprite(GAME_ASSETS.lionPillarAndTraps2x2, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'prop',
      gridLayout: '2x2',
    });
    loadAndProcessSprite(GAME_ASSETS.vfxSlash2x2, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'vfx',
      gridLayout: '2x2',
    });
    loadAndProcessSprite(GAME_ASSETS.combatImpacts2x2, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'vfx',
      gridLayout: '2x2',
    });
    loadAndProcessSprite(GAME_ASSETS.floorTraps2x2, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'prop',
      gridLayout: '2x2',
    });
    loadAndProcessSprite(GAME_ASSETS.exitGateArchways2x1, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 2,
      mode: 'prop',
      gridLayout: '1xN',
    });
    loadAndProcessSprite(GAME_ASSETS.gateOverlays2x2, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'vfx',
      gridLayout: '2x2',
    });
    loadAndProcessSprite(GAME_ASSETS.rewardOrbs2x2, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'vfx',
      gridLayout: '2x2',
    });
    loadAndProcessSprite(GAME_ASSETS.foregroundOverhangsA2x2, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'prop',
      gridLayout: '2x2',
    });
    loadAndProcessSprite(GAME_ASSETS.foregroundOverhangsB2x2, {
      removeBlackBg: true,
      stripCornerWatermark: true,
      frameCount: 4,
      mode: 'prop',
      gridLayout: '2x2',
    });

    // Expose frozen read-only diagnostic hook when not in strict production lock
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      (
        window as unknown as {
          __KALIYUGA_TEST__?: {
            startGameAtChamber: (idx: number) => void;
            getSnapshot: () => unknown;
          };
        }
      ).__KALIYUGA_TEST__ = Object.freeze({
        startGameAtChamber,
        getSnapshot: () =>
          Object.freeze({
            state: simRef.current.state,
            chamberIndex: simRef.current.chamberIndex,
            player: Object.freeze({ ...simRef.current.player }),
            wukongGoldFrames: getProcessedSpriteSync(GAME_ASSETS.rudra.idle)?.frames ?? null,
            wukongActionFrames: getProcessedSpriteSync(GAME_ASSETS.rudra.slash1)?.frames ?? null,
            propsFrames: getProcessedSpriteSync(GAME_ASSETS.kaliyugaProps.kurukshetraPillar)?.frames ?? null,
            intactProps: simRef.current.props.filter((pr) => !pr.destroyed).length,
            totalProps: simRef.current.props.length,
            enemies: simRef.current.enemies.map((e) =>
              Object.freeze({
                name: e.name,
                hp: e.hp,
                posture: e.posture,
                aiState: e.aiState,
                attackKind: e.attackKind,
                phase: e.phase,
              })
            ),
          }),
      });
    }

    return () => {
      soundEngine.stopMusic();
    };
  }, [startGameAtChamber]);

  // Action triggers (callable from keyboard, mouse, or HUD buttons)
  const triggerGourdHeal = useCallback(() => {
    const sim = simRef.current;
    const p = sim.player;
    if (sim.state !== 'playing') return;
    if (p.gourdSips <= 0) {
      spawnFloatingText(p.x, p.y - 70, 'AMRITA KALASHA EMPTY!', '#ff6b78', 0.9);
      return;
    }
    p.gourdSips -= 1;
    const boonMods = computeBoonModifiers(sim.activeBoons);
    const healRatio = 0.42 * (1 + boonMods.gourdInstantHealRatio);
    const heal = Math.round(p.maxHp * healRatio);
    p.hp = Math.min(p.maxHp, p.hp + heal);
    p.action = 'gourd';
    p.actionTimer = 0.42;
    p.actionDuration = 0.42;
    soundEngine.playSpell('gourd');
    spawnShockwave(p.x, p.y, 85, '#ffd86b', 0.35);
    spawnParticles(p.x, p.y - 30, 22, '#ffd86b', 130, 4.5, -60);
    spawnFloatingText(p.x, p.y - 75, `+${heal} HP · AMRITA KALASHA`, '#ffd86b', 1.1);
  }, [spawnFloatingText, spawnParticles, spawnShockwave]);

  const triggerSwitchStance = useCallback(
    (targetStance?: StaffStance) => {
      const sim = simRef.current;
      const p = sim.player;
      const next = targetStance ?? getNextStaffStance(p.stance);
      p.stance = next;
      const cfg = STANCE_CONFIGS[next];
      spawnShockwave(p.x, p.y, 64, '#f2c45a', 0.28);
      spawnParticles(p.x, p.y - 25, 10, '#f2c45a', 95, 3.5, 40);
      spawnFloatingText(p.x, p.y - 72, `${cfg.chineseName} · ${cfg.englishName.toUpperCase()}`, '#f2c45a', 1.0);
    },
    [spawnFloatingText, spawnParticles, spawnShockwave]
  );

  const triggerSwitchWeapon = useCallback(
    (weapon: WeaponId) => {
      const sim = simRef.current;
      const p = sim.player;
      p.weapon = weapon;
      const cfg = WEAPON_CONFIGS[weapon];
      spawnShockwave(p.x, p.y, 68, cfg.accentColor, 0.28);
      spawnParticles(p.x, p.y - 25, 10, cfg.accentColor, 95, 3.5, 40);
      spawnFloatingText(p.x, p.y - 72, `${cfg.chineseName} · ${cfg.englishName}`, cfg.accentColor, 0.95);
    },
    [spawnFloatingText, spawnParticles, spawnShockwave]
  );

  const triggerImmobilizeSpell = useCallback(() => {
    const sim = simRef.current;
    const p = sim.player;
    if (sim.state !== 'playing' || p.immobilizeCd > 0) return;
    const boonMods = computeBoonModifiers(sim.activeBoons);
    p.immobilizeCd = Number((7.5 * boonMods.spellCooldownMultiplier).toFixed(2));
    p.action = 'astra';
    p.actionTimer = 0.42;
    p.actionDuration = 0.42;
    soundEngine.playSpell('immobilize');
    spawnShockwave(p.x, p.y, 195, '#ff5e36', 0.40);

    // Fire Hades-Style Agneyastra Blood-Shard Cast Projectile toward cursor or nearest enemy!
    let aimX = sim.input.pointerX;
    let aimY = sim.input.pointerY;
    let nearestDist = 9999;
    sim.enemies.forEach((e) => {
      if (e.aiState === 'ko') return;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < nearestDist && d < 520) {
        nearestDist = d;
        aimX = e.x;
        aimY = e.y - 20;
      }
    });
    const castAngle = Math.atan2(aimY - p.y, aimX - p.x);
    p.facing = Math.cos(castAngle) >= 0 ? 1 : -1;
    const stats = computeDerivedPlayerStats(sim.ranks);

    const castProj = sim.projectiles.find((pr) => !pr.active);
    if (castProj) {
      castProj.active = true;
      castProj.x = p.x + Math.cos(castAngle) * 28;
      castProj.y = p.y - 24 + Math.sin(castAngle) * 18;
      castProj.vx = Math.cos(castAngle) * 640;
      castProj.vy = Math.sin(castAngle) * 640;
      castProj.radius = 15;
      castProj.damage = Math.round(92 * stats.damageMultiplier * boonMods.damageMultiplier);
      castProj.color = '#ff2a4b';
      castProj.life = 1.8;
      castProj.deflected = true;
      castProj.isPlayerCast = true;
    }

    let hitCount = 0;
    sim.enemies.forEach((e) => {
      if (e.aiState === 'ko') return;
      const dist = Math.hypot(e.x - p.x, e.y - p.y);
      if (dist <= 390) {
        const astraDmg = Math.round(78 * stats.damageMultiplier * boonMods.damageMultiplier);
        e.hp = Math.max(0, e.hp - astraDmg);
        e.immobilizedTimer = e.isBoss ? 3.2 : 4.2;
        e.scorchTimer = Math.max(e.scorchTimer, 3.5);
        e.lodgedCasts = Math.min(3, (e.lodgedCasts || 0) + 1);
        e.hitFlashTimer = 0.10;
        hitCount++;
        spawnShockwave(e.x, e.y, 96, '#ff2a4b', 0.38);
        spawnParticles(e.x, e.y - 40, 24, '#ff5e36', 165, 4.8, 20);
        // Sky-splitting Crimson-Gold Astra Lightning Bolt onto immobilized target!
        sim.lightningArcs.push({
          x1: e.x + (Math.random() - 0.5) * 90,
          y1: e.y - 480,
          x2: e.x,
          y2: e.y - 18,
          life: 0.34,
          maxLife: 0.34,
          color: '#ff6a33',
        });
        sim.lightningArcs.push({
          x1: p.x,
          y1: p.y - 32,
          x2: e.x,
          y2: e.y - 28,
          life: 0.28,
          maxLife: 0.28,
          color: '#ffd86b',
        });
        spawnFloatingText(
          e.x,
          e.y - 85,
          `BLOOD-SHARD LODGED -${astraDmg}! (+${Math.round(boonMods.castLodgedDamageBonus * 100)}% DMG TAKEN)`,
          '#ffd45e',
          1.12
        );
      }
    });

    if (hitCount === 0) {
      spawnFloatingText(p.x, p.y - 75, 'AGNEYASTRA · BLOOD-SHARD CAST!', '#ff5e36', 0.98);
    }
  }, [spawnFloatingText, spawnParticles, spawnShockwave]);

  const recordQuestEvent = useCallback(
    (questId: QuestId, amount = 1) => {
      const sim = simRef.current;
      const res = incrementQuestMetric(sim.questState, questId, amount);
      sim.questState = res.nextState;
      setQuestState(res.nextState);
      if (res.newlyCompleted) {
        soundEngine.playSpell('gourd');
        spawnFloatingText(
          sim.player.x,
          sim.player.y - 98,
          `BOUNTY COMPLETE: ${res.newlyCompleted.title.toUpperCase()}!`,
          '#3ee0a8',
          1.18,
          `CLAIM +${res.newlyCompleted.karmaReward} KARMA IN PARTY HUB [C]`
        );
      }
    },
    [spawnFloatingText]
  );

  const triggerPartyLinkStrike = useCallback(() => {
    const sim = simRef.current;
    const p = sim.player;
    if (sim.state !== 'playing' || sim.partyLinkCd > 0) return;

    const gearBonuses = computeEquippedGearBonuses(sim.equippedGear, sim.gearLevels);
    const cdBase = 10.5 / Math.max(1, gearBonuses.synergyGainMultiplier);
    sim.partyLinkCd = Number(Math.max(4.5, cdBase).toFixed(2));
    soundEngine.playSpell('clones');
    soundEngine.playHit('heavy');
    sim.hitstopTimer = 0.065;
    sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.62);
    sim.screenFlashAlpha = 0.22;
    sim.screenFlashColor = '#3ee0a8';

    recordQuestEvent('party_link_strikes', 1);

    sim.activeParty.forEach((compId, idx) => {
      const spec = COMPANION_SPECS[compId];
      const bondRank = sim.companionBonds[compId] ?? 1;
      const cStats = computeCompanionStats(compId, bondRank);
      const compEntity = sim.companions.find((c) => c.id === compId);
      const originX = compEntity ? compEntity.x : p.x + (idx === 0 ? -48 : 48);
      const originY = compEntity ? compEntity.y : p.y + (idx === 0 ? -32 : 32);

      if (compId === 'savitri') {
        // Savitri Link Ultimate: Lotus Sanctuary Nova (Heals Rudra & Party + Invulnerability Ward + Radial Blast)
        p.hp = Math.min(p.maxHp, p.hp + cStats.healPower);
        p.invulnTimer = Math.max(p.invulnTimer, 2.4);
        sim.companions.forEach((c) => {
          c.hp = c.maxHp;
        });
        spawnShockwave(p.x, p.y, 185, '#3ee0a8', 0.44);
        spawnParticles(p.x, p.y - 24, 28, '#3ee0a8', 210, 4.8, 45);
        sim.enemies.forEach((e) => {
          if (e.aiState === 'ko') return;
          if (Math.hypot(e.x - p.x, e.y - p.y) <= 215) {
            e.hp = Math.max(0, e.hp - cStats.attackDamage * 2);
            e.hitFlashTimer = 0.09;
          }
        });
      } else if (compId === 'sanjaya') {
        // Sanjaya Link Ultimate: Agneyastra Arrow Storm across all enemies in arena!
        spawnShockwave(originX, originY, 155, '#38bdf8', 0.38);
        sim.enemies.forEach((e) => {
          if (e.aiState === 'ko') return;
          const arrowDmg = Math.round(cStats.attackDamage * 2.35);
          e.hp = Math.max(0, e.hp - arrowDmg);
          e.scorchTimer = Math.max(e.scorchTimer, 4.5);
          e.hitFlashTimer = 0.1;
          const posRes = applyPostureDamage({
            currentPosture: e.posture,
            maxPosture: e.maxPosture,
            postureDamage: cStats.postureDamage * 2,
            alreadyBroken: e.postureBrokenTimer > 0,
          });
          e.posture = posRes.nextPosture;
          if (posRes.triggeredBreak) {
            e.postureBrokenTimer = 4.5;
            e.aiState = 'recover';
            e.aiTimer = 4.5;
            recordQuestEvent('shatter_posture', 1);
          }
          sim.lightningArcs.push({
            x1: e.x + (Math.random() - 0.5) * 60,
            y1: e.y - 460,
            x2: e.x,
            y2: e.y - 18,
            life: 0.34,
            maxLife: 0.34,
            color: '#38bdf8',
          });
          spawnParticles(e.x, e.y - 24, 14, '#38bdf8', 180, 4.2, 90);
        });
      } else if (compId === 'vishnu_guardian') {
        // Sudarshana Sentinel Link Ultimate: Chakra Cataclysm Slam (Crushes shields & posture!)
        const target =
          sim.enemies.find((e) => e.isBoss && e.aiState !== 'ko') ||
          sim.enemies.find((e) => e.aiState !== 'ko');
        const slamX = target ? target.x : p.x + p.facing * 72;
        const slamY = target ? target.y : p.y;
        if (compEntity) {
          compEntity.x = slamX - 34;
          compEntity.y = slamY + 8;
        }
        spawnShockwave(slamX, slamY, 225, '#f5c451', 0.45);
        spawnParticles(slamX, slamY - 24, 32, '#f5c451', 240, 5.2, 110);
        sim.enemies.forEach((e) => {
          if (e.aiState === 'ko') return;
          if (Math.hypot(e.x - slamX, e.y - slamY) <= 245) {
            if (e.type === 'xuemo') e.armorCracked = true;
            e.hp = Math.max(0, e.hp - Math.round(cStats.attackDamage * 2.6));
            const posRes = applyPostureDamage({
              currentPosture: e.posture,
              maxPosture: e.maxPosture,
              postureDamage: cStats.postureDamage * 2.5,
              alreadyBroken: e.postureBrokenTimer > 0,
            });
            e.posture = posRes.nextPosture;
            if (posRes.triggeredBreak) {
              e.postureBrokenTimer = 4.5;
              e.aiState = 'recover';
              e.aiTimer = 4.5;
              recordQuestEvent('shatter_posture', 1);
            }
          }
        });
      }

      spawnFloatingText(
        originX,
        originY - 78 - idx * 24,
        `${spec.name.toUpperCase()}: ${spec.linkUltimateName}!`,
        spec.accentColor,
        1.16
      );
    });
  }, [recordQuestEvent, spawnFloatingText, spawnParticles, spawnShockwave]);

  const handleToggleCompanionInParty = useCallback((_compId: CompanionId) => {
    const sim = simRef.current;
    sim.activeParty = [];
    setActiveParty([]);
    sim.companions = [];
  }, []);

  const handleUpgradeCompanionBond = useCallback((compId: CompanionId) => {
    const sim = simRef.current;
    const res = upgradeCompanionBond(compId, sim.companionBonds, sim.ashenKarma);
    if (!res.upgraded) return;
    sim.companionBonds = res.bonds;
    sim.ashenKarma = res.availableKarma;
    setCompanionBonds({ ...res.bonds });
    setAshenKarma(res.availableKarma);
    sim.companions.forEach((c) => {
      if (c.id === compId) {
        const st = computeCompanionStats(compId, res.bonds[compId]);
        c.maxHp = st.maxHp;
        c.hp = st.maxHp;
      }
    });
    soundEngine.playSpell('gourd');
  }, []);

  const handleChangePartyTactic = useCallback((tactic: PartyTacticMode) => {
    simRef.current.partyTactic = tactic;
    setPartyTactic(tactic);
    soundEngine.playSwing('light');
  }, []);

  const handleEquipGear = useCallback((slot: GearSlot, itemId: string) => {
    const sim = simRef.current;
    const nextEquipped = { ...sim.equippedGear, [slot]: itemId };
    sim.equippedGear = nextEquipped;
    setEquippedGear(nextEquipped);
    const derived = computeDerivedPlayerStats(sim.ranks);
    const gearBonuses = computeEquippedGearBonuses(nextEquipped, sim.gearLevels);
    const levelInfo = computePlayerLevelFromXp(sim.playerXp);
    const nextMaxHp = derived.maxHp + gearBonuses.bonusMaxHp + levelInfo.bonusMaxHp;
    sim.player.maxHp = nextMaxHp;
    sim.player.hp = Math.min(nextMaxHp, sim.player.hp + 15);
    sim.player.displayHp = sim.player.hp;
    soundEngine.playSpell('parry');
  }, []);

  const handleUpgradeGear = useCallback((itemId: string) => {
    const sim = simRef.current;
    const res = upgradeGearItem(itemId, sim.gearLevels, sim.ashenKarma);
    if (!res.upgraded) return;
    sim.gearLevels = res.levels;
    sim.ashenKarma = res.availableKarma;
    setGearLevels({ ...res.levels });
    setAshenKarma(res.availableKarma);
    const derived = computeDerivedPlayerStats(sim.ranks);
    const gearBonuses = computeEquippedGearBonuses(sim.equippedGear, res.levels);
    const levelInfo = computePlayerLevelFromXp(sim.playerXp);
    const nextMaxHp = derived.maxHp + gearBonuses.bonusMaxHp + levelInfo.bonusMaxHp;
    sim.player.maxHp = nextMaxHp;
    sim.player.hp = Math.min(nextMaxHp, sim.player.hp + 12);
    sim.player.displayHp = sim.player.hp;
    soundEngine.playSpell('gourd');
  }, []);

  const handleClaimQuest = useCallback(
    (questId: QuestId) => {
      const sim = simRef.current;
      const res = claimQuestReward(sim.questState, questId, sim.ashenKarma, sim.playerXp);
      if (!res.claimed) return;
      sim.questState = res.nextState;
      sim.ashenKarma = res.availableKarma;
      sim.playerXp = res.nextXp;
      setQuestState({ ...res.nextState });
      setAshenKarma(res.availableKarma);
      setPlayerXp(res.nextXp);
      const derived = computeDerivedPlayerStats(sim.ranks);
      const gearBonuses = computeEquippedGearBonuses(sim.equippedGear, sim.gearLevels);
      const levelInfo = computePlayerLevelFromXp(res.nextXp);
      sim.player.maxHp = derived.maxHp + gearBonuses.bonusMaxHp + levelInfo.bonusMaxHp;
      sim.player.hp = sim.player.maxHp;
      sim.player.displayHp = sim.player.hp;
      soundEngine.playSpell('gourd');
      spawnFloatingText(
        sim.player.x,
        sim.player.y - 92,
        `QUEST REWARD CLAIMED! · LEVEL ${levelInfo.level}`,
        '#ffd86b',
        1.2
      );
    },
    [spawnFloatingText]
  );

  const handleUpdateModernSettings = useCallback((patch: Partial<ModernGameSettings>) => {
    setModernSettings((prev) => {
      const next = { ...prev, ...patch };
      simRef.current.modernSettings = next;
      return next;
    });
  }, []);

  const handleUpgradeWeaponAspect = useCallback(
    (weapon: WeaponId) => {
      const sim = simRef.current;
      const res = upgradeWeaponAspectRank(weapon, sim.weaponAspectRanks, sim.ashenKarma);
      if (!res.upgraded) return;
      sim.weaponAspectRanks = res.ranks;
      sim.ashenKarma = res.availableKarma;
      setWeaponAspectRanks({ ...res.ranks });
      setAshenKarma(res.availableKarma);
      soundEngine.playSpell('gourd');
      const aspectMod = computeWeaponAspectBonuses(weapon, res.ranks);
      spawnFloatingText(
        sim.player.x,
        sim.player.y - 88,
        `${aspectMod.aspectSpec.aspectName.toUpperCase()} · RANK ${res.ranks[weapon]}/5!`,
        '#ffd86b',
        1.15
      );
    },
    [spawnFloatingText]
  );

  const handleToggleCalamityOath = useCallback(
    (oathId: CalamityOathId) => {
      const sim = simRef.current;
      const exists = sim.activeCalamityOaths.includes(oathId);
      const next = exists
        ? sim.activeCalamityOaths.filter((id) => id !== oathId)
        : [...sim.activeCalamityOaths, oathId];
      sim.activeCalamityOaths = next;
      setActiveCalamityOaths(next);
      soundEngine.playGong('chamber');
      const pactMods = computeCalamityPactModifiers(next);
      spawnFloatingText(
        sim.player.x,
        sim.player.y - 88,
        `CALAMITY HEAT ${pactMods.totalHeat} · KARMA ×${pactMods.karmaAndXpMultiplier.toFixed(2)}`,
        '#ff6a33',
        1.12
      );
    },
    [spawnFloatingText]
  );

  const handleInspectLookArtifact = useCallback(
    (lookObj: LookObjectSpec) => {
      const sim = simRef.current;
      sim.activeLookObject = lookObj;
      setActiveLookModal(lookObj);
      setPartyModalOpen(false);
      soundEngine.playLookRoomTone();
      soundEngine.playSuvarnaLullaby();

      const alreadyInspected = sim.storyFlags.looks.includes(lookObj.id);
      if (!alreadyInspected) {
        const nextLooks = [...sim.storyFlags.looks, lookObj.id];
        updateStoryFlags({ looks: nextLooks });
        sim.ashenKarma += lookObj.karmaReward;
        sim.karmaRunDelta += lookObj.karmaReward;
        setAshenKarma(sim.ashenKarma);
        spawnFloatingText(
          sim.player.x,
          sim.player.y - 92,
          `[LOOK] ${lookObj.title.toUpperCase()} (+${lookObj.karmaReward} KARMA)`,
          '#ffd86b',
          1.18,
          `LOOKS RECORDED: ${nextLooks.length}/6`
        );
      }
    },
    [spawnFloatingText, updateStoryFlags]
  );

  const addStylePoints = useCallback((pts: number) => {
    const sim = simRef.current;
    sim.player.stylePoints = Math.min(1200, sim.player.stylePoints + pts);
    sim.player.styleDecayTimer = 5.5;
  }, []);

  const triggerRockSolidParry = useCallback(() => {
    const sim = simRef.current;
    const p = sim.player;
    if (sim.state !== 'playing' || p.parryCd > 0) return;
    const boonMods = computeBoonModifiers(sim.activeBoons);
    p.parryCd = Number((3.2 * boonMods.spellCooldownMultiplier).toFixed(2));
    p.action = 'parry';
    p.actionTimer = 0.62;
    p.actionDuration = 0.62;
    p.parryElapsedSec = 0;
    p.invulnTimer = Math.max(p.invulnTimer, 0.32);
    recordQuestEvent('kalaripayattu_parries', 1);
    soundEngine.playSpell('parry');
    spawnShockwave(p.x, p.y, 122, '#ffd86b', 0.34);
    spawnParticles(p.x, p.y - 28, 24, '#ffd86b', 165, 4.4, 80);

    // Proactive God-of-War / Sekiro Instant Golden Deflect if an enemy is winding up a parriable strike within 215px!
    let instantDeflected = false;
    sim.enemies.forEach((e) => {
      if (e.aiState === 'ko') return;
      const dist = Math.hypot(e.x - p.x, e.y - p.y);
      if (
        dist <= 215 &&
        (e.aiState === 'attack' || (e.aiState === 'windup' && e.aiTimer <= 0.42)) &&
        e.attackKind !== 'shockwave'
      ) {
        instantDeflected = true;
        const evalRes = evaluateParryImpact({
          parryElapsedSec: 0.05,
          incomingDamage: 45,
          attackerMaxPosture: e.maxPosture,
          isUnblockableCrimsonAttack: false,
        });
        const posDmg = Math.round(evalRes.postureDamageDealt * boonMods.postureDamageMultiplier);
        e.posture = Math.max(0, e.posture - posDmg);
        e.hitFlashTimer = 0.16;
        e.comboHitsRemaining = 0;
        e.aiState = 'recover';
        e.aiTimer = 1.65;
        if (e.posture <= 0) {
          e.postureBrokenTimer = 4.5;
          recordQuestEvent('shatter_posture', 1);
          spawnFloatingText(e.x, e.y - 88, 'POSTURE SHATTERED! [F] EXECUTE', '#ff4d3b', 1.24);
        }
        sim.lightningArcs.push({
          x1: p.x,
          y1: p.y - 30,
          x2: e.x,
          y2: e.y - 28,
          life: 0.32,
          maxLife: 0.32,
          color: '#ffd86b',
        });
      }
    });

    // Also reflect any incoming enemy projectiles within 145px back at 2.4x velocity!
    sim.projectiles.forEach((proj) => {
      if (!proj.active || proj.deflected) return;
      if (Math.hypot(proj.x - p.x, proj.y - p.y) <= 145) {
        proj.deflected = true;
        proj.vx = -proj.vx * 2.2;
        proj.vy = -proj.vy * 2.2;
        proj.damage = Math.round(proj.damage * 2.6);
        proj.life = 2.2;
        instantDeflected = true;
      }
    });

    if (instantDeflected) {
      // Refund Parry Cooldown on Perfect Golden Deflect + Open God-of-War Riposte Window!
      p.parryCd = 0.35;
      p.riposteWindowTimer = 2.4;
      p.invulnTimer = Math.max(p.invulnTimer, 0.85);
      p.hp = Math.min(p.maxHp, p.hp + 14);
      if (p.focusOrbs < 4) p.focusOrbs += 1;
      addStylePoints(145);
      sim.hitstopTimer = 0.095;
      sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.62);
      sim.screenFlashAlpha = 0.24;
      sim.screenFlashColor = '#ffd86b';
      soundEngine.playSpatialMaterialFoley('golden_parry', p.x, p.y, p.x, p.y, sim.viewportW);
      spawnShockwave(p.x, p.y, 175, '#ffd86b', 0.42);
      spawnFloatingText(
        p.x,
        p.y - 86,
        'PERFECT GOLDEN PARRY! · RIPOSTE READY [LMB/RMB]',
        '#ffd86b',
        1.24,
        '+1 FOCUS ORB · +14 HP · PARRY RESET'
      );
    } else {
      addStylePoints(25);
      spawnFloatingText(
        p.x,
        p.y - 75,
        'KALARIPAYATTU · VAJRA PARRY STANCE [Q]',
        '#f5ebd6',
        1.05
      );
    }
  }, [addStylePoints, recordQuestEvent, spawnFloatingText, spawnParticles, spawnShockwave]);

  // Prince of Persia: Sands of Time Temporal Rewind (`[T]`)
  const triggerKalaRewind = useCallback(() => {
    const sim = simRef.current;
    const p = sim.player;
    if (sim.state !== 'playing' || p.kalaRewindCd > 0) return;

    const rewind = computeKalaRewindState(p.temporalBuffer, p.x, p.y, p.hp, p.maxHp);
    p.kalaRewindCd = 9.0;
    const startX = p.x;
    const startY = p.y;

    // Spawn 5 golden hourglass reversal echoes along the temporal path
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      spawnAfterimage(
        GAME_ASSETS.rudra.run,
        0,
        startX + (rewind.targetX - startX) * t,
        startY + (rewind.targetY - startY) * t,
        46,
        p.facing,
        12 * Math.sin(t * Math.PI),
        i % 2 === 0 ? 'gold' : 'jade',
        0.38 + i * 0.06
      );
    }

    // Leave a Chrono-Slow Rift at the departure point that freezes/slows nearby enemies
    spawnShockwave(startX, startY, rewind.chronoSlowRadiusPx, '#38bdf8', 0.48);
    sim.enemies.forEach((e) => {
      if (e.aiState === 'ko') return;
      if (Math.hypot(e.x - startX, e.y - startY) <= rewind.chronoSlowRadiusPx) {
        e.immobilizedTimer = Math.max(e.immobilizedTimer, 2.6);
        e.hitFlashTimer = 0.14;
      }
    });

    p.x = rewind.targetX;
    p.y = rewind.targetY;
    p.hp = rewind.restoredHp;
    p.displayHp = p.hp;
    p.invulnTimer = Math.max(p.invulnTimer, 1.15);
    p.action = 'idle';
    addStylePoints(110);
    sim.slowMoTimer = Math.max(sim.slowMoTimer, 0.32);
    sim.screenFlashAlpha = 0.24;
    sim.screenFlashColor = '#38bdf8';
    soundEngine.playSpell('immobilize');
    soundEngine.playSpatialMaterialFoley('astral_spell', p.x, p.y, p.x, p.y, sim.viewportW);
    spawnShockwave(p.x, p.y, 165, '#ffd86b', 0.42);
    spawnParticles(p.x, p.y - 24, 28, '#38bdf8', 210, 4.6, 40);
    spawnFloatingText(
      p.x,
      p.y - 88,
      `KALA-SANDS REWIND! (+${rewind.hpRecoveredDelta} HP RESTORED)`,
      '#63f2ff',
      1.22,
      'TIME REVERSED 3.0s · FOES CHRONO-LOCKED'
    );
  }, [addStylePoints, spawnAfterimage, spawnFloatingText, spawnParticles, spawnShockwave]);

  // Assassin's Creed: Shadow Prana Blink & Chain-Assassination (`[V]`)
  const triggerShadowBlinkAssassinate = useCallback(() => {
    const sim = simRef.current;
    const p = sim.player;
    if (sim.state !== 'playing' || p.shadowBlinkCd > 0) return;

    const living = sim.enemies.filter((e) => e.aiState !== 'ko');
    if (living.length === 0) return;

    const stats = computeDerivedPlayerStats(sim.ranks);
    const gearBonuses = computeEquippedGearBonuses(sim.equippedGear, sim.gearLevels);
    const styleStatus = computeCombatStyleStatus(p.stylePoints);
    const baseDmg = Math.round(
      58 *
        stats.damageMultiplier *
        gearBonuses.damageMultiplier *
        styleStatus.damageBonusMultiplier
    );

    const plan = planShadowAssassination(
      p.x,
      p.y,
      baseDmg,
      living.map((e) => ({
        id: e.id,
        x: e.x,
        y: e.y,
        hp: e.hp,
        maxHp: e.maxHp,
        posture: e.posture,
        maxPosture: e.maxPosture,
        facing: e.facing,
        isBoss: e.isBoss,
        postureBroken: e.postureBrokenTimer > 0,
      }))
    );

    const target = living.find((e) => e.id === plan.targetId);
    if (!target) return;

    // Spawn crimson-jade smoke trail along the shadow blink path
    const startX = p.x;
    const startY = p.y;
    for (let s = 0; s < 4; s++) {
      const t = s / 3;
      spawnAfterimage(
        GAME_ASSETS.rudra.slash2,
        0,
        startX + (plan.blinkX - startX) * t,
        startY + (plan.blinkY - startY) * t,
        44,
        plan.newFacing,
        8 * Math.sin(t * Math.PI),
        'jade',
        0.3 + s * 0.05
      );
    }

    p.x = plan.blinkX;
    p.y = plan.blinkY;
    p.facing = plan.newFacing;
    p.action = 'execute';
    p.actionTimer = 0.32;
    p.actionDuration = 0.32;
    p.invulnTimer = Math.max(p.invulnTimer, 0.78);
    p.slashAngle = p.facing === 1 ? 0 : Math.PI;
    p.slashArcAlpha = 1.0;

    target.hp = Math.max(0, target.hp - plan.damage);
    target.hitFlashTimer = 0.14;
    const posRes = applyPostureDamage({
      currentPosture: target.posture,
      maxPosture: target.maxPosture,
      postureDamage: plan.postureDamage,
      alreadyBroken: target.postureBrokenTimer > 0,
    });
    target.posture = posRes.nextPosture;
    if (posRes.triggeredBreak) {
      target.postureBrokenTimer = 4.5;
      target.aiState = 'recover';
      target.aiTimer = 4.5;
      recordQuestEvent('shatter_posture', 1);
    }

    const resetTriggered = target.hp <= 0 || posRes.triggeredBreak;
    p.shadowBlinkCd = resetTriggered ? 0.25 : 6.0;
    addStylePoints(resetTriggered ? 150 : 95);
    sim.comboCount += 2;
    sim.comboResetTimer = 4.5;
    sim.hitstopTimer = 0.07;
    sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.58);
    soundEngine.playHit('execute');
    spawnShockwave(target.x, target.y, 145, '#3ee0a8', 0.38);
    spawnParticles(target.x, target.y - 26, 28, '#3ee0a8', 220, 4.8, 90);
    spawnParticles(target.x, target.y - 26, 18, '#ff2a4b', 195, 4.4, 80);
    sim.battleScars = spawnBattleScar(sim.battleScars, {
      id: ++sim.nextScarId,
      kind: 'blood_splatter',
      x: target.x,
      y: target.y + 4,
      angle: p.slashAngle,
      scale: 1.25,
    });

    spawnFloatingText(
      target.x,
      target.y - 88,
      resetTriggered
        ? `SHADOW ASSASSINATION -${plan.damage}! · CHAIN RESET [V]!`
        : `SHADOW BACKSTAB -${plan.damage}!`,
      '#3ee0a8',
      1.22,
      resetTriggered ? 'PRESS [V] IMMEDIATELY TO CHAIN BLINK' : undefined
    );
  }, [addStylePoints, recordQuestEvent, spawnAfterimage, spawnFloatingText, spawnParticles, spawnShockwave]);

  const triggerPluckOfManyClones = useCallback(() => {
    const sim = simRef.current;
    const p = sim.player;
    if (sim.state !== 'playing' || p.clonesCd > 0) return;
    const boonMods = computeBoonModifiers(sim.activeBoons);
    p.clonesCd = Number((14.0 * boonMods.spellCooldownMultiplier).toFixed(2));
    soundEngine.playSpell('clones');
    spawnShockwave(p.x, p.y, 130, '#ffcf66', 0.38);

    const offsets = [
      { dx: -52, dy: -24 },
      { dx: 52, dy: 24 },
    ];
    offsets.forEach((off, idx) => {
      sim.clones.push({
        id: Date.now() + idx,
        x: p.x + off.dx,
        y: p.y + off.dy,
        facing: p.facing,
        life: 12.0,
        maxLife: 12.0,
        attackCooldown: 0.25 + idx * 0.2,
        animTime: idx * 1.5,
      });
      spawnAfterimage(
        GAME_ASSETS.rudra.slash1,
        0,
        p.x + off.dx,
        p.y + off.dy,
        42,
        p.facing,
        0,
        'gold',
        0.32
      );
      spawnParticles(p.x + off.dx, p.y + off.dy - 20, 20, '#ffcf66', 140, 4.5, 40);
    });
    spawnFloatingText(p.x, p.y - 82, 'MAYA ASTRA · ASHEN PHANTOMS!', '#ffcf66', 1.15);
  }, [spawnAfterimage, spawnFloatingText, spawnParticles, spawnShockwave]);

  // v7 Section 5 & 31: One-Button [E] Look System (pauses nothing in combat; cuts music to room tone; awards Ashen Karma; records Look flag)
  const triggerLookOrMirage = useCallback(() => {
    const sim = simRef.current;
    if (sim.state !== 'playing') return;

    if (sim.activeLookObject) {
      sim.activeLookObject = null;
      setActiveLookModal(null);
      return;
    }

    if (sim.nearestLookObject) {
      const lookObj = sim.nearestLookObject;
      sim.activeLookObject = lookObj;
      setActiveLookModal(lookObj);
      soundEngine.playLookRoomTone();
      soundEngine.playSuvarnaLullaby();

      const alreadyInspected = sim.storyFlags.looks.includes(lookObj.id);
      if (!alreadyInspected) {
        const nextLooks = [...sim.storyFlags.looks, lookObj.id];
        updateStoryFlags({ looks: nextLooks });
        sim.ashenKarma += lookObj.karmaReward;
        sim.karmaRunDelta += lookObj.karmaReward;
        setAshenKarma(sim.ashenKarma);
        try {
          window.localStorage.setItem(
            'kaliyuga_save_v1',
            JSON.stringify({ ashenKarma: sim.ashenKarma, ranks: sim.ranks })
          );
        } catch {}
        spawnFloatingText(
          sim.player.x,
          sim.player.y - 92,
          `[LOOK] ${lookObj.title.toUpperCase()} (+${lookObj.karmaReward} KARMA)`,
          '#ffd86b',
          1.18,
          `LOOKS RECORDED: ${nextLooks.length}/6`
        );
      } else {
        spawnFloatingText(
          sim.player.x,
          sim.player.y - 88,
          `[LOOK] ${lookObj.title.toUpperCase()}`,
          '#f3e5ab',
          1.05
        );
      }
      return;
    }

    triggerPluckOfManyClones();
  }, [spawnFloatingText, triggerPluckOfManyClones, updateStoryFlags]);

  const triggerRedTidesTransform = useCallback(() => {
    const sim = simRef.current;
    const p = sim.player;
    if (sim.state !== 'playing' || p.transformCd > 0) return;
    const boonMods = computeBoonModifiers(sim.activeBoons);
    p.transformCd = Number((18.0 * boonMods.spellCooldownMultiplier).toFixed(2));
    p.transformTimer = 10.0;
    p.invulnTimer = Math.max(p.invulnTimer, 0.8);
    sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.45);
    sim.cameraZoom = BASE_CAMERA_ZOOM + 0.06;
    // v7 Section 13 & 27: Using Rudra-Kopa Rage dims Savitri's Lantern on the boat
    updateStoryFlags({ rageUses: sim.storyFlags.rageUses + 1 });
    soundEngine.playSpell('transform');
    spawnShockwave(p.x, p.y, 195, '#ff5924', 0.45);
    spawnParticles(p.x, p.y - 30, 32, '#ff5924', 210, 5.5, 60);
    spawnFloatingText(p.x, p.y - 88, 'RUDRA-KOPA AWAKENED! · LANTERN FLAME FLICKERS', '#ff6a33', 1.15);
  }, [spawnFloatingText, spawnParticles, spawnShockwave, updateStoryFlags]);

  const triggerExecuteBrokenTarget = useCallback(() => {
    const sim = simRef.current;
    const p = sim.player;
    if (sim.state !== 'playing') return;

    const brokenEnemy = sim.enemies.find(
      (e) => e.aiState !== 'ko' && e.postureBrokenTimer > 0
    );
    if (!brokenEnemy) return;
    recordQuestEvent('shatter_posture', 1);

    // Spawn golden dash afterimages along the teleport-lunge path
    for (let step = 0; step < 3; step++) {
      const t = step / 3;
      spawnAfterimage(
        GAME_ASSETS.rudra.slam,
        0,
        p.x + (brokenEnemy.x - p.x) * t,
        p.y + (brokenEnemy.y - p.y) * t,
        42,
        brokenEnemy.x >= p.x ? 1 : -1,
        10 * Math.sin(t * Math.PI),
        'gold',
        0.26 + step * 0.05
      );
    }

    // Teleport-lunge next to the Posture-Broken target and deliver fatal Execute
    p.facing = brokenEnemy.x >= p.x ? 1 : -1;
    p.x = brokenEnemy.x - p.facing * 48;
    p.y = brokenEnemy.y + 6;
    p.action = 'execute';
    p.actionTimer = 0.36;
    p.actionDuration = 0.36;
    // Extended Invulnerability Frames (1.15s) so Rudra can NEVER take swarm damage during or right after an Execute!
    p.invulnTimer = Math.max(p.invulnTimer, 1.15);
    p.scaleX = 1.05;
    p.scaleY = 0.96;
    p.slashAngle = p.facing === 1 ? 0 : Math.PI;
    p.slashArcAlpha = 1.0;
    p.weaponSwingProgress = 0.0;

    const stats = computeDerivedPlayerStats(sim.ranks);
    const execDmg = Math.round((brokenEnemy.isBoss ? 360 : 290) * stats.damageMultiplier);
    brokenEnemy.hp = Math.max(0, brokenEnemy.hp - execDmg);
    brokenEnemy.postureBrokenTimer = 0;
    brokenEnemy.posture = brokenEnemy.maxPosture;
    brokenEnemy.hitFlashTimer = 0.14;
    brokenEnemy.scaleX = 1.06;
    brokenEnemy.scaleY = 0.94;

    // Radial Prana Shockwave: staggers & knocks back all nearby enemies within 225px and vaporizes incoming projectiles!
    sim.enemies.forEach((other) => {
      if (other === brokenEnemy || other.aiState === 'ko') return;
      const distToExec = Math.hypot(other.x - brokenEnemy.x, other.y - brokenEnemy.y);
      if (distToExec <= 225) {
        const pushAngle = Math.atan2(other.y - brokenEnemy.y, other.x - brokenEnemy.x);
        const pushMag = other.isBoss ? 110 : 240;
        other.vx += Math.cos(pushAngle) * pushMag;
        other.vy += Math.sin(pushAngle) * pushMag;
        other.hitFlashTimer = 0.1;
        if (!other.isBoss) {
          other.aiState = 'recover';
          other.aiTimer = Math.max(other.aiTimer, 0.85);
        }
      }
    });
    sim.projectiles.forEach((proj) => {
      if (proj.active && Math.hypot(proj.x - brokenEnemy.x, proj.y - brokenEnemy.y) <= 230) {
        proj.active = false;
      }
    });

    sim.hitstopTimer = 0.075;
    sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.72);
    sim.cameraZoom = BASE_CAMERA_ZOOM + 0.055;
    sim.screenFlashAlpha = 0.22;
    sim.screenFlashColor = '#ff3824';
    sim.comboCount += 3;
    sim.comboResetTimer = 4.5;
    sim.score += 450;

    // Stamp molten cone slash decal at execution site
    sim.craters.push({
      x: brokenEnemy.x,
      y: brokenEnemy.y + 6,
      radius: 78,
      alpha: 0.92,
      decalFrame: 1,
      angle: p.slashAngle,
    });
    if (sim.craters.length > 10) sim.craters.shift();
    sim.battleScars = spawnBattleScar(sim.battleScars, {
      id: ++sim.nextScarId,
      kind: 'blood_splatter',
      x: brokenEnemy.x,
      y: brokenEnemy.y + 4,
      angle: p.slashAngle,
      scale: 1.45,
    });
    sim.battleScars = spawnBattleScar(sim.battleScars, {
      id: ++sim.nextScarId,
      kind: 'shattered_armor',
      x: brokenEnemy.x,
      y: brokenEnemy.y + 6,
      angle: p.slashAngle,
      scale: 1.2,
    });

    // Grant +1 Focus Orb and heal 28 HP on Execute
    p.hp = Math.min(p.maxHp, p.hp + 28);
    if (p.focusOrbs < 4) {
      p.focusOrbs = Math.min(4, p.focusOrbs + 1);
    }

    soundEngine.playHit('execute');
    spawnShockwave(brokenEnemy.x, brokenEnemy.y, 245, '#ff4d3b', 0.46);
    spawnParticles(brokenEnemy.x, brokenEnemy.y - 35, 38, '#ff3b24', 260, 5.5, 160);
    spawnParticles(brokenEnemy.x, brokenEnemy.y - 35, 24, '#ffd86b', 220, 4.5, 100);
    // Call down Twin Cataclysmic Sky-Splitting Vajra Lightning Bolts on Execute!
    for (let b = 0; b < 3; b++) {
      sim.lightningArcs.push({
        x1: brokenEnemy.x + (b - 1) * 110,
        y1: brokenEnemy.y - 540,
        x2: brokenEnemy.x + (b - 1) * 18,
        y2: brokenEnemy.y - 12,
        life: 0.38,
        maxLife: 0.38,
        color: b === 1 ? '#ffd86b' : '#ff4d3b',
      });
    }
    spawnFloatingText(
      brokenEnemy.x,
      brokenEnemy.y - 96,
      `EXECUTE -${execDmg}`,
      '#ff4d3b',
      1.25
    );
  }, [recordQuestEvent, spawnAfterimage, spawnFloatingText, spawnParticles, spawnShockwave]);

  const triggerStanceHeavyUnleash = useCallback(() => {
    const sim = simRef.current;
    const p = sim.player;
    if (sim.state !== 'playing') return;
    if (
      (p.action === 'heavy_unleash' && p.actionTimer > 0.08) ||
      (p.action === 'execute' && p.actionTimer > 0.05)
    ) {
      sim.input.bufferedAction = 'heavy';
      sim.input.bufferTimer = 0.18;
      return;
    }

    const boonMods = computeBoonModifiers(sim.activeBoons);
    const nearbyWindingUp = sim.enemies.some(
      (e) =>
        e.aiState !== 'ko' &&
        (e.aiState === 'windup' || e.aiState === 'attack') &&
        Math.hypot(e.x - p.x, e.y - p.y) <= 235
    );
    const seeThroughRes = evaluateSeeThroughOrRiposte({
      playerInLightCombo: p.action === 'light_attack' || p.comboWindowTimer > 0,
      nearbyEnemyWindingUp: nearbyWindingUp,
      focusOrbs: p.focusOrbs,
      riposteWindowActive: p.riposteWindowTimer > 0,
    });
    p.riposteWindowTimer = 0;

    const orbsUsed = Math.max(
      seeThroughRes.triggeredRiposteBurst || seeThroughRes.triggeredSeeThrough ? 2 : 0,
      p.focusOrbs
    );
    const heavySpec = computeGodOfWarHeavyStyleSpec(p.stance, orbsUsed);
    recordQuestEvent('unleash_heavy_styles', 1);
    p.focusOrbs = seeThroughRes.refundsFocusOrb ? Math.min(4, Math.max(1, p.focusOrbs)) : 0;
    p.focusProgress = 0;
    p.action = 'heavy_unleash';
    p.actionDuration = 0.44;
    p.actionTimer = 0.44;
    p.scaleX = p.stance === 'thrust' ? 1.18 : 0.92;
    p.scaleY = p.stance === 'thrust' ? 0.86 : 1.09;
    p.weaponSwingProgress = 0.0;
    p.elevationY = heavySpec.leapElevationPx;
    p.invulnTimer = Math.max(p.invulnTimer, seeThroughRes.invulnDurationSec);
    addStylePoints(
      seeThroughRes.triggeredRiposteBurst
        ? 140
        : seeThroughRes.triggeredSeeThrough
        ? 115
        : 65
    );

    // Auto-aim toward nearest enemy within 360px if pointer hasn't moved recently, else toward pointer
    let targetX = sim.input.pointerX;
    let targetY = sim.input.pointerY;
    let nearestDist = 9999;
    sim.enemies.forEach((e) => {
      if (e.aiState === 'ko') return;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < nearestDist && d < 360) {
        nearestDist = d;
        targetX = e.x;
        targetY = e.y;
      }
    });

    const dx = targetX - p.x;
    const dy = targetY - p.y;
    if (Math.abs(dx) > 4) p.facing = dx >= 0 ? 1 : -1;
    p.slashAngle = Math.atan2(dy, dx);
    p.slashArcAlpha = 1.0;

    // Lunge forward according to stance's God-of-War Heavy Style (Spartan Lunge for Thrust, Aerial Leap for Smash, Cyclone Step for Pillar)
    const dist = Math.hypot(dx, dy) || 1;
    const originX = p.x;
    const originY = p.y;
    p.vx = (dx / dist) * heavySpec.forwardLungePx * 4.6;
    p.vy = (dy / dist) * heavySpec.forwardLungePx * 4.6;

    if (heavySpec.styleId === 'brahmashira_lunge') {
      p.dashStartX = originX;
      p.dashStartY = originY;
      p.dashStreakAlpha = 0.95;
    }

    spawnAfterimage(
      p.stance === 'thrust' ? GAME_ASSETS.rudra.run : GAME_ASSETS.rudra.slam,
      0,
      p.x,
      p.y,
      46,
      p.facing,
      p.elevationY,
      p.stance === 'pillar' ? 'jade' : 'gold',
      0.34
    );

    const impactX = p.x + Math.cos(p.slashAngle) * (p.stance === 'thrust' ? 78 : 48);
    const impactY = p.y + Math.sin(p.slashAngle) * (p.stance === 'thrust' ? 48 : 30);

    if (heavySpec.styleId === 'pralaya_earth_shatter') {
      // God of War Smash Style: 3 Cascading Seismic Lava Shockwaves along aim vector!
      for (let waveIdx = 0; waveIdx < 3; waveIdx++) {
        const wx = impactX + Math.cos(p.slashAngle) * waveIdx * 62;
        const wy = impactY + Math.sin(p.slashAngle) * waveIdx * 42;
        spawnShockwave(
          wx,
          wy,
          115 + orbsUsed * 20 + waveIdx * 18,
          waveIdx === 0 ? '#ff2a3c' : '#ff9233',
          0.34 + waveIdx * 0.06
        );
        spawnParticles(wx, wy - 12, 16, '#ff6a2b', 210, 4.8, 140);
      }
    } else if (heavySpec.styleId === 'sudarshana_vortex') {
      // God of War Pillar Style: 360° Blazing Hurricane Vortex that pulls nearby foes inward!
      spawnShockwave(p.x, p.y, heavySpec.cleaveRadiusPx, '#38bdf8', 0.42);
      spawnShockwave(p.x, p.y, heavySpec.cleaveRadiusPx * 0.72, '#ffd86b', 0.32);
      sim.enemies.forEach((e) => {
        if (e.aiState === 'ko') return;
        const vDist = Math.hypot(e.x - p.x, e.y - p.y);
        if (vDist <= heavySpec.cleaveRadiusPx + 65 && vDist > 32) {
          const pullStrength = e.isBoss ? 0.28 : 0.56;
          e.x += (p.x - e.x) * pullStrength;
          e.y += (p.y - e.y) * pullStrength;
        }
      });
    } else {
      // God of War Thrust Style: Impaling Spartan Lunge + Piercing Agni Blood-Wave Projectile!
      spawnShockwave(impactX, impactY, 132 + orbsUsed * 18, '#ff4d3b', 0.36);
      spawnShockwave(originX, originY, 78, '#ffd86b', 0.26);
    }
    sim.battleScars = spawnBattleScar(sim.battleScars, {
      id: ++sim.nextScarId,
      kind: 'scorch_crater',
      x: impactX,
      y: impactY + 4,
      angle: p.slashAngle,
      scale: 0.95 + orbsUsed * 0.18,
    });

    // Fire Piercing Agni Blood-Wave Projectile when Thrust Heavy or 2+ Tapas Smash Heavy is unleashed!
    if (heavySpec.spawnsPiercingWave) {
      const waveProj = sim.projectiles.find((pr) => !pr.active);
      if (waveProj) {
        const stats = computeDerivedPlayerStats(sim.ranks);
        waveProj.active = true;
        waveProj.x = impactX;
        waveProj.y = impactY - 18;
        waveProj.vx = Math.cos(p.slashAngle) * 680;
        waveProj.vy = Math.sin(p.slashAngle) * 680;
        waveProj.radius = 20;
        waveProj.damage = Math.round((84 + orbsUsed * 28) * stats.damageMultiplier * boonMods.damageMultiplier);
        waveProj.color = '#ff4d3b';
        waveProj.life = 1.4;
        waveProj.deflected = true;
        waveProj.isPlayerCast = true;
      }
    }

    sim.cameraZoom = BASE_CAMERA_ZOOM + 0.06 + orbsUsed * 0.012;
    sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + heavySpec.cameraTrauma);
    sim.screenFlashAlpha = Math.max(sim.screenFlashAlpha, 0.14 + orbsUsed * 0.03);
    sim.screenFlashColor =
      p.stance === 'pillar' ? '#38bdf8' : orbsUsed >= 2 ? '#a855f7' : '#ff2a3c';

    spawnFloatingText(
      p.x,
      p.y - 84,
      seeThroughRes.calloutTitle || heavySpec.calloutTitle,
      seeThroughRes.triggeredRiposteBurst
        ? '#ffd86b'
        : seeThroughRes.triggeredSeeThrough
        ? '#3ee0a8'
        : p.stance === 'pillar'
        ? '#63f2ff'
        : '#ffd86b',
      1.2,
      heavySpec.calloutSubtitle
    );

    const stanceCfg = STANCE_CONFIGS[p.stance];
    const isResolute =
      seeThroughRes.triggeredSeeThrough ||
      seeThroughRes.triggeredRiposteBurst ||
      sim.enemies.some(
        (e) =>
          e.aiState === 'windup' &&
          Math.hypot(e.x - p.x, e.y - p.y) <= heavySpec.cleaveRadiusPx + 45
      );

    const baseDmg = calculateStanceHeavyDamage({
      stance: p.stance,
      focusOrbsConsumed: orbsUsed,
      weapon: p.weapon,
      ranks: sim.ranks,
      isResoluteCounter: isResolute,
    });
    const styleMult = computeCombatStyleStatus(p.stylePoints).damageBonusMultiplier;
    const aspectBonuses = computeWeaponAspectBonuses(p.weapon, sim.weaponAspectRanks);
    const relicSetRes = computeRelicSetResonance(sim.equippedGear);
    const dmg = {
      ...baseDmg,
      hpDamage: Math.round(
        baseDmg.hpDamage *
          seeThroughRes.damageMultiplier *
          styleMult *
          aspectBonuses.damageMultiplier *
          relicSetRes.setDamageBonusMultiplier +
          aspectBonuses.procDamage
      ),
      postureDamage: Math.round(
        (baseDmg.postureDamage + seeThroughRes.postureDamageBonus) *
          styleMult *
          aspectBonuses.postureMultiplier
      ),
    };

    if (orbsUsed > 0 && dmg.healAmount > 0) {
      p.hp = Math.min(p.maxHp, p.hp + dmg.healAmount);
    }

    // Ao Guang Boon: Dragon King's Vortex pulls enemies within 260px inward!
    if (boonMods.heavyVortexPull) {
      const vortexCenterX = p.x + Math.cos(p.slashAngle) * 52;
      const vortexCenterY = p.y + Math.sin(p.slashAngle) * 32;
      spawnShockwave(vortexCenterX, vortexCenterY, 220, '#38bdf8', 0.42);
      sim.enemies.forEach((e) => {
        if (e.aiState === 'ko') return;
        const vDist = Math.hypot(e.x - vortexCenterX, e.y - vortexCenterY);
        if (vDist <= 265 && vDist > 24) {
          const pullFactor = e.isBoss ? 0.35 : 0.65;
          e.x += (vortexCenterX - e.x) * pullFactor;
          e.y += (vortexCenterY - e.y) * pullFactor;
        }
      });
    }

    // Stamp hand-painted ground decal
    sim.craters.push({
      x: p.x + Math.cos(p.slashAngle) * (p.stance === 'thrust' ? 78 : 44),
      y: p.y + Math.sin(p.slashAngle) * 28 + 8,
      radius: 68 + orbsUsed * 14,
      alpha: 0.94,
      decalFrame: p.stance === 'pillar' ? 2 : 1,
      angle: p.slashAngle,
    });
    if (sim.craters.length > 10) sim.craters.shift();

    // Shatter destructible courtyard props in heavy stance range
    damagePropsNearPoint(p.x + p.facing * 36, p.y, heavySpec.cleaveRadiusPx, 120);

    soundEngine.playSwing('heavy');
    let hitAny = false;

    const corridorEndX = originX + Math.cos(p.slashAngle) * heavySpec.corridorLengthPx;
    const corridorEndY = originY + Math.sin(p.slashAngle) * heavySpec.corridorLengthPx;

    sim.enemies.forEach((e) => {
      if (e.aiState === 'ko') return;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      const inRadialCleave = d <= heavySpec.cleaveRadiusPx + (e.isBoss ? 48 : 28);
      const inThrustCorridor =
        heavySpec.corridorLengthPx > 0 &&
        isPointInDashCorridor({
          px: e.x,
          py: e.y,
          startX: originX,
          startY: originY,
          endX: corridorEndX,
          endY: corridorEndY,
          halfWidth: e.isBoss ? 68 : 54,
        });

      if (inRadialCleave || inThrustCorridor) {
        hitAny = true;
        const backstab = isShadowStrikeBackstab({
          playerX: p.x,
          enemyX: e.x,
          enemyFacing: e.facing,
        });
        const backstabMult = backstab ? boonMods.backstabMultiplier : 1.0;
        if (e.type === 'xuemo' && p.stance === 'smash' && orbsUsed >= 2) {
          e.armorCracked = true;
        }
        const bossVuln =
          e.isBoss && (e.type === 'xuemo' || e.type === 'vrikodara')
            ? computeBossVulnerabilityMultiplier({
                bossType: e.type,
                phase: e.phase,
                armorCracked: Boolean(e.armorCracked),
                tuskLodgedTimer: e.tuskLodgedTimer || 0,
                aiState: e.aiState,
              })
            : { damageMultiplier: 1.0, postureMultiplier: 1.0, vulnerabilityCallout: null };
        const lodgedCastMult = 1 + (e.lodgedCasts || 0) * boonMods.castLodgedDamageBonus;
        const mult =
          (p.transformTimer > 0 ? 1.3 : 1.0) *
          boonMods.heavyBonusMultiplier *
          backstabMult *
          bossVuln.damageMultiplier *
          lodgedCastMult;
        const hpLoss = Math.round(dmg.hpDamage * mult * (1 + boonMods.echoStrikeRatio));
        const posLoss = Math.round(
          dmg.postureDamage * mult * bossVuln.postureMultiplier * boonMods.postureDamageMultiplier
        );

        // Heavy Unleash shatters active Enemy Guard / Vajra Shields!
        const brokeGuard = e.parryStanceTimer > 0 || e.trait === 'vajra_shield';
        e.parryStanceTimer = 0;

        e.hp = Math.max(0, e.hp - hpLoss);
        e.hitFlashTimer = 0.12;
        e.scaleX = 1.14;
        e.scaleY = 0.86;

        if (boonMods.scorchDps > 0) {
          e.scorchTimer = 3.0;
        }

        // Knockback impulse (Pillar Vortex pulls slightly inward then staggers, Smash & Thrust launch outward)
        const kAngle = Math.atan2(e.y - p.y, e.x - p.x);
        const kb =
          p.stance === 'pillar'
            ? e.isBoss
              ? 35
              : 75
            : e.isBoss
            ? 95
            : 215;
        e.vx += Math.cos(kAngle) * kb;
        e.vy += Math.sin(kAngle) * kb;

        const posResult = applyPostureDamage({
          currentPosture: e.posture,
          maxPosture: e.maxPosture,
          postureDamage: brokeGuard ? Math.round(posLoss * 1.45) : posLoss,
          alreadyBroken: e.postureBrokenTimer > 0,
        });
        e.posture = posResult.nextPosture;
        if (posResult.triggeredBreak) {
          e.postureBrokenTimer = 4.5;
          e.aiState = 'recover';
          e.aiTimer = 4.5;
          spawnShockwave(e.x, e.y, 145, '#ff4d3b', 0.42);
          spawnFloatingText(
            e.x,
            e.y - 88,
            'POSTURE BROKEN! [F] EXECUTE',
            '#ff4d3b',
            1.22
          );
        }

        spawnParticles(e.x, e.y - 26, 34, '#ff2a3c', 260, 5.2, 160);
        spawnParticles(e.x, e.y - 22, 18, '#a855f7', 210, 4.2, 120);
        sim.lightningArcs.push({
          x1: e.x + (Math.random() - 0.5) * 95,
          y1: e.y - 490,
          x2: e.x,
          y2: e.y - 16,
          life: 0.34,
          maxLife: 0.34,
          color: p.stance === 'pillar' ? '#38bdf8' : '#a855f7',
        });
        sim.lightningArcs.push({
          x1: p.x,
          y1: p.y - 34,
          x2: e.x,
          y2: e.y - 28,
          life: 0.28,
          maxLife: 0.28,
          color: '#ff2a3c',
        });
        spawnFloatingText(
          e.x,
          e.y - 58,
          isResolute ? `COUNTER ${hpLoss}!` : brokeGuard ? `GUARD CRUSH ${hpLoss}!` : `${hpLoss}!`,
          '#ff4d3b',
          1.22,
          e.type === 'xuemo' && !e.armorCracked ? 'BRONZE ARMOR! BAIT INTO PILLAR' : undefined
        );
      }
    });

    if (hitAny) {
      soundEngine.playHit('heavy');
      soundEngine.playSpatialMaterialFoley(
        'flesh_cleave',
        p.x + p.facing * 52,
        p.y,
        p.x,
        p.y,
        sim.viewportW
      );
      sim.hitstopTimer = heavySpec.hitstopSec;
      sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.82);
      sim.comboCount += 2;
      sim.comboResetTimer = 4.2;
      sim.score += 180 * Math.max(1, orbsUsed);
    } else {
      const strikeX = p.x + Math.cos(p.slashAngle) * 95;
      const strikeY = p.y + Math.sin(p.slashAngle) * 65;
      sim.lightningArcs.push({
        x1: strikeX + (Math.random() - 0.5) * 70,
        y1: strikeY - 440,
        x2: strikeX,
        y2: strikeY,
        life: 0.28,
        maxLife: 0.28,
        color: '#a855f7',
      });
      spawnParticles(
        p.x + p.facing * 48,
        p.y,
        22,
        '#ff2a3c',
        165,
        4.4,
        130
      );
    }
  }, [addStylePoints, damagePropsNearPoint, recordQuestEvent, spawnAfterimage, spawnFloatingText, spawnParticles, spawnShockwave]);

  const triggerLightAttack = useCallback(() => {
    const sim = simRef.current;
    const p = sim.player;
    if (sim.state !== 'playing') return;
    if (p.action === 'light_attack' && p.actionTimer > 0.04) {
      sim.input.bufferedAction = 'light';
      sim.input.bufferTimer = 0.22;
      return;
    }

    const boonMods = computeBoonModifiers(sim.activeBoons);
    const isDashStrike = p.action === 'dodge' || p.dashStrikeWindowTimer > 0;
    const isRiposteStrike = p.riposteWindowTimer > 0;
    p.dashStrikeWindowTimer = 0;
    p.riposteWindowTimer = 0;

    if (p.comboWindowTimer > 0) {
      p.comboStep = ((p.comboStep % 4) + 1) as 1 | 2 | 3 | 4;
    } else {
      p.comboStep = 1;
    }

    const weaponCfg = WEAPON_CONFIGS[p.weapon];
    const baseDur = (p.comboStep === 4 ? 0.22 : 0.145) / weaponCfg.attackSpeedMultiplier;
    p.action = 'light_attack';
    p.actionDuration = baseDur;
    p.actionTimer = baseDur;
    p.comboWindowTimer = 1.05;
    p.scaleX = isRiposteStrike || isDashStrike ? 1.15 : p.comboStep === 4 ? 1.08 : 1.04;
    p.scaleY = isRiposteStrike || isDashStrike ? 0.89 : p.comboStep === 4 ? 0.93 : 0.97;
    p.weaponSwingProgress = 0.0;
    if (isRiposteStrike) {
      p.invulnTimer = Math.max(p.invulnTimer, 0.72);
    }

    // Face nearest enemy or cursor
    let targetX = sim.input.pointerX;
    let targetY = sim.input.pointerY;
    let nearestDist = 9999;
    sim.enemies.forEach((e) => {
      if (e.aiState === 'ko') return;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < nearestDist && d < 280) {
        nearestDist = d;
        targetX = e.x;
        targetY = e.y;
      }
    });

    const dx = targetX - p.x;
    const dy = targetY - p.y;
    if (Math.abs(dx) > 3) p.facing = dx >= 0 ? 1 : -1;
    p.slashAngle = Math.atan2(dy, dx);
    p.slashArcAlpha = 0.95;

    const dist = Math.hypot(dx, dy) || 1;
    const lungeImpulse = isRiposteStrike ? 210 : isDashStrike ? 165 : p.comboStep === 4 ? 92 : 62;
    p.vx += (dx / dist) * lungeImpulse;
    p.vy += (dy / dist) * lungeImpulse;

    if (isRiposteStrike) {
      spawnShockwave(p.x, p.y, 145, '#ffd86b', 0.36);
      spawnFloatingText(
        p.x,
        p.y - 84,
        'GOD OF WAR · VAJRA RIPOSTE CLEAVE! (2.65×)',
        '#ffd86b',
        1.22
      );
    } else if (isDashStrike) {
      p.elevationY = 18;
      spawnFloatingText(p.x, p.y - 78, 'SPARTAN LEAP CLEAVE!', '#63f2ff', 1.05);
    } else if (p.comboStep === 3) {
      // Step 3 Whirlwind Cyclone Saw pulls nearby enemies slightly inward!
      spawnShockwave(p.x, p.y, 118, '#ffd86b', 0.24);
      sim.enemies.forEach((e) => {
        if (e.aiState === 'ko') return;
        const cd = Math.hypot(e.x - p.x, e.y - p.y);
        if (cd <= 165 && cd > 28) {
          e.x += (p.x - e.x) * (e.isBoss ? 0.14 : 0.28);
          e.y += (p.y - e.y) * (e.isBoss ? 0.14 : 0.28);
        }
      });
    }

    // Damage destructible courtyard props in reach (scaled for miniature character stature)
    const effectiveReach =
      Math.round(weaponCfg.reachPx * 0.66) +
      (isRiposteStrike ? 42 : isDashStrike ? 26 : p.comboStep === 3 || p.comboStep === 4 ? 16 : 0);
    damagePropsNearPoint(
      p.x + p.facing * 18,
      p.y,
      effectiveReach + 12,
      p.comboStep === 4 || isDashStrike || isRiposteStrike ? 55 : 32
    );

    if (p.comboStep === 4 || isDashStrike || isRiposteStrike) {
      spawnAfterimage(
        isDashStrike ? GAME_ASSETS.rudra.run : GAME_ASSETS.rudra.slash2,
        0,
        p.x,
        p.y,
        42,
        p.facing,
        p.elevationY,
        isDashStrike ? 'jade' : 'gold',
        0.26
      );
      spawnShockwave(
        p.x + p.facing * 32,
        p.y,
        isDashStrike || isRiposteStrike ? 116 : 98,
        isRiposteStrike ? '#ffd86b' : isDashStrike ? '#63f2ff' : weaponCfg.accentColor,
        0.32
      );
      sim.cameraZoom = BASE_CAMERA_ZOOM + 0.028;
    }

    soundEngine.playSwing(p.comboStep === 4 || isDashStrike || isRiposteStrike ? 'heavy' : 'light');

    let hitAny = false;
    sim.enemies.forEach((e) => {
      if (e.aiState === 'ko') return;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d <= effectiveReach + (e.isBoss ? 44 : 24)) {
        hitAny = true;
        const dmg = calculateLightHitDamage({
          comboStep: p.comboStep,
          weapon: p.weapon,
          ranks: sim.ranks,
          isImmobilizedTarget: e.immobilizedTimer > 0,
        });
        const backstab = isShadowStrikeBackstab({
          playerX: p.x,
          enemyX: e.x,
          enemyFacing: e.facing,
        });

        // Smart Enemy & Boss Frontal Parry / Shield Deflection Mechanic! (Riposte & Dash-Strike shatter right through!)
        const canEnemyParry =
          !backstab &&
          !isDashStrike &&
          !isRiposteStrike &&
          p.comboStep < 4 &&
          e.postureBrokenTimer <= 0 &&
          e.immobilizedTimer <= 0 &&
          (e.parryStanceTimer > 0 ||
            (e.trait === 'vajra_shield' && e.aiState === 'chase') ||
            (e.isBoss && e.aiState === 'chase' && Math.random() < 0.24));

        if (canEnemyParry) {
          soundEngine.playSpell('parry');
          e.parryStanceTimer = 0.55;
          e.hitFlashTimer = 0.08;
          const recoilAngle = Math.atan2(p.y - e.y, p.x - e.x);
          p.vx += Math.cos(recoilAngle) * 190;
          p.vy += Math.sin(recoilAngle) * 150;
          sim.hitstopTimer = 0.05;
          sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.3);
          spawnShockwave((p.x + e.x) * 0.5, (p.y + e.y) * 0.5, 86, '#ffd86b', 0.28);
          spawnParticles((p.x + e.x) * 0.5, (p.y + e.y) * 0.5 - 24, 20, '#ffd86b', 210, 4.2, 90);
          spawnFloatingText(
            e.x,
            e.y - 72,
            e.isBoss ? 'BOSS PARRIED! · PRESS [Q] TO DEFLECT!' : 'GUARD PARRIED! · PARRY [Q] OR HEAVY [RMB]',
            '#ffd86b',
            1.08
          );
          if (e.aiState === 'chase' || e.aiState === 'idle') {
            e.aiState = 'windup';
            e.windupDuration = e.isBoss ? 0.42 : 0.46;
            e.aiTimer = e.windupDuration;
            e.telegraphX = e.x;
            e.telegraphY = e.y;
            e.aimAngle = Math.atan2(p.y - e.y, p.x - e.x);
            e.facing = p.x >= e.x ? 1 : -1;
            e.attackKind = 'cone';
            e.telegraphRadius = e.isBoss ? 175 : 132;
          }
          return;
        }

        const aspectBonuses = computeWeaponAspectBonuses(p.weapon, sim.weaponAspectRanks);
        const relicSetRes = computeRelicSetResonance(sim.equippedGear);
        const totalCritChance =
          boonMods.critChance + aspectBonuses.bonusCritChance + relicSetRes.setCritBonus;
        const isCrit =
          isRiposteStrike ||
          p.comboStep === 4 ||
          isDashStrike ||
          (totalCritChance > 0 && Math.random() < totalCritChance);
        const bossVuln =
          e.isBoss && (e.type === 'xuemo' || e.type === 'vrikodara')
            ? computeBossVulnerabilityMultiplier({
                bossType: e.type,
                phase: e.phase,
                armorCracked: Boolean(e.armorCracked),
                tuskLodgedTimer: e.tuskLodgedTimer || 0,
                aiState: e.aiState,
              })
            : { damageMultiplier: 1.0, postureMultiplier: 1.0, vulnerabilityCallout: null };
        const lodgedCastMult = 1 + (e.lodgedCasts || 0) * boonMods.castLodgedDamageBonus;
        const styleMult = computeCombatStyleStatus(p.stylePoints).damageBonusMultiplier;
        const mult =
          (isRiposteStrike ? 2.65 : 1.0) *
          styleMult *
          aspectBonuses.damageMultiplier *
          relicSetRes.setDamageBonusMultiplier *
          (p.transformTimer > 0 ? 1.3 : 1.0) *
          (isDashStrike ? boonMods.dashStrikeMultiplier : 1.0) *
          (backstab ? boonMods.backstabMultiplier : 1.0) *
          (isCrit && p.comboStep !== 4 && !isRiposteStrike ? boonMods.critMultiplier : 1.0) *
          (1 + boonMods.echoStrikeRatio) *
          bossVuln.damageMultiplier *
          lodgedCastMult;
        const aspectProcBonus = p.comboStep === 4 ? aspectBonuses.procDamage : 0;
        const hpLoss = Math.round(dmg.hpDamage * mult + aspectProcBonus);
        const posLoss = Math.round(
          (dmg.postureDamage + (isRiposteStrike ? 48 : 0)) *
            mult *
            aspectBonuses.postureMultiplier *
            bossVuln.postureMultiplier *
            boonMods.postureDamageMultiplier
        );

        e.hp = Math.max(0, e.hp - hpLoss);
        sim.runDamageDealt += hpLoss;
        e.hitFlashTimer = 0.055;
        e.scaleX = 1.04;
        e.scaleY = 0.96;

        // Nezha Boon: Samadhi Scorch DoT
        if (boonMods.scorchDps > 0) {
          e.scorchTimer = 3.0;
        }

        // Sky-Splitting Vajra Lightning ONLY when Erlang / Indra Boon is active (prevents visual noise on basic melee hits)
        const chainDmg = boonMods.chainLightningDamage;
        if (chainDmg > 0) {
          let prevX = e.x;
          let prevY = e.y - 24;
          let bounceCount = 0;
          sim.enemies.forEach((other) => {
            if (other.id === e.id || other.aiState === 'ko' || bounceCount >= 3) return;
            if (Math.hypot(other.x - e.x, other.y - e.y) <= 300) {
              bounceCount++;
              other.hp = Math.max(0, other.hp - chainDmg);
              sim.runDamageDealt += chainDmg;
              other.hitFlashTimer = 0.06;
              sim.lightningArcs.push({
                x1: prevX,
                y1: prevY,
                x2: other.x,
                y2: other.y - 24,
                life: 0.22,
                maxLife: 0.22,
                color: '#38bdf8',
              });
              spawnParticles(other.x, other.y - 22, 6, '#38bdf8', 165, 3.2, 80);
              prevX = other.x;
              prevY = other.y - 24;
            }
          });
        }

        const kAngle = Math.atan2(e.y - p.y, e.x - p.x);
        const kb =
          (p.comboStep === 4 || isDashStrike || isRiposteStrike ? 78 : 28) *
          (e.isBoss ? 0.25 : 0.85);
        e.vx += Math.cos(kAngle) * kb;
        e.vy += Math.sin(kAngle) * kb;

        const posResult = applyPostureDamage({
          currentPosture: e.posture,
          maxPosture: e.maxPosture,
          postureDamage: posLoss,
          alreadyBroken: e.postureBrokenTimer > 0,
        });
        e.posture = posResult.nextPosture;
        if (posResult.triggeredBreak) {
          e.postureBrokenTimer = 4.0;
          e.aiState = 'recover';
          e.aiTimer = 4.0;
          sim.runPostureBreaks += 1;
          recordQuestEvent('shatter_posture', 1);
          spawnShockwave(e.x, e.y, 88, '#ffd86b', 0.28);
          spawnFloatingText(
            e.x,
            e.y - 68,
            'POSTURE BROKEN! [F] EXECUTE',
            '#ffd86b',
            1.1
          );
        }

        // Accumulate Focus
        p.focusProgress += dmg.focusDelta * (isDashStrike || isRiposteStrike ? 1.4 : 1.0);
        while (p.focusProgress >= 1.0 && p.focusOrbs < 4) {
          p.focusProgress -= 1.0;
          p.focusOrbs += 1;
        }
        if (p.focusOrbs >= 4) p.focusProgress = 1.0;

        spawnParticles(
          e.x,
          e.y - 20,
          p.comboStep === 4 || isDashStrike || isRiposteStrike ? 12 : 6,
          isRiposteStrike ? '#ffd86b' : isDashStrike ? '#38bdf8' : weaponCfg.accentColor,
          185,
          3.6,
          140
        );
        spawnParticles(
          e.x,
          e.y - 18,
          p.comboStep === 4 || isDashStrike ? 6 : 3,
          '#ff2a3c',
          145,
          3.0,
          190
        );
        spawnFloatingText(
          e.x,
          e.y - 52,
          isRiposteStrike
            ? `RIPOSTE ${hpLoss}!`
            : isCrit || isDashStrike
            ? `${hpLoss}!`
            : `${hpLoss}`,
          isRiposteStrike
            ? '#ffd86b'
            : isDashStrike
            ? '#63f2ff'
            : backstab
            ? '#c084fc'
            : isCrit
            ? '#ffd86b'
            : '#f5ebd6',
          isRiposteStrike || isDashStrike || backstab || isCrit ? 1.18 : 0.92
        );
      }
    });

    if (hitAny) {
      soundEngine.playHit(
        p.comboStep === 4 || isDashStrike || isRiposteStrike ? 'crit' : 'light'
      );
      soundEngine.playSpatialMaterialFoley(
        isRiposteStrike ? 'golden_parry' : 'flesh_cleave',
        p.x + p.facing * 42,
        p.y,
        p.x,
        p.y,
        sim.viewportW
      );
      if (p.comboStep === 4 || isDashStrike || isRiposteStrike) {
        sim.hitstopTimer = 0.055;
        sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.36);
        sim.cameraZoom = BASE_CAMERA_ZOOM + 0.028;
      } else {
        sim.hitstopTimer = 0.022;
        sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.14);
      }
      sim.comboCount += 1;
      sim.comboResetTimer = 3.8;
      sim.score += p.comboStep === 4 || isDashStrike || isRiposteStrike ? 80 : 35;
      addStylePoints(isRiposteStrike ? 135 : isDashStrike ? 65 : p.comboStep === 4 ? 55 : 28);
    } else {
      addStylePoints(10);
    }
  }, [addStylePoints, damagePropsNearPoint, recordQuestEvent, spawnAfterimage, spawnFloatingText, spawnParticles, spawnShockwave]);

  const triggerCloudStepDodge = useCallback(() => {
    const sim = simRef.current;
    const p = sim.player;
    if (sim.state !== 'playing') return;
    // Allow instant dash-cancel from ANY attack, parry, or cast animation; only debounce mid-dodge
    if (p.action === 'dodge' && p.actionTimer > 0.05) {
      sim.input.bufferedAction = 'dodge';
      sim.input.bufferTimer = 0.18;
      return;
    }

    const boonMods = computeBoonModifiers(sim.activeBoons);

    // 2-Charge Dash Stamina Discipline (initializes recharge timer on first consumed charge)
    const dashRes = consumeDashStamina({
      currentCharges: p.dashCharges,
      maxCharges: p.maxDashCharges,
      currentRechargeTimer: p.dashRechargeTimer,
    });
    if (!dashRes.canDash) {
      spawnFloatingText(p.x, p.y - 76, 'QI DEPLETED · DASH RECHARGING!', '#9adce8', 0.9);
      return;
    }
    p.dashCharges = dashRes.nextCharges;
    p.dashRechargeTimer = dashRes.nextRechargeTimer;
    p.dashStrikeWindowTimer = 0.38;
    p.elevationY = 0;
    sim.runDodgesCompleted += 1;

    // Check if an enemy is mid-windup or attack nearby for Perfect Cloud Step ("KALA-MIRAGE")!
    const perfectWindow = sim.enemies.some(
      (e) =>
        (e.aiState === 'windup' || e.aiState === 'attack') &&
        Math.hypot(e.x - p.x, e.y - p.y) <= e.telegraphRadius + 95
    );

    // Record dash origin for the Agni-Step Echo Trail
    p.dashStartX = p.x;
    p.dashStartY = p.y;
    p.dashStreakAlpha = 1.0;

    // Leave behind Phantom Step decoy & multi-pose silhouette afterimage trail
    sim.decoy.active = true;
    sim.decoy.x = p.x;
    sim.decoy.y = p.y;
    sim.decoy.timer = 1.25;
    spawnAfterimage(GAME_ASSETS.rudra.run, 0, p.x, p.y, 44, p.facing, 0, 'gold', 0.32);
    spawnShockwave(
      p.x,
      p.y,
      boonMods.dashFireNovaDamage > 0 ? 122 : 84,
      boonMods.dashFireNovaDamage > 0 ? '#ff6a2b' : '#ffd86b',
      0.30
    );
    spawnShockwave(p.x, p.y, 56, '#38bdf8', 0.22);
    sim.cameraZoom = BASE_CAMERA_ZOOM + 0.022;
    sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.16);

    // Nezha Boon: Wind-Fire Wheel Dash Nova
    if (boonMods.dashFireNovaDamage > 0) {
      spawnParticles(p.x, p.y - 20, 22, '#ff6a2b', 190, 4.5, 40);
      sim.enemies.forEach((e) => {
        if (e.aiState === 'ko') return;
        if (Math.hypot(e.x - p.x, e.y - p.y) <= 135) {
          e.hp = Math.max(0, e.hp - boonMods.dashFireNovaDamage);
          e.hitFlashTimer = 0.07;
          e.scorchTimer = Math.max(e.scorchTimer, 2.5);
          spawnFloatingText(
            e.x,
            e.y - 56,
            `${boonMods.dashFireNovaDamage}`,
            '#ff6a2b',
            0.95
          );
        }
      });
    }

    // Guanyin Boon: Jade Willow Deflection reflects nearby enemy projectiles!
    if (boonMods.deflectProjectilesOnDash) {
      sim.projectiles.forEach((proj) => {
        if (!proj.active || proj.deflected) return;
        if (Math.hypot(proj.x - p.x, proj.y - p.y) <= 135) {
          proj.deflected = true;
          proj.vx *= -1.45;
          proj.vy *= -1.45;
          proj.damage = Math.round(proj.damage * 2.5);
          proj.color = '#3ee0a8';
          proj.life = 2.4;
          spawnFloatingText(proj.x, proj.y - 28, 'DEFLECT!', '#3ee0a8', 1.0);
        }
      });
    }

    // Tighter, punchier Hades-grade Dash duration & i-frame window
    p.action = 'dodge';
    p.actionDuration = 0.18;
    p.actionTimer = 0.18;
    p.invulnTimer = 0.28;
    p.scaleX = 1.22;
    p.scaleY = 0.82;

    // 1. Prioritize held WASD / Arrow direction
    let moveX = 0;
    let moveY = 0;
    const held = sim.input.keysHeld;
    if (held.has('KeyA') || held.has('ArrowLeft')) moveX -= 1;
    if (held.has('KeyD') || held.has('ArrowRight')) moveX += 1;
    if (held.has('KeyW') || held.has('ArrowUp')) moveY -= 1;
    if (held.has('KeyS') || held.has('ArrowDown')) moveY += 1;

    if (moveX !== 0 || moveY !== 0) {
      const d = Math.hypot(moveX, moveY) || 1;
      moveX /= d;
      moveY /= d;
      p.lastMoveDirX = moveX;
      p.lastMoveDirY = moveY;
    } else if (
      sim.input.pointerActive &&
      Math.hypot(sim.input.pointerX - p.x, sim.input.pointerY - p.y) > 32
    ) {
      // 2. Otherwise dash toward active mouse cursor
      const dx = sim.input.pointerX - p.x;
      const dy = sim.input.pointerY - p.y;
      const d = Math.hypot(dx, dy) || 1;
      moveX = dx / d;
      moveY = dy / d;
    } else {
      // 3. Otherwise dash along last movement direction or current facing vector
      const d = Math.hypot(p.lastMoveDirX, p.lastMoveDirY);
      if (d > 0.1) {
        moveX = p.lastMoveDirX / d;
        moveY = p.lastMoveDirY / d;
      } else {
        moveX = p.facing;
        moveY = 0;
      }
    }

    p.facing = moveX >= 0 ? 1 : -1;
    // High-snap initial burst driven by 3-stage Agni-Step curve
    p.vx = moveX * 690;
    p.vy = moveY * 545;

    // Pre-spawn 3 staggered silhouette echoes along the dash vector for immediate visual feedback
    const dashPoses = [GAME_ASSETS.rudra.run, GAME_ASSETS.rudra.slash1, GAME_ASSETS.rudra.slam];
    for (let sIdx = 0; sIdx < 3; sIdx++) {
      const stepFrac = (sIdx + 1) * 0.24;
      spawnAfterimage(
        dashPoses[sIdx % dashPoses.length],
        0,
        p.x + moveX * 115 * stepFrac,
        p.y + moveY * 90 * stepFrac,
        44,
        p.facing,
        4 * Math.sin(stepFrac * Math.PI),
        sIdx % 2 === 0 ? 'gold' : 'jade',
        0.24 + sIdx * 0.05
      );
    }

    // Crowd-parting wind burst: push back nearby enemies and shatter nearby courtyard props
    damagePropsNearPoint(p.x + moveX * 36, p.y + moveY * 28, 62, 85);

    sim.enemies.forEach((e) => {
      if (e.aiState === 'ko') return;
      const edx = e.x - p.x;
      const edy = e.y - p.y;
      const edist = Math.hypot(edx, edy) || 1;
      if (edist < 125) {
        const pushStrength = e.isBoss ? 95 : 220;
        e.vx += (edx / edist) * pushStrength;
        e.vy += (edy / edist) * pushStrength * 0.82;
        const posRes = applyPostureDamage({
          currentPosture: e.posture,
          maxPosture: e.maxPosture,
          postureDamage: 22,
          alreadyBroken: e.postureBrokenTimer > 0,
        });
        e.posture = posRes.nextPosture;
        if (posRes.triggeredBreak) {
          e.postureBrokenTimer = 4.5;
          e.aiState = 'recover';
          e.aiTimer = 4.5;
        }
      }
    });

    soundEngine.playSpell('dodge');
    spawnParticles(sim.decoy.x, sim.decoy.y - 20, 26, '#ffd86b', 235, 4.2, 18);
    spawnParticles(sim.decoy.x, sim.decoy.y - 16, 18, '#38bdf8', 210, 3.8, 12);
    spawnParticles(sim.decoy.x, sim.decoy.y - 14, 14, '#ff384c', 185, 3.5, 15);

    if (perfectWindow) {
      // KALA-MIRAGE: Trigger 0.28x Time Dilation Slow-Mo + Refund 1 Dash Charge + Grant +1 Focus Orb!
      p.dashCharges = Math.min(p.maxDashCharges, p.dashCharges + 1);
      if (p.focusOrbs < 4) {
        p.focusOrbs = Math.min(4, p.focusOrbs + 1);
      }
      if (boonMods.perfectDodgeHeal > 0) {
        p.hp = Math.min(p.maxHp, p.hp + boonMods.perfectDodgeHeal);
      }
      sim.score += 150;
      sim.hitstopTimer = 0.04;
      sim.slowMoTimer = Math.max(sim.slowMoTimer, 0.26);
      sim.screenFlashAlpha = 0.22;
      sim.screenFlashColor = '#38bdf8';
      // Discharge Perfect Dodge Sky-Lightning Strike onto nearest attacker!
      sim.enemies.forEach((e) => {
        if (e.aiState !== 'ko' && Math.hypot(e.x - p.x, e.y - p.y) <= 290) {
          sim.lightningArcs.push({
            x1: e.x + (Math.random() - 0.5) * 60,
            y1: e.y - 460,
            x2: e.x,
            y2: e.y - 20,
            life: 0.34,
            maxLife: 0.34,
            color: '#38bdf8',
          });
        }
      });
      spawnFloatingText(
        p.x,
        p.y - 78,
        'KALA-MIRAGE · PERFECT DODGE! (+1 FOCUS)',
        '#63f2ff',
        1.18
      );
    }
  }, [damagePropsNearPoint, spawnAfterimage, spawnFloatingText, spawnParticles, spawnShockwave]);

  // Global keyboard & window focus listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const sim = simRef.current;

      if (sim.state === 'title') {
        if ((e.code === 'Enter' || e.code === 'Space') && !shrineOpen && !storyOpen) {
          e.preventDefault();
          startGameAtChamber(0);
        }
        return;
      }

      if (boonModalOpen) {
        if (e.code === 'Digit1' && boonChoices[0]) {
          e.preventDefault();
          handleSelectBoon(boonChoices[0].id);
        } else if (e.code === 'Digit2' && boonChoices[1]) {
          e.preventDefault();
          handleSelectBoon(boonChoices[1].id);
        } else if (e.code === 'Digit3' && boonChoices[2]) {
          e.preventDefault();
          handleSelectBoon(boonChoices[2].id);
        } else if (e.code === 'KeyR') {
          e.preventDefault();
          handleRerollBoons();
        } else if (e.code === 'Escape') {
          e.preventDefault();
          setBoonModalOpen(false);
        }
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (partyModalOpen) {
          setPartyModalOpen(false);
          return;
        }
        if (shrineOpen) {
          setShrineOpen(false);
          return;
        }
        if (storyOpen) {
          setStoryOpen(false);
          return;
        }
        if (sim.state === 'playing') {
          sim.state = 'paused';
          document.body.dataset.state = 'paused';
          setGameState('paused');
          setOutcomeMode('paused');
          sim.input.keysHeld.clear();
        } else if (sim.state === 'paused') {
          sim.state = 'playing';
          document.body.dataset.state = 'playing';
          setGameState('playing');
          setOutcomeMode('none');
        }
        return;
      }

      if (e.code === 'KeyM') {
        setMuted((prev) => {
          const next = !prev;
          soundEngine.setMuted(next);
          return next;
        });
        return;
      }

      if (e.code === 'KeyI' || e.code === 'KeyC') {
        e.preventDefault();
        setPartyModalOpen((prev) => !prev);
        return;
      }

      if (sim.state !== 'playing') return;

      if (!sim.input.keysHeld.has(e.code)) {
        sim.input.justPressed.add(e.code);
      }
      sim.input.keysHeld.add(e.code);

      if (e.code === 'KeyG') {
        e.preventDefault();
        triggerPartyLinkStrike();
      } else if (e.code === 'KeyB') {
        e.preventDefault();
        openBoonAltar();
      } else if (e.code === 'Tab') {
        e.preventDefault();
        triggerSwitchStance();
      } else if (e.code === 'Digit1') {
        triggerSwitchWeapon('twin_blades');
      } else if (e.code === 'Digit2') {
        triggerSwitchWeapon('jingu_bang');
      } else if (e.code === 'Digit3') {
        triggerSwitchWeapon('dragon_glaive');
      } else if (e.code === 'KeyR') {
        triggerGourdHeal();
      } else if (e.code === 'KeyQ') {
        // [Q] -> God of War / Sekiro Kalaripayattu Parry & Riposte!
        e.preventDefault();
        triggerRockSolidParry();
      } else if (e.code === 'KeyT') {
        // [T] -> Prince of Persia Sands of Time Kala-Rewind!
        e.preventDefault();
        triggerKalaRewind();
      } else if (e.code === 'KeyV') {
        // [V] -> Assassin's Creed Shadow Prana Blink & Chain-Assassinate!
        e.preventDefault();
        triggerShadowBlinkAssassinate();
      } else if (e.code === 'KeyF') {
        // [F] -> God of War Brutal Execute (or Agneyastra Blood-Cast if no broken target)
        const hasBroken = sim.enemies.some(
          (en) => en.aiState !== 'ko' && en.postureBrokenTimer > 0
        );
        if (hasBroken) {
          triggerExecuteBrokenTarget();
        } else {
          triggerImmobilizeSpell();
        }
      } else if (e.code === 'KeyE') {
        triggerLookOrMirage();
      } else if (e.code === 'KeyZ') {
        triggerRedTidesTransform();
      } else if (
        e.code === 'Space' ||
        e.code === 'ShiftLeft' ||
        e.code === 'ShiftRight' ||
        e.code === 'KeyK'
      ) {
        e.preventDefault();
        triggerCloudStepDodge();
      } else if (e.code === 'KeyJ') {
        triggerLightAttack();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      simRef.current.input.keysHeld.delete(e.code);
    };

    const onBlur = () => {
      simRef.current.input.keysHeld.clear();
      simRef.current.input.justPressed.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [
    boonModalOpen,
    boonChoices,
    partyModalOpen,
    handleSelectBoon,
    handleRerollBoons,
    openBoonAltar,
    shrineOpen,
    storyOpen,
    startGameAtChamber,
    triggerPartyLinkStrike,
    triggerSwitchStance,
    triggerSwitchWeapon,
    triggerGourdHeal,
    triggerStanceHeavyUnleash,
    triggerExecuteBrokenTarget,
    triggerImmobilizeSpell,
    triggerRockSolidParry,
    triggerKalaRewind,
    triggerShadowBlinkAssassinate,
    triggerLookOrMirage,
    triggerRedTidesTransform,
    triggerCloudStepDodge,
    triggerLightAttack,
  ]);

  // Helper to draw a tightly-cropped sprite frame at its true 1:1 aspect ratio with directional silhouette shadows, velocity lean & optional rim light
  const drawSpriteFrame = (
    ctx: CanvasRenderingContext2D,
    asset: ProcessedSpriteAsset | undefined,
    frameIndex: number,
    _totalFrames: number,
    worldX: number,
    worldY: number,
    targetHeight: number,
    _unusedWidth: number,
    facing: 1 | -1,
    scaleX: number,
    scaleY: number,
    hitFlash: boolean,
    elevationY: number = 0,
    shadowRadius: number = 32,
    rimTint: 'none' | 'gold' | 'jade' = 'none',
    skewX: number = 0,
    lightSourceX?: number,
    explicitFrame?: SpriteFrameBounds | null
  ) => {
    // 1. Dual-layer Ground Contact Shadow (wide ambient occlusion + tight dark boot contact core)
    const elevAtten = Math.max(0.35, 1 - elevationY / 130);
    ctx.save();
    ctx.translate(worldX, worldY);
    ctx.scale(1, 0.42);
    const outerR = shadowRadius * 1.18 * elevAtten;
    const sGrad = ctx.createRadialGradient(0, 0, outerR * 0.08, 0, 0, outerR);
    sGrad.addColorStop(0, `rgba(0, 0, 0, ${(0.66 * elevAtten).toFixed(2)})`);
    sGrad.addColorStop(0.45, `rgba(0, 0, 0, ${(0.36 * elevAtten).toFixed(2)})`);
    sGrad.addColorStop(0.78, `rgba(0, 0, 0, ${(0.14 * elevAtten).toFixed(2)})`);
    sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sGrad;
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (!asset || asset.frames.length === 0) {
      if (targetHeight >= 36) {
        // Instant Painted-Style Vedic Warrior Silhouette while sprite sheet finishes streaming
        const h = targetHeight;
        const w = h * 0.56;
        ctx.save();
        ctx.translate(worldX, worldY - elevationY);
        ctx.scale(facing * scaleX, scaleY);
        ctx.fillStyle = hitFlash
          ? '#fff3d1'
          : rimTint === 'jade'
          ? '#1e423f'
          : rimTint === 'gold'
          ? '#382214'
          : '#261718';
        ctx.strokeStyle =
          rimTint === 'jade' ? '#5ce6ff' : rimTint === 'gold' ? '#ffd86b' : '#e07a45';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.92);
        ctx.lineTo(w * 0.45, -h * 0.66);
        ctx.lineTo(w * 0.36, -h * 0.04);
        ctx.lineTo(-w * 0.36, -h * 0.04);
        ctx.lineTo(-w * 0.45, -h * 0.66);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Glowing Crown / Chakra Core
        ctx.fillStyle = rimTint === 'jade' ? '#63f2ff' : '#ffd86b';
        ctx.beginPath();
        ctx.arc(0, -h * 0.78, Math.max(3, h * 0.07), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      return;
    }

    const safeIdx = Math.max(0, Math.min(asset.frames.length - 1, frameIndex));
    const frame = explicitFrame || asset.frames[safeIdx];
    const baseH = Math.max(16, asset.baseFrameHeight || frame.sh);

    // Constant per-sheet pixel scale so raising weapons overhead or lunging horizontally never shrinks or squashes the character
    const pixelScale = targetHeight / baseH;
    const drawW = frame.sw * pixelScale;
    const drawH = frame.sh * pixelScale;
    const anchorXRatio =
      frame.anchorX !== undefined && frame.sw > 0
        ? Math.max(0.18, Math.min(0.82, frame.anchorX / frame.sw))
        : 0.5;
    const drawOffsetX = -drawW * anchorXRatio;
    const groundY = (frame.groundOffsetY ?? frame.sh) * pixelScale;
    const drawOffsetY = -groundY + 4;

    // 1.5. Projected Directional Floor Shadow Silhouette (skewed away from nearest brazier light source)
    if (asset.shadowCanvas) {
      const skewDir =
        lightSourceX !== undefined
          ? Math.max(-0.55, Math.min(0.55, (worldX - lightSourceX) / 480))
          : -0.28 * facing;
      ctx.save();
      ctx.translate(worldX, worldY + 2);
      ctx.transform(1, 0, skewDir, 0.36, 0, 0);
      ctx.scale(facing * scaleX, 1);
      ctx.globalAlpha = 0.42 * elevAtten;
      ctx.drawImage(
        asset.shadowCanvas,
        frame.sx,
        frame.sy,
        frame.sw,
        frame.sh,
        drawOffsetX,
        drawOffsetY,
        drawW,
        drawH
      );
      ctx.restore();
    }

    ctx.save();
    ctx.translate(worldX, worldY - elevationY);
    if (Math.abs(skewX) > 0.001) {
      ctx.transform(1, 0, skewX, 1, 0, 0);
    }
    ctx.scale(facing * scaleX, scaleY);

    // Optional celestial backlight rim silhouette
    if (rimTint !== 'none' && !hitFlash) {
      const rimCanvas = rimTint === 'jade' ? asset.jadeCanvas : asset.goldCanvas;
      if (rimCanvas) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.38;
        ctx.drawImage(
          rimCanvas,
          frame.sx,
          frame.sy,
          frame.sw,
          frame.sh,
          drawOffsetX - 2,
          drawOffsetY - 2,
          drawW + 4,
          drawH + 2
        );
        ctx.restore();
      }
    }

    const sourceCanvas = hitFlash ? asset.flashCanvas : asset.cleanCanvas;
    ctx.drawImage(
      sourceCanvas,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      drawOffsetX,
      drawOffsetY,
      drawW,
      drawH
    );
    ctx.restore();
  };

  // Main 60fps High-DPI Canvas Simulation & Render Loop (mounted once)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const vw = window.innerWidth || 1440;
      const vh = window.innerHeight || 900;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      simRef.current.viewportW = vw;
      simRef.current.viewportH = vh;
      simRef.current.worldW = CANONICAL_WORLD_W;
      simRef.current.worldH = CANONICAL_WORLD_H;
      simRef.current.dpr = dpr;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let rafId = 0;
    let lastTime = performance.now();
    let hudSyncAccum = 0;

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      const sim = simRef.current;
      const cw = sim.viewportW || 1440;
      const ch = sim.viewportH || 900;
      const worldW = CANONICAL_WORLD_W;
      const worldH = CANONICAL_WORLD_H;
      const dpr = sim.dpr || 1;
      const chamberSpec: ChamberSpec = CHAMBERS[sim.chamberIndex] || CHAMBERS[0];

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // FPS counter
      sim.frameCounter += 1;
      sim.fpsAccum += rawDt;
      if (sim.fpsAccum >= 0.5) {
        sim.fps = Math.min(60, Math.max(30, Math.round(sim.frameCounter / sim.fpsAccum)));
        sim.frameCounter = 0;
        sim.fpsAccum = 0;
      }

      // Hitstop, slow-mo, camera zoom, and screen shake decay in real dt
      if (sim.hitstopTimer > 0) {
        sim.hitstopTimer = Math.max(0, sim.hitstopTimer - dt);
      }
      if (sim.slowMoTimer > 0) {
        sim.slowMoTimer = Math.max(0, sim.slowMoTimer - dt);
      }
      if (sim.cameraShakeTrauma > 0) {
        sim.cameraShakeTrauma = Math.max(0, sim.cameraShakeTrauma - dt * 1.9);
      }
      if (sim.screenFlashAlpha > 0) {
        sim.screenFlashAlpha = Math.max(0, sim.screenFlashAlpha - dt * 2.4);
      }
      if (sim.gateWipeTimer > 0) {
        sim.gateWipeTimer = Math.max(0, sim.gateWipeTimer - dt);
      }
      if (sim.chasmVaultCalloutCd > 0) {
        sim.chasmVaultCalloutCd = Math.max(0, sim.chasmVaultCalloutCd - dt);
      }
      // Smooth Hades 2.5D Isometric Camera Tracking across Colossal 3.2x Sanctuary
      const activeBoss = sim.enemies.find((e) => e.isBoss && e.aiState !== 'ko' && e.hp > 0);
      const rawPresetZoom =
        sim.cameraPreset === 'tactical_wide'
          ? 1.12
          : sim.cameraPreset === 'hades_close'
          ? 1.44
          : BASE_CAMERA_ZOOM;
      const presetBaseZoom = cw < 640 ? rawPresetZoom * 0.78 : rawPresetZoom;
      const targetZoom =
        presetBaseZoom +
        (sim.player.action === 'heavy_unleash' || sim.player.action === 'execute' ? 0.035 : 0) -
        (activeBoss && activeBoss.phase >= 2 ? 0.04 : 0);
      sim.cameraZoom += (targetZoom - sim.cameraZoom) * (1 - Math.exp(-6.5 * dt));
      const zoom = sim.cameraZoom;

      // Velocity + Cursor + Boss Look-Ahead so the 2.5D camera glides ahead of Rudra's action
      const lookAheadX = sim.player.vx * 0.18 + (sim.input.pointerScreenX - cw * 0.5) * 0.14;
      const lookAheadY = sim.player.vy * 0.15 + (sim.input.pointerScreenY - ch * 0.5) * 0.12;
      let focusX = sim.player.x + lookAheadX;
      let focusY = sim.player.y - 18 + lookAheadY;
      if (activeBoss && Math.hypot(activeBoss.x - sim.player.x, activeBoss.y - sim.player.y) < 1100) {
        focusX = focusX * 0.78 + activeBoss.x * 0.22;
        focusY = focusY * 0.78 + activeBoss.y * 0.22;
      }

      // Clamp camera strictly inside [0, worldW] x [0, worldH] accounting for current zoom
      // so the hand-painted 2.5D isometric chamber artwork ALWAYS fills 100% of the viewport with zero rectangular borders!
      const halfVisW = (cw * 0.5) / zoom;
      const halfVisH = (ch * 0.5) / zoom;
      const minCamX = Math.min(worldW * 0.5 - cw * 0.5, halfVisW - cw * 0.5);
      const maxCamX = Math.max(minCamX, worldW - halfVisW - cw * 0.5);
      const minCamY = Math.min(worldH * 0.5 - ch * 0.5, halfVisH - ch * 0.5);
      const maxCamY = Math.max(minCamY, worldH - halfVisH - ch * 0.5);
      const desiredCamX = focusX - cw * 0.5;
      const desiredCamY = focusY - ch * 0.52;
      const clampedCamX = Math.max(minCamX, Math.min(maxCamX, desiredCamX));
      const clampedCamY = Math.max(minCamY, Math.min(maxCamY, desiredCamY));
      const camLerp = 1 - Math.exp(-8.5 * dt);
      sim.camX += (clampedCamX - sim.camX) * camLerp;
      sim.camY += (clampedCamY - sim.camY) * camLerp;

      // Project screen pointer accurately to 2.5D world chamber coordinates
      sim.input.pointerX = sim.camX + cw * 0.5 + (sim.input.pointerScreenX - cw * 0.5) / zoom;
      sim.input.pointerY = sim.camY + ch * 0.5 + (sim.input.pointerScreenY - ch * 0.5) / zoom;

      const timeScale = sim.slowMoTimer > 0 ? 0.28 : 1.0;
      const simDt =
        sim.state === 'playing' && !sim.modalPaused && sim.hitstopTimer <= 0 ? dt * timeScale : 0;

      const minX = worldW * 0.08;
      const maxX = worldW * 0.92;
      const minY = worldH * 0.14;
      const maxY = worldH * 0.88;

      if (simDt > 0) {
        const p = sim.player;

        // Chamber intro banner timer
        if (sim.chamberBannerTimer > 0) {
          sim.chamberBannerTimer = Math.max(0, sim.chamberBannerTimer - simDt);
        }
        if (sim.bossPhaseBanner && sim.bossPhaseBanner.timer > 0) {
          sim.bossPhaseBanner.timer = Math.max(0, sim.bossPhaseBanner.timer - simDt);
          if (sim.bossPhaseBanner.timer <= 0) {
            sim.bossPhaseBanner = null;
          }
        }

        // Delayed enemy wave spawns & glowing summoning rifts in world coordinates
        for (let i = sim.pendingSpawns.length - 1; i >= 0; i--) {
          sim.pendingSpawns[i].timer -= simDt;
          if (sim.pendingSpawns[i].timer <= 0) {
            const sp = sim.pendingSpawns[i];
            sim.enemies.push(
              createEnemyFromSpec(
                sp.type,
                sp.x,
                sp.y,
                worldW,
                worldH,
                sp.trait,
                sp.wardenRigKey,
                sp.wardenTitle
              )
            );
            spawnParticles(sp.x * worldW, sp.y * worldH, 18, '#ff7b29', 130, 4, 50);
            spawnShockwave(sp.x * worldW, sp.y * worldH, 68, '#ff9d42', 0.34);
            sim.pendingSpawns.splice(i, 1);
          }
        }
        for (let i = sim.summoningRifts.length - 1; i >= 0; i--) {
          sim.summoningRifts[i].timer -= simDt;
          if (sim.summoningRifts[i].timer <= 0) {
            const rift = sim.summoningRifts[i];
            sim.enemies.push(
              createEnemyFromSpec(
                rift.type,
                rift.x / worldW,
                rift.y / worldH,
                worldW,
                worldH,
                rift.trait,
                rift.wardenRigKey,
                rift.wardenTitle
              )
            );
            spawnParticles(rift.x, rift.y - 16, 26, '#ff4d29', 165, 4.5, 70);
            spawnShockwave(rift.x, rift.y, 92, '#ffd86b', 0.38);
            soundEngine.playTelegraph();
            sim.summoningRifts.splice(i, 1);
          }
        }

        // Cooldowns & timers
        p.immobilizeCd = Math.max(0, p.immobilizeCd - simDt);
        p.parryCd = Math.max(0, p.parryCd - simDt);
        if (p.action === 'parry') {
          p.parryElapsedSec += simDt;
        }
        p.riposteWindowTimer = Math.max(0, p.riposteWindowTimer - simDt);
        p.kalaRewindCd = Math.max(0, p.kalaRewindCd - simDt);
        p.shadowBlinkCd = Math.max(0, p.shadowBlinkCd - simDt);
        if (p.styleDecayTimer > 0) {
          p.styleDecayTimer = Math.max(0, p.styleDecayTimer - simDt);
        } else if (p.stylePoints > 0) {
          p.stylePoints = Math.max(0, p.stylePoints - simDt * 35);
        }
        p.temporalRecordAccum += simDt;
        if (p.temporalRecordAccum >= 0.1) {
          p.temporalRecordAccum = 0;
          p.temporalBuffer = pushTemporalSnapshot(
            p.temporalBuffer,
            {
              timestampSec: now * 0.001,
              x: p.x,
              y: p.y,
              hp: p.hp,
            },
            3.0
          );
        }
        p.clonesCd = Math.max(0, p.clonesCd - simDt);
        p.transformCd = Math.max(0, p.transformCd - simDt);
        p.transformTimer = Math.max(0, p.transformTimer - simDt);
        sim.partyLinkCd = Math.max(0, sim.partyLinkCd - simDt);
        p.invulnTimer = Math.max(0, p.invulnTimer - simDt);
        p.hitFlashTimer = Math.max(0, p.hitFlashTimer - simDt);
        p.comboWindowTimer = Math.max(0, p.comboWindowTimer - simDt);
        p.dashStrikeWindowTimer = Math.max(0, p.dashStrikeWindowTimer - simDt);
        p.slashArcAlpha = Math.max(0, p.slashArcAlpha - simDt * 3.1);
        p.dashStreakAlpha = Math.max(0, p.dashStreakAlpha - simDt * 3.2);
        p.weaponSwingProgress = Math.min(1, p.weaponSwingProgress + simDt * 5.2);

        // Input buffer decay & auto-execution when returning to idle
        if (sim.input.bufferTimer > 0) {
          sim.input.bufferTimer = Math.max(0, sim.input.bufferTimer - simDt);
          if (sim.input.bufferTimer <= 0) {
            sim.input.bufferedAction = null;
          }
        }

        // 2-Charge Dash Stamina Recharge (1.15s per charge)
        if (p.dashCharges < p.maxDashCharges) {
          p.dashRechargeTimer -= simDt;
          if (p.dashRechargeTimer <= 0) {
            p.dashCharges += 1;
            p.dashRechargeTimer = p.dashCharges < p.maxDashCharges ? 1.15 : 0;
          }
        }

        // Update destructible courtyard props timers & soft collision with player
        for (let i = 0; i < sim.props.length; i++) {
          const prop = sim.props[i];
          if (prop.destroyed) continue;
          prop.hitFlashTimer = Math.max(0, prop.hitFlashTimer - simDt);
          prop.shakeTimer = Math.max(0, prop.shakeTimer - simDt);

          // If Wukong dashes directly through a prop at high speed, shatter it!
          const propRadius = 15;
          const pdx = p.x - prop.x;
          const pdy = (p.y - prop.y) * 1.35;
          const pDist = Math.hypot(pdx, pdy);
          if (pDist < propRadius + 11) {
            if (p.action === 'dodge' || p.action === 'heavy_unleash' || p.action === 'execute') {
              damagePropsNearPoint(prop.x, prop.y, propRadius + 10, 999);
            } else {
              const safeD = pDist || 1;
              const push = (propRadius + 11 - pDist) * 10 * simDt;
              p.x += (pdx / safeD) * push;
              p.y += ((p.y - prop.y) / safeD) * push;
            }
          }
        }

        // Continuous motion afterimage trail during Dodge, Heavy Unleash, Execute, or Rudra Tandava
        if (
          p.action === 'dodge' ||
          p.action === 'heavy_unleash' ||
          p.action === 'execute' ||
          (p.transformTimer > 0 && Math.hypot(p.vx, p.vy) > 95)
        ) {
          sim.afterimageSpawnAccum += simDt;
          const interval = p.action === 'dodge' ? 0.025 : 0.05;
          if (sim.afterimageSpawnAccum >= interval) {
            sim.afterimageSpawnAccum = 0;
            const aiSpriteUrl =
              p.action === 'heavy_unleash' || p.action === 'execute'
                ? GAME_ASSETS.rudra.slam
                : p.action === 'dodge'
                ? GAME_ASSETS.rudra.run
                : GAME_ASSETS.rudra.slash1;
            spawnAfterimage(
              aiSpriteUrl,
              0,
              p.x,
              p.y,
              54,
              p.facing,
              p.elevationY,
              p.action === 'dodge' ? 'jade' : 'gold',
              0.28
            );
          }
        } else {
          sim.afterimageSpawnAccum = 0;
        }

        if (sim.comboResetTimer > 0) {
          sim.comboResetTimer -= simDt;
          if (sim.comboResetTimer <= 0) sim.comboCount = 0;
        }

        // Smooth squash-and-stretch recovery
        const dampFactor = 1 - Math.exp(-14 * simDt);
        p.scaleX += (1 - p.scaleX) * dampFactor;
        p.scaleY += (1 - p.scaleY) * dampFactor;
        p.displayHp += (p.hp - p.displayHp) * (1 - Math.exp(-5.5 * simDt));
        sim.enemies.forEach((e) => {
          e.displayHp += (e.hp - e.displayHp) * (1 - Math.exp(-5.5 * simDt));
        });

        if (p.action !== 'idle') {
          const prevAction = p.action;
          p.actionTimer -= simDt;
          if (p.actionTimer <= 0) {
            if (prevAction === 'dodge') {
              // Grounded arrival plant shockwave ring & ember puff
              spawnShockwave(p.x, p.y, 64, '#38bdf8', 0.22);
              spawnParticles(p.x, p.y - 6, 8, '#ffd86b', 95, 3.0, 40);
            }
            p.action = 'idle';
            p.elevationY = 0;
            if (sim.input.bufferedAction !== null && sim.input.bufferTimer > 0) {
              const nextAct = sim.input.bufferedAction;
              sim.input.bufferedAction = null;
              sim.input.bufferTimer = 0;
              if (nextAct === 'light') triggerLightAttack();
              else if (nextAct === 'heavy') triggerStanceHeavyUnleash();
              else if (nextAct === 'dodge') triggerCloudStepDodge();
            }
          }
        } else {
          p.elevationY += (0 - p.elevationY) * dampFactor;
        }

        // Passive Focus charge in Pillar stance or during combat
        if (p.focusOrbs < 4) {
          p.focusProgress += simDt * 0.06;
          if (p.focusProgress >= 1.0) {
            p.focusProgress -= 1.0;
            p.focusOrbs += 1;
          }
        }

        // Player WASD / Arrow + Mobile Virtual Joystick + PC/Console Gamepad 360° Analog Movement & Combat Buttons
        const held = sim.input.keysHeld;
        let moveX = 0;
        let moveY = 0;
        if (held.has('KeyA') || held.has('ArrowLeft')) moveX -= 1;
        if (held.has('KeyD') || held.has('ArrowRight')) moveX += 1;
        if (held.has('KeyW') || held.has('ArrowUp')) moveY -= 1;
        if (held.has('KeyS') || held.has('ArrowDown')) moveY += 1;

        if (Math.hypot(sim.input.touchMoveX, sim.input.touchMoveY) > 0.05) {
          moveX = sim.input.touchMoveX;
          moveY = sim.input.touchMoveY;
          sim.input.pointerX = p.x + moveX * 220;
          sim.input.pointerY = p.y + moveY * 220;
          sim.input.pointerActive = true;
        }
        if (sim.input.touchAttackHeld && p.action === 'idle') {
          triggerLightAttack();
        }

        // Poll connected PC / Console Gamepad (Xbox, DualSense, Switch Pro)
        if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
          const pads = navigator.getGamepads();
          const pad = pads?.[0] || pads?.[1] || pads?.[2] || pads?.[3];
          if (pad && pad.connected) {
            const deadzone = 0.18;
            const lx = pad.axes[0] || 0;
            const ly = pad.axes[1] || 0;
            if (Math.hypot(lx, ly) > deadzone) {
              moveX = lx;
              moveY = ly;
            }
            // Right stick 360-degree aim
            const rx = pad.axes[2] || 0;
            const ry = pad.axes[3] || 0;
            if (Math.hypot(rx, ry) > 0.25) {
              sim.input.pointerX = p.x + rx * 220;
              sim.input.pointerY = p.y + ry * 220;
              sim.input.pointerActive = true;
            }

            const prevBtns = gamepadPrevButtonsRef.current;
            const isJustPressed = (idx: number) => {
              const cur = Boolean(pad.buttons[idx]?.pressed);
              const was = Boolean(prevBtns[idx]);
              prevBtns[idx] = cur;
              return cur && !was;
            };

            if (isJustPressed(0)) {
              // A / Cross -> Phantom Step Dash
              triggerCloudStepDodge();
              triggerGamepadRumble(0.25, 0.35, 65);
            }
            if (isJustPressed(2)) {
              // X / Square -> 4-Hit Parashu Great-Axe Combo
              triggerLightAttack();
              triggerGamepadRumble(0.35, 0.45, 70);
            }
            if (isJustPressed(3)) {
              // Y / Triangle -> Tapas Heavy Unleash
              triggerStanceHeavyUnleash();
              triggerGamepadRumble(0.65, 0.85, 130);
            }
            if (isJustPressed(1)) {
              // B / Circle -> Execute Broken Target or Agneyastra Bow
              const hasBroken = sim.enemies.some(
                (e) => e.aiState !== 'ko' && e.postureBrokenTimer > 0
              );
              if (hasBroken) {
                triggerExecuteBrokenTarget();
                triggerGamepadRumble(0.8, 1.0, 160);
              } else {
                triggerImmobilizeSpell();
                triggerGamepadRumble(0.4, 0.5, 90);
              }
            }
            if (isJustPressed(4)) {
              // LB / L1 -> Kalaripayattu Parry
              triggerRockSolidParry();
              triggerGamepadRumble(0.5, 0.65, 90);
            }
            if (isJustPressed(5)) {
              // RB / R1 -> Switch Stance
              triggerSwitchStance();
            }
            if (isJustPressed(6)) {
              // LT / L2 -> Amrita Kalasha Heal
              triggerGourdHeal();
            }
            if (isJustPressed(7)) {
              // RT / R2 -> Rudra Tandava / Maya Mirage
              if (p.transformCd <= 0) {
                triggerRedTidesTransform();
              } else {
                triggerPluckOfManyClones();
              }
              triggerGamepadRumble(0.7, 0.9, 140);
            }
            if (isJustPressed(14)) triggerSwitchWeapon('twin_blades');
            if (isJustPressed(12)) triggerSwitchWeapon('jingu_bang');
            if (isJustPressed(15)) triggerSwitchWeapon('dragon_glaive');
          }
        }

        if (moveX !== 0 || moveY !== 0) {
          const len = Math.hypot(moveX, moveY) || 1;
          moveX /= len;
          moveY /= len;
          p.lastMoveDirX = moveX;
          p.lastMoveDirY = moveY;
          const speed = p.transformTimer > 0 ? 310 : 272;
          if (p.action === 'idle' || p.action === 'light_attack') {
            const mult = p.action === 'light_attack' ? 0.52 : 1.0;
            p.vx += (moveX * speed * mult - p.vx) * (1 - Math.exp(-15 * simDt));
            p.vy += (moveY * speed * 0.82 * mult - p.vy) * (1 - Math.exp(-15 * simDt));
            if (p.action === 'idle') {
              p.facing = moveX >= 0 ? 1 : -1;
            }
          } else if (p.action === 'dodge') {
            const dashProg = 1 - Math.max(0, p.actionTimer / Math.max(0.01, p.actionDuration));
            const curveMult = computeAgniDashVelocityMultiplier(dashProg);
            p.vx = p.lastMoveDirX * 560 * curveMult;
            p.vy = p.lastMoveDirY * 440 * curveMult;
          }
        } else if (p.action === 'idle') {
          p.vx *= Math.exp(-16 * simDt);
          p.vy *= Math.exp(-16 * simDt);
        } else if (p.action === 'dodge') {
          const dashProg = 1 - Math.max(0, p.actionTimer / Math.max(0.01, p.actionDuration));
          const curveMult = computeAgniDashVelocityMultiplier(dashProg);
          p.vx = p.lastMoveDirX * 560 * curveMult;
          p.vy = p.lastMoveDirY * 440 * curveMult;
        } else {
          p.vx *= Math.exp(-9 * simDt);
          p.vy *= Math.exp(-9 * simDt);
        }

        p.x += p.vx * simDt;
        p.y += p.vy * simDt;
        p.walkDistance += Math.hypot(p.vx, p.vy) * simDt;

        // Spring-damped secondary physics for Wukong's Pheasant-Feather Crown Plumes & Crimson Sash
        const targetPlumeX = -p.facing * 26 - p.vx * 0.085;
        const targetPlumeY = -12 - p.vy * 0.065 + Math.sin(now * 0.011) * 5;
        const plumeLerp = 1 - Math.exp(-14 * simDt);
        p.plumeLagX += (targetPlumeX - p.plumeLagX) * plumeLerp;
        p.plumeLagY += (targetPlumeY - p.plumeLagY) * plumeLerp;

        // Gait-synced stone-dust & ash footstep puffs so Rudra feels physically grounded on the courtyard flagstones
        if (p.walkDistance - p.lastFootstepDist >= 32 && p.elevationY < 5) {
          p.lastFootstepDist = p.walkDistance;
          spawnParticles(p.x - p.facing * 10, p.y + 3, 3, '#c8b89e', 42, 3.2, -18);
          sim.battleScars = spawnBattleScar(sim.battleScars, {
            id: ++sim.nextScarId,
            kind: 'footstep_ash',
            x: p.x - p.facing * 6,
            y: p.y + 2,
            angle: Math.atan2(p.vy, p.vx || p.facing),
            scale: 0.92,
          });
        }

        // Constrain Rudra to 2:1 Isometric Chamber Platform Polygon & Interior Chasm Channels
        const playerConstraint = constrainActorToChamber(
          p.x,
          p.y,
          p.vx,
          p.vy,
          worldW,
          worldH,
          sim.chamberIndex,
          p.action === 'dodge' || p.elevationY > 12,
          false,
          20
        );
        p.x = playerConstraint.x;
        p.y = playerConstraint.y;
        p.vx = playerConstraint.vx;
        p.vy = playerConstraint.vy;
        if (playerConstraint.vaultedChasm && sim.chasmVaultCalloutCd <= 0) {
          sim.chasmVaultCalloutCd = 1.2;
          spawnParticles(p.x, p.y - 10, 10, '#52ffd8', 110, 3.4, -20);
          spawnFloatingText(p.x, p.y - 72, 'CHASM VAULT!', '#52ffd8', 0.96);
        }

        // Cloud Step Decoy update & explosion
        if (sim.decoy.active) {
          sim.decoy.timer -= simDt;
          if (sim.decoy.timer <= 0) {
            sim.decoy.active = false;
            spawnParticles(sim.decoy.x, sim.decoy.y - 25, 24, '#5ce6ff', 180, 4.5, 80);
            damagePropsNearPoint(sim.decoy.x, sim.decoy.y, 135, 55);
            sim.enemies.forEach((e) => {
              if (e.aiState === 'ko') return;
              if (Math.hypot(e.x - sim.decoy.x, e.y - sim.decoy.y) <= 135) {
                e.hp = Math.max(0, e.hp - 55);
                const posRes = applyPostureDamage({
                  currentPosture: e.posture,
                  maxPosture: e.maxPosture,
                  postureDamage: 85,
                  alreadyBroken: e.postureBrokenTimer > 0,
                });
                e.posture = posRes.nextPosture;
                if (posRes.triggeredBreak) {
                  e.postureBrokenTimer = 4.5;
                  e.aiState = 'recover';
                  e.aiTimer = 4.5;
                }
                e.hitFlashTimer = 0.08;
                spawnFloatingText(e.x, e.y - 60, 'DECOY BLAST -55', '#5ce6ff', 1.0);
              }
            });
          }
        }

        // Update Monkey Clones (身外身法)
        for (let i = sim.clones.length - 1; i >= 0; i--) {
          const c = sim.clones[i];
          c.life -= simDt;
          c.animTime += simDt * 7;
          c.attackCooldown -= simDt;
          if (c.life <= 0) {
            spawnParticles(c.x, c.y - 20, 12, '#ffcf66', 100, 3.5, 40);
            sim.clones.splice(i, 1);
            continue;
          }

          // Seek nearest living enemy
          let target: EnemyEntity | null = null;
          let bestDist = 9999;
          for (const e of sim.enemies) {
            if (e.aiState === 'ko') continue;
            const d = Math.hypot(e.x - c.x, e.y - c.y);
            if (d < bestDist) {
              bestDist = d;
              target = e;
            }
          }

          if (target) {
            const dx = target.x - c.x;
            const dy = target.y - c.y;
            c.facing = dx >= 0 ? 1 : -1;
            if (bestDist > 58) {
              c.x += (dx / bestDist) * 235 * simDt;
              c.y += (dy / bestDist) * 198 * simDt;
            } else if (c.attackCooldown <= 0) {
              c.attackCooldown = 0.65;
              const stats = computeDerivedPlayerStats(sim.ranks);
              const cloneDmg = Math.round(26 * stats.damageMultiplier);
              target.hp = Math.max(0, target.hp - cloneDmg);
              const posRes = applyPostureDamage({
                currentPosture: target.posture,
                maxPosture: target.maxPosture,
                postureDamage: 38,
                alreadyBroken: target.postureBrokenTimer > 0,
              });
              target.posture = posRes.nextPosture;
              if (posRes.triggeredBreak) {
                target.postureBrokenTimer = 4.5;
                target.aiState = 'recover';
                target.aiTimer = 4.5;
              }
              target.hitFlashTimer = 0.045;
              spawnParticles(target.x, target.y - 22, 6, '#ffcf66', 120, 3, 100);
              spawnFloatingText(target.x, target.y - 46, `-${cloneDmg}`, '#ffcf66', 0.85);
            }
          }
        }

        // Update Sworn Party Companions (Savitri, Sanjaya & Sudarshana Sentinel)
        const livingFoes = sim.enemies.filter((e) => e.aiState !== 'ko');
        for (let ci = 0; ci < sim.companions.length; ci++) {
          const comp = sim.companions[ci];
          const spec = COMPANION_SPECS[comp.id];
          const bondRank = sim.companionBonds[comp.id] ?? 1;
          const cStats = computeCompanionStats(comp.id, bondRank);
          comp.animTime += simDt * 5.8;
          comp.attackCooldown = Math.max(0, comp.attackCooldown - simDt);
          comp.supportCooldown = Math.max(0, comp.supportCooldown - simDt);
          comp.hitFlashTimer = Math.max(0, comp.hitFlashTimer - simDt);

          // Savitri Periodic Suvarna Mend when Rudra is hurt
          if (comp.id === 'savitri' && comp.supportCooldown <= 0 && p.hp > 0 && p.hp < p.maxHp) {
            comp.supportCooldown = 5.2 * cStats.cooldownMultiplier;
            const mendAmt = 14 + (bondRank - 1) * 4;
            p.hp = Math.min(p.maxHp, p.hp + mendAmt);
            spawnParticles(p.x, p.y - 24, 10, '#3ee0a8', 95, 3.4, 30);
            if (sim.modernSettings.showPartyCallouts) {
              spawnFloatingText(p.x, p.y - 68, `SAVITRI MEND +${mendAmt}`, '#3ee0a8', 0.92);
            }
          }

          const chosenCandidate = selectCompanionTarget({
            companionX: comp.x,
            companionY: comp.y,
            playerX: p.x,
            playerY: p.y,
            tactic: sim.partyTactic,
            candidates: livingFoes.map((e) => ({
              id: e.id,
              x: e.x,
              y: e.y,
              hp: e.hp,
              maxHp: e.maxHp,
              isBoss: e.isBoss,
            })),
          });
          const targetEnemy = chosenCandidate
            ? livingFoes.find((e) => e.id === chosenCandidate.id) || null
            : null;

          // Desired formation offset around Rudra when out of combat or in protective stance
          const formX = p.x + (ci === 0 ? -56 : 56) * p.facing;
          const formY = p.y + (ci === 0 ? -38 : 38);

          if (targetEnemy && sim.partyTactic !== 'protective') {
            const dx = targetEnemy.x - comp.x;
            const dy = targetEnemy.y - comp.y;
            const dist = Math.hypot(dx, dy) || 1;
            comp.facing = dx >= 0 ? 1 : -1;
            const idealRange = spec.role === 'vanguard_tank' ? 56 : 185;
            if (dist > idealRange) {
              comp.x += (dx / dist) * spec.moveSpeedPx * simDt;
              comp.y += (dy / dist) * spec.moveSpeedPx * 0.82 * simDt;
            } else if (spec.role !== 'vanguard_tank' && dist < 95) {
              comp.x -= (dx / dist) * spec.moveSpeedPx * 0.65 * simDt;
              comp.y -= (dy / dist) * spec.moveSpeedPx * 0.55 * simDt;
            }
          } else {
            // Stay near Rudra in formation
            const fdx = formX - comp.x;
            const fdy = formY - comp.y;
            const fdist = Math.hypot(fdx, fdy);
            if (fdist > 18) {
              comp.facing = fdx >= 0 ? 1 : -1;
              comp.x += (fdx / fdist) * spec.moveSpeedPx * simDt;
              comp.y += (fdy / fdist) * spec.moveSpeedPx * 0.84 * simDt;
            } else {
              comp.facing = p.facing;
            }
          }

          if (targetEnemy && comp.attackCooldown <= 0) {
            const distToTarget = Math.hypot(targetEnemy.x - comp.x, targetEnemy.y - comp.y);
            if (distToTarget <= spec.attackRangePx + 35) {
              comp.attackCooldown = spec.attackCooldownSec * cStats.cooldownMultiplier;
              comp.facing = targetEnemy.x >= comp.x ? 1 : -1;

              if (comp.id === 'sanjaya' || comp.id === 'savitri') {
                // Launch Ranged Companion Bolt / Divya-Drishti Arrow
                const proj = sim.projectiles.find((pr) => !pr.active);
                if (proj) {
                  const angle = Math.atan2(targetEnemy.y - comp.y, targetEnemy.x - comp.x);
                  proj.active = true;
                  proj.x = comp.x + comp.facing * 16;
                  proj.y = comp.y - 18;
                  proj.vx = Math.cos(angle) * 580;
                  proj.vy = Math.sin(angle) * 580;
                  proj.radius = 12;
                  proj.damage = cStats.attackDamage;
                  proj.color = spec.accentColor;
                  proj.life = 1.2;
                  proj.deflected = true;
                  proj.isPlayerCast = comp.id === 'sanjaya';
                }
              } else {
                // Vanguard Melee Cleave
                targetEnemy.hp = Math.max(0, targetEnemy.hp - cStats.attackDamage);
                const posRes = applyPostureDamage({
                  currentPosture: targetEnemy.posture,
                  maxPosture: targetEnemy.maxPosture,
                  postureDamage: cStats.postureDamage,
                  alreadyBroken: targetEnemy.postureBrokenTimer > 0,
                });
                targetEnemy.posture = posRes.nextPosture;
                if (posRes.triggeredBreak) {
                  targetEnemy.postureBrokenTimer = 4.5;
                  targetEnemy.aiState = 'recover';
                  targetEnemy.aiTimer = 4.5;
                  recordQuestEvent('shatter_posture', 1);
                }
                targetEnemy.hitFlashTimer = 0.06;
                spawnShockwave(targetEnemy.x, targetEnemy.y, 64, spec.accentColor, 0.24);
                spawnParticles(targetEnemy.x, targetEnemy.y - 22, 8, spec.accentColor, 130, 3.2, 80);
                if (sim.modernSettings.showDamageNumbers) {
                  spawnFloatingText(
                    targetEnemy.x,
                    targetEnemy.y - 52,
                    `-${cStats.attackDamage}`,
                    spec.accentColor,
                    0.88
                  );
                }
              }
            }
          }
        }

        // Update Projectiles (Fire Monk & XueMo Blood Lotus Orbs + Deflected Projectiles)
        for (let i = 0; i < sim.projectiles.length; i++) {
          const proj = sim.projectiles[i];
          if (!proj.active) continue;
          proj.x += proj.vx * simDt;
          proj.y += proj.vy * simDt;
          proj.life -= simDt;
          if (proj.life <= 0) {
            proj.active = false;
            continue;
          }

          if (proj.deflected) {
            // Deflected projectiles & Player Agneyastra Blood-Shard Casts strike enemies!
            for (const e of sim.enemies) {
              if (e.aiState === 'ko') continue;
              if (Math.hypot(proj.x - e.x, proj.y - (e.y - 24)) <= proj.radius + 32) {
                proj.active = false;
                e.hp = Math.max(0, e.hp - proj.damage);
                e.hitFlashTimer = 0.09;
                if (proj.isPlayerCast) {
                  e.lodgedCasts = Math.min(3, (e.lodgedCasts || 0) + 1);
                  e.scorchTimer = Math.max(e.scorchTimer, 3.0);
                  spawnShockwave(e.x, e.y, 82, '#ff2a4b', 0.32);
                  spawnParticles(e.x, e.y - 24, 18, '#ff2a4b', 175, 4.4, 80);
                  spawnFloatingText(
                    e.x,
                    e.y - 66,
                    `BLOOD-SHARD LODGED -${proj.damage}!`,
                    '#ff6a42',
                    1.1
                  );
                } else {
                  spawnParticles(e.x, e.y - 24, 14, '#3ee0a8', 150, 4, 80);
                  spawnFloatingText(e.x, e.y - 62, `REFLECTED -${proj.damage}`, '#3ee0a8', 1.05);
                }
                break;
              }
            }
            continue;
          }

          const distToPlayer = Math.hypot(proj.x - p.x, proj.y - (p.y - 20));
          if (distToPlayer <= proj.radius + 20) {
            proj.active = false;
            if (p.action === 'parry') {
              soundEngine.playSpell('parry');
              if (p.focusOrbs < 4) p.focusOrbs += 1;
              spawnParticles(p.x, p.y - 26, 14, '#ffd86b', 150, 4, 60);
              spawnFloatingText(p.x, p.y - 68, 'DEFLECTED! +1 FOCUS', '#ffd86b', 1.05);
            } else if (p.invulnTimer <= 0) {
              p.hp = Math.max(0, p.hp - proj.damage);
              p.hitFlashTimer = 0.08;
              sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.32);
              soundEngine.playHit('light');
              spawnParticles(p.x, p.y - 22, 14, '#ff3b24', 155, 4.2, 120);
              spawnFloatingText(p.x, p.y - 56, `-${proj.damage}`, '#ff5252', 1.05);
            }
          }
        }

        // Coordinated Multi-Attacker Pressure (up to 4 simultaneous attackers for relentless Hades/Sekiro pressure)
        let activeAttackers = sim.enemies.filter(
          (e) => e.aiState === 'windup' || e.aiState === 'attack'
        ).length;

        // Update Enemies & Sovereign Bosses
        const stats = computeDerivedPlayerStats(sim.ranks);
        const boonMods = computeBoonModifiers(sim.activeBoons);

        for (let i = sim.enemies.length - 1; i >= 0; i--) {
          const e = sim.enemies[i];
          e.animTime += simDt;
          e.hitFlashTimer = Math.max(0, e.hitFlashTimer - simDt);
          e.slashArcAlpha = Math.max(0, e.slashArcAlpha - simDt * 3.8);
          e.parryStanceTimer = Math.max(0, (e.parryStanceTimer || 0) - simDt);
          const targetGrowth = e.isBoss ? (e.phase === 3 ? 1.10 : e.phase === 2 ? 1.05 : 1.0) : 1.0;
          e.growthScale = (e.growthScale || 1.0) + (targetGrowth - (e.growthScale || 1.0)) * (1 - Math.exp(-3.5 * simDt));
          e.scaleX = 1;
          e.scaleY = 1;
          e.displayHp += (e.hp - e.displayHp) * (1 - Math.exp(-8 * simDt));
          e.vx *= Math.exp(-8 * simDt);
          e.vy *= Math.exp(-8 * simDt);

          // Samadhi Scorch DoT tick (Nezha Boon)
          if (e.scorchTimer > 0 && e.aiState !== 'ko') {
            e.scorchTimer = Math.max(0, e.scorchTimer - simDt);
            e.scorchTickAccum += simDt;
            if (e.scorchTickAccum >= 0.45 && boonMods.scorchDps > 0) {
              e.scorchTickAccum -= 0.45;
              const burnDmg = Math.max(4, Math.round(boonMods.scorchDps * 0.45));
              e.hp = Math.max(0, e.hp - burnDmg);
              spawnParticles(e.x, e.y - 28, 4, '#ff6a2b', 65, 3.0, -40);
              spawnFloatingText(e.x, e.y - 44, `SCORCH -${burnDmg}`, '#ff7849', 0.82);
            }
          }

          const nextEx = e.x + e.vx * simDt;
          const nextEy = e.y + e.vy * simDt;
          const enemySpeedBeforeClamp = Math.hypot(e.vx, e.vy);

          const enemyConstraint = constrainActorToChamber(
            nextEx,
            nextEy,
            e.vx,
            e.vy,
            worldW,
            worldH,
            sim.chamberIndex,
            false,
            e.isBoss,
            e.isBoss ? 28 : 20
          );

          // Hades-Style Isometric Wall / Chasm-Ledge Slam Stagger when knocked into perimeter!
          if (
            (enemyConstraint.hitOuterWall || enemyConstraint.hitChasmEdge) &&
            enemySpeedBeforeClamp > 85 &&
            e.hitFlashTimer > 0
          ) {
            const slamDmg = e.isBoss ? 55 : 45;
            e.hp = Math.max(0, e.hp - slamDmg);
            const posRes = applyPostureDamage({
              currentPosture: e.posture,
              maxPosture: e.maxPosture,
              postureDamage: 82,
              alreadyBroken: e.postureBrokenTimer > 0,
            });
            e.posture = posRes.nextPosture;
            if (posRes.triggeredBreak) {
              e.postureBrokenTimer = 4.5;
              e.aiState = 'recover';
              e.aiTimer = 4.5;
            }
            e.vx = enemyConstraint.normalX * 65;
            e.vy = enemyConstraint.normalY * 65;
            sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.36);
            spawnShockwave(enemyConstraint.x, enemyConstraint.y, 88, '#ffd86b', 0.34);
            spawnParticles(enemyConstraint.x, enemyConstraint.y - 20, 20, '#ffd86b', 175, 4.4, 130);
            spawnFloatingText(
              enemyConstraint.x,
              enemyConstraint.y - 68,
              `POBI · WALL SLAM! -${slamDmg}`,
              '#ffd86b',
              1.18
            );
          } else {
            e.vx = enemyConstraint.vx;
            e.vy = enemyConstraint.vy;
          }

          e.x = enemyConstraint.x;
          e.y = enemyConstraint.y;

          // Check Death -> KO transition
          if (e.hp <= 0 && e.aiState !== 'ko') {
            e.aiState = 'ko';
            e.koTimer = 0.92;
            const baseKarma = e.isBoss ? 290 : e.type === 'furnace_titan' ? 62 : 34;
            const gainedKarma = Math.round(baseKarma * stats.karmaMultiplier);
            const gainedXp = e.isBoss ? 180 : e.type === 'furnace_titan' ? 65 : 35;
            sim.ashenKarma += gainedKarma;
            sim.karmaRunDelta += gainedKarma;
            sim.playerXp += gainedXp;
            setPlayerXp(sim.playerXp);
            sim.partyLinkCd = Math.max(0, sim.partyLinkCd - 1.2);
            sim.score += e.isBoss ? 2500 : 280;
            recordQuestEvent('slay_dharma_foes', 1);
            if (e.isBoss || e.type === 'furnace_titan') {
              recordQuestEvent('vanquish_wardens', 1);
            }
            soundEngine.playHit('heavy');

            // Trigger dramatic Hades Final-Blow Slow-Motion if Boss or last foe in chamber!
            const remainingAlive = sim.enemies.filter((foe) => foe.aiState !== 'ko' && foe.hp > 0).length;
            if (e.isBoss || (remainingAlive === 0 && sim.pendingSpawns.length === 0)) {
              sim.slowMoTimer = 0.36;
              sim.cameraZoom = BASE_CAMERA_ZOOM + 0.06;
              spawnShockwave(e.x, e.y, 185, '#ffd86b', 0.48);
            }

            spawnParticles(e.x, e.y - 26, e.isBoss ? 32 : 16, '#ff7b29', 200, 4.5, 130);
            const killAngle = Math.atan2(e.y - p.y, e.x - p.x);
            sim.battleScars = spawnBattleScar(sim.battleScars, {
              id: ++sim.nextScarId,
              kind: 'blood_splatter',
              x: e.x,
              y: e.y + 4,
              angle: killAngle,
              scale: e.isBoss ? 1.65 : e.type === 'furnace_titan' ? 1.35 : 1.05,
            });
            sim.battleScars = spawnBattleScar(sim.battleScars, {
              id: ++sim.nextScarId,
              kind: 'shattered_armor',
              x: e.x,
              y: e.y + 6,
              angle: killAngle,
              scale: e.isBoss ? 1.5 : 1.0,
            });
            spawnFloatingText(
              e.x,
              e.y - 68,
              `+${gainedKarma} KARMA`,
              '#3ee0a8',
              e.isBoss ? 1.3 : 1.05,
              e.isBoss ? 'SOVEREIGN VANQUISHED!' : undefined
            );
            continue;
          }

          if (e.aiState === 'ko') {
            e.koTimer -= simDt;
            e.scaleX = 1.0;
            e.scaleY = 1.0;
            if (e.koTimer <= 0) {
              sim.enemies.splice(i, 1);
            }
            continue;
          }

          // Boss Phase Transition Check (Vrikodara shatters his iron armor in Phase 2!)
          if (e.isBoss) {
            const nextPhase = computeBossPhase(e.hp, e.maxHp);
            if (nextPhase > e.phase) {
              e.phase = nextPhase;
              e.posture = e.maxPosture;
              e.immobilizedTimer = 0;
              sim.slowMoTimer = 0.32;
              sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.65);
              sim.screenFlashAlpha = 0.25;
              sim.screenFlashColor = '#ff521b';
              soundEngine.playGong('chamber');
              spawnShockwave(e.x, e.y, 195, '#ff5924', 0.45);
              sim.craters.push({
                x: e.x,
                y: e.y + 6,
                radius: 115,
                alpha: 0.92,
                decalFrame: e.type === 'xuemo' ? 0 : 3,
                angle: 0,
              });
              spawnParticles(e.x, e.y - 38, 42, '#ff5924', 240, 5.5, 80);
              spawnFloatingText(
                e.x,
                e.y - 95,
                e.type === 'vrikodara' && e.phase === 2
                  ? 'IRON ARMOR SHATTERED · COLOSSAL STATURE UNSEALED (1.25x)!'
                  : e.phase === 3
                  ? 'PHASE 3/3 · APOCALYPTIC TITAN TRANSFORMATION (1.42x)!'
                  : `PHASE ${e.phase}/3 · RAKSHASA WRATH AWAKENED!`,
                '#ff6a33',
                1.32
              );
              sim.bossPhaseBanner =
                e.type === 'vrikodara'
                  ? e.phase === 2
                    ? {
                        timer: 4.0,
                        title: 'VRIKODARA · PHASE II AWAKENING (1.25x STATURE)',
                        speaker: 'SANJAYA · PALIMPSEST OF KURUKSHETRA',
                        strikethrough: '“The righteous general fought with noble restraint...”',
                        correction:
                          'VRIKODARA: “MY IRON SHELL CRACKS! FEED THE ABDOMINAL FURNACE WITH ASH AND BONE!”',
                      }
                    : {
                        timer: 4.2,
                        title: 'VRIKODARA · PHASE III APOCALYPSE (1.42x TITAN)',
                        speaker: 'VRIKODARA · SOVEREIGN OF THE INFERNAL MAW',
                        strikethrough: '“And heaven blessed the victors of the eighteen days...”',
                        correction:
                          '“DRINK THE VAITARANI, RUDRA! TEN THOUSAND CHARIOTS BURN INSIDE MY RIBS!”',
                      }
                  : e.phase === 2
                  ? {
                      timer: 3.8,
                      title: 'DUNDUBHI · PHASE II BLOOD-DRUM RESONANCE (1.25x)',
                      speaker: 'DUNDUBHI · CHOLA BRONZE WAR-DEMON',
                      strikethrough: '“The temple bells rang in peaceful devotion...”',
                      correction:
                        '“BEAT THE RIBS OF THE SLAIN! BAIT MY HORNS INTO THESE PILLARS IF YOU DARE!”',
                    }
                  : {
                      timer: 4.0,
                      title: 'DUNDUBHI · PHASE III CATACLYSMIC STAMPEDE (1.42x)',
                      speaker: 'DUNDUBHI · WRATH OF THE BLEEDING CROWN',
                      strikethrough: '“The bull of dharma knelt before the altar...”',
                      correction:
                        '“NO PILLAR CAN HOLD ME NOW! EVERY STEP SHATTERS THE MANDALA!”',
                    };
              if (e.type === 'vrikodara' && e.phase >= 2) {
                sim.slagFissures.push({
                  x1: e.x - 240,
                  y1: e.y - 70,
                  x2: e.x + 240,
                  y2: e.y + 70,
                  width: 38,
                  life: 7.5,
                  maxLife: 7.5,
                });
              }
            }
          }

          if (e.tuskLodgedTimer && e.tuskLodgedTimer > 0) {
            e.tuskLodgedTimer = Math.max(0, e.tuskLodgedTimer - simDt);
          }
          if (e.vacuumActiveTimer && e.vacuumActiveTimer > 0) {
            e.vacuumActiveTimer = Math.max(0, e.vacuumActiveTimer - simDt);
          }

          if (e.postureBrokenTimer > 0) {
            e.vx = 0;
            e.vy = 0;
            e.postureBrokenTimer -= simDt;
            if (e.postureBrokenTimer <= 0) {
              e.posture = Math.round(e.maxPosture * 0.65);
              e.aiState = 'chase';
            }
            continue;
          }

          if (e.immobilizedTimer > 0) {
            e.vx = 0;
            e.vy = 0;
            e.immobilizedTimer -= simDt;
            continue;
          }

          // Full-Chamber Location Awareness: Every enemy & Sovereign Boss actively tracks Rudra's position & velocity vector across the sanctuary
          // to intercept, cut off escape lanes, and choose distance-appropriate attacks!
          const anchorX = sim.decoy.active ? sim.decoy.x : p.x;
          const anchorY = sim.decoy.active ? sim.decoy.y : p.y;
          const predictedLead = computePredictiveAimLead({
            enemyX: e.x,
            enemyY: e.y,
            playerX: anchorX,
            playerY: anchorY,
            playerVx: sim.decoy.active ? 0 : p.vx,
            playerVy: sim.decoy.active ? 0 : p.vy,
            leadTimeSeconds: e.isBoss ? 0.36 : e.type === 'fire_monk' ? 0.42 : 0.28,
          });
          const targetX = predictedLead.targetX;
          const targetY = predictedLead.targetY;
          const dx = anchorX - e.x;
          const dy = anchorY - e.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (e.aiState !== 'windup' && e.aiState !== 'attack') {
            if (Math.abs(dx) > 14) {
              e.facing = dx >= 0 ? 1 : -1;
            }
            const desiredAngle = predictedLead.aimAngle;
            let angleDiff = desiredAngle - e.aimAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            e.aimAngle += angleDiff * Math.min(1, (e.isBoss ? 9.5 : 8.2) * simDt);
          }

          if (e.aiState === 'idle' || e.aiState === 'chase') {
            e.aiTimer -= simDt;
            let stepX = 0;
            let stepY = 0;

            // Smart Tactical Pursuit, Flanking Encirclement & Anti-Backstab Reflex
            const sprintBoost = dist > 200 ? 1.24 : 1.05;
            const flankSign = e.id % 2 === 0 ? 1 : -1;
            const perpX = (-dy / dist) * flankSign;
            const perpY = (dx / dist) * flankSign;

            if (e.type === 'wolf_guai') {
              const moveSpd = 210 * sprintBoost;
              const flankWeight = dist < 190 ? 0.45 : 0.22;
              if (dist > 52) {
                stepX = ((dx / dist) * (1 - flankWeight * 0.35) + perpX * flankWeight) * moveSpd * simDt;
                stepY = ((dy / dist) * (1 - flankWeight * 0.35) + perpY * flankWeight) * moveSpd * 0.84 * simDt;
              } else {
                // Continuous tactical circling at close range so animation never flickers between walk and idle
                stepX = perpX * moveSpd * 0.52 * simDt;
                stepY = perpY * moveSpd * 0.44 * simDt;
              }
            } else if (e.type === 'fire_monk') {
              const moveSpd = 175 * sprintBoost;
              if (dist > 245) {
                stepX = (dx / dist) * moveSpd * simDt;
                stepY = (dy / dist) * moveSpd * 0.82 * simDt;
              } else if (dist < 145) {
                // Smart ranged kiting & evasive backstep when Rudra rushes in!
                stepX = -((dx / dist) * 0.95 - perpX * 0.35) * moveSpd * 0.96 * simDt;
                stepY = -((dy / dist) * 0.95 - perpY * 0.35) * moveSpd * 0.86 * simDt;
              } else {
                // Tactical kiting & orbital strafe while lining up Aghori skulls / Preta arrows
                stepX = perpX * moveSpd * 0.78 * simDt;
                stepY = perpY * moveSpd * 0.65 * simDt;
              }
            } else if (e.type === 'stone_golem' || e.type === 'furnace_titan') {
              const moveSpd = (e.type === 'furnace_titan' ? 172 : 164) * sprintBoost;
              const flankWeight = dist < 175 ? 0.30 : 0.14;
              if (dist > 60) {
                stepX = ((dx / dist) * 0.92 + perpX * flankWeight) * moveSpd * simDt;
                stepY = ((dy / dist) * 0.92 + perpY * flankWeight) * moveSpd * 0.82 * simDt;
              } else {
                stepX = perpX * moveSpd * 0.48 * simDt;
                stepY = perpY * moveSpd * 0.40 * simDt;
              }
            } else if (e.isBoss) {
              const bossSpd = (e.type === 'vrikodara' ? 205 : 196) * (1 + (e.phase - 1) * 0.14) * (dist > 210 ? 1.24 : 1.0);
              if (dist > 72) {
                stepX = (dx / dist) * bossSpd * simDt;
                stepY = (dy / dist) * bossSpd * 0.85 * simDt;
              } else {
                stepX = perpX * bossSpd * 0.45 * simDt;
                stepY = perpY * bossSpd * 0.38 * simDt;
              }
            }

            if (stepX !== 0 || stepY !== 0) {
              const stepConstraint = constrainActorToChamber(
                e.x + stepX,
                e.y + stepY,
                0,
                0,
                worldW,
                worldH,
                sim.chamberIndex,
                false,
                e.isBoss,
                e.isBoss ? 28 : 20
              );
              e.x = stepConstraint.x;
              e.y = stepConstraint.y;
            }
            const movedDist = Math.hypot(stepX, stepY);
            e.aiState = movedDist > 4 * simDt ? 'chase' : 'idle';

            const canGuard =
              e.isBoss ||
              e.type === 'stone_golem' ||
              e.type === 'furnace_titan' ||
              e.trait === 'vajra_shield';
            if (
              canGuard &&
              dist < 165 &&
              p.action === 'light_attack' &&
              e.parryStanceTimer <= 0 &&
              Math.random() < (e.isBoss ? 0.28 : 0.22)
            ) {
              e.parryStanceTimer = e.isBoss ? 1.45 : 1.25;
              spawnFloatingText(e.x, e.y - 48, 'IRON GUARD', '#ffd86b', 0.85);
            }

            const triggerDist =
              e.type === 'fire_monk' ? 375 : e.isBoss ? 150 : e.type === 'wolf_guai' ? 102 : 112;

            // Aggressive, Coordinated Sekiro / Hades Attack Pacing: up to 4 simultaneous attackers, predictive aim, multi-hit combos, ZERO sliding corridors on regular foes
            if (
              e.aiTimer <= 0 &&
              dist <= triggerDist &&
              (activeAttackers < 4 || e.isBoss)
            ) {
              activeAttackers++;
              e.aiState = 'windup';
              e.parryStanceTimer = 0;
              e.attackPattern = (e.attackPattern + 1) % (e.isBoss ? 6 : 3);
              const windupDur =
                computeSmartEnemyWindup({
                  enemyType: e.type,
                  isBoss: e.isBoss,
                  phase: e.phase,
                }) * 0.76;
              e.aiTimer = windupDur;
              e.windupDuration = windupDur;
              e.telegraphX = e.x;
              e.telegraphY = e.y;
              e.aimAngle = predictedLead.aimAngle;
              e.facing = targetX - e.x >= 0 ? 1 : -1;

              if (e.type === 'wolf_guai') {
                e.attackKind = 'cone';
                e.telegraphRadius = 96;
                e.comboHitsRemaining = e.trait === 'rakshasa_frenzy' ? 3 : 2;
              } else if (e.type === 'fire_monk') {
                e.attackKind = 'cone';
                e.telegraphRadius = 96;
                e.comboHitsRemaining = 1;
              } else if (e.type === 'stone_golem' || e.type === 'furnace_titan') {
                if (e.attackPattern === 2) {
                  e.attackKind = 'shockwave';
                  e.telegraphRadius = e.type === 'furnace_titan' ? 122 : 106;
                } else {
                  e.attackKind = 'cone';
                  e.telegraphRadius = e.type === 'furnace_titan' ? 114 : 102;
                }
                e.comboHitsRemaining = e.type === 'furnace_titan' ? 3 : 2;
              } else if (e.isBoss) {
                const scaleMult = e.growthScale || 1;
                const hasIntactPillars = sim.props.some(
                  (pr) => !pr.destroyed && pr.type === 'dragon_pillar'
                );
                const sigMove = selectBossSignatureMove({
                  bossType: e.type === 'vrikodara' ? 'vrikodara' : 'xuemo',
                  phase: e.phase,
                  attackPatternIndex: e.attackPattern,
                  distanceToPlayerPx: dist,
                  hasIntactPillars,
                });
                e.signatureMoveTitle = sigMove.title;
                e.signatureCounterplayHint = sigMove.counterplayHint;
                e.signatureCounterplayKind = sigMove.counterplayKind;
                e.signatureSpawnsSlag = sigMove.spawnsMoltenSlag;
                e.signatureSpawnsSonic = sigMove.spawnsSonicZone;
                // Only Dundubhi uses corridor when intact pillars exist for pillar-baiting; otherwise clean cone/shockwave
                e.attackKind =
                  sigMove.attackKind === 'corridor' && e.type === 'xuemo' && hasIntactPillars
                    ? 'corridor'
                    : sigMove.attackKind === 'corridor'
                    ? 'cone'
                    : sigMove.attackKind;
                e.windupDuration = sigMove.windupDurationSec * 0.80;
                e.aiTimer = e.windupDuration;
                e.comboHitsRemaining = Math.max(2, sigMove.comboFollowups + 1);
                if (e.attackKind === 'corridor') {
                  const cLen = Math.round(
                    Math.min(320, Math.max(sigMove.corridorLengthPx, dist + 44)) * scaleMult
                  );
                  e.corridorEndX = Math.max(minX, Math.min(maxX, e.x + Math.cos(e.aimAngle) * cLen));
                  e.corridorEndY = Math.max(minY, Math.min(maxY, e.y + Math.sin(e.aimAngle) * cLen));
                } else {
                  e.telegraphRadius = Math.round(Math.min(148, sigMove.telegraphRadiusPx) * scaleMult);
                }
              }

              soundEngine.playTelegraph();
            }
          } else if (e.aiState === 'windup') {
            e.vx = 0;
            e.vy = 0;
            e.aiTimer -= simDt;
            e.scaleX = 1.0;
            e.scaleY = 1.0;

            // Smart Predictive Player Tracking until the final 180ms before strike, then locks so player can dodge/parry cleanly!
            if (e.aiTimer > 0.18) {
              const desiredAngle = predictedLead.aimAngle;
              let angleDiff = desiredAngle - e.aimAngle;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
              const trackSpeed = e.isBoss ? 9.5 : 8.5;
              e.aimAngle += angleDiff * Math.min(1, trackSpeed * simDt);
              e.facing = Math.cos(e.aimAngle) >= 0 ? 1 : -1;
              if (e.attackKind === 'corridor') {
                const cLen = 310 * (e.growthScale || 1);
                e.corridorEndX = Math.max(minX, Math.min(maxX, e.telegraphX + Math.cos(e.aimAngle) * cLen));
                e.corridorEndY = Math.max(minY, Math.min(maxY, e.telegraphY + Math.sin(e.aimAngle) * cLen));
              }
            }

            // Vrikodara Abdominal Furnace Vacuum Maw: pulls Rudra inward during shockwave windup!
            if (e.type === 'vrikodara' && e.attackKind === 'shockwave' && dist > 48 && dist < 340) {
              e.vacuumActiveTimer = 0.25;
              const pullStrength = (e.phase >= 2 ? 156 : 114) * simDt;
              const invD = 1 / Math.max(1, dist);
              p.x = Math.max(minX, Math.min(maxX, p.x + (e.x - p.x) * invD * pullStrength));
              p.y = Math.max(minY, Math.min(maxY, p.y + (e.y - p.y) * invD * pullStrength));
            }

            if (e.aiTimer <= 0) {
              e.aiState = 'attack';
              e.aiTimer = e.isBoss ? 0.38 : 0.32;
              e.scaleX = 1.0;
              e.scaleY = 1.0;
              e.slashArcAlpha = 1.0;

              // Execute Enemy/Boss Attack with distinct multi-projectile patterns!
              if (e.type === 'fire_monk' && dist > 85) {
                const spreadCount = e.trait === 'agni_aura' ? 3 : 2;
                const isAghoriSkull = e.id % 2 === 0;
                for (let s = 0; s < spreadCount; s++) {
                  const proj = sim.projectiles.find((pr) => !pr.active);
                  if (proj) {
                    const spreadAngle = e.aimAngle + (s - (spreadCount - 1) * 0.5) * 0.16;
                    proj.active = true;
                    proj.x = e.x;
                    proj.y = e.y - 24;
                    proj.vx = Math.cos(spreadAngle) * 410;
                    proj.vy = Math.sin(spreadAngle) * 410;
                    proj.radius = isAghoriSkull ? 13.0 : 11.0;
                    proj.damage = 34;
                    proj.color = isAghoriSkull ? '#ff7b24' : '#ff5224';
                    proj.life = 2.8;
                    proj.deflected = false;
                  }
                }
              } else if (e.type === 'xuemo' && (e.attackPattern === 1 || e.attackPattern === 4)) {
                // Dundubhi beats his bronze war-drum chest and spawns ring of Sonic War-Drum Crescent Waves
                soundEngine.playDundubhiWarDrum();
                const orbCount = e.phase >= 2 ? 12 : 8;
                for (let k = 0; k < orbCount; k++) {
                  const pr = sim.projectiles.find((item) => !item.active);
                  if (pr) {
                    const ang = (k / orbCount) * Math.PI * 2 + e.animTime;
                    pr.active = true;
                    pr.x = e.x + Math.cos(ang) * 44;
                    pr.y = e.y - 24 + Math.sin(ang) * 32;
                    pr.vx = Math.cos(ang) * 265;
                    pr.vy = Math.sin(ang) * 215;
                    pr.radius = 12.5;
                    pr.damage = 34;
                    pr.color = '#ffbe3b';
                    pr.life = 3.2;
                    pr.deflected = false;
                  }
                }
              } else if (e.type === 'vrikodara' && e.phase >= 2 && (e.attackPattern === 2 || e.attackPattern === 5)) {
                // Vrikodara Phase 2/3 unleashes a 5-to-7-way Trident Fire-Lance Fan!
                const fanCount = e.phase === 3 ? 7 : 5;
                for (let k = 0; k < fanCount; k++) {
                  const pr = sim.projectiles.find((item) => !item.active);
                  if (pr) {
                    const ang = e.aimAngle + (k - Math.floor(fanCount / 2)) * 0.22;
                    pr.active = true;
                    pr.x = e.x + Math.cos(ang) * 48;
                    pr.y = e.y - 28 + Math.sin(ang) * 32;
                    pr.vx = Math.cos(ang) * 340;
                    pr.vy = Math.sin(ang) * 305;
                    pr.radius = 13.0;
                    pr.damage = 38;
                    pr.color = '#ff3824';
                    pr.life = 2.8;
                    pr.deflected = false;
                  }
                }
              }

              // Geometric Hit Detection using pure unit-tested rules!
              let playerHit = false;
              let isGroundQuake = false;
              const isElevatedImmune = p.stance === 'pillar' && p.elevationY > 10;

              if (e.attackKind === 'corridor') {
                // Dash enemy along the corridor!
                const originX = e.telegraphX;
                const originY = e.telegraphY;
                const halfW = e.isBoss ? 56 : 42;
                playerHit = isPointInDashCorridor({
                  px: p.x,
                  py: p.y,
                  startX: originX,
                  startY: originY,
                  endX: e.corridorEndX,
                  endY: e.corridorEndY,
                  halfWidth: halfW,
                });
                e.x = Math.max(minX, Math.min(maxX, e.corridorEndX));
                e.y = Math.max(minY, Math.min(maxY, e.corridorEndY));

                // Check Dundubhi Pillar-Baiting Tusk-Lodge & Armor Crack Mechanic (v7 Section 9)!
                if (e.type === 'xuemo') {
                  let hitPillar = false;
                  for (const pr of sim.props) {
                    if (!pr.destroyed && pr.type === 'dragon_pillar') {
                      const hitCorridor = isPointInDashCorridor({
                        px: pr.x,
                        py: pr.y,
                        startX: originX,
                        startY: originY,
                        endX: e.x,
                        endY: e.y,
                        halfWidth: 74,
                      });
                      if (hitCorridor || Math.hypot(pr.x - e.x, pr.y - e.y) < 95) {
                        pr.hp = 0;
                        pr.destroyed = true;
                        pr.hitFlashTimer = 0.25;
                        hitPillar = true;
                        spawnParticles(pr.x, pr.y - 36, 32, '#d4a548', 240, 5.5, 95);
                      }
                    }
                  }
                  const intactPillarsLeft = sim.props.some(
                    (pr) => !pr.destroyed && pr.type === 'dragon_pillar'
                  );
                  const hitArenaWall =
                    !intactPillarsLeft &&
                    (e.x <= minX + 12 || e.x >= maxX - 12 || e.y <= minY + 12 || e.y >= maxY - 12);

                  if (hitPillar || (hitArenaWall && !e.armorCracked)) {
                    e.armorCracked = true;
                    const pillarDmg = 280;
                    e.hp = Math.max(1, e.hp - pillarDmg);
                    e.posture = 0;
                    e.tuskLodgedTimer = 3.0;
                    e.postureBrokenTimer = 3.0;
                    e.comboHitsRemaining = 0;
                    e.aiState = 'recover';
                    e.aiTimer = 3.0;
                    e.hitFlashTimer = 0.3;
                    sim.hitstopTimer = 0.11;
                    sim.cameraShakeTrauma = 1.0;
                    soundEngine.playHit('heavy');
                    spawnShockwave(e.x, e.y, 165, '#ff6a2b', 0.48);
                    spawnParticles(e.x, e.y - 32, 42, '#ff9233', 260, 6, 110);
                    spawnFloatingText(
                      e.x,
                      e.y - 96,
                      `TUSKS LODGED FOR 3.0s! WAR-DRUM ARMOR CRACKED (-${pillarDmg})`,
                      '#ffd86b',
                      1.38,
                      'STRIKE THE BRONZE DRUM OR PRESS [F] TO EXECUTE'
                    );
                  }
                }

                damagePropsNearPoint(e.x, e.y, 85, 95);
                sim.craters.push({
                  x: e.x,
                  y: e.y + 4,
                  radius: e.isBoss ? 86 : 58,
                  alpha: 0.88,
                  decalFrame: e.type === 'xuemo' ? 0 : 3,
                  angle: e.aimAngle,
                });
                if (sim.craters.length > 10) sim.craters.shift();
              } else if (e.attackKind === 'shockwave') {
                isGroundQuake = true;
                playerHit = isPointInShockwaveRing({
                  px: p.x,
                  py: p.y,
                  centerX: e.x,
                  centerY: e.y,
                  outerRadius: e.telegraphRadius,
                  elevatedImmune: false, // Checked below so we can show the elevated callout!
                });
                damagePropsNearPoint(e.x, e.y, e.telegraphRadius, 120);
                spawnShockwave(
                  e.x,
                  e.y,
                  e.telegraphRadius * 1.05,
                  e.type === 'xuemo' ? '#ff384c' : '#ff9233',
                  0.42
                );
                // v7 Section 9 & Pillar 2: Vrikodara vomits molten slag fissures splitting the arena; Dundubhi plants Sonic War-Drum Resonance Zones!
                if (e.type === 'vrikodara' && (e.phase >= 2 || e.signatureSpawnsSlag)) {
                  const fissureCount = e.phase === 3 ? 3 : 1;
                  for (let fi = 0; fi < fissureCount; fi++) {
                    const fAng = e.aimAngle + (fi - Math.floor(fissureCount / 2)) * 0.42;
                    sim.slagFissures.push({
                      x1: e.x,
                      y1: e.y,
                      x2: Math.max(minX, Math.min(maxX, e.x + Math.cos(fAng) * 295)),
                      y2: Math.max(minY, Math.min(maxY, e.y + Math.sin(fAng) * 225)),
                      width: 36,
                      life: 7.0,
                      maxLife: 7.0,
                    });
                  }
                }
                if (e.type === 'xuemo' && e.signatureSpawnsSonic) {
                  sim.sonicZones.push({
                    id: ++sim.nextSonicZoneId,
                    x: p.x,
                    y: p.y,
                    radius: e.phase >= 2 ? 108 : 92,
                    timer: 1.55,
                    maxTimer: 1.55,
                    detonated: false,
                  });
                }
                sim.craters.push({
                  x: e.x,
                  y: e.y + 6,
                  radius: e.telegraphRadius * 0.72,
                  alpha: 0.92,
                  decalFrame: e.type === 'xuemo' ? 0 : 2,
                  angle: 0,
                });
                if (sim.craters.length > 10) sim.craters.shift();
              } else {
                // Directional Frontal Cone Cleave ('cone') — enemy stands grounded on its feet and swings its weapon (NO sliding!)
                const halfArc = e.isBoss ? Math.PI * 0.44 : Math.PI * 0.38;
                playerHit = isPointInConeTelegraph({
                  px: p.x,
                  py: p.y,
                  originX: e.x,
                  originY: e.y,
                  aimAngle: e.aimAngle,
                  radius: e.telegraphRadius,
                  halfAngleRad: halfArc,
                });
                damagePropsNearPoint(
                  e.x + Math.cos(e.aimAngle) * 52,
                  e.y + Math.sin(e.aimAngle) * 38,
                  68,
                  80
                );
                if (e.isBoss || e.type === 'furnace_titan' || e.type === 'stone_golem') {
                  sim.craters.push({
                    x: e.x + Math.cos(e.aimAngle) * 48,
                    y: e.y + Math.sin(e.aimAngle) * 30 + 6,
                    radius: e.isBoss ? 72 : 54,
                    alpha: 0.82,
                    decalFrame: e.type === 'vrikodara' ? 3 : 1,
                    angle: e.aimAngle,
                  });
                  if (sim.craters.length > 10) sim.craters.shift();
                }
              }

              spawnParticles(
                e.x,
                e.y - 14,
                e.isBoss ? 14 : 8,
                e.isBoss ? '#ff3d2e' : '#ff8a36',
                165,
                3.8,
                120
              );

              if (playerHit) {
                // Check if Pillar Stance elevates above ground quake
                if (isGroundQuake && isElevatedImmune) {
                  spawnFloatingText(
                    p.x,
                    p.y - 72,
                    'PILLAR STANCE · ELEVATED ABOVE QUAKE!',
                    '#ffd86b',
                    1.08
                  );
                } else if (p.action === 'parry') {
                  const rawDmg = e.isBoss
                    ? 64 + e.phase * 12
                    : e.type === 'furnace_titan'
                    ? 56
                    : e.type === 'stone_golem'
                    ? 50
                    : 44;
                  const parryRes = evaluateParryImpact({
                    parryElapsedSec: p.parryElapsedSec,
                    incomingDamage: rawDmg,
                    attackerMaxPosture: e.maxPosture,
                    isUnblockableCrimsonAttack: e.attackKind === 'shockwave',
                  });

                  soundEngine.playSpell('parry');
                  const posDmg = Math.round(
                    parryRes.postureDamageDealt * boonMods.postureDamageMultiplier
                  );
                  e.posture = Math.max(0, e.posture - posDmg);
                  e.hitFlashTimer = 0.16;

                  if (parryRes.tier === 'perfect_golden') {
                    sim.runParriesLanded += 1;
                    e.comboHitsRemaining = 0;
                    e.aiState = 'recover';
                    e.aiTimer = 1.35;
                    p.parryCd = 0.25;
                    p.riposteWindowTimer = parryRes.riposteWindowDurationSec;
                    p.hp = Math.min(p.maxHp, p.hp + parryRes.healAmount);
                    if (p.focusOrbs < 4) p.focusOrbs = Math.min(4, p.focusOrbs + parryRes.focusOrbsGranted);
                    p.stylePoints = Math.min(1200, p.stylePoints + 145);
                    p.styleDecayTimer = 5.5;
                    sim.hitstopTimer = parryRes.hitstopSec;
                    sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.52);
                    sim.screenFlashAlpha = 0.18;
                    sim.screenFlashColor = '#ffd86b';
                    spawnShockwave(p.x, p.y, 124, '#ffd86b', 0.32);
                    spawnParticles(p.x, p.y - 24, 18, '#ffd86b', 210, 4.4, 80);
                    spawnFloatingText(
                      p.x,
                      p.y - 78,
                      parryRes.calloutTitle,
                      '#ffd86b',
                      1.18,
                      parryRes.calloutSubtitle
                    );
                  } else if (parryRes.tier === 'standard_guard') {
                    sim.runParriesLanded += 1;
                    p.hp = Math.max(0, p.hp - parryRes.damageTaken);
                    p.stylePoints = Math.min(1200, p.stylePoints + 55);
                    p.styleDecayTimer = 5.5;
                    sim.hitstopTimer = parryRes.hitstopSec;
                    spawnShockwave(p.x, p.y, 84, '#d8c398', 0.24);
                    spawnFloatingText(
                      p.x,
                      p.y - 72,
                      parryRes.calloutTitle,
                      '#f5ebd6',
                      1.04,
                      parryRes.calloutSubtitle
                    );
                  } else {
                    p.hp = Math.max(0, p.hp - parryRes.damageTaken);
                    p.hitFlashTimer = 0.14;
                    spawnFloatingText(
                      p.x,
                      p.y - 72,
                      parryRes.calloutTitle,
                      '#ff5252',
                      1.08,
                      parryRes.calloutSubtitle
                    );
                  }

                  if (e.posture <= 0) {
                    e.postureBrokenTimer = 4.2;
                    sim.runPostureBreaks += 1;
                    recordQuestEvent('shatter_posture', 1);
                    spawnFloatingText(
                      e.x,
                      e.y - 76,
                      'POSTURE BROKEN! [F] EXECUTE',
                      '#ff4d3b',
                      1.16
                    );
                  }
                } else if (p.invulnTimer <= 0) {
                  // Punishing enemy blows so combat demands sharp parrying and dodging
                  const rawDmg = e.isBoss
                    ? 74 + e.phase * 14
                    : e.type === 'furnace_titan'
                    ? 66
                    : e.type === 'stone_golem'
                    ? 58
                    : 52;
                  p.hp = Math.max(0, p.hp - rawDmg);
                  p.hitFlashTimer = 0.14;
                  sim.hitstopTimer = Math.max(sim.hitstopTimer, 0.068);
                  sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.56);
                  soundEngine.playHit('heavy');
                  spawnParticles(p.x, p.y - 20, 16, '#ff3824', 185, 4.4, 130);
                  spawnFloatingText(p.x, p.y - 60, `-${rawDmg} HP`, '#ff5252', 1.2);
                }
              }
            }
          } else if (e.aiState === 'attack') {
            e.vx = 0;
            e.vy = 0;
            e.aiTimer -= simDt;
            if (e.aiTimer <= 0) {
              // Boss & Elite Relentless Multi-Hit Combo Chain!
              if (e.comboHitsRemaining > 0 && e.hp > 0) {
                e.comboHitsRemaining -= 1;
                e.aiState = 'windup';
                const chainDur = e.isBoss ? 0.38 : 0.42;
                e.aiTimer = chainDur;
                e.windupDuration = chainDur;
                e.telegraphX = e.x;
                e.telegraphY = e.y;
                e.aimAngle = predictedLead.aimAngle;
                e.facing = targetX - e.x >= 0 ? 1 : -1;
                e.attackKind = e.comboHitsRemaining === 0 && e.phase === 3 ? 'shockwave' : 'cone';
                e.telegraphRadius = e.isBoss ? 136 : 98;
                soundEngine.playTelegraph();
              } else {
                e.aiState = 'recover';
                e.aiTimer =
                  computeSmartEnemyRecovery({
                    isBoss: e.isBoss,
                    phase: e.phase,
                  }) * 0.68;
              }
            }
          } else if (e.aiState === 'recover') {
            e.vx = 0;
            e.vy = 0;
            e.aiTimer -= simDt;
            if (e.aiTimer <= 0) {
              e.aiState = 'chase';
              e.aiTimer = e.isBoss ? 0.42 : 0.58;
            }
          }
        }

        // Enemy-to-Enemy & Enemy-to-Player Separation (prevents enemies stacking on top of Wukong)
        for (let i = 0; i < sim.enemies.length; i++) {
          const a = sim.enemies[i];
          if (a.aiState === 'ko') continue;

          // Keep a clean martial-arts personal-space ring around Rudra (scaled for miniature stature)
          const pdx = a.x - p.x;
          const pdy = (a.y - p.y) * 1.35;
          const pDist = Math.hypot(pdx, pdy);
          const minPlayerSep = a.isBoss ? 36 : 28;
          if (pDist < minPlayerSep) {
            const safeDist = pDist || 1;
            const nx = pDist > 0.1 ? pdx / safeDist : a.facing * -1;
            const ny = pDist > 0.1 ? (a.y - p.y) / safeDist : 0.35;
            const push = (minPlayerSep - pDist) * 8.5 * simDt;
            a.x = Math.max(minX, Math.min(maxX, a.x + nx * push));
            a.y = Math.max(minY, Math.min(maxY, a.y + ny * push));
          }

          // Spread enemies apart from each other so they encircle rather than overlap
          for (let j = i + 1; j < sim.enemies.length; j++) {
            const b = sim.enemies[j];
            if (b.aiState === 'ko') continue;
            const edx = b.x - a.x;
            const edy = (b.y - a.y) * 1.35;
            const eDist = Math.hypot(edx, edy);
            const minEnemySep = 34;
            if (eDist < minEnemySep) {
              const safeEDist = eDist || 1;
              const enx = eDist > 0.1 ? edx / safeEDist : 1;
              const eny = eDist > 0.1 ? (b.y - a.y) / safeEDist : 0.4;
              const epush = (minEnemySep - eDist) * 4.5 * simDt;
              a.x = Math.max(minX, Math.min(maxX, a.x - enx * epush));
              a.y = Math.max(minY, Math.min(maxY, a.y - eny * epush));
              b.x = Math.max(minX, Math.min(maxX, b.x + enx * epush));
              b.y = Math.max(minY, Math.min(maxY, b.y + eny * epush));
            }
          }
        }

        // Check Player Defeat or Life-Saving Strand Revive (with Dramatic Slow-Motion Death Collapse)
        if (p.hp <= 0) {
          if (p.extraLives > 0) {
            p.extraLives -= 1;
            p.hp = Math.round(p.maxHp * 0.7);
            p.displayHp = p.hp;
            p.invulnTimer = 2.0;
            soundEngine.playSpell('clones');
            spawnParticles(p.x, p.y - 18, 28, '#ffd86b', 180, 4, 40);
            spawnFloatingText(
              p.x,
              p.y - 54,
              'MRITYUNJAYA MANTRA · DEATHLESS REVIVE!',
              '#ffd86b',
              1.1
            );
          } else if (sim.deathTimer <= 0) {
            sim.deathTimer = 1.15;
            sim.slowMoTimer = 1.15;
            sim.cameraZoom = BASE_CAMERA_ZOOM + 0.16;
            sim.cameraShakeTrauma = 0.85;
            sim.screenFlashAlpha = 0.36;
            sim.screenFlashColor = '#9e1420';
            p.vx = 0;
            p.vy = 0;
            p.action = 'idle';
            spawnShockwave(p.x, p.y, 175, '#c91e2a', 0.65);
            spawnParticles(p.x, p.y - 22, 42, '#c91e2a', 220, 4.5, 90);
            soundEngine.playGong('defeat');
          } else {
            sim.deathTimer -= rawDt;
            p.vx = 0;
            p.vy = 0;
            if (sim.deathTimer <= 0) {
              sim.state = 'gameover';
              document.body.dataset.state = 'gameover';
              setGameState('gameover');
              setOutcomeMode('defeat');
            }
          }
        }

        // Check Multi-Wave Summoning Rifts & Chamber Clear Progression
        const activeInWave = sim.enemies.filter((e) => e.aiState !== 'ko').length + sim.pendingSpawns.length + sim.summoningRifts.length;
        if (activeInWave === 0 && sim.waveQueue.length > 0 && sim.state === 'playing') {
          sim.currentWave += 1;
          const nextWaveSpecs = sim.waveQueue.filter((w) => w.wave === sim.currentWave);
          sim.waveQueue = sim.waveQueue.filter((w) => w.wave !== sim.currentWave);
          for (const sp of nextWaveSpecs) {
            sim.summoningRifts.push({
              x: sp.x * worldW,
              y: sp.y * worldH,
              timer: 1.15 + sp.delay,
              maxTimer: 1.15 + sp.delay,
              type: sp.type,
              trait: sp.trait,
              wardenRigKey: sp.wardenRigKey,
              wardenTitle: sp.wardenTitle,
            });
          }
          soundEngine.playGong('chamber');
          spawnFloatingText(
            p.x,
            p.y - 58,
            `WAVE ${sim.currentWave}/${sim.maxWave} · ASURA REINFORCEMENTS!`,
            '#ff7b29',
            1.05
          );
        }

        const totalRemaining =
          sim.enemies.length + sim.pendingSpawns.length + sim.summoningRifts.length + sim.waveQueue.length;
        if (totalRemaining === 0 && sim.state === 'playing') {
          if (sim.chamberClearTimer === 0) {
            sim.chamberClearTimer = 0.01;
            const clearBonus = chamberSpec.isBossChamber ? 180 : 65;
            sim.ashenKarma += clearBonus;
            sim.karmaRunDelta += clearBonus;
            sim.score += chamberSpec.isBossChamber ? 1500 : 500;
            setAshenKarma(sim.ashenKarma);
            try {
              window.localStorage.setItem(
                'kaliyuga_save_v1',
                JSON.stringify({ ashenKarma: sim.ashenKarma, ranks: sim.ranks })
              );
            } catch {}

            if (sim.chamberIndex < CHAMBERS.length - 1) {
              sim.boonReadyCount += 1;
              setBoonReadyCount(sim.boonReadyCount);
              // Dramatic Gate-to-Another-Path Unsealing VFX at Left & Right Sanctuary Gates!
              const chGeom = getChamberGeometry(sim.chamberIndex);
              const lGx = worldW * chGeom.leftGate.x;
              const lGy = worldH * chGeom.leftGate.y;
              const rGx = worldW * chGeom.rightGate.x;
              const rGy = worldH * chGeom.rightGate.y;
              soundEngine.playGong('chamber');
              sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.55);
              spawnShockwave(lGx, lGy, 165, '#38bdf8', 0.52);
              spawnShockwave(rGx, rGy, 165, '#34d399', 0.52);
              spawnParticles(lGx, lGy - 18, 28, '#38bdf8', 210, 4.6, 55);
              spawnParticles(rGx, rGy - 18, 28, '#34d399', 210, 4.6, 55);
              sim.lightningArcs.push({
                x1: lGx,
                y1: lGy - 220,
                x2: lGx,
                y2: lGy,
                life: 0.42,
                maxLife: 0.42,
                color: '#38bdf8',
              });
              sim.lightningArcs.push({
                x1: rGx,
                y1: rGy - 220,
                x2: rGx,
                y2: rGy,
                life: 0.42,
                maxLife: 0.42,
                color: '#34d399',
              });
              spawnFloatingText(
                p.x,
                p.y - 68,
                `SANCTUARY GATES UNSEALED! +${clearBonus} KARMA`,
                '#3ee0a8',
                1.14,
                'WALK INTO THE LEFT GATE (CELESTIAL BOON) OR RIGHT GATE (AMRITA +30 HP)'
              );
            }
          } else {
            sim.chamberClearTimer += simDt;
            const chGeom = getChamberGeometry(sim.chamberIndex);
            const leftGateX = worldW * chGeom.leftGate.x;
            const leftGateY = worldH * chGeom.leftGate.y;
            const rightGateX = worldW * chGeom.rightGate.x;
            const rightGateY = worldH * chGeom.rightGate.y;
            const enteredLeftGate = Math.hypot(p.x - leftGateX, p.y - leftGateY) < 120;
            const enteredRightGate = Math.hypot(p.x - rightGateX, p.y - rightGateY) < 120;

            if (sim.chamberIndex === CHAMBERS.length - 1) {
              if (sim.chamberClearTimer >= 1.1) {
                soundEngine.playGong('victory');
                setSliceStage('shard1_memory');
              }
            } else if (enteredRightGate) {
              // Player chose Right Gate: Amrita Kalasha Max HP +30 & +95 Karma Cache!
              p.maxHp += 30;
              p.hp = Math.min(p.maxHp, p.hp + 90);
              p.displayHp = p.hp;
              sim.ashenKarma += 95;
              sim.karmaRunDelta += 95;
              setAshenKarma(sim.ashenKarma);
              sim.boonReadyCount = 0;
              setBoonReadyCount(0);
              soundEngine.playSpell('gourd');
              const prevIdx = sim.chamberIndex;
              loadChamber(prevIdx + 1, false);
              if (prevIdx === 0) setSliceStage('savitri_lantern_interlude');
              else if (prevIdx === 1) setSliceStage('preserver_interlude');
              else if (prevIdx === 3) setSliceStage('dundubhi_aftermath');
            } else if (
              sim.boonReadyCount > 0 &&
              (enteredLeftGate || sim.chamberClearTimer >= 14.0)
            ) {
              // Player walked into Left Gate (or 14s timeout elapsed): Present Hades Celestial Boon Altar!
              const offer = rollCelestialBoonOffer(sim.activeBoons);
              if (offer.length > 0) {
                setBoonChoices(offer);
                setBoonModalOpen(true);
                sim.modalPaused = true;
              } else {
                sim.boonReadyCount = 0;
                setBoonReadyCount(0);
                const prevIdx = sim.chamberIndex;
                loadChamber(prevIdx + 1, false);
                if (prevIdx === 0) setSliceStage('savitri_lantern_interlude');
                else if (prevIdx === 1) setSliceStage('preserver_interlude');
                else if (prevIdx === 3) setSliceStage('dundubhi_aftermath');
              }
            } else if (sim.chamberClearTimer >= 15.0) {
              const prevIdx = sim.chamberIndex;
              loadChamber(prevIdx + 1, false);
              if (prevIdx === 0) setSliceStage('savitri_lantern_interlude');
              else if (prevIdx === 1) setSliceStage('preserver_interlude');
              else if (prevIdx === 3) setSliceStage('dundubhi_aftermath');
            }
          }
        }
      }

      // Decay Chain Lightning Arcs
      for (let i = sim.lightningArcs.length - 1; i >= 0; i--) {
        sim.lightningArcs[i].life -= dt;
        if (sim.lightningArcs[i].life <= 0) {
          sim.lightningArcs.splice(i, 1);
        }
      }

      // Update Particles (Pillar 3 High-Performance Canvas Physics + Floor Blood Splatter Impacts)
      const bloodFloorImpacts = stepParticleSimulation(sim.particles, dt);
      for (let b = 0; b < bloodFloorImpacts.length; b++) {
        if (Math.random() < 0.35) {
          const imp = bloodFloorImpacts[b];
          sim.battleScars = spawnBattleScar(sim.battleScars, {
            id: ++sim.nextScarId,
            kind: 'blood_splatter',
            x: imp.x,
            y: imp.y,
            angle: imp.angle,
            scale: 0.62,
          });
        }
      }

      for (let i = 0; i < sim.afterimages.length; i++) {
        const ai = sim.afterimages[i];
        if (!ai.active) continue;
        ai.life -= dt;
        if (ai.life <= 0) ai.active = false;
      }

      for (let i = 0; i < sim.shockwaves.length; i++) {
        const sw = sim.shockwaves[i];
        if (!sw.active) continue;
        sw.life -= dt;
        const progress = 1 - Math.max(0, sw.life / sw.maxLife);
        sw.radius = sw.maxRadius * (0.18 + 0.82 * (1 - Math.pow(1 - progress, 2.4)));
        if (sw.life <= 0) sw.active = false;
      }

      for (let i = 0; i < sim.craters.length; i++) {
        sim.craters[i].alpha = Math.max(0.22, sim.craters[i].alpha - dt * 0.045);
      }
      sim.battleScars = updateBattleScars(sim.battleScars, dt);

      for (let i = 0; i < sim.ambientMotes.length; i++) {
        const m = sim.ambientMotes[i];
        m.phase += dt * 1.9;
        m.x += (m.vx + Math.sin(m.phase) * 9) * dt;
        m.y += m.vy * dt;
        if (m.y < -20) {
          m.y = ch + 20;
          m.x = Math.random() * cw;
        } else if (m.y > ch + 20) {
          m.y = -20;
          m.x = Math.random() * cw;
        }
        if (m.x < -20) m.x = cw + 20;
        if (m.x > cw + 20) m.x = -20;
      }

      for (let i = 0; i < sim.floatingTexts.length; i++) {
        const ft = sim.floatingTexts[i];
        if (!ft.active) continue;
        ft.x += ft.vx * dt;
        ft.y += ft.vy * dt;
        ft.vy += 95 * dt; // Subtle arc gravity so numbers pop up and arc cleanly
        ft.life -= dt;
        if (ft.life <= 0) ft.active = false;
      }

      // Decay Molten Slag Fissures & Evaluate Vaitarani Magma Hazard + Update Dundubhi Sonic War-Drum Zones
      for (let i = sim.slagFissures.length - 1; i >= 0; i--) {
        sim.slagFissures[i].life -= dt;
        if (sim.slagFissures[i].life <= 0) {
          sim.slagFissures.splice(i, 1);
        }
      }
      if (simDt > 0 && sim.slagFissures.length > 0) {
        const slagEval = evaluateMoltenSlagHazard({
          px: sim.player.x,
          py: sim.player.y,
          elevationY: sim.player.elevationY,
          fissures: sim.slagFissures,
        });
        if (slagEval.inSlag) {
          sim.player.vx *= slagEval.moveSpeedMultiplier;
          sim.player.vy *= slagEval.moveSpeedMultiplier;
          sim.slagTickAccum += simDt;
          if (sim.slagTickAccum >= 0.55 && sim.player.invulnTimer <= 0) {
            sim.slagTickAccum = 0;
            sim.player.hp = Math.max(0, sim.player.hp - slagEval.burnDamagePerTick);
            sim.player.hitFlashTimer = 0.08;
            spawnParticles(sim.player.x, sim.player.y - 16, 8, '#ff5924', 110, 3.4, -30);
            spawnFloatingText(
              sim.player.x,
              sim.player.y - 64,
              `MOLTEN SLAG -${slagEval.burnDamagePerTick}`,
              '#ff6a33',
              0.95
            );
          }
        } else {
          sim.slagTickAccum = Math.max(0, sim.slagTickAccum - simDt);
        }
      }
      for (let i = sim.sonicZones.length - 1; i >= 0; i--) {
        const sz = sim.sonicZones[i];
        sz.timer -= dt;
        if (sz.timer <= 0) {
          if (!sz.detonated && sim.state === 'playing') {
            sz.detonated = true;
            soundEngine.playDundubhiWarDrum();
            spawnShockwave(sz.x, sz.y, sz.radius * 1.15, '#ffd86b', 0.36);
            spawnParticles(sz.x, sz.y - 16, 22, '#ffd86b', 185, 4.2, 80);
            const distToZone = Math.hypot(sim.player.x - sz.x, sim.player.y - sz.y);
            if (
              distToZone <= sz.radius &&
              sim.player.elevationY < 10 &&
              sim.player.invulnTimer <= 0
            ) {
              const sonicDmg = 32;
              sim.player.hp = Math.max(0, sim.player.hp - sonicDmg);
              sim.player.hitFlashTimer = 0.1;
              sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.35);
              spawnFloatingText(
                sim.player.x,
                sim.player.y - 64,
                `WAR-DRUM RESONANCE -${sonicDmg}`,
                '#ffd86b',
                1.05
              );
            }
          }
          sim.sonicZones.splice(i, 1);
        }
      }

      // ========================================================================
      // RENDER 2.5D ISOMETRIC WORLD & ACTORS (AAA HADES-GRADE CAMERA PIPELINE)
      // ========================================================================
      ctx.save();
      // Step 1: Render Deep Parallax Underworld Abyss (0.38x camera parallax lava/blood chasm & sunken pillars)
      renderParallaxAbyss(ctx, cw, ch, sim.camX, sim.camY, now, sim.chamberIndex);

      // Apply dynamic camera zoom & high-impact directional + rotational trauma shake around viewport center
      ctx.translate(cw * 0.5, ch * 0.5);
      if (Math.abs(sim.cameraZoom - 1) > 0.0005) {
        ctx.scale(sim.cameraZoom, sim.cameraZoom);
      }
      if (sim.cameraShakeTrauma > 0) {
        const traumaSq = sim.cameraShakeTrauma * sim.cameraShakeTrauma;
        const shakeAmp = traumaSq * 24;
        const harmonicX = Math.sin(now * 0.068) * shakeAmp * 0.65 + (Math.random() - 0.5) * shakeAmp * 0.75;
        const harmonicY = Math.cos(now * 0.082) * shakeAmp * 0.65 + (Math.random() - 0.5) * shakeAmp * 0.75;
        const shakeRoll = Math.sin(now * 0.054) * traumaSq * 0.018;
        ctx.translate(harmonicX, harmonicY);
        ctx.rotate(shakeRoll);
      }
      ctx.translate(-cw * 0.5, -ch * 0.5);

      // ======================================================================
      // WORLD-SPACE CAMERA PASS (-sim.camX, -sim.camY over 1.54x Spacious Arena)
      // ======================================================================
      ctx.save();
      ctx.translate(-sim.camX, -sim.camY);

      const isChamberCleared =
        sim.chamberClearTimer > 0 &&
        sim.enemies.length === 0 &&
        sim.pendingSpawns.length === 0 &&
        sim.waveQueue.length === 0 &&
        sim.summoningRifts.length === 0;
      const nextSpec = CHAMBERS[sim.chamberIndex + 1];

      // Dynamic Chamber Background State Swap:
      // 1) Chamber VII swaps from Locked (u58tfju58tfju58t...) -> Unlocked (8jz0rn8jz0rn8jz0...) on clear!
      // 2) Final Boss Chamber VIII swaps from Naga Sanctum (25mxvb...) -> Cosmic Blood-Eclipse (9sbc7m...) in Phase 2/3!
      let activeBgUrl = chamberSpec.backgroundUrl;
      if (isChamberCleared && chamberSpec.unlockedBackgroundUrl) {
        activeBgUrl = chamberSpec.unlockedBackgroundUrl;
      } else if (
        activeBoss &&
        activeBoss.type === 'vrikodara' &&
        activeBoss.phase >= 2 &&
        chamberSpec.phase2BackgroundUrl
      ) {
        activeBgUrl = chamberSpec.phase2BackgroundUrl;
      }
      let bgImg =
        bgImagesRef.current.get(activeBgUrl) || bgImagesRef.current.get(chamberSpec.backgroundUrl);
      if (!bgImg && typeof window !== 'undefined') {
        const lazyBg = new Image();
        lazyBg.src = activeBgUrl;
        bgImagesRef.current.set(activeBgUrl, lazyBg);
        bgImg = lazyBg;
      }

      const vedicVfxAsset = getProcessedSpriteSync(GAME_ASSETS.vedicCombatVfx2x2);
      const skullAndLotusVfxAsset = getProcessedSpriteSync(GAME_ASSETS.vfxSkullAndLotus2x2);
      const decalsAsset = getProcessedSpriteSync(GAME_ASSETS.groundDecals2x2);
      const rupturesAsset = getProcessedSpriteSync(GAME_ASSETS.groundRuptures2x2);
      const moltenCraterAsset = getProcessedSpriteSync(GAME_ASSETS.moltenCraterDecal);
      const impactsAsset = getProcessedSpriteSync(GAME_ASSETS.combatImpacts2x2);
      const brazierFlameAsset = getProcessedSpriteSync(GAME_ASSETS.brazierFlame4x1);
      const flicker = 0.88 + Math.sin(now * 0.008) * 0.08 + Math.cos(now * 0.019) * 0.04;
      const primaryLightX = (chamberSpec.braziers[0]?.x ?? 0.5) * worldW;

      // Step 2: Render Hand-Painted 16:9 Isometric Arena, Exit Gate Archways, Reward Orbs & Surface Craters
      renderIsometricChamberPlatform(
        ctx,
        worldW,
        worldH,
        bgImg,
        chamberSpec.floorTint,
        sim.chamberIndex,
        now,
        isChamberCleared,
        Boolean(nextSpec?.isBossChamber),
        () => {
          // Subtle Atmospheric Edge Vignette to frame the hand-painted chamber without darkening the playfield
          ctx.save();
          const chamberGrade = ctx.createRadialGradient(
            worldW * 0.5,
            worldH * 0.52,
            worldW * 0.34,
            worldW * 0.5,
            worldH * 0.52,
            worldW * 0.72
          );
          chamberGrade.addColorStop(0, 'rgba(0, 0, 0, 0)');
          chamberGrade.addColorStop(0.75, 'rgba(6, 4, 5, 0.06)');
          chamberGrade.addColorStop(1, 'rgba(3, 2, 4, 0.22)');
          ctx.fillStyle = chamberGrade;
          ctx.fillRect(0, 0, worldW, worldH);
          ctx.restore();

          // 1.7. Pillar 1: Persistent Battle Scars & Warzone Floor Decals (Blood Splatters, Scorch Craters, Shattered Armor, Footstep Ash)
          renderBattleScarsOnFloor(ctx, sim.battleScars);

          // 1.8. Draw Persistent Hand-Painted Sanskrit Om Yantra Magma Craters & Ground Ruptures
          for (let i = 0; i < sim.craters.length; i++) {
            const cr = sim.craters[i];
            ctx.save();
            ctx.translate(cr.x, cr.y);
            ctx.scale(1, 0.62);
            ctx.rotate(cr.angle || 0);
            ctx.globalAlpha = cr.alpha;

            if (cr.decalFrame === 1 && moltenCraterAsset) {
              const drawSize = cr.radius * 2.4;
              ctx.drawImage(
                moltenCraterAsset.cleanCanvas,
                -drawSize * 0.5,
                -drawSize * 0.5,
                drawSize,
                drawSize
              );
            } else if (cr.decalFrame === 2 && rupturesAsset && rupturesAsset.frames.length >= 4) {
              const rupFrame = rupturesAsset.frames[i % rupturesAsset.frames.length];
              const drawSize = cr.radius * 2.45;
              ctx.drawImage(
                rupturesAsset.cleanCanvas,
                rupFrame.sx,
                rupFrame.sy,
                rupFrame.sw,
                rupFrame.sh,
                -drawSize * 0.5,
                -drawSize * 0.5,
                drawSize,
                drawSize
              );
            } else if (vedicVfxAsset && vedicVfxAsset.frames.length >= 4) {
              const craterFrame = vedicVfxAsset.frames[3]; // Bottom-Right: Glowing Sanskrit Om Yantra Magma Crater
              const drawSize = cr.radius * 2.55;
              ctx.drawImage(
                vedicVfxAsset.cleanCanvas,
                craterFrame.sx,
                craterFrame.sy,
                craterFrame.sw,
                craterFrame.sh,
                -drawSize * 0.5,
                -drawSize * 0.5,
                drawSize,
                drawSize
              );
            } else if (impactsAsset && impactsAsset.frames.length >= 4) {
              const craterFrame = impactsAsset.frames[3];
              const drawSize = cr.radius * 2.35;
              ctx.drawImage(
                impactsAsset.cleanCanvas,
                craterFrame.sx,
                craterFrame.sy,
                craterFrame.sw,
                craterFrame.sh,
                -drawSize * 0.5,
                -drawSize * 0.5,
                drawSize,
                drawSize
              );
            }
            ctx.restore();
          }
        }
      );

      // Step 2.2: Interactive Hand-Painted 4-Stage Floor Traps (zhy8c6zhy8c6zhy8_5d2df495.png)
      updateAndRenderPressureTraps(
        ctx,
        sim.traps,
        simDt,
        now,
        sim.player,
        sim.enemies,
        {
          onTrapTriggered: (tx, ty) => {
            soundEngine.playTelegraph();
            spawnParticles(tx, ty - 8, 8, '#ffe14d', 90, 3.2, -30);
          },
          onTrapErupt: (trap, hitPlayer, enemiesHitCount) => {
            soundEngine.playHit('heavy');
            sim.cameraShakeTrauma = Math.min(1, sim.cameraShakeTrauma + 0.32);
            const trapColor = trap.kind === 'agni_vent' ? '#ff6a18' : '#38e8ff';
            spawnShockwave(trap.x, trap.y, 112, trapColor, 0.36);
            spawnParticles(trap.x, trap.y - 24, 26, trapColor, 210, 4.6, 120);
            if (enemiesHitCount > 0) {
              spawnFloatingText(
                trap.x,
                trap.y - 72,
                trap.kind === 'agni_vent'
                  ? 'AGNI LOTUS VENT! -145'
                  : 'IRON SPIKE TRAP! -145',
                '#ffd86b',
                1.18
              );
            } else if (hitPlayer) {
              spawnFloatingText(sim.player.x, sim.player.y - 68, 'TRAP ERUPTION -24', '#ff5252', 1.05);
            }
          },
        }
      );

      // Step 2.3: Render v7 Act I [E] Look Artifact & Boss Mythic Mechanics (Molten Slag Fissures, Tusk Lodge, Furnace Vacuum)
      sim.nearestLookObject = renderAndFindChamberLookObject(
        ctx,
        chamberSpec.id,
        sim.player.x,
        sim.player.y,
        now * 0.001,
        sim.storyFlags.looks,
        false
      );
      const dundubhiBaitPillar =
        activeBoss &&
        activeBoss.type === 'xuemo' &&
        activeBoss.aiState === 'windup' &&
        activeBoss.attackKind === 'corridor'
          ? findBaitablePillarOnTrajectory({
              bossX: activeBoss.x,
              bossY: activeBoss.y,
              aimAngle: activeBoss.aimAngle,
              pillars: sim.props,
            })
          : null;
      renderBossArenaHazards(
        ctx,
        now * 0.001,
        sim.slagFissures,
        sim.sonicZones,
        dundubhiBaitPillar
      );
      renderBossMythicMechanics(
        ctx,
        now * 0.001,
        activeBoss
          ? {
              type: activeBoss.type,
              x: activeBoss.x,
              y: activeBoss.y,
              phase: activeBoss.phase,
              tuskLodgedTimer: activeBoss.tuskLodgedTimer,
              vacuumActiveTimer: activeBoss.vacuumActiveTimer,
            }
          : null,
        sim.slagFissures
      );

      // Step 2.4: Keep ground flagstone art crystal clear without radial orange/pink GI blob noise during combat
      void renderWorldSpaceLumenGI;

      // 2. Living Background Animation: 4-Frame Hand-Painted Roaring Agni Brazier Flame Flipbook (vqynauvqynauvqyn_da9af05e.png)
      ctx.save();
      chamberSpec.braziers.forEach((b, bIdx) => {
        const bx = b.x * worldW;
        const by = b.y * worldH;
        const r = b.radius * 1.35 * flicker;

        // Warm additive floor light pool around each brazier
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const grad = ctx.createRadialGradient(bx, by, 4, bx, by, r);
        grad.addColorStop(0, b.color + '78');
        grad.addColorStop(0.45, b.color + '28');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 12 FPS 4-Frame Hand-Painted Roaring Agni Flame Flipbook (scaled for miniature perspective)
        if (brazierFlameAsset && brazierFlameAsset.frames.length > 0) {
          const flameIdx =
            (Math.floor(now * 0.012) + bIdx) % brazierFlameAsset.frames.length;
          const ff = brazierFlameAsset.frames[flameIdx];
          const flameH = 72 * (0.94 + Math.sin(now * 0.015 + bIdx) * 0.06);
          const flameW = (ff.sw / Math.max(1, ff.sh)) * flameH;
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.translate(bx, by);
          ctx.drawImage(
            brazierFlameAsset.cleanCanvas,
            ff.sx,
            ff.sy,
            ff.sw,
            ff.sh,
            -flameW * 0.5,
            -flameH * 0.84,
            flameW,
            flameH
          );
          ctx.restore();
        }
      });

      // Draw Active Hades Multi-Wave Summoning Pentagram Rifts using Hand-Painted Ground Decal Frame 3
      for (const rift of sim.summoningRifts) {
        const prog = 1 - Math.max(0, rift.timer / Math.max(0.1, rift.maxTimer));
        const riftSize = 84 * (0.45 + prog * 0.65);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.translate(rift.x, rift.y);
        ctx.scale(1, 0.58);
        ctx.rotate(now * 0.0035);
        ctx.globalAlpha = Math.min(1, 0.35 + prog * 0.65);

        if (decalsAsset && decalsAsset.frames.length >= 4) {
          const rf = decalsAsset.frames[3]; // Bottom-Right: Swirling Magenta-Crimson Summoning Pentagram Rift
          ctx.drawImage(
            decalsAsset.cleanCanvas,
            rf.sx,
            rf.sy,
            rf.sw,
            rf.sh,
            -riftSize * 0.5,
            -riftSize * 0.5,
            riftSize,
            riftSize
          );
        }
        ctx.restore();
      }
      ctx.restore();

      // 2.5. Draw Expanding Ground Shockwave Rings (Fast Decay — Low Persistence to Prevent Visual Interference)
      for (let i = 0; i < sim.shockwaves.length; i++) {
        const sw = sim.shockwaves[i];
        if (!sw.active) continue;
        const alpha = Math.pow(Math.max(0, sw.life / sw.maxLife), 1.45);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = alpha * 0.62;
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 2.4 * (0.35 + alpha * 0.65);
        ctx.beginPath();
        ctx.ellipse(sw.x, sw.y, sw.radius, sw.radius * 0.52, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 3. Clean, Uncluttered Hostile Ground Rings & Cleave Arcs (Zero Rectangular Charge Boxes or Floating Text Clutter)
      sim.enemies.forEach((e) => {
        if (e.aiState === 'windup') {
          const totalDur = Math.max(0.15, e.windupDuration || 0.6);
          const progress = Math.max(0, Math.min(1, 1 - e.aiTimer / totalDur));
          const isImminent = e.aiTimer <= 0.18;
          const borderStroke = isImminent ? '#ffffff' : '#ff2438';
          const fillTint = isImminent
            ? 'rgba(255, 45, 65, 0.24)'
            : 'rgba(220, 24, 48, 0.12)';

          ctx.save();
          if (e.attackKind === 'shockwave') {
            const maxR = e.telegraphRadius;
            const fillR = maxR * (0.2 + progress * 0.8);

            ctx.translate(e.x, e.y);
            ctx.scale(1, 0.56);

            ctx.fillStyle = fillTint;
            ctx.beginPath();
            ctx.arc(0, 0, fillR, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = borderStroke;
            ctx.lineWidth = isImminent ? 2.4 : 1.8;
            ctx.beginPath();
            ctx.arc(0, 0, maxR, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            // Subtle frontal cleave arc on the ground
            const maxR = Math.min(115, e.telegraphRadius);
            const fillR = maxR * (0.25 + progress * 0.75);
            const halfArc = 0.72;

            ctx.translate(e.x, e.y);
            ctx.scale(1, 0.58);
            ctx.rotate(e.aimAngle);

            ctx.fillStyle = fillTint;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, fillR, -halfArc, halfArc);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = borderStroke;
            ctx.lineWidth = isImminent ? 2.2 : 1.6;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, maxR, -halfArc, halfArc);
            ctx.closePath();
            ctx.stroke();
          }
          ctx.restore();
        }

        // Golden Posture-Broken Execute Ring
        if (e.postureBrokenTimer > 0 && e.aiState !== 'ko') {
          ctx.save();
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = '#ffd86b';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.ellipse(e.x, e.y, 38, 20, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      });

      const wukongAsset = getProcessedSpriteSync(GAME_ASSETS.rudra.idle);

      // 3.5. Draw Luminous Motion Afterimages ONLY when 3D model is not yet active (prevents 2D greatsword sprite ghosts overlapping 3D Rudra!)
      if (!rudra3dRef.current?.isReady) {
        for (let i = 0; i < sim.afterimages.length; i++) {
          const ai = sim.afterimages[i];
          if (!ai.active) continue;
          const aiAsset = getProcessedSpriteSync(ai.assetUrl) || wukongAsset;
          if (!aiAsset || aiAsset.frames.length === 0) continue;

          const alpha = Math.max(0, ai.life / ai.maxLife) * 0.56;
          const safeIdx = Math.max(0, Math.min(aiAsset.frames.length - 1, ai.frameIndex));
          const frame = aiAsset.frames[safeIdx];
          const baseH = aiAsset.baseFrameHeight || frame.sh;
          const pixelScale = ai.targetHeight / baseH;
          const drawW = frame.sw * pixelScale;
          const drawH = frame.sh * pixelScale;
          const tintCanvas =
            ai.tint === 'jade'
              ? aiAsset.jadeCanvas
              : ai.tint === 'gold'
              ? aiAsset.goldCanvas
              : aiAsset.flashCanvas;

          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = alpha;
          ctx.translate(ai.x, ai.y - ai.elevationY);
          ctx.scale(ai.facing, 1);
          ctx.drawImage(
            tintCanvas,
            frame.sx,
            frame.sy,
            frame.sw,
            frame.sh,
            -drawW * 0.5,
            -drawH + 5,
            drawW,
            drawH
          );
          ctx.restore();
        }
      }

      // 4. Depth-Sort all 2.5D Actors (Destructible Props, Enemies, Clones, Decoy, Rudra) by Y coordinate
      type RenderActor =
        | { kind: 'player'; y: number }
        | { kind: 'companion'; y: number; companion: PartyCompanionEntity }
        | { kind: 'enemy'; y: number; enemy: EnemyEntity }
        | { kind: 'clone'; y: number; clone: CloneEntity }
        | { kind: 'decoy'; y: number }
        | { kind: 'prop'; y: number; prop: DestructiblePropEntity };

      const actors: RenderActor[] = [{ kind: 'player', y: sim.player.y }];
      sim.companions.forEach((comp) => actors.push({ kind: 'companion', y: comp.y, companion: comp }));
      sim.enemies.forEach((e) => actors.push({ kind: 'enemy', y: e.y, enemy: e }));
      sim.clones.forEach((c) => actors.push({ kind: 'clone', y: c.y, clone: c }));
      sim.props.forEach((pr) => {
        // Render intact props AND shattered Kurukshetra Yupa Pillar rubble!
        if (!pr.destroyed || pr.type === 'dragon_pillar') {
          actors.push({ kind: 'prop', y: pr.y, prop: pr });
        }
      });
      if (sim.decoy.active) {
        actors.push({ kind: 'decoy', y: sim.decoy.y });
      }
      actors.sort((a, b) => a.y - b.y);

      actors.forEach((act) => {
        if (act.kind === 'prop') {
          const pr = act.prop;
          const propUrl =
            pr.type === 'dragon_pillar'
              ? pr.destroyed
                ? GAME_ASSETS.kaliyugaProps.pillarRubble
                : GAME_ASSETS.kaliyugaProps.kurukshetraPillar
              : pr.type === 'incense_cauldron'
              ? GAME_ASSETS.kaliyugaProps.brahmashiraShrine
              : pr.type === 'weapon_rack'
              ? GAME_ASSETS.kaliyugaProps.brokenChariot
              : GAME_ASSETS.kaliyugaProps.vaitaraniBoat;
          const singlePropAsset = getProcessedSpriteSync(propUrl);

          const targetH =
            pr.type === 'dragon_pillar'
              ? pr.destroyed
                ? 44
                : 68
              : pr.type === 'pagoda_lantern'
              ? 58
              : pr.type === 'weapon_rack'
              ? 62
              : 58;
          const shakeX = pr.shakeTimer > 0 ? (Math.random() - 0.5) * 5 : 0;

          if (!pr.destroyed && (pr.type === 'incense_cauldron' || pr.type === 'pagoda_lantern')) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.translate(pr.x, pr.y - 14);
            const gRadius = pr.type === 'incense_cauldron' ? 38 : 30;
            const pGrad = ctx.createRadialGradient(0, 0, 3, 0, 0, gRadius);
            pGrad.addColorStop(0, 'rgba(255, 152, 42, 0.34)');
            pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = pGrad;
            ctx.beginPath();
            ctx.arc(0, 0, gRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          drawSpriteFrame(
            ctx,
            singlePropAsset,
            0,
            1,
            pr.x + shakeX,
            pr.y,
            targetH,
            targetH,
            1,
            1,
            1,
            pr.hitFlashTimer > 0,
            0,
            pr.destroyed ? 19 : 17,
            'none',
            0,
            primaryLightX
          );

          if (!pr.destroyed && pr.hp < pr.maxHp) {
            const bw = 26;
            const bx = pr.x - bw * 0.5;
            const by = pr.y - targetH - 5;
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(bx - 1, by - 1, bw + 2, 3.5);
            ctx.fillStyle = '#f2c45a';
            ctx.fillRect(bx, by, bw * Math.max(0, pr.hp / pr.maxHp), 2.0);
          }
        } else if (act.kind === 'decoy') {
          const decoyAsset = getProcessedSpriteSync(GAME_ASSETS.rudra.idle);
          ctx.save();
          ctx.globalAlpha = 0.68;
          drawSpriteFrame(
            ctx,
            decoyAsset,
            0,
            1,
            sim.decoy.x,
            sim.decoy.y,
            68,
            68,
            sim.player.facing,
            1,
            1,
            true,
            0,
            16,
            'jade',
            0,
            primaryLightX
          );
          ctx.restore();
        } else if (act.kind === 'clone') {
          const c = act.clone;
          const clonePoseUrl =
            Math.floor(c.animTime) % 2 === 0
              ? GAME_ASSETS.rudra.slash1
              : GAME_ASSETS.rudra.run;
          const cloneAsset = getProcessedSpriteSync(clonePoseUrl);
          ctx.save();
          ctx.globalAlpha = 0.90;
          drawSpriteFrame(
            ctx,
            cloneAsset,
            0,
            1,
            c.x,
            c.y,
            68,
            68,
            c.facing,
            1,
            1,
            false,
            0,
            16,
            'gold',
            0,
            primaryLightX
          );
          ctx.restore();
        } else if (act.kind === 'companion') {
          const comp = act.companion;
          const cSpec = COMPANION_SPECS[comp.id];
          const compBob = Math.abs(Math.sin(comp.animTime * 6.5)) * 2.2;
          const isSkillCast = comp.supportCooldown > 8.5;
          const isAttacking = comp.attackCooldown > 0.65;
          const compSpeed = Math.hypot(sim.player.vx, sim.player.vy);

          // Bespoke 4-Frame Companion Sprite Sheets for Savitri (Lantern Bearer) & Sanjaya (Blind Seer)
          const compSheetUrl =
            comp.id === 'savitri'
              ? GAME_ASSETS.companionSheets.savitriSheet4x1
              : comp.id === 'sanjaya'
              ? GAME_ASSETS.companionSheets.sanjayaSheet4x1
              : GAME_ASSETS.enemySheets.kaliyugaAvatarSheet2x2;
          const compAsset = getProcessedSpriteSync(compSheetUrl) || wukongAsset;
          const compFrameIdx = isAttacking
            ? 3
            : isSkillCast
            ? 2
            : compSpeed > 14
            ? Math.floor(comp.animTime * 6.5) % 2
            : 0;

          // Sacred Companion Ground Formation Ring + Grounded 3D Contact Shadow
          drawGrounded3DContactShadow(ctx, {
            worldX: comp.x,
            worldY: comp.y,
            baseRadius: 18,
            elevationY: compBob,
            lightSourceX: primaryLightX,
            accentColor: cSpec.accentColor,
          });

          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.translate(comp.x, comp.y);
          ctx.scale(1, 0.52);
          ctx.strokeStyle = cSpec.accentColor;
          ctx.lineWidth = isSkillCast ? 2.6 : 1.6;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.arc(0, 0, isSkillCast ? 28 : 21, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          const enemy3dForComp = enemy3dRef.current;
          const comp3dKind: RegularEnemy3DKind =
            comp.id === 'sanjaya'
              ? 'fire_monk'
              : comp.id === 'vishnu_guardian'
              ? 'stone_golem'
              : 'wolf_guai';
          const compNumericId =
            comp.id === 'savitri' ? -101 : comp.id === 'sanjaya' ? -102 : -103;
          const renderedComp3D =
            sim.enemyRenderMode === 'all_3d' &&
            enemy3dForComp &&
            enemy3dForComp.renderEnemy({
              id: compNumericId,
              kind: comp3dKind,
              trait: comp.id === 'savitri' ? 'vajra_shield' : undefined,
              animTime: comp.animTime,
              vx: isAttacking ? comp.facing * 90 : 0,
              vy: 0,
              facing: comp.facing,
              aimAngle: comp.facing === 1 ? 0 : Math.PI,
              aiState: isAttacking ? 'attack' : 'idle',
              windupProgress: 0,
              isPostureBroken: false,
              isHitFlash: comp.hitFlashTimer > 0 || isSkillCast,
              isParrying: false,
            });

          if (renderedComp3D && enemy3dForComp) {
            const compDrawSize = 84;
            ctx.save();
            ctx.translate(comp.x, comp.y - compBob);
            ctx.drawImage(
              enemy3dForComp.getActiveCanvas(),
              -compDrawSize * 0.5,
              -compDrawSize * 0.78,
              compDrawSize,
              compDrawSize
            );
            ctx.restore();
          } else {
            drawSpriteFrame(
              ctx,
              compAsset,
              compFrameIdx,
              4,
              comp.x,
              comp.y,
              74,
              74,
              comp.facing,
              isAttacking ? 1.08 : 1,
              1,
              comp.hitFlashTimer > 0,
              compBob,
              18,
              comp.id === 'sanjaya' ? 'jade' : 'gold',
              0,
              primaryLightX
            );
          }

          // Savitri's Golden Lotus Lantern Burst (Frame 2 of vedicCombatVfx2x2) when healing or link-striking
          if (
            (isSkillCast || isAttacking) &&
            comp.id === 'savitri' &&
            vedicVfxAsset &&
            vedicVfxAsset.frames.length >= 3
          ) {
            const lotusFrame = vedicVfxAsset.frames[2];
            const lotusSize = isSkillCast ? 86 : 64;
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.88;
            ctx.translate(comp.x + comp.facing * 18, comp.y - 28 - compBob);
            ctx.drawImage(
              vedicVfxAsset.cleanCanvas,
              lotusFrame.sx,
              lotusFrame.sy,
              lotusFrame.sw,
              lotusFrame.sh,
              -lotusSize * 0.5,
              -lotusSize * 0.5,
              lotusSize,
              lotusSize
            );
            ctx.restore();
          } else if (isAttacking) {
            const compRibbon = computeWeaponSlashRibbon({
              originX: comp.x,
              originY: comp.y - 16 - compBob,
              aimAngle: comp.facing === 1 ? 0 : Math.PI,
              swingProgress: Math.min(1, comp.attackCooldown),
              radius: 36,
              stance: comp.id === 'savitri' ? 'thrust' : 'pillar',
              isHeavy: false,
            });
            renderWeaponBoneSlashRibbon(ctx, compRibbon, Math.min(1, comp.attackCooldown * 0.85));
          }

          if (sim.modernSettings.showPartyCallouts) {
            const tagY = comp.y - 48 - compBob;
            ctx.save();
            ctx.font = "bold 7.5px 'Cinzel', Georgia, serif";
            ctx.textAlign = 'center';
            ctx.strokeStyle = 'rgba(0,0,0,0.92)';
            ctx.lineWidth = 2.4;
            const shortLabel =
              comp.id === 'savitri'
                ? 'SAVITRI'
                : comp.id === 'sanjaya'
                ? 'SANJAYA'
                : 'SENTINEL';
            ctx.strokeText(shortLabel, comp.x, tagY);
            ctx.fillStyle = cSpec.accentColor;
            ctx.fillText(shortLabel, comp.x, tagY);

            const bw = 24;
            const bx = comp.x - bw * 0.5;
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.fillRect(bx, tagY + 2.5, bw, 2.2);
            ctx.fillStyle = cSpec.accentColor;
            ctx.fillRect(bx, tagY + 2.5, bw * Math.max(0, comp.hp / comp.maxHp), 2.2);
            ctx.restore();
          }
        } else if (act.kind === 'enemy') {
          const e = act.enemy;
          const isFlash = e.hitFlashTimer > 0;
          const bob = 0;
          const bossRim = e.isBoss && (e.phase >= 2 || e.aiState === 'windup') ? 'gold' : 'none';
          const enemySkewX = 0;

          if (e.type === 'xuemo' || e.type === 'vrikodara') {
            // MULTI-ROW GREEN-SCREEN CHROMA-KEYED BOSS SPRITE SHEETS BY DEFAULT
            const boss3d = boss3dRef.current;
            const bossType = e.type === 'xuemo' ? 'dundubhi' : 'vrikodara';
            const growthMult = e.growthScale || 1.0;
            const renderedBoss3D =
              sim.enemyRenderMode === 'all_3d' &&
              boss3d &&
              boss3d.updateAndRender({
                kind: bossType,
                dt: simDt > 0 ? simDt : dt,
                vx: e.vx,
                vy: e.vy,
                facing: e.facing,
                aimAngle: e.aimAngle,
                aiState: e.aiState,
                attackKind: e.attackKind,
                attackPattern: e.attackPattern,
                windupProgress:
                  e.aiState === 'windup'
                    ? Math.min(1, Math.max(0, 1 - e.aiTimer / Math.max(0.01, e.windupDuration)))
                    : 0,
                phase: e.phase,
                armorCracked: Boolean(e.armorCracked),
                isPostureBroken: e.postureBrokenTimer > 0,
                isHitFlash: isFlash,
                isParrying: e.parryStanceTimer > 0,
              });

            const bossAnimState: 'idle' | 'walk' | 'windup' | 'attack' | 'special' | 'hurt' | 'death' =
              e.aiState === 'ko'
                ? 'death'
                : e.postureBrokenTimer > 0 || (e.tuskLodgedTimer && e.tuskLodgedTimer > 0)
                ? 'hurt'
                : e.aiState === 'attack'
                ? e.attackKind === 'shockwave' || e.phase >= 2
                  ? 'special'
                  : 'attack'
                : e.aiState === 'windup'
                ? 'windup'
                : e.aiState === 'chase'
                ? 'walk'
                : 'idle';

            const bossStateProgress =
              e.aiState === 'ko'
                ? 1 - Math.max(0, e.koTimer / 0.92)
                : e.aiState === 'windup'
                ? 1 - Math.max(0, e.aiTimer / Math.max(0.05, e.windupDuration))
                : e.aiState === 'attack'
                ? 1 - Math.max(0, e.aiTimer / 0.38)
                : 0;

            if (renderedBoss3D && boss3d) {
              drawSpriteFrame(
                ctx,
                undefined,
                0,
                1,
                e.x,
                e.y,
                64 * growthMult,
                0,
                e.facing,
                1,
                1,
                false,
                bob,
                20 * growthMult
              );

              const baseSize = e.type === 'vrikodara' ? 96 : 92;
              const drawSize = Math.round(baseSize * growthMult);
              const anchorX = -drawSize * 0.5;
              const anchorY = -drawSize * 0.78;

              ctx.save();
              ctx.translate(e.x, e.y);
              ctx.drawImage(boss3d.canvas, anchorX, anchorY, drawSize, drawSize);
              if (isFlash) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.38;
                ctx.drawImage(boss3d.canvas, anchorX, anchorY, drawSize, drawSize);
              }
              ctx.restore();
            } else if (e.type === 'xuemo') {
              const dundubhiSheetUrl =
                e.phase >= 2
                  ? GAME_ASSETS.bossSheets.dundubhiMinotaurSheetP2
                  : GAME_ASSETS.bossSheets.dundubhiMinotaurSheetP1;
              let dundubhiAsset = getProcessedSpriteSync(dundubhiSheetUrl);
              if (!dundubhiAsset) {
                loadAndProcessSprite(dundubhiSheetUrl, {
                  mode: 'character',
                  gridLayout: 'multirow',
                });
                dundubhiAsset = getProcessedSpriteSync(
                  GAME_ASSETS.bossSheets.dundubhiPhase1SheetA2x2
                );
              }
              const explicitBossFrame = getMultiRowFrameBounds(
                dundubhiAsset,
                bossAnimState,
                e.animTime,
                bossStateProgress
              );
              const bossTargetH = Math.round(84 * growthMult);
              drawSpriteFrame(
                ctx,
                dundubhiAsset,
                0,
                4,
                e.x,
                e.y,
                bossTargetH,
                bossTargetH,
                e.facing,
                1,
                1,
                isFlash,
                bob,
                22 * growthMult,
                bossRim,
                enemySkewX,
                primaryLightX,
                explicitBossFrame
              );
            } else {
              const vrikodaraSheetUrl = GAME_ASSETS.bossSheets.vrikodaraDemonicKingSheet;
              let vrikodaraAsset = getProcessedSpriteSync(vrikodaraSheetUrl);
              if (!vrikodaraAsset) {
                loadAndProcessSprite(vrikodaraSheetUrl, {
                  mode: 'character',
                  gridLayout: 'multirow',
                });
                vrikodaraAsset = getProcessedSpriteSync(
                  GAME_ASSETS.bossSheets.vrikodaraPhase1Sheet2x2
                );
              }
              const explicitBossFrame = getMultiRowFrameBounds(
                vrikodaraAsset,
                bossAnimState,
                e.animTime,
                bossStateProgress
              );
              const bossTargetH = Math.round(88 * growthMult);
              drawSpriteFrame(
                ctx,
                vrikodaraAsset,
                0,
                4,
                e.x,
                e.y,
                bossTargetH,
                bossTargetH,
                e.facing,
                1,
                1,
                isFlash,
                bob,
                24 * growthMult,
                bossRim,
                enemySkewX,
                primaryLightX,
                explicitBossFrame
              );
            }
          } else {
            // REGULAR ENEMIES & ELITE WARDENS: Compact Rudra-scale stature (62px–74px) for spacious, readable combat!
            const sheetUrl =
              e.spriteSheetUrl ||
              (e.type === 'wolf_guai'
                ? GAME_ASSETS.enemySheets.bronzeSpearmanSheet
                : e.type === 'fire_monk'
                ? GAME_ASSETS.enemySheets.hoodedMageSheet
                : e.type === 'stone_golem'
                ? GAME_ASSETS.enemySheets.fantasyKnightSheet
                : GAME_ASSETS.enemySheets.nagaWarriorSheet);

            let sheetAsset = getProcessedSpriteSync(sheetUrl);
            if (!sheetAsset && isMultiRowSpriteUrl(sheetUrl)) {
              loadAndProcessSprite(sheetUrl, {
                mode: 'character',
                gridLayout: 'multirow',
              });
            }

            const enemyAnimState: 'idle' | 'walk' | 'windup' | 'attack' | 'special' | 'hurt' | 'death' =
              e.aiState === 'ko'
                ? 'death'
                : e.postureBrokenTimer > 0
                ? 'hurt'
                : e.aiState === 'attack'
                ? e.attackKind === 'shockwave' || e.trait === 'agni_aura'
                  ? 'special'
                  : 'attack'
                : e.aiState === 'windup'
                ? 'windup'
                : e.aiState === 'chase'
                ? 'walk'
                : 'idle';

            const enemyStateProgress =
              e.aiState === 'ko'
                ? 1 - Math.max(0, e.koTimer / 0.92)
                : e.aiState === 'windup'
                ? 1 - Math.max(0, e.aiTimer / Math.max(0.05, e.windupDuration))
                : e.aiState === 'attack'
                ? 1 - Math.max(0, e.aiTimer / 0.32)
                : 0;

            const explicitEnemyFrame = getMultiRowFrameBounds(
              sheetAsset,
              enemyAnimState,
              e.animTime,
              enemyStateProgress
            );

            const animFrame =
              e.aiState === 'attack'
                ? 3
                : e.aiState === 'windup'
                ? 2
                : e.aiState === 'chase'
                ? Math.floor(e.animTime * 8.0) % 4
                : Math.floor(e.animTime * 3.2) % 2;

            // Regular enemies are Rudra height (64–68px), Elite Wardens slightly taller (72px)
            const targetH =
              e.type === 'furnace_titan'
                ? 72
                : e.type === 'stone_golem'
                ? 68
                : e.type === 'fire_monk'
                ? 64
                : 64;

            const enemy3d = enemy3dRef.current;
            const renderedEnemy3D =
              sim.enemyRenderMode === 'all_3d' &&
              enemy3d &&
              enemy3d.renderEnemy({
                id: e.id,
                kind: e.type as RegularEnemy3DKind,
                wardenRigKey: e.wardenRigKey,
                trait: e.trait,
                animTime: e.animTime,
                vx: e.vx,
                vy: e.vy,
                facing: e.facing,
                aimAngle: e.aimAngle,
                aiState: e.aiState,
                windupProgress:
                  e.aiState === 'windup'
                    ? Math.min(1, Math.max(0, 1 - e.aiTimer / Math.max(0.01, e.windupDuration)))
                    : 0,
                isPostureBroken: e.postureBrokenTimer > 0,
                isHitFlash: isFlash,
                isParrying: e.parryStanceTimer > 0,
              });

            if (renderedEnemy3D && enemy3d) {
              drawGrounded3DContactShadow(ctx, {
                worldX: e.x,
                worldY: e.y,
                baseRadius:
                  e.type === 'furnace_titan' ? 19 : e.type === 'stone_golem' ? 17 : 15,
                elevationY: bob,
                lightSourceX: primaryLightX,
                accentColor:
                  e.aiState === 'windup'
                    ? '#ff3b2f'
                    : e.trait === 'vajra_shield'
                    ? '#5ce6ff'
                    : '#d4a548',
              });

              const drawSize =
                e.type === 'furnace_titan'
                  ? 78
                  : e.type === 'stone_golem'
                  ? 72
                  : e.type === 'fire_monk'
                  ? 66
                  : 66;
              const anchorX = -drawSize * 0.5;
              const anchorY = -drawSize * 0.78;
              const activeEnemyCanvas = enemy3d.getActiveCanvas();

              ctx.save();
              ctx.translate(e.x, e.y - bob);
              ctx.drawImage(activeEnemyCanvas, anchorX, anchorY, drawSize, drawSize);
              if (isFlash) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.42;
                ctx.drawImage(activeEnemyCanvas, anchorX, anchorY, drawSize, drawSize);
              }
              ctx.restore();
            } else {
              drawSpriteFrame(
                ctx,
                sheetAsset,
                animFrame,
                4,
                e.x,
                e.y,
                targetH,
                targetH,
                e.facing,
                1,
                1,
                isFlash,
                bob,
                targetH * 0.26,
                e.trait === 'vajra_shield' ? 'jade' : 'none',
                enemySkewX,
                primaryLightX,
                explicitEnemyFrame
              );
            }
          }

          if (e.parryStanceTimer > 0 && e.aiState !== 'ko') {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.translate(e.x + e.facing * 12, e.y - (e.isBoss ? 28 : 20));
            ctx.strokeStyle = '#ffd86b';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            const gAng = e.facing >= 0 ? 0 : Math.PI;
            ctx.arc(0, 0, e.isBoss ? 22 : 14, gAng - 0.9, gAng + 0.9);
            ctx.stroke();
            ctx.restore();
          }

          if ((e.lodgedCasts || 0) > 0 && e.aiState !== 'ko') {
            const count = e.lodgedCasts || 0;
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            for (let cIdx = 0; cIdx < count; cIdx++) {
              const orbitAng = now * 0.0055 + (cIdx * Math.PI * 2) / count;
              const ox = e.x + Math.cos(orbitAng) * (e.isBoss ? 20 : 14);
              const oy = e.y - (e.isBoss ? 28 : 20) + Math.sin(orbitAng) * 8;
              ctx.fillStyle = '#ff2a4b';
              ctx.strokeStyle = '#ffe14d';
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.moveTo(ox, oy - 5);
              ctx.lineTo(ox + 3.5, oy);
              ctx.lineTo(ox, oy + 5);
              ctx.lineTo(ox - 3.5, oy);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }
            ctx.restore();
          }

          // Weapon-Tip 4-Point Starburst Threat Glints (Gold = Parriable [Q], Crimson = Unblockable [SPACE])
          if (e.aiState === 'windup' && e.aiTimer <= 0.45) {
            const windupProg = Math.min(
              1,
              Math.max(0, 1 - e.aiTimer / Math.max(0.01, e.windupDuration))
            );
            const weaponGlint = computeWeaponTipGlintPosition({
              enemyX: e.x,
              enemyY: e.y,
              facing: e.facing,
              windupProgress: windupProg,
              isBoss: e.isBoss,
              attackKind: e.attackKind,
            });
            renderWeaponTipStarburstGlint(ctx, weaponGlint, now);
          }

          if (e.immobilizedTimer > 0 && decalsAsset && decalsAsset.frames.length > 0) {
            const mf = decalsAsset.frames[0];
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.translate(e.x, e.y - 20);
            ctx.rotate(now * 0.003);
            ctx.drawImage(
              decalsAsset.goldCanvas,
              mf.sx,
              mf.sy,
              mf.sw,
              mf.sh,
              -22,
              -22,
              44,
              44
            );
            ctx.restore();
          }

          if (e.isWarden3D && e.aiState !== 'ko') {
            const bw = 64;
            const bx = e.x - bw * 0.5;
            const by = e.y - 84;
            ctx.save();
            ctx.font = "bold 8px 'Cinzel', Georgia, serif";
            ctx.textAlign = 'center';
            ctx.strokeStyle = 'rgba(0,0,0,0.92)';
            ctx.lineWidth = 2.5;
            ctx.strokeText(e.name, e.x, by - 4);
            ctx.fillStyle = '#ffd86b';
            ctx.fillText(e.name, e.x, by - 4);
            ctx.fillStyle = 'rgba(10, 6, 8, 0.85)';
            ctx.fillRect(bx - 1, by - 1, bw + 2, 6.0);
            ctx.fillStyle = 'rgba(255, 232, 168, 0.85)';
            ctx.fillRect(bx, by, bw * Math.max(0, e.displayHp / e.maxHp), 3.0);
            ctx.fillStyle = '#e0313c';
            ctx.fillRect(bx, by, bw * Math.max(0, e.hp / e.maxHp), 3.0);
            ctx.fillStyle = '#f2c45a';
            ctx.fillRect(bx, by + 3.4, bw * Math.max(0, e.posture / e.maxPosture), 1.6);
            ctx.restore();
          } else if (
            !e.isBoss &&
            e.aiState !== 'ko' &&
            (e.hp < e.maxHp || e.posture < e.maxPosture * 0.98)
          ) {
            const bw = 28;
            const bx = e.x - bw * 0.5;
            const by = e.y - (e.type === 'stone_golem' || e.type === 'furnace_titan' ? 62 : 52);
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(bx, by, bw, 3.2);
            ctx.fillStyle = 'rgba(255, 232, 168, 0.80)';
            ctx.fillRect(bx, by, bw * Math.max(0, e.displayHp / e.maxHp), 1.8);
            ctx.fillStyle = '#e0313c';
            ctx.fillRect(bx, by, bw * Math.max(0, e.hp / e.maxHp), 1.8);
            ctx.fillStyle = '#f2c45a';
            ctx.fillRect(bx, by + 2.0, bw * Math.max(0, e.posture / e.maxPosture), 1.2);
          }
        } else if (act.kind === 'player') {
          const p = sim.player;
          const speedMag = Math.hypot(p.vx, p.vy);
          const isMoving = speedMag > 14;
          const stridePhase = p.walkDistance * 0.085;
          const walkBob = isMoving ? Math.abs(Math.sin(stridePhase)) * 2.5 : 0;

          let activeRudraUrl: string = GAME_ASSETS.rudra.idle;
          if (p.hp <= 0 || (p.hp / p.maxHp < 0.22 && p.action === 'idle' && !isMoving)) {
            activeRudraUrl = GAME_ASSETS.rudra.kneel;
          } else if (p.action === 'parry') {
            activeRudraUrl = GAME_ASSETS.rudra.parry;
          } else if (p.action === 'astra') {
            activeRudraUrl = GAME_ASSETS.rudra.astra;
          } else if (p.action === 'gourd') {
            activeRudraUrl = GAME_ASSETS.rudra.heal;
          } else if (p.action === 'heavy_unleash' || p.action === 'execute' || p.elevationY > 18) {
            activeRudraUrl = GAME_ASSETS.rudra.slam;
          } else if (p.action === 'light_attack') {
            activeRudraUrl =
              p.comboStep === 2 || p.comboStep === 4
                ? GAME_ASSETS.rudra.slash2
                : GAME_ASSETS.rudra.slash1;
          } else if (p.action === 'dodge' || isMoving) {
            activeRudraUrl =
              p.action === 'dodge' || Math.floor(p.walkDistance * 0.035) % 2 === 0
                ? GAME_ASSETS.rudra.run
                : GAME_ASSETS.rudra.idle;
          } else {
            activeRudraUrl = GAME_ASSETS.rudra.idle;
          }

          const activeWukongSheet = getProcessedSpriteSync(activeRudraUrl) || wukongAsset;
          const frame = 0;

          const velocitySkewX = Math.max(-0.22, Math.min(0.22, (p.vx / 225) * 0.16));

          // 1. Clean, Subtle Agni-Step Dash Echo (Zero Multi-Line/Blob Clutter)
          if (p.dashStreakAlpha > 0.04) {
            const sx = p.dashStartX;
            const sy = p.dashStartY;
            const ex = p.x;
            const ey = p.y;
            const rudra3dGhost = rudra3dRef.current;
            const ghostSourceCanvas =
              rudra3dGhost && rudra3dGhost.isReady
                ? rudra3dGhost.canvas
                : activeWukongSheet
                ? activeWukongSheet.cleanCanvas
                : null;
            if (ghostSourceCanvas) {
              const ghostSize = 72;
              const gx = (sx + ex) * 0.5;
              const gy = (sy + ey) * 0.5 - p.elevationY * 0.5;
              ctx.save();
              ctx.globalCompositeOperation = 'screen';
              ctx.globalAlpha = p.dashStreakAlpha * 0.34;
              ctx.translate(gx, gy);
              ctx.scale(p.facing, 1);
              ctx.drawImage(
                ghostSourceCanvas,
                -ghostSize * 0.5,
                -ghostSize * 0.75,
                ghostSize,
                ghostSize
              );
              ctx.restore();
            }
          }

          // 2. High-Visibility Hero Ground Ring + Dash Stamina Arcs + Aim Chevron (Distinct Gold/Jade Player Language)
          ctx.save();
          ctx.translate(p.x, p.y);
          const ringPulse = 0.85 + Math.sin(now * 0.007) * 0.15;
          const isDashing = p.action === 'dodge';
          const ringColor = isDashing ? '#63f2ff' : '#3ee0a8';

          // Subtle ground halo for instant player location tracking in crowded melees
          ctx.fillStyle = isDashing
            ? 'rgba(99, 242, 255, 0.16)'
            : 'rgba(62, 224, 168, 0.12)';
          ctx.beginPath();
          ctx.ellipse(0, 0, 19, 10.5, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = ringColor;
          ctx.lineWidth = 1.8;
          ctx.globalAlpha = ringPulse * 0.92;
          ctx.beginPath();
          ctx.ellipse(0, 0, 16, 8.8, 0, 0, Math.PI * 2);
          ctx.stroke();

          for (let d = 0; d < p.maxDashCharges; d++) {
            const hasCharge = d < p.dashCharges;
            const arcStart = d === 0 ? Math.PI * 0.65 : -Math.PI * 0.35;
            const arcEnd = d === 0 ? Math.PI * 1.35 : Math.PI * 0.35;
            ctx.strokeStyle = hasCharge ? '#ffd86b' : 'rgba(200, 157, 70, 0.25)';
            ctx.lineWidth = hasCharge ? 2.2 : 1.0;
            ctx.beginPath();
            ctx.ellipse(0, 0, 19, 10.5, 0, arcStart, arcEnd);
            ctx.stroke();
          }

          const dirAngle = Math.atan2(p.lastMoveDirY * 0.55, p.lastMoveDirX || p.facing);
          const tipX = Math.cos(dirAngle) * 22;
          const tipY = Math.sin(dirAngle) * 12;
          ctx.fillStyle = '#ffd86b';
          ctx.beginPath();
          ctx.arc(tipX, tipY, 2.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          if (p.transformTimer > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createRadialGradient(p.x, p.y - 14, 2, p.x, p.y - 14, 20);
            grad.addColorStop(0, 'rgba(255, 115, 35, 0.45)');
            grad.addColorStop(0.55, 'rgba(255, 60, 15, 0.18)');
            grad.addColorStop(1, 'rgba(255, 40, 10, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y - 14, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          if (p.action === 'parry') {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.strokeStyle = '#ffe27a';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(p.x, p.y - 15, 16, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          // 5.5. 60FPS Real-Time 3D Animated Rudra (Compact 76px stature so chambers look expansive)
          const playerRim = 'gold';
          const rudra3d = rudra3dRef.current;
          const rendered3D =
            rudra3d &&
            rudra3d.updateAndRender({
              dt: simDt > 0 ? simDt : dt,
              vx: p.vx,
              vy: p.vy,
              facingX: p.lastMoveDirX || p.facing,
              facingY: p.lastMoveDirY,
              slashAngle: p.slashAngle,
              isAttacking: p.action === 'light_attack',
              isHeavyAttack: p.action === 'heavy_unleash' || p.action === 'execute',
              comboStep: p.comboStep,
              attackProgress: p.weaponSwingProgress,
              isDodging: p.action === 'dodge',
              isParrying: p.action === 'parry',
              isCasting: p.action === 'astra',
              isHealing: p.action === 'gourd',
              isHurt: p.hitFlashTimer > 0,
              isDefeated: p.hp <= 0,
              stance: p.stance,
              focusOrbs: p.focusOrbs,
              elevationY: p.elevationY,
            });

          if (rendered3D && rudra3d) {
            drawGrounded3DContactShadow(ctx, {
              worldX: p.x,
              worldY: p.y,
              baseRadius: 15,
              elevationY: p.elevationY,
              lightSourceX: primaryLightX,
              accentColor: p.action === 'dodge' ? '#63f2ff' : '#3ee0a8',
            });

            const drawSize = 76;
            const anchorX = -drawSize * 0.5;
            const anchorY = -drawSize * 0.75;

            ctx.save();
            ctx.translate(p.x, p.y - p.elevationY);
            ctx.drawImage(rudra3d.canvas, anchorX, anchorY, drawSize, drawSize);

            if (p.hitFlashTimer > 0) {
              ctx.globalCompositeOperation = 'screen';
              ctx.globalAlpha = 0.42;
              ctx.drawImage(rudra3d.canvas, anchorX, anchorY, drawSize, drawSize);
            }

            ctx.restore();
          } else {
            drawSpriteFrame(
              ctx,
              activeWukongSheet,
              frame,
              1,
              p.x,
              p.y,
              68,
              68,
              p.facing,
              1,
              1,
              p.hitFlashTimer > 0 || p.action === 'dodge',
              p.elevationY + walkBob,
              16,
              playerRim,
              0,
              primaryLightX
            );
          }

          // 6.9. Golden Lotus Burst (Frame 2 of vedicCombatVfx2x2) ONLY on Soma Kalasha Heal
          if (
            p.action === 'gourd' &&
            vedicVfxAsset &&
            vedicVfxAsset.frames.length >= 3
          ) {
            const lotusFrame = vedicVfxAsset.frames[2];
            const lotusScale = 68;
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.78;
            ctx.translate(p.x, p.y - 22 - p.elevationY);
            ctx.drawImage(
              vedicVfxAsset.cleanCanvas,
              lotusFrame.sx,
              lotusFrame.sy,
              lotusFrame.sw,
              lotusFrame.sh,
              -lotusScale * 0.5,
              -lotusScale * 0.5,
              lotusScale,
              lotusScale
            );
            ctx.restore();
          }

          // 7. Crisp Fluid Vedic Agni Slash Ribbon (Zero Double-Overlay Clutter)
          if (p.slashArcAlpha > 0.01) {
            const isHeavy = p.action === 'heavy_unleash' || p.action === 'execute';
            const isSpin = !isHeavy && p.comboStep === 3;
            const isFinisher = isHeavy || p.comboStep === 4;
            const swingProg = Math.max(0.15, Math.min(1, p.weaponSwingProgress));
            const smearRadius = (isHeavy ? 92 : isFinisher ? 78 : isSpin ? 72 : 64) * (0.86 + swingProg * 0.2);
            const reverseFlip = !isHeavy && p.comboStep === 2 ? -1 : 1;
            const dynamicSweepAngle =
              p.slashAngle +
              (isSpin
                ? swingProg * Math.PI * 1.65
                : reverseFlip * (swingProg - 0.5) * 0.42);

            // Layer A: Swept Tapered Weapon-Bone Mesh Slash Ribbon
            const ribbonMesh = computeWeaponSlashRibbon({
              originX: p.x,
              originY: p.y - 16 - p.elevationY,
              aimAngle: dynamicSweepAngle,
              swingProgress: swingProg,
              radius: smearRadius * 0.74,
              stance: p.stance,
              isHeavy,
              isRiposte: p.riposteWindowTimer > 0,
              comboStep: p.comboStep,
            });
            renderWeaponBoneSlashRibbon(ctx, ribbonMesh, p.slashArcAlpha * 0.88);

            // Layer B: Hand-Painted Vedic Fire Crescent ONLY on Heavy Unleash / Execute (prevents mid-fight orange ring noise)
            if (isHeavy && vedicVfxAsset && vedicVfxAsset.frames.length >= 4) {
              ctx.save();
              ctx.globalCompositeOperation = 'screen';
              ctx.globalAlpha = Math.min(0.75, p.slashArcAlpha * 0.85);
              ctx.translate(p.x, p.y - 16 - p.elevationY);
              ctx.scale(1, 0.7);
              ctx.rotate(dynamicSweepAngle);
              const vfxFrameIdx = p.stance === 'pillar' ? 1 : p.stance === 'smash' ? 3 : 0;
              const vf = vedicVfxAsset.frames[vfxFrameIdx] || vedicVfxAsset.frames[0];
              const offsetX =
                vfxFrameIdx === 1 || vfxFrameIdx === 3
                  ? -smearRadius * 0.54
                  : -smearRadius * 0.24;
              ctx.drawImage(
                vedicVfxAsset.cleanCanvas,
                vf.sx,
                vf.sy,
                vf.sw,
                vf.sh,
                offsetX,
                -smearRadius * 0.54,
                smearRadius * 1.05,
                smearRadius * 1.05
              );
              ctx.restore();
            }
          }
        }
      });

      // 6.5. Anti-Occlusion X-Ray Hero Silhouette Outline & Overhead Sovereign Hero Crest
      {
        const p = sim.player;
        const isMoving = Math.hypot(p.vx, p.vy) > 14;
        const walkBob = isMoving ? Math.abs(Math.sin(p.walkDistance * 0.085)) * 2.0 : 0;
        const isOccludedByActor =
          sim.enemies.some(
            (e) =>
              e.aiState !== 'ko' &&
              e.y >= p.y - 12 &&
              Math.hypot(e.x - p.x, (e.y - p.y) * 1.2) < 62
          ) ||
          sim.props.some(
            (pr) =>
              !pr.destroyed &&
              pr.y >= p.y - 8 &&
              Math.hypot(pr.x - p.x, (pr.y - p.y) * 1.2) < 48
          );

        const rudra3d = rudra3dRef.current;
        if (isOccludedByActor) {
          // Crisp golden ground ring + silhouette highlight when obscured by enemies, VFX, or pillars
          ctx.save();
          ctx.strokeStyle = '#ffd86b';
          ctx.lineWidth = 2.4;
          ctx.setLineDash([5, 3]);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, 24, 13, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          if (rudra3d && rudra3d.isReady) {
            const drawSize = 76;
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.68;
            ctx.translate(p.x, p.y - p.elevationY);
            ctx.drawImage(rudra3d.canvas, -drawSize * 0.5, -drawSize * 0.75, drawSize, drawSize);
            ctx.restore();
          }

          // Overhead "▼ RUDRA" indicator when obscured
          ctx.save();
          ctx.font = '700 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffd86b';
          ctx.fillText('▼ RUDRA', p.x, p.y - 64 - p.elevationY - walkBob);
          ctx.restore();
        }

        if (p.hp < p.maxHp * 0.9) {
          const markerY = p.y - 46 - p.elevationY - walkBob;
          const barW = 30;
          const barX = p.x - barW * 0.5;
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
          ctx.fillRect(barX - 1, markerY - 1, barW + 2, 4.5);
          ctx.fillStyle = '#3ee0a8';
          ctx.fillRect(barX, markerY, barW * Math.max(0, p.hp / p.maxHp), 2.5);
          ctx.restore();
        }
      }

      // 7. Draw Bespoke Blazing Agneyastra Fire-Arrow, Aghori Flaming Skull & Agni-Trishula Projectiles
      const agneyastraArrowAsset = getProcessedSpriteSync(GAME_ASSETS.agneyastraArrow);
      sim.projectiles.forEach((pr) => {
        if (!pr.active) return;
        const pAngle = Math.atan2(pr.vy, pr.vx);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.translate(pr.x, pr.y);
        ctx.rotate(pAngle);

        if (
          !pr.deflected &&
          pr.radius >= 12.8 &&
          skullAndLotusVfxAsset &&
          skullAndLotusVfxAsset.frames.length >= 2
        ) {
          const skullFrame = skullAndLotusVfxAsset.frames[1];
          const skullSize = pr.radius * 4.2;
          ctx.drawImage(
            skullAndLotusVfxAsset.cleanCanvas,
            skullFrame.sx,
            skullFrame.sy,
            skullFrame.sw,
            skullFrame.sh,
            -skullSize * 0.5,
            -skullSize * 0.5,
            skullSize,
            skullSize
          );
        } else if (agneyastraArrowAsset) {
          const projW = pr.radius * 6.8;
          const projH = pr.radius * 3.6;
          ctx.drawImage(
            pr.deflected ? agneyastraArrowAsset.jadeCanvas : agneyastraArrowAsset.cleanCanvas,
            -projW * 0.55,
            -projH * 0.5,
            projW,
            projH
          );
        } else if (impactsAsset && impactsAsset.frames.length >= 3) {
          const projFrame = impactsAsset.frames[2];
          const projW = pr.radius * 6.2;
          const projH = pr.radius * 3.6;
          ctx.drawImage(
            pr.deflected ? impactsAsset.jadeCanvas : impactsAsset.cleanCanvas,
            projFrame.sx,
            projFrame.sy,
            projFrame.sw,
            projFrame.sh,
            -projW * 0.55,
            -projH * 0.5,
            projW,
            projH
          );
        }
        ctx.restore();
      });

      // 8. Pillar 3 Multi-Archetype Canvas Particle Renderer
      renderParticlePoolCanvas(ctx, sim.particles);

      // 8.5. Crisp Thin Lightning Arcs (No thick neon plasma or giant endpoint stamps)
      if (sim.lightningArcs.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < sim.lightningArcs.length; i++) {
          const arc = sim.lightningArcs[i];
          const alpha = Math.max(0, arc.life / arc.maxLife);
          const dx = arc.x2 - arc.x1;
          const dy = arc.y2 - arc.y1;
          const dist = Math.hypot(dx, dy) || 1;
          const perpX = -dy / dist;
          const perpY = dx / dist;

          const segs = 6;
          const pts: Array<{ x: number; y: number }> = [{ x: arc.x1, y: arc.y1 }];
          const jitterAmp = Math.min(26, Math.max(8, dist * 0.08));
          for (let s = 1; s < segs; s++) {
            const t = s / segs;
            const env = Math.sin(t * Math.PI);
            const offset = (Math.random() - 0.5) * 2 * jitterAmp * env;
            pts.push({
              x: arc.x1 + dx * t + perpX * offset,
              y: arc.y1 + dy * t + perpY * offset,
            });
          }
          pts.push({ x: arc.x2, y: arc.y2 });

          ctx.globalAlpha = alpha * 0.45;
          ctx.strokeStyle = arc.color;
          ctx.lineWidth = 3.6;
          ctx.lineJoin = 'bevel';
          ctx.lineCap = 'round';
          ctx.beginPath();
          pts.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();

          ctx.globalAlpha = alpha * 0.85;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          pts.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();
        }
        ctx.restore();
      }

      // 9. Draw World-Space Floating Combat Text & Callout Banners
      sim.floatingTexts.forEach((ft) => {
        if (!ft.active) return;
        ctx.save();
        ctx.globalAlpha = Math.min(1, ft.life * 1.6);
        ctx.textAlign = 'center';
        ctx.font = `bold ${Math.round(13 * ft.scale)}px 'Plus Jakarta Sans', 'Noto Sans SC', sans-serif`;
        ctx.strokeStyle = 'rgba(0,0,0,0.92)';
        ctx.lineWidth = 3.5;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);

        if (ft.subtext) {
          ctx.font = "600 10px 'Plus Jakarta Sans', 'Noto Sans SC', sans-serif";
          ctx.strokeText(ft.subtext, ft.x, ft.y + 15);
          ctx.fillStyle = '#e5dac5';
          ctx.fillText(ft.subtext, ft.x, ft.y + 15);
        }
        ctx.restore();
      });

      // End World-Space Camera Pass
      ctx.restore();
      // End Camera Zoom & Shake Pass so Screen-Space Overlays cover 100% of Viewport (0..cw, 0..ch)
      ctx.restore();

      // ======================================================================
      // SCREEN-SPACE ATMOSPHERIC GOD-RAYS, WEATHER MOTES & CINEMATIC OVERLAYS
      // ======================================================================
      ctx.save();

      // 9.7. Foreground 1.24x Parallax Temple Overhangs & Hades Diamond Chamber Wipe Transition
      renderForegroundParallaxAndWipe(
        ctx,
        cw,
        ch,
        sim.camX,
        sim.camY,
        sim.gateWipeTimer > 0 ? 1 - sim.gateWipeTimer / 0.44 : 0
      );

      // 9.75. Savitri's 3-State Lantern Lighting & Kurukshetra Ash Storm Shader (Meru Engine)
      const lanternState = getLanternLightState(sim.storyFlags).state;
      const playerScreenX = (sim.player.x - sim.camX - cw * 0.5) * zoom + cw * 0.5;
      const playerScreenY = (sim.player.y - sim.camY - ch * 0.5) * zoom + ch * 0.5;
      renderLanternAtmosphereAndAshStorm(
        ctx,
        cw,
        ch,
        now * 0.001,
        lanternState,
        playerScreenX,
        playerScreenY,
        false,
        sim.activeLookObject,
        chamberSpec.id <= 4 ? 0.35 : 0.18
      );

      // 9.78. Meru Engine v2.0 UE5 Post-Processing Stack (Volumetric Height Fog, HDR Bloom, Impact Chromatic Aberration, 35mm Film Grain)
      renderUE5PostProcessingPass(
        ctx,
        cw,
        ch,
        now * 0.001,
        sim.graphicsSettings,
        lanternState,
        sim.cameraShakeTrauma,
        sim.player.transformTimer > 0,
        Boolean(activeBoss && activeBoss.phase >= 2)
      );

      // 9.8. Atmospheric Diagonal Volumetric God-Rays & Chamber Weather Motes
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const rayPulse = 0.045 + Math.sin(now * 0.0012) * 0.015;
      const rayGrad = ctx.createLinearGradient(cw * 0.15, 0, cw * 0.68, ch * 0.85);
      rayGrad.addColorStop(
        0,
        sim.chamberIndex >= 3
          ? `rgba(255, 195, 110, ${rayPulse.toFixed(3)})`
          : `rgba(255, 150, 75, ${rayPulse.toFixed(3)})`
      );
      rayGrad.addColorStop(0.6, 'rgba(255, 160, 80, 0.015)');
      rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(cw * 0.08, 0);
      ctx.lineTo(cw * 0.46, 0);
      ctx.lineTo(cw * 0.86, ch);
      ctx.lineTo(cw * 0.36, ch);
      ctx.closePath();
      ctx.fill();

      // Foreground drifting chamber weather motes (embers / ash / snow / crimson mist)
      const moteBaseColor = chamberSpec.braziers[0]?.color || '#ffca6b';
      for (let i = 0; i < sim.ambientMotes.length; i++) {
        const m = sim.ambientMotes[i];
        ctx.globalAlpha = m.alpha * (0.65 + Math.sin(m.phase) * 0.35);
        ctx.fillStyle = m.isLeaf ? '#ff8b3d' : moteBaseColor;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 9.85. Hades-Style Off-Screen Enemy Threat Edge Chevrons (Points directly to any flanking 3D Warlord outside the viewport)
      if (sim.state === 'playing') {
        for (let i = 0; i < sim.enemies.length; i++) {
          const foe = sim.enemies[i];
          if (foe.aiState === 'ko' || foe.hp <= 0) continue;
          const screenX = (foe.x - sim.camX - cw * 0.5) * zoom + cw * 0.5;
          const screenY = (foe.y - 36 - sim.camY - ch * 0.5) * zoom + ch * 0.5;
          const margin = 52;
          if (
            screenX < margin ||
            screenX > cw - margin ||
            screenY < margin ||
            screenY > ch - margin
          ) {
            const ang = Math.atan2(screenY - ch * 0.5, screenX - cw * 0.5);
            const clampedX = Math.max(margin, Math.min(cw - margin, screenX));
            const clampedY = Math.max(margin + 44, Math.min(ch - margin - 44, screenY));
            const isDanger = foe.aiState === 'windup' || foe.aiState === 'attack' || foe.isBoss;
            ctx.save();
            ctx.translate(clampedX, clampedY);
            ctx.rotate(ang);
            ctx.fillStyle = isDanger ? '#ff3b30' : '#f2c45a';
            ctx.strokeStyle = '#090807';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(12, 0);
            ctx.lineTo(-8, -8);
            ctx.lineTo(-4, 0);
            ctx.lineTo(-8, 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // 10. Sleek Borderless Top-Center Cinematic Chamber Inscription & Sanjaya Palimpsest Dialogue (ZERO RECTANGLE BOX!)
      if (sim.chamberBannerTimer > 0 && sim.state === 'playing') {
        const bannerAlpha = Math.min(1, sim.chamberBannerTimer * 1.2);
        ctx.save();
        ctx.globalAlpha = bannerAlpha;
        const by = ch * 0.10;

        ctx.textAlign = 'center';

        ctx.fillStyle = '#e0b354';
        ctx.font = "600 11px 'Cinzel', Georgia, serif";
        ctx.fillText(
          chamberSpec.isBossChamber ? chamberSpec.chapterTitle.toUpperCase() : chamberSpec.chineseSubtitle,
          cw * 0.5,
          by
        );

        ctx.fillStyle = '#f9e79f';
        ctx.font = "bold 24px 'Cinzel', Georgia, serif";
        ctx.fillText(
          chamberSpec.isBossChamber ? chamberSpec.chineseSubtitle : chamberSpec.name,
          cw * 0.5,
          by + 26
        );

        // Tapered golden calligraphy brush-divider (no box!)
        const lineGrad = ctx.createLinearGradient(cw * 0.34, 0, cw * 0.66, 0);
        lineGrad.addColorStop(0, 'rgba(212, 165, 72, 0)');
        lineGrad.addColorStop(0.5, 'rgba(242, 196, 90, 0.78)');
        lineGrad.addColorStop(1, 'rgba(212, 165, 72, 0)');
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cw * 0.34, by + 35);
        ctx.lineTo(cw * 0.66, by + 35);
        ctx.stroke();

        // Narrative Voice / Sanjaya Strikethrough Palimpsest Subtitle
        const strikeTxt = chamberSpec.sanjayaStrikethrough || chamberSpec.strikethroughLie;
        const corrTxt = chamberSpec.sanjayaCorrection || chamberSpec.sanjayaQuote;
        if (chamberSpec.dialogueSpeaker || strikeTxt || corrTxt) {
          ctx.font = "bold 10px 'Plus Jakarta Sans', sans-serif";
          ctx.fillStyle = '#ff8a66';
          ctx.fillText(
            chamberSpec.dialogueSpeaker || 'SANJAYA · PALIMPSEST OF KURUKSHETRA',
            cw * 0.5,
            by + 52
          );

          if (strikeTxt && corrTxt) {
            ctx.font = "italic 12px 'Plus Jakarta Sans', sans-serif";
            ctx.fillStyle = '#9c8f80';
            ctx.fillText(strikeTxt, cw * 0.5, by + 69);
            const tw = ctx.measureText(strikeTxt).width;
            ctx.strokeStyle = '#ff3848';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(cw * 0.5 - tw * 0.52, by + 65);
            ctx.lineTo(cw * 0.5 + tw * 0.52, by + 65);
            ctx.stroke();

            ctx.font = "600 12.5px 'Plus Jakarta Sans', sans-serif";
            ctx.fillStyle = '#ffd86b';
            ctx.fillText(corrTxt, cw * 0.5, by + 87);
          } else if (chamberSpec.dialogueLine || corrTxt) {
            ctx.font = "italic 12.5px 'Plus Jakarta Sans', sans-serif";
            ctx.fillStyle = '#f2e8d5';
            ctx.fillText((chamberSpec.dialogueLine || corrTxt)!, cw * 0.5, by + 70);
          }
        }

        ctx.restore();
      } else if (sim.bossPhaseBanner && sim.bossPhaseBanner.timer > 0 && sim.state === 'playing') {
        const bp = sim.bossPhaseBanner;
        const bpAlpha = Math.min(1, bp.timer * 1.25);
        ctx.save();
        ctx.globalAlpha = bpAlpha;
        const by = ch * 0.11;

        ctx.textAlign = 'center';

        ctx.fillStyle = '#ff6a33';
        ctx.font = "bold 11px 'Cinzel', Georgia, serif";
        ctx.fillText(bp.speaker, cw * 0.5, by);

        ctx.fillStyle = '#ffd86b';
        ctx.font = "bold 20px 'Cinzel', Georgia, serif";
        ctx.fillText(bp.title, cw * 0.5, by + 23);

        ctx.font = "italic 12px 'Plus Jakarta Sans', sans-serif";
        ctx.fillStyle = '#a69888';
        ctx.fillText(bp.strikethrough, cw * 0.5, by + 44);
        const stw = ctx.measureText(bp.strikethrough).width;
        ctx.strokeStyle = '#ff3848';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cw * 0.5 - stw * 0.52, by + 40);
        ctx.lineTo(cw * 0.5 + stw * 0.52, by + 40);
        ctx.stroke();

        ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
        ctx.fillStyle = '#fff0d4';
        ctx.fillText(bp.correction, cw * 0.5, by + 64);

        ctx.restore();
      }

      // 11. Subtle Cinematic Peripheral Vignette + Low-HP Crimson Pulse + Impact Flash
      ctx.save();
      const isLowHp = sim.player.hp > 0 && sim.player.hp / sim.player.maxHp < 0.32;
      const vMaxDim = Math.max(cw, ch);
      const vGrad = ctx.createRadialGradient(
        cw * 0.5,
        ch * 0.5,
        vMaxDim * 0.42,
        cw * 0.5,
        ch * 0.5,
        vMaxDim * 0.82
      );
      vGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vGrad.addColorStop(
        1,
        isLowHp ? 'rgba(185, 20, 20, 0.38)' : 'rgba(4, 3, 6, 0.18)'
      );
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, cw, ch);

      if (sim.screenFlashAlpha > 0) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = Math.min(0.08, sim.screenFlashAlpha);
        ctx.fillStyle = sim.screenFlashColor;
        ctx.fillRect(0, 0, cw, ch);
      }
      ctx.restore();

      // 11.5. Modern Tactical Radar Minimap Overlay (Bottom-Left above Touch / Side Perimeter)
      if (sim.modernSettings.showMinimap && sim.state === 'playing') {
        const mapW = 132;
        const mapH = 84;
        const mapX = cw - mapW - 16;
        const mapY = 54;
        const scaleX = mapW / Math.max(1, cw);
        const scaleY = mapH / Math.max(1, ch);

        ctx.save();
        ctx.fillStyle = 'rgba(10, 9, 13, 0.84)';
        ctx.strokeStyle = 'rgba(200, 157, 70, 0.55)';
        ctx.lineWidth = 1.2;
        ctx.fillRect(mapX, mapY, mapW, mapH);
        ctx.strokeRect(mapX, mapY, mapW, mapH);

        // Subtle isometric diamond perimeter guide inside minimap
        ctx.strokeStyle = 'rgba(200, 157, 70, 0.22)';
        ctx.beginPath();
        ctx.moveTo(mapX + mapW * 0.5, mapY + 6);
        ctx.lineTo(mapX + mapW - 8, mapY + mapH * 0.5);
        ctx.lineTo(mapX + mapW * 0.5, mapY + mapH - 6);
        ctx.lineTo(mapX + 8, mapY + mapH * 0.5);
        ctx.closePath();
        ctx.stroke();

        // Intact Pillars
        sim.props.forEach((pr) => {
          if (pr.destroyed) return;
          const px = mapX + Math.max(4, Math.min(mapW - 4, pr.x * scaleX));
          const py = mapY + Math.max(4, Math.min(mapH - 4, pr.y * scaleY));
          ctx.fillStyle = 'rgba(212, 165, 72, 0.55)';
          ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
        });

        // Enemies & Bosses
        sim.enemies.forEach((e) => {
          if (e.aiState === 'ko') return;
          const ex = mapX + Math.max(4, Math.min(mapW - 4, e.x * scaleX));
          const ey = mapY + Math.max(4, Math.min(mapH - 4, e.y * scaleY));
          ctx.fillStyle = e.isBoss ? '#ff3b30' : '#ff7b52';
          ctx.beginPath();
          ctx.arc(ex, ey, e.isBoss ? 4.2 : 2.4, 0, Math.PI * 2);
          ctx.fill();
        });

        // Active Party Companions
        sim.companions.forEach((comp) => {
          const cx = mapX + Math.max(4, Math.min(mapW - 4, comp.x * scaleX));
          const cy = mapY + Math.max(4, Math.min(mapH - 4, comp.y * scaleY));
          ctx.fillStyle = COMPANION_SPECS[comp.id].accentColor;
          ctx.beginPath();
          ctx.arc(cx, cy, 3.0, 0, Math.PI * 2);
          ctx.fill();
        });

        // Rudra (Emerald-Gold Sovereign Diamond)
        const rx = mapX + Math.max(5, Math.min(mapW - 5, sim.player.x * scaleX));
        const ry = mapY + Math.max(5, Math.min(mapH - 5, sim.player.y * scaleY));
        ctx.fillStyle = '#3ee0a8';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rx, ry - 4);
        ctx.lineTo(rx + 4, ry);
        ctx.lineTo(rx, ry + 4);
        ctx.lineTo(rx - 4, ry);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#c89d46';
        ctx.font = "bold 7.5px 'JetBrains Mono', monospace";
        ctx.textAlign = 'left';
        ctx.fillText('DIVYA RADAR', mapX + 5, mapY + 10);
        ctx.restore();
      }

      ctx.restore();

      // Throttled HUD sync (~10Hz) so React overlays stay crisp without 60Hz re-renders
      hudSyncAccum += rawDt;
      if (hudSyncAccum >= 0.09) {
        hudSyncAccum = 0;
        const p = sim.player;
        const bossEntity = sim.enemies.find((e) => e.isBoss && e.aiState !== 'ko') || null;
        const hasBroken = sim.enemies.some(
          (e) => e.aiState !== 'ko' && e.postureBrokenTimer > 0
        );

        setHud({
          chamberId: chamberSpec.id,
          chamberName: chamberSpec.name,
          foesRemaining:
            sim.enemies.filter((e) => e.aiState !== 'ko').length +
            sim.pendingSpawns.length +
            sim.summoningRifts.length +
            sim.waveQueue.length,
          score: sim.score,
          comboCount: sim.comboCount,
          ashenKarma: sim.ashenKarma,
          karmaRunDelta: sim.karmaRunDelta,
          fps: sim.fps,
          playerHp: Math.max(0, Math.round(p.hp)),
          playerDisplayHp: Math.max(0, Math.round(p.displayHp)),
          playerMaxHp: p.maxHp,
          focusOrbs: p.focusOrbs,
          focusProgress: p.focusProgress,
          stance: p.stance,
          weapon: p.weapon,
          gourdSips: p.gourdSips,
          maxGourdSips: p.maxGourdSips,
          dashCharges: p.dashCharges,
          maxDashCharges: p.maxDashCharges,
          immobilizeCd: p.immobilizeCd,
          parryCd: p.parryCd,
          clonesCd: p.clonesCd,
          transformCd: p.transformCd,
          transformActiveTimer: p.transformTimer,
          hasBrokenTarget: hasBroken,
          riposteWindowTimer: p.riposteWindowTimer,
          kalaRewindCd: p.kalaRewindCd,
          shadowBlinkCd: p.shadowBlinkCd,
          stylePoints: Math.round(p.stylePoints),
          styleStatus: computeCombatStyleStatus(p.stylePoints),
          partyLinkCd: sim.partyLinkCd,
          partyCompanions: sim.companions.map((c) => ({
            id: c.id,
            hp: Math.max(0, Math.round(c.hp)),
            maxHp: c.maxHp,
          })),
          boss: bossEntity
            ? {
                active: true,
                type: bossEntity.type,
                aiState: bossEntity.aiState,
                name: bossEntity.name,
                chineseTitle: bossEntity.chineseTitle,
                hp: Math.max(0, Math.round(bossEntity.hp)),
                displayHp: Math.max(0, Math.round(bossEntity.displayHp)),
                maxHp: bossEntity.maxHp,
                posture: Math.max(0, Math.round(bossEntity.posture)),
                maxPosture: bossEntity.maxPosture,
                phase: bossEntity.phase,
                armorCracked:
                  bossEntity.type === 'xuemo' ? Boolean(bossEntity.armorCracked) : undefined,
                tuskLodgedTimer: bossEntity.tuskLodgedTimer,
                signatureMoveTitle: bossEntity.signatureMoveTitle,
                signatureCounterplayHint: bossEntity.signatureCounterplayHint,
                signatureCounterplayKind: bossEntity.signatureCounterplayKind,
              }
            : null,
        });
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [
    createEnemyFromSpec,
    damagePropsNearPoint,
    loadChamber,
    recordQuestEvent,
    spawnAfterimage,
    spawnFloatingText,
    spawnParticles,
    spawnShockwave,
    triggerCloudStepDodge,
    triggerExecuteBrokenTarget,
    triggerGamepadRumble,
    triggerGourdHeal,
    triggerImmobilizeSpell,
    triggerLightAttack,
    triggerPluckOfManyClones,
    triggerRedTidesTransform,
    triggerRockSolidParry,
    triggerStanceHeavyUnleash,
    triggerSwitchStance,
    triggerSwitchWeapon,
  ]);

  // Sync modalPaused ref so opening Shrine, Story Codex, Boon Altar, Party Command Hub, Controls popover, or v7 Narrative Overlay freezes active combat
  useEffect(() => {
    simRef.current.modalPaused =
      shrineOpen ||
      storyOpen ||
      controlsOpen ||
      boonModalOpen ||
      partyModalOpen ||
      sliceStage !== 'combat_arena';
  }, [shrineOpen, storyOpen, controlsOpen, boonModalOpen, partyModalOpen, sliceStage]);

  // Smoothly crossfade or duck BGM across Title, Prologue, Shrine, Chambers, Boss Fights, Pause, Look, Victory & Defeat
  useEffect(() => {
    const chIdx = Math.max(0, Math.min(CHAMBERS.length - 1, (hud.chamberId || 1) - 1));
    const chSpec = CHAMBERS[chIdx];
    const isBoss = Boolean(chSpec?.isBossChamber);

    if (shrineOpen) {
      soundEngine.syncBgmState('shrine', hud.chamberId, isBoss);
    } else if (gameState === 'title') {
      soundEngine.syncBgmState('title', hud.chamberId, isBoss);
    } else if (sliceStage !== 'combat_arena') {
      soundEngine.syncBgmState('prologue', hud.chamberId, isBoss);
    } else if (outcomeMode === 'defeat') {
      soundEngine.syncBgmState('defeat', hud.chamberId, isBoss);
    } else if (outcomeMode === 'victory') {
      soundEngine.syncBgmState('victory', hud.chamberId, isBoss);
    } else if (activeLookModal !== null) {
      soundEngine.syncBgmState('look', hud.chamberId, isBoss);
    } else if (outcomeMode === 'paused' || storyOpen || boonModalOpen || partyModalOpen) {
      soundEngine.syncBgmState('paused', hud.chamberId, isBoss);
    } else {
      soundEngine.syncBgmState('playing', hud.chamberId, isBoss);
    }
  }, [
    gameState,
    outcomeMode,
    shrineOpen,
    storyOpen,
    boonModalOpen,
    partyModalOpen,
    sliceStage,
    activeLookModal,
    hud.chamberId,
  ]);

  // Handle purchasing Keeper's Shrine Upgrades (applies stat deltas without granting free full-heal exploit on unrelated upgrades)
  const handlePurchaseUpgrade = useCallback((id: UpgradeId) => {
    const sim = simRef.current;
    const prevDerived = computeDerivedPlayerStats(sim.ranks);
    const res = purchaseShrineUpgrade(id, sim.ranks, sim.ashenKarma);
    if (!res.purchased) return;

    sim.ranks = res.ranks;
    sim.ashenKarma = res.availableKarma;
    const derived = computeDerivedPlayerStats(sim.ranks);
    const boonMods = computeBoonModifiers(sim.activeBoons);
    const hpDelta = Math.max(0, derived.maxHp - prevDerived.maxHp);
    const sipsDelta = Math.max(0, derived.maxGourdSips - prevDerived.maxGourdSips);
    const livesDelta = Math.max(0, derived.extraLives - prevDerived.extraLives);

    const nextMaxSips = derived.maxGourdSips + boonMods.gourdBonusMaxSips;
    sim.player.maxHp = derived.maxHp;
    sim.player.hp = Math.min(derived.maxHp, sim.player.hp + hpDelta);
    sim.player.displayHp = sim.player.hp;
    sim.player.maxGourdSips = nextMaxSips;
    sim.player.gourdSips = Math.min(nextMaxSips, sim.player.gourdSips + sipsDelta);
    sim.player.extraLives += livesDelta;
    sim.player.focusOrbs = Math.max(sim.player.focusOrbs, derived.startingFocusOrbs);

    setShrineRanks({ ...sim.ranks });
    setAshenKarma(sim.ashenKarma);
    try {
      window.localStorage.setItem(
        'kaliyuga_save_v1',
        JSON.stringify({ ashenKarma: sim.ashenKarma, ranks: sim.ranks })
      );
    } catch {}
    soundEngine.playSpell('gourd');
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const handleJoystickPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      const now = performance.now();
      if (now - joyDragRef.current.lastTapAt < 260) {
        triggerMobileHaptics(20);
        triggerCloudStepDodge();
      }
      joyDragRef.current = {
        pointerId: e.pointerId,
        centerX: cx,
        centerY: cy,
        lastTapAt: now,
      };
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const maxR = 36;
      const dist = Math.hypot(dx, dy);
      const clampedR = Math.min(maxR, dist);
      const angle = Math.atan2(dy, dx);
      const px = dist > 2 ? Math.cos(angle) * clampedR : 0;
      const py = dist > 2 ? Math.sin(angle) * clampedR : 0;
      setJoyPuckOffset({ x: px, y: py, active: true });
      simRef.current.input.touchMoveX = px / maxR;
      simRef.current.input.touchMoveY = py / maxR;
    },
    [triggerCloudStepDodge, triggerMobileHaptics]
  );

  const handleJoystickPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (joyDragRef.current.pointerId !== e.pointerId) return;
    e.preventDefault();
    const dx = e.clientX - joyDragRef.current.centerX;
    const dy = e.clientY - joyDragRef.current.centerY;
    const maxR = 36;
    const dist = Math.hypot(dx, dy);
    const clampedR = Math.min(maxR, dist);
    const angle = Math.atan2(dy, dx);
    const px = dist > 3 ? Math.cos(angle) * clampedR : 0;
    const py = dist > 3 ? Math.sin(angle) * clampedR : 0;
    setJoyPuckOffset({ x: px, y: py, active: true });
    simRef.current.input.touchMoveX = px / maxR;
    simRef.current.input.touchMoveY = py / maxR;
  }, []);

  const handleJoystickPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (joyDragRef.current.pointerId !== e.pointerId) return;
    joyDragRef.current.pointerId = null;
    setJoyPuckOffset({ x: 0, y: 0, active: false });
    simRef.current.input.touchMoveX = 0;
    simRef.current.input.touchMoveY = 0;
  }, []);

  const handleJoystickPointerCancel = useCallback(() => {
    joyDragRef.current.pointerId = null;
    setJoyPuckOffset({ x: 0, y: 0, active: false });
    simRef.current.input.touchMoveX = 0;
    simRef.current.input.touchMoveY = 0;
  }, []);

  const handleMudraButtonPress = useCallback(
    (btn: MudraButtonId) => {
      const sim = simRef.current;
      const p = sim.player;
      if (sim.state !== 'playing') return;

      const now = performance.now();
      const evalRes = evaluateMudraButtonPress(mudraBufferRef.current, btn, now);
      mudraBufferRef.current = evalRes.updatedBuffer;
      setMudraSequence(evalRes.activeSequence);
      setMudraHints(evalRes.nextHints);
      setActiveFilamentPair(evalRes.activeFilamentPair);

      if (mudraResetTimeoutRef.current !== null) {
        window.clearTimeout(mudraResetTimeoutRef.current);
      }
      mudraResetTimeoutRef.current = window.setTimeout(() => {
        mudraBufferRef.current = [];
        setMudraSequence([]);
        setMudraHints(computeNextMudraHints([]));
        setActiveFilamentPair(null);
      }, MUDRA_COMBO_WINDOW_MS);

      // If a 4-Button Mudra Weapon-Art Combo was completed, execute its signature multi-layered technique!
      if (evalRes.triggeredCombo) {
        const combo = evalRes.triggeredCombo;
        setLastTriggeredMudra(combo);
        if (mudraBannerTimeoutRef.current !== null) {
          window.clearTimeout(mudraBannerTimeoutRef.current);
        }
        mudraBannerTimeoutRef.current = window.setTimeout(() => {
          setLastTriggeredMudra(null);
        }, 1350);

        triggerMobileHaptics([18, 28, 35]);

        if (combo.id === 'dash_strike_blink') {
          // D -> S: GARUDA SHADOW-BLINK ASSASSINATION
          p.shadowBlinkCd = 0;
          triggerShadowBlinkAssassinate();
          triggerLightAttack();
        } else if (combo.id === 'dash_heavy_meteor') {
          // D -> H: AGNEYASTRA METEOR CATACLYSM
          p.elevationY = 54;
          p.immobilizeCd = 0;
          triggerImmobilizeSpell();
          triggerStanceHeavyUnleash();
        } else if (combo.id === 'parry_strike_thunder') {
          // P -> S: VAJRA THUNDER-COUNTER RIPOSTE
          p.riposteWindowTimer = 1.6;
          p.focusOrbs = Math.min(4, p.focusOrbs + 1);
          spawnShockwave(p.x, p.y, 195, '#ffd86b', 0.42);
          sim.enemies.forEach((e) => {
            if (e.aiState === 'ko') return;
            if (Math.hypot(e.x - p.x, e.y - p.y) <= 285) {
              e.hp = Math.max(0, e.hp - 68);
              e.posture = Math.max(0, e.posture - 85);
              e.hitFlashTimer = 0.14;
              sim.lightningArcs.push({
                x1: p.x,
                y1: p.y - 32,
                x2: e.x,
                y2: e.y - 24,
                life: 0.35,
                maxLife: 0.35,
                color: '#ffd86b',
              });
            }
          });
          triggerLightAttack();
        } else if (combo.id === 'parry_heavy_cataclysm') {
          // P -> H: SUDARSHANA COMPANION LINK CATACLYSM
          sim.partyLinkCd = 0;
          triggerPartyLinkStrike();
          triggerStanceHeavyUnleash();
        } else if (combo.id === 'parry_dash_rewind') {
          // P -> D: SANDS OF KALA TEMPORAL REWIND
          p.kalaRewindCd = 0;
          triggerKalaRewind();
        } else if (combo.id === 'strike_strike_heavy_whirlwind') {
          // S -> S -> H: BHAIRAVA SKY-SUNDER CYCLONE SLAM
          p.focusOrbs = Math.min(4, Math.max(2, p.focusOrbs + 1));
          spawnShockwave(p.x, p.y, 240, '#ff4d3b', 0.45);
          sim.enemies.forEach((e) => {
            if (e.aiState === 'ko') return;
            const d = Math.hypot(e.x - p.x, e.y - p.y);
            if (d <= 265 && d > 28) {
              const pull = e.isBoss ? 0.35 : 0.65;
              e.x += (p.x - e.x) * pull;
              e.y += (p.y - e.y) * pull;
            }
          });
          triggerStanceHeavyUnleash();
        } else if (combo.id === 'strike_heavy_strike_mirage') {
          // S -> H -> S: MAYA TANDAVA ASHEN PHANTOM TRI-SLASH
          p.clonesCd = 0;
          triggerPluckOfManyClones();
          triggerLightAttack();
        } else if (combo.id === 'heavy_heavy_kopa') {
          // H -> H: RUDRA-KOPA SOVEREIGN AWAKENING
          p.transformCd = 0;
          triggerRedTidesTransform();
          triggerStanceHeavyUnleash();
        }

        spawnFloatingText(
          p.x,
          p.y - 96,
          `${combo.sequence.join('+')} · ${combo.englishTitle}!`,
          combo.accentColor,
          1.22
        );
        return;
      }

      // Standard Single-Button Action (and combo starter)
      if (btn === 'S') {
        sim.input.touchAttackHeld = true;
        triggerMobileHaptics(12);
        if (hud.hasBrokenTarget) {
          triggerExecuteBrokenTarget();
        } else {
          triggerLightAttack();
        }
      } else if (btn === 'H') {
        triggerMobileHaptics(22);
        if (hud.riposteWindowTimer > 0 || hud.focusOrbs > 0 || hud.immobilizeCd > 0) {
          triggerStanceHeavyUnleash();
        } else {
          triggerImmobilizeSpell();
        }
      } else if (btn === 'D') {
        triggerMobileHaptics(15);
        triggerCloudStepDodge();
      } else if (btn === 'P') {
        triggerMobileHaptics([15, 20]);
        triggerRockSolidParry();
        if (activeParty.length > 0 && hud.partyLinkCd <= 0) {
          triggerPartyLinkStrike();
        }
      }
    },
    [
      activeParty.length,
      hud.focusOrbs,
      hud.hasBrokenTarget,
      hud.immobilizeCd,
      hud.partyLinkCd,
      hud.riposteWindowTimer,
      spawnFloatingText,
      spawnShockwave,
      triggerCloudStepDodge,
      triggerExecuteBrokenTarget,
      triggerImmobilizeSpell,
      triggerKalaRewind,
      triggerLightAttack,
      triggerMobileHaptics,
      triggerPartyLinkStrike,
      triggerPluckOfManyClones,
      triggerRedTidesTransform,
      triggerRockSolidParry,
      triggerShadowBlinkAssassinate,
      triggerStanceHeavyUnleash,
    ]
  );

  const handleReleaseStrike = useCallback(() => {
    simRef.current.input.touchAttackHeld = false;
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#090807] select-none touch-none">
      {/* Isolated 2.5D Isometric Canvas Container with Mouse + Mobile Touch-to-Strike & Swipe-to-Dash */}
      <canvas
        ref={canvasRef}
        data-testid="kaliyuga-canvas"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const sx = e.clientX - rect.left;
          const sy = e.clientY - rect.top;
          const sim = simRef.current;
          const cw = sim.viewportW || 1440;
          const ch = sim.viewportH || 900;
          const zoom = sim.cameraZoom || BASE_CAMERA_ZOOM;
          sim.input.pointerScreenX = sx;
          sim.input.pointerScreenY = sy;
          sim.input.pointerX = (sx - cw * 0.5) / zoom + cw * 0.5 + sim.camX;
          sim.input.pointerY = (sy - ch * 0.5) / zoom + ch * 0.5 + sim.camY;
          sim.input.pointerActive = true;
        }}
        onMouseDown={(e) => {
          if (simRef.current.state !== 'playing') return;
          if (e.button === 2) {
            e.preventDefault();
            triggerStanceHeavyUnleash();
          } else if (e.button === 1) {
            e.preventDefault();
            triggerRockSolidParry();
          } else if (e.button === 0) {
            triggerLightAttack();
          }
        }}
        onTouchStart={(e) => {
          if (simRef.current.state !== 'playing') return;
          const touch = e.changedTouches[0];
          if (!touch) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const sx = touch.clientX - rect.left;
          const sy = touch.clientY - rect.top;
          const sim = simRef.current;
          const cw = sim.viewportW || 1440;
          const ch = sim.viewportH || 900;
          const zoom = sim.cameraZoom || BASE_CAMERA_ZOOM;
          sim.input.pointerScreenX = sx;
          sim.input.pointerScreenY = sy;
          sim.input.pointerX = (sx - cw * 0.5) / zoom + cw * 0.5 + sim.camX;
          sim.input.pointerY = (sy - ch * 0.5) / zoom + ch * 0.5 + sim.camY;
          sim.input.pointerActive = true;
          canvasTouchSwipeRef.current = {
            startX: sx,
            startY: sy,
            startTime: performance.now(),
            active: true,
          };
        }}
        onTouchMove={(e) => {
          if (simRef.current.state !== 'playing') return;
          const touch = e.changedTouches[0];
          if (!touch) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const sx = touch.clientX - rect.left;
          const sy = touch.clientY - rect.top;
          const sim = simRef.current;
          const cw = sim.viewportW || 1440;
          const ch = sim.viewportH || 900;
          const zoom = sim.cameraZoom || BASE_CAMERA_ZOOM;
          sim.input.pointerScreenX = sx;
          sim.input.pointerScreenY = sy;
          sim.input.pointerX = (sx - cw * 0.5) / zoom + cw * 0.5 + sim.camX;
          sim.input.pointerY = (sy - ch * 0.5) / zoom + ch * 0.5 + sim.camY;
          sim.input.pointerActive = true;
        }}
        onTouchEnd={(e) => {
          if (simRef.current.state !== 'playing') return;
          const swipe = canvasTouchSwipeRef.current;
          if (!swipe.active) return;
          swipe.active = false;
          const touch = e.changedTouches[0];
          if (!touch) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const ex = touch.clientX - rect.left;
          const ey = touch.clientY - rect.top;
          const dx = ex - swipe.startX;
          const dy = ey - swipe.startY;
          const dist = Math.hypot(dx, dy);
          const elapsed = performance.now() - swipe.startTime;
          const sim = simRef.current;
          if (dist >= 42 && elapsed <= 300) {
            // Fast Swipe on Arena Canvas -> Directional Agni-Step Dash!
            const nx = dx / dist;
            const ny = dy / dist;
            sim.input.pointerX = sim.player.x + nx * 240;
            sim.input.pointerY = sim.player.y + ny * 240;
            sim.input.pointerActive = true;
            triggerMobileHaptics(18);
            triggerCloudStepDodge();
          } else if (dist < 28 && elapsed <= 260) {
            // Quick Tap on Arena Canvas -> Target & Light Strike!
            triggerMobileHaptics(10);
            triggerLightAttack();
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        className="block w-full h-full cursor-crosshair touch-none"
      />

      {/* High-Readability PC HUD: Large Top-Left Vital Crest, 8-Chamber Route Strip, Prominent Top-Center Boss Bar, Top-Right Menu, Bottom PC Combat Hotbar */}
      <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-4">
        {/* TOP PERIMETER BAR */}
        <div className="flex items-start justify-between gap-3 w-full">
          {/* Top-Left: Kept completely clear during combat; only shows contextual [E] Examine or Cleared Room Gate when needed */}
          <div className="flex flex-col items-start gap-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const lookState = findChamberLookArtifactState({
                  chamberId: hud.chamberId,
                  playerX: simRef.current.player.x,
                  playerY: simRef.current.player.y,
                  discoveredLooks: storyFlags.looks,
                });
                if (!lookState.artifact || !lookState.inRange) return null;
                return (
                  <button
                    type="button"
                    data-testid="hud-chamber-look-btn"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      triggerMobileHaptics(15);
                      handleInspectLookArtifact(lookState.artifact!);
                    }}
                    className={`pointer-events-auto px-3 py-1.5 border text-xs font-mono-num font-bold cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      lookState.alreadyExamined
                        ? 'bg-[#0f1715]/90 border-[#3ee0a8]/55 text-[#3ee0a8]'
                        : 'bg-[#21180b]/95 border-[#ffd86b] text-[#ffd86b] animate-pulse'
                    }`}
                  >
                    <span>[E] EXAMINE: {lookState.artifact.title.toUpperCase()}</span>
                  </button>
                );
              })()}

              {hud.foesRemaining === 0 && hud.chamberId < CHAMBERS.length && !boonModalOpen && (
                <div className="pointer-events-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[#120e0a]/95 border border-[#f2c45a]/85 px-3 py-2 shadow-[0_0_20px_rgba(242,196,90,0.3)]">
                  <button
                    type="button"
                    data-testid="exit-gate-left-btn"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      openBoonAltar();
                    }}
                    className="px-3 py-1.5 bg-[#261a0b] hover:bg-[#362510] border border-[#f2c45a] text-left cursor-pointer"
                  >
                    <div className="text-xs font-bold text-[#ffd86b]">
                      ⬅ CHOOSE A BOON (1 OF 3 RUN UPGRADES)
                    </div>
                    <div className="text-[10px] font-mono-num text-[#cbbba0]">
                      Draft a Deva Combat Blessing · Skips +30 Max HP
                    </div>
                  </button>
                  <button
                    type="button"
                    data-testid="exit-gate-right-btn"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      const sim = simRef.current;
                      const p = sim.player;
                      p.maxHp += 30;
                      p.hp = Math.min(p.maxHp, p.hp + 90);
                      p.displayHp = p.hp;
                      sim.ashenKarma += 95;
                      sim.karmaRunDelta += 95;
                      setAshenKarma(sim.ashenKarma);
                      sim.boonReadyCount = 0;
                      setBoonReadyCount(0);
                      soundEngine.playSpell('gourd');
                      const prevIdx = sim.chamberIndex;
                      loadChamber(prevIdx + 1, false);
                      if (prevIdx === 0) setSliceStage('savitri_lantern_interlude');
                      else if (prevIdx === 1) setSliceStage('preserver_interlude');
                      else if (prevIdx === 3) setSliceStage('dundubhi_aftermath');
                    }}
                    className="px-3 py-1.5 bg-[#0e241d] hover:bg-[#143329] border border-[#3ee0a8] text-left cursor-pointer"
                  >
                    <div className="text-xs font-bold text-[#3ee0a8]">
                      ➡ +30 MAX HP &amp; +95 KARMA
                    </div>
                    <div className="text-[10px] font-mono-num text-[#a6decb]">
                      Heal 90 HP + Permanent Shrine Karma · Skips Boon
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Top-Center: Large, Prominent Sovereign Boss Bar (Only visible during Boss Encounters) */}
          {hud.boss && (
            <div
              data-testid="boss-hud-panel"
              className="pointer-events-auto bg-[#120d11]/95 border-2 border-[#b83240]/90 px-4 py-2.5 min-w-[260px] sm:min-w-[420px] max-w-[540px] shadow-[0_12px_32px_rgba(0,0,0,0.92)] shrink-0"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="font-display text-xs sm:text-base font-bold tracking-wider text-[#f7efe0] truncate">
                  {hud.boss.name}
                </div>
                <div
                  data-testid="boss-phase-badge"
                  className="px-2 py-0.5 bg-[#331218] border border-[#b83240]/80 text-[10px] sm:text-xs font-mono-num font-bold text-[#ff8a94] uppercase shrink-0"
                >
                  PHASE {hud.boss.phase}/3
                </div>
              </div>

              <div className="relative w-full h-3.5 bg-[#261317] border border-[#59222b] overflow-hidden mb-1.5">
                <div
                  className="absolute inset-y-0 left-0 bg-[#ffe596]/85 transition-all duration-300"
                  style={{
                    width: `${Math.max(0, Math.min(100, (hud.boss.displayHp / hud.boss.maxHp) * 100))}%`,
                  }}
                />
                <div
                  className="relative h-full bg-gradient-to-r from-[#b82532] via-[#e03846] to-[#ff5e6c] transition-all duration-100"
                  style={{
                    width: `${Math.max(0, Math.min(100, (hud.boss.hp / hud.boss.maxHp) * 100))}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-3 text-[10px] sm:text-xs font-mono-num">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[#c89d46] font-bold">POSTURE (STAGGER BAR)</span>
                  <div className="flex-1 h-2 bg-[#241f16] border border-[#59482a]/60 overflow-hidden">
                    <div
                      className="h-full bg-[#f2c45a] transition-all duration-150"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, (hud.boss.posture / hud.boss.maxPosture) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                {hud.boss.type === 'xuemo' && (
                  <span data-testid="boss-armor-state" className="text-[#ffd86b] font-bold truncate">
                    {(hud.boss.tuskLodgedTimer || 0) > 0
                      ? 'TUSKS LODGED!'
                      : hud.boss.armorCracked
                      ? 'ARMOR CRACKED'
                      : 'BRONZE SHELL'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Top-Right: Readable Utility Bar (Gear, Chambers, Pause) */}
          <div className="pointer-events-auto flex items-center gap-1.5 relative shrink-0">
            <button
              type="button"
              tabIndex={-1}
              data-testid="hud-party-hub-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                setPartyModalOpen((prev) => !prev);
              }}
              className="px-3 py-1.5 bg-[#1b140b]/92 hover:bg-[#291e10] border border-[#f2c45a]/75 text-xs text-[#ffd86b] font-display font-bold tracking-wider uppercase cursor-pointer flex items-center gap-1.5"
            >
              <span>GEAR &amp; RELICS</span>
              {QUEST_SPECS.some(
                (q) =>
                  !questState[q.id]?.claimed &&
                  (questState[q.id]?.progress || 0) >= q.targetCount
              ) && <span className="w-2 h-2 rounded-full bg-[#3ee0a8] animate-pulse" />}
            </button>

            <button
              type="button"
              tabIndex={-1}
              data-testid="hud-controls-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                setControlsOpen((prev) => !prev);
              }}
              className="px-3 py-1.5 bg-[#0d0c10]/92 hover:bg-[#1b1922] border border-[#c89d46]/50 text-xs text-[#e5dac5] font-mono-num font-bold cursor-pointer"
              title="Chambers & Quick Settings"
            >
              CHAMBERS ▾
            </button>

            <button
              type="button"
              tabIndex={-1}
              data-testid="hud-pause-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                simRef.current.state = 'paused';
                document.body.dataset.state = 'paused';
                setGameState('paused');
                setOutcomeMode('paused');
              }}
              className="px-3 py-1.5 bg-[#0d0c10]/92 hover:bg-[#1b1922] border border-[#c89d46]/55 text-xs text-[#f2c45a] font-display font-bold uppercase cursor-pointer"
            >
              ❚❚ PAUSE
            </button>

            {controlsOpen && (
              <div className="absolute right-0 top-10 w-72 bg-[#0e0d12]/98 border border-[#c89d46]/70 p-3 shadow-[0_16px_48px_rgba(0,0,0,0.95)] z-50 text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#c89d46]/25 pb-1.5">
                  <span className="font-display font-bold text-[#f2c45a] uppercase text-xs tracking-wider">
                    Chambers &amp; Controls
                  </span>
                  <button
                    type="button"
                    onClick={() => setControlsOpen(false)}
                    className="text-[#a99e8b] hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {CHAMBERS.map((chSpec, idx) => (
                    <button
                      key={chSpec.id}
                      type="button"
                      onClick={() => {
                        loadChamber(idx, false);
                        setControlsOpen(false);
                      }}
                      className={`py-1.5 px-2 text-xs font-mono-num border cursor-pointer ${
                        hud.chamberId === chSpec.id
                          ? 'bg-[#d4a548] text-[#090807] border-[#f5dca0] font-bold'
                          : 'bg-[#17151d] text-[#d6cab6] border-[#c89d46]/30 hover:border-[#c89d46]'
                      }`}
                    >
                      CH {chSpec.id} {chSpec.isBossChamber ? '★' : ''}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-[#c89d46]/25">
                  <button
                    type="button"
                    onClick={() => {
                      setStoryOpen(true);
                      setControlsOpen(false);
                    }}
                    className="flex-1 py-1.5 px-2 border border-[#c89d46]/40 text-xs font-mono-num text-[#ffd86b] bg-[#1a140b] cursor-pointer"
                  >
                    BESTIARY &amp; CODEX
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMuted((prev) => {
                        const next = !prev;
                        soundEngine.setMuted(next);
                        return next;
                      });
                    }}
                    className="py-1.5 px-2.5 border border-[#c89d46]/40 text-xs font-mono-num text-[#e5dac5] bg-[#141218] cursor-pointer"
                  >
                    {muted ? 'MUTE' : 'AUDIO'}
                  </button>
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="py-1.5 px-2.5 border border-[#c89d46]/40 text-xs font-mono-num text-[#e5dac5] bg-[#141218] cursor-pointer"
                  >
                    FULL
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM PERIMETER: CONSOLIDATED COMPACT VITALS & COMBAT HOTBAR */}
        {gameState === 'playing' && sliceStage === 'combat_arena' && (
          <div
            data-testid="pc-combat-hotbar"
            className="hidden md:flex pointer-events-auto self-center mb-1.5 px-3.5 py-2 bg-[#0c0a0e]/94 border border-[#c89d46]/60 shadow-[0_10px_28px_rgba(0,0,0,0.9)] flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 text-xs font-mono-num text-[#dfd3be]"
          >
            {/* Compact Inline HP Bar + Tapas Diamonds + Chamber/Foes */}
            <div className="flex items-center gap-2 pr-2 border-r border-[#c89d46]/30">
              <span className="font-display font-bold text-[#f7efe0]">RUDRA</span>
              <div className="w-24 h-3 bg-[#18221e] border border-[#2f5244] relative overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#229e74] via-[#35d49c] to-[#68f5c4]"
                  style={{
                    width: `${Math.max(0, Math.min(100, (hud.playerHp / hud.playerMaxHp) * 100))}%`,
                  }}
                />
              </div>
              <span className="text-[#3ee0a8] font-bold">
                {hud.playerHp}/{hud.playerMaxHp}
              </span>
              <div className="flex items-center gap-1 ml-1" title="Tapas Focus Diamonds">
                {[0, 1, 2, 3].map((orbIdx) => (
                  <div
                    key={orbIdx}
                    className={`w-2.5 h-2.5 rotate-45 border ${
                      hud.focusOrbs > orbIdx
                        ? 'bg-[#f5c451] border-[#fff2b2]'
                        : 'bg-[#1a181e] border-[#594e36]'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[#f2c45a] font-bold ml-1">
                CH {hud.chamberId}/{CHAMBERS.length}
              </span>
              <span className="text-[#b8ab96]">· {hud.foesRemaining} FOES</span>
            </div>

            <button
              type="button"
              onClick={triggerLightAttack}
              className="flex items-center gap-1 hover:text-white cursor-pointer"
            >
              <span className="px-1.5 py-0.5 bg-[#261412] border border-[#ff6a33]/70 text-[#ffb84d] font-bold">
                LMB
              </span>
              <span className="font-semibold">STRIKE</span>
            </button>
            <button
              type="button"
              onClick={triggerStanceHeavyUnleash}
              className="flex items-center gap-1 hover:text-white cursor-pointer"
            >
              <span
                className={`px-1.5 py-0.5 border font-bold ${
                  hud.focusOrbs > 0
                    ? 'bg-[#2b1d0a] border-[#ffd86b] text-[#ffd86b]'
                    : 'bg-[#17151c] border-[#594e36] text-[#8f836f]'
                }`}
              >
                RMB
              </span>
              <span className={hud.focusOrbs > 0 ? 'font-bold text-[#ffd86b]' : 'text-[#8f836f]'}>
                HEAVY
              </span>
            </button>
            <button
              type="button"
              onClick={triggerCloudStepDodge}
              className="flex items-center gap-1 hover:text-white cursor-pointer"
            >
              <span className="px-1.5 py-0.5 bg-[#0d1f26] border border-[#38bdf8]/70 text-[#63f2ff] font-bold">
                SPACE
              </span>
              <span className="font-semibold">
                DASH ({hud.dashCharges}/{hud.maxDashCharges})
              </span>
            </button>
            <button
              type="button"
              onClick={triggerRockSolidParry}
              className="flex items-center gap-1 hover:text-white cursor-pointer"
            >
              <span
                className={`px-1.5 py-0.5 border font-bold ${
                  hud.riposteWindowTimer > 0
                    ? 'bg-[#33240a] border-[#ffd86b] text-[#ffd86b]'
                    : hud.parryCd <= 0
                    ? 'bg-[#1f190e] border-[#c89d46]/70 text-[#f2c45a]'
                    : 'bg-[#141218] border-[#453d30] text-[#7a6f5d]'
                }`}
              >
                Q
              </span>
              <span className="font-semibold">PARRY</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (hud.hasBrokenTarget) triggerExecuteBrokenTarget();
                else triggerImmobilizeSpell();
              }}
              className="flex items-center gap-1 hover:text-white cursor-pointer"
            >
              <span
                className={`px-1.5 py-0.5 border font-bold ${
                  hud.hasBrokenTarget
                    ? 'bg-[#381117] border-[#ff4d3b] text-[#ff8a94]'
                    : hud.immobilizeCd <= 0
                    ? 'bg-[#21150d] border-[#ff8a36]/70 text-[#ffaa5c]'
                    : 'bg-[#141218] border-[#453d30] text-[#7a6f5d]'
                }`}
              >
                F
              </span>
              <span className="font-semibold">
                {hud.hasBrokenTarget ? 'EXECUTE' : 'ASTRA'}
              </span>
            </button>
            <button
              type="button"
              data-testid="pc-skill-heal"
              onClick={triggerGourdHeal}
              className="flex items-center gap-1 hover:text-white cursor-pointer"
            >
              <span
                className={`px-1.5 py-0.5 border font-bold ${
                  hud.gourdSips > 0
                    ? 'bg-[#0c1f19] border-[#3ee0a8]/70 text-[#3ee0a8]'
                    : 'bg-[#141218] border-[#453d30] text-[#7a6f5d]'
                }`}
              >
                R
              </span>
              <span className={hud.gourdSips > 0 ? 'font-semibold text-[#3ee0a8]' : 'text-[#7a6f5d]'}>
                KALASHA {hud.gourdSips}/{hud.maxGourdSips}
              </span>
            </button>
            <button
              type="button"
              data-testid="hud-cycle-stance-btn"
              onClick={() => triggerSwitchStance()}
              className="flex items-center gap-1 hover:text-white cursor-pointer"
            >
              <span className="px-1.5 py-0.5 bg-[#1b1610] border border-[#c89d46]/60 text-[#f2c45a] font-bold">
                1-3
              </span>
              <span className="font-semibold">{STANCE_CONFIGS[hud.stance].chineseName}</span>
            </button>
            <button
              type="button"
              data-testid="hud-cycle-weapon-btn"
              onClick={() => {
                const order: WeaponId[] = ['jingu_bang', 'twin_blades', 'dragon_glaive'];
                const nextW = order[(order.indexOf(hud.weapon) + 1) % order.length];
                triggerSwitchWeapon(nextW);
              }}
              className="px-2 py-0.5 bg-[#14121b] hover:bg-[#221e2e] border border-[#c89d46]/50 text-[#e5dac5] uppercase font-bold cursor-pointer"
            >
              {hud.weapon === 'jingu_bang'
                ? 'GADA'
                : hud.weapon === 'twin_blades'
                ? 'KHADGA'
                : 'PARASHU'}
            </button>
          </div>
        )}
      </div>

      {/* God of War III Remastered Style Homescreen */}
      {gameState === 'title' && (
        <TitleScreen
          ashenKarma={ashenKarma}
          selectedWeapon={hud.weapon}
          onSelectWeapon={(w) => triggerSwitchWeapon(w)}
          onStartOdyssey={() => startGameAtChamber(0)}
          onOpenPrologue={() => {
            setGameState('playing');
            setSliceStage('prologue_scrolls');
          }}
          onOpenShrine={() => setShrineOpen(true)}
          onOpenStory={() => setStoryOpen(true)}
          muted={muted}
          onToggleMute={() => {
            setMuted((prev) => {
              const next = !prev;
              soundEngine.setMuted(next);
              return next;
            });
          }}
        />
      )}

      {/* Five-Scroll Prologue, Inter-Chamber Painted Story Cutscenes & Non-Pausing [E] Look Overlay */}
      {(sliceStage !== 'combat_arena' || activeLookModal !== null) && (
        <NarrativeOverlay
          stage={sliceStage}
          storyFlags={storyFlags}
          activeLookModal={activeLookModal}
          onCloseLookModal={() => {
            simRef.current.activeLookObject = null;
            setActiveLookModal(null);
          }}
          onOpenShrine={() => setShrineOpen(true)}
          onStartAct1Run={() => {
            setSliceStage('combat_arena');
            startGameAtChamber(0);
          }}
          onCompleteSlice={() => {
            setSliceStage('combat_arena');
            simRef.current.state = 'gameover';
            document.body.dataset.state = 'gameover';
            setGameState('gameover');
            setOutcomeMode('victory');
          }}
          onAdvanceStage={(nextStage, flagPatch) => {
            if (flagPatch) updateStoryFlags(flagPatch);
            setSliceStage(nextStage);
            if (nextStage === 'combat_arena') {
              if (simRef.current.state !== 'playing') {
                startGameAtChamber(0);
              }
            }
          }}
        />
      )}

      {/* Hades-Style Celestial Boon Selection Modal */}
      <BoonModal
        isOpen={boonModalOpen}
        choices={boonChoices}
        ownedBoons={ownedBoons}
        rerollsRemaining={boonRerolls}
        chamberId={hud.chamberId}
        onSelectBoon={handleSelectBoon}
        onRerollChoices={handleRerollBoons}
      />

      {/* Keeper's Shrine Sanctuary Modal */}
      <KeepersShrineModal
        isOpen={shrineOpen}
        ranks={shrineRanks}
        availableKarma={ashenKarma}
        onPurchase={handlePurchaseUpgrade}
        onStartChamber={(chIdx) => startGameAtChamber(chIdx)}
        onClose={() => setShrineOpen(false)}
      />

      {/* Lore & Sovereign Codex Modal */}
      <StoryCodexModal
        isOpen={storyOpen}
        onClose={() => setStoryOpen(false)}
      />

      {/* Warborn Party, Gear Relics, Quests, Pact & Modern Tactical Settings Command Modal */}
      <PartyCommandModal
        isOpen={partyModalOpen}
        initialTab={partyModalTab}
        ashenKarma={ashenKarma}
        playerXp={playerXp}
        activeParty={activeParty}
        companionBonds={companionBonds}
        partyTactic={partyTactic}
        equippedGear={equippedGear}
        gearLevels={gearLevels}
        questState={questState}
        selectedWeapon={hud.weapon}
        weaponAspectRanks={weaponAspectRanks}
        activeCalamityOaths={activeCalamityOaths}
        storyFlags={storyFlags}
        modernSettings={modernSettings}
        onToggleCompanionInParty={handleToggleCompanionInParty}
        onUpgradeCompanionBond={handleUpgradeCompanionBond}
        onChangePartyTactic={handleChangePartyTactic}
        onTriggerPartyLinkStrike={triggerPartyLinkStrike}
        onEquipGear={handleEquipGear}
        onUpgradeGear={handleUpgradeGear}
        onUpgradeWeaponAspect={handleUpgradeWeaponAspect}
        onToggleCalamityOath={handleToggleCalamityOath}
        onInspectLookArtifact={handleInspectLookArtifact}
        onSelectWeapon={(w) => {
          simRef.current.player.weapon = w;
          setHud((prev) => ({ ...prev, weapon: w }));
          soundEngine.playSwing('heavy');
        }}
        onClaimQuest={handleClaimQuest}
        onUpdateSettings={handleUpdateModernSettings}
        onClose={() => setPartyModalOpen(false)}
      />

      {/* Pause / Act One Complete / Defeat Status Modal with Full Run Recap */}
      <OutcomeModal
        mode={outcomeMode}
        chamberId={hud.chamberId}
        chamberName={hud.chamberName}
        defeatedByName={hud.boss?.name}
        finalScore={hud.score}
        karmaEarnedThisRun={hud.karmaRunDelta}
        totalKarma={hud.ashenKarma}
        runRecap={{
          boons: ownedBoons,
          damageDealt: simRef.current.runDamageDealt,
          parriesLanded: simRef.current.runParriesLanded,
          dodgesCompleted: simRef.current.runDodgesCompleted,
          postureBreaks: simRef.current.runPostureBreaks,
          runTimeSec:
            simRef.current.runStartTimeMs > 0
              ? Math.max(1, (performance.now() - simRef.current.runStartTimeMs) / 1000)
              : 0,
        }}
        onResume={() => {
          simRef.current.state = 'playing';
          document.body.dataset.state = 'playing';
          setGameState('playing');
          setOutcomeMode('none');
        }}
        onPlayAgain={() => startGameAtChamber(0)}
        onOpenShrine={() => setShrineOpen(true)}
        onReturnTitle={() => {
          simRef.current.state = 'title';
          document.body.dataset.state = 'title';
          setOutcomeMode('none');
          setGameState('title');
        }}
      />

      {/* Mobile Virtual Joystick & Action Diamond Cluster Controls */}
      <MobileControls
        visible={
          isMobile &&
          gameState === 'playing' &&
          outcomeMode === 'none' &&
          !boonModalOpen &&
          !shrineOpen &&
          !storyOpen &&
          !partyModalOpen
        }
        callbacks={{
          onMoveJoystick: (dx, dy) => {
            simRef.current.input.touchMoveX = dx;
            simRef.current.input.touchMoveY = dy;
          },
          onStopJoystick: () => {
            simRef.current.input.touchMoveX = 0;
            simRef.current.input.touchMoveY = 0;
          },
          onLightAttack: triggerLightAttack,
          onHeavyUnleash: triggerStanceHeavyUnleash,
          onDodge: triggerCloudStepDodge,
          onParry: triggerRockSolidParry,
          onHeal: triggerGourdHeal,
          onSpecial: triggerRedTidesTransform,
          onMirage: triggerLookOrMirage,
          onSwitchStance: triggerSwitchStance,
        } satisfies MobileControlsCallbacks}
      />
    </main>
  );
}
