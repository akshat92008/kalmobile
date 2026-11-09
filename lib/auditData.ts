export interface AuditFinding {
  id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  category:
    | 'Architecture & State'
    | 'Rendering & 60fps Loop'
    | 'Asset & Git Bloat'
    | 'Gameplay & Lore Drift'
    | 'Build &Cutscene Pipeline'
    | 'Security & Reliability';
  title: string;
  file: string;
  lines: string;
  impactMetric: string;
  summary: string;
  rootCause: string;
  codeBefore: string;
  codeAfter: string;
  remediationSteps: string[];
}

export interface FileMetric {
  path: string;
  category: 'Component' | 'Engine / Logic' | '3D Renderer' | 'Test Suite' | 'Cutscene Script' | 'Config';
  loc: number;
  sizeBytes: number;
  complexityRating: 'Extreme' | 'High' | 'Moderate' | 'Clean';
  healthNote: string;
}

export interface AssetCategoryMetric {
  directory: string;
  totalSizeMB: number;
  referencedSizeMB: number;
  orphanedSizeMB: number;
  fileCount: number;
  orphanedCount: number;
  notes: string;
}

export interface LoreMappingDiscrepancy {
  internalIdentifier: string;
  internalOrigin: string;
  displayedKaliyugaName: string;
  displayedDeityOrSubtitle: string;
  fileLocation: string;
}

export const REPO_SUMMARY = {
  repoUrl: 'https://github.com/akshat92008/kaalyuga.git',
  projectName: 'Kaliyuga: The Bleeding Crown (कलयुग)',
  commitSha: '2e16e20445e73f4eafba0cdd4182c0afd8aeca55',
  templateOrigin: 'Forked from google-gemini/aistudio-repository-template',
  framework: 'Next.js 15.4.9 · React 19.2.1 · TypeScript 5.9.3 · Three.js 0.174.0 · Tailwind CSS 4.1.11',
  totalRepoDiskSizeMB: 778.4,
  publicDirSizeMB: 336.0,
  cutscenesDirSizeMB: 442.0,
  orphanedPublicAssetsMB: 152.04,
  totalSourceLines: 12224,
  monolithFileLines: 6523,
  monolithSharePercent: 53.4,
  unitTestsCount: 10,
  unitTestsPass: 10,
};

