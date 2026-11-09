# Kaliyuga: The Bleeding Crown — Mobile Edition (`kalmobile`)

**Kaliyuga: The Bleeding Crown** is a fast-paced 2.5D isometric Vedic dark-mythology action roguelike optimized specifically for mobile touch devices.

---

## Mobile Features & Controls

* **Virtual Analog Joystick (Bottom-Left)**:
  * Dynamic touch tracking with smooth deadzone handling (`0.12`) and normalized directional vectors.
  * Auto-aims Rudra in the direction of movement.
* **Action Diamond Combat Cluster (Bottom-Right)**:
  * **Strike (⚔ ATTACK)**: Primary light combo attack with intelligent auto-targeting toward the nearest enemy within range.
  * **Heavy (💥 HEAVY)**: Charged stance heavy unleash utilizing accumulated Tapas focus diamonds.
  * **Dodge (🌀 DODGE)**: Instant evasive dash with invulnerability frames.
  * **Parry (🛡 PARRY)**: Rock-solid deflect window for high-damage Vajra counter-cleaves.
* **Utility Hotbar (Above Action Cluster)**:
  * **Kalasha (🍶 HEAL)**: Restore vitality from sacred healing gourd charges.
  * **Rudra Tandava (🔥 RUDRA)**: Unleash divine rage mode.
  * **Mirage (👁 MIRAGE)**: Deploy Maya decoy clones to divert demonic aggro.
  * **Stance (⚡ STANCE)**: Switch active combat stances on the fly (Gada / Khadga / Parashu).
* **Viewport & PWA Optimizations**:
  * Edge-to-edge landscape cover viewport (`viewport-fit=cover`) with dynamic island / notch safe area support.
  * Zero-drag canvas: eliminates pinch-zoom, pull-to-refresh, and unwanted text selection.
  * Progressive Web App manifest enabled (`/manifest.json`).

---

## Tech Stack
* **Framework**: Next.js 15 (App Router)
* **Graphics**: Canvas 2D + Three.js offscreen renderer for 3D character & boss animation
* **Language**: TypeScript
* **Styling**: Tailwind CSS

---

## Development & Build

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Production build
bun run build
```
