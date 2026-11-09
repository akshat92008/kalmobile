// High-fidelity offscreen Sprite Sheet Border-Seeded Floodfill Matte Extractor,
// Green-Screen Multi-Row Chroma-Key Segmenter, Solid-Interior Preservation & Hades-Style Inked Contour Outliner

export interface SpriteFrameBounds {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** Horizontal torso/pelvis center-of-mass offset from sx (in source pixels) */
  anchorX?: number;
  /** Vertical distance from sy down to the row's unified foot ground line (in source pixels) */
  groundOffsetY?: number;
}

export interface ProcessedSpriteAsset {
  url?: string;
  cleanCanvas: HTMLCanvasElement;
  flashCanvas: HTMLCanvasElement;
  goldCanvas: HTMLCanvasElement;
  jadeCanvas: HTMLCanvasElement;
  shadowCanvas?: HTMLCanvasElement;
  width: number;
  height: number;
  frames: SpriteFrameBounds[];
  rows?: SpriteFrameBounds[][];
  baseFrameHeight: number;
}

const processedCache = new Map<string, ProcessedSpriteAsset>();
const loadingPromises = new Map<string, Promise<ProcessedSpriteAsset | null>>();

export const KNOWN_MULTIROW_UUIDS = [
  'Bronze_Spearman_Sprite_Sheet',
  'Ghoul_Animation_Sprite_Sheet',
  'Fantasy_Knight_Combat_Sprite_Sheet',
  'Monster_Sprite_Animation_Sheet',
  'Hooded_Mage_Animation_Sprite_Sheet',
  'Naga_Warrior_Animation_Sprite_Sheet',
  'Ogre_Warrior_Animation_Sprite_Sheet',
  'Demonic_Ogre_Warrior_Sprite_Sheet',
  'Molten_Golem_Animation_Sprite_Sheet',
  'Undead_Monster_Animation_Spritesheet',
  'Undead_Warrior_Sprite_Sheet',
  'Undead_Archer_Animation_Sprite_Sheet',
  'Minotaur_Warrior_Sprite_Animation_Sheet-4',
  'Minotaur_Warrior_Animation_Sprite_Sheet-1',
  'Horned_Minotaur_Warrior_Sprite_Sheet-2',
  'Horned_Warrior_Animation_Sprite_Sheet-3',
  'Demonic_King_Action_Sprite_Sheet',
];

const KNOWN_2X2_UUIDS = [
  'CB33122A-A9C1-4A00-8F0C-6B65EE5BF3AE', // Vedic Combat VFX 2x2
  'CB79B07D-70B4-4A9F-A5B1-C7C3743DDBCF', // Vrikodara Phase 1 2x2
  '59C244F9-D856-485F-8D8A-2408B379DEA1', // Naga Serpent-King 2x2
  '35922E13-6015-481F-8ABF-723988E0F89C', // Dundubhi Phase 1A 2x2
  '565576C2-F6B7-4179-94FD-2534E706355F', // Dundubhi Phase 1B 2x2
  '0A23068F-ECD7-4091-98B2-E98569B6AE85', // Vrikodara Phase 2 2x2
  '6841C243-65F8-4AF9-BE1C-7B3823597403', // Dundubhi Phase 2 2x2
  'el5r51el5r51el5r_5da30179', // Kaliyuga Cosmic Avatar 2x2
  'kwhb8qkwhb8qkwhb',
  'o86abro86abro86a',
  '2n0p172n0p172n0p',
  'zhy8c6zhy8c6zhy8',
  '5bgscc5bgscc5bgs',
  'e4v7n9e4v7n9e4v7',
  'glxj9tglxj9tglxj',
  '9eap7c9eap7c9eap',
  'smm68fsmm68fsmm6',
  '96efot96efot96ef',
  'u7yyaau7yyaau7yy',
];

const KNOWN_4X1_UUIDS = [
  'EEC0C930-2E86-45A2-A02B-0953ACE3362E', // Aghori Ash-Sorcerer 1x4
  '0BF73362-5404-4715-B6EB-8509CBCF9B51', // Savitri Companion 1x4
  'DD93700A-4C55-47C2-B081-115AAF6D0B03', // Urumi Whip-Blade Assassin 1x4
  '1359D234-AC6C-4877-90EA-DC9626625207', // Sanjaya Companion 1x4
  '8u43ce8u43ce8u43',
  '6669w66669w66669',
  'uyv1euuyv1euuyv1',
  'vw8zcgvw8zcgvw8z',
  'wixy9mwixy9mwixy',
  'v7t1y5v7t1y5v7t1',
  'by91e1by91e1by91',
  'vqynauvqynauvqyn',
];

export function isMultiRowSpriteUrl(url: string): boolean {
  return KNOWN_MULTIROW_UUIDS.some((token) => url.includes(token));
}

interface SheetSliceSpec {
  row: number;
  start: number;
  end: number;
}

interface SheetAnimManifest {
  idle: SheetSliceSpec;
  walk: SheetSliceSpec;
  windup: SheetSliceSpec;
  attack: SheetSliceSpec;
  special: SheetSliceSpec;
  hurt: SheetSliceSpec;
  death: SheetSliceSpec;
  standingRefRow: number;
  standingRefEnd: number;
  /** Visual stature calibration so tall-spear/raised-sword sheets and wide-beast sheets render at uniform on-screen body size */
  scaleAdjust: number;
}

/**
 * Exact Per-Sheet Animation Row & Frame Manifest verified against all 15 uploaded sprite sheets.
 * Windup (anticipation) and Attack (strike + follow-through) use non-overlapping monotonic frame ranges
 * so windup -> attack plays smoothly forward without jumping backward.
 */
