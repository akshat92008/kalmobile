'use client';

import React, { useState } from 'react';
import {
  ALL_COMPANION_IDS,
  COMPANION_SPECS,
  CompanionBondRanks,
  CompanionId,
  EquippedGearMap,
  GEAR_ITEMS,
  GearSlot,
  GearUpgradeLevels,
  PartyTacticMode,
  QUEST_SPECS,
  QuestId,
  QuestStateMap,
  computeCompanionStats,
  computeEquippedGearBonuses,
  computePartyPassiveBonuses,
  computePlayerLevelFromXp,
  getCompanionBondUpgradeCost,
  getGearUpgradeCost,
} from '@/lib/game/partySystem';
import { WEAPON_CONFIGS, WeaponId } from '@/lib/game/rules';
import {
  CALAMITY_OATH_SPECS,
  CalamityOathId,
  INITIAL_WEAPON_ASPECT_RANKS,
  WeaponAspectRanks,
  computeCalamityPactModifiers,
  computeRelicSetResonance,
  computeWeaponAspectBonuses,
  getUnlockedSanjayaCorrections,
  getWeaponAspectUpgradeCost,
} from '@/lib/game/pillars4And5Engine';
import {
  ACT1_LOOK_OBJECTS,
  LookObjectSpec,
  SANJAYA_CORRECTIONS,
  StoryMemoryFlags,
} from '@/engine/v7StoryEngine';

export interface ModernGameSettings {
  showMinimap: boolean;
  showQuestTracker: boolean;
  showPartyCallouts: boolean;
  showDamageNumbers: boolean;
  autoLootMagnet: boolean;
}

interface PartyCommandModalProps {
  isOpen: boolean;
  initialTab?: 'party' | 'gear' | 'quests' | 'settings' | 'pact';
  ashenKarma: number;
  playerXp: number;
  activeParty: CompanionId[];
  companionBonds: CompanionBondRanks;
  partyTactic: PartyTacticMode;
  equippedGear: EquippedGearMap;
  gearLevels: GearUpgradeLevels;
  questState: QuestStateMap;
  selectedWeapon: WeaponId;
  weaponAspectRanks?: WeaponAspectRanks;
  activeCalamityOaths?: CalamityOathId[];
  storyFlags?: StoryMemoryFlags;
  modernSettings: ModernGameSettings;
  onToggleCompanionInParty: (id: CompanionId) => void;
  onUpgradeCompanionBond: (id: CompanionId) => void;
  onChangePartyTactic: (tactic: PartyTacticMode) => void;
  onTriggerPartyLinkStrike: () => void;
  onEquipGear: (slot: GearSlot, itemId: string) => void;
  onUpgradeGear: (itemId: string) => void;
  onSelectWeapon: (weapon: WeaponId) => void;
  onUpgradeWeaponAspect?: (weapon: WeaponId) => void;
  onToggleCalamityOath?: (oathId: CalamityOathId) => void;
  onInspectLookArtifact?: (artifact: LookObjectSpec) => void;
  onClaimQuest: (questId: QuestId) => void;
  onUpdateSettings: (patch: Partial<ModernGameSettings>) => void;
  onClose: () => void;
}

const GEAR_SLOT_LABELS: Record<GearSlot, string> = {
  kavacha_plate: 'Kavacha War-Plate (Armor)',
  divya_ring: 'Divya Signet (Talisman Ring)',
  war_warhorn: 'Kurukshetra War-Conch (Relic)',
};

