'use client';

import React from 'react';
import {
  SHRINE_UPGRADES,
  ShrineRanks,
  UpgradeId,
  getUpgradeCost,
  canPurchaseUpgrade,
} from '@/lib/game/rules';

interface KeepersShrineModalProps {
  isOpen: boolean;
  ranks: ShrineRanks;
  availableKarma: number;
  onPurchase: (id: UpgradeId) => void;
  onStartChamber: (chamberIndex: number) => void;
  onClose: () => void;
}

export default function KeepersShrineModal({
  isOpen,
  ranks,
  availableKarma,
  onPurchase,
  onStartChamber,
  onClose,
}: KeepersShrineModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keeper's Shrine Sanctuary"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 md:p-8 pointer-events-auto"
    >
      <div className="w-full max-w-5xl bg-[#0d0c0e] border border-[#c89d46]/70 shadow-[0_24px_80px_rgba(0,0,0,0.95)] flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-7 py-5 border-b border-[#c89d46]/25 bg-[#121014]">
          <div>
            <div className="text-[11px] tracking-[0.26em] text-[#d4a548] uppercase mb-1">
              HOMA FIRE SHRINE PROGRESSION · AGNI KUND SANCTUM
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-[0.08em] text-[#f5ebd6]">
              HOMA FIRE SHRINE SANCTUARY
            </h2>
          </div>

          <div className="px-5 py-2.5 bg-[#161419] border border-[#c89d46]/50 text-right">
            <div className="text-[10px] tracking-[0.2em] text-[#a99e8b] uppercase">
              AVAILABLE ASHEN KARMA
            </div>
            <div className="text-xl font-bold text-[#f2c45a] font-mono-num">
              {availableKarma} KARMA
            </div>
          </div>
        </div>

        {/* 3x2 Upgrade Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 overflow-y-auto">
          {SHRINE_UPGRADES.map((spec) => {
            const currentRank = ranks[spec.id] ?? 0;
            const isMaxed = currentRank >= spec.maxRank;
            const cost = getUpgradeCost(spec.id, currentRank);
            const affordable = canPurchaseUpgrade(spec.id, ranks, availableKarma);

            return (
              <div
                key={spec.id}
                className="flex flex-col justify-between p-5 bg-[#131217] border border-[#c89d46]/25 hover:border-[#c89d46]/55 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs text-[#d4a548] tracking-wider">
                      {spec.chineseName}
                    </span>
                    <span className="px-2 py-0.5 text-[11px] font-mono-num bg-[#1b1920] border border-[#c89d46]/30 text-[#e7dcc6]">
                      RANK {currentRank}/{spec.maxRank}
                    </span>
                  </div>

                  <h3 className="font-display text-base font-bold tracking-wide text-[#f7efe0] mb-2">
                    {spec.title}
                  </h3>

                  <p className="text-xs text-[#a99f8e] leading-relaxed mb-3">
                    {spec.description}
                  </p>

                  <div className="text-xs font-mono-num text-[#3ee0a8] mb-4">
                    {spec.effectText}
                  </div>
                </div>

                <button
                  type="button"
                  data-testid={`upgrade-btn-${spec.id}`}
                  disabled={!affordable || isMaxed}
                  onClick={() => onPurchase(spec.id)}
                  className={`w-full py-2.5 px-4 text-xs font-bold tracking-[0.12em] uppercase transition-colors cursor-pointer whitespace-nowrap ${
                    isMaxed
                      ? 'bg-[#25232b] text-[#7a7366] border border-[#3a3642] cursor-not-allowed'
                      : affordable
                      ? 'bg-[#d4a548] hover:bg-[#e5b95c] text-[#090807] border border-[#f5dca0]'
                      : 'bg-[#1c1a21] text-[#6e6659] border border-[#2f2b36] cursor-not-allowed'
                  }`}
                >
                  {isMaxed ? 'MAX RANK ATTAINED' : `FORGE UPGRADE (${cost} KARMA)`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-[#c89d46]/25 bg-[#110f14]">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              data-testid="jump-boss1-btn"
              onClick={() => {
                onStartChamber(3);
                onClose();
              }}
              className="px-3.5 py-2.5 bg-[#261116] hover:bg-[#381820] text-[#ff6b78] border border-[#a83240]/60 text-xs font-bold tracking-[0.1em] uppercase transition-colors cursor-pointer whitespace-nowrap"
            >
              [CHAMBER 4 BOSS] DUNDUBHI · 3D WAR-DRUM DEMON
            </button>
            <button
              type="button"
              data-testid="jump-boss2-btn"
              onClick={() => {
                onStartChamber(7);
                onClose();
              }}
              className="px-3.5 py-2.5 bg-[#291910] hover:bg-[#3b2416] text-[#ffaa5c] border border-[#b86b28]/60 text-xs font-bold tracking-[0.1em] uppercase transition-colors cursor-pointer whitespace-nowrap"
            >
              [CHAMBER 8 BOSS] VRIKODARA · 3D IRON RAKSHASA
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="start-full-odyssey-btn"
              onClick={() => {
                onStartChamber(0);
                onClose();
              }}
              className="px-5 py-2.5 bg-[#d4a548] hover:bg-[#e4b85c] text-[#090807] font-bold text-xs tracking-[0.12em] uppercase border border-[#f5dca0] transition-colors cursor-pointer whitespace-nowrap"
            >
              START FULL 8-CHAMBER KURUKSHETRA RUN
            </button>
            <button
              type="button"
              data-testid="close-shrine-btn"
              onClick={onClose}
              className="px-5 py-2.5 bg-[#1d1b22] hover:bg-[#2a2731] text-[#e5dac5] font-semibold text-xs tracking-[0.12em] uppercase border border-[#3e3a48] transition-colors cursor-pointer whitespace-nowrap"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