function getManifestForSheetUrl(url: string, numRows: number): SheetAnimManifest {
  if (url.includes('Bronze_Spearman_Sprite_Sheet')) {
    // 3 rows: Row 0 = Idle(0..4) + Walk(4..9); Row 1 = Hurt(0..2) + Death(2..8); Row 2 = Spear Attack(0..6)
    return {
      idle: { row: 0, start: 0, end: 4 },
      walk: { row: 0, start: 4, end: 99 },
      windup: { row: 2, start: 0, end: 2 },
      attack: { row: 2, start: 2, end: 99 },
      special: { row: 2, start: 1, end: 99 },
      hurt: { row: 1, start: 0, end: 2 },
      death: { row: 1, start: 2, end: 99 },
      standingRefRow: 0,
      standingRefEnd: 4,
      scaleAdjust: 1.24,
    };
  }
  if (url.includes('Undead_Warrior_Sprite_Sheet')) {
    // 3 rows: Row 0 = Idle(0..4) + Walk(4..10); Row 1 = Attack(0..6) + Hurt(6..8); Row 2 = Death(0..7)
    return {
      idle: { row: 0, start: 0, end: 4 },
      walk: { row: 0, start: 4, end: 99 },
      windup: { row: 1, start: 0, end: 2 },
      attack: { row: 1, start: 2, end: 6 },
      special: { row: 1, start: 1, end: 6 },
      hurt: { row: 1, start: 6, end: 99 },
      death: { row: 2, start: 0, end: 99 },
      standingRefRow: 0,
      standingRefEnd: 4,
      scaleAdjust: 1.18,
    };
  }
  if (url.includes('Undead_Archer_Animation_Sprite_Sheet')) {
    // 3 rows: Row 0 = Idle(0..4) + Walk(4..10); Row 1 = Bow Draw/Release(0..6) + Hurt(6..8); Row 2 = Death(0..7)
    return {
      idle: { row: 0, start: 0, end: 4 },
      walk: { row: 0, start: 4, end: 99 },
      windup: { row: 1, start: 0, end: 3 },
      attack: { row: 1, start: 3, end: 6 },
      special: { row: 1, start: 2, end: 6 },
      hurt: { row: 1, start: 6, end: 99 },
      death: { row: 2, start: 0, end: 99 },
      standingRefRow: 0,
      standingRefEnd: 4,
      scaleAdjust: 1.08,
    };
  }
  if (url.includes('Fantasy_Knight_Combat_Sprite_Sheet')) {
    // 4 rows: Row 0 = Idle(0..4); Row 1 = Walk(0..7); Row 2 = Mace Swing(0..6) + Shield Guard(6..9); Row 3 = Hurt(0..2) + Death(2..9)
    return {
      idle: { row: 0, start: 0, end: 4 },
      walk: { row: 1, start: 0, end: 99 },
      windup: { row: 2, start: 0, end: 2 },
      attack: { row: 2, start: 2, end: 6 },
      special: { row: 2, start: 2, end: 6 },
      hurt: { row: 3, start: 0, end: 2 },
      death: { row: 3, start: 2, end: 99 },
      standingRefRow: 0,
      standingRefEnd: 4,
      scaleAdjust: 1.02,
    };
  }
  if (url.includes('Ghoul_Animation_Sprite_Sheet')) {
    // 6 rows: Row 0 = Upside-down hang (skip!); Row 1 = Stalk/Walk(0..7); Row 2 = Drop (skip!); Row 3 = Claw Attack(0..7); Row 4 = Acid Cast(0..7); Row 5 = Hurt(0..2) + Death(2..9)
    return {
      idle: { row: 1, start: 0, end: 3 },
      walk: { row: 1, start: 0, end: 99 },
      windup: { row: 3, start: 0, end: 2 },
      attack: { row: 3, start: 2, end: 99 },
      special: { row: 4, start: 2, end: 99 },
      hurt: { row: 5, start: 0, end: 2 },
      death: { row: 5, start: 2, end: 99 },
      standingRefRow: 1,
      standingRefEnd: 5,
      scaleAdjust: 1.0,
    };
  }
  if (url.includes('Hooded_Mage_Animation_Sprite_Sheet')) {
    // 5 rows: Row 0 = Idle(0..4); Row 1 = Walk(0..7); Row 2 = Cast Attack(0..7); Row 3 = Phase(0..4); Row 4 = Hurt(0..2) + Death(2..9)
    return {
      idle: { row: 0, start: 0, end: 4 },
      walk: { row: 1, start: 0, end: 99 },
      windup: { row: 2, start: 0, end: 3 },
      attack: { row: 2, start: 3, end: 99 },
      special: { row: 2, start: 2, end: 99 },
      hurt: { row: 4, start: 0, end: 2 },
      death: { row: 4, start: 2, end: 99 },
      standingRefRow: 0,
      standingRefEnd: 4,
      scaleAdjust: 1.02,
    };
  }
  if (url.includes('Monster_Sprite_Animation_Sheet')) {
    // 5 rows: Row 0 = Idle(0..4); Row 1 = Walk(0..7); Row 2 = Attack(0..7); Row 3 = Special(0..6); Row 4 = Hurt(0..2) + Death(2..10)
    return {
      idle: { row: 0, start: 0, end: 4 },
      walk: { row: 1, start: 0, end: 99 },
      windup: { row: 2, start: 0, end: 2 },
      attack: { row: 2, start: 2, end: 99 },
      special: { row: 3, start: 1, end: 99 },
      hurt: { row: 4, start: 0, end: 2 },
      death: { row: 4, start: 2, end: 99 },
      standingRefRow: 0,
      standingRefEnd: 4,
      scaleAdjust: 0.84,
    };
  }
  if (url.includes('Naga_Warrior_Animation_Sprite_Sheet')) {
    // 5 rows: Row 0 = Idle(0..4); Row 1 = Walk(0..8); Row 2 = Attack(0..7); Row 3 = Special(0..7); Row 4 = Hurt(0..2) + Death(2..9)
    return {
      idle: { row: 0, start: 0, end: 4 },
      walk: { row: 1, start: 0, end: 99 },
      windup: { row: 2, start: 0, end: 2 },
      attack: { row: 2, start: 2, end: 99 },
      special: { row: 3, start: 1, end: 99 },
      hurt: { row: 4, start: 0, end: 2 },
      death: { row: 4, start: 2, end: 99 },
      standingRefRow: 0,
      standingRefEnd: 4,
      scaleAdjust: 1.0,
    };
  }
  if (url.includes('Ogre_Warrior_Animation_Sprite_Sheet')) {
    // 6 rows: Row 0 = Idle(0..4); Row 1 = Walk(0..6); Row 2 = Attack(0..9); Row 3 = Lunge(0..6); Row 4 = Hurt(0..2); Row 5 = Death(0..9)
    return {
      idle: { row: 0, start: 0, end: 4 },
      walk: { row: 1, start: 0, end: 99 },
      windup: { row: 2, start: 0, end: 3 },
      attack: { row: 2, start: 3, end: 99 },
      special: { row: 3, start: 1, end: 99 },
      hurt: { row: 4, start: 0, end: 99 },
      death: { row: 5, start: 0, end: 99 },
      standingRefRow: 0,
      standingRefEnd: 4,
      scaleAdjust: 1.04,
    };
  }
  if (url.includes('Undead_Monster_Animation_Spritesheet')) {
    // 6 rows: Row 0 = Idle(0..4); Row 1 = Walk(0..6); Row 2 = Attack(0..6); Row 3 = Pounce(0..6); Row 4 = Hurt(0..2); Row 5 = Death(0..6)
    return {
      idle: { row: 0, start: 0, end: 4 },
      walk: { row: 1, start: 0, end: 99 },
      windup: { row: 2, start: 0, end: 2 },
      attack: { row: 2, start: 2, end: 99 },
      special: { row: 3, start: 1, end: 99 },
      hurt: { row: 4, start: 0, end: 99 },
      death: { row: 5, start: 0, end: 99 },
      standingRefRow: 0,
      standingRefEnd: 4,
      scaleAdjust: 0.8,
    };
  }
  if (url.includes('Molten_Golem_Animation_Sprite_Sheet')) {
    // 6 rows: Row 0 = Idle(0..6); Row 1 = Walk(0..7); Row 2 = Attack(0..8); Row 3 = Quake Slam(0..8); Row 4 = Roar(0..6); Row 5 = Hurt(0..2) + Death(2..8)
    return {
      idle: { row: 0, start: 0, end: 6 },
      walk: { row: 1, start: 0, end: 99 },
      windup: { row: 2, start: 0, end: 3 },
      attack: { row: 2, start: 3, end: 99 },
      special: { row: 3, start: 2, end: 99 },
      hurt: { row: 5, start: 0, end: 2 },
      death: { row: 5, start: 2, end: 99 },
      standingRefRow: 0,
      standingRefEnd: 4,
      scaleAdjust: 0.94,
    };
  }
  if (url.includes('Demonic_King_Action_Sprite_Sheet')) {
    // 6 rows: Row 0 = Idle(0..4); Row 1 = Walk(0..7); Row 2 = Attack(0..8); Row 3 = Whirlwind(0..8); Row 4 = Roar(0..5); Row 5 = Hurt(0..2) + Death(2..9)
    return {
      idle: { row: 0, start: 0, end: 4 },
      walk: { row: 1, start: 0, end: 99 },
      windup: { row: 2, start: 0, end: 3 },
      attack: { row: 2, start: 3, end: 99 },
      special: { row: 3, start: 1, end: 99 },
      hurt: { row: 5, start: 0, end: 2 },
      death: { row: 5, start: 2, end: 99 },
      standingRefRow: 0,
      standingRefEnd: 4,
      scaleAdjust: 1.0,
    };
  }
  if (url.includes('Demonic_Ogre_Warrior_Sprite_Sheet')) {
    // 7 rows: Row 0 = Idle; Row 1 = Walk; Row 2 = Smash Attack; Row 3 = 4-Arm Special; Row 4 = Roar; Row 5 = Hurt; Row 6 = Death
    return {
      idle: { row: 0, start: 0, end: 4 },
      walk: { row: 1, start: 0, end: 99 },
      windup: { row: 2, start: 0, end: 3 },
      attack: { row: 2, start: 3, end: 99 },
      special: { row: 3, start: 1, end: 99 },
      hurt: { row: 5, start: 0, end: 99 },
      death: { row: 6, start: 0, end: 99 },
      standingRefRow: 0,
      standingRefEnd: 4,
      scaleAdjust: 0.9,
    };
  }
  if (url.includes('Horned_Warrior_Animation_Sprite_Sheet-3')) {
    // 8 rows (Dundubhi Phase 2): Row 0 = Idle; Row 1 = Walk; Row 2 = Gore Attack; Row 3 = Charge; Row 4 = Quake Slam; Row 5 = Roar; Row 6 = Hurt; Row 7 = Death
    return {
      idle: { row: 0, start: 0, end: 3 },
      walk: { row: 1, start: 0, end: 99 },
      windup: { row: 2, start: 0, end: 3 },
      attack: { row: 2, start: 3, end: 99 },
      special: { row: 4, start: 2, end: 99 },
      hurt: { row: 6, start: 0, end: 99 },
      death: { row: 7, start: 0, end: 99 },
      standingRefRow: 0,
      standingRefEnd: 3,
      scaleAdjust: 0.96,
    };
  }
  if (url.includes('Minotaur_Warrior')) {
    // 7 rows (Dundubhi Phase 1): Row 0 = Idle; Row 1 = Walk; Row 2 = Gore Attack; Row 3 = Charge; Row 4 = Quake Slam; Row 5 = Roar; Row 6 = Hurt(0..2) + Death(2..9)
    return {
      idle: { row: 0, start: 0, end: 3 },
      walk: { row: 1, start: 0, end: 99 },
      windup: { row: 2, start: 0, end: 3 },
      attack: { row: 2, start: 3, end: 99 },
      special: { row: 4, start: 2, end: 99 },
      hurt: { row: 6, start: 0, end: 2 },
      death: { row: 6, start: 2, end: 99 },
      standingRefRow: 0,
      standingRefEnd: 3,
      scaleAdjust: 0.96,
    };
  }

  // Fallback for any other multi-row sheet
  const lastRow = Math.max(0, numRows - 1);
  const atkRow = Math.min(lastRow, 2);
  return {
    idle: { row: 0, start: 0, end: 4 },
    walk: { row: Math.min(lastRow, 1), start: 0, end: 99 },
    windup: { row: atkRow, start: 0, end: 2 },
    attack: { row: atkRow, start: 2, end: 99 },
    special: { row: Math.min(lastRow, 3), start: 0, end: 99 },
    hurt: { row: lastRow, start: 0, end: 2 },
    death: { row: lastRow, start: 2, end: 99 },
    standingRefRow: 0,
    standingRefEnd: 4,
    scaleAdjust: 1.0,
  };
}

