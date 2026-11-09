export type MudraButtonId = 'S' | 'H' | 'D' | 'P';

export type MudraComboId =
  | 'dash_strike_blink'
  | 'dash_heavy_meteor'
  | 'parry_strike_thunder'
  | 'parry_heavy_cataclysm'
  | 'parry_dash_rewind'
  | 'strike_strike_heavy_whirlwind'
  | 'strike_heavy_strike_mirage'
  | 'heavy_heavy_kopa';

export interface MudraInputStep {
  button: MudraButtonId;
  timestampMs: number;
}

export interface MudraComboSpec {
  id: MudraComboId;
  sequence: MudraButtonId[];
  sanskritName: string;
  englishTitle: string;
  shortBadge: string;
  accentColor: string;
  glowColor: string;
  description: string;
}

export interface ButtonDynamicHint {
  button: MudraButtonId;
  isFinisherReady: boolean;
  badgeText: string;
  subLabel: string;
  accentColor: string;
  comboId?: MudraComboId;
}

export interface MudraEvaluationResult {
  updatedBuffer: MudraInputStep[];
  triggeredCombo: MudraComboSpec | null;
  activeSequence: MudraButtonId[];
  nextHints: Record<MudraButtonId, ButtonDynamicHint>;
  activeFilamentPair: [MudraButtonId, MudraButtonId] | null;
}

export const MUDRA_COMBO_WINDOW_MS = 2200;

export const MUDRA_COMBO_SPECS: readonly MudraComboSpec[] = [
  {
    id: 'strike_strike_heavy_whirlwind',
    sequence: ['S', 'S', 'H'],
    sanskritName: 'BHAIRAVA VAYU-CHAKRA',
    englishTitle: 'SKY-SUNDER CYCLONE SLAM',
    shortBadge: 'CYCLONE',
    accentColor: '#ff4d3b',
    glowColor: 'rgba(255, 77, 59, 0.75)',
    description: '2x Strike + Heavy: Pulls foes into a rising fire cyclone and shatters posture.',
  },
  {
    id: 'strike_heavy_strike_mirage',
    sequence: ['S', 'H', 'S'],
    sanskritName: 'MAYA TANDAVA',
    englishTitle: 'ASHEN PHANTOM TRI-SLASH',
    shortBadge: 'PHANTOMS',
    accentColor: '#ffcf66',
    glowColor: 'rgba(255, 207, 102, 0.75)',
    description: 'Strike + Heavy + Strike: Summons twin golden phantoms to cleave in unison.',
  },
  {
    id: 'dash_strike_blink',
    sequence: ['D', 'S'],
    sanskritName: 'GARUDA CHHAYA-BHEDA',
    englishTitle: 'SHADOW-BLINK ASSASSINATION',
    shortBadge: 'BLINK-CUT',
    accentColor: '#3ee0a8',
    glowColor: 'rgba(62, 224, 168, 0.75)',
    description: 'Dash + Strike: Teleports behind the target for a lethal backstab cross-slash.',
  },
  {
    id: 'dash_heavy_meteor',
    sequence: ['D', 'H'],
    sanskritName: 'AGNEYASTRA ULKA-PATA',
    englishTitle: 'BLAZING METEOR CATACLYSM',
    shortBadge: 'METEOR',
    accentColor: '#ff5e36',
    glowColor: 'rgba(255, 94, 54, 0.75)',
    description: 'Dash + Heavy: Leaps skyward and crashes down with Agneyastra blood-shards.',
  },
  {
    id: 'parry_strike_thunder',
    sequence: ['P', 'S'],
    sanskritName: 'VAJRA PRATIGHATA',
    englishTitle: 'THUNDER-COUNTER RIPOSTE',
    shortBadge: 'THUNDER',
    accentColor: '#ffd86b',
    glowColor: 'rgba(255, 216, 107, 0.8)',
    description: 'Parry + Strike: Deflects and unleashes a golden Vajra chain-lightning sweep.',
  },
  {
    id: 'parry_heavy_cataclysm',
    sequence: ['P', 'H'],
    sanskritName: 'SUDARSHANA SANGHA-NOVA',
    englishTitle: 'COMPANION LINK CATACLYSM',
    shortBadge: 'NOVA LINK',
    accentColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.78)',
    description: 'Parry + Heavy: Triggers Sworn Companion Link Ultimate + radial Chakra burst.',
  },
  {
    id: 'parry_dash_rewind',
    sequence: ['P', 'D'],
    sanskritName: 'KALA-CHAKRA NIVRTTI',
    englishTitle: 'SANDS OF KALA REWIND',
    shortBadge: 'REWIND',
    accentColor: '#63f2ff',
    glowColor: 'rgba(99, 242, 255, 0.78)',
    description: 'Parry + Dash: Reverses time 3s to restore Vitality and freeze nearby foes.',
  },
  {
    id: 'heavy_heavy_kopa',
    sequence: ['H', 'H'],
    sanskritName: 'RUDRA-KOPA AVATARA',
    englishTitle: 'SOVEREIGN RAGE AWAKENING',
    shortBadge: 'KOPA RAGE',
    accentColor: '#ff6a2b',
    glowColor: 'rgba(255, 106, 43, 0.82)',
    description: 'Heavy + Heavy: Ignites Rudra-Kopa Third-Eye Sovereign Awakening.',
  },
] as const;

