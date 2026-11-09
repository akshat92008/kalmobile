'use client';

import React, { useRef, useState } from 'react';
import {
  MudraButtonId,
  MudraComboSpec,
  ButtonDynamicHint,
  MUDRA_COMBO_SPECS,
} from '@/lib/game/mobileComboEngine';
import { StaffStance } from '@/lib/game/rules';

interface SacredChakraControllerProps {
  isMobileTouchMode: boolean;
  joyPuckOffset: { x: number; y: number; active: boolean };
  onJoystickPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onJoystickPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onJoystickPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onJoystickPointerCancel: () => void;
  onPressButton: (btn: MudraButtonId) => void;
  onReleaseStrike: () => void;
  activeSequence: MudraButtonId[];
  nextHints: Record<MudraButtonId, ButtonDynamicHint>;
  lastTriggeredCombo: MudraComboSpec | null;
  activeFilamentPair: [MudraButtonId, MudraButtonId] | null;
  hud: {
    hasBrokenTarget: boolean;
    riposteWindowTimer: number;
    focusOrbs: number;
    stance: StaffStance;
    dashCharges: number;
    maxDashCharges: number;
    parryCd: number;
    immobilizeCd: number;
    partyLinkCd: number;
    comboCount: number;
  };
  hasActiveParty: boolean;
}

// Exact symmetric 220x220 radial thumb-arc coordinates (Radius R = 112px from Primary Hub S at 162,162)
const NODE_COORDS: Record<MudraButtonId, { x: number; y: number }> = {
  S: { x: 162, y: 162 },
  D: { x: 50, y: 166 },
  H: { x: 83, y: 83 },
  P: { x: 166, y: 50 },
};

const BUTTON_SHORT_NAMES: Record<MudraButtonId, string> = {
  S: 'STRIKE',
  H: 'HEAVY',
  D: 'DASH',
  P: 'PARRY',
};

