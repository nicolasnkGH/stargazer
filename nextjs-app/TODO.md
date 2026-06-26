# StarGazer Next.js Migration — Status & TODO

## Overview

This directory contains a Next.js 14+ rewrite of the original StarGazer dashboard
([web/index.html](../web/index.html)), which is a vanilla JS + CSS single-page app
powered by a Python/FastAPI backend ([api/main.py](../api/main.py)).

**Goal:** Feature-complete, production-ready Next.js app that replicates every section
of the original HTML app, with the same data, styling, and interactivity.

---

## Current State (as of 2026-06-26)

### Completed Components (13/13)

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Header | `src/components/Header.tsx` | ✅ Done | Logo, clock, moon HUD, unit toggle, language selector, nav dropdown, about modal |
| GoNoGoBanner | `src/components/GoNoGoBanner.tsx` | ✅ Done | Fetches `/gonogo`, shows GO/NOMIN/NO with color coding |
| TonightOutlook | `src/components/TonightOutlook.tsx` | ✅ Done | Seeing conditions, moon card, moon 3D canvas, preflight checklist, must-see, telescope info, dusk/dawn window |
| ActiveConstellation | `src/components/ActiveConstellation.tsx` | ✅ Done | Constellation selector, SIMBAD star lookup, D3 star map, target details panel |
| ConstellationsTonight | `src/components/ConstellationsTonight.tsx` | ✅ Done | Fetches `/constellations-tonight`, shows rise/set/altitude/score |
| TargetDatabase | `src/components/TargetDatabase.tsx` | ✅ Done | Constellation tabs, filter buttons, target grid with magnitude/type icons |
| SkyMotion | `src/components/SkyMotion.tsx` | ✅ Done | ISS passes, NEOs, comets panels with tab switching |
| WeeklyForecast | `src/components/WeeklyForecast.tsx` | ✅ Done | 7-day forecast grid from `/weekly` |
| PlanetGrid | `src/components/PlanetGrid.tsx` | ✅ Done | Planet cards with rise/set/altitude/magnitude |
| ClearOutsideEmbed | `src/components/ClearOutsideEmbed.tsx` | ✅ Done | Embeds clearoutside.com forecast image |
| ObservationLog | `src/components/ObservationLog.tsx` | ✅ Done | LocalStorage-based observation notes textarea |
| Resources | `src/components/Resources.tsx` | ✅ Done | External resource links grid |
| Footer | `src/components/Footer.tsx` | ✅ Done | Creator info, tech stack badges, navigation links |

### Page Layout
- `src/app/page.tsx` — renders all components in order
- `src/app/layout.tsx` — root layout with Inter + Space Grotesk fonts, dark theme
- `src/app/globals.css` — Tailwind base + custom scrollbar styling

---

## What's Missing / Needs Work

### 1. API Routes (CRITICAL)

The Next.js app currently calls the Python backend directly via `NEXT_PUBLIC_API_BASE`.
For a proper Next.js deployment, API routes should proxy or replace these calls.

**Missing API routes:**
- `[ ]` `/api/tonight` — Tonight's observing report (currently hits Python `/tonight`)
- `[ ]` `/api/gonogo` — Go/No-Go status (currently hits Python `/gonogo`)
- `[ ]` `/api/constellations-tonight` — Constellation visibility data
- `[ ]` `/api/weekly` — 7-day weather forecast
- `[ ]` `/api/planets` — Planet positions
- `[ ]` `/api/iss-passes` — ISS pass predictions
- `[ ]` `/api/neo` — Near-Earth Objects data
- `[ ]` `/api/simbad` — SIMBAD star database lookup
- `[ ]` `/api/active-constellation` — Active constellation data

**Options:**
1. **Proxy approach (easiest):** Create Next.js API routes that forward to the Python backend
2. **Full migration (best long-term):** Move all Skyfield calculations into Next.js server functions
3. **Hybrid:** Keep Python as a separate service, use Next.js middleware for auth/proxy

### 2. Three.js 3D Widgets

The original app uses Three.js for:
- **Moon 3D widget** (`moon3d.js`) — rotatable moon model
- **Planet 3D widget** (`planets3d.js`) — solar system overview

The Next.js migration has a **canvas-based Moon 3D** in `TonightOutlook.tsx` (simpler, no Three.js dependency), but:
- `[ ]` Planet 3D solar system view is NOT implemented
- `[ ]` Original moon 3D has orbit controls (drag to rotate, scroll to zoom) — the canvas version is static

**Decision needed:** Keep the lightweight canvas approach, or add Three.js back for full interactivity?

### 3. Gravity Well Hero Section