export const AUDIT_FINDINGS: AuditFinding[] = [
  {
    id: 'AUD-01',
    severity: 'Critical',
    category: 'Asset & Git Bloat',
    title: '778 MB Un-LFS Binary Footprint & 152 MB of Orphaned Assets in public/',
    file: 'public/assets/aistudio/* & cutscenes/*',
    lines: '209 repository blobs (32 unreferenced in public/)',
    impactMetric: '778.4 MB git clone · 152.04 MB dead public/ payload',
    summary:
      'The repository commits 778 MB of raw binary assets directly into standard Git history without Git LFS or CDN offloading. Furthermore, 32 files (152.04 MB) inside public/assets/aistudio/ are completely unreferenced anywhere in the codebase.',
    rootCause:
      'During iterative AI Studio asset generation, every experimental PNG (up to 9.1 MB each), raw chat paste dump (Paste_October_24..., Paste_October_25...), macOS screenshot, and a 3.9 MB PDF (Ash-Bound_Warrior_s_Golden_Draught_92653fc8.pdf) were left in public/assets/aistudio/. Additionally, 32.5 MB of FBX models in public/models/ are duplicated verbatim in cutscenes/assets/.',
    codeBefore: `// public/assets/aistudio/ contains 53 files (303 MB total), including:
// - 32 unreferenced files (152.04 MB):
//   • Ash-Bound_Warrior_s_Golden_Draught_92653fc8.pdf (3.9 MB PDF!)
//   • Paste_October_24__2026_-_4_38PM_6e8e76e2 (38 KB raw LLM prompt dump)
//   • Paste_October_25__2026_-_10_57AM_f3c3815e (25 KB raw LLM prompt dump)
//   • Screenshot_2026-10-25_at_11.55.22_AM_ab31e2f8.png (4.4 MB)
//   • 21 unreferenced Gemini_Generated_Image_*.png files (4.0 MB - 8.8 MB each)
// - Duplicate 3D FBX bundles in both public/models/ and cutscenes/assets/`,
    codeAfter: `# 1. Purge all 32 unreferenced files from public/assets/aistudio/ (-152.04 MB)
git rm public/assets/aistudio/Ash-Bound_Warrior_s_Golden_Draught_92653fc8.pdf
git rm public/assets/aistudio/Paste_October_*
git rm public/assets/aistudio/Screenshot_*

# 2. Convert remaining 21 active PNG sprites/backdrops to lossless/near-lossless WebP/AVIF
# Reduces active 151 MB PNG set to ~14 MB (-90% network transfer)
npx sharp-cli -i "public/assets/aistudio/*.png" -o "public/assets/aistudio/" -f webp -q 85

# 3. Convert 32.5 MB ASCII/binary FBX + 4K PNG textures to Draco-compressed GLB
npx gltf-pipeline -i model.gltf -o public/models/rudra.glb -d`,
    remediationSteps: [
      'Delete the 32 unreferenced files in public/assets/aistudio/ (immediately saves 152.04 MB).',
      'Remove duplicate FBX and 4K texture copies between public/models/ and cutscenes/assets/ (-32.5 MB).',
      'Convert the 21 active PNG backgrounds and sprites (currently 5–8.8 MB each) to WebP at 85% quality, shrinking client download from ~151 MB to ~14 MB.',
      'Move cutscenes/*.blend (30 MB) and raw cutscene source FBXs (442 MB) to Git LFS or external release artifacts.',
    ],
  },
  {
    id: 'AUD-02',
    severity: 'Critical',
    category: 'Architecture & State',
    title: '6,523-Line Monolithic God-Component (KaliyugaArena.tsx)',
    file: 'components/game/KaliyugaArena.tsx',
    lines: 'Lines 1–6523 (53.4% of entire codebase)',
    impactMetric: '6,523 LOC · 241 KB single source file · 23 hooks/callbacks',
    summary:
      'A single React component file (KaliyugaArena.tsx) encapsulates entity type declarations, physics simulation, enemy AI state machines, 3D WebGL-to-2D canvas compositing, procedural isometric tile rendering, keyboard/mouse/gamepad polling, audio triggers, and 800+ lines of React HUD JSX.',
    rootCause:
      'All runtime loops and UI overlays were incrementally appended to KaliyugaArena.tsx instead of separating the deterministic simulation engine from the Canvas2D renderer, input controller, and React HUD.',
    codeBefore: `// components/game/KaliyugaArena.tsx (6,523 lines)
export default function KaliyugaArena() {
  const simRef = useRef({ /* 200 lines of mutable state */ });
  // 15 useCallback combat & spell triggers (lines 559-2205)
  // 285-line keyboard/mouse/window listener useEffect (lines 2207-2494)
  // 3,240-line requestAnimationFrame tick() + Canvas2D renderer (lines 2496-5735)
  // 780-line React HUD + Modal orchestration JSX (lines 5740-6523)
}`,
    codeAfter: `// Recommended Modular Architecture:
// lib/game/engine/types.ts          -> Entity, Particle, SimState interfaces
// lib/game/engine/combatSystem.ts   -> Light/Heavy/Spell/Execute resolution
// lib/game/engine/enemyAiSystem.ts  -> Dundubhi, Vrikodara, and minion AI FSMs
// lib/game/engine/inputManager.ts   -> Keyboard, Mouse, and Gamepad polling
// lib/game/renderer/arenaCanvas.ts  -> Isometric grid, Y-sorted entities, VFX
// components/game/HudOverlay.tsx    -> Pure React HUD consuming HudSnapshot
// components/game/KaliyugaArena.tsx -> < 350 lines orchestrating engine & modals`,
    remediationSteps: [
      'Extract entity interfaces (EnemyEntity, ProjectileEntity, HudSnapshot) into lib/game/types.ts.',
      'Extract the pure simulation step (lines 2520–3800) into a standalone GameSimulation class testable without a DOM.',
      'Extract the Canvas2D drawing pipeline (lines 3801–5651) into an ArenaCanvasRenderer class.',
      'Extract the React HUD overlay (lines 5780–6465) into dedicated memoized subcomponents (TopSanctuaryBar, BossHealthBar, BottomActionDeck).',
    ],
  },
  {
    id: 'AUD-03',
    severity: 'Critical',
    category: 'Rendering & 60fps Loop',
    title: 'Main-Thread CPU Pixel Flood-Fill & 5x Canvas Allocation per Sprite',
    file: 'lib/game/spriteProcessor.ts',
    lines: 'Lines 95–523 & KaliyugaArena.tsx Lines 1232–1280',
    impactMetric: '~450M pixel operations · ~680 MB uncompressed Canvas backing memory',
    summary:
      'On initial mount, KaliyugaArena.tsx triggers loadAndProcessSprite() for 26 high-resolution PNGs (many 2048x2048 to 4096x2048). Each image runs a synchronous CPU BFS flood-fill over millions of pixels and allocates 5 separate full-resolution HTMLCanvasElements (clean, flash, gold, jade, shadow).',
    rootCause:
      'Because the AI-generated sprites have solid black or white backgrounds and corner watermarks, spriteProcessor.ts performs runtime chroma-keying, watermark scrubbing, and generates 4 tinted silhouette canvases on the main browser thread.',
    codeBefore: `// lib/game/spriteProcessor.ts (Lines 95-115 & 135-523)
const cleanCanvas = document.createElement('canvas');
const flashCanvas = document.createElement('canvas');
const goldCanvas = document.createElement('canvas');
const jadeCanvas = document.createElement('canvas');
const shadowCanvas = document.createElement('canvas');
// Followed by synchronous BFS queue over w * h (up to 8,388,608 pixels per image!)
// Staggered only by a 22ms setTimeout, causing severe main-thread frame drops during the first 3 seconds.`,
    codeAfter: `// 1. Pre-process alpha channels & strip watermarks at build time via sharp script:
// scripts/preprocess-sprites.ts -> outputs pre-keyed transparent WebP sprites.

// 2. Replace 4 extra full-resolution silhouette canvases (flash, gold, jade, shadow)
// with Canvas2D globalCompositeOperation = 'source-atop' or WebGL tint shader at draw time,
// reducing offscreen canvas memory footprint by 80% (from 5 canvases per sprite to 1).`,
    remediationSteps: [
      'Move background removal and corner watermark stripping to an offline build script using sharp.',
      'Eliminate flashCanvas, goldCanvas, jadeCanvas, and shadowCanvas allocations; generate silhouettes dynamically on a single reusable scratch canvas or via WebGL.',
      'If runtime processing is ever needed, offload ImageData manipulation to a Web Worker using OffscreenCanvas and ImageBitmap.',
    ],
  },
  {
    id: 'AUD-04',
    severity: 'High',
    category: 'Gameplay & Lore Drift',
    title: 'Zero Client Persistence: Ashen Karma & Homa Fire Shrine Upgrades Reset on Reload',
    file: 'components/game/KaliyugaArena.tsx',
    lines: 'Lines 322–323, 368–369, 5742–5765',
    impactMetric: '100% meta-progression loss on browser refresh',
    summary:
      'Despite featuring a roguelite meta-progression currency (Ashen Karma) and a persistent upgrade altar (Homa Fire Shrine / KeepersShrineModal), there are zero localStorage or IndexedDB reads/writes anywhere in the codebase. Refreshing the tab wipes all earned Karma and Shrine ranks back to INITIAL_SHRINE_RANKS.',
    rootCause:
      'shrineRanks and ashenKarma are initialized directly from static constants (INITIAL_SHRINE_RANKS and INITIAL_ASHEN_KARMA = 120) in React state and simRef without hydration or persistence hooks.',
    codeBefore: `// components/game/KaliyugaArena.tsx (Lines 322-323)
const [shrineRanks, setShrineRanks] = useState<ShrineRanks>(INITIAL_SHRINE_RANKS);
const [ashenKarma, setAshenKarma] = useState<number>(INITIAL_ASHEN_KARMA);`,
    codeAfter: `const STORAGE_KEY = 'kaliyuga_save_v1';

// Hydrate after mount and persist whenever shrineRanks or ashenKarma updates:
useEffect(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.ranks) {
        simRef.current.ranks = { ...INITIAL_SHRINE_RANKS, ...parsed.ranks };
        setShrineRanks(simRef.current.ranks);
      }
      if (typeof parsed.karma === 'number') {
        simRef.current.ashenKarma = parsed.karma;
        setAshenKarma(parsed.karma);
      }
    }
  } catch {}
}, []);`,
    remediationSteps: [
      'Persist shrineRanks, ashenKarma, and highest cleared chamber to localStorage under a versioned key (kaliyuga_save_v1).',
      'Add a "Reset Save Data" option inside the Shrine or Codex modal for clean testing.',
    ],
  },
  {
    id: 'AUD-05',
    severity: 'High',
    category: 'Rendering & 60fps Loop',
    title: 'Per-Frame WebGL-to-2D Canvas Readback & Per-Frame Object Allocations in 60fps Loop',
    file: 'lib/game/rudra3dRenderer.ts & KaliyugaArena.tsx',
    lines: 'rudra3dRenderer.ts Lines 802, 852–853 · KaliyugaArena.tsx Lines 3838–3892, 5662',
    impactMetric: '2 WebGL renders + 357 procedural tile paths + 10Hz full HUD state clones/sec',
    summary:
      'Every frame, two independent Three.js WebGLRenderers (Rudra3DRenderer at 512x512 and Boss3DRenderer at 560x560) render offscreen and are copied into a 2D Canvas via ctx.drawImage(webglCanvas). Simultaneously, the 2D canvas redraws 357 procedural diamond tiles (17x21 nested loop) with string-interpolated rgba() styles every frame.',
    rootCause:
      'Combining two separate WebGL contexts with a CPU-bound 2D canvas context forces GPU-to-CPU-to-GPU texture synchronization when compositing. Additionally, updateWeaponTrail allocates new THREE.Vector3 instances on every active frame, and the 17x21 floor tile grid is recomputed instead of cached.',
    codeBefore: `// KaliyugaArena.tsx (Lines 3842-3891) - Runs 60 times per second!
for (let gy = 0; gy < 17; gy++) {
  for (let gx = 0; gx < 21; gx++) {
    // 357 iterations per frame constructing template strings & 2D paths:
    ctx.fillStyle = \`rgba(255, 196, 120, \${tileAlpha * 0.14})\`;
    ctx.beginPath();
    ctx.moveTo(cx, cy - tileH * 0.48);
    // ...
  }
}

// rudra3dRenderer.ts (Lines 852-853) - Allocates on heap every active swing frame:
const tipWorld = new THREE.Vector3();
const baseWorld = new THREE.Vector3();`,
    codeAfter: `// 1. Pre-render the static 17x21 isometric stone tile grid + central mandala once per chamber
// onto an offscreen chamberFloorCanvas, then draw it in 1 blit:
ctx.drawImage(chamberFloorCanvas, 0, 0);

// 2. Reuse private scratch vectors in Rudra3DRenderer:
private readonly _tipWorld = new THREE.Vector3();
private readonly _baseWorld = new THREE.Vector3();`,
    remediationSteps: [
      'Cache the static 17x21 isometric tile grid and central sanctum mandala into a single offscreen canvas per chamber.',
      'Pre-allocate scratch THREE.Vector3, THREE.Quaternion, and THREE.Euler instances on Rudra3DRenderer class fields.',
      'Avoid unconditional setHud({...}) at 10Hz when modal overlays are open or values have not changed.',
    ],
  },
  {
    id: 'AUD-06',
    severity: 'High',
    category: 'Gameplay & Lore Drift',
    title: 'Boon Stacking & Cooldown Bugs: Non-Stacking Spell Cooldown & Chamber Transition Overwrites',
    file: 'lib/game/boons.ts & components/game/KaliyugaArena.tsx',
    lines: 'boons.ts Line 328 · KaliyugaArena.tsx Lines 1027–1031, 1333, 5762',
    impactMetric: '4 mechanical calculation discrepancies between UI text and combat math',
    summary:
      'Several Boon and Shrine mechanics diverge from their advertised descriptions or overwrite each other during chamber transitions and Shrine purchases.',
    rootCause:
      'Hardcoded assignments and inconsistent modifier formulas across boons.ts and KaliyugaArena.tsx.',
    codeBefore: `// Bug 1: KaliyugaArena.tsx Line 1333 (Kalasha Heal Ratio)
// Boon says "+50% Kalasha Heal Ratio", which sets gourdInstantHealRatio = 0.5.
// But triggerGourdHeal calculates:
const healRatio = 0.42 + boonMods.gourdInstantHealRatio * 0.45; // Adds +22.5% HP, not +50%!

// Bug 2: KaliyugaArena.tsx Line 5762 (Purchasing Kalasha Sip at Shrine mid-run)
// Overwrites +1 bonus sip from Guanyin/Ashvins Boon!
sim.player.maxGourdSips = nextDerived.maxGourdSips; // Missing + boonMods.gourdBonusMaxSips!

// Bug 3: KaliyugaArena.tsx Line 1005 vs Line 3668 (Starting Boon Altar)
// Player starts Chamber 1 with boonReadyCount = 1, and clearing Chamber 1 increments it to 2
// if unclaimed, forcing back-to-back modal popups.`,
    codeAfter: `// Fix 1: Apply true multiplicative or additive heal ratio matching tooltip:
const healRatio = 0.42 * (1 + boonMods.gourdInstantHealRatio); // 0.42 -> 0.63 (+50% heal)

// Fix 2: Preserve Boon bonus sips when purchasing Shrine upgrades:
const boonMods = computeBoonModifiers(sim.activeBoons);
sim.player.maxGourdSips = nextDerived.maxGourdSips + boonMods.gourdBonusMaxSips;`,
    remediationSteps: [
      'Include computeBoonModifiers(sim.activeBoons).gourdBonusMaxSips when recalculating maxGourdSips in handlePurchaseUpgrade (line 5762).',
      'Align triggerGourdHeal math (line 1333) with the "+50% Kalasha Heal Ratio" callout in boons.ts.',
      'Ensure rollCelestialBoonOffer fallback (boons.ts line 386) does not offer duplicate already-owned boons when 10+ boons are owned.',
    ],
  },
  {
    id: 'AUD-07',
    severity: 'Medium',
    category: 'Build &Cutscene Pipeline',
    title: 'Cutscene Disconnect & Hardcoded Developer Machine Paths (/Users/ashishsingh/...)',
    file: 'cutscenes/scripts/*.py & cutscenes/kaliyuga_god_of_war_boss_intro.mp4',
    lines: '11 Python scripts (39 hardcoded path occurrences)',
    impactMetric: '5.1 MB MP4 & 8.3 MB GIF never used in game · Scripts non-portable',
    summary:
      'The README highlights the 1080p CinemaScope boss intro cutscene (cutscenes/kaliyuga_god_of_war_boss_intro.mp4), but the Next.js web application never loads or plays it on entering Chamber 5 (Dundubhi) or Chamber 12 (Vrikodara). Furthermore, all 11 Blender Python scripts hardcode "/Users/ashishsingh/Desktop/kaliyuga/..." and "/Users/ashishsingh/.gemini/antigravity/...".',
    rootCause:
      'The cutscene MP4 sits in /cutscenes (outside Next.js /public), and no <video> modal trigger was wired into loadChamber() for boss chambers. The Python scripts were written with absolute local macOS paths.',
    codeBefore: `# cutscenes/scripts/render_and_encode_gow_cutscene.py (Lines 10-13)
BLEND_PATH = "/Users/ashishsingh/Desktop/kaliyuga/cutscenes/kaliyuga_god_of_war_master.blend"
FFMPEG_BIN = "/Users/ashishsingh/.cache/uv/archive-v0/FyGzTZ0pvx6-kydJ/lib/python3.13/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1"
OUTPUT_MP4 = "/Users/ashishsingh/Desktop/kaliyuga/cutscenes/kaliyuga_god_of_war_boss_intro.mp4"`,
    codeAfter: `from pathlib import Path
import shutil

ROOT_DIR = Path(__file__).resolve().parents[1]
ASSETS_DIR = ROOT_DIR / "assets"
BLEND_PATH = ROOT_DIR / "kaliyuga_god_of_war_master.blend"
FFMPEG_BIN = shutil.which("ffmpeg") or "ffmpeg"
OUTPUT_MP4 = ROOT_DIR / "kaliyuga_god_of_war_boss_intro.mp4"`,
    remediationSteps: [
      'Replace all 39 hardcoded /Users/ashishsingh/... paths in cutscenes/scripts/*.py with Path(__file__).resolve().parent relative paths.',
      'Move kaliyuga_god_of_war_boss_intro.mp4 into public/cutscenes/ and play a skippable CinemaScope <video> intro when entering Boss Chamber 5 or 12.',
    ],
  },
  {
    id: 'AUD-08',
    severity: 'Medium',
    category: 'Gameplay & Lore Drift',
    title: 'Split Identity Between "Black Myth: Wukong" Code Internals and "Kaliyuga" Indian Mythology UI',
    file: 'lib/game/rules.ts, lib/game/boons.ts, lib/game/audio.ts, KaliyugaArena.tsx',
    lines: 'Across 8 core source files',
    impactMetric: '25+ mismatched identifier/lore pairs + 1 live Mandarin combat callout leak',
    summary:
      'The codebase was originally built as a Black Myth: Wukong vertical slice ("Wukong Master Guide") and subsequently reskinned to ancient Indian mythology (Kurukshetra, Rudra, Dundubhi, Vrikodara). However, all internal TypeScript types, property names (`chineseName`, `chineseSubtitle`, `chineseTitle`), test assertions, and even one live in-game floating text callout still reference Wukong/Chinese mythology.',
    rootCause:
      'Surface strings were updated to Sanskrit/Vedic names while underlying union types (`jingu_bang`, `chu_bai_spear`, `nezha`, `erlang`, `guanyin`, `xuemo`, `tiger_vanguard`) and fields (`chineseName`) were preserved to avoid breaking existing unit tests.',
    codeBefore: `// Live in-game floating text leak in KaliyugaArena.tsx (Line 3642):
spawnFloatingText(
  p.x,
  p.y - 82,
  'JIUMING HAOMAO · LIFE-SAVING STRAND REVIVE!', // <- Chinese Wukong spell name in Indian mythic game!
  '#ffd86b',
  1.3
);

// Type definitions in lib/game/rules.ts & lib/game/boons.ts:
export type WeaponId = 'jingu_bang' | 'chu_bai_spear' | 'wind_bear_talon';
export type ImmortalPatronId = 'nezha' | 'erlang' | 'guanyin' | 'aoguang' | 'subhuti' | 'greatsage';`,
    codeAfter: `// Fix live floating text in KaliyugaArena.tsx (Line 3642):
spawnFloatingText(
  p.x,
  p.y - 82,
  'MRITYUNJAYA MANTRA · DEATHLESS REVIVE!',
  '#ffd86b',
  1.3
);`,
    remediationSteps: [
      'Update the live floating text on line 3642 of KaliyugaArena.tsx from "JIUMING HAOMAO · LIFE-SAVING STRAND REVIVE!" to "MRITYUNJAYA MANTRA · DEATHLESS REVIVE!" to match the Shrine upgrade.',
      'Alias or migrate chineseName / chineseSubtitle / chineseTitle properties to sanskritName / vedicSubtitle.',
      'Remove the window.__KALIYUGA_TEST__ property keys wukongGoldFrames and wukongActionFrames in favor of rudraIdleFrames / rudraActionFrames.',
    ],
  },
  {
    id: 'AUD-09',
    severity: 'Low',
    category: 'Security & Reliability',
    title: 'Web Audio API Oscillator Node Churn, DOM dataset Polling, & Unused Dependencies',
    file: 'lib/game/audio.ts & package.json',
    lines: 'audio.ts Lines 61–303 · package.json Lines 11–39',
    impactMetric: '4 unused npm packages · Uncleaned AudioNodes · Missing test script',
    summary:
      'SoundEngine creates short-lived OscillatorNode, GainNode, and BiquadFilterNode graphs on every footstep, hit, and 950ms music tick without disconnecting them in onended. It also polls document.body.dataset.state inside setInterval. Meanwhile, package.json ships unused dependencies (@google/genai, @hookform/resolvers, class-variance-authority, lucide-react) and lacks a "test" script despite having 2 unit test files.',
    rootCause:
      'Template dependencies were left in package.json, and SoundEngine relies on browser GC to collect stopped Web Audio nodes.',
    codeBefore: `// package.json scripts:
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
  // Missing "test" script for lib/game/*.test.ts!
}`,
    codeAfter: `"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "npx tsx --test lib/game/*.test.ts"
}`,
    remediationSteps: [
      'Add `"test": "npx tsx --test lib/game/*.test.ts"` to package.json scripts.',
      'Remove unused dependencies (`@google/genai`, `@hookform/resolvers`, `class-variance-authority`, `lucide-react`) from package.json.',
      'Attach `osc.onended = () => { osc.disconnect(); gain.disconnect(); }` in `lib/game/audio.ts`.',
    ],
  },
];