export function SacredChakraController({
  isMobileTouchMode,
  joyPuckOffset,
  onJoystickPointerDown,
  onJoystickPointerMove,
  onJoystickPointerUp,
  onJoystickPointerCancel,
  onPressButton,
  onReleaseStrike,
  activeSequence,
  nextHints,
  lastTriggeredCombo,
  activeFilamentPair,
  hud,
  hasActiveParty,
}: SacredChakraControllerProps) {
  const [showComboDrawer, setShowComboDrawer] = useState(false);
  const lastPointerTriggerMsRef = useRef<number>(0);

  const fireButton = (btn: MudraButtonId, fromPointerDown: boolean) => {
    const now = performance.now();
    if (fromPointerDown) {
      lastPointerTriggerMsRef.current = now;
      onPressButton(btn);
    } else if (now - lastPointerTriggerMsRef.current > 180) {
      onPressButton(btn);
    }
  };

  const joyAngleRad = Math.atan2(joyPuckOffset.y, joyPuckOffset.x);
  const joyDist = Math.hypot(joyPuckOffset.x, joyPuckOffset.y);
  const joyNorm = Math.min(1, joyDist / 36);

  const finisherButtons = (['S', 'H', 'D', 'P'] as MudraButtonId[]).filter(
    (b) => nextHints[b]?.isFinisherReady
  );
  const lastPressedBtn =
    activeSequence.length > 0 ? activeSequence[activeSequence.length - 1] : null;

  return (
    <div
      data-testid="pc-combat-deck"
      className="flex items-end justify-between gap-2 w-full mt-auto select-none"
    >
      {/* =====================================================================
          LEFT SIDE: SACRED DHARMA-ASTROLABE 360° VIRTUAL THUMBSTICK
         ===================================================================== */}
      <div className="flex items-end pl-1 pb-1">
        {isMobileTouchMode && (
          <div
            data-testid="mobile-joystick-zone"
            onPointerDown={onJoystickPointerDown}
            onPointerMove={onJoystickPointerMove}
            onPointerUp={onJoystickPointerUp}
            onPointerCancel={onJoystickPointerCancel}
            className="pointer-events-auto relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
          >
            {/* Outer Vedic Astrolabe SVG Ring & Directional Flame Arc */}
            <svg
              viewBox="0 0 120 120"
              className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            >
              <defs>
                <radialGradient id="joyBaseGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1c140d" stopOpacity="0.82" />
                  <stop offset="72%" stopColor="#0b0806" stopOpacity="0.88" />
                  <stop offset="100%" stopColor="#2a1d10" stopOpacity="0.94" />
                </radialGradient>
                <linearGradient id="joyGoldRim" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffe28a" />
                  <stop offset="50%" stopColor="#c89d46" />
                  <stop offset="100%" stopColor="#78561e" />
                </linearGradient>
              </defs>

              {/* Base Plate */}
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="url(#joyBaseGrad)"
                stroke="url(#joyGoldRim)"
                strokeWidth="1.8"
              />

              {/* Inner Dashed Mantra Ring */}
              <circle
                cx="60"
                cy="60"
                r="43"
                fill="none"
                stroke="rgba(212, 165, 72, 0.34)"
                strokeWidth="1"
                strokeDasharray="4 3"
              />

              {/* 8 Cardinal & Intercardinal Lotus Petals / Compass Notches */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
                const isCardinal = deg % 90 === 0;
                return (
                  <g key={deg} transform={`rotate(${deg} 60 60)`}>
                    <path
                      d={
                        isCardinal
                          ? 'M 60 5 L 63 12 L 60 10 L 57 12 Z'
                          : 'M 60 7 L 61.8 11.5 L 58.2 11.5 Z'
                      }
                      fill={isCardinal ? '#f2c45a' : 'rgba(200, 157, 70, 0.55)'}
                    />
                  </g>
                );
              })}

              {/* Center Sacred Crosshair */}
              <path
                d="M 60 26 L 60 94 M 26 60 L 94 60"
                stroke="rgba(200, 157, 70, 0.14)"
                strokeWidth="1"
              />

              {/* Dynamic Directional Glow Arc when thumbstick is deflected */}
              {joyPuckOffset.active && joyNorm > 0.12 && (
                <g
                  transform={`rotate(${(joyAngleRad * 180) / Math.PI + 90} 60 60)`}
                >
                  <path
                    d="M 38 14 A 50 50 0 0 1 82 14"
                    fill="none"
                    stroke="#ffb84d"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <polygon points="60,2 65,11 55,11" fill="#ffe484" />
                </g>
              )}
            </svg>

            {/* Tactile Chola-Bronze & Agni-Gold Thumbstick Puck */}
            <div
              data-testid="mobile-joystick-puck"
              style={{
                transform: `translate3d(${joyPuckOffset.x}px, ${joyPuckOffset.y}px, 0)`,
              }}
              className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-75 pointer-events-none ${
                joyPuckOffset.active
                  ? 'bg-gradient-to-br from-[#523412] via-[#2b1a08] to-[#140c04] border-2 border-[#ffe28a] shadow-[0_0_20px_rgba(255,204,84,0.8)]'
                  : 'bg-gradient-to-br from-[#2e2010] via-[#17110a] to-[#0b0806] border-[1.5px] border-[#c89d46]/80 shadow-[0_6px_16px_rgba(0,0,0,0.9)]'
              }`}
            >
              <div className="w-7 h-7 rounded-full border border-[#f2c45a]/45 flex items-center justify-center">
                <div
                  className={`w-3 h-3 rotate-45 border ${
                    joyPuckOffset.active
                      ? 'bg-[#ffe484] border-white shadow-[0_0_8px_#ffd86b]'
                      : 'bg-[#d4a548] border-[#ffe28a]/70'
                  }`}
                />
              </div>
            </div>

            <span className="absolute -bottom-1 text-[7.5px] font-mono-num tracking-widest text-[#c89d46]/75 uppercase pointer-events-none">
              2x TAP DASH
            </span>
          </div>
        )}
      </div>

      {/* =====================================================================
          RIGHT SIDE: 4-BUTTON SACRED CHAKRA RADIAL THUMB-ARC & MUDRA WEAVER
         ===================================================================== */}
      <div className="relative flex flex-col items-end pr-0.5 pb-0.5">
        {/* Top Floating Mudra Combo Weave Strip & Collapsible Combo Cheat-Sheet */}
        <div className="pointer-events-auto flex flex-col items-end gap-1 mb-0.5 z-30">
          {lastTriggeredCombo ? (
            <div
              data-testid="mudra-combo-triggered-banner"
              className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[#2b120c]/95 via-[#3d1a10]/95 to-[#1f0d09]/95 border border-[#ffd86b] shadow-[0_0_18px_rgba(255,158,68,0.65)] flex items-center gap-1.5 animate-pulse"
            >
              <span className="text-[9px] font-mono-num font-bold text-[#ffd86b]">
                ✦ {lastTriggeredCombo.sequence.join('+')}
              </span>
              <span
                className="font-display font-bold text-[10px] tracking-wider uppercase"
                style={{ color: lastTriggeredCombo.accentColor }}
              >
                {lastTriggeredCombo.englishTitle}
              </span>
            </div>
          ) : activeSequence.length > 0 ? (
            <div
              data-testid="mudra-sequence-strip"
              className="px-2.5 py-1 rounded-full bg-[#110d0a]/92 border border-[#c89d46]/75 shadow-[0_4px_14px_rgba(0,0,0,0.85)] flex items-center gap-1.5"
            >
              <div className="flex items-center gap-1">
                {activeSequence.map((stepBtn, idx) => (
                  <React.Fragment key={`${stepBtn}-${idx}`}>
                    <span className="px-1.5 py-0.5 rounded bg-[#2e2010] border border-[#ffd86b]/70 text-[8.5px] font-mono-num font-bold text-[#ffd86b]">
                      {BUTTON_SHORT_NAMES[stepBtn]}
                    </span>
                    <span className="text-[9px] text-[#c89d46]">➔</span>
                  </React.Fragment>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {finisherButtons.length > 0 ? (
                  finisherButtons.slice(0, 2).map((fb) => (
                    <span
                      key={fb}
                      className="px-1.5 py-0.5 rounded bg-[#26140e] border text-[8.5px] font-mono-num font-bold"
                      style={{
                        borderColor: nextHints[fb].accentColor,
                        color: nextHints[fb].accentColor,
                      }}
                    >
                      +{fb}: {nextHints[fb].subLabel}
                    </span>
                  ))
                ) : (
                  <>
                    <span className="px-1.5 py-0.5 rounded bg-[#26140e] border border-[#ff4d3b]/80 text-[8.5px] font-mono-num font-bold text-[#ff4d3b]">
                      +S➔H: CYCLONE
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#26140e] border border-[#ffcf66]/80 text-[8.5px] font-mono-num font-bold text-[#ffcf66]">
                      +H➔S: PHANTOMS
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            data-testid="mudra-combo-guide-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              setShowComboDrawer((prev) => !prev);
            }}
            className="px-2 py-0.5 rounded-full bg-[#120e0b]/85 hover:bg-[#211810] border border-[#c89d46]/50 text-[8px] font-mono-num text-[#d8c39e] tracking-wider uppercase cursor-pointer flex items-center gap-1 shadow-[0_4px_12px_rgba(0,0,0,0.75)]"
          >
            <span className="text-[#ffd86b]">☸</span>
            <span>{showComboDrawer ? 'HIDE COMBOS' : 'MUDRA COMBOS'}</span>
          </button>

          {showComboDrawer && (
            <div
              data-testid="mudra-combo-drawer"
              className="w-64 sm:w-72 bg-[#0c0907]/95 backdrop-blur-md border border-[#c89d46]/75 rounded-lg p-2 shadow-[0_12px_36px_rgba(0,0,0,0.95)] text-[9px] space-y-1"
            >
              <div className="flex items-center justify-between border-b border-[#c89d46]/30 pb-1 mb-1">
                <span className="font-display font-bold text-[#ffd86b] tracking-wider uppercase text-[9.5px]">
                  4-Button Mudra Weapon Arts
                </span>
                <span className="font-mono-num text-[8px] text-[#a89b84]">
                  TAP IN SEQUENCE
                </span>
              </div>
              {MUDRA_COMBO_SPECS.map((spec) => (
                <div
                  key={spec.id}
                  className="flex items-center justify-between gap-1.5 py-0.5 border-b border-[#ffffff]/5 last:border-b-0"
                >
                  <span className="px-1.5 py-0.5 rounded bg-[#1f160d] border border-[#c89d46]/50 font-mono-num font-bold text-[#ffe28a] shrink-0">
                    {spec.sequence.join(' ➔ ')}
                  </span>
                  <span
                    className="font-display font-bold truncate text-right"
                    style={{ color: spec.accentColor }}
                  >
                    {spec.englishTitle}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* =================================================================
            ERGONOMIC 220x220 RADIAL THUMB-ARC CONTAINER (4 CIRCULAR MEDALLIONS)
           ================================================================= */}
        <div className="relative w-[216px] h-[216px] sm:w-[232px] sm:h-[232px] pointer-events-none">
          {/* Sacred Yantra SVG Geometry & Live Mudra Energy Filaments */}
          <svg
            viewBox="0 0 220 220"
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          >
            <defs>
              <linearGradient id="yantraArcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(200, 157, 70, 0.45)" />
                <stop offset="50%" stopColor="rgba(255, 216, 107, 0.72)" />
                <stop offset="100%" stopColor="rgba(200, 157, 70, 0.45)" />
              </linearGradient>
              <radialGradient id="strikeHubAura" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255, 150, 54, 0.36)" />
                <stop offset="65%" stopColor="rgba(200, 90, 32, 0.14)" />
                <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
              </radialGradient>
            </defs>

            {/* Ambient Sacred Mandala Aura under Primary Strike Hub */}
            <circle cx="162" cy="162" r="54" fill="url(#strikeHubAura)" />

            {/* Outer Thumb-Arc Track connecting D (50,166) -> H (83,83) -> P (166,50) */}
            <path
              d="M 50 166 A 112 112 0 0 1 166 50"
              fill="none"
              stroke="url(#yantraArcGrad)"
              strokeWidth="1.8"
              strokeDasharray="5 4"
            />

            {/* Sacred Spokes from Primary Strike Hub (162,162) to D, H, P */}
            {(['D', 'H', 'P'] as MudraButtonId[]).map((satBtn) => {
              const target = NODE_COORDS[satBtn];
              const isNextFinisher =
                lastPressedBtn !== null && nextHints[satBtn]?.isFinisherReady;
              const isJustTriggered =
                activeFilamentPair &&
                ((activeFilamentPair[0] === 'S' && activeFilamentPair[1] === satBtn) ||
                  (activeFilamentPair[1] === 'S' && activeFilamentPair[0] === satBtn));
              const strokeCol = isJustTriggered
                ? '#ffe484'
                : isNextFinisher
                ? nextHints[satBtn].accentColor
                : 'rgba(200, 157, 70, 0.28)';

              return (
                <line
                  key={`spoke-${satBtn}`}
                  x1={NODE_COORDS.S.x}
                  y1={NODE_COORDS.S.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={strokeCol}
                  strokeWidth={isJustTriggered || isNextFinisher ? '3.2' : '1.3'}
                  strokeDasharray={isJustTriggered || isNextFinisher ? undefined : '3 3'}
                />
              );
            })}

            {/* Highlighted Energy Filament between ANY two buttons in active Mudra weave */}
            {lastPressedBtn &&
              finisherButtons.map((targetBtn) => {
                const p1 = NODE_COORDS[lastPressedBtn];
                const p2 = NODE_COORDS[targetBtn];
                return (
                  <g key={`filament-${lastPressedBtn}-${targetBtn}`}>
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={nextHints[targetBtn].accentColor}
                      strokeWidth="3.6"
                      strokeLinecap="round"
                      opacity="0.9"
                    />
                    <circle
                      cx={(p1.x + p2.x) * 0.5}
                      cy={(p1.y + p2.y) * 0.5}
                      r="3.5"
                      fill="#fff4c2"
                    />
                  </g>
                );
              })}
          </svg>

          {/* -----------------------------------------------------------------
              1. SATELLITE SLOT D (Bottom-Left of Hub, 50,166): AGNI-STEP DASH
             ----------------------------------------------------------------- */}
          <button
            type="button"
            data-testid="pc-skill-dodge"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.blur();
              fireButton('D', true);
            }}
            onClick={(e) => {
              e.currentTarget.blur();
              fireButton('D', false);
            }}
            style={{
              left: `${(NODE_COORDS.D.x / 220) * 100}%`,
              top: `${(NODE_COORDS.D.y / 220) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`pointer-events-auto absolute w-[58px] h-[58px] sm:w-[62px] sm:h-[62px] rounded-full flex flex-col items-center justify-center active:scale-90 transition-transform cursor-pointer touch-none ${
              nextHints.D.isFinisherReady
                ? 'bg-gradient-to-br from-[#0e3642] via-[#091e26] to-[#051014] border-2 border-[#63f2ff] shadow-[0_0_20px_rgba(99,242,255,0.8)]'
                : 'bg-gradient-to-br from-[#2b1d10] via-[#16100a] to-[#0b0806] border-[1.8px] border-[#ffb84d]/85 shadow-[0_8px_20px_rgba(0,0,0,0.9)]'
            }`}
          >
            <svg
              viewBox="0 0 64 64"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              {[0, 1].map((chargeIdx) => {
                const filled = hud.dashCharges > chargeIdx;
                const dPath =
                  chargeIdx === 0
                    ? 'M 8 24 A 26 26 0 0 1 30 6'
                    : 'M 34 6 A 26 26 0 0 1 56 24';
                return (
                  <path
                    key={chargeIdx}
                    d={dPath}
                    fill="none"
                    stroke={
                      filled
                        ? nextHints.D.isFinisherReady
                          ? '#63f2ff'
                          : '#ffd86b'
                        : 'rgba(200,157,70,0.22)'
                    }
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>

            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 mb-0.5 pointer-events-none"
              fill="none"
              stroke={nextHints.D.isFinisherReady ? '#63f2ff' : '#ffd86b'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" />
            </svg>

            <span
              className="font-display font-bold text-[8.5px] tracking-wider leading-none uppercase"
              style={{
                color: nextHints.D.isFinisherReady ? nextHints.D.accentColor : '#fff0d4',
              }}
            >
              {nextHints.D.subLabel}
            </span>
            <span className="text-[6.5px] font-mono-num text-[#ffd86b]/85 leading-none mt-0.5">
              {nextHints.D.isFinisherReady
                ? nextHints.D.badgeText
                : `${hud.dashCharges}/${hud.maxDashCharges}`}
            </span>
          </button>

          {/* -----------------------------------------------------------------
              2. SATELLITE SLOT H (Diagonal Center Arc, 83,83): HEAVY / ASTRA / WEAVE
             ----------------------------------------------------------------- */}
          <button
            type="button"
            data-testid="pc-skill-heavy"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.blur();
              fireButton('H', true);
            }}
            onClick={(e) => {
              e.currentTarget.blur();
              fireButton('H', false);
            }}
            style={{
              left: `${(NODE_COORDS.H.x / 220) * 100}%`,
              top: `${(NODE_COORDS.H.y / 220) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`pointer-events-auto absolute w-[62px] h-[62px] sm:w-[66px] sm:h-[66px] rounded-full flex flex-col items-center justify-center active:scale-90 transition-transform cursor-pointer touch-none ${
              nextHints.H.isFinisherReady
                ? 'bg-gradient-to-br from-[#471610] via-[#290b08] to-[#120504] border-2 border-[#ff6a33] shadow-[0_0_22px_rgba(255,106,51,0.85)]'
                : hud.riposteWindowTimer > 0
                ? 'bg-gradient-to-br from-[#4a320d] via-[#291b06] to-[#120b03] border-2 border-[#ffe28a] shadow-[0_0_20px_rgba(255,226,138,0.8)]'
                : 'bg-gradient-to-br from-[#331812] via-[#1c0d0a] to-[#0d0706] border-[1.8px] border-[#f2c45a]/85 shadow-[0_8px_20px_rgba(0,0,0,0.9)]'
            }`}
          >
            <div className="absolute -top-1 flex items-center gap-1 pointer-events-none">
              {[0, 1, 2, 3].map((orbIdx) => (
                <span
                  key={orbIdx}
                  className={`w-1.5 h-1.5 rotate-45 border ${
                    hud.focusOrbs > orbIdx
                      ? 'bg-[#ffe28a] border-white shadow-[0_0_5px_#ffd86b]'
                      : 'bg-[#1c1510] border-[#6e5632]'
                  }`}
                />
              ))}
            </div>

            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 mb-0.5 pointer-events-none"
              fill="none"
              stroke={
                nextHints.H.isFinisherReady
                  ? nextHints.H.accentColor
                  : hud.riposteWindowTimer > 0
                  ? '#ffe28a'
                  : '#ff8a47'
              }
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2c1.5 3.5 4.5 5.5 4.5 9.5a4.5 4.5 0 1 1-9 0C7.5 8.5 10 6 12 2z" />
              <path d="M12 14v6" />
            </svg>

            <span
              className="font-display font-bold text-[8.5px] tracking-wider leading-none uppercase"
              style={{
                color: nextHints.H.isFinisherReady
                  ? nextHints.H.accentColor
                  : '#ffd86b',
              }}
            >
              {nextHints.H.isFinisherReady
                ? nextHints.H.subLabel
                : hud.riposteWindowTimer > 0
                ? 'RIPOSTE'
                : hud.focusOrbs === 0 && hud.immobilizeCd <= 0
                ? 'ASTRA'
                : hud.stance === 'smash'
                ? 'SLAM'
                : hud.stance === 'pillar'
                ? 'VORTEX'
                : 'LUNGE'}
            </span>
            <span className="text-[6.5px] font-mono-num text-[#ffd86b]/85 leading-none mt-0.5">
              {nextHints.H.isFinisherReady
                ? nextHints.H.badgeText
                : hud.riposteWindowTimer > 0
                ? 'COUNTER!'
                : hud.focusOrbs > 0
                ? `${hud.focusOrbs} ORB`
                : 'HEAVY'}
            </span>
          </button>

          {/* -----------------------------------------------------------------
              3. SATELLITE SLOT P (Top-Right Arc, 166,50): VAJRA PARRY & MUDRA STARTER
             ----------------------------------------------------------------- */}
          <button
            type="button"
            data-testid="pc-skill-parry"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.blur();
              fireButton('P', true);
            }}
            onClick={(e) => {
              e.currentTarget.blur();
              fireButton('P', false);
            }}
            style={{
              left: `${(NODE_COORDS.P.x / 220) * 100}%`,
              top: `${(NODE_COORDS.P.y / 220) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`pointer-events-auto absolute w-[58px] h-[58px] sm:w-[62px] sm:h-[62px] rounded-full flex flex-col items-center justify-center active:scale-90 transition-transform cursor-pointer touch-none ${
              hud.parryCd <= 0
                ? 'bg-gradient-to-br from-[#302410] via-[#1a1308] to-[#0c0905] border-[1.8px] border-[#ffd86b] shadow-[0_8px_20px_rgba(0,0,0,0.9)]'
                : 'bg-gradient-to-br from-[#1a1816] to-[#0d0c0b] border border-[#6e5d42]/45 opacity-80'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 mb-0.5 pointer-events-none"
              fill="none"
              stroke={hud.parryCd <= 0 ? '#ffe28a' : '#8c7e68'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>

            <span className="font-display font-bold text-[8.5px] text-[#ffe28a] tracking-wider leading-none uppercase">
              {hud.parryCd <= 0 ? 'PARRY' : `${hud.parryCd.toFixed(1)}S`}
            </span>
            <span className="text-[6.5px] font-mono-num text-[#3ee0a8] leading-none mt-0.5">
              {hasActiveParty && hud.partyLinkCd <= 0 ? '⚡LINK' : 'DEFLECT'}
            </span>
          </button>

          {/* -----------------------------------------------------------------
              4. PRIMARY HUB SLOT S (Bottom-Right Anchor, 162,162): SOVEREIGN STRIKE / EXECUTE
             ----------------------------------------------------------------- */}
          <button
            type="button"
            data-testid="pc-skill-strike"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.blur();
              fireButton('S', true);
            }}
            onClick={(e) => {
              e.currentTarget.blur();
              fireButton('S', false);
            }}
            onPointerUp={() => onReleaseStrike()}
            onPointerCancel={() => onReleaseStrike()}
            onPointerLeave={() => onReleaseStrike()}
            style={{
              left: `${(NODE_COORDS.S.x / 220) * 100}%`,
              top: `${(NODE_COORDS.S.y / 220) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`pointer-events-auto absolute w-[84px] h-[84px] sm:w-[90px] sm:h-[90px] rounded-full flex flex-col items-center justify-center active:scale-92 transition-transform cursor-pointer touch-none ${
              hud.hasBrokenTarget
                ? 'bg-gradient-to-br from-[#611319] via-[#38090d] to-[#170406] border-[2.5px] border-[#ff4d3b] shadow-[0_0_28px_rgba(255,77,59,0.9)]'
                : nextHints.S.isFinisherReady
                ? 'bg-gradient-to-br from-[#143d2f] via-[#0b241b] to-[#06120d] border-[2.5px] border-[#3ee0a8] shadow-[0_0_26px_rgba(62,224,168,0.85)]'
                : 'bg-gradient-to-br from-[#452810] via-[#261508] to-[#120a04] border-[2.5px] border-[#ffd86b] shadow-[0_10px_28px_rgba(0,0,0,0.95),0_0_18px_rgba(242,196,90,0.35)]'
            }`}
          >
            <svg
              viewBox="0 0 92 92"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <circle
                cx="46"
                cy="46"
                r="38"
                fill="none"
                stroke="rgba(255, 226, 138, 0.28)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {[0, 1, 2, 3].map((stepIdx) => {
                const activeStep = (hud.comboCount % 4) > stepIdx || hud.hasBrokenTarget;
                const rot = stepIdx * 90;
                return (
                  <g key={stepIdx} transform={`rotate(${rot} 46 46)`}>
                    <path
                      d="M 24 10 A 42 42 0 0 1 68 10"
                      fill="none"
                      stroke={
                        hud.hasBrokenTarget
                          ? '#ff4d3b'
                          : nextHints.S.isFinisherReady
                          ? nextHints.S.accentColor
                          : activeStep
                          ? '#ffe28a'
                          : 'rgba(200, 157, 70, 0.22)'
                      }
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}
            </svg>

            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6 mb-0.5 pointer-events-none"
              fill="none"
              stroke={
                hud.hasBrokenTarget
                  ? '#ff9e94'
                  : nextHints.S.isFinisherReady
                  ? nextHints.S.accentColor
                  : '#ffe484'
              }
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
              <path d="M13 19l6-6" />
              <path d="M16 16l4 4" />
              <path d="M19 21l2-2" />
              <path d="M9.5 6.5L21 18v3h-3L6.5 9.5" />
            </svg>

            <span
              className="font-display font-bold text-[11px] sm:text-xs tracking-wider leading-none uppercase"
              style={{
                color: hud.hasBrokenTarget
                  ? '#ffdbd6'
                  : nextHints.S.isFinisherReady
                  ? nextHints.S.accentColor
                  : '#fff4d6',
              }}
            >
              {hud.hasBrokenTarget
                ? 'EXECUTE'
                : nextHints.S.isFinisherReady
                ? nextHints.S.subLabel
                : 'STRIKE'}
            </span>
            <span className="text-[7px] font-mono-num text-[#ffd86b] leading-none mt-0.5">
              {hud.hasBrokenTarget
                ? 'PRANA KILL!'
                : nextHints.S.isFinisherReady
                ? nextHints.S.badgeText
                : hud.comboCount > 0
                ? `${hud.comboCount} HIT`
                : 'HOLD / TAP'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
