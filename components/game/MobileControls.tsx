'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// ─── Controller Callbacks ─────────────────────────────────────────────────────

export interface MobileControlsCallbacks {
  onMoveJoystick: (dx: number, dy: number) => void; // normalised -1..1
  onStopJoystick: () => void;
  onDpadMove?: (dx: number, dy: number) => void;
  onLightAttack: () => void;   // Square ■
  onHeavyUnleash: () => void;  // Triangle ▲
  onDodge: () => void;         // Circle ●
  onParry: () => void;         // Cross ✖
  onHeal: () => void;          // R2 trigger (Amrita draught)
  onSpecial: () => void;       // R1 trigger (Rudra rage)
  onMirage: () => void;        // L2 trigger (Maya decoy)
  onSwitchStance: () => void;  // L1 trigger (Stance switch)
  onSelect?: () => void;       // SELECT button (Codex / Story)
  onStart?: () => void;        // START button (Pause / Resume / Start game)
}

interface Props {
  callbacks: MobileControlsCallbacks;
  visible?: boolean;
  gameState?: 'title' | 'playing' | 'paused' | 'gameover';
  onStartGame?: () => void;
}

// ─── Haptics Helper ───────────────────────────────────────────────────────────

function triggerHaptic(durationMs = 12) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(durationMs);
    } catch {
      // Ignore vibration error on unsupported hardware
    }
  }
}

// ─── PSP Style Analog Joystick ────────────────────────────────────────────────

const JOY_BASE_RADIUS = 56;
const JOY_KNOB_RADIUS = 26;
const JOY_DEADZONE = 0.10;

function PSPAnalogStick({
  onMove,
  onStop,
}: {
  onMove: (dx: number, dy: number) => void;
  onStop: () => void;
}) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);
  const baseCenter = useRef({ x: 0, y: 0 });
  const [isEngaged, setIsEngaged] = useState(false);

  const applyPosition = useCallback(
    (clientX: number, clientY: number) => {
      const cx = baseCenter.current.x;
      const cy = baseCenter.current.y;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      const clampedDist = Math.min(dist, JOY_BASE_RADIUS);
      const angle = Math.atan2(dy, dx);
      const kx = Math.cos(angle) * clampedDist;
      const ky = Math.sin(angle) * clampedDist;

      if (knobRef.current) {
        knobRef.current.style.transform = `translate(${kx}px, ${ky}px)`;
      }

      const normX = dx / JOY_BASE_RADIUS;
      const normY = dy / JOY_BASE_RADIUS;
      const magnitude = Math.hypot(normX, normY);

      if (magnitude > JOY_DEADZONE) {
        const clampedMag = Math.min(magnitude, 1);
        const unitX = normX / magnitude;
        const unitY = normY / magnitude;
        onMove(unitX * clampedMag, unitY * clampedMag);
      } else {
        onStop();
      }
    },
    [onMove, onStop]
  );

  const resetStick = useCallback(() => {
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(0px, 0px)';
    }
    setIsEngaged(false);
    activePointerId.current = null;
    onStop();
  }, [onStop]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    activePointerId.current = e.pointerId;
    setIsEngaged(true);
    triggerHaptic(8);

    const rect = e.currentTarget.getBoundingClientRect();
    baseCenter.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    applyPosition(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    e.preventDefault();
    applyPosition(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    e.preventDefault();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    resetStick();
  };

  return (
    <div className="flex flex-col items-center select-none touch-none">
      <div
        ref={baseRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative flex items-center justify-center rounded-full cursor-grab active:cursor-grabbing"
        style={{
          width: JOY_BASE_RADIUS * 2,
          height: JOY_BASE_RADIUS * 2,
          background: isEngaged
            ? 'radial-gradient(circle, rgba(251,191,36,0.22) 0%, rgba(20,20,24,0.92) 75%)'
            : 'radial-gradient(circle, rgba(35,35,42,0.95) 0%, rgba(14,14,18,0.95) 85%)',
          border: isEngaged
            ? '2px solid rgba(251,191,36,0.7)'
            : '2px solid rgba(200,157,70,0.4)',
          boxShadow: isEngaged
            ? '0 0 18px rgba(251,191,36,0.35), inset 0 0 16px rgba(0,0,0,0.85)'
            : '0 4px 16px rgba(0,0,0,0.75), inset 0 0 14px rgba(0,0,0,0.85)',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        {/* PSP Bezel Compass Ticks */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <div
            key={deg}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: deg % 90 === 0 ? 3 : 2,
              height: deg % 90 === 0 ? 6 : 4,
              backgroundColor: deg % 90 === 0 ? 'rgba(251,191,36,0.55)' : 'rgba(160,160,175,0.25)',
              transform: `rotate(${deg}deg) translateY(-${JOY_BASE_RADIUS - 7}px)`,
              transformOrigin: 'center center',
            }}
          />
        ))}

        {/* Center Disc Guide */}
        <div
          className="absolute rounded-full pointer-events-none border border-white/5"
          style={{ width: JOY_BASE_RADIUS, height: JOY_BASE_RADIUS }}
        />

        {/* PSP Knurled Analog Puck */}
        <div
          ref={knobRef}
          className="absolute rounded-full pointer-events-none flex items-center justify-center"
          style={{
            width: JOY_KNOB_RADIUS * 2,
            height: JOY_KNOB_RADIUS * 2,
            background: isEngaged
              ? 'radial-gradient(circle at 35% 35%, #ffd86b 0%, #c89d46 55%, #3d2a0c 100%)'
              : 'radial-gradient(circle at 35% 35%, #555562 0%, #2b2b35 55%, #15151c 100%)',
            border: isEngaged
              ? '2px solid rgba(255,230,120,0.95)'
              : '2px solid rgba(200,157,70,0.5)',
            boxShadow: isEngaged
              ? '0 0 14px rgba(251,191,36,0.7), 0 3px 8px rgba(0,0,0,0.9)'
              : '0 3px 10px rgba(0,0,0,0.85), inset 0 1px 2px rgba(255,255,255,0.25)',
            transition: 'background 0.12s, border-color 0.12s, box-shadow 0.12s',
          }}
        >
          {/* PSP Textured Grip Rings */}
          <div
            className="rounded-full border border-black/40 flex items-center justify-center"
            style={{ width: JOY_KNOB_RADIUS * 1.35, height: JOY_KNOB_RADIUS * 1.35 }}
          >
            <div
              className="rounded-full"
              style={{
                width: 6,
                height: 6,
                backgroundColor: isEngaged ? '#fff' : 'rgba(200,157,70,0.7)',
                boxShadow: isEngaged ? '0 0 6px #fff' : 'none',
              }}
            />
          </div>
        </div>
      </div>
      <span className="text-[9px] font-mono font-bold tracking-widest text-[#c89d46]/70 mt-1 select-none">
        ANALOG
      </span>
    </div>
  );
}