/**
 * Selects the exact animation frame from a segmented multi-row green-screen sprite sheet
 * using the verified per-sheet manifest.
 */
export function getMultiRowFrameBounds(
  asset: ProcessedSpriteAsset | undefined | null,
  animState: 'idle' | 'walk' | 'windup' | 'attack' | 'special' | 'hurt' | 'death',
  animTime: number,
  stateProgress: number = 0
): SpriteFrameBounds | null {
  if (!asset) return null;
  const rows = asset.rows;
  if (!rows || rows.length === 0) {
    if (asset.frames.length === 0) return null;
    const idx = Math.floor(Math.abs(animTime * 8)) % asset.frames.length;
    return asset.frames[idx] || asset.frames[0];
  }

  const numRows = rows.length;
  const manifest = getManifestForSheetUrl(asset.url || '', numRows);
  const spec = manifest[animState] || manifest.idle;

  const chosenRow = rows[Math.min(numRows - 1, Math.max(0, spec.row))] || rows[0];
  if (!chosenRow || chosenRow.length === 0) {
    return asset.frames[0] || null;
  }

  const sliceStart = Math.min(spec.start, Math.max(0, chosenRow.length - 1));
  const sliceEnd = Math.min(chosenRow.length, Math.max(sliceStart + 1, spec.end));
  const activeFrames = chosenRow.slice(sliceStart, sliceEnd);
  if (activeFrames.length === 0) {
    return chosenRow[0] || asset.frames[0] || null;
  }

  if (
    animState === 'windup' ||
    animState === 'attack' ||
    animState === 'special' ||
    animState === 'death'
  ) {
    const clampedProg = Math.max(0, Math.min(0.999, stateProgress));
    const idx = Math.min(
      activeFrames.length - 1,
      Math.max(0, Math.floor(clampedProg * activeFrames.length))
    );
    return activeFrames[idx];
  }

  if (animState === 'hurt') {
    const idx = Math.min(
      activeFrames.length - 1,
      Math.floor(Math.abs(animTime * 6.0)) % activeFrames.length
    );
    return activeFrames[idx] || activeFrames[0];
  }

  // Ping-pong idle animation for natural breathing
  if (animState === 'idle' && activeFrames.length >= 3) {
    const cycleLen = activeFrames.length * 2 - 2;
    const rawStep = Math.floor(Math.abs(animTime * 5.0)) % cycleLen;
    const idx = rawStep < activeFrames.length ? rawStep : cycleLen - rawStep;
    return activeFrames[idx] || activeFrames[0];
  }

  // Smooth 10.5fps walk cycle
  const walkFps = 10.5;
  const idx = Math.floor(Math.abs(animTime * walkFps)) % activeFrames.length;
  return activeFrames[idx] || activeFrames[0];
}

