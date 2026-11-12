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

export const KNOWN_GREY_GRID_SHEETS: Record<
  string,
  { cols: number; rows: number; scaleAdjust?: number }
> = {
  '4lkbel4lkbel4lkb': { cols: 8, rows: 6, scaleAdjust: 1.04 }, // Hooded Mage
  '4onmdt4onmdt4onm': { cols: 8, rows: 6, scaleAdjust: 1.06 }, // Undead Shield-Swordsman
  '70z55s70z55s70z5': { cols: 8, rows: 6, scaleAdjust: 0.96 }, // Ember-Pillar Abomination
  '7yurbo7yurbo7yur': { cols: 8, rows: 6, scaleAdjust: 1.02 }, // Rakshasa Mace Brute
  '8yp2l78yp2l78yp2': { cols: 8, rows: 6, scaleAdjust: 1.12 }, // Bronze Spearman
  'a1cw1wa1cw1wa1cw': { cols: 8, rows: 6, scaleAdjust: 1.04 }, // Naga Serpent-Blade
  'd57givd57givd57g': { cols: 8, rows: 6, scaleAdjust: 1.05 }, // Feral Ghoul
  'h2s8ngh2s8ngh2s8': { cols: 8, rows: 6, scaleAdjust: 0.98 }, // Minotaur Great-Axe
  'kx4tuckx4tuckx4t': { cols: 8, rows: 6, scaleAdjust: 0.98 }, // Minotaur Brawler
  'oen1iloen1iloen1': { cols: 10, rows: 6, scaleAdjust: 1.08 }, // Undead Longbow Archer
  'ojo449ojo449ojo4': { cols: 8, rows: 6, scaleAdjust: 0.94 }, // Charnel Flesh-Hulk
  'q7gfcrq7gfcrq7gf': { cols: 10, rows: 6, scaleAdjust: 1.04 }, // Temple Warhammer Guardian
  's313yes313yes313': { cols: 8, rows: 6, scaleAdjust: 1.02 }, // Horned Shield Guard
  'wg0e4cwg0e4cwg0e': { cols: 10, rows: 6, scaleAdjust: 1.06 }, // Red-Eyed Crawler Ghoul
};

export function getGreyGridSpecForUrl(
  url: string
): { cols: number; rows: number; scaleAdjust?: number } | null {
  for (const [token, spec] of Object.entries(KNOWN_GREY_GRID_SHEETS)) {
    if (url.includes(token)) return spec;
  }
  return null;
}

export const KNOWN_MULTIROW_UUIDS = [
  ...Object.keys(KNOWN_GREY_GRID_SHEETS),
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
 * Exact Per-Sheet Animation Row & Frame Manifest verified against all uploaded sprite sheets.
 * Windup (anticipation) and Attack (strike + follow-through) use non-overlapping monotonic frame ranges
 * so windup -> attack plays smoothly forward without jumping backward.
 */
function getManifestForSheetUrl(url: string, numRows: number): SheetAnimManifest {
  const greySpec = getGreyGridSpecForUrl(url);
  if (greySpec) {
    const lastR = Math.max(0, numRows - 1);
    const hurtR = numRows >= 5 ? numRows - 2 : lastR;
    return {
      idle: { row: 0, start: 0, end: Math.min(6, greySpec.cols) },
      walk: { row: Math.min(lastR, 1), start: 0, end: 99 },
      windup: { row: Math.min(lastR, 2), start: 0, end: 3 },
      attack: { row: Math.min(lastR, 2), start: 2, end: 99 },
      special: { row: Math.min(lastR, 3), start: 1, end: 99 },
      hurt: { row: hurtR, start: 0, end: numRows >= 5 ? 4 : 2 },
      death: { row: lastR, start: numRows >= 5 ? 0 : 2, end: 99 },
      standingRefRow: 0,
      standingRefEnd: 4,
      scaleAdjust: greySpec.scaleAdjust ?? 1.04,
    };
  }
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
    const isVfxFlipbook4x2 =
      url.includes('94a7b372') ||
      url.includes('641e6edf') ||
      url.includes('a192f958') ||
      url.includes('5e38a9cc') ||
      url.includes('c9aef3c4') ||
      url.includes('557d80c2') ||
      url.includes('d902fbcf') ||
      url.includes('319410b6') ||
      url.includes('9bf5a8bb') ||
      url.includes('2c297451') ||
      url.includes('a0db012d') ||
      url.includes('a2584071') ||
      url.includes('6d72d5b4');
    const isVfxFlipbook1x6 = url.includes('045bab37');
    const isVfxFlipbook1x8 =
      url.includes('5833cc93') ||
      url.includes('ckan5e') ||
      url.includes('g4k6rg') ||
      url.includes('1934edb4') ||
      url.includes('55b33a2e') ||
      url.includes('05d4d912') ||
      url.includes('ba35aea3') ||
      url.includes('0382a20d') ||
      url.includes('b41bc40f') ||
      url.includes('c25414cb');
    const isVfx =
      isVfxFlipbook4x2 ||
      isVfxFlipbook1x6 ||
      isVfxFlipbook1x8 ||
      url.includes('/assets/vfx/') ||
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
      frameCount: isMultiRow
        ? 16
        : isVfxFlipbook4x2 || isVfxFlipbook1x8
        ? 8
        : isVfxFlipbook1x6
        ? 6
        : is2x2 || is4x1
        ? 4
        : url.includes('2x1') || url.includes('gcf89k')
        ? 2
        : 1,
      mode: isVfx ? 'vfx' : 'character',
      gridLayout: isMultiRow ? 'multirow' : isVfxFlipbook4x2 ? '4x2' : is2x2 ? '2x2' : '1xN',
    });
  }
  return undefined;
}

const MAX_SPRITE_SHEET_DIM = 768;
const MAX_MULTIROW_SHEET_DIM = 1024;