export const FILE_METRICS: FileMetric[] = [
  {
    path: 'components/game/KaliyugaArena.tsx',
    category: 'Component',
    loc: 6523,
    sizeBytes: 241453,
    complexityRating: 'Extreme',
    healthNote: 'Monolithic God-component (53.4% of codebase). Mixes 60fps physics, AI, 2D/3D rendering, input, and React HUD.',
  },
  {
    path: 'lib/game/rudra3dRenderer.ts',
    category: '3D Renderer',
    loc: 902,
    sizeBytes: 31840,
    complexityRating: 'High',
    healthNote: 'Three.js FBX skeletal rig + procedural upper-body swing articulation + 3D blade ribbon trail.',
  },
  {
    path: 'lib/game/boss3dRenderer.ts',
    category: '3D Renderer',
    loc: 734,
    sizeBytes: 25920,
    complexityRating: 'Moderate',
    healthNote: 'Procedural Three.js meshes for Dundubhi & Vrikodara. Uses single shared scene toggled per render call.',
  },
  {
    path: 'lib/game/spriteProcessor.ts',
    category: 'Engine / Logic',
    loc: 676,
    sizeBytes: 24110,
    complexityRating: 'High',
    healthNote: 'Main-thread CPU BFS flood-fill chroma keyer. Allocates 5 full-res canvases per sprite.',
  },
  {
    path: 'lib/game/assets.ts',
    category: 'Engine / Logic',
    loc: 502,
    sizeBytes: 19840,
    complexityRating: 'Clean',
    healthNote: 'Defines 12 chambers, brazier light coordinates, prop layouts, and spawn waves.',
  },
  {
    path: 'lib/game/rules.ts',
    category: 'Engine / Logic',
    loc: 431,
    sizeBytes: 15210,
    complexityRating: 'Clean',
    healthNote: 'Pure deterministic math for damage, posture break, cone/corridor/shockwave hitboxes, and Shrine upgrades.',
  },
  {
    path: 'lib/game/boons.ts',
    category: 'Engine / Logic',
    loc: 395,
    sizeBytes: 14680,
    complexityRating: 'Clean',
    healthNote: '6 Deva patrons & 12 Celestial Boons. Pure modifier aggregation and backstab vector check.',
  },
  {
    path: 'components/game/TitleScreen.tsx',
    category: 'Component',
    loc: 387,
    sizeBytes: 15890,
    complexityRating: 'Moderate',
    healthNote: '2.5D mouse-parallax layered hero screen with procedural ember canvas and SVG gold-leaf typography.',
  },
  {
    path: 'components/game/StoryCodexModal.tsx',
    category: 'Component',
    loc: 370,
    sizeBytes: 15420,
    complexityRating: 'Clean',
    healthNote: '4-tab lore codex (Three Voices, Bestiary, Combat Builds, Controls) with interactive build preset applier.',
  },
  {
    path: 'lib/game/audio.ts',
    category: 'Engine / Logic',
    loc: 313,
    sizeBytes: 10120,
    complexityRating: 'Moderate',
    healthNote: 'Zero-dependency Web Audio API procedural synthesizer for footsteps, metallic hits, astras, and gongs.',
  },
  {
    path: 'components/game/OutcomeModal.tsx',
    category: 'Component',
    loc: 242,
    sizeBytes: 9120,
    complexityRating: 'Clean',
    healthNote: 'Pause, Victory, and Defeat modal with run score and Ashen Karma delta summary.',
  },
  {
    path: 'components/game/BoonModal.tsx',
    category: 'Component',
    loc: 202,
    sizeBytes: 8152,
    complexityRating: 'Clean',
    healthNote: 'Hades-style 3-card Deva Boon drafting modal with [1]/[2]/[3] and [R] keyboard shortcuts.',
  },
  {
    path: 'lib/game/rules.test.ts',
    category: 'Test Suite',
    loc: 198,
    sizeBytes: 6410,
    complexityRating: 'Clean',
    healthNote: '6 node:test suites verifying Shrine upgrades, stances, posture breaks, and geometric hitboxes.',
  },
  {
    path: 'components/game/KeepersShrineModal.tsx',
    category: 'Component',
    loc: 168,
    sizeBytes: 6890,
    complexityRating: 'Clean',
    healthNote: 'Homa Fire Shrine upgrade altar and 12-chamber fast-travel selector.',
  },
  {
    path: 'app/layout.tsx',
    category: 'Config',
    loc: 50,
    sizeBytes: 1445,
    complexityRating: 'Clean',
    healthNote: 'Next.js App Router root layout loading Cinzel, Plus Jakarta Sans, and JetBrains Mono.',
  },
  {
    path: 'lib/game/boons.test.ts',
    category: 'Test Suite',
    loc: 48,
    sizeBytes: 1890,
    complexityRating: 'Clean',
    healthNote: '4 node:test suites verifying Boon modifier stacking, Shadow Strike backstabs, and unique offer rolls.',
  },
  {
    path: 'cutscenes/scripts/*.py (11 files)',
    category: 'Cutscene Script',
    loc: 2790,
    sizeBytes: 98400,
    complexityRating: 'Moderate',
    healthNote: 'Blender 5.2 EEVEE Next procedural cutscene generators. Contains 39 hardcoded /Users/ashishsingh paths.',
  },
];