export function getProcessedSpriteSync(url: string): ProcessedSpriteAsset | undefined {
  const cached = processedCache.get(url);
  if (cached) return cached;
  if (url && !loadingPromises.has(url) && typeof window !== 'undefined') {
    const isMultiRow = isMultiRowSpriteUrl(url);
    const is2x2 =
      !isMultiRow &&
      (url.includes('2x2') ||
        url.includes('avatar') ||
        KNOWN_2X2_UUIDS.some((token) => url.includes(token)));
    const is4x1 =
      !isMultiRow &&
      !is2x2 &&
      (url.includes('4x1') ||
        url.includes('enemy') ||
        url.includes('brazier') ||
        KNOWN_4X1_UUIDS.some((token) => url.includes(token)));
    const isVfx =
      url.includes('CB33122A-A9C1-4A00-8F0C-6B65EE5BF3AE') ||
      url.includes('vfx') ||
      url.includes('decal') ||
      url.includes('impact') ||
      url.includes('slash') ||
      url.includes('arrow') ||
      url.includes('kwhb8q') ||
      url.includes('o86abr') ||
      url.includes('2n0p17') ||
      url.includes('vqynau') ||
      url.includes('smm68f') ||
      url.includes('96efot') ||
      url.includes('42ht5k') ||
      url.includes('a51igx');
    loadAndProcessSprite(url, {
      removeBlackBg: true,
      stripCornerWatermark: !isMultiRow,
      frameCount: isMultiRow ? 16 : is2x2 || is4x1 ? 4 : url.includes('2x1') || url.includes('gcf89k') ? 2 : 1,
      mode: isVfx ? 'vfx' : 'character',
      gridLayout: isMultiRow ? 'multirow' : is2x2 ? '2x2' : '1xN',
    });
  }
  return undefined;
}

const MAX_SPRITE_SHEET_DIM = 1024;
const MAX_MULTIROW_SHEET_DIM = 1088;

