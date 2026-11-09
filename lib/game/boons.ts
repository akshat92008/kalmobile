export type ImmortalPatronId =
  | 'nezha'
  | 'erlang'
  | 'guanyin'
  | 'aoguang'
  | 'subhuti'
  | 'greatsage';

export type BoonRarity = 'Rare' | 'Epic' | 'Heroic' | 'Legendary' | 'Duo';

export type CelestialBoonId =
  | 'nezha_scorch_strike'
  | 'nezha_blazing_dash'
  | 'erlang_chain_lightning'
  | 'erlang_third_eye_crit'
  | 'guanyin_divine_deflect'
  | 'guanyin_ambrosia_gourd'
  | 'aoguang_tidal_slam'
  | 'aoguang_undertow_unleash'
  | 'subhuti_astral_qi'
  | 'subhuti_spell_mastery'
  | 'sage_phantom_echo'
  | 'sage_sovereign_breaker'
  | 'duo_agni_indra_cataclysm'
  | 'duo_varuna_rudra_riptide'
  | 'duo_ashvin_indra_mirage';

export interface ImmortalPatronSpec {
  id: ImmortalPatronId;
  name: string;
  chineseName: string;
  title: string;
  domain: string;
  accentColor: string;
  secondaryColor: string;
}

export interface CelestialBoonSpec {
  id: CelestialBoonId;
  patronId: ImmortalPatronId;
  secondaryPatronId?: ImmortalPatronId;
  name: string;
  chineseName: string;
  slotLabel: string;
  rarity: BoonRarity;
  summary: string;
  statCallout: string;
  accentColor: string;
}

export interface BoonCombatModifiers {
  damageMultiplier: number;
  attackSpeedMultiplier: number;
  critChance: number;
  critMultiplier: number;
  backstabMultiplier: number;
  dashStrikeMultiplier: number;
  postureDamageMultiplier: number;
  wallSlamMultiplier: number;
  focusGainMultiplier: number;
  spellCooldownMultiplier: number;
  scorchDps: number;
  dashFireNovaDamage: number;
  chainLightningDamage: number;
  deflectProjectilesOnDash: boolean;
  perfectDodgeHeal: number;
  gourdBonusMaxSips: number;
  gourdInstantHealRatio: number;
  echoStrikeRatio: number;
  heavyVortexPull: boolean;
  heavyBonusMultiplier: number;
  castLodgedDamageBonus: number;
}

export const IMMORTAL_PATRONS: Record<ImmortalPatronId, ImmortalPatronSpec> = {
  nezha: {
    id: 'nezha',
    name: 'Raktabeeja',
    chineseName: 'RAKTABEEJA · THE MULTIPLYING WOUND',
    title: 'Warden of the Crimson Furnace Pipes',
    domain: 'Blood-Burn Ignition & Searing Guilt',
    accentColor: '#ff5e36',
    secondaryColor: '#ffb347',
  },
  erlang: {
    id: 'erlang',
    name: 'Shumbha & Nishumbha',
    chineseName: 'SHUMBHA-NISHUMBHA · TWIN EMPERORS',
    title: 'Sovereigns of Frost & Sky-Splitting Thunder',
    domain: 'Tempest Chain Lightning & Lethal Precision',
    accentColor: '#5ce6ff',
    secondaryColor: '#c4f5ff',
  },
  guanyin: {
    id: 'guanyin',
    name: 'Madhu & Kaitabha',
    chineseName: 'MADHU-KAITABHA · THE EAR-BORN TWINS',
    title: 'Immortal Brothers Who Die Only By Choice',
    domain: 'Deflection Ward & Sanjivani Endurance',
    accentColor: '#3ee0a8',
    secondaryColor: '#a8ffdf',
  },
  aoguang: {
    id: 'aoguang',
    name: 'Vritra',
    chineseName: 'VRITRA · SWALLOWER OF THE WATERS',
    title: 'Coiled Mountain of the Drowned Stepwell',
    domain: 'Patala Undertow Knockback & Pillar Shatter',
    accentColor: '#4da6ff',
    secondaryColor: '#99ccff',
  },
  subhuti: {
    id: 'subhuti',
    name: 'Surpanakha',
    chineseName: 'SURPANAKHA · WEAVER OF DANDAKA',
    title: 'Mistress of the Weeping Banyan & Mirror-Threads',
    domain: 'Focus Generation & Memory-Shard Mastery',
    accentColor: '#e08cff',
    secondaryColor: '#f3ccff',
  },
  greatsage: {
    id: 'greatsage',
    name: 'King Mahabali',
    chineseName: 'MAHABALI · KEEPER OF THE THREE STEPS',
    title: 'Oath-Bound Master of Vishwakarma’s Forge',
    domain: 'Reforged Gada Weight & Posture Shatter',
    accentColor: '#f5c451',
    secondaryColor: '#fff0b3',
  },
};