// ─── PSP Style D-PAD (Directional Cross) ──────────────────────────────────────

function PSPDpad({
  onDirection,
}: {
  onDirection: (dx: number, dy: number) => void;
}) {
  const heldDirections = useRef<{ [k: string]: boolean }>({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  const updateDpad = useCallback(() => {
    let dx = 0;
    let dy = 0;
    if (heldDirections.current.left) dx -= 1;
    if (heldDirections.current.right) dx += 1;
    if (heldDirections.current.up) dy -= 1;
    if (heldDirections.current.down) dy += 1;

    const mag = Math.hypot(dx, dy);
    if (mag > 0) {
      onDirection(dx / mag, dy / mag);
    } else {
      onDirection(0, 0);
    }
  }, [onDirection]);

  const bindDpadButton = (dir: 'up' | 'down' | 'left' | 'right') => {
    return {
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
        heldDirections.current[dir] = true;
        triggerHaptic(10);
        updateDpad();
      },
      onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
        heldDirections.current[dir] = false;
        updateDpad();
      },
      onPointerCancel: () => {
        heldDirections.current[dir] = false;
        updateDpad();
      },
    };
  };

  return (
    <div className="relative w-28 h-28 flex items-center justify-center select-none touch-none">
      {/* Central D-pad Base Plate */}
      <div className="absolute w-28 h-9 bg-[#17171d]/90 rounded-md border border-[#c89d46]/30 shadow-lg pointer-events-none" />
      <div className="absolute h-28 w-9 bg-[#17171d]/90 rounded-md border border-[#c89d46]/30 shadow-lg pointer-events-none" />
      <div className="absolute w-8 h-8 rounded-full bg-[#0d0d12] border border-[#c89d46]/40 pointer-events-none z-10" />

      {/* UP */}
      <button
        type="button"
        {...bindDpadButton('up')}
        className="absolute top-0 w-9 h-10 rounded-t-md bg-gradient-to-b from-[#2a2a35] to-[#1a1a22] active:from-[#fbbf24]/50 active:to-[#c89d46]/50 flex items-center justify-center border-t border-x border-[#c89d46]/50 shadow-md transition-all active:scale-95 z-20"
      >
        <span className="text-[#fbbf24] text-xs font-bold leading-none">▲</span>
      </button>

      {/* DOWN */}
      <button
        type="button"
        {...bindDpadButton('down')}
        className="absolute bottom-0 w-9 h-10 rounded-b-md bg-gradient-to-t from-[#2a2a35] to-[#1a1a22] active:from-[#fbbf24]/50 active:to-[#c89d46]/50 flex items-center justify-center border-b border-x border-[#c89d46]/50 shadow-md transition-all active:scale-95 z-20"
      >
        <span className="text-[#fbbf24] text-xs font-bold leading-none">▼</span>
      </button>

      {/* LEFT */}
      <button
        type="button"
        {...bindDpadButton('left')}
        className="absolute left-0 h-9 w-10 rounded-l-md bg-gradient-to-r from-[#2a2a35] to-[#1a1a22] active:from-[#fbbf24]/50 active:to-[#c89d46]/50 flex items-center justify-center border-l border-y border-[#c89d46]/50 shadow-md transition-all active:scale-95 z-20"
      >
        <span className="text-[#fbbf24] text-xs font-bold leading-none">◄</span>
      </button>

      {/* RIGHT */}
      <button
        type="button"
        {...bindDpadButton('right')}
        className="absolute right-0 h-9 w-10 rounded-r-md bg-gradient-to-l from-[#2a2a35] to-[#1a1a22] active:from-[#fbbf24]/50 active:to-[#c89d46]/50 flex items-center justify-center border-r border-y border-[#c89d46]/50 shadow-md transition-all active:scale-95 z-20"
      >
        <span className="text-[#fbbf24] text-xs font-bold leading-none">►</span>
      </button>
    </div>
  );
}