export const ASSET_BREAKDOWN: AssetCategoryMetric[] = [
  {
    directory: 'public/assets/aistudio/ (Unreferenced Orphans)',
    totalSizeMB: 152.04,
    referencedSizeMB: 0,
    orphanedSizeMB: 152.04,
    fileCount: 32,
    orphanedCount: 32,
    notes: '21 unused 4K PNGs, 2 screenshots, 2 LLM text pastes, 4 turnaround sheets, and 1 3.9MB PDF file.',
  },
  {
    directory: 'public/assets/aistudio/ (Active Game Sprites & Backdrops)',
    totalSizeMB: 151.4,
    referencedSizeMB: 151.4,
    orphanedSizeMB: 0,
    fileCount: 25,
    orphanedCount: 0,
    notes: 'Uncompressed PNGs (4.5 MB to 8.8 MB each). Converting to WebP reduces this to ~14 MB.',
  },
  {
    directory: 'public/models/ (Runtime 3D FBX & 4K PBR Maps)',
    totalSizeMB: 32.5,
    referencedSizeMB: 32.5,
    orphanedSizeMB: 0,
    fileCount: 10,
    orphanedCount: 0,
    notes: 'Rudra (23.5 MB FBX + 11 MB textures) & Parashu Axe (9.3 MB FBX + 10.3 MB textures). Duplicated in cutscenes/.',
  },
  {
    directory: 'cutscenes/ (Blender Master, Raw FBX Vault & Video Exports)',
    totalSizeMB: 442.0,
    referencedSizeMB: 13.4,
    orphanedSizeMB: 428.6,
    fileCount: 121,
    orphanedCount: 119,
    notes: 'Contains 66 MB Infernal_Ironclad FBX, 30 MB .blend file, and duplicate Rudra/Weapon FBXs. Only GIF is linked in README.',
  },
];