const DEFAULT_HINTS: Record<MudraButtonId, ButtonDynamicHint> = {
  S: {
    button: 'S',
    isFinisherReady: false,
    badgeText: 'COMBO',
    subLabel: 'STRIKE',
    accentColor: '#f2c45a',
  },
  H: {
    button: 'H',
    isFinisherReady: false,
    badgeText: 'CLEAVE',
    subLabel: 'HEAVY',
    accentColor: '#ff6a33',
  },
  D: {
    button: 'D',
    isFinisherReady: false,
    badgeText: 'EVADE',
    subLabel: 'DASH',
    accentColor: '#ffb84d',
  },
  P: {
    button: 'P',
    isFinisherReady: false,
    badgeText: 'DEFLECT',
    subLabel: 'PARRY',
    accentColor: '#ffd86b',
  },
};

export function computeNextMudraHints(
  activeSequence: readonly MudraButtonId[]
): Record<MudraButtonId, ButtonDynamicHint> {
  const hints: Record<MudraButtonId, ButtonDynamicHint> = {
    S: { ...DEFAULT_HINTS.S },
    H: { ...DEFAULT_HINTS.H },
    D: { ...DEFAULT_HINTS.D },
    P: { ...DEFAULT_HINTS.P },
  };

  if (activeSequence.length === 0) {
    return hints;
  }

  // Check 3-step completions first if the last 2 steps match a prefix of length 2
  const lastTwo = activeSequence.slice(-2);
  if (lastTwo.length === 2) {
    for (const spec of MUDRA_COMBO_SPECS) {
      if (
        spec.sequence.length === 3 &&
        spec.sequence[0] === lastTwo[0] &&
        spec.sequence[1] === lastTwo[1]
      ) {
        const nextBtn = spec.sequence[2];
        hints[nextBtn] = {
          button: nextBtn,
          isFinisherReady: true,
          badgeText: 'MUDRA!',
          subLabel: spec.shortBadge,
          accentColor: spec.accentColor,
          comboId: spec.id,
        };
      }
    }
  }

  // Check 2-step completions or 3-step second-stage setups based on the very last button pressed
  const lastOne = activeSequence[activeSequence.length - 1];
  for (const spec of MUDRA_COMBO_SPECS) {
    if (spec.sequence.length === 2 && spec.sequence[0] === lastOne) {
      const nextBtn = spec.sequence[1];
      // Do not overwrite a higher-priority 3-step finisher
      if (!hints[nextBtn].isFinisherReady) {
        hints[nextBtn] = {
          button: nextBtn,
          isFinisherReady: true,
          badgeText: `${lastOne}+${nextBtn}`,
          subLabel: spec.shortBadge,
          accentColor: spec.accentColor,
          comboId: spec.id,
        };
      }
    } else if (spec.sequence.length === 3 && spec.sequence[0] === lastOne && activeSequence.length === 1) {
      const midBtn = spec.sequence[1];
      if (!hints[midBtn].isFinisherReady) {
        hints[midBtn] = {
          button: midBtn,
          isFinisherReady: false,
          badgeText: `${lastOne}➔${midBtn}`,
          subLabel: midBtn === 'S' ? 'CHAIN II' : 'WEAVE',
          accentColor: '#ffd86b',
        };
      }
    }
  }

  return hints;
}

export function evaluateMudraButtonPress(
  prevBuffer: readonly MudraInputStep[],
  button: MudraButtonId,
  nowMs: number,
  windowMs: number = MUDRA_COMBO_WINDOW_MS
): MudraEvaluationResult {
  const freshBuffer = prevBuffer.filter((step) => nowMs - step.timestampMs <= windowMs);
  const nextBuffer: MudraInputStep[] = [...freshBuffer, { button, timestampMs: nowMs }];
  const seq = nextBuffer.map((s) => s.button);

  let matchedCombo: MudraComboSpec | null = null;

  // 1. Check 3-button sequences first (highest priority)
  if (seq.length >= 3) {
    const tail3 = seq.slice(-3);
    for (const spec of MUDRA_COMBO_SPECS) {
      if (
        spec.sequence.length === 3 &&
        spec.sequence[0] === tail3[0] &&
        spec.sequence[1] === tail3[1] &&
        spec.sequence[2] === tail3[2]
      ) {
        matchedCombo = spec;
        break;
      }
    }
  }

  // 2. If no 3-button match, check 2-button sequences
  if (!matchedCombo && seq.length >= 2) {
    const tail2 = seq.slice(-2);
    for (const spec of MUDRA_COMBO_SPECS) {
      if (
        spec.sequence.length === 2 &&
        spec.sequence[0] === tail2[0] &&
        spec.sequence[1] === tail2[1]
      ) {
        matchedCombo = spec;
        break;
      }
    }
  }

  const prevBtn = seq.length >= 2 ? seq[seq.length - 2] : null;
  const activeFilamentPair: [MudraButtonId, MudraButtonId] | null = prevBtn
    ? [prevBtn, button]
    : null;

  // If a combo was triggered, reset the buffer so the next press starts a clean weave
  const finalBuffer = matchedCombo ? [] : nextBuffer.slice(-3);
  const activeSequence = finalBuffer.map((s) => s.button);
  const nextHints = computeNextMudraHints(activeSequence);

  return {
    updatedBuffer: finalBuffer,
    triggeredCombo: matchedCombo,
    activeSequence,
    nextHints,
    activeFilamentPair,
  };
}