export const CELESTIAL_BOONS: CelestialBoonSpec[] = [
  {
    id: 'nezha_scorch_strike',
    patronId: 'nezha',
    name: 'Boon of Raktabeeja’s Blood',
    chineseName: 'RAKTA DAHANA · CAUTERIZED WOUND',
    slotLabel: 'STRIKE GIFT',
    rarity: 'Epic',
    summary: 'Your Broken Gada strikes and Dash-Strikes ignite foes with boiling blood-fire, dealing searing burn damage over 3.0 seconds.',
    statCallout: '+32 Blood-Burn DoT / sec · +12% Strike Damage',
    accentColor: '#ff5e36',
  },
  {
    id: 'nezha_blazing_dash',
    patronId: 'nezha',
    name: 'Bhasmasura’s Ash-Step',
    chineseName: 'BHASMA PATHA · KILN STRIDE',
    slotLabel: 'DASH GIFT',
    rarity: 'Heroic',
    summary: 'Dashing leaves a ring of white-hot kiln ash at your origin that scorches pursuers and boosts Dash-Strike lunge damage.',
    statCallout: '72 AoE Ash-Fire Nova on Dash · +25% Dash-Strike Damage',
    accentColor: '#ff5e36',
  },
  {
    id: 'erlang_chain_lightning',
    patronId: 'erlang',
    name: 'Nishumbha’s Thunder-Axe',
    chineseName: 'AMARAVATI VAJRA · STORM ARC',
    slotLabel: 'TEMPEST GIFT',
    rarity: 'Heroic',
    summary: 'Every Gada strike unleashes jagged purple storm-lightning from Amaravati that arcs across up to 3 nearby enemies.',
    statCallout: '48 Chain Lightning Damage (3 bounces)',
    accentColor: '#5ce6ff',
  },
  {
    id: 'erlang_third_eye_crit',
    patronId: 'erlang',
    name: 'Shumbha’s Lunar Chakram',
    chineseName: 'SHUMBHA CHAKRA · COLD PRECISION',
    slotLabel: 'PRECISION GIFT',
    rarity: 'Legendary',
    summary: 'Grants all Gada strikes a high Critical Strike chance and massively amplifies strikes landed from behind.',
    statCallout: '+24% Crit Chance (1.75x) · +80% Backstab Damage',
    accentColor: '#5ce6ff',
  },
  {
    id: 'guanyin_divine_deflect',
    patronId: 'guanyin',
    name: 'Madhu’s Unchosen Death',
    chineseName: 'MADHU VARA · DEFIANT PARRY',
    slotLabel: 'DEFLECT GIFT',
    rarity: 'Heroic',
    summary: 'Dashes and Combo Finishers deflect incoming enemy arrows & orbs back at 2.5x damage. Perfect Dodges restore Vitality.',
    statCallout: '250% Projectile Deflect · +12 HP on Perfect Dodge',
    accentColor: '#3ee0a8',
  },
  {
    id: 'guanyin_ambrosia_gourd',
    patronId: 'guanyin',
    name: 'Kaitabha’s Sanjivani Sip',
    chineseName: 'SANJIVANI · ASHEN RESURRECTION',
    slotLabel: 'VITALITY GIFT',
    rarity: 'Rare',
    summary: 'Adds +1 Max Amrita Kalasha charge and empowers every draught with Shukracharya’s Sanjivani rite.',
    statCallout: '+50% Kalasha Heal Ratio · +1 Max Kalasha Sip',
    accentColor: '#3ee0a8',
  },
  {
    id: 'aoguang_tidal_slam',
    patronId: 'aoguang',
    name: 'Vritra’s Crushing Tide',
    chineseName: 'PATALA VEGA · DROWNED WALL-SLAM',
    slotLabel: 'KNOCKBACK GIFT',
    rarity: 'Epic',
    summary: 'Your Gada strikes hurl enemies back like a dam breaking. Enemies slammed into pillars or walls suffer massive shatter damage.',
    statCallout: '+90% Wall-Slam Damage & Posture Shatter',
    accentColor: '#4da6ff',
  },
  {
    id: 'aoguang_undertow_unleash',
    patronId: 'aoguang',
    name: 'Vrikodara’s Furnace-Belly Pull',
    chineseName: 'VRIKODARA KSHUDHA · HUNGER VORTEX',
    slotLabel: 'UNLEASH GIFT',
    rarity: 'Heroic',
    summary: 'Stance Heavy Unleash pulls surrounding foes inward into a starving furnace vortex and deals +35% Heavy Damage.',
    statCallout: '+35% Stance Unleash Damage · Furnace Vortex Pull',
    accentColor: '#4da6ff',
  },
  {
    id: 'subhuti_astral_qi',
    patronId: 'subhuti',
    name: 'Surpanakha’s Razor Loom',
    chineseName: 'DANDAKA TANTU · GRIEF FOCUS',
    slotLabel: 'FOCUS GIFT',
    rarity: 'Epic',
    summary: 'Accelerates Focus Orb generation from all Gada strikes by +60% and grants +1 instant Focus Orb at the start of each arena.',
    statCallout: '+60% Focus Charge Rate · +1 Instant Focus Orb',
    accentColor: '#e08cff',
  },
  {
    id: 'subhuti_spell_mastery',
    patronId: 'subhuti',
    name: 'Maricha’s Mirror Antler',
    chineseName: 'MARICHA MAYA · SHARD ECHO',
    slotLabel: 'MEMORY GIFT',
    rarity: 'Heroic',
    summary: 'Reduces cooldowns of all Mani-Shard Arts and Guard Parries by 32% and amplifies damage against snared targets.',
    statCallout: '-32% All Shard Art Cooldowns · +20% Snared Amp',
    accentColor: '#e08cff',
  },
  {
    id: 'sage_phantom_echo',
    patronId: 'greatsage',
    name: 'Maya-Chhaya Shadow Twin',
    chineseName: 'MAYA CHHAYA · THE GUILT THAT MIRRORS',
    slotLabel: 'SHADOW GIFT',
    rarity: 'Legendary',
    summary: 'Increases Attack Speed by +20% and causes every Gada swing to project a shadow-clone of the Night of Ash for 35% bonus damage.',
    statCallout: '+20% Attack Speed · +35% Maya-Chhaya Echo Hit',
    accentColor: '#f5c451',
  },
  {
    id: 'sage_sovereign_breaker',
    patronId: 'greatsage',
    name: 'Mahabali’s Third Step',
    chineseName: 'BALI VIKRAMA · OATH-BREAKER',
    slotLabel: 'POSTURE GIFT',
    rarity: 'Legendary',
    summary: 'The weight of Mahabali’s kept oath shatters enemy and Warden Posture 45% faster and increases all Gada damage by +15%.',
    statCallout: '+45% Posture Damage · +15% All Gada Damage',
    accentColor: '#f5c451',
  },
  // ASURA DUO SYNERGY GIFTS
  {
    id: 'duo_agni_indra_cataclysm',
    patronId: 'nezha',
    secondaryPatronId: 'erlang',
    name: 'Pact of the Burning Sabha',
    chineseName: 'DUO GIFT · RAKTABEEJA × SHUMBHA',
    slotLabel: 'ASURA DUO',
    rarity: 'Duo',
    summary: 'Foes burning from Raktabeeja’s Blood are struck by doubly lethal Amaravati Storm-Lightning on every Gada swing and Dash.',
    statCallout: '+45 Chain Lightning · +28 Blood-Burn DPS · +20% Crit Mult',
    accentColor: '#a8ff78',
  },
  {
    id: 'duo_varuna_rudra_riptide',
    patronId: 'aoguang',
    secondaryPatronId: 'greatsage',
    name: 'Weight of the Drowned Forge',
    chineseName: 'DUO GIFT · VRITRA × MAHABALI',
    slotLabel: 'ASURA DUO',
    rarity: 'Duo',
    summary: 'Heavy Unleash Vortex Pull and Pillar Wall-Slams crush enemy Posture and amplify all Gada strike damage by +30%.',
    statCallout: '+30% All Damage · +40% Posture Shatter · Vortex Pull',
    accentColor: '#a8ff78',
  },
  {
    id: 'duo_ashvin_indra_mirage',
    patronId: 'guanyin',
    secondaryPatronId: 'erlang',
    name: 'Rahu’s Eclipse Mirage',
    chineseName: 'DUO GIFT · MADHU × NISHUMBHA',
    slotLabel: 'ASURA DUO',
    rarity: 'Duo',
    summary: 'Dashing automatically deflects projectiles, restores +18 HP on Perfect Dodge, and guarantees Critical Dash-Strikes.',
    statCallout: '+35% Dash-Strike · Auto-Deflect · +18 HP Perfect Dodge',
    accentColor: '#a8ff78',
  },
];