// ─── PlayStation Iconic Face Button (▲, ■, ●, ✖) ──────────────────────────────

interface PSButtonProps {
  symbol: string;        // ▲, ■, ●, ✖
  symbolColor: string;  // Hex or Tailwind color
  glowColor: string;
  name: string;          // Action name (e.g. ATTACK, HEAVY, DODGE, PARRY)
  size?: number;         // px
  onPress: () => void;
}

function PSFaceButton({
  symbol,
  symbolColor,
  glowColor,
  name,
  size = 54,
  onPress,
}: PSButtonProps) {
  const [pressed, setPressed] = useState(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setPressed(true);
    triggerHaptic(16);
    onPress();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setPressed(false);
  };

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setPressed(false)}
      onContextMenu={(e) => e.preventDefault()}
      className="flex flex-col items-center justify-center rounded-full select-none touch-none transition-transform duration-75 active:scale-90"
      style={{
        width: size,
        height: size,
        background: pressed
          ? `radial-gradient(circle at 40% 40%, ${glowColor}55 0%, #1a1a24 70%)`
          : 'radial-gradient(circle at 35% 35%, #2a2a36 0%, #14141c 70%, #0a0a10 100%)',
        border: pressed
          ? `2px solid ${symbolColor}`
          : '2px solid rgba(255,255,255,0.22)',
        boxShadow: pressed
          ? `0 0 20px ${glowColor}, inset 0 2px 6px rgba(0,0,0,0.9)`
          : `0 4px 12px rgba(0,0,0,0.85), inset 0 1px 2px rgba(255,255,255,0.2)`,
      }}
    >
      <span
        className="font-extrabold leading-none transition-all drop-shadow"
        style={{
          color: symbolColor,
          fontSize: size * 0.42,
          textShadow: `0 0 10px ${glowColor}`,
        }}
      >
        {symbol}
      </span>
      <span
        className="text-[7.5px] font-mono font-bold tracking-tight uppercase leading-none mt-0.5"
        style={{ color: pressed ? '#ffffff' : 'rgba(255,255,255,0.7)' }}
      >
        {name}
      </span>
    </button>
  );
}

// ─── PSP Shoulder Bumper Button (L1, L2, R1, R2) ──────────────────────────────

