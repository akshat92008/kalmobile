'use client';

import React, { useState } from 'react';
import { CHAMBERS, GAME_ASSETS } from '@/lib/game/assets';
import { CelestialBoonId, getBoonById } from '@/lib/game/boons';

export interface RunRecapStats {
  boons: CelestialBoonId[];
  runTimeSec: number;
  damageDealt: number;
  parriesLanded: number;
  dodgesCompleted: number;
  postureBreaks: number;
}

interface OutcomeModalProps {
  mode: 'none' | 'paused' | 'victory' | 'defeat';
  chamberId: number;
  chamberName: string;
  defeatedByName?: string;
  finalScore: number;
  karmaEarnedThisRun: number;
  totalKarma: number;
  runRecap?: RunRecapStats;
  onResume: () => void;
  onPlayAgain: () => void;
  onOpenShrine: () => void;
  onReturnTitle: () => void;
}

const PAUSE_SHORTCUTS = [
  { key: 'LMB / [J]', label: 'Light Cleave Combo (Builds ♦ Focus)' },
  { key: 'RMB / [K]', label: 'Heavy Stance Unleash (Spends ♦ Focus)' },
  { key: '[SPACE]', label: 'Phantom Step Dash (Invulnerable Frames)' },
  { key: '[1 / 2 / 3]', label: 'Cycle Stance (Smash / Pillar / Thrust)' },
  { key: '[Q]', label: 'Kalaripayattu Parry (Shatters Posture)' },
  { key: '[R]', label: 'Kalasha Heal (+1 Charge Each Chamber)' },
  { key: '[F]', label: 'Astra Bow (Ranged) / Lethal Execute' },
  { key: '[E]', label: 'Switch Weapon (Gada / Khadga / Parashu)' },
];

