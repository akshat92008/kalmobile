// Central Asset Manifest & 8-Chamber 30-Minute Vertical Slice Progression for Kaliyuga: The Bleeding Crown
import { WEAPON_CONFIGS, WeaponId } from './rules';
export { WEAPON_CONFIGS };
export type { WeaponId };

export type PropType = 'incense_cauldron' | 'pagoda_lantern' | 'weapon_rack' | 'dragon_pillar';
export type EnemyTrait = 'vajra_shield' | 'agni_aura' | 'rakshasa_frenzy';

export interface ChamberBrazier {
  x: number;
  y: number;
  color: string;
  radius: number;
}

export interface ChamberPropSpec {
  type: PropType;
  x: number;
  y: number;
}

export type Warden3DRigKey =
  | 'wolf_guai'
  | 'fire_monk'
  | 'stone_golem'
  | 'furnace_titan'
  | 'sovereign_titan';

export interface ChamberSpawnSpec {
  type: 'wolf_guai' | 'fire_monk' | 'stone_golem' | 'furnace_titan' | 'xuemo' | 'vrikodara';
  x: number;
  y: number;
  delay?: number;
  wave?: 1 | 2 | 3;
  trait?: EnemyTrait;
  wardenRigKey?: Warden3DRigKey;
  wardenTitle?: string;
}

export interface ChamberSpec {
  id: number;
  chapterTitle: string;
  name: string;
  chineseSubtitle: string;
  sanjayaQuote: string;
  strikethroughLie?: string;
  sanjayaStrikethrough?: string;
  sanjayaCorrection?: string;
  dialogueSpeaker?: string;
  dialogueLine?: string;
  backgroundUrl: string;
  unlockedBackgroundUrl?: string;
  phase2BackgroundUrl?: string;
  floorTint: string;
  isBossChamber: boolean;
  envEffect: 'blood_river' | 'lava_fissures' | 'sacred_mist' | 'eclipse_wind';
  braziers: ChamberBrazier[];
  props: ChamberPropSpec[];
  spawns: ChamberSpawnSpec[];
}