export function getBoonById(id: CelestialBoonId): CelestialBoonSpec {
  const found = CELESTIAL_BOONS.find((b) => b.id === id);
  if (!found) {
    throw new Error(`Unknown CelestialBoonId: ${id}`);
  }
  return found;
}

export function computeBoonModifiers(activeBoons: CelestialBoonId[]): BoonCombatModifiers {
  const set = new Set<CelestialBoonId>(activeBoons);

  let damageMultiplier = 1.0;
  let attackSpeedMultiplier = 1.0;
  let critChance = 0.06; // Base 6% critical chance
  let critMultiplier = 1.75;
  let backstabMultiplier = 1.35; // Base +35% Hades Shadow Strike when attacking from behind
  let dashStrikeMultiplier = 1.35; // Base 1.35x Hades Dash-Strike lunge multiplier
  let postureDamageMultiplier = 1.0;
  let wallSlamMultiplier = 1.0;
  let focusGainMultiplier = 1.0;
  let spellCooldownMultiplier = 1.0;
  let scorchDps = 0;
  let dashFireNovaDamage = 0;
  let chainLightningDamage = 0;
  let deflectProjectilesOnDash = false;
  let perfectDodgeHeal = 0;
  let gourdBonusMaxSips = 0;
  let gourdInstantHealRatio = 0;
  let echoStrikeRatio = 0;
  let heavyVortexPull = false;
  let heavyBonusMultiplier = 1.0;
  let castLodgedDamageBonus = 0.25; // Base +25% damage per lodged Agni Blood-Shard Cast

  if (set.has('nezha_scorch_strike')) {
    damageMultiplier += 0.12;
    scorchDps += 32;
  }
  if (set.has('nezha_blazing_dash')) {
    dashFireNovaDamage += 72;
    dashStrikeMultiplier += 0.25;
  }
  if (set.has('erlang_chain_lightning')) {
    chainLightningDamage += 48;
  }
  if (set.has('erlang_third_eye_crit')) {
    critChance += 0.24;
    backstabMultiplier = 1.80;
  }
  if (set.has('guanyin_divine_deflect')) {
    deflectProjectilesOnDash = true;
    perfectDodgeHeal += 12;
  }
  if (set.has('guanyin_ambrosia_gourd')) {
    gourdBonusMaxSips += 1;
    gourdInstantHealRatio += 0.5;
  }
  if (set.has('aoguang_tidal_slam')) {
    wallSlamMultiplier += 0.9;
  }
  if (set.has('aoguang_undertow_unleash')) {
    heavyVortexPull = true;
    heavyBonusMultiplier += 0.35;
  }
  if (set.has('subhuti_astral_qi')) {
    focusGainMultiplier += 0.6;
  }
  if (set.has('subhuti_spell_mastery')) {
    spellCooldownMultiplier = 0.68;
    castLodgedDamageBonus += 0.20;
  }
  if (set.has('sage_phantom_echo')) {
    attackSpeedMultiplier += 0.2;
    echoStrikeRatio = 0.35;
  }
  if (set.has('sage_sovereign_breaker')) {
    postureDamageMultiplier += 0.45;
    damageMultiplier += 0.15;
  }

  // Duo Boon Synergies
  if (set.has('duo_agni_indra_cataclysm')) {
    chainLightningDamage += 45;
    scorchDps += 28;
    critMultiplier += 0.2;
  }
  if (set.has('duo_varuna_rudra_riptide')) {
    damageMultiplier += 0.3;
    postureDamageMultiplier += 0.4;
    heavyVortexPull = true;
    castLodgedDamageBonus += 0.15;
  }
  if (set.has('duo_ashvin_indra_mirage')) {
    deflectProjectilesOnDash = true;
    perfectDodgeHeal += 18;
    dashStrikeMultiplier += 0.35;
    critChance += 0.15;
  }

  return {
    damageMultiplier: Number(damageMultiplier.toFixed(2)),
    attackSpeedMultiplier: Number(attackSpeedMultiplier.toFixed(2)),
    critChance: Number(critChance.toFixed(2)),
    critMultiplier: Number(critMultiplier.toFixed(2)),
    backstabMultiplier: Number(backstabMultiplier.toFixed(2)),
    dashStrikeMultiplier: Number(dashStrikeMultiplier.toFixed(2)),
    postureDamageMultiplier: Number(postureDamageMultiplier.toFixed(2)),
    wallSlamMultiplier: Number(wallSlamMultiplier.toFixed(2)),
    focusGainMultiplier: Number(focusGainMultiplier.toFixed(2)),
    spellCooldownMultiplier: Number(spellCooldownMultiplier.toFixed(2)),
    scorchDps,
    dashFireNovaDamage,
    chainLightningDamage,
    deflectProjectilesOnDash,
    perfectDodgeHeal,
    gourdBonusMaxSips,
    gourdInstantHealRatio,
    echoStrikeRatio,
    heavyVortexPull,
    heavyBonusMultiplier: Number(heavyBonusMultiplier.toFixed(2)),
    castLodgedDamageBonus: Number(castLodgedDamageBonus.toFixed(2)),
  };
}

