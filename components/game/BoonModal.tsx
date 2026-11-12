'use client';

import React, { useState } from 'react';
import {
  CelestialBoonId,
  CelestialBoonSpec,
  IMMORTAL_PATRONS,
  getBoonById,
} from '@/lib/game/boons';
import { CHAMBERS } from '@/lib/game/assets';

interface BoonModalProps {
  isOpen: boolean;
  choices: CelestialBoonSpec[];
  ownedBoons: CelestialBoonId[];
  rerollsRemaining: number;
  chamberId: number;
  onSelectBoon: (id: CelestialBoonId) => void;
  onRerollChoices: () => void;
}

const RARITY_STYLES: Record<
  CelestialBoonSpec['rarity'],
  { border: string; badgeBg: string; text: string }
> = {
  Rare: {
    border: 'border-[#3ee0a8]/60 hover:border-[#3ee0a8]',
    badgeBg: 'bg-[#102b23] text-[#3ee0a8] border-[#3ee0a8]/55',
    text: 'text-[#3ee0a8]',
  },
  Epic: {
    border: 'border-[#c266ff]/65 hover:border-[#d999ff]',
    badgeBg: 'bg-[#251236] text-[#df9cff] border-[#c266ff]/55',
    text: 'text-[#df9cff]',
  },
  Heroic: {
    border: 'border-[#ff6a42]/70 hover:border-[#ff8e6e]',
    badgeBg: 'bg-[#361610] text-[#ff8463] border-[#ff6a42]/55',
    text: 'text-[#ff8463]',
  },
  Legendary: {
    border: 'border-[#f5c451]/80 hover:border-[#ffe596]',
    badgeBg: 'bg-[#33270d] text-[#f5c451] border-[#f5c451]/70',
    text: 'text-[#f5c451]',
  },
  Duo: {
    border: 'border-[#a8ff78]/90 hover:border-[#d4ffb8]',
    badgeBg: 'bg-[#163012] text-[#a8ff78] border-[#a8ff78]/80',
    text: 'text-[#a8ff78]',
  },
};

const BOON_PRACTICAL_GUIDE: Record<
  CelestialBoonId,
  {
    categoryTag: 'DAMAGE' | 'MOBILITY' | 'CRITICAL' | 'DEFENSE' | 'RESOURCE' | 'POSTURE' | 'DUO SYNERGY';
    categoryColor: string;
    oneSentenceEffect: string;
    buildSynergy: (owned: Set<CelestialBoonId>) => { label: string; active: boolean };
  }
