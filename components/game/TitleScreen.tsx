'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GAME_ASSETS, WEAPON_CONFIGS, WeaponId } from '@/lib/game/assets';
import { soundEngine } from '@/lib/game/audio';

interface TitleScreenProps {
  ashenKarma: number;
  preloadProgress?: number;
  selectedWeapon?: WeaponId;
  onSelectWeapon?: (weapon: WeaponId) => void;
  onStartOdyssey: () => void;
  onOpenPrologue?: () => void;
  onOpenShrine: () => void;
  onOpenStory: () => void;
  muted?: boolean;
  onToggleMute?: () => void;
}

const KEYBOARD_SHORTCUTS = [
  { key: 'LMB / [J]', action: 'Light Parashu Combo', desc: '4-hit relentless blood-axe cleave' },
  { key: 'RMB / [V]', action: 'Heavy Stance Unleash', desc: 'Consumes Tapas orbs for screen-shaking smash' },
  { key: '[SPACE]', action: 'Phantom Step Dash', desc: '2-charge iframe dash with hand-painted afterimage' },
  { key: '[TAB]', action: 'Cycle Combat Stance', desc: 'Switch between Smash, Pillar, and Thrust stances' },
  { key: '[T]', action: 'Kalaripayattu Guard Parry', desc: 'Deflect attacks & shatter enemy posture' },
  { key: '[R]', action: 'Amrita Kalasha Draught', desc: 'Restore vitality from sacred vessel' },
  { key: '[Q]', action: 'Agneyastra Fire Bow', desc: 'Loose a blazing astral arrow & immobilize foes' },
  { key: '[E]', action: 'Look / Maya Phantoms', desc: 'Inspect world artifacts or summon mirage clones' },
  { key: '[Z]', action: 'Rudra Tandava Wrath', desc: 'Awaken divine अग्नि (Agni) damage surge' },
  { key: '[F]', action: 'Lethal Execute', desc: 'Finisher on posture-broken enemies' },
  { key: '[1] [2] [3]', action: 'Switch Weapon Aspect', desc: 'Brahmashira Gada / Parashu / Pinaka Glaive' },
  { key: '[ESC]', action: 'Pause / Options Menu', desc: 'Pause combat, view controls, or return to title' },
];