/**
 * Computes dynamic Hades-style weapon slash & dash colors based on equipped Patron Boons.
 */
export function getActiveSlashPalette(
  activeBoons: CelestialBoonId[],
  stance: 'smash' | 'pillar' | 'thrust'
): {
  outerEdge: string;
  midCore: string;
  innerRibbon: string;
  boltPrimary: string;
  boltSecondary: string;
} {
  const hasPatron = (p: ImmortalPatronId) =>
    activeBoons.some((id) => {
      const b = CELESTIAL_BOONS.find((item) => item.id === id);
      return b?.patronId === p || b?.secondaryPatronId === p;
    });

  if (hasPatron('nezha') && hasPatron('erlang')) {
    return {
      outerEdge: 'rgba(255, 78, 36, 0.96)',
      midCore: 'rgba(255, 232, 92, 0.98)',
      innerRibbon: 'rgba(92, 230, 255, 0.96)',
      boltPrimary: '#ffe85c',
      boltSecondary: '#5ce6ff',
    };
  }
  if (hasPatron('erlang')) {
    return {
      outerEdge: 'rgba(56, 232, 255, 0.95)',
      midCore: 'rgba(255, 238, 115, 0.98)',
      innerRibbon: 'rgba(185, 248, 255, 0.96)',
      boltPrimary: '#5ce6ff',
      boltSecondary: '#ffee73',
    };
  }
  if (hasPatron('guanyin')) {
    return {
      outerEdge: 'rgba(62, 224, 168, 0.95)',
      midCore: 'rgba(255, 230, 128, 0.96)',
      innerRibbon: 'rgba(168, 255, 223, 0.95)',
      boltPrimary: '#3ee0a8',
      boltSecondary: '#ffe680',
    };
  }
  if (hasPatron('aoguang')) {
    return {
      outerEdge: 'rgba(56, 152, 255, 0.95)',
      midCore: 'rgba(92, 230, 255, 0.96)',
      innerRibbon: 'rgba(255, 225, 110, 0.95)',
      boltPrimary: '#4da6ff',
      boltSecondary: '#5ce6ff',
    };
  }

  // Default Zagreus / Rudra Stance Palette (Blood-Crimson, Lightning Gold, Electric Cyan)
  return {
    outerEdge:
      stance === 'pillar'
        ? 'rgba(56, 232, 255, 0.94)'
        : stance === 'thrust'
        ? 'rgba(232, 62, 255, 0.94)'
        : 'rgba(255, 42, 58, 0.95)',
    midCore: 'rgba(255, 225, 77, 0.96)',
    innerRibbon: 'rgba(56, 232, 255, 0.95)',
    boltPrimary: '#ffe14d',
    boltSecondary: '#38e8ff',
  };
}