export function loadAndProcessSprite(
  url: string,
  options: {
    removeBlackBg?: boolean;
    stripCornerWatermark?: boolean;
    frameCount?: number;
    mode?: 'character' | 'vfx' | 'prop';
    gridLayout?: '1xN' | '2x2' | '4x2' | 'multirow';
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
        const is4x2Grid = options.gridLayout === '4x2';
        const maxDim = isMultiRow
          ? MAX_MULTIROW_SHEET_DIM
          : expectedFrames === 1 && !is2x2Grid && !is4x2Grid
            ? 512
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

        const greySpec = getGreyGridSpecForUrl(url);
        // Disable bilinear smoothing only on raw #00FF00 green-screen sheets; use high-quality smoothing on HD grey-grid sheets
        if (isMultiRow && !greySpec) {
          ctx.imageSmoothingEnabled = false;
        } else {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
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

        // FAST PATH FOR MULTI-ROW SPRITE SHEETS (14 Isometric Grey-Grid Sheets + Green-Screen Boss/Enemy Sheets):
        if (isMultiRow) {
          // Helper: Repack each frame into a clean non-overlapping atlas cell while keeping ALL body parts,
          // weapons, heads, and legs intact (only discarding tiny exterior border scraps),
          // and bake HD brightness lift + Hades 2px dark-ink outer contours + luminous golden-amber rim highlights!
          const finalizeCharacterSheetInkAndFrames = (
            segmentedRows: SpriteFrameBounds[][],
            frames: SpriteFrameBounds[]
          ) => {
            const pad = 5; // 5px transparent margin on all 4 sides of every repacked frame for 2px Hades ink contour + outer glow
            const cellGap = 6;

            interface ExtractedFrameData {
              frameRef: SpriteFrameBounds;
              trimmedW: number;
              trimmedH: number;
              pixels: Uint8ClampedArray;
              mask: Uint8Array;
              anchorX: number;
              groundOffsetY: number;
            }

            const extractedRows: ExtractedFrameData[][] = [];
            let maxRowPixelW = w;
            let totalPackedH = 16;

            const compIdMap = new Int32Array(totalPixels);
            const compQueue = new Int32Array(totalPixels);
            let currentCompStamp = 1;

            for (const row of segmentedRows) {
              const rowExtracted: ExtractedFrameData[] = [];
              let rowW = 8;
              let rowMaxH = 0;

              for (const f of row) {
                const x0 = Math.max(0, f.sx);
                const y0 = Math.max(0, f.sy);
                const x1 = Math.min(w, f.sx + f.sw);
                const y1 = Math.min(h, f.sy + f.sh);
                const fw = x1 - x0;
                const fh = y1 - y0;
                if (fw < 8 || fh < 8) continue;

                const coreX0 = x0 + Math.round(fw * 0.14);
                const coreX1 = x0 + Math.round(fw * 0.86);
                const coreY0 = y0 + Math.round(fh * 0.08);
                const coreY1 = y0 + Math.round(fh * 0.94);

                const comps: Array<{
                  id: number;
                  pixels: number[];
                  touchesCore: boolean;
                  touchesBorder: boolean;
                  score: number;
                }> = [];

                const frameStartStamp = currentCompStamp;

                for (let y = y0; y < y1; y++) {
                  const rOff = y * w;
                  for (let x = x0; x < x1; x++) {
                    const startP = rOff + x;
                    if (bgMask[startP] !== 0 || data[startP * 4 + 3] <= 42) continue;
                    if (compIdMap[startP] >= frameStartStamp) continue;

                    const cid = currentCompStamp++;
                    let qH = 0;
                    let qT = 0;
                    compIdMap[startP] = cid;
                    compQueue[qT++] = startP;
                    let touchesCore = false;
                    let touchesBorder = false;
                    let corePixels = 0;

                    while (qH < qT) {
                      const cp = compQueue[qH++];
                      const cx = cp % w;
                      const cy = (cp - cx) / w;
                      if (cx >= coreX0 && cx <= coreX1 && cy >= coreY0 && cy <= coreY1) {
                        touchesCore = true;
                        corePixels++;
                      }
                      if (cx <= x0 + 1 || cx >= x1 - 2 || cy <= y0 + 1 || cy >= y1 - 2) {
                        touchesBorder = true;
                      }
                      // 3px neighborhood bridge keeps slightly detached limbs, hooves, horns, and weapon tips united
                      for (let dy = -2; dy <= 2; dy++) {
                        const ny = cy + dy;
                        if (ny < y0 || ny >= y1) continue;
                        const nOff = ny * w;
                        for (let dx = -2; dx <= 2; dx++) {
                          if (dx === 0 && dy === 0) continue;
                          const nx = cx + dx;
                          if (nx < x0 || nx >= x1) continue;
                          const np = nOff + nx;
                          if (
                            bgMask[np] === 0 &&
                            data[np * 4 + 3] > 42 &&
                            compIdMap[np] < frameStartStamp
                          ) {
                            compIdMap[np] = cid;
                            compQueue[qT++] = np;
                          }
                        }
                      }
                    }

                    const pxList: number[] = new Array(qT);
                    for (let i = 0; i < qT; i++) pxList[i] = compQueue[i];
                    const score = qT + corePixels * 3.0 - (touchesBorder && !touchesCore ? qT * 0.85 : 0);
                    comps.push({
                      id: cid,
                      pixels: pxList,
                      touchesCore,
                      touchesBorder,
                      score,
                    });
                  }
                }

                if (comps.length === 0) continue;
                comps.sort((a, b) => b.score - a.score);
                const mainComp = comps[0];
                const validPixels = new Set<number>(mainComp.pixels);

                // Keep ALL character components (legs, heads, floating weapons, shields) unless they are tiny border noise
                for (let ci = 1; ci < comps.length; ci++) {
                  const c = comps[ci];
                  const isTinyBorderScrap = !c.touchesCore && c.touchesBorder && c.pixels.length < 110;
                  if (!isTinyBorderScrap && c.pixels.length >= 10) {
                    for (const p of c.pixels) validPixels.add(p);
                  }
                }

                let minX = x1;
                let maxX = x0;
                let minY = y1;
                let maxY = y0;
                validPixels.forEach((p) => {
                  const px = p % w;
                  const py = (p - px) / w;
                  if (px < minX) minX = px;
                  if (px > maxX) maxX = px;
                  if (py < minY) minY = py;
                  if (py > maxY) maxY = py;
                });

                if (maxX <= minX || maxY <= minY) continue;

                const cellW = maxX - minX + 1 + pad * 2;
                const cellH = maxY - minY + 1 + pad * 2;
                const cellPixels = new Uint8ClampedArray(cellW * cellH * 4);
                const cellMask = new Uint8Array(cellW * cellH); // 1 = foreground character, 0 = background

                validPixels.forEach((p) => {
                  const px = p % w;
                  const py = (p - px) / w;
                  const lx = px - minX + pad;
                  const ly = py - minY + pad;
                  const lIdx = ly * cellW + lx;
                  cellMask[lIdx] = 1;

                  const sIdx = p * 4;
                  const dIdx = lIdx * 4;
                  cellPixels[dIdx] = data[sIdx];
                  cellPixels[dIdx + 1] = data[sIdx + 1];
                  cellPixels[dIdx + 2] = data[sIdx + 2];
                  cellPixels[dIdx + 3] = 255;
                });

                // Close 1px interior pinholes inside the character mask so no stray interior dots occur
                for (let ly = 1; ly < cellH - 1; ly++) {
                  const rOff = ly * cellW;
                  for (let lx = 1; lx < cellW - 1; lx++) {
                    const lp = rOff + lx;
                    if (cellMask[lp] === 0) {
                      const nCount =
                        cellMask[lp - 1] +
                        cellMask[lp + 1] +
                        cellMask[lp - cellW] +
                        cellMask[lp + cellW];
                      if (nCount >= 3) {
                        cellMask[lp] = 1;
                        const dIdx = lp * 4;
                        const nbIdx = (lp - 1) * 4;
                        cellPixels[dIdx] = cellPixels[nbIdx];
                        cellPixels[dIdx + 1] = cellPixels[nbIdx + 1];
                        cellPixels[dIdx + 2] = cellPixels[nbIdx + 2];
                        cellPixels[dIdx + 3] = 255;
                      }
                    }
                  }
                }

                // Bake 2px deep comic-ink outer contour (#09050c) + 1px warm ember outer visibility aura
                for (let ly = 2; ly < cellH - 2; ly++) {
                  const rOff = ly * cellW;
                  for (let lx = 2; lx < cellW - 2; lx++) {
                    const lp = rOff + lx;
                    if (cellMask[lp] === 1) continue;
                    const n1 =
                      cellMask[lp - 1] === 1 ||
                      cellMask[lp + 1] === 1 ||
                      cellMask[lp - cellW] === 1 ||
                      cellMask[lp + cellW] === 1 ||
                      cellMask[lp - cellW - 1] === 1 ||
                      cellMask[lp - cellW + 1] === 1 ||
                      cellMask[lp + cellW - 1] === 1 ||
                      cellMask[lp + cellW + 1] === 1;
                    if (n1) {
                      const dIdx = lp * 4;
                      cellPixels[dIdx] = 10;
                      cellPixels[dIdx + 1] = 6;
                      cellPixels[dIdx + 2] = 12;
                      cellPixels[dIdx + 3] = 255;
                      continue;
                    }
                    const n2 =
                      cellMask[lp - 2] === 1 ||
                      cellMask[lp + 2] === 1 ||
                      cellMask[lp - cellW * 2] === 1 ||
                      cellMask[lp + cellW * 2] === 1;
                    if (n2) {
                      const dIdx = lp * 4;
                      cellPixels[dIdx] = 28;
                      cellPixels[dIdx + 1] = 16;
                      cellPixels[dIdx + 2] = 22;
                      cellPixels[dIdx + 3] = 225;
                    }
                  }
                }

                // Compute torso horizontal center-of-mass (anchorX) inside the isolated cell
                const bandY0 = Math.max(pad, Math.floor(cellH * 0.22));
                const bandY1 = Math.min(cellH - pad, Math.ceil(cellH * 0.88));
                let weightedXSum = 0;
                let weightTotal = 0;
                for (let lx = pad; lx < cellW - pad; lx++) {
                  let colBody = 0;
                  for (let ly = bandY0; ly < bandY1; ly++) {
                    if (cellMask[ly * cellW + lx] === 1) colBody++;
                  }
                  if (colBody > 0) {
                    const weight = colBody * colBody;
                    weightedXSum += lx * weight;
                    weightTotal += weight;
                  }
                }
                const anchorX =
                  weightTotal > 0
                    ? Math.max(cellW * 0.25, Math.min(cellW * 0.75, weightedXSum / weightTotal))
                    : cellW * 0.5;
                const groundOffsetY = cellH - pad;

                rowExtracted.push({
                  frameRef: f,
                  trimmedW: cellW,
                  trimmedH: cellH,
                  pixels: cellPixels,
                  mask: cellMask,
                  anchorX,
                  groundOffsetY,
                });

                rowW += cellW + cellGap;
                if (cellH > rowMaxH) rowMaxH = cellH;
              }

              if (rowExtracted.length > 0) {
                extractedRows.push(rowExtracted);
                if (rowW > maxRowPixelW) maxRowPixelW = rowW;
                totalPackedH += rowMaxH + cellGap;
              }
            }

            // Resize cleanCanvas & flashCanvas if needed to hold the non-overlapping repacked atlas
            const atlasW = Math.max(w, maxRowPixelW + 8);
            const atlasH = Math.max(h, totalPackedH + 8);
            cleanCanvas.width = atlasW;
            cleanCanvas.height = atlasH;
            flashCanvas.width = atlasW;
            flashCanvas.height = atlasH;

            const newCleanImg = ctx.createImageData(atlasW, atlasH);
            const newFlashImg = flashCtx.createImageData(atlasW, atlasH);
            const nData = newCleanImg.data;
            const nfData = newFlashImg.data;

            let curY = 4;
            for (const rowEx of extractedRows) {
              let curX = 4;
              let rowMaxH = 0;
              for (const item of rowEx) {
                const cw = item.trimmedW;
                const ch = item.trimmedH;
                if (ch > rowMaxH) rowMaxH = ch;

                for (let ly = 0; ly < ch; ly++) {
                  const srcRowOff = ly * cw;
                  const dstRowOff = (curY + ly) * atlasW + curX;
                  for (let lx = 0; lx < cw; lx++) {
                    const sIdx = (srcRowOff + lx) * 4;
                    const a = item.pixels[sIdx + 3];
                    if (a > 0) {
                      const dIdx = (dstRowOff + lx) * 4;
                      nData[dIdx] = item.pixels[sIdx];
                      nData[dIdx + 1] = item.pixels[sIdx + 1];
                      nData[dIdx + 2] = item.pixels[sIdx + 2];
                      nData[dIdx + 3] = a;

                      nfData[dIdx] = 255;
                      nfData[dIdx + 1] = 244;
                      nfData[dIdx + 2] = 212;
                      nfData[dIdx + 3] = a;
                    }
                  }
                }

                // Update the frame's bounds in-place so both segmentedRows and frames point to the isolated atlas cell!
                item.frameRef.sx = curX;
                item.frameRef.sy = curY;
                item.frameRef.sw = cw;
                item.frameRef.sh = ch;
                item.frameRef.anchorX = item.anchorX;
                item.frameRef.groundOffsetY = item.groundOffsetY;

                curX += cw + cellGap;
              }
              curY += rowMaxH + cellGap;
            }

            ctx.putImageData(newCleanImg, 0, 0);
            flashCtx.putImageData(newFlashImg, 0, 0);
          };

          if (greySpec) {
            // 1. Sample local neutral studio-grey background from the cell corners of the known (cols x rows) grid
            const cols = greySpec.cols;
            const rows = greySpec.rows;
            const cellBgR = new Float32Array(cols * rows);
            const cellBgG = new Float32Array(cols * rows);
            const cellBgB = new Float32Array(cols * rows);

            for (let r = 0; r < rows; r++) {
              const ry0 = Math.round((r * h) / rows);
              const ry1 = Math.round(((r + 1) * h) / rows) - 1;
              for (let c = 0; c < cols; c++) {
                const cx0 = Math.round((c * w) / cols);
                const cx1 = Math.round(((c + 1) * w) / cols) - 1;
                let sR = 0;
                let sG = 0;
                let sB = 0;
                let cnt = 0;
                // Sample near the 4 corners and top/bottom edges of each grid cell where background is guaranteed
                const samplePts: Array<[number, number]> = [
                  [cx0 + 4, ry0 + 4],
                  [cx1 - 4, ry0 + 4],
                  [cx0 + 4, ry1 - 4],
                  [cx1 - 4, ry1 - 4],
                  [Math.round((cx0 + cx1) * 0.5), ry0 + 3],
                  [cx0 + 3, Math.round((ry0 + ry1) * 0.5)],
                  [cx1 - 3, Math.round((ry0 + ry1) * 0.5)],
                ];
                for (const [px, py] of samplePts) {
                  if (px >= 0 && px < w && py >= 0 && py < h) {
                    const sIdx = (py * w + px) * 4;
                    const pr = data[sIdx];
                    const pg = data[sIdx + 1];
                    const pb = data[sIdx + 2];
                    const pChroma = Math.max(pr, pg, pb) - Math.min(pr, pg, pb);
                    if (pChroma <= 16 && pr >= 82 && pr <= 178) {
                      sR += pr;
                      sG += pg;
                      sB += pb;
                      cnt++;
                    }
                  }
                }
                const cellIdx = r * cols + c;
                if (cnt > 0) {
                  cellBgR[cellIdx] = sR / cnt;
                  cellBgG[cellIdx] = sG / cnt;
                  cellBgB[cellIdx] = sB / cnt;
                } else {
                  cellBgR[cellIdx] = 126;
                  cellBgG[cellIdx] = 126;
                  cellBgB[cellIdx] = 128;
                }
              }
            }

            // Strip bottom-right Gemini star watermark corner before flood-fill
            const wmX0 = Math.floor(w * 0.94);
            const wmY0 = Math.floor(h * 0.92);
            for (let y = wmY0; y < h; y++) {
              const rOff = y * w;
              for (let x = wmX0; x < w; x++) {
                const p = rOff + x;
                bgMask[p] = 1;
                data[p * 4 + 3] = 0;
              }
            }

            // Strict studio-grey background test: matches ONLY the flat neutral studio backdrop (~126 grey)
            // so shaded grey helmets, iron armor, undead skeletons, and blades are NEVER eaten!
            const isGreyBgCandidate = (p: number): boolean => {
              const idx = p * 4;
              if (data[idx + 3] < 24) return true;
              const px = p % w;
              const py = (p - px) / w;
              const cIdx =
                Math.min(rows - 1, Math.floor((py * rows) / h)) * cols +
                Math.min(cols - 1, Math.floor((px * cols) / w));
              const bR = cellBgR[cIdx];
              const bG = cellBgG[cIdx];
              const bB = cellBgB[cIdx];

              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const maxC = Math.max(r, g, b);
              const minC = Math.min(r, g, b);
              const chroma = maxC - minC;
              const dist = Math.abs(r - bR) + Math.abs(g - bG) + Math.abs(b - bB);
              if (chroma > 8 || dist > 18 || minC < 96 || maxC > 158) {
                return false;
              }
              if (px >= 1 && px < w - 1 && py >= 1 && py < h - 1) {
                const n1 = (p - 1) * 4;
                const n2 = (p + 1) * 4;
                const n3 = (p - w) * 4;
                const n4 = (p + w) * 4;
                const localGrad =
                  Math.abs(data[n1] - r) +
                  Math.abs(data[n2] - r) +
                  Math.abs(data[n3 + 1] - g) +
                  Math.abs(data[n4 + 2] - b);
                if (localGrad > 16) return false;
              }
              return true;
            };

            const isFlatStudioGreySeed = (x: number, y: number): boolean => {
              if (x < 0 || x >= w || y < 0 || y >= h) return false;
              return isGreyBgCandidate(y * w + x);
            };

            // 2. Seed BFS flood-fill ONLY from outer sheet borders and the nominal grid cell seams
            const queue = new Int32Array(totalPixels);
            let qHead = 0;
            let qTail = 0;
            const trySeed = (x: number, y: number) => {
              if (x < 0 || x >= w || y < 0 || y >= h) return;
              const p = y * w + x;
              if (bgMask[p] === 0 && isFlatStudioGreySeed(x, y)) {
                bgMask[p] = 1;
                data[p * 4 + 3] = 0;
                queue[qTail++] = p;
              }
            };

            for (let x = 0; x < w; x++) {
              trySeed(x, 0);
              trySeed(x, 1);
              trySeed(x, h - 1);
              trySeed(x, h - 2);
            }
            for (let y = 0; y < h; y++) {
              trySeed(0, y);
              trySeed(1, y);
              trySeed(w - 1, y);
              trySeed(w - 2, y);
            }

            // Seed along the nominal row seams (r = 1..rows-1) and column seams (c = 1..cols-1)
            for (let r = 1; r < rows; r++) {
              const seamY = Math.round((r * h) / rows);
              for (let x = 0; x < w; x += 2) {
                trySeed(x, seamY - 1);
                trySeed(x, seamY);
                trySeed(x, seamY + 1);
              }
            }
            for (let c = 1; c < cols; c++) {
              const seamX = Math.round((c * w) / cols);
              for (let y = 0; y < h; y += 2) {
                trySeed(seamX - 1, y);
                trySeed(seamX, y);
                trySeed(seamX + 1, y);
              }
            }

            while (qHead < qTail) {
              const curr = queue[qHead++];
              const cx = curr % w;
              const cy = (curr - cx) / w;
              for (let dy = -1; dy <= 1; dy++) {
                const ny = cy + dy;
                if (ny < 0 || ny >= h) continue;
                const nRow = ny * w;
                for (let dx = -1; dx <= 1; dx++) {
                  if (dx === 0 && dy === 0) continue;
                  const nx = cx + dx;
                  if (nx < 0 || nx >= w) continue;
                  const n = nRow + nx;
                  if (bgMask[n] === 0 && isGreyBgCandidate(n)) {
                    bgMask[n] = 1;
                    data[n * 4 + 3] = 0;
                    queue[qTail++] = n;
                  }
                }
              }
            }
          } else {
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
                (g > 96 && greenExcess > 24 && maxRB < 180) ||
                (g > 155 && greenExcess > 18)
              ) {
                bgMask[p] = 1;
                data[idx + 3] = 0;
              } else if (greenExcess > 8) {
                data[idx + 1] = maxRB;
                const edgeAlpha =
                  greenExcess > 18
                    ? Math.max(0, Math.min(255, Math.round(255 * (1 - (greenExcess - 18) / 18))))
                    : 255;
                if (edgeAlpha < 52) {
                  bgMask[p] = 1;
                  data[idx + 3] = 0;
                } else {
                  data[idx + 3] = edgeAlpha;
                }
              } else {
                data[idx + 3] = 255;
              }
            }
          }

          // 2. Strip full-width horizontal grid lines (>78% width) and thin monochrome text-label rows ("SHEET 1: IDLE", etc.)
          for (let y = 0; y < h; y++) {
            const rowOff = y * w;
            let rowNonBg = 0;
            let warmBodyPixels = 0;
            for (let x = 0; x < w; x++) {
              if (bgMask[rowOff + x] === 0) {
                rowNonBg++;
                const idx = (rowOff + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                if (r > 68 && (r - b > 14 || r - g > 10 || Math.max(r, g, b) > 95)) {
                  warmBodyPixels++;
                }
              }
            }
            const isGridLine = !greySpec && rowNonBg > w * 0.78;
            const isTextLabelRow = !greySpec && rowNonBg > 0 && rowNonBg < w * 0.22 && warmBodyPixels <= 2;
            if (isGridLine || isTextLabelRow) {
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
          const minBandHeight = Math.max(18, Math.round(h * 0.048));
          for (let y = 0; y < h; y++) {
            if (rowOpaqueCount[y] > 4) {
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
            const bandH = yEnd - yStart;

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
            // Reject tiny text labels ("1. IDLE (4)") or stray artifacts shorter than 36% of row height
            if (
              !found ||
              maxX - minX < Math.max(12, Math.round(bandH * 0.20)) ||
              maxY - minY < Math.max(22, Math.round(bandH * 0.36))
            ) {
              return null;
            }
            const pad = 2;
            const sx = Math.max(xStart, minX - pad);
            const sy = Math.max(yStart, minY - pad);
            const sw = Math.min(xEnd - sx, maxX - minX + 1 + pad * 2);
            const sh = Math.min(yEnd - sy, maxY - minY + 1 + pad * 2);
            return { sx, sy, sw, sh, maxY };
          };

          const segmentedRows: SpriteFrameBounds[][] = [];
          const frames: SpriteFrameBounds[] = [];

          if (greySpec) {
            // Known uniform grid (cols x rows): extract each grid cell directly so weapons/clubs/tails
            // are NEVER split into standalone cutout frames!
            for (let r = 0; r < greySpec.rows; r++) {
              const ry0 = Math.round((r * h) / greySpec.rows);
              const ry1 = Math.round(((r + 1) * h) / greySpec.rows);
              const rawRowFrames: Array<{
                sx: number;
                sy: number;
                sw: number;
                sh: number;
                maxY: number;
              }> = [];
              for (let c = 0; c < greySpec.cols; c++) {
                const cx0 = Math.round((c * w) / greySpec.cols);
                const cx1 = Math.round(((c + 1) * w) / greySpec.cols);
                const rf = extractRawFrame(cx0 + 2, cx1 - 2, ry0 + 2, ry1 - 2);
                if (rf) rawRowFrames.push(rf);
              }
              if (rawRowFrames.length > 0) {
                const sortedMaxY = rawRowFrames.map((f) => f.maxY).sort((a, b) => a - b);
                const rowGroundY = sortedMaxY[Math.floor(sortedMaxY.length * 0.75)];
                const rowFrames: SpriteFrameBounds[] = rawRowFrames.map((rf) => ({
                  sx: rf.sx,
                  sy: rf.sy,
                  sw: rf.sw,
                  sh: rf.sh,
                  anchorX: rf.sw * 0.5,
                  groundOffsetY: Math.max(rf.sh * 0.75, rowGroundY - rf.sy),
                }));
                segmentedRows.push(rowFrames);
                for (const f of rowFrames) frames.push(f);
              }
            }
          }

          for (const [ry0, ry1] of greySpec ? [] : rowBands) {
            const rowH = ry1 - ry0;
            if (rowH < 18) continue;

            const colCount = new Int32Array(w);
            const torsoColCount = new Int32Array(w);
            const torsoY0 = Math.round(ry0 + rowH * 0.16);
            const torsoY1 = Math.round(ry0 + rowH * 0.82);
            for (let y = ry0; y < ry1; y++) {
              const rOff = y * w;
              const isTorsoBand = y >= torsoY0 && y <= torsoY1;
              for (let x = 0; x < w; x++) {
                if (bgMask[rOff + x] === 0) {
                  colCount[x]++;
                  if (isTorsoBand) torsoColCount[x]++;
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

            // Merge only small detached weapon/shield/spark fragments (< 32% of rowH) into their adjacent character pose
            const smallFragW = Math.round(rowH * 0.32);
            const maxMergeGap = Math.round(rowH * 0.14);
            const minValidPoseW = Math.round(rowH * 0.24);
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

            // Determine canonical single-pose width from non-merged single poses, falling back to 0.88 * rowH
            const singlePoseWidths = mergedCols
              .map((c) => c[1] - c[0])
              .filter((cw) => cw >= rowH * 0.42 && cw <= rowH * 1.32)
              .sort((a, b) => a - b);
            const canonicalPoseW =
              singlePoseWidths.length > 0
                ? singlePoseWidths[Math.floor(singlePoseWidths.length * 0.5)]
                : Math.round(rowH * 0.88);
            const minSubPoseW = Math.max(Math.round(rowH * 0.44), Math.round(canonicalPoseW * 0.58));
            const splitTriggerW = Math.max(Math.round(rowH * 1.38), Math.round(canonicalPoseW * 1.46));

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
                  10,
                  Math.max(2, Math.round(spanW / Math.max(rowH * 0.72, canonicalPoseW)))
                );
                let prevX = cx0;
                for (let k = 1; k < subCount; k++) {
                  const nomX = Math.round(cx0 + (k * spanW) / subCount);
                  const rad = Math.max(10, Math.round(spanW / (subCount * 2.6)));
                  let bestX = nomX;
                  let bestVal = Number.MAX_SAFE_INTEGER;
                  for (
                    let sx = Math.max(prevX + minSubPoseW, nomX - rad);
                    sx <= Math.min(cx1 - minSubPoseW, nomX + rad);
                    sx++
                  ) {
                    const v =
                      torsoColCount[Math.max(0, sx - 1)] +
                      torsoColCount[sx] * 2 +
                      torsoColCount[Math.min(w - 1, sx + 1)] +
                      colCount[sx];
                    if (v < bestVal) {
                      bestVal = v;
                      bestX = sx;
                    }
                  }
                  if (bestX - prevX >= minSubPoseW && cx1 - bestX >= minSubPoseW) {
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

          // Isolate primary character silhouette per frame & bake Hades dark-ink outline + contrast
          finalizeCharacterSheetInkAndFrames(segmentedRows, frames);

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

        // STANDARD PATH FOR 1xN / 2x2 / 4x2 / PROP / VFX SPRITES
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

        if (removeBlack) {
          const cornerSamples: Array<[number, number]> = [
            [4, 4],
            [w - 5, 4],
            [4, h - 5],
            [w - 5, h - 5],
            [Math.floor(w * 0.5), 4],
            [4, Math.floor(h * 0.5)],
            [w - 5, Math.floor(h * 0.5)],
          ];

          let lightCornerCount = 0;
          let darkCornerCount = 0;
          let greyCornerCount = 0;
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
              const maxC = Math.max(r, g, b);
              const minC = Math.min(r, g, b);
              const sat = maxC - minC;
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
              } else if (maxC < 52) {
                darkCornerCount++;
                sumR += r;
                sumG += g;
                sumB += b;
                sampleCount++;
              } else if (sat <= 32 && luma >= 42 && luma <= 210) {
                greyCornerCount++;
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
          const isGreyBg =
            !isMagentaBg &&
            greyCornerCount >= 2 &&
            greyCornerCount >= lightCornerCount &&
            greyCornerCount >= darkCornerCount;
          const isLightBg =
            !isMagentaBg &&
            !isGreyBg &&
            lightCornerCount >= darkCornerCount &&
            lightCornerCount > 0;
          let bgR = isMagentaBg ? 255 : isGreyBg ? 128 : isLightBg ? 255 : 10;
          let bgG = isMagentaBg ? 0 : isGreyBg ? 128 : isLightBg ? 255 : 10;
          let bgB = isMagentaBg ? 255 : isGreyBg ? 128 : isLightBg ? 255 : 12;
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

            if (isVfxMode) {
              // For VFX sheets, flood-fill all neutral grey/white checkerboard squares (up to luma 232) and black grid borders
              return (
                (maxC < 56 && luma < 52) ||
                (sat <= 22 && Math.abs(r - b) <= 16 && luma <= 232) ||
                (sat <= 26 && colorDist <= 68 && luma <= 220)
              );
            }
            if (isMagentaBg) {
              return (
                (r > 150 && b > 140 && g < 120 && r - g > 65 && b - g > 55) ||
                colorDist < 85
              );
            }
            if (isGreyBg) {
              return (
                (sat <= 28 && colorDist <= 88) ||
                (sat <= 20 && minC >= 48 && maxC <= 204)
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
            if (x < 0 || x >= w || y < 0 || y >= h) return;
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
          if (is4x2Grid) {
            const midY = Math.floor(h * 0.5);
            for (let x = 0; x < w; x++) {
              for (let dy = -3; dy <= 3; dy++) enqueueIfCandidate(x, midY + dy);
            }
            for (let c = 1; c < 4; c++) {
              const seamX = Math.floor((c * w) / 4);
              for (let y = 0; y < h; y++) {
                for (let dx = -3; dx <= 3; dx++) enqueueIfCandidate(seamX + dx, y);
              }
            }
          } else if (is2x2Grid) {
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
                for (let dx = -2; dx <= 2; dx++) enqueueIfCandidate(seamX + dx, y);
              }
            }
            if (isVfxMode) {
              // Also seed along the top and bottom 14% margins of 1xN VFX strips
              const topMargin = Math.floor(h * 0.14);
              const botMargin = Math.floor(h * 0.86);
              for (let x = 0; x < w; x++) {
                enqueueIfCandidate(x, topMargin);
                enqueueIfCandidate(x, botMargin);
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

        // Helper for VFX mode: check if a bright white pixel has colored VFX glow nearby (within 5px)
        const hasNearbyVfxColor = (cx: number, cy: number): boolean => {
          for (let dy = -5; dy <= 5; dy += 2) {
            const ny = cy + dy;
            if (ny < 0 || ny >= h) continue;
            const rOff = ny * w;
            for (let dx = -5; dx <= 5; dx += 2) {
              const nx = cx + dx;
              if (nx < 0 || nx >= w) continue;
              const nIdx = (rOff + nx) * 4;
              const nr = data[nIdx];
              const ng = data[nIdx + 1];
              const nb = data[nIdx + 2];
              const nChroma = Math.max(nr, ng, nb) - Math.min(nr, ng, nb);
              if (nChroma >= 30) return true;
            }
          }
          return false;
        };

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
              if (bgMask[p] === 1) {
                data[idx + 3] = 0;
                continue;
              }
              const maxChannel = Math.max(r, g, b);
              const minChannel = Math.min(r, g, b);
              const chroma = maxChannel - minChannel;
              const warmDelta = r - b;
              const isWarmDust = warmDelta >= 16 && r >= g && luma >= 52 && luma <= 215;
              const effectiveChroma = isWarmDust ? Math.max(chroma, Math.round(warmDelta * 1.35)) : chroma;

              // 1. Strip solid black/charcoal grid borders & dark box backgrounds
              if (maxChannel < 56 && luma < 50) {
                data[idx + 3] = 0;
                continue;
              }
              // 2. Strip ALL neutral grey & light-grey/white checkerboard squares across the entire luminance range!
              if (effectiveChroma <= 22 && Math.abs(r - b) <= 16) {
                if (luma <= 232 || !hasNearbyVfxColor(x, y)) {
                  data[idx + 3] = 0;
                  continue;
                }
              }

              // 3. Smooth chroma-based alpha matting + checkerboard de-greying for translucent VFX edges
              if (luma > 228 && hasNearbyVfxColor(x, y)) {
                a = 255;
              } else if (effectiveChroma < 62) {
                const factor = Math.max(0, Math.min(1, (effectiveChroma - 20) / 42));
                a = Math.round(Math.pow(factor, 1.2) * 255);
                if (a < 22) {
                  data[idx + 3] = 0;
                  continue;
                }
              }

              // Subtract neutral grey checkerboard bleed from semi-transparent pixels and boost vibrancy
              const deGrey = Math.min(minChannel, Math.round((1 - a / 255) * 185));
              r = Math.min(255, Math.max(0, Math.round((r - deGrey) * 1.32)));
              g = Math.min(255, Math.max(0, Math.round((g - deGrey) * 1.32)));
              b = Math.min(255, Math.max(0, Math.round((b - deGrey) * 1.32)));
              const newLuma = 0.299 * r + 0.587 * g + 0.114 * b;
              const vfxSat = 1.28;
              r = Math.min(255, Math.max(0, Math.round(newLuma + (r - newLuma) * vfxSat)));
              g = Math.min(255, Math.max(0, Math.round(newLuma + (g - newLuma) * vfxSat)));
              b = Math.min(255, Math.max(0, Math.round(newLuma + (b - newLuma) * vfxSat)));
              data[idx] = r;
              data[idx + 1] = g;
              data[idx + 2] = b;
              data[idx + 3] = a;
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

        const isBoxedVfxSheet =
          isVfxMode && (url.includes('/assets/vfx/') || url.includes('/assets/concepts/'));

        // Detect active inset table bounds [tableX0..tableX1, tableY0..tableY1] for boxed VFX sheets
        // so sheets with outer checkerboard margins (like Weapon_slash, Impact_flash, Blood_splatter)
        // divide cells across the actual inset table rather than the full image width/height!
        let tableX0 = 0;
        let tableX1 = w;
        let tableY0 = 0;
        let tableY1 = h;
        if (isBoxedVfxSheet) {
          const marginX = Math.round(w * 0.02);
          const marginY = Math.round(h * 0.02);
          let minActX = w;
          let maxActX = 0;
          let minActY = h;
          let maxActY = 0;
          for (let y = marginY; y < h - marginY; y++) {
            const rOff = y * w;
            for (let x = marginX; x < w - marginX; x++) {
              if (data[(rOff + x) * 4 + 3] > 48) {
                if (x < minActX) minActX = x;
                if (x > maxActX) maxActX = x;
                if (y < minActY) minActY = y;
                if (y > maxActY) maxActY = y;
              }
            }
          }
          if (maxActX - minActX > w * 0.45 && maxActY - minActY > h * 0.18) {
            tableX0 = Math.max(0, minActX - Math.round(w * 0.015));
            tableX1 = Math.min(w, maxActX + Math.round(w * 0.015));
            tableY0 = Math.max(0, minActY - Math.round(h * 0.02));
            tableY1 = Math.min(h, maxActY + Math.round(h * 0.02));
          }
        }

        const computeTightBoundsInBox = (
          xStart: number,
          xEnd: number,
          yStart: number,
          yEnd: number
        ): SpriteFrameBounds => {
          const boxW = Math.max(1, xEnd - xStart);
          const boxH = Math.max(1, yEnd - yStart);
          const innerMarginX = isBoxedVfxSheet
            ? Math.max(3, Math.round(boxW * 0.04))
            : expectedFrames > 1
            ? Math.min(6, Math.round(boxW * 0.025))
            : 0;
          const innerMarginY = isBoxedVfxSheet
            ? Math.max(3, Math.round(boxH * 0.04))
            : 0;

          const scanXStart = xStart + innerMarginX;
          const scanXEnd = Math.max(scanXStart + 1, xEnd - innerMarginX);
          const scanYStart = yStart + innerMarginY;
          const scanYEnd = Math.max(scanYStart + 1, yEnd - innerMarginY);

          // For VFX sheets, zero out any pixels outside [scanXStart..scanXEnd, scanYStart..scanYEnd] inside this cell
          // and smoothly feather the outer 12% perimeter of the cell so a rectangular box edge can NEVER appear!
          if (isVfxMode) {
            const featherX = Math.max(4, Math.round((scanXEnd - scanXStart) * 0.12));
            const featherY = Math.max(4, Math.round((scanYEnd - scanYStart) * 0.12));
            for (let y = yStart; y < yEnd; y++) {
              const rOff = y * w;
              for (let x = xStart; x < xEnd; x++) {
                const idx = (rOff + x) * 4;
                if (x < scanXStart || x >= scanXEnd || y < scanYStart || y >= scanYEnd) {
                  data[idx + 3] = 0;
                  fData[idx + 3] = 0;
                  gData[idx + 3] = 0;
                  jData[idx + 3] = 0;
                  continue;
                }
                const a = data[idx + 3];
                if (a > 0) {
                  const dxEdge = Math.min(x - scanXStart, scanXEnd - 1 - x);
                  const dyEdge = Math.min(y - scanYStart, scanYEnd - 1 - y);
                  const fx = dxEdge < featherX ? dxEdge / featherX : 1;
                  const fy = dyEdge < featherY ? dyEdge / featherY : 1;
                  const fEdge = fx * fy;
                  if (fEdge < 1) {
                    const newA = Math.round(a * fEdge);
                    data[idx + 3] = newA < 14 ? 0 : newA;
                    fData[idx + 3] = data[idx + 3];
                    gData[idx + 3] = data[idx + 3];
                    jData[idx + 3] = data[idx + 3];
                  }
                }
              }
            }
          }

          let minX = scanXEnd;
          let maxX = scanXStart;
          let minY = scanYEnd;
          let maxY = scanYStart;
          let found = false;

          for (let y = scanYStart; y < scanYEnd; y++) {
            const rowOffset = y * w;
            for (let x = scanXStart; x < scanXEnd; x++) {
              const alpha = data[(rowOffset + x) * 4 + 3];
              if (alpha > 28) {
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
            const sx = Math.max(scanXStart, minX - pad);
            const sy = Math.max(scanYStart, minY - pad);
            const sw = Math.min(scanXEnd - sx, maxX - minX + 1 + pad * 2);
            const sh = Math.min(scanYEnd - sy, maxY - minY + 1 + pad * 2);
            return {
              sx,
              sy,
              sw,
              sh,
              anchorX: sw * 0.5,
              groundOffsetY: isVfxMode ? sh * 0.5 : sh,
            };
          }
          const fallbackSw = Math.max(1, scanXEnd - scanXStart);
          const fallbackSh = Math.max(1, scanYEnd - scanYStart);
          return {
            sx: scanXStart,
            sy: scanYStart,
            sw: fallbackSw,
            sh: fallbackSh,
            anchorX: fallbackSw * 0.5,
            groundOffsetY: isVfxMode ? fallbackSh * 0.5 : fallbackSh,
          };
        };

        const frames: SpriteFrameBounds[] = [];
        const effX0 = isBoxedVfxSheet ? tableX0 : 0;
        const effX1 = isBoxedVfxSheet ? tableX1 : w;
        const effY0 = isBoxedVfxSheet ? tableY0 : 0;
        const effY1 = isBoxedVfxSheet ? tableY1 : h;
        const effW = Math.max(1, effX1 - effX0);

        if (is4x2Grid) {
          const cols = 4;
          const midY = Math.round((effY0 + effY1) * 0.5);
          for (let r = 0; r < 2; r++) {
            const y0 = r === 0 ? effY0 : midY;
            const y1 = r === 0 ? midY : effY1;
            for (let c = 0; c < cols; c++) {
              const x0 = effX0 + Math.round((c * effW) / cols);
              const x1 = effX0 + Math.round(((c + 1) * effW) / cols);
              frames.push(computeTightBoundsInBox(x0, x1, y0, y1));
            }
          }
        } else if (is2x2Grid) {
          const midX = Math.round((effX0 + effX1) * 0.5);
          const midY = Math.round((effY0 + effY1) * 0.5);
          frames.push(computeTightBoundsInBox(effX0, midX, effY0, midY));
          frames.push(computeTightBoundsInBox(midX, effX1, effY0, midY));
          frames.push(computeTightBoundsInBox(effX0, midX, midY, effY1));
          frames.push(computeTightBoundsInBox(midX, effX1, midY, effY1));
        } else {
          const splits: number[] = [effX0];
          for (let k = 1; k < expectedFrames; k++) {
            splits.push(effX0 + Math.round((k * effW) / expectedFrames));
          }
          splits.push(effX1);
          for (let f = 0; f < expectedFrames; f++) {
            frames.push(computeTightBoundsInBox(splits[f], splits[f + 1], effY0, effY1));
          }
        }

        // Write updated edge-feathered VFX image data back to the canvases
        ctx.putImageData(imgData, 0, 0);
        flashCtx.putImageData(flashImgData, 0, 0);
        goldCtx.putImageData(goldImgData, 0, 0);
        jadeCtx.putImageData(jadeImgData, 0, 0);

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