> = {
  nezha_scorch_strike: {
    categoryTag: 'DAMAGE',
    categoryColor: '#ff6a42',
    oneSentenceEffect: 'Every melee & dash strike ignites enemies for 3 seconds of burn damage.',
    buildSynergy: (owned) =>
      owned.has('erlang_chain_lightning') || owned.has('erlang_third_eye_crit')
        ? { label: 'UNLOCKS DUO: Pairs with your Storm Boon to unlock Pact of the Burning Sabha!', active: true }
        : owned.has('sage_phantom_echo')
        ? { label: 'ACTIVE SYNERGY: Shadow Twin faster swings stack Blood-Burn rapidly.', active: true }
        : { label: 'COMBO TIP: Pairs with Storm/Crit boons to unlock Duo Burn-Lightning.', active: false },
  },
  nezha_blazing_dash: {
    categoryTag: 'MOBILITY',
    categoryColor: '#ff8e53',
    oneSentenceEffect: 'Dashing blasts nearby foes with fire and boosts your next lunge attack.',
    buildSynergy: (owned) =>
      owned.has('guanyin_divine_deflect')
        ? { label: 'ACTIVE SYNERGY: Combines with Deflect Dash for safe offensive dodges.', active: true }
        : { label: 'COMBO TIP: Press [SPACE] then [LMB] immediately for a +25% Dash-Strike.', active: false },
  },
  erlang_chain_lightning: {
    categoryTag: 'DAMAGE',
    categoryColor: '#5ce6ff',
    oneSentenceEffect: 'Every weapon hit arcs chain lightning across up to 3 nearby enemies.',
    buildSynergy: (owned) =>
      owned.has('nezha_scorch_strike') || owned.has('nezha_blazing_dash')
        ? { label: 'UNLOCKS DUO: Pairs with your Fire Boon to unlock Pact of the Burning Sabha!', active: true }
        : owned.has('sage_phantom_echo')
        ? { label: 'ACTIVE SYNERGY: +20% Attack Speed triggers Chain Lightning more often.', active: true }
        : { label: 'CROWD CLEAR: Melts grouped soldiers and multi-enemy waves effortlessly.', active: false },
  },
  erlang_third_eye_crit: {
    categoryTag: 'CRITICAL',
    categoryColor: '#5ce6ff',
    oneSentenceEffect: 'Greatly increases critical hit rate and deals massive backstab damage.',
    buildSynergy: (owned) =>
      owned.has('guanyin_divine_deflect')
        ? { label: 'UNLOCKS DUO: Pairs with Deflect Ward to unlock Rahu’s Eclipse Mirage!', active: true }
        : { label: 'BOSS KILLER: Dash behind bosses during windups for +80% Backstab Crits.', active: false },
  },
  guanyin_divine_deflect: {
    categoryTag: 'DEFENSE',
    categoryColor: '#3ee0a8',
    oneSentenceEffect: 'Dashing reflects enemy projectiles at 2.5x damage and heals on Perfect Dodge.',
    buildSynergy: (owned) =>
      owned.has('erlang_third_eye_crit') || owned.has('erlang_chain_lightning')
        ? { label: 'UNLOCKS DUO: Pairs with your Storm Boon for guaranteed Crit Dash-Strikes!', active: true }
        : { label: 'SURVIVABILITY: Turns enemy archers & boss orbs into free healing.', active: false },
  },
  guanyin_ambrosia_gourd: {
    categoryTag: 'DEFENSE',
    categoryColor: '#3ee0a8',
    oneSentenceEffect: 'Adds +1 Kalasha heal charge and makes every [R] heal restore 50% more HP.',
    buildSynergy: () => ({
      label: 'SUSTAIN: Kalasha also recovers +1 charge after clearing every chamber.',
      active: true,
    }),
  },
  aoguang_tidal_slam: {
    categoryTag: 'POSTURE',
    categoryColor: '#4da6ff',
    oneSentenceEffect: 'Knocks foes backward; slamming them into pillars or walls deals huge bonus damage.',
    buildSynergy: (owned) =>
      owned.has('sage_sovereign_breaker')
        ? { label: 'UNLOCKS DUO: Pairs with Mahabali’s Third Step for +40% Posture Shatter!', active: true }
        : { label: 'ARENA CONTROL: Best against heavy elites near pillars or chamber walls.', active: false },
  },
  aoguang_undertow_unleash: {
    categoryTag: 'DAMAGE',
    categoryColor: '#4da6ff',
    oneSentenceEffect: 'Heavy Unleash [RMB/K] pulls enemies into a vortex and deals +35% damage.',
    buildSynergy: (owned) =>
      owned.has('subhuti_astral_qi')
        ? { label: 'ACTIVE SYNERGY: Fast Focus generation lets you spam Vortex Heavy Unleash.', active: true }
        : { label: 'SPEND FOCUS ♦: Turns your 4 Focus Diamonds into an AoE vacuum.', active: false },
  },
  subhuti_astral_qi: {
    categoryTag: 'RESOURCE',
    categoryColor: '#e08cff',
    oneSentenceEffect: 'Builds Focus Diamonds 60% faster on hit and starts every room with +1 Diamond.',
    buildSynergy: (owned) =>
      owned.has('aoguang_undertow_unleash')
        ? { label: 'ACTIVE SYNERGY: Fuels your Heavy Unleash Vortex from the first second.', active: true }
        : { label: 'RESOURCE ENGINE: More Focus Diamonds = more [RMB/K] Heavy Unleash slams.', active: false },
  },
  subhuti_spell_mastery: {
    categoryTag: 'RESOURCE',
    categoryColor: '#e08cff',
    oneSentenceEffect: 'Cuts [Q] Parry and [F] Astra Bow cooldowns by 32% and boosts lodged-arrow damage.',
    buildSynergy: () => ({
      label: 'ABILITY CYCLING: Shoot [F] Astra arrows into bosses to amplify melee hits by +45%.',
      active: true,
    }),
  },
  sage_phantom_echo: {
    categoryTag: 'DAMAGE',
    categoryColor: '#f5c451',
    oneSentenceEffect: 'Swings 20% faster and spawns a shadow clone on every strike for +35% hit damage.',
    buildSynergy: (owned) =>
      owned.has('nezha_scorch_strike') || owned.has('erlang_chain_lightning')
        ? { label: 'ACTIVE SYNERGY: Faster swings trigger your Burn / Lightning effects rapidly!', active: true }
        : { label: 'TOP DPS: Multiplies every weapon stance and on-hit elemental blessing.', active: false },
  },
  sage_sovereign_breaker: {
    categoryTag: 'POSTURE',
    categoryColor: '#f5c451',
    oneSentenceEffect: 'Breaks enemy & boss Posture bars 45% faster for frequent [F] Lethal Executes.',
    buildSynergy: (owned) =>
      owned.has('aoguang_tidal_slam') || owned.has('aoguang_undertow_unleash')
        ? { label: 'UNLOCKS DUO: Pairs with Vritra Boon to unlock Weight of the Drowned Forge!', active: true }
        : { label: 'BOSS BREAKER: Combines with Smash Stance [1] & [Q] Parry to stun bosses fast.', active: false },
  },
  duo_agni_indra_cataclysm: {
    categoryTag: 'DUO SYNERGY',
    categoryColor: '#a8ff78',
    oneSentenceEffect: 'Burning enemies take double chain-lightning strikes and +20% Critical damage.',
    buildSynergy: () => ({
      label: '✦ DUO SYNERGY ACTIVE: Combines Raktabeeja Burn + Shumbha Storm Lightning!',
      active: true,
    }),
  },
  duo_varuna_rudra_riptide: {
    categoryTag: 'DUO SYNERGY',
    categoryColor: '#a8ff78',
    oneSentenceEffect: 'Boosts all damage by +30%, adds Vortex Pull to Heavy Unleash, and +40% Posture break.',
    buildSynergy: () => ({
      label: '✦ DUO SYNERGY ACTIVE: Combines Vritra Vortex + Mahabali Posture Breaker!',
      active: true,
    }),
  },
  duo_ashvin_indra_mirage: {
    categoryTag: 'DUO SYNERGY',
    categoryColor: '#a8ff78',
    oneSentenceEffect: 'Dashing auto-deflects projectiles, heals +18 HP on Perfect Dodge, and guarantees Crit Dash-Strikes.',
    buildSynergy: () => ({
      label: '✦ DUO SYNERGY ACTIVE: Combines Madhu Deflect + Nishumbha Crit Precision!',
      active: true,
    }),
  },
};