/**
 * Hades-style Shadow Strike (Backstab) detection:
 * Returns true if the player is positioned behind the enemy relative to the enemy's facing direction.
 */
export function isShadowStrikeBackstab(input: {
  playerX: number;
  enemyX: number;
  enemyFacing: 1 | -1;
}): boolean {
  const dx = input.playerX - input.enemyX;
  // If enemy faces right (+1), behind is dx < -8; if enemy faces left (-1), behind is dx > 8
  return input.enemyFacing === 1 ? dx < -8 : dx > 8;
}

/**
 * Rolls 3 distinct Celestial Boons not yet owned by the player.
 * Unlocks Duo Boons automatically when the player holds blessings from at least 2 Patrons!
 */
export function rollCelestialBoonOffer(
  ownedBoons: CelestialBoonId[],
  rng: () => number = Math.random
): CelestialBoonSpec[] {
  const ownedSet = new Set(ownedBoons);
  const ownedPatrons = new Set<ImmortalPatronId>();
  ownedBoons.forEach((id) => {
    const found = CELESTIAL_BOONS.find((b) => b.id === id);
    if (found) ownedPatrons.add(found.patronId);
  });

  const pool = CELESTIAL_BOONS.filter((b) => {
    if (ownedSet.has(b.id)) return false;
    if (b.rarity === 'Duo' && b.secondaryPatronId) {
      // Unlock Duo Boon if the player has at least 1 blessing from either patron (or 2+ total boons)
      return (
        (ownedPatrons.has(b.patronId) && ownedPatrons.has(b.secondaryPatronId)) ||
        (ownedBoons.length >= 2 && (ownedPatrons.has(b.patronId) || ownedPatrons.has(b.secondaryPatronId)))
      );
    }
    return true;
  });
  const source = [...pool];

  const picked: CelestialBoonSpec[] = [];
  // If a Duo Boon is eligible, give it a high chance to appear in slot 1!
  const eligibleDuos = source.filter((b) => b.rarity === 'Duo');
  if (eligibleDuos.length > 0 && rng() < 0.65) {
    const duoPick = eligibleDuos[Math.floor(rng() * eligibleDuos.length)];
    picked.push(duoPick);
    const removeIdx = source.findIndex((s) => s.id === duoPick.id);
    if (removeIdx >= 0) source.splice(removeIdx, 1);
  }

  while (picked.length < 3 && source.length > 0) {
    const idx = Math.min(source.length - 1, Math.floor(rng() * source.length));
    picked.push(source[idx]);
    source.splice(idx, 1);
  }
  return picked;
}