export function PartyCommandModal({
  isOpen,
  initialTab = 'party',
  ashenKarma,
  playerXp,
  activeParty,
  companionBonds,
  partyTactic,
  equippedGear,
  gearLevels,
  questState,
  selectedWeapon,
  weaponAspectRanks = INITIAL_WEAPON_ASPECT_RANKS,
  activeCalamityOaths = [],
  storyFlags,
  modernSettings,
  onToggleCompanionInParty,
  onUpgradeCompanionBond,
  onChangePartyTactic,
  onTriggerPartyLinkStrike,
  onEquipGear,
  onUpgradeGear,
  onSelectWeapon,
  onUpgradeWeaponAspect,
  onToggleCalamityOath,
  onInspectLookArtifact,
  onClaimQuest,
  onUpdateSettings,
  onClose,
}: PartyCommandModalProps) {
  const [activeTab, setActiveTab] = useState<'party' | 'gear' | 'quests' | 'settings' | 'pact'>(
    initialTab
  );

  if (!isOpen) return null;

  const levelInfo = computePlayerLevelFromXp(playerXp);
  const partyPassives = computePartyPassiveBonuses(activeParty, companionBonds);
  const gearBonuses = computeEquippedGearBonuses(equippedGear, gearLevels);
  const setResonance = computeRelicSetResonance(equippedGear);
  const pactModifiers = computeCalamityPactModifiers(activeCalamityOaths);
  const claimableQuestsCount = QUEST_SPECS.filter((q) => {
    const st = questState[q.id];
    return st && !st.claimed && st.progress >= q.targetCount;
  }).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Warborn Party, Gear Loadout, and Dharma Quests"
      data-testid="party-command-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 select-none"
    >
      <div className="w-full max-w-5xl bg-[#0b090d] border border-[#c89d46]/70 shadow-[0_24px_80px_rgba(0,0,0,0.98)] flex flex-col max-h-[92vh] overflow-hidden">
        {/* TOP HEADER: Rudra Level, XP Bar, Gear Score & Ashen Karma */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 bg-[#120e15] border-b border-[#c89d46]/35">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-[#22170b] border border-[#f2c45a] flex flex-col items-center justify-center shrink-0">
              <span className="text-[9px] font-mono-num text-[#c89d46] uppercase">LVL</span>
              <span
                data-testid="party-modal-player-level"
                className="font-display text-lg font-black text-[#ffd86b] leading-none"
              >
                {levelInfo.level}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2.5 text-xs font-mono-num text-[#d4a548]">
                <span>WARBORN COMMAND HUB</span>
                <span aria-hidden="true">·</span>
                <span>GEAR SCORE {gearBonuses.gearScore}</span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold tracking-[0.06em] text-[#f7efe0]">
                Sworn Party, Mythic Relics &amp; War Bounties
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-36 sm:w-48 h-1.5 bg-[#1f1a24] overflow-hidden">
                  <div
                    className="h-full bg-[#3ee0a8] transition-transform duration-200 origin-left"
                    style={{ transform: `scaleX(${levelInfo.progressPct / 100})` }}
                  />
                </div>
                <span className="text-[10px] font-mono-num text-[#9c917e]">
                  XP {levelInfo.currentLevelXp}/{levelInfo.nextLevelXp}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 bg-[#171219] border border-[#c89d46]/45 text-right">
              <div className="text-[10px] font-mono-num text-[#a89c8a]">ASHEN KARMA</div>
              <div
                data-testid="party-modal-karma"
                className="font-mono-num text-base font-bold text-[#3ee0a8]"
              >
                {ashenKarma}
              </div>
            </div>

            <button
              type="button"
              data-testid="close-party-modal-btn"
              onClick={onClose}
              className="px-4 py-2.5 bg-[#241519] hover:bg-[#361c22] border border-[#f2c45a]/65 font-display text-xs font-bold tracking-wider text-[#ffd86b] cursor-pointer whitespace-nowrap"
            >
              RESUME BATTLE [ESC]
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div
          role="tablist"
          aria-label="Command Hub Sections"
          className="flex items-center gap-1 px-5 pt-3 bg-[#0e0b11] border-b border-[#c89d46]/25 overflow-x-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'party'}
            data-testid="tab-party-roster"
            onClick={() => setActiveTab('party')}
            className={`px-4 py-2.5 font-display text-xs font-bold tracking-wider border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'party'
                ? 'border-[#f2c45a] text-[#ffd86b] bg-[#1b151e]'
                : 'border-transparent text-[#9c917e] hover:text-[#f7efe0]'
            }`}
          >
            01. Party Roster ({activeParty.length}/2 Active)
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'gear'}
            data-testid="tab-gear-relics"
            onClick={() => setActiveTab('gear')}
            className={`px-4 py-2.5 font-display text-xs font-bold tracking-wider border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'gear'
                ? 'border-[#f2c45a] text-[#ffd86b] bg-[#1b151e]'
                : 'border-transparent text-[#9c917e] hover:text-[#f7efe0]'
            }`}
          >
            02. Gear &amp; Relics Loadout
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'quests'}
            data-testid="tab-quests-bounties"
            onClick={() => setActiveTab('quests')}
            className={`px-4 py-2.5 font-display text-xs font-bold tracking-wider border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'quests'
                ? 'border-[#f2c45a] text-[#ffd86b] bg-[#1b151e]'
                : 'border-transparent text-[#9c917e] hover:text-[#f7efe0]'
            }`}
          >
            03. Quests &amp; Bounties {claimableQuestsCount > 0 ? `(${claimableQuestsCount} Ready)` : ''}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'settings'}
            data-testid="tab-modern-settings"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 font-display text-xs font-bold tracking-wider border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-[#f2c45a] text-[#ffd86b] bg-[#1b151e]'
                : 'border-transparent text-[#9c917e] hover:text-[#f7efe0]'
            }`}
          >
            04. Tactical HUD &amp; Settings
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pact'}
            data-testid="tab-pact-chronicle"
            onClick={() => setActiveTab('pact')}
            className={`px-4 py-2.5 font-display text-xs font-bold tracking-wider border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'pact'
                ? 'border-[#ff6b78] text-[#ffd86b] bg-[#241318]'
                : 'border-transparent text-[#9c917e] hover:text-[#f7efe0]'
            }`}
          >
            05. Pact &amp; Chronicle {pactModifiers.totalHeat > 0 ? `(Heat ${pactModifiers.totalHeat})` : ''}
          </button>
        </div>

        {/* TAB BODY */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* ================================================================ */}
          {/* TAB 1: SWORN PARTY ROSTER & AI TACTICAL DIRECTIVES               */}
          {/* ================================================================ */}
          {activeTab === 'party' && (
            <div className="space-y-5">
              {/* Party Tactical Formation Bar + Synergy Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-[#130f17] border border-[#c89d46]/30 p-4">
                <div>
                  <div className="text-xs font-semibold text-[#f2c45a] mb-1">
                    Party Tactical AI Directive
                  </div>
                  <p className="text-xs text-[#a89c8a] mb-3">
                    Command how your 2 active sworn companions position themselves and prioritize targets in real-time combat.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      [
                        { id: 'aggressive', label: 'Aggressive Hunt' },
                        { id: 'protective', label: 'Protect Rudra' },
                        { id: 'boss_focus', label: 'Focus Boss / Warden' },
                      ] as { id: PartyTacticMode; label: string }[]
                    ).map((mode) => {
                      const active = partyTactic === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          data-testid={`party-tactic-${mode.id}`}
                          onClick={() => onChangePartyTactic(mode.id)}
                          className={`px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                            active
                              ? 'bg-[#2a1d11] border-[#f2c45a] text-[#ffd86b]'
                              : 'bg-[#0c0a0e] border-[#c89d46]/30 text-[#9c917e] hover:text-[#f7efe0]'
                          }`}
                        >
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col justify-between bg-[#0d0a10] border border-[#c89d46]/25 p-3.5">
                  <div className="text-xs font-semibold text-[#3ee0a8] mb-1.5">
                    Active Party Synergy Bonuses
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono-num text-[#d8ccb8]">
                    <div>
                      Amrita Healing: <strong className="text-[#3ee0a8]">{Math.round(partyPassives.bonusHealMultiplier * 100)}%</strong>
                    </div>
                    <div>
                      Crit Bonus: <strong className="text-[#38bdf8]">+{Math.round(partyPassives.bonusCritChance * 100)}%</strong>
                    </div>
                    <div>
                      Posture Break: <strong className="text-[#f5c451]">{Math.round(partyPassives.bonusPostureMultiplier * 100)}%</strong>
                    </div>
                    <div>
                      Damage Ward: <strong className="text-[#ff8a65]">-{Math.round(partyPassives.damageReductionRatio * 100)}%</strong>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#c89d46]/20">
                    <span className="text-[11px] text-[#9c917e]">
                      Hotkey: Press [G] in battle for Coordinated Link Strike
                    </span>
                    <button
                      type="button"
                      data-testid="modal-trigger-link-strike-btn"
                      onClick={() => {
                        onTriggerPartyLinkStrike();
                        onClose();
                      }}
                      className="px-3 py-1 bg-[#291518] hover:bg-[#3d1d22] border border-[#ff6b78] text-xs font-bold text-[#ffd86b] cursor-pointer whitespace-nowrap"
                    >
                      Unleash Link Strike [G]
                    </button>
                  </div>
                </div>
              </div>

              {/* 3 Companion Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ALL_COMPANION_IDS.map((compId) => {
                  const spec = COMPANION_SPECS[compId];
                  const bondRank = companionBonds[compId] ?? 1;
                  const stats = computeCompanionStats(compId, bondRank);
                  const isInParty = activeParty.includes(compId);
                  const upgradeCost = getCompanionBondUpgradeCost(bondRank);
                  const canAfford = ashenKarma >= upgradeCost && bondRank < 5;

                  return (
                    <div
                      key={compId}
                      data-testid={`companion-card-${compId}`}
                      className={`flex flex-col justify-between bg-[#120f16] border p-4 transition-colors ${
                        isInParty ? 'border-[#f2c45a]' : 'border-[#c89d46]/25'
                      }`}
                    >
                      <div>
                        {/* Companion Header + Portrait */}
                        <div className="flex items-center gap-3.5 mb-3">
                          <div className="relative w-16 h-16 border border-[#c89d46]/60 bg-[#08070a] overflow-hidden shrink-0">
                            <img
                              src={spec.portraitUrl}
                              alt={spec.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-mono-num text-[#d4a548] truncate">
                              {spec.roleLabel} · BOND RANK {bondRank}/5
                            </div>
                            <h3 className="font-display text-lg font-bold text-[#f7efe0] truncate">
                              {spec.name}
                            </h3>
                            <div className="text-xs text-[#9c917e] truncate">
                              {spec.sanskritTitle}
                            </div>
                          </div>
                        </div>

                        {/* Stats Strip */}
                        <div className="grid grid-cols-3 gap-2 bg-[#0b090e] border border-[#c89d46]/20 p-2.5 text-center font-mono-num text-xs mb-3">
                          <div>
                            <div className="text-[10px] text-[#9c917e]">MAX HP</div>
                            <div className="font-bold text-[#3ee0a8]">{stats.maxHp}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-[#9c917e]">STRIKE</div>
                            <div className="font-bold text-[#f5c451]">{stats.attackDamage}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-[#9c917e]">POSTURE</div>
                            <div className="font-bold text-[#38bdf8]">{stats.postureDamage}</div>
                          </div>
                        </div>

                        {/* Passive & Link Ultimate Info */}
                        <div className="space-y-2 text-xs mb-4">
                          <div>
                            <span className="font-semibold text-[#f2c45a]">Passive Aura: </span>
                            <span className="text-[#c8beae]">{spec.passiveDesc}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-[#3ee0a8]">
                              Link Art ({spec.linkUltimateName}):{' '}
                            </span>
                            <span className="text-[#c8beae]">{spec.linkUltimateDesc}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-3 border-t border-[#c89d46]/20">
                        <button
                          type="button"
                          data-testid={`toggle-party-${compId}`}
                          onClick={() => onToggleCompanionInParty(compId)}
                          className={`flex-1 py-2 px-3 text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                            isInParty
                              ? 'bg-[#1a2e25] border-[#3ee0a8] text-[#3ee0a8]'
                              : 'bg-[#1c161f] border-[#c89d46]/45 text-[#f7efe0] hover:border-[#f2c45a]'
                          }`}
                        >
                          {isInParty ? 'Active in Party' : 'Deploy to Party'}
                        </button>

                        <button
                          type="button"
                          data-testid={`upgrade-bond-${compId}`}
                          disabled={!canAfford}
                          onClick={() => onUpgradeCompanionBond(compId)}
                          className={`py-2 px-3 text-xs font-mono-num font-bold border transition-colors whitespace-nowrap ${
                            bondRank >= 5
                              ? 'bg-[#17151a] border-[#594e36]/40 text-[#7a7062] cursor-not-allowed'
                              : canAfford
                              ? 'bg-[#2b1e0e] hover:bg-[#3d2a12] border-[#f2c45a] text-[#ffd86b] cursor-pointer'
                              : 'bg-[#141217] border-[#594e36]/30 text-[#6e6559] cursor-not-allowed'
                          }`}
                        >
                          {bondRank >= 5 ? 'MAX BOND' : `Bond +1 (${upgradeCost})`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 2: GEAR & MYTHIC RELICS LOADOUT                              */}
          {/* ================================================================ */}
          {activeTab === 'gear' && (
            <div className="space-y-5">
              {/* Summary Bar */}
              <div className="bg-[#130f17] border border-[#c89d46]/30 p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-[#f2c45a]">
                    Active Equipment &amp; Relic Synergy
                  </div>
                  <p className="text-xs text-[#9c917e]">
                    Temper your equipped Kavacha armor, Divya signet ring, and Kurukshetra war-conch to amplify Rudra and his party.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono-num">
                  {setResonance.activeSetName && (
                    <div
                      data-testid="relic-set-resonance-badge"
                      className="px-2.5 py-1 bg-[#241b0c] border border-[#f5c451] text-[#ffd86b] font-bold"
                    >
                      ★ {setResonance.activeSetName} (+{Math.round((setResonance.setDamageBonusMultiplier - 1) * 100)}% Dmg · +{setResonance.chamberWardShieldHp} Ward HP)
                    </div>
                  )}
                  <div>
                    Bonus Vitality: <strong className="text-[#3ee0a8]">+{gearBonuses.bonusMaxHp} HP</strong>
                  </div>
                  <div>
                    Attack Power: <strong className="text-[#f5c451]">+{Math.round((gearBonuses.damageMultiplier - 1) * 100)}%</strong>
                  </div>
                  <div>
                    Crit Chance: <strong className="text-[#38bdf8]">+{Math.round(gearBonuses.critChance * 100)}%</strong>
                  </div>
                  <div>
                    Lifesteal: <strong className="text-[#ff6b78]">{Math.round(gearBonuses.lifestealRatio * 100)}%</strong>
                  </div>
                </div>
              </div>

              {/* Pillar 4: Vishwakarma Weapon Aspect Forge (Ranks 1–5 + Unique Aspect Procs) */}
              <div className="bg-[#120f16] border border-[#c89d46]/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="text-xs font-semibold text-[#f2c45a]">
                      Vishwakarma Weapon Aspect Forge (Hotkey [1] [2] [3])
                    </div>
                    <p className="text-xs text-[#9c917e]">
                      Temper your three divine weapon aspects up to Rank 5 to unlock lethal elemental burst procs and Posture Shatter multipliers.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(['twin_blades', 'jingu_bang', 'dragon_glaive'] as WeaponId[]).map((wId) => {
                    const wCfg = WEAPON_CONFIGS[wId];
                    const isEquipped = selectedWeapon === wId;
                    const aspectBonus = computeWeaponAspectBonuses(wId, weaponAspectRanks);
                    const aspectCost = getWeaponAspectUpgradeCost(aspectBonus.aspectRank);
                    const canForge = ashenKarma >= aspectCost && aspectBonus.aspectRank < 5;

                    return (
                      <div
                        key={wId}
                        data-testid={`gear-select-weapon-${wId}`}
                        className={`p-3.5 text-left border transition-colors flex flex-col justify-between ${
                          isEquipped
                            ? 'bg-[#261a10] border-[#f2c45a] text-[#fff6e8]'
                            : 'bg-[#0c0a0f] border-[#c89d46]/25 text-[#b8ac98]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs font-mono-num text-[#d4a548]">
                            <span>[{wCfg.hotkey}] {wCfg.chineseName}</span>
                            <span style={{ color: aspectBonus.aspectSpec.accentColor }}>
                              ASPECT RANK {aspectBonus.aspectRank}/5
                            </span>
                          </div>
                          <div className="font-display text-sm font-bold text-[#f7efe0] mt-1">
                            {wCfg.englishName}
                          </div>
                          <div
                            className="text-xs font-semibold mt-1"
                            style={{ color: aspectBonus.aspectSpec.accentColor }}
                          >
                            {aspectBonus.aspectSpec.aspectName}
                          </div>
                          <p className="text-[11px] text-[#a89c8a] mt-1 leading-snug">
                            {aspectBonus.aspectSpec.passiveDescription}
                          </p>
                          <div className="text-[11px] font-mono-num text-[#d8ccb8] mt-2">
                            Proc Burst: <strong className="text-[#ffd86b]">{aspectBonus.procDamage} DMG</strong> · Posture <strong className="text-[#3ee0a8]">×{aspectBonus.postureMultiplier.toFixed(2)}</strong> · Crit <strong className="text-[#38bdf8]">+{Math.round(aspectBonus.bonusCritChance * 100)}%</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-[#c89d46]/20">
                          <button
                            type="button"
                            data-testid={`equip-weapon-btn-${wId}`}
                            onClick={() => onSelectWeapon(wId)}
                            className={`flex-1 py-1.5 px-2.5 text-xs font-bold border cursor-pointer whitespace-nowrap ${
                              isEquipped
                                ? 'bg-[#172922] border-[#3ee0a8] text-[#3ee0a8]'
                                : 'bg-[#1a1520] border-[#c89d46]/40 text-[#f7efe0] hover:border-[#f2c45a]'
                            }`}
                          >
                            {isEquipped ? 'Equipped' : 'Equip Aspect'}
                          </button>

                          {onUpgradeWeaponAspect && (
                            <button
                              type="button"
                              data-testid={`forge-aspect-btn-${wId}`}
                              disabled={!canForge}
                              onClick={() => onUpgradeWeaponAspect(wId)}
                              className={`py-1.5 px-2.5 text-xs font-mono-num font-bold border whitespace-nowrap ${
                                aspectBonus.aspectRank >= 5
                                  ? 'bg-[#141217] border-[#594e36]/30 text-[#6e6559] cursor-not-allowed'
                                  : canForge
                                  ? 'bg-[#2b1e0e] hover:bg-[#3d2a12] border-[#f2c45a] text-[#ffd86b] cursor-pointer'
                                  : 'bg-[#141217] border-[#594e36]/30 text-[#6e6559] cursor-not-allowed'
                              }`}
                            >
                              {aspectBonus.aspectRank >= 5
                                ? 'MAX RANK'
                                : `Forge +1 (${aspectCost})`}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3 Relic Gear Slots */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['kavacha_plate', 'divya_ring', 'war_warhorn'] as GearSlot[]).map((slot) => {
                  const slotItems = GEAR_ITEMS.filter((g) => g.slot === slot);
                  return (
                    <div
                      key={slot}
                      className="bg-[#120f16] border border-[#c89d46]/30 p-4 space-y-3"
                    >
                      <div className="text-xs font-semibold text-[#f2c45a] border-b border-[#c89d46]/20 pb-2">
                        {GEAR_SLOT_LABELS[slot]}
                      </div>

                      {slotItems.map((item) => {
                        const isEquipped = equippedGear[slot] === item.id;
                        const lvl = gearLevels[item.id] ?? 1;
                        const upgCost = getGearUpgradeCost(lvl);
                        const canUpgrade = ashenKarma >= upgCost && lvl < 5;

                        return (
                          <div
                            key={item.id}
                            data-testid={`gear-item-${item.id}`}
                            className={`p-3 border transition-colors ${
                              isEquipped
                                ? 'bg-[#1b1520] border-[#f2c45a]'
                                : 'bg-[#0b090e] border-[#c89d46]/20'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] font-mono-num">
                              <span style={{ color: item.accentColor }}>
                                {item.rarity} · +{lvl}
                              </span>
                              <span className="text-[#9c917e]">{item.sanskritName}</span>
                            </div>
                            <div className="font-display text-sm font-bold text-[#f7efe0] mt-0.5">
                              {item.name}
                            </div>
                            <p className="text-xs text-[#a89c8a] mt-1">{item.description}</p>
                            <div className="text-[11px] font-mono-num text-[#d8ccb8] mt-2">
                              +{Math.round(item.baseMaxHpBonus * (1 + (lvl - 1) * 0.2))} HP · +
                              {Math.round(item.baseDamagePct * (1 + (lvl - 1) * 0.2))}% Dmg · +
                              {Math.round(item.baseCritChancePct * (1 + (lvl - 1) * 0.2))}% Crit
                            </div>

                            <div className="flex items-center gap-2 mt-3">
                              <button
                                type="button"
                                data-testid={`equip-gear-${item.id}`}
                                onClick={() => onEquipGear(slot, item.id)}
                                className={`flex-1 py-1.5 px-2.5 text-xs font-bold border cursor-pointer whitespace-nowrap ${
                                  isEquipped
                                    ? 'bg-[#172922] border-[#3ee0a8] text-[#3ee0a8]'
                                    : 'bg-[#1a1520] border-[#c89d46]/40 text-[#f7efe0] hover:border-[#f2c45a]'
                                }`}
                              >
                                {isEquipped ? 'Equipped' : 'Equip Relic'}
                              </button>

                              <button
                                type="button"
                                data-testid={`upgrade-gear-${item.id}`}
                                disabled={!canUpgrade}
                                onClick={() => onUpgradeGear(item.id)}
                                className={`py-1.5 px-2.5 text-xs font-mono-num font-bold border whitespace-nowrap ${
                                  lvl >= 5
                                    ? 'bg-[#141217] border-[#594e36]/30 text-[#6e6559] cursor-not-allowed'
                                    : canUpgrade
                                    ? 'bg-[#2b1e0e] hover:bg-[#3d2a12] border-[#f2c45a] text-[#ffd86b] cursor-pointer'
                                    : 'bg-[#141217] border-[#594e36]/30 text-[#6e6559] cursor-not-allowed'
                                }`}
                              >
                                {lvl >= 5 ? 'MAX +5' : `Temper (${upgCost})`}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 3: DHARMA QUESTS, BOUNTIES & ACHIEVEMENTS                    */}
          {/* ================================================================ */}
          {activeTab === 'quests' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {QUEST_SPECS.map((q) => {
                const st = questState[q.id] ?? { progress: 0, claimed: false };
                const completed = st.progress >= q.targetCount;
                const pct = Math.min(100, Math.round((st.progress / q.targetCount) * 100));

                return (
                  <div
                    key={q.id}
                    data-testid={`quest-card-${q.id}`}
                    className={`p-4 border flex flex-col justify-between ${
                      completed && !st.claimed
                        ? 'bg-[#1d1712] border-[#f2c45a]'
                        : 'bg-[#120f16] border-[#c89d46]/25'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono-num text-[#d4a548] mb-1">
                        <span>{q.category}</span>
                        <span>
                          +{q.karmaReward} KARMA · +{q.xpReward} XP
                        </span>
                      </div>
                      <h3 className="font-display text-base font-bold text-[#f7efe0]">
                        {q.title}
                      </h3>
                      <p className="text-xs text-[#a89c8a] mt-1">{q.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#c89d46]/20 flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs font-mono-num text-[#d8ccb8] mb-1">
                          <span>Progress</span>
                          <span>
                            {st.progress}/{q.targetCount}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#1c1822] overflow-hidden">
                          <div
                            className="h-full bg-[#3ee0a8] transition-transform duration-200 origin-left"
                            style={{ transform: `scaleX(${pct / 100})` }}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        data-testid={`claim-quest-${q.id}`}
                        disabled={!completed || st.claimed}
                        onClick={() => onClaimQuest(q.id)}
                        className={`px-3.5 py-2 text-xs font-display font-bold tracking-wider border whitespace-nowrap ${
                          st.claimed
                            ? 'bg-[#14241e] border-[#3ee0a8]/40 text-[#3ee0a8] cursor-default'
                            : completed
                            ? 'bg-[#2e1f0f] hover:bg-[#422c14] border-[#f2c45a] text-[#ffd86b] cursor-pointer'
                            : 'bg-[#141218] border-[#594e36]/30 text-[#7a7062] cursor-not-allowed'
                        }`}
                      >
                        {st.claimed ? 'Claimed' : completed ? 'Claim Reward' : 'In Progress'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 4: MODERN HUD, MINIMAP RADAR & QUALITY-OF-LIFE SETTINGS      */}
          {/* ================================================================ */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  key: 'showMinimap' as const,
                  title: 'Live Tactical Radar Minimap',
                  desc: 'Displays real-time positions of Rudra, sworn party companions, enemies, pillars, and gates.',
                },
                {
                  key: 'showQuestTracker' as const,
                  title: 'Pinned Bounty & Quest Tracker',
                  desc: 'Pins your nearest active Dharma Bounty progress directly to the top-left perimeter HUD.',
                },
                {
                  key: 'showPartyCallouts' as const,
                  title: 'Companion Synergy Callouts & Aura Rings',
                  desc: 'Renders tactile role rings beneath active companions and announces Link Strikes.',
                },
                {
                  key: 'showDamageNumbers' as const,
                  title: 'Floating Combat & Critical Hit Numbers',
                  desc: 'Displays damage popups, gold CRIT! callouts, and posture break alerts.',
                },
                {
                  key: 'autoLootMagnet' as const,
                  title: 'Auto-Vacuum Karma & Amrita Drops',
                  desc: 'Automatically pulls vanquished enemy Karma essence and healing motes toward Rudra.',
                },
              ].map((item) => {
                const enabled = modernSettings[item.key];
                return (
                  <div
                    key={item.key}
                    className="p-4 bg-[#120f16] border border-[#c89d46]/30 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="font-display text-sm font-bold text-[#f7efe0]">
                        {item.title}
                      </div>
                      <p className="text-xs text-[#9c917e] mt-1">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      data-testid={`toggle-setting-${item.key}`}
                      onClick={() => onUpdateSettings({ [item.key]: !enabled })}
                      className={`px-3.5 py-2 text-xs font-mono-num font-bold border cursor-pointer whitespace-nowrap ${
                        enabled
                          ? 'bg-[#172922] border-[#3ee0a8] text-[#3ee0a8]'
                          : 'bg-[#1c161f] border-[#c89d46]/35 text-[#9c917e]'
                      }`}
                    >
                      {enabled ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 5: PILLAR 5 — PACT OF THE BLEEDING CROWN & SANJAYA CHRONICLE */}
          {/* ================================================================ */}
          {activeTab === 'pact' && (
            <div className="space-y-5">
              {/* Endgame Pact of the Bleeding Crown (Calamity Heat Modifiers) */}
              <div className="bg-[#160f14] border border-[#ff6b78]/45 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#c89d46]/25 pb-2.5">
                  <div>
                    <div className="text-xs font-semibold text-[#ff8a94]">
                      Pact of the Bleeding Crown · Endgame Calamity Oaths
                    </div>
                    <p className="text-xs text-[#a89c8a]">
                      Swear voluntary Calamity Oaths to heighten Kurukshetra enemy lethality in exchange for massive Ashen Karma &amp; XP multipliers.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 font-mono-num text-xs">
                    <span
                      data-testid="pact-total-heat"
                      className="px-3 py-1 bg-[#291216] border border-[#ff6b78] text-[#ffd86b] font-bold"
                    >
                      CALAMITY HEAT: {pactModifiers.totalHeat}/12
                    </span>
                    <span
                      data-testid="pact-reward-multiplier"
                      className="px-3 py-1 bg-[#12261e] border border-[#3ee0a8] text-[#3ee0a8] font-bold"
                    >
                      REWARD MULT: ×{pactModifiers.karmaAndXpMultiplier.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CALAMITY_OATH_SPECS.map((oath) => {
                    const isSworn = activeCalamityOaths.includes(oath.id);
                    return (
                      <div
                        key={oath.id}
                        data-testid={`calamity-oath-card-${oath.id}`}
                        className={`p-3.5 border flex items-center justify-between gap-3 ${
                          isSworn
                            ? 'bg-[#261217] border-[#ff6b78]'
                            : 'bg-[#0e0b11] border-[#c89d46]/25'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2 text-[11px] font-mono-num text-[#ff8a94]">
                            <span>HEAT +{oath.heatValue}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#3ee0a8]">{oath.rewardBonusLabel}</span>
                          </div>
                          <div className="font-display text-sm font-bold text-[#f7efe0] mt-0.5">
                            {oath.title}
                          </div>
                          <p className="text-xs text-[#a89c8a] mt-1">{oath.description}</p>
                        </div>
                        <button
                          type="button"
                          data-testid={`toggle-oath-${oath.id}`}
                          onClick={() => onToggleCalamityOath?.(oath.id)}
                          className={`px-3 py-2 text-xs font-mono-num font-bold border cursor-pointer whitespace-nowrap ${
                            isSworn
                              ? 'bg-[#3d161e] border-[#ff6b78] text-[#ffd86b]'
                              : 'bg-[#17131c] border-[#c89d46]/40 text-[#d8ccb8] hover:border-[#f2c45a]'
                          }`}
                        >
                          {isSworn ? 'OATH SWORN' : 'SWEAR OATH'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sanjaya's Seven Strikethrough Corrections & Shishira [E] Look Ledger */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-[#120f16] border border-[#c89d46]/30 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#c89d46]/20 pb-2">
                    <div>
                      <div className="text-xs font-semibold text-[#f2c45a]">
                        Sanjaya’s Strikethrough Court Chronicle
                      </div>
                      <p className="text-[11px] text-[#9c917e]">
                        Each reclaimed Shard and Shishira Look thread strikes through the court lie to reveal what happened on the Eighteenth Night.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {(() => {
                      const unlocked = getUnlockedSanjayaCorrections({
                        shardsCollected: storyFlags?.shardsCollected || 0,
                        looksCount: storyFlags?.looks.length || 0,
                        dundubhiCleared: Boolean(storyFlags?.dundubhiCleared),
                      });
                      return SANJAYA_CORRECTIONS.map((corr, idx) => {
                        const isRevealed = idx < unlocked.unlockedCount;
                        return (
                          <div
                            key={corr.id}
                            className={`p-2.5 border text-xs ${
                              isRevealed
                                ? 'bg-[#19131c] border-[#f2c45a]/50 text-[#f5ebd6]'
                                : 'bg-[#0b090e] border-[#c89d46]/15 text-[#7a7062]'
                            }`}
                          >
                            <div className="text-[10px] font-mono-num text-[#d4a548]">
                              {corr.actLabel}
                            </div>
                            <div className="mt-1">
                              {corr.sanjayaContext}{' '}
                              {corr.lieText && (
                                <span
                                  className={
                                    isRevealed
                                      ? 'line-through text-[#ff5e6c] mr-1.5'
                                      : 'text-[#d4a548] mr-1.5'
                                  }
                                >
                                  {corr.lieText}
                                </span>
                              )}
                              {isRevealed && (
                                <strong className="text-[#3ee0a8] underline">
                                  {corr.truthText}
                                </strong>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Shishira [E] Look Artifact Threads */}
                <div className="bg-[#120f16] border border-[#c89d46]/30 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#c89d46]/20 pb-2">
                    <div>
                      <div className="text-xs font-semibold text-[#3ee0a8]">
                        Shishira [E] Look Artifacts ({storyFlags?.looks.length || 0}/6 Examined)
                      </div>
                      <p className="text-[11px] text-[#9c917e]">
                        Examine 3+ artifacts across the chambers to bandage Nachiketa’s sparrow in the Vow ending.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {ACT1_LOOK_OBJECTS.map((lookObj) => {
                      const examined = Boolean(storyFlags?.looks.includes(lookObj.id));
                      return (
                        <div
                          key={lookObj.id}
                          className="p-2.5 bg-[#0c0a10] border border-[#c89d46]/25 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-[10px] font-mono-num text-[#d4a548]">
                              CHAMBER {lookObj.chamberId} · +{lookObj.karmaReward} KARMA
                            </div>
                            <div className="text-xs font-bold text-[#f7efe0] truncate">
                              {lookObj.title}
                            </div>
                          </div>
                          <button
                            type="button"
                            data-testid={`inspect-look-${lookObj.id}`}
                            onClick={() => {
                              onInspectLookArtifact?.(lookObj);
                              onClose();
                            }}
                            className={`px-2.5 py-1.5 text-[11px] font-mono-num font-bold border cursor-pointer whitespace-nowrap ${
                              examined
                                ? 'bg-[#14261f] border-[#3ee0a8] text-[#3ee0a8]'
                                : 'bg-[#261c10] border-[#f2c45a] text-[#ffd86b]'
                            }`}
                          >
                            {examined ? 'Re-Examine ✓' : '[E] Look Now'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