export default function BoonModal({
  isOpen,
  choices,
  ownedBoons,
  rerollsRemaining,
  chamberId,
  onSelectBoon,
  onRerollChoices,
}: BoonModalProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!isOpen || choices.length === 0) return null;

  const ownedSet = new Set<CelestialBoonId>(ownedBoons);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Celestial Boon Selection"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#060508]/90 p-3 md:p-5 select-none overflow-y-auto"
    >
      <div className="relative w-full max-w-5xl bg-[#0e0c12] border-2 border-[#d4a548]/85 p-5 md:p-7 shadow-[0_24px_80px_rgba(0,0,0,0.96)]">
        {/* Corner Ornamental Frames */}
        <div className="pointer-events-none absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#f5c451]" />
        <div className="pointer-events-none absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#f5c451]" />
        <div className="pointer-events-none absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#f5c451]" />
        <div className="pointer-events-none absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#f5c451]" />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#c89d46]/30 pb-4 mb-5">
          <div>
            <div className="text-xs font-mono-num tracking-[0.2em] text-[#d4a548] uppercase mb-1">
              RUN UPGRADE ALTAR · CHAMBER {chamberId}/{CHAMBERS.length}
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-wider text-[#f7efe0]">
              CHOOSE 1 BOON (LASTS THIS RUN)
            </h2>
            <p className="text-xs md:text-sm text-[#c7bba6] mt-1">
              Compare the practical effect and numerical stat boost first. Hover or focus any card for mythic lore.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-[#16131d] border border-[#c89d46]/35 px-3 py-1.5 text-right">
              <div className="text-[10px] font-mono-num tracking-wider text-[#a89d89] uppercase">
                EQUIPPED THIS RUN
              </div>
              <div className="text-sm font-mono-num font-bold text-[#f5c451]">
                {ownedBoons.length} Active {ownedBoons.length === 1 ? 'Boon' : 'Boons'}
              </div>
            </div>

            <button
              type="button"
              disabled={rerollsRemaining <= 0}
              onClick={onRerollChoices}
              title="Uses free per-run reroll charges (does NOT spend your permanent Ashen Karma)"
              className={`px-3.5 py-2 border text-xs font-mono-num font-bold tracking-wider uppercase transition-colors ${
                rerollsRemaining <= 0
                  ? 'bg-[#121116] border-[#2e2b36] text-[#5e5869] cursor-not-allowed'
                  : 'bg-[#1c1626] hover:bg-[#2a2038] border-[#c266ff]/70 text-[#e6b8ff] cursor-pointer'
              }`}
            >
              REROLL OPTIONS ({rerollsRemaining} FREE LEFT)
            </button>
          </div>
        </div>

        {/* Currently Equipped Boons Bar (if any) for quick synergy check */}
        {ownedBoons.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 bg-[#13111a] border border-white/10 px-3.5 py-2">
            <span className="text-[11px] font-mono-num uppercase tracking-wider text-[#a89d89] mr-1">
              CURRENT BUILD:
            </span>
            {ownedBoons.map((bId) => {
              const b = getBoonById(bId);
              const guide = BOON_PRACTICAL_GUIDE[bId];
              return (
                <span
                  key={bId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-mono-num bg-[#1c1926] border border-white/15 text-[#f7efe0]"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: guide?.categoryColor || b.accentColor }}
                  />
                  {b.name}
                </span>
              );
            })}
          </div>
        )}

        {/* 3 Fast-Scan Boon Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {choices.map((boon, idx) => {
            const patron = IMMORTAL_PATRONS[boon.patronId];
            const rStyle = RARITY_STYLES[boon.rarity];
            const guide = BOON_PRACTICAL_GUIDE[boon.id];
            const synergy = guide
              ? guide.buildSynergy(ownedSet)
              : { label: 'Enhances core combat output for the rest of this run.', active: false };
            const keyNum = idx + 1;
            const isExpanded = hoveredIdx === idx;

            return (
              <button
                key={boon.id}
                type="button"
                data-testid={`boon-choice-${idx}`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onFocus={() => setHoveredIdx(idx)}
                onBlur={() => setHoveredIdx(null)}
                onClick={() => onSelectBoon(boon.id)}
                className={`group relative flex flex-col justify-between text-left bg-[#14121b] hover:bg-[#1c1926] border-2 ${rStyle.border} p-5 transition-all duration-150 cursor-pointer shadow-[0_12px_32px_rgba(0,0,0,0.85)]`}
              >
                <div>
                  {/* 1. Top Row: Key + Non-Truncated Category Pill + Rarity Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-[#231f2e] border border-[#d4a548]/45 text-[11px] font-mono-num font-bold text-[#f5c451]">
                        [{keyNum}]
                      </span>
                      <span
                        className="px-2 py-0.5 text-[11px] font-mono-num font-bold uppercase tracking-wider border"
                        style={{
                          color: guide?.categoryColor || boon.accentColor,
                          borderColor: `${guide?.categoryColor || boon.accentColor}66`,
                          backgroundColor: 'rgba(12, 10, 18, 0.9)',
                        }}
                      >
                        {guide?.categoryTag || boon.slotLabel}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[11px] font-mono-num font-bold uppercase border ${rStyle.badgeBg}`}
                    >
                      {boon.rarity}
                    </span>
                  </div>

                  {/* 2. Boon Title */}
                  <h3 className="font-display text-lg md:text-xl font-bold text-[#f7efe0] group-hover:text-[#ffd86b] transition-colors mb-2">
                    {boon.name}
                  </h3>

                  {/* 3. Clear Numerical Change Pill (Placed First for Instant Comparison) */}
                  <div
                    className="mb-3 px-3 py-2 bg-[#0c0a10] border-l-4 font-mono-num text-xs md:text-sm font-bold tracking-wide"
                    style={{
                      borderLeftColor: boon.accentColor,
                      color: boon.accentColor,
                    }}
                  >
                    {boon.statCallout}
                  </div>

                  {/* 4. Main Gameplay Effect in 1 Short Sentence */}
                  <p className="text-xs md:text-sm font-medium text-[#f2eadb] leading-snug mb-3">
                    {guide ? guide.oneSentenceEffect : boon.summary}
                  </p>

                  {/* 5. Visible Build Synergy Explanation */}
                  <div
                    className={`mb-3 px-2.5 py-2 border text-[11px] leading-snug font-mono-num ${
                      synergy.active
                        ? 'bg-[#192818]/90 border-[#a8ff78]/60 text-[#c9ffad]'
                        : 'bg-[#181522] border-white/10 text-[#b8ac98]'
                    }`}
                  >
                    <strong className={synergy.active ? 'text-[#a8ff78]' : 'text-[#d4a548]'}>
                      {synergy.active ? '✦ BUILD SYNERGY: ' : 'HOW IT FITS: '}
                    </strong>
                    {synergy.label}
                  </div>
                </div>

                {/* 6. Patron Identity & Expandable Mythic Flavor */}
                <div className="pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className="text-[11px] font-mono-num font-bold uppercase tracking-wider"
                      style={{ color: patron.accentColor }}
                    >
                      PATRON: {patron.name}
                    </span>
                    <span className="text-[10px] font-mono-num text-[#8f8473]">
                      {isExpanded ? 'LORE ▲' : 'HOVER FOR LORE ▼'}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="mb-2.5 p-2 bg-[#0d0b12] border border-white/10 text-[11px] text-[#c2b6a3] leading-relaxed">
                      <div className="text-[10px] font-mono-num text-[#d4a548] mb-0.5">
                        {boon.chineseName} · {patron.title}
                      </div>
                      {boon.summary}
                    </div>
                  )}

                  <div className="mt-1 flex items-center justify-between text-xs font-mono-num text-[#b8ac98] group-hover:text-[#f7efe0]">
                    <span>SELECT UPGRADE</span>
                    <span className="text-[#f5c451] font-bold">PRESS [{keyNum}] →</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-num text-[#a89d89]">
          <span>
            CURRENCY GUIDE: <strong className="text-[#e6b8ff]">REROLLS</strong> refresh boon cards for free this run ·{' '}
            <strong className="text-[#f5c451]">ASHEN KARMA</strong> buys permanent upgrades at the Homa Shrine between runs.
          </span>
          <span className="text-[#f5c451] font-bold">SHORTCUT: PRESS [1] [2] [3]</span>
        </div>
      </div>
    </div>
  );
}
