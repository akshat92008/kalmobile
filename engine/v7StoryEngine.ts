// ============================================================================
// MERU ENGINE — MODULE 1: v7 STORY, MEMORY FLAGS, LANTERN, LOOK & SCRIPT ENGINE
// Implements Sections 1–24 & 25–40 of "Kaliyuga: The Bleeding Crown" (v7 Bible)
// ============================================================================

export type LanternLightState = 'warm' | 'dim' | 'cool';

export type SliceStageId =
  | 'prologue_scrolls'
  | 'opening_hill'
  | 'opening_wake'
  | 'vaitarani_hub'
  | 'combat_arena'
  | 'savitri_lantern_interlude'
  | 'preserver_interlude'
  | 'dundubhi_intro'
  | 'dundubhi_aftermath'
  | 'vrikodara_intro'
  | 'shard1_memory'
  | 'ferry_1'
  | 'ferry_1_scene'
  | 'act6_choice'
  | 'ending_vow'
  | 'ending_sovereign';

export interface StoryMemoryFlags {
  looks: string[];
  vritra_saved: boolean;
  ferry_listened: boolean;
  deaths: number;
  rageUses: number;
  shardsCollected: number;
  shardsRecovered: number;
  dundubhiCleared: boolean;
  rakshasaStanceUnlocked: boolean;
  openingCompleted: boolean;
  prologueCompleted: boolean;
  ferry1Choice: 'silence' | 'ask_ila' | 'apologize' | null;
  final_choice: 'vow' | 'sovereign' | null;
}

export const INITIAL_STORY_FLAGS: StoryMemoryFlags = {
  looks: [],
  vritra_saved: false,
  ferry_listened: false,
  deaths: 0,
  rageUses: 0,
  shardsCollected: 0,
  shardsRecovered: 0,
  dundubhiCleared: false,
  rakshasaStanceUnlocked: false,
  openingCompleted: false,
  prologueCompleted: false,
  ferry1Choice: null,
  final_choice: null,
};

const STORY_STORAGE_KEY = 'kaliyuga_v7_story_memory';

export function loadStoryMemoryFlags(): StoryMemoryFlags {
  if (typeof window === 'undefined') return { ...INITIAL_STORY_FLAGS };
  try {
    const raw = window.localStorage.getItem(STORY_STORAGE_KEY);
    if (!raw) return { ...INITIAL_STORY_FLAGS };
    const parsed = JSON.parse(raw);
    const shards = Math.max(
      Number(parsed.shardsCollected || 0),
      Number(parsed.shardsRecovered || 0)
    );
    return {
      ...INITIAL_STORY_FLAGS,
      ...parsed,
      shardsCollected: shards,
      shardsRecovered: shards,
      looks: Array.isArray(parsed.looks) ? parsed.looks : [],
    };
  } catch {
    return { ...INITIAL_STORY_FLAGS };
  }
}