export const GAME_ASSETS = {
  // Full-bleed Homescreen Cinematic MP4 Video (Muted) & Key Art Fallbacks from Repository
  titleVideo: '/videos/Warrior_standing_on_battlefield_e09ae2f5.mp4',
  titleVideo1080p: '/videos/Warrior_standing_on_battlefield_e09ae2f5_1080p.mp4',
  titleVideo720p: '/videos/Warrior_standing_on_battlefield_e09ae2f5.mp4',
  titleBackdrop: '/assets/aistudio/Blood_Eclipsed_Warrior_of_the_Ruins.png',
  deathBackdrop: '/assets/aistudio/Crimson_Underworld_River_of_the_Drowned_Warrior.png',
  eclipsePortrait: '/assets/aistudio/Warrior_Beneath_the_Blood_Eclipse.png',

  // Official Orchestral & Vedic Metal MP3 Soundtracks from Repository
  soundtracks: {
    beforeIronGate: '/assets/aistudio/Before_the_Iron_Gate.mp3',
    ironChariotsOfTheSun: '/assets/aistudio/Iron_Chariots_of_the_Sun.mp3',
    whereBronzeGodsWeep: '/assets/aistudio/Where_Bronze_Gods_Weep.mp3',
    judgmentAtRuinedGate: '/assets/aistudio/Judgment_at_the_Ruined_Gate.mp3',
    mahadevaRising: '/assets/aistudio/Ma_de_va_Rising.mp3',
    titansFinalStride: '/assets/aistudio/The_Titan_s_Final_Stride.mp3',
  },

  // Real WAV Combat & Event Sound Effects from Repository
  sfx: {
    combatPunch: '/audio/sfx/mixkit-martial-arts-fast-punch-2047.wav',
    bloodImpact: '/audio/sfx/mixkit-game-blood-pop-slide-2363.wav',
    ominousDrums: '/audio/sfx/mixkit-ominous-drums-227.wav',
    levelCompleted: '/audio/sfx/mixkit-game-level-completed-2059.wav',
    playerDefeat: '/audio/sfx/mixkit-player-losing-or-failing-2042.wav',
    dodgeJump: '/audio/sfx/mixkit-player-jumping-in-a-video-game-2043.wav',
    stageLevelMusic: '/audio/sfx/mixkit-game-level-music-689.wav',
  },

  // Bespoke Uploaded AAA Combat Slash Arc & Blazing Agneyastra Fire-Arrow Sprites
  bespokeSlashArc: '/assets/aistudio/Gemini_Generated_Image_yqk4evyqk4evyqk4.png',
  agneyastraArrow: '/assets/aistudio/Gemini_Generated_Image_1kb7hh1kb7hh1kb7.png',

  // Real-Time 3D FBX Models, Skeletal Animations & PBR Textures for Rudra, Dundubhi & Vrikodara
  models3d: {
    dundubhiFbx:
      '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/Meshy_AI_Runebound_Minotaur_Warlord_Animations.fbx',
    dundubhiAnims: {
      idle: '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/mutant_idle.fbx',
      walk: '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/mutant_run.fbx',
      run: '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/mutant_run.fbx',
      swipe: '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/mutant_swiping.fbx',
      slash: '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/mutant_swiping.fbx',
      jumpAttack:
        '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/mutant_jump_attack.fbx',
      kick: '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/mutant_jump_attack.fbx',
      roar: '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/mutant_roaring.fbx',
      hit: '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/mutant_idle.fbx',
      death: '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/mutant_idle.fbx',
    },
    dundubhiTex: {
      baseColor:
        '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture.png',
      normal:
        '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_normal.png',
      metallic:
        '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_metallic.png',
      roughness:
        '/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_roughness.png',
      weaponBaseColor:
        '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.png',
    },
    vrikodaraFbx:
      '/models/Meshy_AI_Crimson_Skull_Warlord_biped/Meshy_AI_Crimson_Skull_Warlord_biped_Animation_Running_withSkin.fbx',
    vrikodaraTex: {
      baseColor:
        '/models/Meshy_AI_Crimson_Skull_Warlord_biped/Meshy_AI_Crimson_Skull_Warlord_biped_texture_0.png',
      diffuse:
        '/models/Meshy_AI_Crimson_Skull_Warlord_biped/Meshy_AI_Crimson_Skull_Warlord_biped_texture_0.png',
      normal:
        '/models/Meshy_AI_Crimson_Skull_Warlord_biped/Meshy_AI_Crimson_Skull_Warlord_biped_texture_0_normal.png',
      metallic:
        '/models/Meshy_AI_Crimson_Skull_Warlord_biped/Meshy_AI_Crimson_Skull_Warlord_biped_texture_0_metallic.png',
      roughness:
        '/models/Meshy_AI_Crimson_Skull_Warlord_biped/Meshy_AI_Crimson_Skull_Warlord_biped_texture_0_roughness.png',
      specular:
        '/models/Meshy_AI_Crimson_Skull_Warlord_biped/Meshy_AI_Crimson_Skull_Warlord_biped_texture_0_metallic.png',
    },
    tridentFbx:
      '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.fbx',
    tridentTex: {
      baseColor:
        '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.png',
      metallic:
        '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_metallic.png',
      normal:
        '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_normal.png',
      roughness:
        '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_roughness.png',
    },
    rudraMergedFbx:
      '/models/Meshy_AI_Ashen_Warborn_biped/Meshy_AI_Ashen_Warborn_biped_Meshy_Merged_Animations.fbx',
    bloodboundTitanFbx:
      '/models/Meshy_AI_Bloodbound_Titan_1025042731_texture_fbx/Meshy_AI_Bloodbound_Titan_1025042731_texture.fbx',
    bloodboundWarlordFbx:
      '/models/Meshy_AI_Bloodbound_Warlord_1025041901_texture_fbx/Meshy_AI_Bloodbound_Warlord_1025041901_texture.fbx',
    crimsonSkullWarlord: {
      runFbx:
        '/models/Meshy_AI_Crimson_Skull_Warlord_biped/Meshy_AI_Crimson_Skull_Warlord_biped_Animation_Running_withSkin.fbx',
      textures: {
        baseColor:
          '/models/Meshy_AI_Crimson_Skull_Warlord_biped/Meshy_AI_Crimson_Skull_Warlord_biped_texture_0.png',
        normal:
          '/models/Meshy_AI_Crimson_Skull_Warlord_biped/Meshy_AI_Crimson_Skull_Warlord_biped_texture_0_normal.png',
        roughness:
          '/models/Meshy_AI_Crimson_Skull_Warlord_biped/Meshy_AI_Crimson_Skull_Warlord_biped_texture_0_roughness.png',
        metalness:
          '/models/Meshy_AI_Crimson_Skull_Warlord_biped/Meshy_AI_Crimson_Skull_Warlord_biped_texture_0_metallic.png',
      },
    },
    skullcladWarlord: {
      meshFbx:
        '/models/Meshy_AI_Skullclad_Warlord_20261031_texture_fbx/Meshy_AI_Skullclad_Warlord_20261031_texture.fbx',
      textures: {
        baseColor:
          '/models/Meshy_AI_Skullclad_Warlord_20261031_texture_fbx/Meshy_AI_Skullclad_Warlord_20261031_texture.png',
        normal:
          '/models/Meshy_AI_Skullclad_Warlord_20261031_texture_fbx/Meshy_AI_Skullclad_Warlord_20261031_texture_normal.png',
        roughness:
          '/models/Meshy_AI_Skullclad_Warlord_20261031_texture_fbx/Meshy_AI_Skullclad_Warlord_20261031_texture_roughness.png',
        metalness:
          '/models/Meshy_AI_Skullclad_Warlord_20261031_texture_fbx/Meshy_AI_Skullclad_Warlord_20261031_texture_metallic.png',
      },
    },
    hornedBloodforgeWarlord: {
      meshFbx:
        '/models/Meshy_AI_Horned_Warlord_of_the_Bloodforge_20261031_texture_fbx/Meshy_AI_Horned_Warlord_of_the_Bloodforge_20261031_texture.fbx',
      textures: {
        baseColor:
          '/models/Meshy_AI_Horned_Warlord_of_the_Bloodforge_20261031_texture_fbx/Meshy_AI_Horned_Warlord_of_the_Bloodforge_20261031_texture.png',
        normal:
          '/models/Meshy_AI_Horned_Warlord_of_the_Bloodforge_20261031_texture_fbx/Meshy_AI_Horned_Warlord_of_the_Bloodforge_20261031_texture_normal.png',
        roughness:
          '/models/Meshy_AI_Horned_Warlord_of_the_Bloodforge_20261031_texture_fbx/Meshy_AI_Horned_Warlord_of_the_Bloodforge_20261031_texture_roughness.png',
        metalness:
          '/models/Meshy_AI_Horned_Warlord_of_the_Bloodforge_20261031_texture_fbx/Meshy_AI_Horned_Warlord_of_the_Bloodforge_20261031_texture_metallic.png',
      },
    },
    moltenWarlord: {
      meshFbx:
        '/models/Meshy_AI_Molten_Warlord_20261031_texture_fbx/Meshy_AI_Molten_Warlord_20261031_texture.fbx',
      textures: {
        baseColor:
          '/models/Meshy_AI_Molten_Warlord_20261031_texture_fbx/Meshy_AI_Molten_Warlord_20261031_texture.png',
        normal:
          '/models/Meshy_AI_Molten_Warlord_20261031_texture_fbx/Meshy_AI_Molten_Warlord_20261031_texture_normal.png',
        roughness:
          '/models/Meshy_AI_Molten_Warlord_20261031_texture_fbx/Meshy_AI_Molten_Warlord_20261031_texture_roughness.png',
        metalness:
          '/models/Meshy_AI_Molten_Warlord_20261031_texture_fbx/Meshy_AI_Molten_Warlord_20261031_texture_metallic.png',
      },
    },
    sovereignEternalWheel: {
      meshFbx:
        '/models/Meshy_AI_Sovereign_of_the_Eternal_Wheel_20261031_texture_fbx/Meshy_AI_Sovereign_of_the_Eternal_Wheel_20261031_texture.fbx',
      textures: {
        baseColor:
          '/models/Meshy_AI_Sovereign_of_the_Eternal_Wheel_20261031_texture_fbx/Meshy_AI_Sovereign_of_the_Eternal_Wheel_20261031_texture.png',
        normal:
          '/models/Meshy_AI_Sovereign_of_the_Eternal_Wheel_20261031_texture_fbx/Meshy_AI_Sovereign_of_the_Eternal_Wheel_20261031_texture_normal.png',
        roughness:
          '/models/Meshy_AI_Sovereign_of_the_Eternal_Wheel_20261031_texture_fbx/Meshy_AI_Sovereign_of_the_Eternal_Wheel_20261031_texture_roughness.png',
        metalness:
          '/models/Meshy_AI_Sovereign_of_the_Eternal_Wheel_20261031_texture_fbx/Meshy_AI_Sovereign_of_the_Eternal_Wheel_20261031_texture_metallic.png',
      },
    },
  },

  // Dedicated Hades-Style Character Portraits & Prologue/Cutscene Paintings (v7 Asset Bible)
  portraits: {
    savitri: '/assets/aistudio/Gemini_Generated_Image_kokt4ckokt4ckokt.png',
    sanjaya: '/assets/aistudio/Gemini_Generated_Image_f67jx9f67jx9f67j.png',
    dundubhi: '/assets/aistudio/Gemini_Generated_Image_48dcqm48dcqm48dc.png',
    vrikodara: '/assets/aistudio/Crimson_Demon_King_with_Spiked_Mace_59d3e4e5.png',
    vrikodaraLegacy: '/assets/aistudio/Gemini_Generated_Image_1pfq2k1pfq2k1pfq.png',
    rudra: '/assets/aistudio/Warrior_Beneath_the_Blood_Eclipse.png',
    preserver: '/assets/aistudio/Majestic Blue-Gold Divine Guardian.png',
  },
  scrolls: {
    scroll1Churning: '/assets/aistudio/Gemini_Generated_Image_pw6vhspw6vhspw6v.png',
    scroll2ChildAndMani: '/assets/aistudio/Gemini_Generated_Image_laj3yelaj3yelaj3.png',
    scroll3TwoBrothers: '/assets/aistudio/Gemini_Generated_Image_46i1mu46i1mu46i1.png',
    scroll4TheLesson: '/assets/aistudio/Gemini_Generated_Image_is7maais7maais7m.png',
    scroll5FallOfFather: '/assets/aistudio/Gemini_Generated_Image_yax76dyax76dyax7.png',
  },
  cutscenes: {
    shard1HealerTent: '/assets/aistudio/Gemini_Generated_Image_p8dfx9p8dfx9p8df.png',
  },

  // Hand-Painted 16:9 Isometric Indian Kurukshetra & Kaliyuga Chamber Arenas (Zero Wukong/Chinese Arenas)
  chambers: {
    vaitaraniGhat: '/assets/aistudio/Gemini_Generated_Image_vjfugjvjfugjvjfu_d880974a.png',
    raktabijaCourtyard: '/assets/aistudio/Gemini_Generated_Image_bmq158bmq158bmq1_a3eaf68a.png',
    chariotBonefield: '/assets/aistudio/Gemini_Generated_Image_ey07c4ey07c4ey07_1de21fb8.png',
    warDrumColonnade: '/assets/aistudio/Gemini_Generated_Image_c0fyyc0fyyc0fyyc_4d7dcd20.png',
    soulFireSanctum: '/assets/aistudio/Gemini_Generated_Image_acbxb7acbxb7acbx_9e34bd2e.png',
    gopuramCauseway: '/assets/aistudio/Gemini_Generated_Image_c0fyyc0fyyc0fyyc_4d7dcd20.png',
    asuraLavaLocked: '/assets/aistudio/Gemini_Generated_Image_u58tfju58tfju58t_2d5d830a.png',
    asuraLavaUnlocked: '/assets/aistudio/Gemini_Generated_Image_8jz0rn8jz0rn8jz0_9c7ece82.png',
    bossSanctumPhase1: '/assets/aistudio/Gemini_Generated_Image_25mxvb25mxvb25mx_d4637a39.png',
    bossSanctumPhase2Eclipse: '/assets/aistudio/Gemini_Generated_Image_9sbc7m9sbc7m9sbc_0cf239b7.png',
  },

  // Hand-Painted VFX, Telegraphs, Slash Smears, Traps, Gates, Braziers & Overhangs
  vedicCombatVfx2x2: '/assets/aistudio/CB33122A-A9C1-4A00-8F0C-6B65EE5BF3AE_af214fc9.png',
  vfxSlash2x2: '/assets/aistudio/Gemini_Generated_Image_kwhb8qkwhb8qkwhb_adfa1bcf.png',
  vfxSkullAndLotus2x2: '/assets/aistudio/Gemini_Generated_Image_smm68fsmm68fsmm6_cc64e922.png',
  agniSlashArcAlt: '/assets/aistudio/Gemini_Generated_Image_a51igxa51igxa51i_b0633fb2.png',
  groundDecals2x2: '/assets/aistudio/Gemini_Generated_Image_o86abro86abro86a_6a82a5ae.png',
  groundRuptures2x2: '/assets/aistudio/Gemini_Generated_Image_96efot96efot96ef_92a05ba5.png',
  moltenCraterDecal: '/assets/aistudio/Gemini_Generated_Image_42ht5k42ht5k42ht_d2fecf3a.png',
  combatImpacts2x2: '/assets/aistudio/Gemini_Generated_Image_2n0p172n0p172n0p_4fba9427.png',
  floorTraps2x2: '/assets/aistudio/Gemini_Generated_Image_zhy8c6zhy8c6zhy8_5d2df495.png',
  lionPillarAndTraps2x2: '/assets/aistudio/Gemini_Generated_Image_u7yyaau7yyaau7yy_0b479608.png',
  brazierFlame4x1: '/assets/aistudio/Gemini_Generated_Image_vqynauvqynauvqyn_da9af05e.png',
  exitGateArchways2x1: '/assets/aistudio/Gemini_Generated_Image_gcf89kgcf89kgcf8_26c0ebb5.png',
  gateOverlays2x2: '/assets/aistudio/Gemini_Generated_Image_5bgscc5bgscc5bgs_07c760f9.png',
  rewardOrbs2x2: '/assets/aistudio/Gemini_Generated_Image_e4v7n9e4v7n9e4v7_05a48632.png',
  foregroundOverhangsA2x2: '/assets/aistudio/Gemini_Generated_Image_glxj9tglxj9tglxj_b076ead2.png',
  foregroundOverhangsB2x2: '/assets/aistudio/Gemini_Generated_Image_9eap7c9eap7c9eap_6d0dfd02.png',

  // Bespoke 4-Frame (1x4) Narrative Character Sprite Sheets (Savitri & Sanjaya — Non-Combat Story Guides)
  companionSheets: {
    savitriSheet4x1: '/assets/aistudio/0BF73362-5404-4715-B6EB-8509CBCF9B51_953bec3b.png',
    sanjayaSheet4x1: '/assets/aistudio/1359D234-AC6C-4877-90EA-DC9626625207_b481d2cd.png',
  },

  // Multi-Row Green-Screen & 2x2 Hand-Painted Boss Sprite Sheets (Dundubhi & Vrikodara)
  bossSheets: {
    dundubhiMinotaurSheetP1: '/assets/aistudio/Minotaur_Warrior_Sprite_Animation_Sheet-4_0e907cc4.png',
    dundubhiMinotaurSheetP2: '/assets/aistudio/Horned_Warrior_Animation_Sprite_Sheet-3_435b3144.png',
    vrikodaraDemonicKingSheet: '/assets/aistudio/Demonic_King_Action_Sprite_Sheet_952b9b46.png',
    dundubhiPhase1SheetA2x2: '/assets/aistudio/35922E13-6015-481F-8ABF-723988E0F89C_8e007552.png',
    dundubhiPhase1SheetB2x2: '/assets/aistudio/565576C2-F6B7-4179-94FD-2534E706355F_b28aa5ba.png',
    dundubhiPhase2Sheet2x2: '/assets/aistudio/6841C243-65F8-4AF9-BE1C-7B3823597403_fcca511b.png',
    vrikodaraPhase1Sheet2x2: '/assets/aistudio/CB79B07D-70B4-4A9F-A5B1-C7C3743DDBCF_7a316599.png',
    vrikodaraPhase2Sheet2x2: '/assets/aistudio/0A23068F-ECD7-4091-98B2-E98569B6AE85_af84ff47.png',
  },

  // Multi-Row Green-Screen & 4-Frame Enemy Sprite Sheets (Uploaded Full Animation Roster)
  enemySheets: {
    bronzeSpearmanSheet: '/assets/aistudio/Bronze_Spearman_Sprite_Sheet_3cc29693.png',
    ghoulSheet: '/assets/aistudio/Ghoul_Animation_Sprite_Sheet_d0cacfa1.png',
    fantasyKnightSheet: '/assets/aistudio/Fantasy_Knight_Combat_Sprite_Sheet_ef12207b.png',
    kabandhaMonsterSheet: '/assets/aistudio/Monster_Sprite_Animation_Sheet_8a0eacb8.png',
    hoodedMageSheet: '/assets/aistudio/Hooded_Mage_Animation_Sprite_Sheet_1143e190.png',
    nagaWarriorSheet: '/assets/aistudio/Naga_Warrior_Animation_Sprite_Sheet_cb4445e9.png',
    ogreWarriorSheet: '/assets/aistudio/Ogre_Warrior_Animation_Sprite_Sheet_53fbad9a.png',
    demonicOgreSheet: '/assets/aistudio/Demonic_Ogre_Warrior_Sprite_Sheet_cba725fc.png',
    moltenGolemSheet: '/assets/aistudio/Molten_Golem_Animation_Sprite_Sheet_2e2d5ebe.png',
    undeadMonsterSheet: '/assets/aistudio/Undead_Monster_Animation_Spritesheet_534448a1.png',
    undeadWarriorSheet: '/assets/aistudio/Undead_Warrior_Sprite_Sheet_28b77f1c.png',
    undeadArcherSheet: '/assets/aistudio/Undead_Archer_Animation_Sprite_Sheet_d766d867.png',
    aghoriSorcererSheet4x1: '/assets/aistudio/EEC0C930-2E86-45A2-A02B-0953ACE3362E_7c8d057e.png',
    urumiAssassinSheet4x1: '/assets/aistudio/DD93700A-4C55-47C2-B081-115AAF6D0B03_d6da51ef.png',
    nagaKingSheet2x2: '/assets/aistudio/59C244F9-D856-485F-8D8A-2408B379DEA1_c1540730.png',
    sharabhaHoundSheet4x1: '/assets/aistudio/Gemini_Generated_Image_8u43ce8u43ce8u43_e8ea70fa.png',
    pretaBowmanSheet4x1: '/assets/aistudio/Gemini_Generated_Image_6669w66669w66669_7106b7d0.png',
    rakshasaMaceSheet4x1: '/assets/aistudio/Gemini_Generated_Image_uyv1euuyv1euuyv1_ae2bf117.png',
    kaliyugaAvatarSheet2x2: '/assets/aistudio/Gemini_Generated_Image_el5r51el5r51el5r_5da30179.png',
    furnaceColossusSheet4x1: '/assets/aistudio/Gemini_Generated_Image_by91e1by91e1by91_46282a74.png',
  },

  // Uploaded Non-Wukong Warden, Boss & Enemy Concept Portraits for HUD Banners & Compendium
  wardenPortraits: {
    crimsonDemonKing: '/assets/aistudio/Crimson_Demon_King_with_Spiked_Mace_59d3e4e5.png',
    hornedRakshasaGada: '/assets/aistudio/Horned Rakshasa Gada-Guard Warrior.png',
    lavaforgedColossus: '/assets/aistudio/Lavaforged Horned Colossus.png',
    moltenDemonKnight: '/assets/aistudio/Molten Demon Knight Character Sheet.png',
    moltenIronGolem: '/assets/aistudio/Molten Iron Golem Warrior.png',
    chainboundColossus: '/assets/aistudio/Chainbound_Colossus_with_Temple_Pillar_40bd9fc3.png',
    chargingMinotaur: '/assets/aistudio/Charging_Minotaur_War-Beast_3b2464b3.png',
    roaringBronzeMinotaur: '/assets/aistudio/Roaring_Bronze_Bell_Minotaur_0d97e19d.png',
    verdigrisBullDemon: '/assets/aistudio/Verdigris_Bull_Demon_with_Bell_Mace_51bd3b26.png',
    emberTippedArcher: '/assets/aistudio/Ember-Tipped_Masked_Archer_e5272586.png',
    bronzeMaskedArcher: '/assets/aistudio/Tattered_Bronze_Masked_Undead_Archer_d55f2765.png',
    embermawHellhound: '/assets/aistudio/Embermaw_Hellhound_in_Mid_Pounce_715176d8.png',
    ashenJackalWarrior: '/assets/aistudio/Ashen Jackal Warrior Concept.png',
    grimBerserker: '/assets/aistudio/Grim_Berserker_Swinging_Stone_Club_41477911.png',
    defeatedGiant: '/assets/aistudio/Defeated_Giant_Beside_a_Broken_Pillar_c0a6156e.png',
    woundedTitan: '/assets/aistudio/Wounded_Titan_Clinging_to_Ruin_f7c846b6.png',
    eclipseWarrior: '/assets/aistudio/Eclipse_Warrior_of_the_Ruined_Temple_ae03cddc.png',
    ashWornWarrior: '/assets/aistudio/Ash-Worn_Mythic_Warrior_6e0e3114.png',
    ashMarkedTurnaround: '/assets/aistudio/Ash-Marked_Bronze_Warrior_Turnaround_d5fd3244.png',
    ashenWeatheredSword: '/assets/aistudio/Ashen_Warrior_with_Weathered_Sword_d61d6072.png',
    woundedGreatsword: '/assets/aistudio/Wounded_Warrior_with_Bloodied_Greatsword_43996349.png',
  },

  // 2.5D Y-Sorted Destructible Courtyard Props (Pure Black Background Indian Kurukshetra Set)
  kaliyugaProps: {
    kurukshetraPillar: '/assets/aistudio/Gemini_Generated_Image_9st0qa9st0qa9st0_64c7f4c4.png',
    pillarRubble: '/assets/aistudio/Gemini_Generated_Image_xp9eibxp9eibxp9e_197206c9.png',
    brahmashiraShrine: '/assets/aistudio/Gemini_Generated_Image_rc1gsbrc1gsbrc1g_d88016ca.png',
    brokenChariot: '/assets/aistudio/Gemini_Generated_Image_w6hzmyw6hzmyw6hz_4319bd25.png',
    vaitaraniBoat: '/assets/aistudio/Gemini_Generated_Image_x8gt5lx8gt5lx8gt_225a8aa8.png',
  },

  // Fallback 2D Character Poses (Used only during initial 3D FBX load)
  rudra: {
    idle: '/assets/aistudio/Ashen_Warrior_with_Bloodied_Greatsword_a86e8491.png',
    run: '/assets/aistudio/Fierce_Warrior_s_Leaping_Strike_0fc5a149.png',
    slash1: '/assets/aistudio/Bloodied_Warrior_s_Greatblade_Slash_e905f195.png',
    slash2: '/assets/aistudio/Fierce_Warrior_s_Downward_Strike_a4598509.png',
    slam: '/assets/aistudio/Mythic_Trishula_War_Axe_6e39d1d1.png',
    parry: '/assets/aistudio/Bloodied_Greatsword_Warrior_in_a_Defensive_Stance_137c9bf8.png',
    astra: '/assets/aistudio/Flaming_Archer_of_the_White_Realm_8f79ff3f.png',
    heal: '/assets/aistudio/Ash-Bound_Warrior_s_Golden_Draught_4475748f.png',
    kneel: '/assets/aistudio/Battle-Worn_Warrior_Kneeling_on_His_Sword_55ca9257.png',
  },
  enemies: {
    vrikaIdle: '/assets/aistudio/DD93700A-4C55-47C2-B081-115AAF6D0B03_d6da51ef.png',
  },
  dundubhi: {
    idle: '/assets/aistudio/35922E13-6015-481F-8ABF-723988E0F89C_8e007552.png',
    charge: '/assets/aistudio/565576C2-F6B7-4179-94FD-2534E706355F_b28aa5ba.png',
    roar: '/assets/aistudio/6841C243-65F8-4AF9-BE1C-7B3823597403_fcca511b.png',
  },
  vrikodara: {
    p1Idle: '/assets/aistudio/CB79B07D-70B4-4A9F-A5B1-C7C3743DDBCF_7a316599.png',
    p1Windup: '/assets/aistudio/CB79B07D-70B4-4A9F-A5B1-C7C3743DDBCF_7a316599.png',
    p1Slam: '/assets/aistudio/CB79B07D-70B4-4A9F-A5B1-C7C3743DDBCF_7a316599.png',
    p2Idle: '/assets/aistudio/0A23068F-ECD7-4091-98B2-E98569B6AE85_af84ff47.png',
    p2Sweep: '/assets/aistudio/0A23068F-ECD7-4091-98B2-E98569B6AE85_af84ff47.png',
    p2Kneel: '/assets/aistudio/0A23068F-ECD7-4091-98B2-E98569B6AE85_af84ff47.png',
  },
} as const;