export function TitleScreen({
  ashenKarma,
  selectedWeapon = 'jingu_bang',
  onSelectWeapon,
  onStartOdyssey,
  onOpenPrologue,
  onOpenShrine,
  onOpenStory,
  muted = false,
  onToggleMute,
}: TitleScreenProps) {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [subModal, setSubModal] = useState<'none' | 'options' | 'treasures'>('none');
  const [bgLoaded, setBgLoaded] = useState<boolean>(false);
  const [isTransitioningOut, setIsTransitioningOut] = useState<boolean>(false);
  const [selectedTrackOverride, setSelectedTrackOverride] = useState<string>('auto');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setBgLoaded(true), 60);
    // Start main BGM at the starting of the game on the Homescreen
    soundEngine.startMusic();
    soundEngine.syncBgmState('title', 1, false);

    // Strictly mute the homescreen MP4 video so its embedded sound never plays
    const vid = videoRef.current;
    if (vid) {
      vid.muted = true;
      vid.defaultMuted = true;
      vid.volume = 0;
      vid.play().catch(() => {});
    }
    return () => window.clearTimeout(t);
  }, []);

  const triggerSmoothTransition = (callback: () => void) => {
    if (isTransitioningOut) return;
    setIsTransitioningOut(true);
    callback();
  };

  const menuItems = [
    {
      id: 'new_game',
      label: 'NEW GAME',
      testId: 'start-odyssey-btn',
      isPrimaryStart: true,
      onSelect: () => triggerSmoothTransition(() => onStartOdyssey()),
    },
    {
      id: 'prologue',
      label: 'CHRONICLE',
      testId: 'start-prologue-btn',
      isPrimaryStart: false,
      onSelect: () =>
        triggerSmoothTransition(() => (onOpenPrologue ? onOpenPrologue() : onStartOdyssey())),
    },
    {
      id: 'options',
      label: 'OPTIONS',
      testId: 'open-options-btn',
      isPrimaryStart: false,
      onSelect: () => setSubModal('options'),
    },
    {
      id: 'treasures',
      label: 'TREASURES',
      testId: 'open-treasures-btn',
      isPrimaryStart: false,
      onSelect: () => setSubModal('treasures'),
    },
  ];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (subModal !== 'none') {
        if (e.key === 'Escape') {
          e.preventDefault();
          setSubModal('none');
        }
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % menuItems.length);
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        menuItems[activeIndex]?.onSelect();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <section
      aria-label="Title Screen"
      className={`fixed inset-0 z-30 flex flex-col justify-between px-8 py-9 md:px-16 md:py-14 overflow-hidden select-none bg-[#050405] transition-opacity duration-500 ease-out ${
        isTransitioningOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Layer 1: Full-Bleed Homescreen Cinematic MP4 Video (100% Muted) */}
      <video
        ref={videoRef}
        data-testid="homescreen-cinematic-video"
        poster={GAME_ASSETS.titleBackdrop}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onLoadedData={(e) => {
          e.currentTarget.muted = true;
          e.currentTarget.defaultMuted = true;
          e.currentTarget.volume = 0;
          setBgLoaded(true);
        }}
        onPlay={(e) => {
          e.currentTarget.muted = true;
          e.currentTarget.defaultMuted = true;
          e.currentTarget.volume = 0;
        }}
        onVolumeChange={(e) => {
          if (!e.currentTarget.muted || e.currentTarget.volume !== 0) {
            e.currentTarget.muted = true;
            e.currentTarget.defaultMuted = true;
            e.currentTarget.volume = 0;
          }
        }}
        className={`absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none transition-all duration-1000 ease-out ${
          bgLoaded ? 'opacity-100 scale-[1.01]' : 'opacity-0 scale-[1.05]'
        } brightness-[0.94] contrast-[1.08]`}
      >
        <source src={GAME_ASSETS.titleVideo1080p} type="video/mp4" />
        <source src={GAME_ASSETS.titleVideo720p} type="video/mp4" />
      </video>

      {/* Layer 2: Sculpted Vignette Preserving Upper-Left Blood Eclipse & Right-Side Rudra */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 21% 14%, rgba(255, 110, 40, 0.14) 0%, rgba(0, 0, 0, 0) 24%), linear-gradient(90deg, rgba(4, 3, 4, 0.78) 0%, rgba(6, 4, 5, 0.64) 32%, rgba(10, 6, 7, 0.22) 55%, rgba(6, 3, 4, 0.04) 100%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 78% 40%, rgba(255, 198, 120, 0.10) 0%, rgba(0, 0, 0, 0) 48%), linear-gradient(180deg, rgba(4, 3, 5, 0.35) 0%, rgba(4, 3, 5, 0) 22%, rgba(4, 3, 5, 0) 74%, rgba(4, 3, 5, 0.86) 100%)',
        }}
      />

      {/* Top-Left & Main Menu Area (Positioned Beneath the Blood Eclipse on the Left) */}
      <div className="relative z-10 my-auto max-w-2xl w-full pt-16 md:pt-24">
        {/* Torn Blood-Crimson Banner + Carved Gold KALIYUGA Crest */}
        <div className="relative inline-block mb-10 md:mb-12">
          {/* Blood-Crimson Brushstroke Backing */}
          <div
            className="absolute -inset-x-8 -inset-y-4 pointer-events-none opacity-90"
            style={{
              background:
                'radial-gradient(ellipse at 50% 50%, rgba(158, 14, 24, 0.86) 0%, rgba(98, 8, 14, 0.62) 52%, rgba(20, 2, 4, 0) 78%)',
              filter: 'blur(4px)',
            }}
          />
          <div className="relative flex flex-col items-center text-center px-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <span
                className="font-display text-4xl sm:text-6xl md:text-7xl font-black tracking-[0.08em] uppercase bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    'linear-gradient(180deg, #fff3c4 0%, #e5b854 45%, #9c6718 85%, #f5d37a 100%)',
                  filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.98))',
                }}
              >
                KALI
              </span>

              {/* Central Omega / Chakra Crest Emblem */}
              <div className="relative flex items-center justify-center w-11 h-12 sm:w-14 sm:h-16 border-2 border-[#d9a648] bg-gradient-to-b from-[#3d250a] via-[#1c1005] to-[#3a1f08] shadow-[0_6px_22px_rgba(0,0,0,0.95)]">
                <span className="font-display text-2xl sm:text-3xl font-black text-[#f5cf76] drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                  ॐ
                </span>
              </div>

              <span
                className="font-display text-4xl sm:text-6xl md:text-7xl font-black tracking-[0.08em] uppercase bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    'linear-gradient(180deg, #fff3c4 0%, #e5b854 45%, #9c6718 85%, #f5d37a 100%)',
                  filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.98))',
                }}
              >
                YUGA
              </span>
            </div>

            <div
              className="mt-1.5 font-display text-xs sm:text-sm md:text-base font-bold tracking-[0.34em] uppercase text-[#e6be6a]"
              style={{
                textShadow: '0 3px 10px rgba(0,0,0,0.98), 0 0 16px rgba(184,29,42,0.75)',
              }}
            >
              THE BLEEDING CROWN
            </div>
          </div>
        </div>

        {/* Left-Aligned Vertical Menu List (NEW GAME / CHRONICLE / OPTIONS / TREASURES) */}
        <nav aria-label="Main Menu" className="flex flex-col items-start space-y-3 md:space-y-4 pl-2 md:pl-6">
          {menuItems.map((item, idx) => {
            const isSelected = activeIndex === idx;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={item.testId}
                data-start={item.isPrimaryStart ? 'true' : undefined}
                onMouseEnter={() => {
                  setActiveIndex(idx);
                  soundEngine.playSwing('light');
                }}
                onClick={item.onSelect}
                className={`group relative text-left font-display text-xl sm:text-2xl md:text-[28px] font-bold tracking-[0.12em] uppercase transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'text-[#f2dfc0] translate-x-1.5'
                    : 'text-[#a81c24] hover:text-[#dfcaa6]'
                }`}
                style={{
                  textShadow: isSelected
                    ? '0 4px 14px rgba(0,0,0,0.98), 0 0 22px rgba(242, 196, 90, 0.55)'
                    : '0 4px 12px rgba(0,0,0,0.98), 0 0 10px rgba(140, 12, 20, 0.45)',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom-Left Minimal Select Prompt (Exact God of War III Remastered Footer) */}
      <footer className="relative z-10 flex items-center justify-between pl-2 md:pl-6">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-display tracking-[0.18em] text-[#d8ccb8] uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1a1822] border border-[#7c859e] text-[10px] font-bold text-[#a9b6d4]">
            ✕
          </span>
          <span className="text-[#8e8679]">=</span>
          <span className="font-bold text-[#e6dfd3]">SELECT</span>
        </div>
      </footer>

      {/* ==================================================================== */}
      {/* OPTIONS & KEYBOARD SHORTCUTS MODAL (All Shortcuts Off Game Screen)    */}
      {/* ==================================================================== */}
      {subModal === 'options' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Options and Keyboard Shortcuts"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-3xl bg-[#0b090c] border border-[#c89d46]/65 p-6 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.98)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#c89d46]/30 pb-4 mb-6">
              <div>
                <div className="text-[10px] font-mono-num tracking-[0.28em] text-[#d4a548] uppercase">
                  OPTIONS · COMBAT CONTROLS &amp; ARSENAL
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-bold tracking-[0.08em] text-[#f7efe0] uppercase mt-0.5">
                  KEYBOARD SHORTCUTS &amp; SETTINGS
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSubModal('none')}
                className="px-4 py-1.5 bg-[#1c1417] hover:bg-[#2b1d22] border border-[#c89d46]/50 text-xs font-display font-bold tracking-[0.16em] text-[#f2c45a] uppercase cursor-pointer"
              >
                BACK [ESC]
              </button>
            </div>

            {/* Weapon Aspect & Audio Settings Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {onSelectWeapon && (
                <div className="bg-[#120e13] border border-[#c89d46]/25 p-4">
                  <div className="text-[10px] font-mono-num tracking-[0.22em] text-[#d4a548] uppercase mb-2.5">
                    STARTING WEAPON ASPECT
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['jingu_bang', 'twin_blades', 'dragon_glaive'] as WeaponId[]).map((wId) => {
                      const cfg = WEAPON_CONFIGS[wId];
                      const active = selectedWeapon === wId;
                      return (
                        <button
                          key={wId}
                          type="button"
                          onClick={() => onSelectWeapon(wId)}
                          className={`p-2 text-left border transition-all cursor-pointer ${
                            active
                              ? 'bg-[#281512] border-[#f5c451] text-[#fff6e8]'
                              : 'bg-[#0c0a0e] border-[#c89d46]/25 text-[#9c917e] hover:border-[#c89d46]/60'
                          }`}
                        >
                          <div className="text-[10px] font-mono-num text-[#e6be6a]">[{cfg.hotkey}]</div>
                          <div className="font-display text-xs font-bold truncate mt-0.5">
                            {cfg.shortLabel}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-[#120e13] border border-[#c89d46]/25 p-4 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-mono-num tracking-[0.22em] text-[#d4a548] uppercase">
                    SOUND &amp; BGM SCORE (SMOOTH CROSSFADE)
                  </div>
                  {onToggleMute && (
                    <button
                      type="button"
                      onClick={onToggleMute}
                      className={`px-3 py-1 border text-[11px] font-mono-num font-bold uppercase cursor-pointer ${
                        !muted
                          ? 'bg-[#172922] border-[#3ee0a8] text-[#3ee0a8]'
                          : 'bg-[#2b1418] border-[#ff6b78] text-[#ff6b78]'
                      }`}
                    >
                      {!muted ? 'AUDIO: ON' : 'AUDIO: MUTED'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'auto', label: 'Dynamic Score (Auto)', url: null },
                    { id: 'gate', label: 'Before the Iron Gate', url: GAME_ASSETS.soundtracks.beforeIronGate },
                    { id: 'chariots', label: 'Iron Chariots of the Sun', url: GAME_ASSETS.soundtracks.ironChariotsOfTheSun },
                    { id: 'weep', label: 'Where Bronze Gods Weep', url: GAME_ASSETS.soundtracks.whereBronzeGodsWeep },
                    { id: 'judgment', label: 'Judgment at Ruined Gate', url: GAME_ASSETS.soundtracks.judgmentAtRuinedGate },
                    { id: 'rising', label: 'Mahadeva Rising', url: GAME_ASSETS.soundtracks.mahadevaRising },
                    { id: 'titan', label: "The Titan's Final Stride", url: GAME_ASSETS.soundtracks.titansFinalStride },
                  ].map((trk) => {
                    const active = selectedTrackOverride === trk.id;
                    return (
                      <button
                        key={trk.id}
                        type="button"
                        onClick={() => {
                          setSelectedTrackOverride(trk.id);
                          soundEngine.setCustomBgmUrl(trk.url);
                        }}
                        className={`px-2.5 py-1.5 text-left border text-[11px] font-display truncate transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#281512] border-[#f5c451] text-[#fff6e8] font-bold'
                            : 'bg-[#0c0a0e] border-[#c89d46]/25 text-[#9c917e] hover:border-[#c89d46]/60'
                        }`}
                      >
                        {trk.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Complete Keyboard Shortcuts Grid */}
            <div className="text-[10px] font-mono-num tracking-[0.22em] text-[#d4a548] uppercase mb-2.5">
              COMPLETE KEYBOARD &amp; MOUSE CONTROLS
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {KEYBOARD_SHORTCUTS.map((sc) => (
                <div
                  key={sc.key}
                  className="flex items-center justify-between gap-3 bg-[#120f14] border border-[#c89d46]/20 px-3.5 py-2.5"
                >
                  <div>
                    <div className="text-xs font-bold text-[#f7efe0]">{sc.action}</div>
                    <div className="text-[11px] text-[#9c917e]">{sc.desc}</div>
                  </div>
                  <span className="px-2.5 py-1 bg-[#1e1712] border border-[#d4a548]/55 font-mono-num text-xs font-bold text-[#f5c451] shrink-0">
                    {sc.key}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TREASURES MODAL (Homa Shrine Upgrades & Lore Compendium)             */}
      {/* ==================================================================== */}
      {subModal === 'treasures' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Treasures and Sanctuary"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-xl bg-[#0b090c] border border-[#c89d46]/65 p-6 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.98)]">
            <div className="flex items-center justify-between border-b border-[#c89d46]/30 pb-4 mb-6">
              <div>
                <div className="text-[10px] font-mono-num tracking-[0.28em] text-[#d4a548] uppercase">
                  VAITARANI RELICS · ASHEN KARMA: {ashenKarma}
                </div>
                <h2 className="font-display text-2xl font-bold tracking-[0.08em] text-[#f7efe0] uppercase mt-0.5">
                  TREASURES &amp; SANCTUARY
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSubModal('none')}
                className="px-4 py-1.5 bg-[#1c1417] hover:bg-[#2b1d22] border border-[#c89d46]/50 text-xs font-display font-bold tracking-[0.16em] text-[#f2c45a] uppercase cursor-pointer"
              >
                BACK [ESC]
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              <button
                type="button"
                data-testid="open-shrine-btn"
                onClick={() => {
                  setSubModal('none');
                  onOpenShrine();
                }}
                className="p-4 text-left bg-[#141014] hover:bg-[#1f181f] border border-[#c89d46]/45 transition-colors cursor-pointer"
              >
                <div className="font-display text-base font-bold tracking-[0.12em] text-[#f5c451] uppercase">
                  HOMA FIRE SHRINE (UPGRADE VESSEL)
                </div>
                <div className="text-xs text-[#b8ac98] mt-1">
                  Spend banked Ashen Karma ({ashenKarma}) to temper Vitality, Tapas Focus, and Amrita Kalasha draughts.
                </div>
              </button>

              <button
                type="button"
                data-testid="open-story-btn"
                onClick={() => {
                  setSubModal('none');
                  onOpenStory();
                }}
                className="p-4 text-left bg-[#141014] hover:bg-[#1f181f] border border-[#c89d46]/45 transition-colors cursor-pointer"
              >
                <div className="font-display text-base font-bold tracking-[0.12em] text-[#f7efe0] uppercase">
                  CHRONICLE &amp; SOVEREIGN CODEX
                </div>
                <div className="text-xs text-[#b8ac98] mt-1">
                  Inspect character portraits, Sanjaya’s corrected chronicle, and Act I boss lore.
                </div>
              </button>

              {onOpenPrologue && (
                <button
                  type="button"
                  onClick={() => {
                    setSubModal('none');
                    onOpenPrologue();
                  }}
                  className="p-4 text-left bg-[#141014] hover:bg-[#1f181f] border border-[#c89d46]/45 transition-colors cursor-pointer"
                >
                  <div className="font-display text-base font-bold tracking-[0.12em] text-[#ff6642] uppercase">
                    FIVE TEMPLE WALL SCROLLS (PROLOGUE)
                  </div>
                  <div className="text-xs text-[#b8ac98] mt-1">
                    Replay the five temple wall scroll paintings and the Shishira Camp memory shard.
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