function PSShoulderBumper({
  label,
  sublabel,
  accentColor,
  onPress,
}: {
  label: string;
  sublabel: string;
  accentColor: string;
  onPress: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setPressed(true);
    triggerHaptic(14);
    onPress();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setPressed(false);
  };

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setPressed(false)}
      onContextMenu={(e) => e.preventDefault()}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg select-none touch-none transition-all active:scale-95 shadow-md"
      style={{
        background: pressed
          ? 'linear-gradient(180deg, rgba(251,191,36,0.3) 0%, rgba(20,20,26,0.95) 100%)'
          : 'linear-gradient(180deg, rgba(42,42,54,0.9) 0%, rgba(18,18,24,0.95) 100%)',
        border: `1.5px solid ${pressed ? accentColor : 'rgba(200,157,70,0.45)'}`,
        boxShadow: pressed
          ? `0 0 12px ${accentColor}80`
          : '0 3px 8px rgba(0,0,0,0.6)',
      }}
    >
      <span
        className="text-[11px] font-mono font-black px-1.5 py-0.5 rounded bg-black/60 border border-white/10"
        style={{ color: accentColor }}
      >
        {label}
      </span>
      <span className="text-[10px] font-sans font-bold text-neutral-200 tracking-wider uppercase">
        {sublabel}
      </span>
    </button>
  );
}

// ─── Main MobileControls (PlayStation & PSP Handheld Overlay) ─────────────────