export function loadAndProcessSprite(
  url: string,
  options: {
    removeBlackBg?: boolean;
    stripCornerWatermark?: boolean;
    frameCount?: number;
    mode?: 'character' | 'vfx' | 'prop';
    gridLayout?: '1xN' | '2x2' | 'multirow';
  } = {
    removeBlackBg: true,
    stripCornerWatermark: true,
    frameCount: 4,
    mode: 'character',
    gridLayout: '1xN',
  },
  retryCount: number = 0
): Promise<ProcessedSpriteAsset | null> {
  const isMultiRow = options.gridLayout === 'multirow' || isMultiRowSpriteUrl(url);
  const reqFrames = Math.max(1, options.frameCount ?? 1);
  if (processedCache.has(url)) {
    const existing = processedCache.get(url)!;
    if (isMultiRow ? Boolean(existing.rows && existing.rows.length > 0) : existing.frames.length >= reqFrames) {
      return Promise.resolve(existing);
    }
    processedCache.delete(url);
  }
  if (loadingPromises.has(url)) {
    return loadingPromises.get(url)!;
  }

  const promise = new Promise<ProcessedSpriteAsset | null>((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    if (/^https?:\/\//i.test(url)) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      try {
        const rawW = img.naturalWidth || img.width;
        const rawH = img.naturalHeight || img.height;
        if (rawW <= 0 || rawH <= 0) {
          loadingPromises.delete(url);
          resolve(null);
          return;
        }
        const expectedFrames = Math.max(1, options.frameCount ?? 1);
        const is2x2Grid = options.gridLayout === '2x2';
        const maxDim = isMultiRow
          ? MAX_MULTIROW_SHEET_DIM
          : expectedFrames === 1 && !is2x2Grid
            ? 256
            : MAX_SPRITE_SHEET_DIM;
        const scale = Math.min(1, maxDim / Math.max(rawW, rawH));
        const w = Math.max(16, Math.round(rawW * scale));
        const h = Math.max(16, Math.round(rawH * scale));

        const cleanCanvas = document.createElement('canvas');
        cleanCanvas.width = w;
        cleanCanvas.height = h;
        const ctx = cleanCanvas.getContext('2d', { willReadFrequently: true });

        const flashCanvas = document.createElement('canvas');
        flashCanvas.width = w;
        flashCanvas.height = h;
        const flashCtx = flashCanvas.getContext('2d');

        if (!ctx || !flashCtx) {
          loadingPromises.delete(url);
          resolve(null);
          return;
        }

        // Disable bilinear smoothing when drawing green-screen sheets so #00FF00 background never bleeds into dark outlines or row gaps
        if (isMultiRow) {
          ctx.imageSmoothingEnabled = false;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        const flashImgData = flashCtx.createImageData(w, h);
        const fData = flashImgData.data;

        const totalPixels = w * h;
        const bgMask = new Uint8Array(totalPixels);
        const colOpaqueCount = new Int32Array(w);
        const rowOpaqueCount = new Int32Array(h);

        // FAST PATH FOR MULTI-ROW GREEN-SCREEN SPRITE SHEETS:
        // Preserves 100% original crisp black ink outlines & warm bronze/gold colors with smooth alpha edge anti-aliasing
        if (isMultiRow) {
          // 1. Chroma-key green background (#00FF00) + smooth anti-aliased edge despill
          for (let p = 0; p < totalPixels; p++) {
            const idx = p * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];
            const maxRB = r > b ? r : b;
            const greenExcess = g - maxRB;

            if (
              a < 24 ||
              (g > 100 && greenExcess > 28 && maxRB < 175) ||
              (g > 160 && greenExcess > 20)
            ) {
              bgMask[p] = 1;
              data[idx + 3] = 0;
            } else if (greenExcess > 8) {
              data[idx + 1] = maxRB;
              const edgeAlpha =
                greenExcess > 20
                  ? Math.max(0, Math.min(255, Math.round(255 * (1 - (greenExcess - 20) / 18))))
                  : 255;
              if (edgeAlpha < 48) {
                bgMask[p] = 1;
                data[idx + 3] = 0;
              } else {
                data[idx + 3] = edgeAlpha;
              }
            } else {
              data[idx + 3] = 255;
            }
          }

          // 2. Strip only true full-width horizontal grid lines (>92% of width non-background) and accumulate row/col histograms
          for (let y = 0; y < h; y++) {
            const rowOff = y * w;
            let rowNonBg = 0;
            for (let x = 0; x < w; x++) {
              if (bgMask[rowOff + x] === 0) {
                rowNonBg++;
              }
            }
            if (rowNonBg > w * 0.92) {
              for (let x = 0; x < w; x++) {
                const p = rowOff + x;
                bgMask[p] = 1;
                data[p * 4 + 3] = 0;
              }
            } else {
              rowOpaqueCount[y] = rowNonBg;
              for (let x = 0; x < w; x++) {
                const p = rowOff + x;
                if (bgMask[p] === 0) {
                  const idx = p * 4;
                  const a = data[idx + 3];
                  if (a > 64) {
                    colOpaqueCount[x]++;
                  }
                  fData[idx] = 255;
                  fData[idx + 1] = 242;
                  fData[idx + 2] = 205;
                  fData[idx + 3] = a;
                }
              }
            }
          }

          ctx.putImageData(imgData, 0, 0);
          flashCtx.putImageData(flashImgData, 0, 0);

          // 3. Segment horizontal animation rows
          const rawBands: Array<[number, number]> = [];
          let inBand = false;
          let bandStart = 0;
          const minBandHeight = Math.max(12, Math.round(h * 0.04));
          for (let y = 0; y < h; y++) {
            if (rowOpaqueCount[y] > 2) {
              if (!inBand) {
                inBand = true;
                bandStart = y;
              }
            } else if (inBand) {
              inBand = false;
              if (y - bandStart >= minBandHeight) {
                rawBands.push([bandStart, y]);
              }
            }
          }
          if (inBand && h - bandStart >= minBandHeight) {
            rawBands.push([bandStart, h]);
          }

          // Only merge adjacent vertical bands if one of them is a thin fragment (< 4.5% of sheet height)
          const minSeparateBandH = Math.round(h * 0.045);
          const rowBands: Array<[number, number]> = [];
          for (const band of rawBands) {
            const prev = rowBands[rowBands.length - 1];
            if (
              prev &&
              band[0] - prev[1] < 3 &&
              (band[1] - band[0] < minSeparateBandH || prev[1] - prev[0] < minSeparateBandH)
            ) {
              prev[1] = band[1];
            } else {
              rowBands.push([...band]);
            }
          }

          // Split any merged vertical band if two rows touched vertically (e.g. Horned Warrior-3)
          if (rowBands.length >= 2) {
            const sortedBandH = rowBands.map((b) => b[1] - b[0]).sort((a, b) => a - b);
            const medBandH = sortedBandH[Math.floor(sortedBandH.length * 0.25)];
            const refinedBands: Array<[number, number]> = [];
            for (const [by0, by1] of rowBands) {
              const bh = by1 - by0;
              if (bh > medBandH * 1.55 && medBandH >= 18) {
                const subRows = Math.min(4, Math.max(2, Math.round(bh / medBandH)));
                let prevY = by0;
                for (let r = 1; r < subRows; r++) {
                  const nomY = Math.round(by0 + (r * bh) / subRows);
                  const radY = Math.max(5, Math.round(medBandH * 0.25));
                  let bestY = nomY;
                  let bestRowDensity = Number.MAX_SAFE_INTEGER;
                  for (
                    let sy = Math.max(prevY + 14, nomY - radY);
                    sy <= Math.min(by1 - 14, nomY + radY);
                    sy++
                  ) {
                    const d =
                      rowOpaqueCount[sy - 1] + rowOpaqueCount[sy] * 2 + rowOpaqueCount[sy + 1];
                    if (d < bestRowDensity) {
                      bestRowDensity = d;
                      bestY = sy;
                    }
                  }
                  refinedBands.push([prevY, bestY]);
                  prevY = bestY;
                }
                refinedBands.push([prevY, by1]);
              } else {
                refinedBands.push([by0, by1]);
              }
            }
            rowBands.length = 0;
            rowBands.push(...refinedBands);
          }

          // Helper to extract a frame inside [xStart, xEnd] x [yStart, yEnd]
          const extractRawFrame = (
            xStart: number,
            xEnd: number,
            yStart: number,
            yEnd: number
          ): { sx: number; sy: number; sw: number; sh: number; maxY: number } | null => {
            let minX = xEnd;
            let maxX = xStart;
            let minY = yEnd;
            let maxY = yStart;
            let found = false;

            for (let y = yStart; y < yEnd; y++) {
              const rowOff = y * w;
              for (let x = xStart; x < xEnd; x++) {
                if (bgMask[rowOff + x] === 0 && data[(rowOff + x) * 4 + 3] > 64) {
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                  found = true;
                }
              }
            }
            if (!found || maxX - minX < 8 || maxY - minY < 10) return null;
            const pad = 2;
            const sx = Math.max(xStart, minX - pad);
            const sy = Math.max(yStart, minY - pad);
            const sw = Math.min(xEnd - sx, maxX - minX + 1 + pad * 2);
            const sh = Math.min(yEnd - sy, maxY - minY + 1 + pad * 2);
            return { sx, sy, sw, sh, maxY };
          };

          const segmentedRows: SpriteFrameBounds[][] = [];
          const frames: SpriteFrameBounds[] = [];

          for (const [ry0, ry1] of rowBands) {
            const rowH = ry1 - ry0;
            if (rowH < 14) continue;

            const colCount = new Int32Array(w);
            for (let y = ry0; y < ry1; y++) {
              const rOff = y * w;
              for (let x = 0; x < w; x++) {
                if (bgMask[rOff + x] === 0) {
                  colCount[x]++;
                }
              }
            }

            const minRawSpanW = Math.max(4, Math.round(rowH * 0.05));
            const rawCols: Array<[number, number]> = [];
            let inCol = false;
            let colStart = 0;
            for (let x = 0; x < w; x++) {
              if (colCount[x] > 1) {
                if (!inCol) {
                  inCol = true;
                  colStart = x;
                }
              } else if (inCol) {
                inCol = false;
                if (x - colStart >= minRawSpanW) {
                  rawCols.push([colStart, x]);
                }
              }
            }
            if (inCol && w - colStart >= minRawSpanW) {
              rawCols.push([colStart, w]);
            }

            // Merge only small detached weapon/shield/spark fragments (< 38% of rowH) into their adjacent character pose
            const smallFragW = Math.round(rowH * 0.38);
            const maxMergeGap = Math.round(rowH * 0.18);
            const minValidPoseW = Math.round(rowH * 0.22);
            const mergedCols: Array<[number, number]> = [];
            for (const col of rawCols) {
              const cw = col[1] - col[0];
              if (mergedCols.length > 0) {
                const prev = mergedCols[mergedCols.length - 1];
                const prevW = prev[1] - prev[0];
                const gap = col[0] - prev[1];
                if (gap <= maxMergeGap && (cw < smallFragW || prevW < smallFragW)) {
                  prev[1] = col[1];
                  continue;
                }
              }
              if (cw >= minValidPoseW) {
                mergedCols.push([...col]);
              }
            }

            // Only split a column if two full characters touched tip-to-toe (spanW > 1.95x median pose width AND a deep valley exists)
            const widths = mergedCols.map((c) => c[1] - c[0]).sort((a, b) => a - b);
            const medW =
              widths.length > 0
                ? widths[Math.floor(widths.length * 0.45)]
                : Math.round(rowH * 0.85);
            const minSubPoseW = Math.max(Math.round(rowH * 0.55), Math.round(medW * 0.78));
            const splitTriggerW = Math.max(Math.round(rowH * 1.85), Math.round(medW * 1.95));

            const rawRowFrames: Array<{
              sx: number;
              sy: number;
              sw: number;
              sh: number;
              maxY: number;
            }> = [];

            for (const [cx0, cx1] of mergedCols) {
              const spanW = cx1 - cx0;
              if (spanW > splitTriggerW) {
                const subCount = Math.min(
                  4,
                  Math.max(2, Math.round(spanW / Math.max(rowH * 0.85, medW * 1.15)))
                );
                let prevX = cx0;
                for (let k = 1; k < subCount; k++) {
                  const nomX = Math.round(cx0 + (k * spanW) / subCount);
                  const rad = Math.max(8, Math.round(spanW / (subCount * 2.8)));
                  let bestX = nomX;
                  let bestVal = Number.MAX_SAFE_INTEGER;
                  for (
                    let sx = Math.max(prevX + minSubPoseW, nomX - rad);
                    sx <= Math.min(cx1 - minSubPoseW, nomX + rad);
                    sx++
                  ) {
                    const v =
                      colCount[Math.max(0, sx - 1)] +
                      colCount[sx] * 2 +
                      colCount[Math.min(w - 1, sx + 1)];
                    if (v < bestVal) {
                      bestVal = v;
                      bestX = sx;
                    }
                  }
                  if (
                    bestVal <= Math.round(rowH * 0.16) &&
                    bestX - prevX >= minSubPoseW &&
                    cx1 - bestX >= minSubPoseW
                  ) {
                    const rf = extractRawFrame(prevX, bestX, ry0, ry1);
                    if (rf) rawRowFrames.push(rf);
                    prevX = bestX;
                  }
                }
                const lastRf = extractRawFrame(prevX, cx1, ry0, ry1);
                if (lastRf) rawRowFrames.push(lastRf);
              } else {
                const rf = extractRawFrame(cx0, cx1, ry0, ry1);
                if (rf) rawRowFrames.push(rf);
              }
            }

            if (rawRowFrames.length >= 2) {
              // Compute unified foot ground baseline for this entire animation row
              const sortedMaxY = rawRowFrames.map((f) => f.maxY).sort((a, b) => a - b);
              const rowGroundY = sortedMaxY[Math.floor(sortedMaxY.length * 0.75)];

              // Compute 4th-power column-density horizontal torso/pelvis center-of-mass (anchorX)
              const rowFrames: SpriteFrameBounds[] = rawRowFrames.map((rf) => {
                const bandY0 = Math.max(rf.sy, Math.floor(rf.sy + rf.sh * 0.22));
                const bandY1 = Math.min(rf.sy + rf.sh, Math.ceil(rf.sy + rf.sh * 0.92));
                let weightedXSum = 0;
                let weightTotal = 0;

                for (let x = rf.sx; x < rf.sx + rf.sw; x++) {
                  let colBodyPixels = 0;
                  for (let y = bandY0; y < bandY1; y++) {
                    if (bgMask[y * w + x] === 0) {
                      colBodyPixels++;
                    }
                  }
                  if (colBodyPixels > 0) {
                    const w2 = colBodyPixels * colBodyPixels;
                    const weight = w2 * w2;
                    weightedXSum += (x - rf.sx) * weight;
                    weightTotal += weight;
                  }
                }

                const anchorX =
                  weightTotal > 0
                    ? Math.max(rf.sw * 0.2, Math.min(rf.sw * 0.8, weightedXSum / weightTotal))
                    : rf.sw * 0.5;

                const effectiveGroundY =
                  Math.abs(rf.maxY - rowGroundY) <= 8 ? rowGroundY : rf.maxY;
                const groundOffsetY = Math.max(rf.sh * 0.75, effectiveGroundY - rf.sy);

                return {
                  sx: rf.sx,
                  sy: rf.sy,
                  sw: rf.sw,
                  sh: rf.sh,
                  anchorX,
                  groundOffsetY,
                };
              });

              segmentedRows.push(rowFrames);
              for (const f of rowFrames) {
                frames.push(f);
              }
            }
          }

          if (frames.length === 0) {
            frames.push({ sx: 0, sy: 0, sw: w, sh: h, anchorX: w * 0.5, groundOffsetY: h });
          }

          // Compute constant standing reference height from the character's Idle row, calibrated by scaleAdjust
          const manifest = getManifestForSheetUrl(url, segmentedRows.length);
          const refRow =
            segmentedRows[Math.min(segmentedRows.length - 1, manifest.standingRefRow)] ||
            segmentedRows[0] ||
            frames;
          const refSlice = refRow.slice(0, Math.max(1, manifest.standingRefEnd));
          const sortedRefH = refSlice
            .map((f) => f.groundOffsetY || f.sh)
            .sort((a, b) => a - b);
          const rawRefHeight =
            sortedRefH.length > 0
              ? sortedRefH[Math.floor(sortedRefH.length * 0.5)]
              : frames[0]?.sh || h;
          const baseFrameHeight = Math.max(16, Math.round(rawRefHeight / (manifest.scaleAdjust || 1)));

          const result: ProcessedSpriteAsset = {
            url,
            cleanCanvas,
            flashCanvas,
            goldCanvas: flashCanvas,
            jadeCanvas: cleanCanvas,
            width: w,
            height: h,
            frames,
            rows: segmentedRows,
            baseFrameHeight,
          };
          processedCache.set(url, result);
          loadingPromises.delete(url);
          resolve(result);
          return;
        }

        // STANDARD PATH FOR 1xN / 2x2 / PROP / VFX SPRITES
        const goldCanvas = document.createElement('canvas');
        goldCanvas.width = w;
        goldCanvas.height = h;
        const goldCtx = goldCanvas.getContext('2d');

        const jadeCanvas = document.createElement('canvas');
        jadeCanvas.width = w;
        jadeCanvas.height = h;
        const jadeCtx = jadeCanvas.getContext('2d');

        if (!goldCtx || !jadeCtx) {
          loadingPromises.delete(url);
          resolve(null);
          return;
        }

        const goldImgData = goldCtx.createImageData(w, h);
        const gData = goldImgData.data;

        const jadeImgData = jadeCtx.createImageData(w, h);
        const jData = jadeImgData.data;

        const removeBlack = options.removeBlackBg !== false;
        const stripCorner = options.stripCornerWatermark !== false;
        const isVfxMode = options.mode === 'vfx';
        const isPropMode = options.mode === 'prop';

        if (removeBlack && !isVfxMode) {
          const cornerSamples: Array<[number, number]> = [
            [2, 2],
            [w - 3, 2],
            [2, h - 3],
            [w - 3, h - 3],
            [Math.floor(w * 0.5), 2],
            [2, Math.floor(h * 0.5)],
            [w - 3, Math.floor(h * 0.5)],
          ];

          let lightCornerCount = 0;
          let darkCornerCount = 0;
          let magentaCornerCount = 0;
          let sumR = 0;
          let sumG = 0;
          let sumB = 0;
          let sampleCount = 0;

          for (const [cx, cy] of cornerSamples) {
            if (cx >= 0 && cx < w && cy >= 0 && cy < h) {
              const cIdx = (cy * w + cx) * 4;
              const r = data[cIdx];
              const g = data[cIdx + 1];
              const b = data[cIdx + 2];
              const luma = 0.299 * r + 0.587 * g + 0.114 * b;
              if (r > 175 && b > 165 && g < 110 && r - g > 80 && b - g > 70) {
                magentaCornerCount++;
                sumR += r;
                sumG += g;
                sumB += b;
                sampleCount++;
              } else if (luma > 210) {
                lightCornerCount++;
                sumR += r;
                sumG += g;
                sumB += b;
                sampleCount++;
              } else if (Math.max(r, g, b) < 48) {
                darkCornerCount++;
                sumR += r;
                sumG += g;
                sumB += b;
                sampleCount++;
              }
            }
          }

          const isMagentaBg =
            magentaCornerCount >= 2 &&
            magentaCornerCount >= lightCornerCount &&
            magentaCornerCount >= darkCornerCount;
          const isLightBg =
            !isMagentaBg && lightCornerCount >= darkCornerCount && lightCornerCount > 0;
          let bgR = isMagentaBg ? 255 : isLightBg ? 255 : 6;
          let bgG = isMagentaBg ? 0 : isLightBg ? 255 : 6;
          let bgB = isMagentaBg ? 255 : isLightBg ? 255 : 8;
          if (sampleCount > 0) {
            bgR = sumR / sampleCount;
            bgG = sumG / sampleCount;
            bgB = sumB / sampleCount;
          }

          const isExteriorBgCandidate = (pIdx: number): boolean => {
            const idx = pIdx * 4;
            const a = data[idx + 3];
            if (a < 20) return true;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const sat = maxC - minC;
            const luma = 0.299 * r + 0.587 * g + 0.114 * b;
            const colorDist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);

            if (isMagentaBg) {
              return (
                (r > 150 && b > 140 && g < 120 && r - g > 65 && b - g > 55) ||
                colorDist < 85
              );
            }
            if (isLightBg) {
              if (isPropMode) {
                return (minC >= 165 && sat <= 34) || (luma >= 175 && sat <= 36) || (colorDist < 68 && luma > 170);
              }
              return (minC >= 218 && sat <= 24) || (luma >= 224 && sat <= 28) || (colorDist < 42 && luma > 212);
            }
            return (maxC < 46 && luma < 40) || (colorDist < 48 && luma < 42);
          };

          const queue = new Int32Array(totalPixels);
          let qHead = 0;
          let qTail = 0;

          const enqueueIfCandidate = (x: number, y: number, forceWatermark: boolean = false) => {
            const p = y * w + x;
            if (bgMask[p] !== 0) return;
            if (forceWatermark || isExteriorBgCandidate(p)) {
              bgMask[p] = 1;
              queue[qTail++] = p;
            }
          };

          for (let x = 0; x < w; x++) {
            enqueueIfCandidate(x, 0);
            enqueueIfCandidate(x, 1);
            enqueueIfCandidate(x, h - 1);
            enqueueIfCandidate(x, h - 2);
          }
          for (let y = 0; y < h; y++) {
            enqueueIfCandidate(0, y);
            enqueueIfCandidate(1, y);
            enqueueIfCandidate(w - 1, y);
            enqueueIfCandidate(w - 2, y);
          }
          if (is2x2Grid) {
            const midX = Math.floor(w * 0.5);
            const midY = Math.floor(h * 0.5);
            for (let x = 0; x < w; x++) {
              enqueueIfCandidate(x, midY);
            }
            for (let y = 0; y < h; y++) {
              enqueueIfCandidate(midX, y);
            }
          } else if (expectedFrames > 1) {
            for (let k = 1; k < expectedFrames; k++) {
              const seamX = Math.floor((k * w) / expectedFrames);
              for (let y = 0; y < h; y++) {
                enqueueIfCandidate(seamX, y);
                if (seamX > 0) enqueueIfCandidate(seamX - 1, y);
                if (seamX < w - 1) enqueueIfCandidate(seamX + 1, y);
              }
            }
          }
          if (stripCorner) {
            const startX = Math.floor(w * 0.88);
            const startY = Math.floor(h * 0.84);
            for (let y = startY; y < h; y++) {
              for (let x = startX; x < w; x++) {
                enqueueIfCandidate(x, y, true);
              }
            }
          }

          while (qHead < qTail) {
            const curr = queue[qHead++];
            const cx = curr % w;
            const cy = (curr - cx) / w;

            for (let dy = -1; dy <= 1; dy++) {
              const ny = cy + dy;
              if (ny < 0 || ny >= h) continue;
              const rowOff = ny * w;
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = cx + dx;
                if (nx < 0 || nx >= w) continue;
                const np = rowOff + nx;
                if (bgMask[np] === 0 && isExteriorBgCandidate(np)) {
                  bgMask[np] = 1;
                  queue[qTail++] = np;
                }
              }
            }
          }
        }

        for (let y = 0; y < h; y++) {
          const isBottomCornerY = stripCorner && y > h * 0.84;
          const rowOff = y * w;
          for (let x = 0; x < w; x++) {
            const p = rowOff + x;
            const idx = p * 4;
            let r = data[idx];
            let g = data[idx + 1];
            let b = data[idx + 2];
            let a = data[idx + 3];

            if (isBottomCornerY && x > w * 0.88) {
              data[idx + 3] = 0;
              continue;
            }

            const luma = 0.299 * r + 0.587 * g + 0.114 * b;

            if (isVfxMode) {
              const maxChannel = Math.max(r, g, b);
              if (maxChannel < 20 && luma < 16) {
                data[idx + 3] = 0;
                continue;
              } else if (maxChannel < 64) {
                const factor = Math.max(0, Math.min(1, (maxChannel - 16) / 48));
                a = Math.round(a * factor);
                data[idx + 3] = a;
              }
            } else if (removeBlack) {
              if (bgMask[p] === 1) {
                data[idx + 3] = 0;
                continue;
              } else {
                a = 255;
                const sat = Math.max(r, g, b) - Math.min(r, g, b);
                if (isPropMode && luma > 125 && sat < 36) {
                  r = Math.round(r * 0.38 + 24);
                  g = Math.round(g * 0.31 + 17);
                  b = Math.round(b * 0.24 + 12);
                  data[idx] = r;
                  data[idx + 1] = g;
                  data[idx + 2] = b;
                }
                data[idx + 3] = 255;
              }
            }

            if (a > 24) {
              if (bgMask[p] === 0) {
                colOpaqueCount[x]++;
                rowOpaqueCount[y]++;
              }
              const lumNorm = Math.min(1, luma / 220);

              fData[idx] = 255;
              fData[idx + 1] = 248;
              fData[idx + 2] = 225;
              fData[idx + 3] = a;

              gData[idx] = Math.round(215 + lumNorm * 40);
              gData[idx + 1] = Math.round(145 + lumNorm * 85);
              gData[idx + 2] = Math.round(35 + lumNorm * 65);
              gData[idx + 3] = a;

              jData[idx] = Math.round(45 + lumNorm * 110);
              jData[idx + 1] = Math.round(195 + lumNorm * 60);
              jData[idx + 2] = Math.round(180 + lumNorm * 75);
              jData[idx + 3] = a;
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        flashCtx.putImageData(flashImgData, 0, 0);
        goldCtx.putImageData(goldImgData, 0, 0);
        jadeCtx.putImageData(jadeImgData, 0, 0);

        const computeTightBoundsInBox = (
          xStart: number,
          xEnd: number,
          yStart: number,
          yEnd: number
        ): SpriteFrameBounds => {
          let minX = xEnd;
          let maxX = xStart;
          let minY = yEnd;
          let maxY = yStart;
          let found = false;

          const innerMarginX =
            expectedFrames > 1 ? Math.min(6, Math.round((xEnd - xStart) * 0.025)) : 0;
          const scanXStart = xStart + innerMarginX;
          const scanXEnd = Math.max(scanXStart + 1, xEnd - innerMarginX);

          for (let y = yStart; y < yEnd; y++) {
            const rowOffset = y * w;
            for (let x = scanXStart; x < scanXEnd; x++) {
              const alpha = data[(rowOffset + x) * 4 + 3];
              if (alpha > 36) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                found = true;
              }
            }
          }

          if (found && maxX > minX && maxY > minY) {
            const pad = 2;
            const sx = Math.max(xStart, minX - pad);
            const sy = Math.max(yStart, minY - pad);
            const sw = Math.min(xEnd - sx, maxX - minX + 1 + pad * 2);
            const sh = Math.min(yEnd - sy, maxY - minY + 1 + pad * 2);
            return { sx, sy, sw, sh, anchorX: sw * 0.5, groundOffsetY: sh };
          }
          const fallbackSw = Math.max(1, xEnd - xStart);
          const fallbackSh = Math.max(1, yEnd - yStart);
          return {
            sx: xStart,
            sy: yStart,
            sw: fallbackSw,
            sh: fallbackSh,
            anchorX: fallbackSw * 0.5,
            groundOffsetY: fallbackSh,
          };
        };

        const frames: SpriteFrameBounds[] = [];
        if (is2x2Grid) {
          const midX = Math.round(w * 0.5);
          const midY = Math.round(h * 0.5);
          frames.push(computeTightBoundsInBox(0, midX, 0, midY));
          frames.push(computeTightBoundsInBox(midX, w, 0, midY));
          frames.push(computeTightBoundsInBox(0, midX, midY, h));
          frames.push(computeTightBoundsInBox(midX, w, midY, h));
        } else {
          const splits: number[] = [0];
          for (let k = 1; k < expectedFrames; k++) {
            splits.push(Math.round((k * w) / expectedFrames));
          }
          splits.push(w);
          for (let f = 0; f < expectedFrames; f++) {
            frames.push(computeTightBoundsInBox(splits[f], splits[f + 1], 0, h));
          }
        }

        if (frames.length === 0) {
          frames.push({ sx: 0, sy: 0, sw: w, sh: h, anchorX: w * 0.5, groundOffsetY: h });
        }

        const maxSh = frames.reduce((acc, f) => Math.max(acc, f.sh), 0);
        const baseFrameHeight = maxSh > 0 ? maxSh : frames[0]?.sh || h;

        const result: ProcessedSpriteAsset = {
          url,
          cleanCanvas,
          flashCanvas,
          goldCanvas,
          jadeCanvas,
          width: w,
          height: h,
          frames,
          baseFrameHeight,
        };
        processedCache.set(url, result);
        loadingPromises.delete(url);
        resolve(result);
      } catch (err) {
        console.error('SpriteProcessor error:', url, err);
        loadingPromises.delete(url);
        resolve(null);
      }
    };
    img.onerror = () => {
      loadingPromises.delete(url);
      if (retryCount < 3) {
        window.setTimeout(() => {
          loadAndProcessSprite(url, options, retryCount + 1).then(resolve);
        }, 650 * (retryCount + 1));
      } else {
        resolve(null);
      }
    };
    img.src = url;
  });

  loadingPromises.set(url, promise);
  return promise;
}

