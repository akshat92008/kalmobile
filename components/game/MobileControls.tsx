'use client';

import React, { useEffect, useRef, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MobileControlsCallbacks {
  onMoveJoystick: (dx: number, dy: number) => void; // normalised –1..1
  onStopJoystick: () => void;
  onLightAttack: () => void;
  onHeavyUnleash: () => void;
  onDodge: () => void;
  onParry: () => void;
  onHeal: () => void;
  onSpecial: () => void;   // Rudra Tandava / Red Tides
  onMirage: () => void;   // Maya Clones / Look
  onSwitchStance: () => void;
}

interface Props {
  callbacks: MobileControlsCallbacks;
  visible: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const JOYSTICK_BASE_RADIUS = 62;
const JOYSTICK_KNOB_RADIUS = 26;
const JOYSTICK_DEADZONE = 0.12;

// ─── Button config ───────────────────────────────────────────────────────────

const ACTION_BUTTONS = [
  {
    id: 'attack',
    label: '⚔',
    sublabel: 'ATTACK',
    color: '#ffd86b',
    border: 'border-[#ffd86b]/70',
    bg: 'bg-[#1e1600]/80',
    activeBg: 'bg-[#403000]/90',
    size: 'w-16 h-16',
  },
  {
    id: 'heavy',
    label: '💥',
    sublabel: 'HEAVY',
    color: '#ff6a2b',
    border: 'border-[#ff6a2b]/70',
    bg: 'bg-[#1e0800]/80',
    activeBg: 'bg-[#401600]/90',
    size: 'w-14 h-14',
  },
  {
    id: 'dodge',
    label: '🌀',
    sublabel: 'DODGE',
    color: '#6aefff',
    border: 'border-[#6aefff]/60',
    bg: 'bg-[#001820]/80',
    activeBg: 'bg-[#003040]/90',
    size: 'w-14 h-14',
  },
  {
    id: 'parry',
    label: '🛡',
    sublabel: 'PARRY',
    color: '#3ee0a8',
    border: 'border-[#3ee0a8]/60',
    bg: 'bg-[#001a10]/80',
    activeBg: 'bg-[#003020]/90',
    size: 'w-12 h-12',
  },
] as const;

const SKILL_BUTTONS = [
  {
    id: 'heal',
    label: '🍶',
    sublabel: 'HEAL',
    color: '#90ee90',
    border: 'border-[#90ee90]/60',
    bg: 'bg-[#001200]/80',
    size: 'w-12 h-12',
  },
  {
    id: 'special',
    label: '🔥',
    sublabel: 'RUDRA',
    color: '#ff4500',
    border: 'border-[#ff4500]/60',
    bg: 'bg-[#1a0500]/80',
    size: 'w-12 h-12',
  },
  {
    id: 'mirage',
    label: '👁',
    sublabel: 'MIRAGE',
    color: '#c89d46',
    border: 'border-[#c89d46]/60',
    bg: 'bg-[#120e00]/80',
    size: 'w-12 h-12',
  },
  {
    id: 'stance',
    label: '⚡',
    sublabel: 'STANCE',
    color: '#b388ff',
    border: 'border-[#b388ff]/60',
    bg: 'bg-[#0d0020]/80',
    size: 'w-12 h-12',
  },
] as const;

// ─── Joystick Component ───────────────────────────────────────────────────────

function VirtualJoystick({
  onMove,
  onStop,
}: {
  onMove: (dx: number, dy: number) => void;
  onStop: () => void;
}) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);
  const baseCenter = useRef({ x: 0, y: 0 });

  const updateKnob = useCallback(
    (clientX: number, clientY: number) => {
      const cx = baseCenter.current.x;
      const cy = baseCenter.current.y;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, JOYSTICK_BASE_RADIUS);
      const angle = Math.atan2(dy, dx);
      const kx = Math.cos(angle) * clamped;
      const ky = Math.sin(angle) * clamped;

      if (knobRef.current) {
        knobRef.current.style.transform = `translate(${kx}px, ${ky}px)`;
      }

      const ndx = dx / JOYSTICK_BASE_RADIUS;
      const ndy = dy / JOYSTICK_BASE_RADIUS;
      const mag = Math.hypot(ndx, ndy);
      if (mag > JOYSTICK_DEADZONE) {
        onMove(ndx / Math.max(mag, 1), ndy / Math.max(mag, 1));
      } else {
        onStop();
      }
    },
    [onMove, onStop]
  );

  const resetKnob = useCallback(() => {
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(0px, 0px)';
    }
    onStop();
  }, [onStop]);

  useEffect(() => {
    const base = baseRef.current;
    if (!base) return;

    const onTouchStart = (e: TouchEvent) => {
      if (touchIdRef.current !== null) return;
      const touch = e.changedTouches[0];
      touchIdRef.current = touch.identifier;
      const rect = base.getBoundingClientRect();
      baseCenter.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      updateKnob(touch.clientX, touch.clientY);
      e.preventDefault();
    };

    const onTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === touchIdRef.current) {
          updateKnob(t.clientX, t.clientY);
          e.preventDefault();
          break;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === touchIdRef.current) {
          touchIdRef.current = null;
          resetKnob();
          break;
        }
      }
    };

    base.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      base.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [updateKnob, resetKnob]);

  return (
    <div
      ref={baseRef}
      className="relative flex items-center justify-center rounded-full select-none"
      style={{
        width: JOYSTICK_BASE_RADIUS * 2,
        height: JOYSTICK_BASE_RADIUS * 2,
        background: 'radial-gradient(circle, rgba(200,157,70,0.12) 0%, rgba(13,12,16,0.75) 70%)',
        border: '2px solid rgba(200,157,70,0.35)',
        boxShadow: '0 0 24px rgba(200,157,70,0.15), inset 0 0 20px rgba(0,0,0,0.6)',
      }}
    >
      {/* outer ring tick marks */}
      {[0, 90, 180, 270].map((deg) => (
        <div
          key={deg}
          className="absolute w-1 h-2 rounded-full bg-[#c89d46]/30"
          style={{
            transform: `rotate(${deg}deg) translateY(-${JOYSTICK_BASE_RADIUS - 6}px)`,
            transformOrigin: 'center center',
          }}
        />
      ))}
      {/* knob */}
      <div
        ref={knobRef}
        className="absolute rounded-full pointer-events-none"
        style={{
          width: JOYSTICK_KNOB_RADIUS * 2,
          height: JOYSTICK_KNOB_RADIUS * 2,
          background: 'radial-gradient(circle at 35% 35%, rgba(255,216,107,0.9) 0%, rgba(200,157,70,0.6) 60%, rgba(100,70,10,0.8) 100%)',
          border: '2px solid rgba(255,216,107,0.7)',
          boxShadow: '0 0 12px rgba(255,216,107,0.5), 0 4px 12px rgba(0,0,0,0.8)',
          transition: 'box-shadow 0.05s',
        }}
      />
    </div>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────

function ActionButton({
  label,
  sublabel,
  color,
  border,
  bg,
  activeBg,
  size,
  onPress,
}: {
  label: string;
  sublabel: string;
  color: string;
  border: string;
  bg: string;
  activeBg?: string;
  size: string;
  onPress: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onPress();
      const el = ref.current;
      if (el && activeBg) {
        el.classList.add(...activeBg.split(' '));
        el.classList.remove(...bg.split(' '));
        setTimeout(() => {
          if (!el) return;
          el.classList.remove(...activeBg.split(' '));
          el.classList.add(...bg.split(' '));
        }, 120);
      }
    },
    [onPress, bg, activeBg]
  );

  return (
    <button
      ref={ref}
      type="button"
      onTouchStart={handleTouchStart}
      onContextMenu={(e) => e.preventDefault()}
      className={`${size} ${bg} ${border} border-2 rounded-full flex flex-col items-center justify-center gap-0 shadow-lg active:scale-90 transition-transform select-none touch-none`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <span className="text-xl leading-none">{label}</span>
      <span
        className="text-[7px] font-bold tracking-wider font-mono mt-0.5 leading-none"
        style={{ color }}
      >
        {sublabel}
      </span>
    </button>
  );
}

// ─── Main MobileControls ─────────────────────────────────────────────────────

export default function MobileControls({ callbacks, visible }: Props) {
  if (!visible) return null;

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
  } = callbacks;

  const skillCallbacks: Record<string, () => void> = {
    heal: onHeal,
    special: onSpecial,
    mirage: onMirage,
    stance: onSwitchStance,
  };

  const actionCallbacks: Record<string, () => void> = {
    attack: onLightAttack,
    heavy: onHeavyUnleash,
    dodge: onDodge,
    parry: onParry,
  };

  return (
    <div
      className="fixed inset-0 z-30 pointer-events-none"
      style={{ touchAction: 'none' }}
    >
      {/* ── LEFT SIDE: Joystick ─────────────────────────────────────── */}
      <div
        className="absolute bottom-8 left-6 pointer-events-auto"
        style={{ touchAction: 'none' }}
      >
        <VirtualJoystick onMove={onMoveJoystick} onStop={onStopJoystick} />
      </div>

      {/* ── RIGHT SIDE: Skill row (top) + Action cluster (bottom) ────── */}
      <div
        className="absolute bottom-6 right-4 flex flex-col items-end gap-3 pointer-events-auto"
        style={{ touchAction: 'none' }}
      >
        {/* Skill utilities row */}
        <div className="flex items-center gap-2">
          {SKILL_BUTTONS.map((btn) => (
            <ActionButton
              key={btn.id}
              label={btn.label}
              sublabel={btn.sublabel}
              color={btn.color}
              border={btn.border}
              bg={btn.bg}
              size={btn.size}
              onPress={skillCallbacks[btn.id]}
            />
          ))}
        </div>

        {/* Main attack diamond cluster */}
        <div className="relative" style={{ width: 180, height: 160 }}>
          {/* HEAVY — top centre */}
          <div className="absolute" style={{ top: 0, left: '50%', transform: 'translateX(-50%)' }}>
            <ActionButton {...ACTION_BUTTONS[1]} onPress={actionCallbacks['heavy']} />
          </div>
          {/* PARRY — left */}
          <div className="absolute" style={{ top: '50%', left: 0, transform: 'translateY(-50%)' }}>
            <ActionButton {...ACTION_BUTTONS[3]} onPress={actionCallbacks['parry']} />
          </div>
          {/* ATTACK — right (largest) */}
          <div className="absolute" style={{ top: '50%', right: 0, transform: 'translateY(-50%)' }}>
            <ActionButton {...ACTION_BUTTONS[0]} onPress={actionCallbacks['attack']} />
          </div>
          {/* DODGE — bottom centre */}
          <div className="absolute" style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)' }}>
            <ActionButton {...ACTION_BUTTONS[2]} onPress={actionCallbacks['dodge']} />
          </div>
        </div>
      </div>
    </div>
  );
}