export default function MobileControls({
  callbacks,
  visible = true,
  gameState = 'playing',
  onStartGame,
}: Props) {
  const [controlsEnabled, setControlsEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'analog' | 'dpad'>('analog');

  if (!visible || !controlsEnabled) {
    return (
      <div className="fixed bottom-3 left-3 z-50 pointer-events-auto">
        <button
          type="button"
          onClick={() => setControlsEnabled(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 border border-[#fbbf24]/70 text-[#fbbf24] text-xs font-mono font-bold shadow-2xl backdrop-blur-md active:scale-95"
        >
          <span>🎮</span>
          <span>PSP CONTROLS: SHOW</span>
        </button>
      </div>
    );
  }

  const {
    onMoveJoystick,
    onStopJoystick,
    onLightAttack,
    onHeavyUnleash,
    onDodge,
    onParry,
    onHeal,
    onSpecial,
    onMirage,
    onSwitchStance,
    onSelect,
    onStart,
  } = callbacks;

  const handleStartOrAction = () => {
    if (gameState === 'title' && onStartGame) {
      onStartGame();
    } else if (onStart) {
      onStart();
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 pointer-events-none select-none touch-none flex flex-col justify-between p-2 sm:p-4"
      style={{ touchAction: 'none' }}
    >
      {/* ── TOP SHOULDER BUMPERS (L1 / L2 on Left, R1 / R2 on Right) ── */}
      <div className="flex items-center justify-between w-full pointer-events-auto pt-1">
        {/* Left Shoulders: L1 (Stance) & L2 (Mirage) */}
        <div className="flex items-center gap-2">
          <PSShoulderBumper
            label="L2"
            sublabel="MIRAGE"
            accentColor="#a855f7"
            onPress={onMirage}
          />
          <PSShoulderBumper
            label="L1"
            sublabel="STANCE"
            accentColor="#38bdf8"
            onPress={onSwitchStance}
          />
        </div>

        {/* Center Controller Mode Toggle Pill */}
        <div className="flex items-center gap-1 bg-black/75 backdrop-blur-md border border-[#c89d46]/40 px-2 py-1 rounded-full shadow-lg">
          <button
            type="button"
            onClick={() => setActiveTab('analog')}
            className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider transition-all ${
              activeTab === 'analog'
                ? 'bg-[#fbbf24] text-black shadow'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            STICK
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dpad')}
            className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider transition-all ${
              activeTab === 'dpad'
                ? 'bg-[#fbbf24] text-black shadow'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            D-PAD
          </button>
          <button
            type="button"
            onClick={() => setControlsEnabled(false)}
            title="Minimize on-screen controls"
            className="text-neutral-400 hover:text-red-400 ml-1 text-xs px-1"
          >
            ✕
          </button>
        </div>

        {/* Right Shoulders: R1 (Rudra Rage) & R2 (Amrita Heal) */}
        <div className="flex items-center gap-2">
          <PSShoulderBumper
            label="R1"
            sublabel="RUDRA"
            accentColor="#f97316"
            onPress={onSpecial}
          />
          <PSShoulderBumper
            label="R2"
            sublabel="HEAL"
            accentColor="#22c55e"
            onPress={onHeal}
          />
        </div>
      </div>

      {/* ── TITLE SCREEN PROMPT OVERLAY (if game hasn't started yet) ── */}
      {gameState === 'title' && (
        <div className="self-center pointer-events-auto bg-black/85 backdrop-blur-md border border-[#fbbf24]/80 px-6 py-2.5 rounded-full shadow-[0_0_24px_rgba(251,191,36,0.35)] animate-pulse flex items-center gap-3">
          <span className="text-[#fbbf24] text-sm">🎮</span>
          <span className="text-xs font-mono font-bold tracking-widest text-neutral-100 uppercase">
            Tap <strong className="text-[#38bdf8] font-black">[✖]</strong>, <strong className="text-[#f43f5e] font-black">[■]</strong>, or <strong className="text-[#fbbf24] font-black">[START]</strong> to Enter Crucible
          </span>
        </div>
      )}

      {/* ── BOTTOM ROW: Left (D-pad / Joystick), Center (SELECT/START), Right (PlayStation Face Buttons) ── */}
      <div className="flex items-end justify-between w-full pb-1 sm:pb-3">
        {/* LEFT CLUSTER: D-Pad or Analog Stick */}
        <div className="pointer-events-auto flex flex-col items-center gap-1 ml-1 sm:ml-4">
          {activeTab === 'analog' ? (
            <PSPAnalogStick onMove={onMoveJoystick} onStop={onStopJoystick} />
          ) : (
            <PSPDpad
              onDirection={(dx, dy) => {
                if (dx === 0 && dy === 0) {
                  onStopJoystick();
                } else {
                  onMoveJoystick(dx, dy);
                }
              }}
            />
          )}
        </div>

        {/* CENTER CONSOLE BAR: SELECT & START (PSP Handheld Bar) */}
        <div className="pointer-events-auto flex items-center gap-4 mb-2">
          {/* SELECT Button */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              triggerHaptic(12);
              if (onSelect) onSelect();
            }}
            className="flex flex-col items-center justify-center px-3 py-1 rounded-full bg-[#181820]/90 border border-[#c89d46]/40 shadow-lg active:scale-95"
          >
            <div className="w-6 h-1.5 bg-[#c89d46]/70 rounded-full mb-0.5" />
            <span className="text-[8px] font-mono font-bold tracking-widest text-[#c89d46]">
              SELECT
            </span>
          </button>

          {/* START Button */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              triggerHaptic(14);
              handleStartOrAction();
            }}
            className="flex flex-col items-center justify-center px-3 py-1 rounded-full bg-[#181820]/90 border border-[#fbbf24]/60 shadow-lg active:scale-95"
          >
            <div className="w-6 h-1.5 bg-[#fbbf24] rounded-full mb-0.5 shadow-[0_0_6px_#fbbf24]" />
            <span className="text-[8px] font-mono font-bold tracking-widest text-[#fbbf24]">
              START
            </span>
          </button>
        </div>

        {/* RIGHT CLUSTER: PlayStation Iconic Face Buttons (▲, ■, ●, ✖) */}
        <div className="pointer-events-auto mr-1 sm:mr-4">
          <div
            className="relative select-none"
            style={{ width: 170, height: 170 }}
          >
            {/* ▲ TRIANGLE (Top) - HEAVY / FOCUS UNLEASH */}
            <div
              className="absolute"
              style={{
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            >
              <PSFaceButton
                symbol="▲"
                symbolColor="#4ade80"
                glowColor="#22c55e"
                name="HEAVY"
                size={54}
                onPress={onHeavyUnleash}
              />
            </div>

            {/* ■ SQUARE (Left) - LIGHT ATTACK / COMBO */}
            <div
              className="absolute"
              style={{
                top: '50%',
                left: 0,
                transform: 'translateY(-50%)',
              }}
            >
              <PSFaceButton
                symbol="■"
                symbolColor="#f43f5e"
                glowColor="#e11d48"
                name="ATTACK"
                size={54}
                onPress={() => {
                  if (gameState === 'title' && onStartGame) {
                    onStartGame();
                  } else {
                    onLightAttack();
                  }
                }}
              />
            </div>

            {/* ● CIRCLE (Right) - DODGE / AGNI DASH */}
            <div
              className="absolute"
              style={{
                top: '50%',
                right: 0,
                transform: 'translateY(-50%)',
              }}
            >
              <PSFaceButton
                symbol="●"
                symbolColor="#f97316"
                glowColor="#ea580c"
                name="DODGE"
                size={54}
                onPress={onDodge}
              />
            </div>

            {/* ✖ CROSS (Bottom) - PARRY / DEFLECT */}
            <div
              className="absolute"
              style={{
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            >
              <PSFaceButton
                symbol="✖"
                symbolColor="#38bdf8"
                glowColor="#0284c7"
                name="PARRY"
                size={54}
                onPress={() => {
                  if (gameState === 'title' && onStartGame) {
                    onStartGame();
                  } else {
                    onParry();
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