export function saveStoryMemoryFlags(flags: StoryMemoryFlags): void {
  if (typeof window === 'undefined') return;
  try {
    const shards = Math.max(flags.shardsCollected || 0, flags.shardsRecovered || 0);
    window.localStorage.setItem(
      STORY_STORAGE_KEY,
      JSON.stringify({
        ...flags,
        shardsCollected: shards,
        shardsRecovered: shards,
      })
    );
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Computes Savitri's Lantern state (Section 5, 28, 31, 34):
 * "Savitri's lantern is the only warm light in the game, apart from fire.
 *  When Rudra dies, he wakes in Savitri's boat. Her voice gets quieter and the light cooler each time.
 *  Rage dims the lantern. It's a story beat, never a punishing stat."
 */
export function getLanternLightState(flags: StoryMemoryFlags): {
  state: LanternLightState;
  label: string;
  hex: string;
  flameColor: string;
  glowColor: string;
  ambientOverlay: string;
  savitriVoiceTone: string;
  savitriWakeLine: string;
} {
  const toll = flags.deaths * 2 + Math.floor(flags.rageUses / 2);
  if (toll <= 1) {
    return {
      state: 'warm',
      label: 'WARM OCHRE FLAME',
      hex: '#f5b952',
      flameColor: '#f5b952',
      glowColor: 'rgba(245, 185, 82, 0.34)',
      ambientOverlay: 'rgba(38, 24, 10, 0.08)',
      savitriVoiceTone: 'Steady, dry, unyielding',
      savitriWakeLine:
        '“Get up. You owe a lot of people. Every time you fall, it costs me. Don’t fall.”',
    };
  }
  if (toll <= 4) {
    return {
      state: 'dim',
      label: 'DIMMING AMBER WICK',
      hex: '#d9823b',
      flameColor: '#d9823b',
      glowColor: 'rgba(217, 130, 59, 0.22)',
      ambientOverlay: 'rgba(18, 22, 34, 0.16)',
      savitriVoiceTone: 'Quieter, breath shallow',
      savitriWakeLine:
        '“Again? Take the oar for a breath... My years are in that wick, Rudra. Stand up and look this time.”',
    };
  }
  return {
    state: 'cool',
    label: 'COOL PALE EMBER',
    hex: '#7ea8cc',
    flameColor: '#7ea8cc',
    glowColor: 'rgba(126, 168, 204, 0.20)',
    ambientOverlay: 'rgba(10, 18, 32, 0.26)',
    savitriVoiceTone: 'Hoarse whisper, pale light',
    savitriWakeLine:
      '“(Whispering) The flame is almost cold. Don’t apologize to me. Climb the mountain and finish it.”',
  };
}

// ============================================================================
// SECTION 7: THE PROLOGUE — FIVE SCROLLS (Dark Gold & Ash Brushwork)
// ============================================================================
export interface PrologueScrollSpec {
  id: number;
  roman: string;
  title: string;
  sanskritSubtitle: string;
  artAssetUrl: string;
  visualDirection: string;
  sanjayaNarration: string;
  dialogueLines: { speaker: string; text: string }[];
}

export const PROLOGUE_SCROLLS: PrologueScrollSpec[] = [
  {
    id: 1,
    roman: 'SCROLL I OF V',
    title: 'The Churning of the Ocean',
    sanskritSubtitle: 'समुद्र मन्थन · SAMUDRA MANTHAN',
    artAssetUrl: '/assets/aistudio/Gemini_Generated_Image_pw6vhspw6vhspw6v.png',
    visualDirection:
      'Gods and asuras pull the serpent Vasuki around Mount Mandara. Shiva drinks the Halahala poison; Mohini pours the golden Amrita while Rahu’s severed head rises to bite the sun.',
    sanjayaNarration:
      '“I am blind. Everything I tell you was shown to me. Let it be written: Gods and asuras made the nectar together, and only one side drank it.”',
    dialogueLines: [
      {
        speaker: 'SANJAYA (CHRONICLER)',
        text: '“One asura, Rahu, slipped into the line and drank. The Preserver cut off his head, but the nectar was already in his throat. The head lives on and swallows the sun.”',
      },
    ],
  },
  {
    id: 2,
    roman: 'SCROLL II OF V',
    title: 'The Child & The Mani',
    sanskritSubtitle: 'मणि गर्भ · THE ANCHORED SOUL',
    artAssetUrl: '/assets/aistudio/Gemini_Generated_Image_laj3yelaj3yelaj3.png',
    visualDirection:
      'Exhausted gods kneel around the sage’s wife Suvarna and Kaala-Chakra. A newborn cries as a burning gem—the Mani—opens in his brow. Far away in the stone, a woman hums a lullaby once.',
    sanjayaNarration:
      '“A mortal body cannot hold the power of the gods alone. The Mani needed a second soul to anchor it—from a mother who gave hers willingly. She did not tell her husband the price.”',
    dialogueLines: [
      {
        speaker: 'KAALA-CHAKRA (HOLLOW)',
        text: '“You are a weapon the gods made. I will make you a good one.”',
      },
    ],
  },
  {
    id: 3,
    roman: 'SCROLL III OF V',
    title: 'The Two Brothers',
    sanskritSubtitle: 'नचिकेता · THE HEALER’S SPARROW',
    artAssetUrl: '/assets/aistudio/Gemini_Generated_Image_46i1mu46i1mu46i1.png',
    visualDirection:
      'In a quiet courtyard, older brother Nachiketa carefully bandages a brown sparrow’s broken wing while young Rudra stands holding a wooden practice mace.',
    sanjayaNarration:
      '“Nachiketa bandaged birds as a boy and soldiers of both sides as a man. He taught their mother’s lullaby to the healers in the tents.”',
    dialogueLines: [
      {
        speaker: 'NACHIKETA',
        text: '“Why do you always hit things?”',
      },
      {
        speaker: 'YOUNG RUDRA',
        text: '“So you can fix them.”',
      },
    ],
  },
  {
    id: 4,
    roman: 'SCROLL IV OF V',
    title: 'The Lesson',
    sanskritSubtitle: 'अप्रश्न · THE UNASKED QUESTION',
    artAssetUrl: '/assets/aistudio/Gemini_Generated_Image_is7maais7maais7m.png',
    visualDirection:
      'Rudra at fifteen stands in the rain of ash over a captured boy. His iron mace is raised; his hand trembles as he looks back at his father.',
    sanjayaNarration: '“His flaw was never that he picked a side. It was that he stopped asking.”',
    dialogueLines: [
      {
        speaker: 'RUDRA (AGE FIFTEEN)',
        text: '“He is a child, Father. Should I?”',
      },
      {
        speaker: 'KAALA-CHAKRA',
        text: '“A weapon does not ask. It strikes.”',
      },
      {
        speaker: 'SANJAYA',
        text: '“Rudra’s hand shook. He did it. That was the last time he asked.”',
      },
    ],
  },
  {
    id: 5,
    roman: 'SCROLL V OF V',
    title: 'The Fall of the Father',
    sanskritSubtitle: 'संजीवनी · THE SANJIVANI BARGAIN',
    artAssetUrl: '/assets/aistudio/Gemini_Generated_Image_yax76dyax76dyax7.png',
    visualDirection:
      'Shukracharya lifts a bronze bowl of glowing Sanjivani water in the dark. Kaala-Chakra reaches for it, his third eye opening with a coiled spiral mark.',
    sanjayaNarration:
      '“The asuras offered him a way to bring his wife back from inside his son’s brow. He said yes. Then he said yes again. By the time his sons were grown, he had forgotten how to say no.”',
    dialogueLines: [
      {
        speaker: 'KAALA-CHAKRA (WHISPER)',
        text: '“Forty thousand souls to light the Furnace. One harvest, and Suvarna breathes again.”',
      },
    ],
  },
];

// ============================================================================
// SECTION 5, 9, 31: THE [E] LOOK SYSTEM & STORY OBJECTS
// "Look. One button. Rudra stops and looks at a lamp, a toy, a tent flap, a ledger leaf.
//  It's optional and adds a thread. Look moments: No music. Only room tone and the object."
// ============================================================================
export interface LookObjectSpec {
  id: string;
  chamberId: number; // 0 = Vaitarani Hub Boat, 1..8 = Chambers
  x: number;
  y: number;
  title: string;
  subtitle: string;
  observation: string;
  savitriComment?: string;
  karmaReward: number;
}

export const ACT1_LOOK_OBJECTS: LookObjectSpec[] = [
  {
    id: 'boat_folded_page',
    chamberId: 1,
    x: 245,
    y: 445,
    title: 'Folded Ledger Page in Savitri’s Lantern',
    subtitle: 'LOOK SEED · VAITARANI FERRY GHAT',
    observation:
      'Tucked into the brass base of Savitri’s lantern is a water-stained sheet of figures in a young man’s hand. The column is headed YIELD. At the bottom, one hurried line: “The yield does not match the wounded. I will tell Rudra at dawn.”',
    savitriComment:
      '“Don’t unfold it near the water. I have carried that page three thousand years. I cannot read the numbers—only the last line.”',
    karmaReward: 35,
  },
  {
    id: 'tally_leaves',
    chamberId: 2,
    x: 680,
    y: 255,
    title: 'Tally-Leaves Stamped with a Spiral Mark',
    subtitle: 'LOOK SEED · CHARNEL PLAINS',
    observation:
      'A bundle of copper-bark tally-leaves bound with wire. Every leaf is stamped with a coiled spiral maker’s mark and a column headed “YIELD: SHISHIRA — EIGHTEENTH NIGHT — 40,000.” It is dated three days before the truce.',
    savitriComment: '“Someone counted them before the fire ever fell.”',
    karmaReward: 40,
  },
  {
    id: 'child_clay_lamp',
    chamberId: 3,
    x: 720,
    y: 430,
    title: 'Child’s Clay Lamp in a Chariot Wheel',
    subtitle: 'LOOK SEED · KURUKSHETRA PYRE',
    observation:
      'Wedged between the splintered spokes of a supply cart is a small clay diya lamp, its rim pinched by a child’s thumb. Perched on the iron axle above it, a brown sparrow with a crooked wing watches you in silence.',
    savitriComment: '“A watchfire does not fit in the palm of a child’s hand, Rudra.”',
    karmaReward: 45,
  },
  {
    id: 'vetala_drum_armor',
    chamberId: 4,
    x: 410,
    y: 265,
    title: 'Vetala Armor Stamped with a War-Drum',
    subtitle: 'LOOK SEED · MANDAPA OF THE WAR-DRUM',
    observation:
      'A blackened breastplate torn from a Vetala revenant. Pressed into the bronze collar is the relief of Dundubhi’s war-drum alongside the Council’s spiral seal.',
    savitriComment:
      '“That drum rang at dusk from the Council’s hill. It meant: come inside the walls, you are safe.”',
    karmaReward: 45,
  },
  {
    id: 'broken_gada_spiral',
    chamberId: 5,
    x: 640,
    y: 425,
    title: 'Maker’s Mark on the Broken Gada',
    subtitle: 'LOOK SEED · SOUL-FIRE SANCTUM',
    observation:
      'Beneath three millennia of river-silt on the haft of your own broken iron mace sits a tiny chiselled spiral—the exact mark stamped on the Shishira tally-leaves.',
    savitriComment: '“Your father forged that haft. I knew the first hour I pulled you out.”',
    karmaReward: 50,
  },
  {
    id: 'healer_tent_stake',
    chamberId: 7,
    x: 640,
    y: 270,
    title: 'Charred Tent Stake — Third from the East Gate',
    subtitle: 'LOOK SEED · SEALED GATE OF JATHARAGNI',
    observation:
      'A medicinal mortar of ground neem and a strip of linen bandage fused into glass by white fire. A brass tag reads: “TENT III · EAST GATE — NACHIKETA & ILA.”',
    savitriComment: '“A wound has no side. That was what she always said.”',
    karmaReward: 60,
  },
];

// ============================================================================
// SECTION 20: SANJAYA'S SEVEN ON-SCREEN STRIKETHROUGH CORRECTIONS
// ============================================================================
export interface SanjayaCorrectionSpec {
  id: number;
  actLabel: string;
  lieText: string;
  truthText: string;
  sanjayaContext: string;
}

export const SANJAYA_CORRECTIONS: SanjayaCorrectionSpec[] = [
  {
    id: 1,
    actLabel: 'CORRECTION I · ACT I (SHARD OF VRIKODARA)',
    lieText: 'the fortress of killers',
    truthText: 'a camp',
    sanjayaContext:
      '“Let it be written: On the Eighteenth Night, Rudra turned the Brahmashira upon...”',
  },
  {
    id: 2,
    actLabel: 'CORRECTION II · ACT II (SHARD OF VRITRA)',
    lieText: 'cursed by the god',
    truthText: 'stopped by the god',
    sanjayaContext:
      '“When the sky burned white, the Preserver descended with open hands, and Rudra was...”',
  },
  {
    id: 3,
    actLabel: 'CORRECTION III · ACT III (SHARD OF MAHABALI)',
    lieText: 'the war for heaven',
    truthText: 'the harvest',
    sanjayaContext:
      '“Kaala-Chakra gathered forty thousand souls inside the walls for...”',
  },
  {
    id: 4,
    actLabel: 'CORRECTION IV · ACT IV (SHARD OF SURPANAKHA)',
    lieText: 'Rudra, the betrayed',
    truthText: 'Rudra, who did not look',
    sanjayaContext:
      '“I was given my words. I did not see the lamps in the windows. Here stands...”',
  },
  {
    id: 5,
    actLabel: 'CORRECTION V · ACT V (SHARDS OF THE TWINS)',
    lieText: 'the Preserver, who rules heaven',
    truthText: 'the Preserver, who was locked out',
    sanjayaContext:
      '“Above the sealed gates of Amaravati waits...”',
  },
  {
    id: 6,
    actLabel: 'CORRECTION VI · ACT VI (THE SOUL FURNACE)',
    lieText: 'his father fell to the god',
    truthText: 'his father fell first',
    sanjayaContext:
      '“Time was held for one breath on the hill, and in the white fire...”',
  },
  {
    id: 7,
    actLabel: 'FINAL CHRONICLE · UNCORRECTED',
    lieText: '',
    truthText:
      'Let it be written that he was not wronged. He was forgiven, and he was not let off. And he stayed.',
    sanjayaContext: '“And over the ash of the third tent, Sanjaya read all forty thousand names.”',
  },
];

// ============================================================================
// SECTION 9: BOSS SCRIPTS, SHARD #1 MEMORY & FERRY I DIALOGUE
// ============================================================================
export const DUNDUBHI_DIALOGUE = {
  preFight: [
    {
      speaker: 'SANJAYA (CHRONICLER)',
      text: '“Dundubhi, the bronze war-drum of the Charnel Plains. When he lowers his horns and charges in a straight line, only the ruined temple pillars can catch his tusks.”',
    },
    {
      speaker: 'SAVITRI',
      text: '“Listen to his chest-drum. Watch the pillars when he charges—let the stone hold him.”',
    },
  ],
  postFight: [
    {
      speaker: 'SAVITRI',
      text: '“Look at the drum skin, Rudra. It is stamped with the spiral mark.”',
    },
    {
      speaker: 'SAVITRI',
      text: '“That drum rang at dusk, from the Council’s hill. It meant: come inside, you are safe.”',
    },
  ],
};

export const VRIKODARA_DIALOGUE = {
  preFight: [
    {
      speaker: 'VRIKODARA (BLOOD-BROTHER)',
      text: '“My son held the lamp for her. Do you remember the Shishira?”',
    },
    {
      speaker: 'RUDRA',
      text: '“There was no camp. A fortress of killers.”',
    },
    {
      speaker: 'VRIKODARA',
      text: '“Then take the shard and look.”',
    },
  ],
  phase2Transition:
    'Vrikodara swallows his iron chains, his furnace-belly roaring as he grows by half and vomits molten slag across the stone!',
  deathQuote:
    '“You did not know, brother. I could never hate you. That was what the hunger was for.”',
};

export const SHARD_1_MEMORY_SCRIPT = {
  title: 'SHARD #1 MEMORY · THE NIGHT OF ASH',
  subtitle: 'रक्तमणि स्मृति · WHAT THE STONE REMEMBERS',
  artAssetUrl: '/assets/aistudio/Gemini_Generated_Image_p8dfx9p8dfx9p8df.png',
  visualDescription:
    'Inside a canvas healer’s tent lit by a single clay lamp. A rakshasa woman binds a soldier’s shoulder while her young son holds the lamp steady with both hands. Outside the tent flap, two hundred paces up the hill, the sky turns the blinding white of a held breath. The tent vanishes. The clay lamp rolls into the ash and goes out.',
  exchanges: [
    {
      speaker: 'RUDRA',
      text: '“That could be any camp.”',
    },
    {
      speaker: 'SAVITRI (QUIETLY)',
      text: '“It could.”',
    },
  ],
  correctionIndex: 0, // Correction #1: ~~the fortress of killers~~ -> a camp
  unlockedPowerTitle: 'RAKSHASA CRUSHING STANCE UNLOCKED',
  unlockedPowerDesc:
    'Vrikodara’s furnace weight enters your Broken Gada. Heavy attacks in Smash Stance now hurl molten slag fissures forward across the arena.',
};

export const FERRY_1_SCRIPT = {
  title: 'FERRY I · THE VAITARANI CROSSING',
  subtitle: 'वैतरणी नौका · TWO PEOPLE AND A LANTERN',
  atmosphere: 'A tanpura drone, black water lapping against weathered timber, and Savitri’s lantern.',
  savitriOpening:
    '“When Ila was fourteen, she found a sparrow with a broken wing by the chariot ruts. She nursed it for three nights with warm milk and splints of reed. It died anyway. She asked me why we fix things that die. I said: so they don’t die alone.”',
  choices: [
    {
      id: 'silence' as const,
      label: '[Say nothing. Listen to the water.]',
      rudraLine: '(Rudra looks at the lantern’s reflection on the black water and says nothing.)',
      savitriReply:
        '“You are quieter than you were three thousand years ago. Good. Keep your breath for the climb.”',
    },
    {
      id: 'ask_ila' as const,
      label: '“What did Ila say to that?”',
      rudraLine: '“What did she say when you told her that?”',
      savitriReply:
        '“She buried it by the east gate and went back into the tent. She had forty wounded waiting, and a wound has no side.”',
    },
    {
      id: 'apologize' as const,
      label: '“Savitri... I am sorry.”',
      rudraLine: '“I am sorry.”',
      savitriReply:
        '“Save it. You will need it later, for someone who can use it. At the end, you answer one question: Will you still be here?”',
    },
  ],
};