export const LORE_DISCREPANCIES: LoreMappingDiscrepancy[] = [
  {
    internalIdentifier: "WeaponId: 'jingu_bang'",
    internalOrigin: 'Ruyi Jingu Bang (Sun Wukong Staff)',
    displayedKaliyugaName: 'Khanda of the Ash-Meadow',
    displayedDeityOrSubtitle: 'KHANDA-GADĀ · IRON MACE & GREATBLADE',
    fileLocation: 'lib/game/rules.ts:5, 102',
  },
  {
    internalIdentifier: "WeaponId: 'chu_bai_spear'",
    internalOrigin: 'Chu-Bai Spear (Black Myth: Wukong)',
    displayedKaliyugaName: 'Pinaka Spear of Rudra',
    displayedDeityOrSubtitle: 'SHULA-PINAKA · SPEAR OF THE STORM',
    fileLocation: 'lib/game/rules.ts:5, 113',
  },
  {
    internalIdentifier: "WeaponId: 'wind_bear_talon'",
    internalOrigin: 'Black Wind Bear Talon',
    displayedKaliyugaName: 'Vajra-Claws of Indra',
    displayedDeityOrSubtitle: 'VAJRA-NAKHA · THUNDER FISTS',
    fileLocation: 'lib/game/rules.ts:5, 124',
  },
  {
    internalIdentifier: "BossId: 'xuemo'",
    internalOrigin: 'Xuemo (Blood Demon)',
    displayedKaliyugaName: 'Dundubhi · The Bronze-Horned Buffalo Demon',
    displayedDeityOrSubtitle: 'DUNDUBHI · THE WAR-DRUM OF KURUKSHETRA',
    fileLocation: 'lib/game/assets.ts:138, 250',
  },
  {
    internalIdentifier: "BossId: 'tiger_vanguard'",
    internalOrigin: 'Tiger Vanguard (Chapter 2 Boss)',
    displayedKaliyugaName: 'Vrikodara · The Starving Rakshasa General',
    displayedDeityOrSubtitle: 'VRIKODARA · THE IRON RAKSHASA',
    fileLocation: 'lib/game/assets.ts:138, 482',
  },
  {
    internalIdentifier: "PatronId: 'nezha' | 'erlang' | 'guanyin' | 'aoguang' | 'subhuti' | 'greatsage'",
    internalOrigin: 'Chinese Immortal Patrons (Journey to the West)',
    displayedKaliyugaName: 'Agni, Indra, Ashvins, Varuna, Brihaspati, Rudra-Shiva',
    displayedDeityOrSubtitle: 'Vedic Devas of Kurukshetra',
    fileLocation: 'lib/game/boons.ts:6, 49-122',
  },
  {
    internalIdentifier: "'JIUMING HAOMAO · LIFE-SAVING STRAND REVIVE!'",
    internalOrigin: 'Jiuming Haomao (Wukong Life-Saving Hair)',
    displayedKaliyugaName: 'LEAKED DIRECTLY TO SCREEN IN COMBAT!',
    displayedDeityOrSubtitle: 'Should be: MRITYUNJAYA MANTRA · DEATHLESS REVIVE!',
    fileLocation: 'components/game/KaliyugaArena.tsx:3642',
  },
];
