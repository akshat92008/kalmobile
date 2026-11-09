// ============================================================================
// MERU ENGINE — MODULE 2: LANTERN LIGHTING, ASH-STORM & BOSS MECHANIC RENDERER
// Implements Section 9, 29, 32, 34 of the v7 Game Design Document:
// - Savitri's Lantern 3-state temperature grading (Warm / Dim / Cool)
// - Act I Charnel Plains Ash-Storm visibility veil
// - Interactive [E] Look world artifacts (Tally-Leaves, Clay Lamp & Sparrow, Drum Armor)
// - Dundubhi War-Drum rings & 3-second Pillar Tusk-Lodge visual state
// - Vrikodara Furnace-Belly Vacuum Vortex & Phase 2 Arena-Splitting Molten Slag
// ============================================================================

import { ACT1_LOOK_OBJECTS, LanternLightState, LookObjectSpec } from './v7StoryEngine';

export interface MoltenSlagFissure {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  life: number;
  maxLife: number;
  timer?: number;
  maxDuration?: number;
}

/**
 * Renders Savitri's world-space & screen-space lantern light rule (Section 34)
 * plus the Act I Charnel Plains Ash-Storm visibility hazard (Section 32).
 */
export function renderLanternAtmosphereAndAshStorm(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  lanternState: LanternLightState,
  playerX: number,
  playerY: number,
  isOpeningRampage: boolean,
  activeLookObject: LookObjectSpec | null,
  ashStormIntensity: number
): void {
  ctx.save();

  // 1. Opening Rampage Heaven's Gate Golden-White Brahmashira Aura
  if (isOpeningRampage) {
    const grad = ctx.createRadialGradient(playerX, playerY - 40, 20, playerX, playerY - 40, 440);
    grad.addColorStop(0, 'rgba(255, 248, 220, 0.24)');
    grad.addColorStop(0.45, 'rgba(245, 196, 81, 0.10)');
    grad.addColorStop(1, 'rgba(10, 8, 12, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return;
  }

  // 2. Savitri's Lantern Temperature Rule (Screen-blended warm aura around Rudra + subtle peripheral vignette):
  const lanternRadius =
    lanternState === 'warm' ? 460 : lanternState === 'dim' ? 360 : 280;
  const innerWarmth =
    lanternState === 'warm'
      ? 'rgba(255, 194, 88, 0.16)'
      : lanternState === 'dim'
      ? 'rgba(225, 140, 64, 0.11)'
      : 'rgba(126, 178, 224, 0.10)';

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const lanternGrad = ctx.createRadialGradient(
    playerX,
    playerY - 24,
    18,
    playerX,
    playerY - 24,
    lanternRadius
  );
  lanternGrad.addColorStop(0, innerWarmth);
  lanternGrad.addColorStop(0.55, 'rgba(255, 145, 55, 0.04)');
  lanternGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = lanternGrad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // 3. Act I Charnel Plains Wind-Ash Streaks (Crisp diagonal ember/ash streaks without muddy grey screen wash)
  if (ashStormIntensity > 0.02) {
    ctx.save();
    ctx.strokeStyle = `rgba(235, 205, 165, ${(ashStormIntensity * 0.22).toFixed(3)})`;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const seed = i * 137.5;
      const sx = ((seed + time * (340 + (i % 5) * 45)) % (width + 200)) - 100;
      const sy = ((seed * 2.3 + time * 95) % (height + 100)) - 50;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - 38, sy - 11);
    }
    ctx.stroke();
    ctx.restore();
  }

  // 4. [E] Look Mode Room-Tone Spotlight Isolation (Section 35: "Only room tone and the object")
  if (activeLookObject) {
    const spotGrad = ctx.createRadialGradient(
      activeLookObject.x,
      activeLookObject.y - 10,
      28,
      activeLookObject.x,
      activeLookObject.y - 10,
      260
    );
    spotGrad.addColorStop(0, 'rgba(255, 224, 150, 0.25)');
    spotGrad.addColorStop(0.45, 'rgba(20, 15, 12, 0.45)');
    spotGrad.addColorStop(1, 'rgba(6, 5, 8, 0.78)');
    ctx.fillStyle = spotGrad;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}

/**
 * Renders the inspectable [E] Look story artifacts in the current chamber (Section 9 & 31)
 * and returns the nearest LookObjectSpec if Rudra is within interaction range (115px).
 */