export const CHAMBERS: ChamberSpec[] = [
  // ==========================================================================
  // CHAMBER I: VAITARANI RIVER GHAT (EXPANSIVE HADES SCROLLING ARENA)
  // ==========================================================================
  {
    id: 1,
    chapterTitle: 'Act I · The Boiling Crossing',
    name: 'Vaitarani Ferry Ghat',
    chineseSubtitle: 'वैतरणी घाट · CHAMBER I OF VIII',
    strikethroughLie: '“The fallen heroes crossed into heaven upon golden lotus barges...”',
    sanjayaQuote:
      '“Lies! The Vaitarani boils with marrow and broken crowns. Sharabha hounds feast on the unburied.”',
    backgroundUrl: GAME_ASSETS.chambers.vaitaraniGhat,
    floorTint: 'rgba(22, 10, 12, 0.08)',
    isBossChamber: false,
    envEffect: 'blood_river',
    braziers: [
      { x: 0.20, y: 0.22, color: '#ff6a18', radius: 195 },
      { x: 0.80, y: 0.22, color: '#ff6a18', radius: 195 },
      { x: 0.16, y: 0.54, color: '#ff4218', radius: 185 },
      { x: 0.84, y: 0.54, color: '#ff4218', radius: 185 },
      { x: 0.22, y: 0.82, color: '#ff4218', radius: 195 },
      { x: 0.78, y: 0.82, color: '#ff4218', radius: 195 },
    ],
    props: [
      { type: 'incense_cauldron', x: 0.32, y: 0.44 },
      { type: 'pagoda_lantern', x: 0.68, y: 0.42 },
      { type: 'dragon_pillar', x: 0.50, y: 0.34 },
      { type: 'dragon_pillar', x: 0.52, y: 0.66 },
      { type: 'weapon_rack', x: 0.28, y: 0.70 },
      { type: 'incense_cauldron', x: 0.72, y: 0.68 },
    ],
    spawns: [
      // Wave 1: 2D Hand-Painted Sharabha Hellhounds + Vrika Stalkers + Agni Spearmen across the courtyard
      { type: 'wolf_guai', x: 0.48, y: 0.46, wave: 1 },
      { type: 'wolf_guai', x: 0.62, y: 0.64, wave: 1, delay: 0.25 },
      { type: 'fire_monk', x: 0.72, y: 0.42, wave: 1, delay: 0.5 },
      { type: 'wolf_guai', x: 0.38, y: 0.32, wave: 1, delay: 0.75 },
      // Wave 2: 2D Preta Bowmen + Ghat-Warden
      { type: 'wolf_guai', x: 0.36, y: 0.40, wave: 2, trait: 'rakshasa_frenzy' },
      { type: 'fire_monk', x: 0.74, y: 0.38, wave: 2, delay: 0.25 },
      {
        type: 'furnace_titan',
        x: 0.62,
        y: 0.54,
        wave: 2,
        delay: 0.45,
        wardenTitle: 'KAPALA · SKULLCLAD GHAT-WARDEN',
      },
    ],
  },

  // ==========================================================================
  // CHAMBER II: SEALED THRESHOLD OF RAKTABIJA (LOCKED -> UNLOCKED GATE ARENA)
  // ==========================================================================
  {
    id: 2,
    chapterTitle: 'Act I · The Boiling Crossing',
    name: 'Sealed Gate of Raktabija',
    chineseSubtitle: 'रक्तबीज द्वार · CHAMBER II OF VIII',
    strikethroughLie: '“Sacred soma was poured into the temple cisterns at dawn...”',
    sanjayaQuote:
      '“Golden chains seal the northern archway to another path! Slaughter Raktabija’s pack to shatter the gate seal!”',
    backgroundUrl: GAME_ASSETS.chambers.asuraLavaLocked,
    unlockedBackgroundUrl: GAME_ASSETS.chambers.asuraLavaUnlocked,
    floorTint: 'rgba(24, 9, 12, 0.08)',
    isBossChamber: false,
    envEffect: 'blood_river',
    braziers: [
      { x: 0.20, y: 0.20, color: '#ff5218', radius: 195 },
      { x: 0.80, y: 0.20, color: '#ff5218', radius: 195 },
      { x: 0.16, y: 0.52, color: '#ff2a3a', radius: 190 },
      { x: 0.84, y: 0.52, color: '#ff2a3a', radius: 190 },
      { x: 0.22, y: 0.82, color: '#ff2a3a', radius: 195 },
      { x: 0.78, y: 0.82, color: '#ff2a3a', radius: 195 },
    ],
    props: [
      { type: 'dragon_pillar', x: 0.36, y: 0.38 },
      { type: 'dragon_pillar', x: 0.64, y: 0.38 },
      { type: 'incense_cauldron', x: 0.50, y: 0.66 },
      { type: 'weapon_rack', x: 0.74, y: 0.64 },
      { type: 'pagoda_lantern', x: 0.28, y: 0.68 },
    ],
    spawns: [
      // Wave 1: 2D Swarm Mobs
      { type: 'fire_monk', x: 0.58, y: 0.36, wave: 1 },
      { type: 'fire_monk', x: 0.74, y: 0.60, wave: 1, delay: 0.25 },
      { type: 'stone_golem', x: 0.50, y: 0.52, wave: 1, delay: 0.4 },
      { type: 'wolf_guai', x: 0.40, y: 0.70, wave: 1, delay: 0.55 },
      // Wave 2: Raktabija Crimson Skull Warlord + 2D Guards
      {
        type: 'furnace_titan',
        x: 0.64,
        y: 0.48,
        wave: 2,
        trait: 'agni_aura',
        wardenTitle: 'RAKTABIJA · CRIMSON SKULL WARLORD',
      },
      { type: 'wolf_guai', x: 0.36, y: 0.36, wave: 2, delay: 0.3 },
      { type: 'fire_monk', x: 0.76, y: 0.54, wave: 2, delay: 0.5, trait: 'agni_aura' },
    ],
  },

  // ==========================================================================
  // CHAMBER III: KURUKSHETRA CHARIOT BONEFIELD (EXPANSIVE HADES ARENA)
  // ==========================================================================
  {
    id: 3,
    chapterTitle: 'Act I · The Boiling Crossing',
    name: 'Kurukshetra Chariot Pyre',
    chineseSubtitle: 'रथश्मशान · CHAMBER III OF VIII',
    strikethroughLie: '“Eighteen aksauhinis stood in gleaming golden formation...”',
    sanjayaQuote:
      '“The axles are fused with molten brass and bone. Rakshasa bruisers prowl the wreckage!”',
    backgroundUrl: GAME_ASSETS.chambers.chariotBonefield,
    floorTint: 'rgba(26, 12, 8, 0.08)',
    isBossChamber: false,
    envEffect: 'lava_fissures',
    braziers: [
      { x: 0.20, y: 0.22, color: '#ff7a18', radius: 195 },
      { x: 0.80, y: 0.22, color: '#ff7a18', radius: 195 },
      { x: 0.16, y: 0.54, color: '#ff5218', radius: 190 },
      { x: 0.84, y: 0.54, color: '#ff5218', radius: 190 },
      { x: 0.22, y: 0.80, color: '#ff5218', radius: 195 },
      { x: 0.78, y: 0.80, color: '#ff5218', radius: 195 },
    ],
    props: [
      { type: 'weapon_rack', x: 0.32, y: 0.38 },
      { type: 'incense_cauldron', x: 0.52, y: 0.48 },
      { type: 'dragon_pillar', x: 0.68, y: 0.36 },
      { type: 'dragon_pillar', x: 0.38, y: 0.68 },
      { type: 'pagoda_lantern', x: 0.68, y: 0.70 },
    ],
    spawns: [
      // Wave 1: 2D Swarm Mobs
      { type: 'stone_golem', x: 0.54, y: 0.46, wave: 1, trait: 'vajra_shield' },
      { type: 'wolf_guai', x: 0.66, y: 0.34, wave: 1, delay: 0.2 },
      { type: 'wolf_guai', x: 0.66, y: 0.66, wave: 1, delay: 0.4 },
      { type: 'fire_monk', x: 0.76, y: 0.50, wave: 1, delay: 0.6 },
      // Wave 2: Raktaksha, Horned Warlord of the Bloodforge
      {
        type: 'furnace_titan',
        x: 0.62,
        y: 0.52,
        wave: 2,
        trait: 'vajra_shield',
        wardenTitle: 'RAKTAKSHA · HORNED BLOODFORGE WARDEN',
      },
      { type: 'stone_golem', x: 0.42, y: 0.38, wave: 2, delay: 0.3 },
      { type: 'fire_monk', x: 0.74, y: 0.40, wave: 2, delay: 0.5, trait: 'agni_aura' },
    ],
  },

  // ==========================================================================
  // CHAMBER IV: ACT I MID-BOSS — 3D DUNDUBHI, THE WAR-DRUM BEHEMOTH
  // ==========================================================================
  {
    id: 4,
    chapterTitle: 'Act I Sovereign · The Bronze Behemoth',
    name: 'Mandapa of the War-Drum',
    chineseSubtitle: 'दुन्दुभि मण्डप · CHAMBER IV OF VIII (3D BOSS)',
    strikethroughLie: '“The temple bull bowed before the royal standard of Hastinapura...”',
    sanjayaQuote:
      '“Dundubhi’s Chola-bronze hide deflects raw steel! Bait his horn-charge into the Kurukshetra Pillars to crack his armor!”',
    backgroundUrl: GAME_ASSETS.chambers.warDrumColonnade,
    floorTint: 'rgba(24, 12, 8, 0.08)',
    isBossChamber: true,
    envEffect: 'lava_fissures',
    braziers: [
      { x: 0.18, y: 0.22, color: '#ff8a24', radius: 210 },
      { x: 0.82, y: 0.22, color: '#ff8a24', radius: 210 },
      { x: 0.18, y: 0.80, color: '#ff5218', radius: 210 },
      { x: 0.82, y: 0.80, color: '#ff5218', radius: 210 },
    ],
    props: [
      { type: 'dragon_pillar', x: 0.34, y: 0.36 },
      { type: 'dragon_pillar', x: 0.66, y: 0.36 },
      { type: 'dragon_pillar', x: 0.34, y: 0.70 },
      { type: 'dragon_pillar', x: 0.66, y: 0.70 },
      { type: 'incense_cauldron', x: 0.50, y: 0.26 },
    ],
    spawns: [{ type: 'xuemo', x: 0.64, y: 0.52, wave: 1 }],
  },

  // ==========================================================================
  // CHAMBER V: KURUKSHETRA BRAHMASHIRA PYRE (ACT II — BURNING WAR-CAMP)
  // ==========================================================================
  {
    id: 5,
    chapterTitle: 'Act II · The Asura Inner Sanctum',
    name: 'Brahmashira War-Camp Pyre',
    chineseSubtitle: 'ब्रह्मशिर शिविर · CHAMBER V OF VIII',
    strikethroughLie: '“The royal tents slumbered in peace after the final conch...”',
    sanjayaQuote:
      '“Ashvatthama’s celestial Brahmashira weapon scorches the horizon! Four-armed Kaliyuga Avatars prowl the burning war-tents!”',
    backgroundUrl: GAME_ASSETS.chambers.soulFireSanctum,
    floorTint: 'rgba(22, 12, 8, 0.08)',
    isBossChamber: false,
    envEffect: 'lava_fissures',
    braziers: [
      { x: 0.20, y: 0.22, color: '#ff6a18', radius: 200 },
      { x: 0.80, y: 0.22, color: '#ff6a18', radius: 200 },
      { x: 0.16, y: 0.54, color: '#ff4218', radius: 190 },
      { x: 0.84, y: 0.54, color: '#ff4218', radius: 190 },
      { x: 0.22, y: 0.80, color: '#ff6a18', radius: 195 },
      { x: 0.78, y: 0.80, color: '#ff6a18', radius: 195 },
    ],
    props: [
      { type: 'dragon_pillar', x: 0.38, y: 0.38 },
      { type: 'dragon_pillar', x: 0.62, y: 0.38 },
      { type: 'incense_cauldron', x: 0.50, y: 0.64 },
      { type: 'pagoda_lantern', x: 0.30, y: 0.68 },
      { type: 'weapon_rack', x: 0.72, y: 0.68 },
    ],
    spawns: [
      // Wave 1: 2D Kaliyuga Cosmic Avatar + Preta Bowmen + Sharabha Hounds
      { type: 'furnace_titan', x: 0.56, y: 0.48, wave: 1, trait: 'vajra_shield' },
      { type: 'fire_monk', x: 0.72, y: 0.36, wave: 1, delay: 0.25 },
      { type: 'fire_monk', x: 0.72, y: 0.66, wave: 1, delay: 0.45 },
      // Wave 2: Sovereign of the Eternal Wheel + Frenzied Hounds
      { type: 'stone_golem', x: 0.46, y: 0.40, wave: 2, trait: 'agni_aura' },
      { type: 'wolf_guai', x: 0.38, y: 0.64, wave: 2, delay: 0.2, trait: 'rakshasa_frenzy' },
      { type: 'wolf_guai', x: 0.70, y: 0.56, wave: 2, delay: 0.4, trait: 'rakshasa_frenzy' },
      {
        type: 'furnace_titan',
        x: 0.64,
        y: 0.50,
        wave: 2,
        delay: 0.55,
        trait: 'vajra_shield',
        wardenTitle: 'BHAIRAVA · ETERNAL WHEEL AVATAR',
      },
    ],
  },

  // ==========================================================================
  // CHAMBER VI: SHATTERED GOPURAM CAUSEWAY (HIGH-INTENSITY TRAP GAUNTLET)
  // ==========================================================================
  {
    id: 6,
    chapterTitle: 'Act II · The Asura Inner Sanctum',
    name: 'Shattered Gopuram Causeway',
    chineseSubtitle: 'गोपुरम् सेतु · CHAMBER VI OF VIII',
    strikethroughLie: '“Pilgrims walked unharmed across the temple causeway...”',
    sanjayaQuote:
      '“Every flagstone is rigged with bloodied iron spikes and Agni lotus vents. Lure the Rakshasa bruisers onto the plates!”',
    backgroundUrl: GAME_ASSETS.chambers.gopuramCauseway,
    floorTint: 'rgba(24, 10, 10, 0.08)',
    isBossChamber: false,
    envEffect: 'lava_fissures',
    braziers: [
      { x: 0.20, y: 0.22, color: '#ff6a18', radius: 195 },
      { x: 0.80, y: 0.22, color: '#ff6a18', radius: 195 },
      { x: 0.16, y: 0.54, color: '#ff2a3a', radius: 190 },
      { x: 0.84, y: 0.54, color: '#ff2a3a', radius: 190 },
      { x: 0.22, y: 0.82, color: '#ff2a3a', radius: 195 },
      { x: 0.78, y: 0.82, color: '#ff2a3a', radius: 195 },
    ],
    props: [
      { type: 'incense_cauldron', x: 0.40, y: 0.42 },
      { type: 'incense_cauldron', x: 0.62, y: 0.60 },
      { type: 'dragon_pillar', x: 0.52, y: 0.34 },
      { type: 'dragon_pillar', x: 0.48, y: 0.70 },
      { type: 'weapon_rack', x: 0.32, y: 0.66 },
    ],
    spawns: [
      // Wave 1: 2D Swarm Mobs
      { type: 'stone_golem', x: 0.52, y: 0.42, wave: 1, trait: 'vajra_shield' },
      { type: 'stone_golem', x: 0.64, y: 0.62, wave: 1, delay: 0.3 },
      { type: 'fire_monk', x: 0.74, y: 0.46, wave: 1, delay: 0.5, trait: 'agni_aura' },
      // Wave 2: Agnimukha, The Molten Warlord
      {
        type: 'furnace_titan',
        x: 0.60,
        y: 0.50,
        wave: 2,
        trait: 'agni_aura',
        wardenTitle: 'AGNIMUKHA · MOLTEN WARLORD',
      },
      { type: 'wolf_guai', x: 0.40, y: 0.36, wave: 2, delay: 0.25, trait: 'rakshasa_frenzy' },
      { type: 'wolf_guai', x: 0.42, y: 0.68, wave: 2, delay: 0.45 },
      { type: 'fire_monk', x: 0.76, y: 0.54, wave: 2, delay: 0.6 },
    ],
  },

  // ==========================================================================
  // CHAMBER VII: ASURA LAVA SANCTUM (LOCKED -> UNLOCKED LIVE GATE TRANSITION!)
  // ==========================================================================
  {
    id: 7,
    chapterTitle: 'Act II · Threshold of the Sovereign',
    name: 'Sealed Gate of Jatharagni',
    chineseSubtitle: 'जाठराग्नि द्वार · CHAMBER VII OF VIII',
    strikethroughLie: '“The golden gates of the sanctum opened to welcome the peacemakers...”',
    sanjayaQuote:
      '“Golden chains and an Om padlock bind Vrikodara’s threshold! Slaughter the Royal Asura Guard to shatter the seal!”',
    backgroundUrl: GAME_ASSETS.chambers.asuraLavaLocked,
    unlockedBackgroundUrl: GAME_ASSETS.chambers.asuraLavaUnlocked,
    floorTint: 'rgba(26, 10, 8, 0.06)',
    isBossChamber: false,
    envEffect: 'lava_fissures',
    braziers: [
      { x: 0.18, y: 0.24, color: '#ff7a18', radius: 205 },
      { x: 0.82, y: 0.24, color: '#ff7a18', radius: 205 },
      { x: 0.16, y: 0.76, color: '#ff5218', radius: 205 },
      { x: 0.84, y: 0.76, color: '#ff5218', radius: 205 },
    ],
    props: [
      { type: 'dragon_pillar', x: 0.36, y: 0.40 },
      { type: 'dragon_pillar', x: 0.64, y: 0.40 },
      { type: 'incense_cauldron', x: 0.50, y: 0.54 },
      { type: 'pagoda_lantern', x: 0.34, y: 0.70 },
      { type: 'weapon_rack', x: 0.66, y: 0.70 },
    ],
    spawns: [
      // Wave 1: Bloodforge Gatekeeper + 2D Royal Escort
      {
        type: 'furnace_titan',
        x: 0.58,
        y: 0.46,
        wave: 1,
        trait: 'agni_aura',
        wardenTitle: 'GATEKEEPER · BLOODFORGE COLOSSUS',
      },
      { type: 'stone_golem', x: 0.66, y: 0.64, wave: 1, delay: 0.25, trait: 'vajra_shield' },
      { type: 'fire_monk', x: 0.74, y: 0.38, wave: 1, delay: 0.45 },
      // Wave 2: Twin Gate Guardians
      {
        type: 'furnace_titan',
        x: 0.52,
        y: 0.42,
        wave: 2,
        trait: 'vajra_shield',
        wardenTitle: 'SEAL-GUARD · ETERNAL WHEEL AVATAR',
      },
      {
        type: 'furnace_titan',
        x: 0.66,
        y: 0.58,
        wave: 2,
        delay: 0.35,
        trait: 'rakshasa_frenzy',
        wardenTitle: 'SEAL-GUARD · JATHARAGNI COLOSSUS',
      },
      { type: 'wolf_guai', x: 0.40, y: 0.62, wave: 2, delay: 0.5, trait: 'rakshasa_frenzy' },
      { type: 'fire_monk', x: 0.76, y: 0.50, wave: 2, delay: 0.65, trait: 'agni_aura' },
    ],
  },

  // ==========================================================================
  // CHAMBER VIII: FINAL BOSS — 3D VRIKODARA (PHASE 1 NAGA -> PHASE 2 ECLIPSE!)
  // ==========================================================================
  {
    id: 8,
    chapterTitle: 'Final Sovereign · The Bleeding Crown',
    name: 'Sanctum of the Infernal Maw',
    chineseSubtitle: 'वृकोदर गर्भगृह · CHAMBER VIII OF VIII (FINAL 3D BOSS)',
    strikethroughLie: '“And the righteous Pandava general laid down his mace in peace...”',
    sanjayaQuote:
      '“Behold Vrikodara! Ten thousand chariots burn inside his abdominal furnace—and when the blood-eclipse rises, his twin Tridents tear the cosmos!”',
    backgroundUrl: GAME_ASSETS.chambers.bossSanctumPhase1,
    phase2BackgroundUrl: GAME_ASSETS.chambers.bossSanctumPhase2Eclipse,
    floorTint: 'rgba(22, 6, 10, 0.06)',
    isBossChamber: true,
    envEffect: 'eclipse_wind',
    braziers: [
      { x: 0.18, y: 0.20, color: '#38e8ff', radius: 215 },
      { x: 0.82, y: 0.20, color: '#38e8ff', radius: 215 },
      { x: 0.14, y: 0.54, color: '#ff2a3a', radius: 215 },
      { x: 0.86, y: 0.54, color: '#ff2a3a', radius: 215 },
      { x: 0.22, y: 0.84, color: '#ff6a18', radius: 215 },
      { x: 0.78, y: 0.84, color: '#ff6a18', radius: 215 },
    ],
    props: [
      { type: 'dragon_pillar', x: 0.34, y: 0.36 },
      { type: 'dragon_pillar', x: 0.66, y: 0.36 },
      { type: 'dragon_pillar', x: 0.34, y: 0.70 },
      { type: 'dragon_pillar', x: 0.66, y: 0.70 },
      { type: 'incense_cauldron', x: 0.50, y: 0.28 },
    ],
    spawns: [{ type: 'vrikodara', x: 0.64, y: 0.52, wave: 1 }],
  },
];