function formatDuration(sec: number): string {
  const s = Math.max(1, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem < 10 ? '0' : ''}${rem}`;
}

function getBuildInsight(
  mode: 'victory' | 'defeat',
  chamberId: number,
  recap?: RunRecapStats
): { standoutTitle: string; standoutDetail: string; nextRunTip: string } {
  const boons = recap?.boons || [];
  const hasSet = new Set<CelestialBoonId>(boons);

  let standoutTitle = 'CORE WEAPON STANCE MASTERY';
  let standoutDetail =
    'Your Broken Gada strikes and stance switches carried the fight without relying on a Duo Pact.';

  if (hasSet.has('duo_agni_indra_cataclysm')) {
    standoutTitle = 'DUO SYNERGY: PACT OF THE BURNING SABHA';
    standoutDetail =
      'Raktabeeja’s Blood-Burn triggered double Amaravati Chain-Lightning arcs on every swing.';
  } else if (hasSet.has('duo_varuna_rudra_riptide')) {
    standoutTitle = 'DUO SYNERGY: WEIGHT OF THE DROWNED FORGE';
    standoutDetail =
      'Vritra’s Vortex Pull and Mahabali’s +40% Posture Shatter locked enemies into repeated Executes.';
  } else if (hasSet.has('duo_ashvin_indra_mirage')) {
    standoutTitle = 'DUO SYNERGY: RAHU’S ECLIPSE MIRAGE';
    standoutDetail =
      'Deflecting dashes healed you on Perfect Dodges while guaranteeing Critical Dash-Strikes.';
  } else if (hasSet.has('sage_phantom_echo')) {
    standoutTitle = 'STANDOUT BOON: MAYA-CHHAYA SHADOW TWIN';
    standoutDetail =
      '+20% Attack Speed and +35% Shadow Clone echoes multiplied your on-hit damage output.';
  } else if (hasSet.has('sage_sovereign_breaker')) {
    standoutTitle = 'STANDOUT BOON: MAHABALI’S THIRD STEP';
    standoutDetail =
      '+45% Posture Break shattered enemy guards rapidly for high-damage [F] Executes.';
  } else if (boons.length > 0) {
    const firstBoon = getBoonById(boons[boons.length - 1]);
    standoutTitle = `KEY BLESSING: ${firstBoon.name.toUpperCase()}`;
    standoutDetail = `${firstBoon.statCallout} anchored your combat build this run.`;
  }

  let nextRunTip =
    'Try pairing Raktabeeja (Burn) + Shumbha (Lightning) boons to unlock the Cataclysm Duo Pact, or switch to Khadga Twin-Blades [E] for high-speed critical backstabs.';

  if (mode === 'defeat') {
    if ((recap?.parriesLanded || 0) === 0) {
      nextRunTip =
        'NEXT RUN TIP: Press [Q] right as a red hostile ring fills to Parry—it negates 100% of damage, grants +1 ♦ Focus Diamond, and shatters 58 Posture for an instant [F] Execute.';
    } else if (chamberId === 4) {
      nextRunTip =
        'DUNDUBHI TIP: Switch to Pillar Stance [2] when Dundubhi winds up his Bronze War-Drum Quake—Pillar Heavy Unleash grants Quake Immunity!';
    } else if (chamberId === 8) {
      nextRunTip =
        'VRIKODARA TIP: Dash [SPACE] behind Vrikodara during his Crimson Conflagration cone for +35% Backstab damage, and spend ♦ Focus on Smash Stance [1] to break his Posture.';
    } else if (boons.length === 0) {
      nextRunTip =
        'ROUTE TIP: Take the Left Gate (Vedic Boon) after Chamber 1 to secure a permanent damage or deflect blessing early in the run.';
    }
  } else {
    if (hasSet.has('nezha_scorch_strike') || hasSet.has('erlang_chain_lightning')) {
      nextRunTip =
        'NEXT STRATEGY TO TRY: Build around Vritra (Wall-Slam / Vortex) + Mahabali (Posture Breaker) with the Parashu Great-Axe [E] to stun-lock bosses in 2 cycles.';
    } else {
      nextRunTip =
        'NEXT STRATEGY TO TRY: Combine Madhu’s Deflect Dash + Shumbha’s Lunar Crit with Khadga Twin-Blades [E] for a 100% Crit Dash-Strike speedrun.';
    }
  }

  return { standoutTitle, standoutDetail, nextRunTip };
}

export default function OutcomeModal({
  mode,
  chamberId,
  chamberName,
  defeatedByName,
  finalScore,
  karmaEarnedThisRun,
  totalKarma,
  runRecap,
  onResume,
  onPlayAgain,
  onOpenShrine,
  onReturnTitle,
}: OutcomeModalProps) {
  const [showControls, setShowControls] = useState(false);

  if (mode === 'none') return null;

  const resolvedDefeatCause =
    defeatedByName ||
    (chamberId === 4
      ? 'Dundubhi, The Bronze War-Drum Behemoth'
      : chamberId === 8
      ? 'Vrikodara, The Iron Rakshasa'
      : null);

  const insight =
    mode === 'victory' || mode === 'defeat'
      ? getBuildInsight(mode, chamberId, runRecap)
      : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={
        mode === 'paused'
          ? 'Game Paused'
          : mode === 'victory'
          ? 'Act One Complete'
          : 'You Are Dead'
      }
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/88 backdrop-blur-sm p-3 md:p-4 pointer-events-auto select-none overflow-y-auto"
    >
      {mode === 'defeat' ? (
        /* ================================================================== */
        /* CINEMATIC RIVER VAITARANI DEATH SCREEN + RUN RECAP & LEARNING      */
        /* ================================================================== */
        <div className="relative w-full max-w-5xl flex flex-col justify-end bg-[#070405] border border-[#8f1822]/80 px-6 py-8 md:px-12 md:py-10 text-center shadow-[0_0_120px_rgba(143,24,34,0.55)] overflow-hidden transition-all duration-700">
          {/* Full-Bleed Crimson Underworld River of the Drowned Warrior Artwork */}
          <img
            src={GAME_ASSETS.deathBackdrop}
            alt="Rudra claimed by the Crimson River Vaitarani"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none scale-[1.02] brightness-[0.85] contrast-[1.08]"
          />

          {/* Sculpted Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(6, 3, 4, 0.25) 0%, rgba(7, 3, 4, 0.55) 35%, rgba(7, 3, 4, 0.92) 68%, rgba(5, 2, 3, 0.98) 100%)',
            }}
          />

          <div className="relative z-10 flex flex-col items-center pt-16 md:pt-24">
            <div className="text-xs font-mono-num tracking-[0.34em] text-[#ff6b78] uppercase mb-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.98)]">
              PRANA SEVERED · CLAIMED BY THE VAITARANI
            </div>

            <h2
              className="font-display text-3xl sm:text-5xl font-black tracking-[0.16em] uppercase text-[#d92332] mb-2"
              style={{
                textShadow: '0 6px 24px rgba(0,0,0,0.98), 0 0 36px rgba(217, 35, 50, 0.78)',
              }}
            >
              YOU ARE DEAD
            </h2>

            <p className="text-xs sm:text-sm text-[#e0d3c3] max-w-xl mx-auto leading-relaxed mb-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.98)]">
              {resolvedDefeatCause ? (
                <>
                  Felled by{' '}
                  <span className="text-[#fff3d6] font-semibold">{resolvedDefeatCause}</span> in{' '}
                  <span className="text-[#f2c45a] font-semibold">
                    Chamber {chamberId} ({chamberName})
                  </span>
                  .
                </>
              ) : (
                <>
                  Claimed beneath{' '}
                  <span className="text-[#fff3d6] font-semibold">
                    Chamber {chamberId} ({chamberName})
                  </span>
                  , while Savitri’s lantern waits upon the distant ferry.
                </>
              )}
            </p>

            {/* Run Combat & Build Recap Panel */}
            <div className="w-full max-w-3xl bg-[#090406]/90 border border-[#a81c24]/55 p-4 mb-5 text-left">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pb-3 mb-3 border-b border-white/10 text-center font-mono-num">
                <div>
                  <span className="text-[#a89688] block text-[10px] tracking-wider uppercase">
                    CHAMBER
                  </span>
                  <strong className="text-[#f7efe0] text-sm">
                    {chamberId}/{CHAMBERS.length}
                  </strong>
                </div>
                <div>
                  <span className="text-[#a89688] block text-[10px] tracking-wider uppercase">
                    RUN TIME
                  </span>
                  <strong className="text-[#f7efe0] text-sm">
                    {formatDuration(runRecap?.runTimeSec || 0)}
                  </strong>
                </div>
                <div>
                  <span className="text-[#a89688] block text-[10px] tracking-wider uppercase">
                    DAMAGE DEALT
                  </span>
                  <strong className="text-[#ff8a65] text-sm">
                    {(runRecap?.damageDealt || 0).toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span className="text-[#a89688] block text-[10px] tracking-wider uppercase">
                    PARRIES / DODGES
                  </span>
                  <strong className="text-[#5ce6ff] text-sm">
                    {runRecap?.parriesLanded || 0} / {runRecap?.dodgesCompleted || 0}
                  </strong>
                </div>
                <div>
                  <span className="text-[#a89688] block text-[10px] tracking-wider uppercase">
                    KARMA EARNED
                  </span>
                  <strong className="text-[#3ee0a8] text-sm">+{karmaEarnedThisRun}</strong>
                </div>
                <div>
                  <span className="text-[#a89688] block text-[10px] tracking-wider uppercase">
                    BANKED KARMA
                  </span>
                  <strong className="text-[#f5c451] text-sm">{totalKarma}</strong>
                </div>
              </div>

              {/* Equipped Boons Row */}
              <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono-num uppercase tracking-wider text-[#a89688] mr-1">
                  BOONS TAKEN ({runRecap?.boons.length || 0}):
                </span>
                {runRecap && runRecap.boons.length > 0 ? (
                  runRecap.boons.map((bId) => {
                    const boon = getBoonById(bId);
                    return (
                      <span
                        key={bId}
                        className="px-2 py-0.5 text-[11px] font-mono-num bg-[#171116] border border-white/15 text-[#f7efe0]"
                        style={{ borderLeftColor: boon.accentColor, borderLeftWidth: 3 }}
                      >
                        {boon.name}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-[11px] font-mono-num text-[#8f8473]">
                    None yet (Clear a Chamber and take the Left Boon Gate)
                  </span>
                )}
              </div>

              {/* Actionable Next Run Tip */}
              {insight && (
                <div className="p-2.5 bg-[#140b0e] border-l-2 border-[#f5c451] text-xs text-[#f2eadb] leading-snug">
                  <strong className="text-[#f5c451] font-mono-num block mb-0.5">
                    {insight.standoutTitle}
                  </strong>
                  <span className="text-[#d8c9b8] block mb-1">{insight.standoutDetail}</span>
                  <span className="text-[#3ee0a8] font-mono-num">{insight.nextRunTip}</span>
                </div>
              )}
            </div>

            {/* Death Choices */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                data-start="true"
                onClick={onPlayAgain}
                className="px-8 py-3.5 bg-gradient-to-r from-[#8f141e] via-[#b81d2a] to-[#8f141e] hover:brightness-115 text-[#fff6e8] border border-[#f2c45a]/75 font-display font-bold text-xs sm:text-sm tracking-[0.18em] uppercase cursor-pointer shadow-[0_8px_28px_rgba(184,29,42,0.65)] transition-all"
              >
                RISE AGAIN
              </button>
              <button
                type="button"
                onClick={onOpenShrine}
                className="px-6 py-3.5 bg-[#140d10]/90 hover:bg-[#22151a] text-[#f2c45a] border border-[#c89d46]/60 font-display font-bold text-xs sm:text-sm tracking-[0.16em] uppercase cursor-pointer transition-colors"
              >
                SPEND KARMA AT HOMA SHRINE ({totalKarma})
              </button>
              <button
                type="button"
                onClick={onReturnTitle}
                className="px-6 py-3.5 bg-[#120e10]/90 hover:bg-[#1e171b] text-[#d8c9b8] border border-[#b8ac98]/35 font-display font-bold text-xs sm:text-sm tracking-[0.16em] uppercase cursor-pointer transition-colors"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-2xl bg-[#0b0a0e] border border-[#d4a548]/75 px-6 py-7 md:px-8 md:py-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.96)]">
          {mode === 'paused' && (
            <>
              <div className="text-xs tracking-[0.26em] text-[#d4a548] uppercase mb-1.5">
                PAUSED · CHAMBER {chamberId}/{CHAMBERS.length}
              </div>
              <h2 className="font-display text-3xl font-bold tracking-[0.08em] text-[#f7efe0] mb-6 uppercase">
                {chamberName}
              </h2>

              {showControls ? (
                <div className="text-left mb-6 bg-[#121017] border border-[#c89d46]/30 p-4 max-h-64 overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-[#c89d46]/25 pb-2 mb-3">
                    <span className="text-[10px] font-mono-num tracking-[0.2em] text-[#f2c45a] uppercase">
                      KEYBOARD SHORTCUTS &amp; RESOURCE GUIDE
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowControls(false)}
                      className="text-xs font-mono-num text-[#d4a548] hover:underline cursor-pointer"
                    >
                      HIDE
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PAUSE_SHORTCUTS.map((sc) => (
                      <div
                        key={sc.key}
                        className="flex items-center justify-between text-xs bg-[#181520] px-2.5 py-1.5 border border-[#c89d46]/15"
                      >
                        <span className="text-[#dfd3be]">{sc.label}</span>
                        <strong className="font-mono-num text-[#f5c451] ml-2">{sc.key}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 p-4 mb-6 bg-[#14131a] border border-[#c89d46]/25">
                  <div>
                    <div className="text-[10px] tracking-[0.18em] text-[#9c917e] uppercase mb-1">
                      CHAMBER
                    </div>
                    <div className="text-lg font-bold font-mono-num text-[#f5ebd6]">
                      {chamberId}/{CHAMBERS.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-[0.18em] text-[#9c917e] uppercase mb-1">
                      RUN SCORE
                    </div>
                    <div className="text-lg font-bold font-mono-num text-[#f5ebd6]">
                      {finalScore}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-[0.18em] text-[#9c917e] uppercase mb-1">
                      ASHEN KARMA
                    </div>
                    <div className="text-lg font-bold font-mono-num text-[#f2c45a]">
                      {totalKarma}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onResume}
                  className="px-6 py-3 bg-[#d4a548] hover:bg-[#e5b85b] text-[#090807] font-bold text-xs tracking-[0.14em] uppercase cursor-pointer whitespace-nowrap"
                >
                  RESUME [ESC]
                </button>
                <button
                  type="button"
                  onClick={() => setShowControls((prev) => !prev)}
                  className="px-5 py-3 bg-[#17151d] hover:bg-[#24212c] text-[#f2c45a] border border-[#d4a548]/55 font-semibold text-xs tracking-[0.12em] uppercase cursor-pointer whitespace-nowrap"
                >
                  {showControls ? 'STATS' : 'CONTROLS'}
                </button>
                <button
                  type="button"
                  onClick={onOpenShrine}
                  className="px-5 py-3 bg-[#17151d] hover:bg-[#24212c] text-[#f2c45a] border border-[#d4a548]/55 font-semibold text-xs tracking-[0.12em] uppercase cursor-pointer whitespace-nowrap"
                >
                  SHRINE
                </button>
                <button
                  type="button"
                  onClick={onReturnTitle}
                  className="px-5 py-3 bg-[#17151d] hover:bg-[#24212c] text-[#dfd3be] border border-[#dfd3be]/25 font-semibold text-xs tracking-[0.12em] uppercase cursor-pointer whitespace-nowrap"
                >
                  MAIN MENU
                </button>
              </div>
            </>
          )}

          {mode === 'victory' && (
            <>
              <div className="text-xs font-mono-num tracking-[0.26em] text-[#d4a548] uppercase mb-1.5">
                ACT ONE COMPLETE · SHARD I OF VII RECLAIMED
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-[0.12em] text-[#f9e79f] mb-1.5 leading-tight uppercase">
                TO BE CONTINUED
              </h2>
              <div className="text-xs font-mono-num tracking-[0.2em] text-[#ff9e6b] uppercase mb-3">
                END OF ACT I VERTICAL SLICE · SIX SHARDS OF THE MANI REMAIN
              </div>
              <p className="text-xs md:text-sm text-[#d8ccb8] max-w-lg mx-auto leading-relaxed mb-4">
                Dundubhi’s bronze war-drum is split and Vrikodara’s furnace is finally quiet. In
                your fist rests the First Shard of the Bleeding Crown—and on Sanjaya’s chronicle,
                the first royal lie has been struck through:{' '}
                <em className="text-[#f5c451]">it was a camp, not a fortress</em>.
              </p>

              {/* Run Combat & Build Recap Panel (Learning Value + Next Strategy) */}
              <div className="text-left bg-[#121017] border border-[#c89d46]/35 p-4 mb-5">
                <div className="text-[11px] font-mono-num tracking-[0.18em] text-[#f5c451] uppercase font-bold mb-2.5">
                  RUN RECAP &amp; BUILD ANALYSIS
                </div>

                {/* Combat Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pb-3 mb-3 border-b border-white/10 text-center font-mono-num">
                  <div className="bg-[#181520] p-2 border border-white/5">
                    <div className="text-[10px] text-[#9c917e] uppercase">CLEAR TIME</div>
                    <div className="text-sm font-bold text-[#f7efe0]">
                      {formatDuration(runRecap?.runTimeSec || 0)}
                    </div>
                  </div>
                  <div className="bg-[#181520] p-2 border border-white/5">
                    <div className="text-[10px] text-[#9c917e] uppercase">DAMAGE DEALT</div>
                    <div className="text-sm font-bold text-[#ff8a65]">
                      {(runRecap?.damageDealt || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[#181520] p-2 border border-white/5">
                    <div className="text-[10px] text-[#9c917e] uppercase">PARRIES</div>
                    <div className="text-sm font-bold text-[#5ce6ff]">
                      {runRecap?.parriesLanded || 0}
                    </div>
                  </div>
                  <div className="bg-[#181520] p-2 border border-white/5">
                    <div className="text-[10px] text-[#9c917e] uppercase">DODGES</div>
                    <div className="text-sm font-bold text-[#3ee0a8]">
                      {runRecap?.dodgesCompleted || 0}
                    </div>
                  </div>
                  <div className="bg-[#181520] p-2 border border-white/5">
                    <div className="text-[10px] text-[#9c917e] uppercase">POSTURE BREAKS</div>
                    <div className="text-sm font-bold text-[#f5c451]">
                      {runRecap?.postureBreaks || 0}
                    </div>
                  </div>
                  <div className="bg-[#181520] p-2 border border-white/5">
                    <div className="text-[10px] text-[#9c917e] uppercase">KARMA EARNED</div>
                    <div className="text-sm font-bold text-[#3ee0a8]">+{karmaEarnedThisRun}</div>
                  </div>
                </div>

                {/* Boons Taken */}
                <div className="mb-3">
                  <div className="text-[10px] font-mono-num uppercase tracking-wider text-[#9c917e] mb-1.5">
                    BOONS EQUIPPED THIS RUN ({runRecap?.boons.length || 0}):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {runRecap && runRecap.boons.length > 0 ? (
                      runRecap.boons.map((bId) => {
                        const boon = getBoonById(bId);
                        return (
                          <span
                            key={bId}
                            className="px-2.5 py-1 text-xs font-mono-num bg-[#1b1824] border border-white/15 text-[#f7efe0]"
                            style={{ borderLeftColor: boon.accentColor, borderLeftWidth: 3 }}
                          >
                            {boon.name} <span className="text-[#9c917e]">({boon.rarity})</span>
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs font-mono-num text-[#9c917e]">
                        Unblessed Run (No Boons Taken)
                      </span>
                    )}
                  </div>
                </div>

                {/* Standout Build Interaction & Next Run Idea */}
                {insight && (
                  <div className="p-3 bg-[#17141f] border-l-2 border-[#a8ff78] text-xs leading-relaxed">
                    <div className="font-mono-num font-bold text-[#a8ff78] mb-0.5">
                      ✦ {insight.standoutTitle}
                    </div>
                    <div className="text-[#e2d6c3] mb-1.5">{insight.standoutDetail}</div>
                    <div className="text-[#f5c451] font-mono-num">{insight.nextRunTip}</div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onOpenShrine}
                  className="py-3 px-5 bg-[#15131a] hover:bg-[#221f29] text-[#f5ebd6] border border-[#d4a548]/65 font-bold text-xs tracking-[0.12em] uppercase transition-colors cursor-pointer"
                >
                  HOMA SHRINE ({totalKarma} KARMA)
                </button>
                <button
                  type="button"
                  data-start="true"
                  onClick={onPlayAgain}
                  className="py-3 px-6 bg-[#d4a548] hover:bg-[#e5b85b] text-[#090807] border border-[#f5dca0] font-bold text-xs tracking-[0.14em] uppercase transition-colors cursor-pointer"
                >
                  TRY NEW BUILD (REPLAY ACT I)
                </button>
                <button
                  type="button"
                  onClick={onReturnTitle}
                  className="py-3 px-5 bg-[#120e10] hover:bg-[#1e171b] text-[#b8ac98] border border-[#b8ac98]/30 font-bold text-xs tracking-[0.14em] uppercase transition-colors cursor-pointer"
                >
                  MAIN MENU
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