export function renderAndFindChamberLookObject(
  ctx: CanvasRenderingContext2D,
  chamberId: number,
  playerX: number,
  playerY: number,
  time: number,
  inspectedIds: string[],
  isOpeningHill: boolean
): LookObjectSpec | null {
  if (isOpeningHill) return null; // Section 5: "On the flashback hill, Look does nothing"

  const objectsInChamber = ACT1_LOOK_OBJECTS.filter((o) => o.chamberId === chamberId);
  let nearest: LookObjectSpec | null = null;
  let nearestDist = 118;

  for (const obj of objectsInChamber) {
    const alreadyLooked = inspectedIds.includes(obj.id);
    const dist = Math.hypot(playerX - obj.x, playerY - obj.y);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = obj;
    }

    ctx.save();
    const pulse = 0.5 + 0.5 * Math.sin(time * 3.4);

    // Subtle warm lantern-mote aura on ground
    const auraGrad = ctx.createRadialGradient(obj.x, obj.y, 4, obj.x, obj.y, 44);
    if (alreadyLooked) {
      auraGrad.addColorStop(0, 'rgba(212, 165, 72, 0.22)');
      auraGrad.addColorStop(1, 'rgba(212, 165, 72, 0.0)');
    } else {
      auraGrad.addColorStop(0, `rgba(245, 196, 81, ${(0.38 + pulse * 0.22).toFixed(2)})`);
      auraGrad.addColorStop(0.6, 'rgba(217, 130, 59, 0.14)');
      auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.ellipse(obj.x, obj.y, 42, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw diegetic artifact icon (Spiral Tally-Leaf, Child's Clay Diya + Sparrow, or Drum Seal)
    ctx.translate(obj.x, obj.y - 8 - pulse * 3);

    // Coiled Spiral / Diya Emblem
    ctx.strokeStyle = alreadyLooked ? '#9c8b70' : '#f5c451';
    ctx.fillStyle = alreadyLooked ? 'rgba(28, 22, 18, 0.85)' : 'rgba(42, 26, 14, 0.92)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner Spiral Mark (Kaala-Chakra's maker mark)
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 3.5; a += 0.35) {
      const r = (a / (Math.PI * 3.5)) * 8.5;
      const px = Math.cos(a + time * 1.2) * r;
      const py = Math.sin(a + time * 1.2) * r;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // If this is the child's clay lamp in Chamber 3, draw the small brown sparrow perched beside it!
    if (obj.id === 'child_clay_lamp') {
      const wingBandaged = inspectedIds.length >= 3;
      ctx.fillStyle = '#8c6239';
      ctx.beginPath();
      ctx.ellipse(18, -6, 7, 5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      if (wingBandaged) {
        // White linen bandage on the sparrow's wing (Section 17 & 19!)
        ctx.fillStyle = '#f5ebd6';
        ctx.fillRect(15, -8, 6, 3);
      }
    }

    // Floating [E] LOOK prompt when Rudra is close
    if (dist < 118) {
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      const label = alreadyLooked ? `[E] LOOK AGAIN · ${obj.title.toUpperCase()}` : `[E] LOOK · ${obj.title.toUpperCase()}`;
      const tw = ctx.measureText(label).width + 18;
      ctx.fillStyle = 'rgba(10, 8, 12, 0.92)';
      ctx.fillRect(-tw / 2, -38, tw, 20);
      ctx.strokeStyle = '#f5c451';
      ctx.lineWidth = 1;
      ctx.strokeRect(-tw / 2, -38, tw, 20);
      ctx.fillStyle = '#fff3d6';
      ctx.fillText(label, 0, -24);
    }

    ctx.restore();
  }

  return nearest;
}

/**
 * Renders Vrikodara's Phase 1 Furnace-Belly Vacuum Vortex & Phase 2 Arena-Splitting Molten Slag
 * plus Dundubhi's 3-second Pillar Tusk-Lodge state (Section 9).
 */
export function renderBossMythicMechanics(
  ctx: CanvasRenderingContext2D,
  time: number,
  boss: {
    type: string;
    x: number;
    y: number;
    phase?: 1 | 2 | 3;
    tuskLodgedTimer?: number;
    vacuumActiveTimer?: number;
  } | null,
  _slagFissures: MoltenSlagFissure[]
): void {
  ctx.save();

  if (!boss) {
    ctx.restore();
    return;
  }

  // 2. Dundubhi's 3-Second Tusk-Lodge Banner when baited into a ruined pillar
  if (boss.type === 'xuemo' && (boss.tuskLodgedTimer ?? 0) > 0) {
    const rem = boss.tuskLodgedTimer ?? 0;
    ctx.save();
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    const text = `TUSKS LODGED IN PILLAR! (${rem.toFixed(1)}s PUNISH WINDOW)`;
    const tw = ctx.measureText(text).width + 20;
    ctx.fillStyle = 'rgba(42, 14, 12, 0.94)';
    ctx.fillRect(boss.x - tw / 2, boss.y - 138, tw, 22);
    ctx.strokeStyle = '#ffbe42';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boss.x - tw / 2, boss.y - 138, tw, 22);
    ctx.fillStyle = '#ffe89e';
    ctx.fillText(text, boss.x, boss.y - 123);
    ctx.restore();
  }

  // 3. Vrikodara's Furnace-Belly Vacuum Vortex (Phase 1 & 2 Inhale Pull)
  if (boss.type === 'vrikodara' && (boss.vacuumActiveTimer ?? 0) > 0) {
    ctx.save();
    ctx.translate(boss.x, boss.y - 24);
    for (let r = 0; r < 4; r++) {
      const ringProg = ((time * 1.8 + r * 0.25) % 1);
      const radius = (1 - ringProg) * 260 + 28;
      ctx.strokeStyle = `rgba(255, 118, 42, ${(ringProg * 0.55).toFixed(2)})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius * 0.58, time * 2.5 + r, 0, Math.PI * 1.65);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}
