'use client';

import React, { useState } from 'react';
import {
  DUNDUBHI_DIALOGUE,
  FERRY_1_SCRIPT,
  getLanternLightState,
  LookObjectSpec,
  PROLOGUE_SCROLLS,
  SANJAYA_CORRECTIONS,
  SHARD_1_MEMORY_SCRIPT,
  SliceStageId,
  StoryMemoryFlags,
  VRIKODARA_DIALOGUE,
} from '@/engine/v7StoryEngine';
import { GAME_ASSETS } from '@/lib/game/assets';

interface NarrativeOverlayProps {
  stage: SliceStageId;
  storyFlags: StoryMemoryFlags;
  activeLookModal: LookObjectSpec | null;
  onCloseLookModal: () => void;
  onAdvanceStage: (nextStage: SliceStageId, updatedFlags?: Partial<StoryMemoryFlags>) => void;
  onOpenShrine: () => void;
  onStartAct1Run: (startChamberIndex?: number) => void;
  onCompleteSlice?: () => void;
}

export function NarrativeOverlay({
  stage,
  storyFlags,
  activeLookModal,
  onCloseLookModal,
  onAdvanceStage,
  onOpenShrine,
  onStartAct1Run,
  onCompleteSlice,
}: NarrativeOverlayProps) {
  const [scrollIndex, setScrollIndex] = useState(0);
  const [hillLookAttempted, setHillLookAttempted] = useState(false);
  const [brahmashiraFired, setBrahmashiraFired] = useState(false);
  const [ferryChoiceId, setFerryChoiceId] = useState<'silence' | 'ask_ila' | 'apologize' | null>(
    storyFlags.ferry1Choice
  );

  const lantern = getLanternLightState(storyFlags);

  // 1. In-Combat / In-World [E] LOOK Inspection Banner (Pauses nothing in simulation, pure room-tone overlay)
  if (activeLookModal) {
    return (
      <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 pointer-events-auto">
        <div className="w-full max-w-2xl bg-[#0b090c]/96 border-2 border-[#d4a548] shadow-[0_18px_60px_rgba(0,0,0,0.95)] p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#c89d46]/30 pb-2">
            <div>
              <div className="text-[10px] font-mono-num tracking-[0.25em] text-[#e6be6a] uppercase">
                {activeLookModal.subtitle} · ROOM TONE ONLY
              </div>
              <h3 className="font-display text-lg font-bold text-[#fff6e8]">
                {activeLookModal.title}
              </h3>
            </div>
            <span className="px-2.5 py-1 text-[10px] font-mono-num bg-[#1f1810] border border-[#f5c451]/50 text-[#f5c451]">
              +{activeLookModal.karmaReward} ASHEN KARMA · THREAD RECORDED ({storyFlags.looks.length}/6)
            </span>
          </div>

          <p className="text-xs md:text-sm text-[#e0d4c0] leading-relaxed italic">
            {activeLookModal.observation}
          </p>

          {activeLookModal.savitriComment && (
            <div className="p-3 bg-[#161214] border-l-2 border-[#f5b952] text-xs text-[#f5dca0] flex items-center gap-3">
              <img
                src={GAME_ASSETS.portraits.savitri}
                alt="Savitri"
                className="w-11 h-11 object-cover border border-[#f5b952]/60 shrink-0"
              />
              <div>
                <strong className="text-[#f5b952] tracking-wider uppercase mr-2">SAVITRI:</strong>
                {activeLookModal.savitriComment}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-mono-num text-[#9c917e]">
              {storyFlags.looks.length >= 3
                ? 'SPARROW MEMORY UNLOCKED: Enough Looks gathered to bandage the sparrow’s wing.'
                : `Look at ${Math.max(0, 3 - storyFlags.looks.length)} more artifacts to complete the Shishira thread.`}
            </span>
            <button
              type="button"
              onClick={onCloseLookModal}
              className="px-4 py-1.5 bg-[#d4a548] hover:bg-[#e5b95c] text-[#090807] font-bold text-xs tracking-wider uppercase cursor-pointer"
            >
              [E / ESC] STEP BACK
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'combat_arena') return null;

  // ==========================================================================
  // STAGE 1: THE FIVE-SCROLL PROLOGUE (Section 7)
  // ==========================================================================
  if (stage === 'prologue_scrolls') {
    const scroll = PROLOGUE_SCROLLS[scrollIndex] || PROLOGUE_SCROLLS[0];
    return (
      <div className="fixed inset-0 z-50 bg-[#070506] flex flex-col justify-between p-6 md:p-12 overflow-y-auto select-none">
        <div className="max-w-5xl w-full mx-auto flex items-center justify-between border-b border-[#c89d46]/30 pb-3">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rotate-45 bg-[#d4a548]" />
            <span className="font-mono-num text-xs tracking-[0.26em] text-[#e6be6a] uppercase">
              PROLOGUE · {scroll.roman} · {scroll.sanskritSubtitle}
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              onAdvanceStage('vaitarani_hub', {
                prologueCompleted: true,
                openingCompleted: true,
              })
            }
            className="text-xs font-mono-num text-[#a99e8b] hover:text-[#f5c451] uppercase tracking-wider cursor-pointer"
          >
            [SKIP TO VAITARANI BOAT HUB →]
          </button>
        </div>

        <div className="max-w-5xl w-full mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-6">
          {/* Painted Scroll Artwork Frame */}
          <div className="lg:col-span-6 relative border-2 border-[#c89d46]/60 bg-[#120e10] shadow-[0_20px_70px_rgba(0,0,0,0.95)] overflow-hidden">
            <img
              src={scroll.artAssetUrl}
              alt={scroll.title}
              className="w-full h-72 md:h-96 object-cover sepia-[0.28] contrast-125 brightness-90"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(10,8,6,0.25) 0%, rgba(10,8,6,0.1) 55%, rgba(10,8,6,0.92) 100%)',
              }}
            />
            <div className="absolute bottom-3 left-4 right-4 text-[11px] text-[#d8ccb8] italic">
              {scroll.visualDirection}
            </div>
          </div>

          {/* Scroll Narration & Script */}
          <div className="lg:col-span-6 space-y-5">
            <div>
              <div className="text-xs font-mono-num tracking-[0.28em] text-[#d4a548] uppercase">
                {scroll.roman}
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-[#f7efe0] tracking-wide mt-1">
                {scroll.title}
              </h2>
            </div>

            <div className="p-4 bg-[#141012] border-l-2 border-[#d4a548] text-sm md:text-base text-[#f2e6d0] leading-relaxed flex items-start gap-3.5">
              <img
                src={GAME_ASSETS.portraits.sanjaya}
                alt="Sanjaya the Blind Chronicler"
                className="w-14 h-14 object-cover border border-[#d4a548]/65 shrink-0 mt-0.5"
              />
              <div>
                <div className="text-[10px] font-mono-num tracking-[0.22em] text-[#d4a548] uppercase mb-1">
                  SANJAYA (THE BLIND CHRONICLER)
                </div>
                {scroll.sanjayaNarration}
              </div>
            </div>

            <div className="space-y-3">
              {scroll.dialogueLines.map((line, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-[#0e0b0d] border border-[#c89d46]/25 text-xs md:text-sm text-[#dfd3be]"
                >
                  <strong className="text-[#f5c451] font-mono-num tracking-wider uppercase mr-2">
                    {line.speaker}:
                  </strong>
                  <span>{line.text}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
              <div className="flex items-center gap-2">
                {PROLOGUE_SCROLLS.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setScrollIndex(idx)}
                    className={`w-8 h-2 transition-colors cursor-pointer ${
                      idx === scrollIndex ? 'bg-[#f5c451]' : 'bg-[#2a2326]'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                {scrollIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setScrollIndex((i) => Math.max(0, i - 1))}
                    className="px-4 py-2.5 bg-[#171316] border border-[#c89d46]/40 text-xs font-bold text-[#e0d4c0] uppercase tracking-wider cursor-pointer"
                  >
                    ← PREVIOUS
                  </button>
                )}
                {scrollIndex < PROLOGUE_SCROLLS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setScrollIndex((i) => i + 1)}
                    className="px-6 py-2.5 bg-[#d4a548] hover:bg-[#e5b95c] text-[#090807] font-bold text-xs uppercase tracking-[0.16em] cursor-pointer"
                  >
                    NEXT SCROLL →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      onAdvanceStage('opening_hill', {
                        prologueCompleted: true,
                      })
                    }
                    className="px-6 py-2.5 bg-gradient-to-r from-[#b81d2a] to-[#d96b26] text-[#fff8eb] font-bold text-xs uppercase tracking-[0.16em] border border-[#f5c451] cursor-pointer"
                  >
                    ENTER THE EIGHTEENTH NIGHT (PLAYABLE OPENING) →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl w-full mx-auto text-center text-[11px] font-mono-num text-[#8f8472]">
          SECTION 7 · TEMPLE WALL SCROLLS IN DARK GOLD &amp; ASH
        </div>
      </div>
    );
  }

  // ==========================================================================
  // STAGE 2: THE OPENING — NIGHT OF ASH HILL & UNWINNABLE PRESERVER DUEL (Sec. 8)
  // ==========================================================================
  if (stage === 'opening_hill') {
    return (
      <div
        className={`fixed inset-0 z-50 flex flex-col justify-between p-6 md:p-12 overflow-y-auto transition-colors duration-700 ${
          brahmashiraFired ? 'bg-[#f7f4eb] text-[#120e10]' : 'bg-[#060508] text-[#f5ebd6]'
        }`}
      >
        <div className="max-w-4xl w-full mx-auto border-b border-[#c89d46]/30 pb-3 flex items-center justify-between">
          <span className="font-mono-num text-xs tracking-[0.24em] text-[#d4a548] uppercase">
            SECTION 8 · THE EIGHTEENTH NIGHT · TWO HUNDRED PACES ABOVE THE CITADEL
          </span>
          <span className="font-mono-num text-xs text-[#ff6b78]">
            MANI IN BROW: WHOLE (7/7 SHARDS)
          </span>
        </div>

        {!brahmashiraFired ? (
          <div className="max-w-4xl w-full mx-auto my-auto space-y-6">
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-wide uppercase">
              The Night of Ash (As Rudra Remembers It)
            </h2>

            <p className="text-sm md:text-base text-[#cfc2ae] leading-relaxed">
              Below the ridge stands a black silhouette of walls. Two hundred paces away, small
              lamps flicker in a hundred windows. A child laughs in the dark, too far to see. Beside
              you stands your father <strong>Kaala-Chakra</strong>, pointing toward the shrouded
              body of a soldier he claims is your brother Nachiketa.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#120f14] border border-[#c89d46]/35 space-y-2 text-xs md:text-sm">
                <div>
                  <strong className="text-[#f5c451]">RUDRA:</strong> “Father? Who is inside?”
                </div>
                <div>
                  <strong className="text-[#ff7b54]">KAALA-CHAKRA:</strong> “Killers. The gods took
                  Nachiketa. Burn them all.”
                </div>
                <div>
                  <strong className="text-[#f5c451]">RUDRA:</strong> “I see lights in the windows.”
                </div>
                <div>
                  <strong className="text-[#ff7b54]">KAALA-CHAKRA:</strong> “Watchfires.”
                </div>
              </div>

              <div className="p-4 bg-[#120f14] border border-[#c89d46]/25 flex flex-col justify-between">
                <div className="text-xs text-[#a99e8b]">
                  The path down the hill is two hundred paces. In the Vow ending, this path will
                  open. Tonight, Rudra is fifteen years of obedience.
                </div>

                {hillLookAttempted && (
                  <div className="my-2 p-2.5 bg-[#241316] border border-[#ff4d5e]/50 text-xs text-[#ff9ea8] font-mono-num">
                    [LOOK BLOCKED]: The path down the hill is a wall. “A weapon does not ask. It
                    strikes.”
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setHillLookAttempted(true)}
                    className="px-4 py-2 bg-[#1b1820] border border-[#5a5266] text-xs font-mono-num text-[#9c917e] cursor-pointer"
                  >
                    [E] WALK DOWN &amp; LOOK (200 PACES)
                  </button>

                  <button
                    type="button"
                    onClick={() => setBrahmashiraFired(true)}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#c82333] via-[#ff6a2b] to-[#fff6e0] text-[#090807] font-bold text-xs tracking-[0.16em] uppercase cursor-pointer"
                  >
                    [LMB] FIRE THE BRAHMASHIRA (WHITE FIRE)
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl w-full mx-auto my-auto space-y-6 bg-[#0d0a0e] text-[#f5ebd6] p-8 border-2 border-[#f5c451] shadow-[0_0_90px_rgba(255,248,224,0.45)]">
            <div className="text-xs font-mono-num tracking-[0.26em] text-[#f5c451] uppercase">
              WHITE FIRE · THE COLOR OF A HELD BREATH · FORTY THOUSAND SOULS
            </div>
            <h3 className="font-display text-2xl md:text-4xl font-bold text-[#fff8eb]">
              The Preserver Arrives Too Late
            </h3>
            <p className="text-sm text-[#d8ccb8] leading-relaxed">
              The Brahmashira burns the citadel into silent white ash. The Mani in your brow drinks
              all forty thousand souls at once. Through the smoke, <strong>the Preserver</strong>{' '}
              descends—calm, his hands open, never attacking, only blocking your strikes.
            </p>
            <div className="p-4 bg-[#161218] border-l-2 border-[#5ce6ff] space-y-2 text-xs md:text-sm">
              <div className="text-[#a99e8b] italic">
                Behind you, Time is held for one breath. Kaala-Chakra whispers “Run” and falls to
                the ground <strong>before</strong> the Preserver’s hand even moves.
              </div>
              <div className="flex items-center gap-3 py-1">
                <img
                  src={GAME_ASSETS.portraits.preserver}
                  alt="The Preserver"
                  className="w-12 h-12 object-cover border border-[#5ce6ff]/60 shrink-0"
                />
                <div>
                  <strong className="text-[#5ce6ff]">THE PRESERVER:</strong> “Rudra. Go and look.”
                </div>
              </div>
              <div className="text-[#d4a548]">
                You do not hear him. You lunge. The Preserver reaches to your brow, tears the Mani
                out, and shatters it into <strong>seven shards</strong> to free the souls. Instead,
                the souls cling to the shards—and to you. Unable to die, you fall into the black
                waters of the Vaitarani.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() =>
                  onAdvanceStage('vaitarani_hub', {
                    openingCompleted: true,
                  })
                }
                className="px-7 py-3 bg-[#d4a548] hover:bg-[#e5b95c] text-[#090807] font-bold text-xs tracking-[0.18em] uppercase cursor-pointer"
              >
                FALL THREE THOUSAND YEARS INTO THE VAITARANI →
              </button>
            </div>
          </div>
        )}

        <div className="max-w-4xl w-full mx-auto text-center text-[11px] font-mono-num text-[#8f8472]">
          “VISHNU NEVER TOUCHED HIM. TIME WAS HELD FOR ONE BREATH SO IT LOOKED THAT WAY.”
        </div>
      </div>
    );
  }

  // ==========================================================================
  // STAGE 3: THE HUB — SAVITRI'S BOAT ON THE VAITARANI (Section 8, 9, 28)
  // ==========================================================================
  if (stage === 'vaitarani_hub' || stage === 'opening_wake') {
    const foldedPageLooked = storyFlags.looks.includes('boat_folded_page');
    return (
      <div className="fixed inset-0 z-50 bg-[#060609] flex flex-col justify-between p-6 md:p-11 overflow-y-auto select-none">
        {/* Top Bar: Lantern State & Story Flags */}
        <div className="max-w-6xl w-full mx-auto flex flex-wrap items-center justify-between gap-4 border-b border-[#c89d46]/30 pb-3.5">
          <div className="flex items-center gap-3">
            <span
              className="w-3.5 h-3.5 rounded-full"
              style={{
                backgroundColor: lantern.flameColor,
                boxShadow: `0 0 16px ${lantern.flameColor}`,
              }}
            />
            <span className="font-mono-num text-xs tracking-[0.22em] text-[#f5ebd6] uppercase">
              THE HUB · SAVITRI’S BOAT ON THE VAITARANI · LANTERN:{' '}
              <strong style={{ color: lantern.flameColor }}>{lantern.label}</strong>
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono-num text-[#c4b7a2]">
            <span>
              LOOK THREADS: <strong className="text-[#f5c451]">{storyFlags.looks.length}/6</strong>
            </span>
            <span>
              SHARDS: <strong className="text-[#ff7b54]">{storyFlags.shardsCollected}/7</strong>
            </span>
            <span>
              FALLS: <strong className="text-[#9bc4e2]">{storyFlags.deaths}</strong>
            </span>
          </div>
        </div>

        {/* Center Boat Scene */}
        <div className="max-w-6xl w-full mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-6">
          {/* Boat Visual & Lantern Glow */}
          <div className="lg:col-span-6 relative border border-[#c89d46]/50 bg-[#0c0a0e] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.95)]">
            <img
              src={GAME_ASSETS.portraits.savitri}
              alt="Savitri's Boat on the Vaitarani River"
              className="w-full h-72 md:h-96 object-cover object-top"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 38% 58%, ${lantern.glowColor} 0%, rgba(6,6,10,0.82) 78%)`,
              }}
            />
            <div className="absolute bottom-4 left-4 right-4 p-4 bg-[#0b090d]/92 border border-[#c89d46]/40 flex items-start gap-3.5">
              <img
                src={GAME_ASSETS.portraits.savitri}
                alt="Savitri"
                className="w-14 h-14 object-cover border border-[#f5b952]/70 shrink-0"
              />
              <div className="space-y-1">
                <div className="text-[10px] font-mono-num tracking-[0.24em] text-[#d4a548] uppercase">
                  SAVITRI · LAST FERRYWOMAN OF THE VAITARANI ({lantern.savitriVoiceTone})
                </div>
                <p className="text-xs md:text-sm text-[#fff6e8] leading-relaxed">
                  {lantern.savitriWakeLine}
                </p>
                <p className="text-xs text-[#d4a548] italic">
                  “At the end, you answer one question. Will you still be here?”
                </p>
              </div>
            </div>
          </div>

          {/* Hub Actions, Look Seed & Sanjaya's Chronicle */}
          <div className="lg:col-span-6 space-y-5">
            <div>
              <div className="text-xs font-mono-num tracking-[0.28em] text-[#d4a548] uppercase">
                ACT I · THE CHARNEL PLAINS (VERTICAL SLICE)
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-[#f7efe0] mt-1">
                Three Thousand Years Later
              </h2>
              <p className="text-xs md:text-sm text-[#c7bba6] leading-relaxed mt-2">
                Savitri has hauled you from the river of the dead. In your hand is your broken iron
                <strong> Gada</strong>, stamped with a spiral mark. In your brow is an empty hollow
                that hums a thin, wordless lullaby.
              </p>
            </div>

            {/* Sanjaya's Chronicle Status (Shows Strikethrough Correction #1 once Vrikodara's Shard is taken!) */}
            <div className="p-4 bg-[#120f15] border border-[#c89d46]/35 flex items-start gap-3.5">
              <img
                src={GAME_ASSETS.portraits.sanjaya}
                alt="Sanjaya"
                className="w-12 h-12 object-cover border border-[#d4a548]/60 shrink-0"
              />
              <div className="space-y-1">
                <div className="text-[10px] font-mono-num tracking-[0.22em] text-[#e6be6a] uppercase">
                  SANJAYA’S COURT CHRONICLE · LIVE RECORD
                </div>
                <p className="text-xs md:text-sm text-[#e5dac5]">
                  “On the Eighteenth Night, Rudra turned the Brahmashira upon{' '}
                  {storyFlags.shardsCollected >= 1 || storyFlags.shardsRecovered >= 1 ? (
                    <>
                      <span className="line-through text-[#ff5e6c] mr-2">
                        the fortress of killers
                      </span>
                      <strong className="text-[#f5c451] underline decoration-[#f5c451]">
                        a camp
                      </strong>
                    </>
                  ) : (
                    <span className="text-[#d4a548]">the fortress of killers</span>
                  )}
                  .”
                </p>
              </div>
            </div>

            {/* Boat [E] Look Object: The Folded Ledger Page in the Base of the Lantern */}
            <div className="p-4 bg-[#141116] border border-[#c89d46]/30 flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono-num text-[#f5c451] uppercase tracking-wider">
                  [E] LOOK OBJECT ON THE BOAT
                </div>
                <div className="text-xs md:text-sm font-bold text-[#f7efe0]">
                  Folded Ledger Page in the Base of Savitri’s Lantern
                </div>
                {foldedPageLooked && (
                  <p className="text-xs text-[#bfb29e] mt-1 italic">
                    “The yield does not match the wounded. I will tell Rudra at dawn.” — Nachiketa’s
                    hand.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!foldedPageLooked) {
                    onAdvanceStage('vaitarani_hub', {
                      looks: [...storyFlags.looks, 'boat_folded_page'],
                    });
                  }
                }}
                className="px-3.5 py-2 bg-[#241c12] hover:bg-[#332718] border border-[#f5c451]/60 text-xs font-mono-num text-[#f5c451] uppercase shrink-0 cursor-pointer"
              >
                {foldedPageLooked ? 'EXAMINED ✓' : '[E] LOOK AT LANTERN BASE'}
              </button>
            </div>

            {/* Primary Hub Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => onStartAct1Run(0)}
                className="px-6 py-3.5 bg-gradient-to-r from-[#b81d2a] via-[#d94426] to-[#cf8c28] text-[#fff8eb] font-display font-bold text-xs tracking-[0.16em] uppercase border border-[#f5d061] cursor-pointer"
              >
                STEP ONTO THE CHARNEL PLAINS (ACT I) →
              </button>

              <button
                type="button"
                onClick={onOpenShrine}
                className="px-5 py-3.5 bg-[#151218] hover:bg-[#221c26] text-[#f2c45a] font-display font-bold text-xs tracking-[0.15em] uppercase border border-[#c89d46]/60 cursor-pointer"
              >
                SHRINE OF ASHEN KARMA
              </button>

              <button
                type="button"
                onClick={() => onStartAct1Run(3)}
                className="px-4 py-2.5 bg-[#1b1316] hover:bg-[#2b1c22] text-[#ff8a94] font-mono-num text-[11px] tracking-wider uppercase border border-[#a83240]/50 cursor-pointer"
              >
                [JUMP TO MINI-BOSS] 3D DUNDUBHI
              </button>

              <button
                type="button"
                onClick={() => onStartAct1Run(7)}
                className="px-4 py-2.5 bg-[#1f1612] hover:bg-[#30211a] text-[#ffba78] font-mono-num text-[11px] tracking-wider uppercase border border-[#b86b28]/50 cursor-pointer"
              >
                [JUMP TO WARDEN] 3D VRIKODARA (SHARD #1)
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 text-[11px] font-mono-num text-[#8f8472]">
              <button
                type="button"
                onClick={() => {
                  setScrollIndex(0);
                  onAdvanceStage('prologue_scrolls');
                }}
                className="hover:text-[#f5c451] underline cursor-pointer"
              >
                Rewatch Five-Scroll Prologue &amp; Opening
              </button>
              {storyFlags.shardsCollected >= 1 && (
                <button
                  type="button"
                  onClick={() => onAdvanceStage('ferry_1')}
                  className="text-[#f5c451] hover:underline cursor-pointer"
                >
                  Replay Ferry I Scene →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // STAGE 3B: INTER-CHAMBER PAINTED CUTSCENES (SAVITRI'S LANTERN & THE PRESERVER)
  // ==========================================================================
  if (stage === 'savitri_lantern_interlude') {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 select-none">
        <div className="max-w-3xl w-full bg-[#0c0a0f] border-2 border-[#f5b952] p-7 space-y-5 shadow-[0_24px_90px_rgba(0,0,0,0.98)]">
          <div className="flex items-center justify-between border-b border-[#c89d46]/30 pb-3">
            <div className="flex items-center gap-3">
              <span
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: lantern.flameColor,
                  boxShadow: `0 0 14px ${lantern.flameColor}`,
                }}
              />
              <span className="text-xs font-mono-num tracking-[0.24em] text-[#f5b952] uppercase">
                BETWEEN CHAMBERS · SAVITRI’S LANTERN ON THE RIVER BANK
              </span>
            </div>
            <span className="text-xs font-mono-num text-[#d4a548]">
              LANTERN: {lantern.label}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            <div className="md:col-span-5 relative border border-[#f5b952]/60 bg-[#08060a] overflow-hidden">
              <img
                src={GAME_ASSETS.scrolls.scroll2ChildAndMani}
                alt="Painted Scroll — The Child and the Mani"
                className="w-full h-56 object-cover sepia-[0.2] contrast-115"
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 60%, ${lantern.glowColor} 0%, rgba(8,6,10,0.85) 85%)`,
                }}
              />
              <div className="absolute bottom-2.5 left-3 right-3 text-[11px] text-[#f5dca0] italic">
                Savitri lifts her lantern against the sealed threshold of Raktabija.
              </div>
            </div>

            <div className="md:col-span-7 space-y-3.5">
              <h3 className="font-display text-2xl font-bold text-[#fff6e8]">
                The Only Warm Light on the Charnel Plains
              </h3>
              <div className="p-3.5 bg-[#151118] border-l-2 border-[#f5b952] text-sm text-[#f2e6d0] flex items-start gap-3">
                <img
                  src={GAME_ASSETS.portraits.savitri}
                  alt="Savitri"
                  className="w-12 h-12 object-cover border border-[#f5b952]/70 shrink-0 mt-0.5"
                />
                <div>
                  <strong className="text-[#f5b952] font-mono-num uppercase mr-2">SAVITRI:</strong>
                  “Hold still, Rudra. Look at the iron chains on that gate—and look at the haft of
                  your own mace. The same coiled spiral is stamped into both. Your father
                  Kaala-Chakra forged the locks before he sent you to burn the Shishira.”
                </div>
              </div>
              <div className="p-3.5 bg-[#120e14] border-l-2 border-[#d4a548] text-sm text-[#e0d4c0] flex items-start gap-3">
                <img
                  src={GAME_ASSETS.portraits.sanjaya}
                  alt="Sanjaya"
                  className="w-12 h-12 object-cover border border-[#d4a548]/60 shrink-0 mt-0.5"
                />
                <div>
                  <strong className="text-[#d4a548] font-mono-num uppercase mr-2">SANJAYA:</strong>
                  “In the base of her lantern lies a folded tally-leaf written in your brother
                  Nachiketa’s hand: <em>‘The yield does not match the wounded. I will tell Rudra at dawn.’</em>”
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => onAdvanceStage('combat_arena')}
              className="px-6 py-2.5 bg-[#d4a548] hover:bg-[#e5b95c] text-[#090807] font-bold text-xs tracking-[0.16em] uppercase cursor-pointer"
            >
              STEP INTO THE SEALED GATE OF RAKTABIJA →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'preserver_interlude') {
    return (
      <div className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-6 select-none">
        <div className="max-w-3xl w-full bg-[#0b0a10] border-2 border-[#5ce6ff] p-7 space-y-5 shadow-[0_24px_90px_rgba(0,0,0,0.98)]">
          <div className="flex items-center justify-between border-b border-[#5ce6ff]/30 pb-3">
            <span className="text-xs font-mono-num tracking-[0.24em] text-[#5ce6ff] uppercase">
              MEMORY ECHO · THE EIGHTEENTH NIGHT · THE PRESERVER MOMENT
            </span>
            <span className="text-xs font-mono-num text-[#ff9ea8]">
              TIME HELD FOR ONE BREATH
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            <div className="md:col-span-5 relative border border-[#5ce6ff]/60 bg-[#07080d] overflow-hidden">
              <img
                src={GAME_ASSETS.scrolls.scroll5FallOfFather}
                alt="Painted Scroll — The Preserver and the Fall of the Father"
                className="w-full h-56 object-cover"
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(10,14,22,0.15) 0%, rgba(8,10,16,0.88) 100%)',
                }}
              />
              <div className="absolute bottom-2.5 left-3 right-3 text-[11px] text-[#bfefff] italic">
                “Vishnu never touched him. Time was held for one breath so it looked that way.”
              </div>
            </div>

            <div className="md:col-span-7 space-y-3.5">
              <h3 className="font-display text-2xl font-bold text-[#fff8eb]">
                “Rudra. Go and Look.”
              </h3>
              <p className="text-xs sm:text-sm text-[#d8ccb8] leading-relaxed">
                As the chariot pyres of Chamber III rise ahead, the hollow in your brow throbs with
                white Brahmashira fire. You remember the Preserver descending through the smoke—his
                hands open, never striking you, only blocking your blows while your father
                Kaala-Chakra fell to the ground <strong>before</strong> the Preserver’s hand even
                moved.
              </p>
              <div className="p-3.5 bg-[#111520] border-l-2 border-[#5ce6ff] text-sm text-[#e6f9ff] flex items-center gap-3">
                <img
                  src={GAME_ASSETS.portraits.preserver}
                  alt="The Preserver"
                  className="w-12 h-12 object-cover border border-[#5ce6ff]/70 shrink-0"
                />
                <div>
                  <strong className="text-[#5ce6ff] font-mono-num uppercase mr-2">
                    THE PRESERVER:
                  </strong>
                  “I shattered the Mani into seven shards to free the forty thousand souls you
                  burned. Instead, they clung to the shards—and to your blood-brother Vrikodara.”
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => onAdvanceStage('combat_arena')}
              className="px-6 py-2.5 bg-[#5ce6ff] hover:bg-[#82edff] text-[#06080c] font-bold text-xs tracking-[0.16em] uppercase cursor-pointer"
            >
              ENTER THE KURUKSHETRA CHARIOT PYRE →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // STAGE 4: DUNDUBHI INTRO, AFTERMATH & VRIKODARA INTRO (Section 9)
  // ==========================================================================
  if (stage === 'dundubhi_intro') {
    return (
      <div className="fixed inset-0 z-50 bg-black/88 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-[#0e0b0f] border-2 border-[#d4a548] p-7 space-y-5 shadow-[0_24px_80px_rgba(0,0,0,0.96)]">
          <div className="flex items-center gap-4 border-b border-[#c89d46]/30 pb-4">
            <img
              src={GAME_ASSETS.portraits.dundubhi}
              alt="Dundubhi the Bronze War-Drum"
              className="w-20 h-20 object-cover border-2 border-[#d4a548] shrink-0"
            />
            <div>
              <div className="text-xs font-mono-num tracking-[0.25em] text-[#ff8a94] uppercase">
                ACT I MINI-BOSS · MANDAPA OF THE WAR-DRUM
              </div>
              <h3 className="font-display text-2xl font-bold text-[#fff6e8]">
                Dundubhi, The Bronze Buffalo Demon
              </h3>
            </div>
          </div>
          <div className="space-y-3">
            {DUNDUBHI_DIALOGUE.preFight.map((line, i) => (
              <div
                key={i}
                className="p-3.5 bg-[#161218] border-l-2 border-[#f5b952] text-sm text-[#f2e6d0] flex items-center gap-3"
              >
                <img
                  src={
                    line.speaker.includes('SAVITRI')
                      ? GAME_ASSETS.portraits.savitri
                      : GAME_ASSETS.portraits.sanjaya
                  }
                  alt={line.speaker}
                  className="w-11 h-11 object-cover border border-[#c89d46]/60 shrink-0"
                />
                <div>
                  <strong className="text-[#f5b952] font-mono-num uppercase mr-2">
                    {line.speaker}:
                  </strong>
                  {line.text}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onAdvanceStage('combat_arena')}
              className="px-6 py-2.5 bg-[#d4a548] hover:bg-[#e5b95c] text-[#090807] font-bold text-xs tracking-wider uppercase cursor-pointer"
            >
              ENGAGE DUNDUBHI →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'dundubhi_aftermath') {
    return (
      <div className="fixed inset-0 z-50 bg-black/88 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-[#0e0b0f] border-2 border-[#d4a548] p-7 space-y-5 shadow-[0_24px_80px_rgba(0,0,0,0.96)]">
          <div className="flex items-center gap-4 border-b border-[#c89d46]/30 pb-4">
            <img
              src={GAME_ASSETS.portraits.dundubhi}
              alt="Dundubhi Vanquished"
              className="w-16 h-16 object-cover border border-[#d4a548]/70 shrink-0 grayscale-[0.3]"
            />
            <div>
              <div className="text-xs font-mono-num tracking-[0.25em] text-[#e6be6a] uppercase">
                ACT I MINI-BOSS VANQUISHED · DUNDUBHI’S BRONZE WAR-DRUM
              </div>
              <h3 className="font-display text-2xl font-bold text-[#fff6e8]">
                The Spiral on the Drum Skin
              </h3>
            </div>
          </div>
          <div className="space-y-3">
            {DUNDUBHI_DIALOGUE.postFight.map((line, i) => (
              <div
                key={i}
                className="p-3.5 bg-[#161218] border-l-2 border-[#f5b952] text-sm text-[#f2e6d0] flex items-center gap-3"
              >
                <img
                  src={GAME_ASSETS.portraits.savitri}
                  alt="Savitri"
                  className="w-11 h-11 object-cover border border-[#f5b952]/60 shrink-0"
                />
                <div>
                  <strong className="text-[#f5b952] font-mono-num uppercase mr-2">
                    {line.speaker}:
                  </strong>
                  {line.text}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#a99e8b] italic">
            Stamped into the center of Dundubhi’s split bronze drum-hide is the exact coiled spiral
            mark found on the Shishira tally-leaves.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onAdvanceStage('combat_arena', { dundubhiCleared: true })}
              className="px-6 py-2.5 bg-[#d4a548] hover:bg-[#e5b95c] text-[#090807] font-bold text-xs tracking-wider uppercase cursor-pointer"
            >
              CONTINUE TOWARD VRIKODARA’S SANCTUM →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'vrikodara_intro') {
    return (
      <div className="fixed inset-0 z-50 bg-black/88 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-[#0e0b0f] border-2 border-[#ff7b54] p-7 space-y-5 shadow-[0_24px_80px_rgba(0,0,0,0.96)]">
          <div className="flex items-center gap-4 border-b border-[#c89d46]/30 pb-4">
            <img
              src={GAME_ASSETS.portraits.vrikodara}
              alt="Vrikodara the Blood-Brother"
              className="w-20 h-20 object-cover border-2 border-[#ff7b54] shrink-0"
            />
            <div>
              <div className="text-xs font-mono-num tracking-[0.25em] text-[#ff7b54] uppercase">
                ACT I WARDEN · SHARD #1 OF THE BLEEDING CROWN
              </div>
              <h3 className="font-display text-2xl font-bold text-[#fff6e8]">
                Vrikodara, The Starving Furnace
              </h3>
            </div>
          </div>
          <div className="space-y-3">
            {VRIKODARA_DIALOGUE.preFight.map((line, i) => (
              <div
                key={i}
                className="p-3.5 bg-[#161218] border-l-2 border-[#ff7b54] text-sm text-[#f2e6d0] flex items-center gap-3"
              >
                <img
                  src={
                    line.speaker.includes('RUDRA')
                      ? GAME_ASSETS.portraits.rudra
                      : GAME_ASSETS.portraits.vrikodara
                  }
                  alt={line.speaker}
                  className="w-11 h-11 object-cover border border-[#ff7b54]/60 shrink-0"
                />
                <div>
                  <strong className="text-[#ffba78] font-mono-num uppercase mr-2">
                    {line.speaker}:
                  </strong>
                  {line.text}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onAdvanceStage('combat_arena')}
              className="px-6 py-2.5 bg-[#ff7b54] hover:bg-[#ff9473] text-[#090807] font-bold text-xs tracking-wider uppercase cursor-pointer"
            >
              FACE VRIKODARA →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // STAGE 5: SHARD #1 MEMORY & SANJAYA CORRECTION #1 (Section 9 & 20)
  // ==========================================================================
  if (stage === 'shard1_memory') {
    const corr = SANJAYA_CORRECTIONS[0];
    return (
      <div className="fixed inset-0 z-50 bg-[#050407]/96 flex items-center justify-center p-6 overflow-y-auto">
        <div className="max-w-3xl w-full bg-[#0e0b10] border-2 border-[#f5c451] p-8 space-y-5 shadow-[0_24px_90px_rgba(0,0,0,0.98)]">
          <div className="flex items-center justify-between border-b border-[#c89d46]/30 pb-3">
            <div>
              <div className="text-xs font-mono-num tracking-[0.26em] text-[#ff7b54] uppercase">
                {SHARD_1_MEMORY_SCRIPT.subtitle}
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-[#fff6e8] mt-1">
                {SHARD_1_MEMORY_SCRIPT.title}
              </h2>
            </div>
            <span className="px-3 py-1 bg-[#261416] border border-[#ff6b78] text-xs font-mono-num text-[#ff9ea8]">
              SHARD 1 OF 7 RECLAIMED
            </span>
          </div>

          <div className="p-4 bg-[#151118] border border-[#c89d46]/30 text-sm text-[#e0d4c0] leading-relaxed italic flex items-center gap-3.5">
            <img
              src={GAME_ASSETS.portraits.vrikodara}
              alt="Vrikodara"
              className="w-14 h-14 object-cover border border-[#ff7b54]/70 shrink-0 not-italic"
            />
            <div>
              <strong className="text-[#ffba78] not-italic">VRIKODARA’S LAST WORDS:</strong>{' '}
              {VRIKODARA_DIALOGUE.deathQuote}
            </div>
          </div>

          {/* Shard #1 Cutscene Painting: Healer's Tent & Clay Lamp */}
          <div className="relative border border-[#c89d46]/50 bg-[#09070b] overflow-hidden">
            <img
              src={SHARD_1_MEMORY_SCRIPT.artAssetUrl}
              alt="Shard #1 Memory — The Healer's Tent in the Shishira Camp"
              className="w-full h-56 md:h-64 object-cover"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(8,6,10,0.15) 0%, rgba(8,6,10,0.88) 100%)',
              }}
            />
            <p className="relative p-4 text-xs md:text-sm text-[#f2e6d0] leading-relaxed">
              {SHARD_1_MEMORY_SCRIPT.visualDescription}
            </p>
          </div>

          <div className="space-y-2.5">
            {SHARD_1_MEMORY_SCRIPT.exchanges.map((ex, i) => (
              <div
                key={i}
                className="p-3.5 bg-[#120e14] border-l-2 border-[#d4a548] text-sm text-[#fff6e8] flex items-center gap-3"
              >
                <img
                  src={
                    ex.speaker.includes('SAVITRI')
                      ? GAME_ASSETS.portraits.savitri
                      : GAME_ASSETS.portraits.rudra
                  }
                  alt={ex.speaker}
                  className="w-10 h-10 object-cover border border-[#d4a548]/60 shrink-0"
                />
                <div>
                  <strong className="text-[#f5c451] font-mono-num mr-2">{ex.speaker}:</strong>
                  {ex.text}
                </div>
              </div>
            ))}
          </div>

          {/* Live Sanjaya Strikethrough Correction #1 */}
          <div className="p-5 bg-[#1a1215] border-2 border-[#ff5e6c]/60 flex items-start gap-3.5">
            <img
              src={GAME_ASSETS.portraits.sanjaya}
              alt="Sanjaya"
              className="w-12 h-12 object-cover border border-[#ff5e6c]/60 shrink-0"
            />
            <div className="space-y-1">
              <div className="text-[10px] font-mono-num tracking-[0.24em] text-[#ff8a94] uppercase">
                {corr.actLabel} · SANJAYA’S CHRONICLE REWRITTEN
              </div>
              <p className="text-sm md:text-base text-[#e5dac5]">
                {corr.sanjayaContext}{' '}
                <span className="line-through text-[#ff5e6c] font-bold mx-1.5">{corr.lieText}</span>{' '}
                <strong className="text-[#f5c451] font-bold text-lg underline decoration-[#f5c451]">
                  {corr.truthText}
                </strong>
                .
              </p>
            </div>
          </div>

          {/* Power Unlocked: Rakshasa Crushing Stance */}
          <div className="p-4 bg-[#1c160e] border border-[#f5c451]/60 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono-num text-[#f5c451] uppercase tracking-wider font-bold">
                ★ {SHARD_1_MEMORY_SCRIPT.unlockedPowerTitle}
              </div>
              <div className="text-xs text-[#d8ccb8] mt-1">
                {SHARD_1_MEMORY_SCRIPT.unlockedPowerDesc}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() =>
                onAdvanceStage('ferry_1', {
                  shardsCollected: Math.max(1, storyFlags.shardsCollected),
                  shardsRecovered: Math.max(1, storyFlags.shardsRecovered || 0),
                  rakshasaStanceUnlocked: true,
                })
              }
              className="px-7 py-3 bg-[#d4a548] hover:bg-[#e5b95c] text-[#090807] font-bold text-xs tracking-[0.18em] uppercase cursor-pointer"
            >
              STEP INTO SAVITRI’S BOAT (FERRY I) →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // STAGE 6: FERRY I — TWO PEOPLE AND A LANTERN (Section 9)
  // ==========================================================================
  if (stage === 'ferry_1' || stage === 'ferry_1_scene') {
    const selectedChoiceObj = FERRY_1_SCRIPT.choices.find((c) => c.id === ferryChoiceId);
    return (
      <div className="fixed inset-0 z-50 bg-[#050508] flex flex-col justify-between p-6 md:p-12 overflow-y-auto">
        <div className="max-w-4xl w-full mx-auto border-b border-[#c89d46]/30 pb-3 flex items-center justify-between">
          <span className="font-mono-num text-xs tracking-[0.24em] text-[#f5b952] uppercase">
            {FERRY_1_SCRIPT.title} · {FERRY_1_SCRIPT.subtitle}
          </span>
          <span className="font-mono-num text-xs text-[#a99e8b]">
            TANPURA DRONE &amp; LAPPING WATER
          </span>
        </div>

        <div className="max-w-4xl w-full mx-auto my-auto space-y-6 py-6">
          <div className="p-6 bg-[#100d12] border border-[#c89d46]/45 flex items-start gap-4 shadow-[0_20px_70px_rgba(0,0,0,0.95)]">
            <img
              src={GAME_ASSETS.portraits.savitri}
              alt="Savitri"
              className="w-16 h-16 object-cover border border-[#f5b952]/70 shrink-0"
            />
            <div className="space-y-2">
              <div className="text-xs font-mono-num tracking-[0.22em] text-[#f5b952] uppercase">
                SAVITRI (ROWING IN THE LANTERN LIGHT)
              </div>
              <p className="text-base md:text-lg text-[#fff6e8] leading-relaxed">
                {FERRY_1_SCRIPT.savitriOpening}
              </p>
            </div>
          </div>

          {/* Three Dialogue Choices (Section 9 & 31: Silence is always an option) */}
          <div className="space-y-2.5">
            <div className="text-xs font-mono-num tracking-[0.2em] text-[#d4a548] uppercase">
              CHOOSE RUDRA’S RESPONSE:
            </div>
            {FERRY_1_SCRIPT.choices.map((ch) => {
              const active = ferryChoiceId === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setFerryChoiceId(ch.id)}
                  className={`w-full p-4 text-left border transition-all cursor-pointer ${
                    active
                      ? 'bg-[#241b12] border-[#f5c451] text-[#fff8eb]'
                      : 'bg-[#0e0c10] border-[#c89d46]/30 text-[#cfc2ae] hover:border-[#c89d46]/70'
                  }`}
                >
                  <div className="text-xs md:text-sm font-bold">{ch.label}</div>
                </button>
              );
            })}
          </div>

          {selectedChoiceObj && (
            <div className="p-5 bg-[#141016] border-l-2 border-[#f5c451] space-y-3">
              <div className="text-xs md:text-sm text-[#d8ccb8] italic">
                <strong className="text-[#f5c451] not-italic mr-2">RUDRA:</strong>
                {selectedChoiceObj.rudraLine}
              </div>
              <div className="text-sm md:text-base text-[#fff6e8]">
                <strong className="text-[#f5b952] mr-2">SAVITRI:</strong>
                {selectedChoiceObj.savitriReply}
              </div>
            </div>
          )}

          {selectedChoiceObj && (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
              <button
                type="button"
                onClick={() =>
                  onAdvanceStage('act6_choice', {
                    ferry_listened: true,
                    ferry1Choice: selectedChoiceObj.id,
                  })
                }
                className="px-5 py-3 bg-[#1b151e] hover:bg-[#2a202e] border border-[#c89d46]/50 text-xs font-mono-num text-[#f5c451] uppercase tracking-wider cursor-pointer"
              >
                [PREVIEW THE FINAL CHOICE: THE VOW vs. THE SOVEREIGN →]
              </button>

              <button
                type="button"
                onClick={() => {
                  onAdvanceStage('combat_arena', {
                    ferry_listened: true,
                    ferry1Choice: selectedChoiceObj.id,
                  });
                  if (onCompleteSlice) {
                    onCompleteSlice();
                  }
                }}
                className="px-7 py-3 bg-[#d4a548] hover:bg-[#e5b95c] text-[#090807] font-bold text-xs tracking-[0.18em] uppercase cursor-pointer"
              >
                COMPLETE ACT I VERTICAL SLICE (TO BE CONTINUED) →
              </button>
            </div>
          )}
        </div>

        <div className="max-w-4xl w-full mx-auto text-center text-[11px] font-mono-num text-[#8f8472]">
          FERRY SCENE LISTENED · SPARROW WING STATUS:{' '}
          {storyFlags.looks.length >= 3 ? 'BANDAGED (ENOUGH LOOKS)' : 'UNBANDAGED'}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // STAGE 7: THE FINAL CHOICE (SECTION 16, 17, 18 — THE VOW vs. THE SOVEREIGN)
  // ==========================================================================
  if (stage === 'act6_choice' || stage === 'ending_vow' || stage === 'ending_sovereign') {
    const sparrowBandaged = storyFlags.looks.length >= 3;
    return (
      <div className="fixed inset-0 z-50 bg-[#060508] flex flex-col justify-between p-6 md:p-12 overflow-y-auto">
        <div className="max-w-4xl w-full mx-auto border-b border-[#c89d46]/30 pb-3 flex items-center justify-between">
          <span className="font-mono-num text-xs tracking-[0.24em] text-[#f5c451] uppercase">
            SECTION 16–18 · THE SOUL FURNACE · THE CHOICE WITH NO TIMER
          </span>
          <button
            type="button"
            onClick={() => onAdvanceStage('vaitarani_hub')}
            className="text-xs font-mono-num text-[#a99e8b] hover:text-[#f5c451] uppercase cursor-pointer"
          >
            [← RETURN TO VAITARANI HUB]
          </button>
        </div>

        {stage === 'act6_choice' && (
          <div className="max-w-4xl w-full mx-auto my-auto space-y-6">
            <h2 className="font-display text-3xl md:text-5xl font-bold text-[#fff6e8]">
              The Whole Mani Hums a Lullaby
            </h2>
            <p className="text-sm md:text-base text-[#d8ccb8] leading-relaxed">
              The seven shards fuse in your fist. The Mani holds every soul you burned in the
              Shishira—and the mother you never met, <strong>Suvarna</strong>. It can bring her
              back, but only by using all forty thousand of them up. Or it can free them all, by
              letting her go.
            </p>
            <div className="p-4 bg-[#141016] border-l-2 border-[#f5b952] text-sm text-[#fff6e8]">
              <strong className="text-[#f5b952] mr-2">SAVITRI (FROM THE DOOR):</strong> “Don’t do
              it for me.”
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <button
                type="button"
                onClick={() => onAdvanceStage('ending_vow', { final_choice: 'vow' })}
                className="p-6 bg-[#141814] hover:bg-[#1d241d] border-2 border-[#f5c451] text-left space-y-2 cursor-pointer"
              >
                <div className="text-xs font-mono-num text-[#f5c451] uppercase tracking-wider">
                  [HOLD TO CRUSH THE MANI] · ENDING ONE
                </div>
                <h3 className="font-display text-2xl font-bold text-[#fff8eb]">The Vow</h3>
                <p className="text-xs text-[#c7bba6] leading-relaxed">
                  Crush the gem. Free the forty thousand souls of the Shishira, let Suvarna go, and
                  walk down the two hundred paces to answer for what you did.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onAdvanceStage('ending_sovereign', { final_choice: 'sovereign' })}
                className="p-6 bg-[#1c1012] hover:bg-[#281518] border-2 border-[#ff5e6c]/70 text-left space-y-2 cursor-pointer"
              >
                <div className="text-xs font-mono-num text-[#ff8a94] uppercase tracking-wider">
                  [RELEASE TO COMPLETE THE RITE] · ENDING TWO
                </div>
                <h3 className="font-display text-2xl font-bold text-[#fff8eb]">The Sovereign</h3>
                <p className="text-xs text-[#c7bba6] leading-relaxed">
                  Speak the word. Burn the souls one last time to raise your mother Suvarna from the
                  stone, and take your father’s throne above the Furnace.
                </p>
              </button>
            </div>
          </div>
        )}

        {stage === 'ending_vow' && (
          <div className="max-w-4xl w-full mx-auto my-auto space-y-5 bg-[#0e0c10] border-2 border-[#f5c451] p-8">
            <div className="text-xs font-mono-num tracking-[0.26em] text-[#f5c451] uppercase">
              ENDING ONE · THE VOW · THE TWO HUNDRED PACES
            </div>
            <h2 className="font-display text-3xl font-bold text-[#fff8eb]">
              “Rudra. I gave you my life so you could hold the world. You held it. Now let it go.”
            </h2>
            <p className="text-sm text-[#e0d4c0] leading-relaxed">
              You crush the Mani. The souls rise through the broken ceiling: Ila and Nachiketa
              standing together, Vrikodara’s wife and son holding their lamp, and Suvarna’s voice
              speaking to you for the first and last time. At the foot of the mountain, Savitri asks
              her question: <em>“Will you still be here?”</em> — <strong>“Yes.”</strong> Her lantern
              goes out, and across the water, a girl laughs.
            </p>
            <p className="text-sm text-[#f5ebd6] leading-relaxed">
              The sun rises. The Look button is open now on the burned hill. You walk the two
              hundred paces down to the third tent from the east gate. A brown sparrow lands on the
              charred stake—
              <strong className="text-[#f5c451]">
                {sparrowBandaged
                  ? ' because you stopped to Look during your journey, its broken wing is neatly bandaged.'
                  : ' its wing still crooked (find 3+ Look objects in Act I to bandage its wing).'}
              </strong>
            </p>
            <div className="p-4 bg-[#16131a] border-l-2 border-[#f5c451] text-sm text-[#fff8eb]">
              <strong className="text-[#f5c451] mr-2">SANJAYA (UNCORRECTED):</strong>
              “Let it be written that he was not wronged. He was forgiven, and he was not let off.
              And he stayed.”
            </div>
          </div>
        )}

        {stage === 'ending_sovereign' && (
          <div className="max-w-4xl w-full mx-auto my-auto space-y-5 bg-[#120b0d] border-2 border-[#ff5e6c] p-8">
            <div className="text-xs font-mono-num tracking-[0.26em] text-[#ff8a94] uppercase">
              ENDING TWO · THE SOVEREIGN
            </div>
            <h2 className="font-display text-3xl font-bold text-[#fff8eb]">
              “Rudra. What did you pay?” — “Nothing that mattered.”
            </h2>
            <p className="text-sm text-[#e0d4c0] leading-relaxed">
              The souls burn one last time, white and silent. Your mother Suvarna steps out of the
              light, looks past your shoulder at the thousands of empty lamps in the Furnace, and
              never speaks again. The Furnace relights—because a woman raised by the Sanjivani must
              be fed—and you sit on your father’s throne speaking in his voice: <em>“No more endings.”</em>
            </p>
            <div className="p-4 bg-[#1a1014] border-l-2 border-[#ff5e6c] text-sm text-[#ffccd2]">
              <strong className="text-[#ff8a94] mr-2">SANJAYA:</strong>
              “Far below on a frozen river, a ferrywoman’s lantern goes out. There is a man on the
              mountain who cannot die...”
            </div>
          </div>
        )}

        <div className="max-w-4xl w-full mx-auto flex justify-end">
          <button
            type="button"
            onClick={() => onAdvanceStage('vaitarani_hub')}
            className="px-6 py-2.5 bg-[#d4a548] text-[#090807] font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            RETURN TO SAVITRI’S BOAT HUB
          </button>
        </div>
      </div>
    );
  }

  return null;
}