The original app has a WebGL gravity well animation (`gravity-well.js`) that serves as the hero background.
- `[ ]` Gravity well WebGL canvas is NOT implemented in Next.js
- `[ ]` Hero section with stats (dark-in time, Bortle scale) is NOT present

This is a visual-only feature. Decide if it's worth porting the Three.js WebGL shader.

### 4. D3 Celestial Star Map

The ActiveConstellation component has a placeholder for the interactive D3 star map:
- `[ ]` D3 + d3-celestial integration for the interactive star map is NOT implemented
- `[ ]` Currently shows a styled placeholder div instead of actual star positions

This requires Three.js or D3 dependencies. The SIMBAD star lookup works fine.

### 5. Aladin Lite FOV Simulator

When clicking a star in the constellation map, the original app opens an Aladin Lite
field-of-view simulator modal:
- `[ ]` Aladin Lite embed is NOT implemented
- `[ ]` Star click handler opens a placeholder modal instead

### 6. ISS / Moon / Comet Fun Facts

The original app has rotating fun facts with dot navigation:
- `[ ]` ISS fun facts carousel is NOT implemented
- `[ ]` Moon fact carousel is NOT implemented
- `[ ]` Comet fun facts carousel is NOT implemented

These are small JS arrays with auto-rotation. Easy to add.

### 7. Driver.js Onboarding Tour

The original app has a guided tour using driver.js:
- `[ ]` Onboarding tour is NOT implemented

### 8. Night Vision Mode

The original app has a red-light night mode toggle:
- `[ ]` Night vision mode (red overlay) is NOT implemented

### 9. Location Management

The original app supports multiple observatory locations with GPS search:
- `[ ]` Location modal with city search is NOT implemented
- `[ ]` Multiple location profiles (localStorage) are NOT implemented
- `[ ]` GPS coordinate detection is NOT implemented

### 10. i18n / Internationalization

The original app supports EN/ES/PT translations:
- `[ ]` Language switching is NOT implemented
- `[ ]` Translation system is NOT implemented

### 11. Star Info Modal

Clicking stars in the constellation map shows detailed SIMBAD data in a modal:
- `[ ]` Star info modal with SIMBAD data display is NOT fully implemented
  (the SIMBAD fetch works, but the modal UI is a placeholder)

### 12. About Modal

- `[ ]` About modal exists in Header but may need content polish

### 13. Open Graph / SEO Meta Tags

- `[ ]` OG image reference (`og-preview.png`) is NOT present
- `[ ]` Twitter card meta tags need to be added to layout
- `[ ]` Favicon from `assets/ai_stargazer_mascot.png` needs to be added

### 14. External Dependencies

The original app loads these CDN scripts that have no Next.js equivalent:
- `[ ]` Three.js r128 (moon 3D, gravity well, planets 3D)
- `[ ]` d3.v3 + d3.geo.projection + d3-celestial (star map)
- `[ ]` Aladin Lite (FOV simulator)
- `[ ]` GSAP 3.12 (animations)
- `[ ]` driver.js (onboarding tour)
- `[ ]` jQuery (Aladin Lite dependency)

### 15. CSS / Styling Parity

- `[ ]` Starfield canvas background animation is NOT implemented
- `[ ]` Some micro-animations (pulse dots, shimmer loading) may differ
- `[ ]` Custom scrollbar styling exists but verify cross-browser consistency

---

## Priority Roadmap

### Phase 1: Make it work (data flow)
1. Set up API routes or proxy config so the app works without the Python backend
2. Add ISS/Moon/Comet fun facts carousels (small win)
3. Fix footer navigation anchors to use hash links that work in Next.js

### Phase 2: Visual parity
4. Add gravity well hero section (Three.js)
5. Add D3 celestial star map
6. Add night vision mode toggle
7. Polish CSS animations and loading states

### Phase 3: Features
8. Location management system
9. i18n support
10. Aladin Lite FOV simulator
11. Driver.js onboarding tour
12. Star info modal polish

### Phase 4: Production
13. OG images and SEO meta
14. Performance optimization (lazy loading, code splitting)
15. Deployment configuration (Docker, Vercel, etc.)
16. Error boundaries and loading skeletons everywhere

---

## Quick Start

```bash
cd nextjs-app
npm install
npm run dev
# Opens at http://localhost:3001 (3000 may be in use)
```

Set `NEXT_PUBLIC_API_BASE=http://localhost:8000` in `.env.local` to point at the Python backend.

---

## Known Issues

1. **Port 3000 conflict** — A previous dev server may still be running. Kill it with `kill 67987` or check `lsof -i :3000`.
2. **API base URL** — Components use `process.env.NEXT_PUBLIC_API_BASE || "/api"`. Without a Python backend running, all data fetches will fail.
3. **No TypeScript errors yet** — Run `npm run build` to verify type checking.
