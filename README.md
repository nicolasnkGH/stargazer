# 🌌 StarGazer v3.0.0 — Next.js 16 Observatory Portal

[![Build Status](https://github.com/nicolasnkGH/stargazer/actions/workflows/pipeline.yml/badge.svg)](https://github.com/nicolasnkGH/stargazer/actions/workflows/pipeline.yml)
[![Version](https://img.shields.io/badge/version-v3.0.0-blue.svg)](https://github.com/nicolasnkGH/stargazer/releases/tag/v3.0.0)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black.svg?logo=next.js)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> A personal, distraction-free stargazing dashboard and astronomy portal powered by Next.js 16, React 19, Skyfield astrometrics, and AI observer briefing.

---

## 🌟 What&#39;s New in v3.0.0 (Next.js 16 Major Release)

**StarGazer v3.0.0** is a major architectural evolution migrating the codebase to **Next.js 16 (App Router)** while restoring 100% 1:1 visual fidelity from the original prototype.

### 🚀 Key v3.0.0 Major Features &amp; Improvements:
- **🪐 3D Solar System Orrery Hero Console:** Integrated 3D Three.js solar system model with D-Pad camera controls, quick planet jump deck, and smooth mouse/touch scroll passthrough.
- **🌌 1:1 Vanilla Visual Fidelity &amp; High-Res Textures:** Restored Bortle scale background texture (`bortle_scale_bg.webp`), glowing green aurora curtain background (`aurora_bg.webp`), and target DSO imagery.
- **🧁 HUD CRT Scanline &amp; Glassmorphic AI Cards:** Restored 1:1 cyan &amp; purple HUD scanline overlay with glowing borders for **Must-See &amp; AI Picks** cards.
- **🔮 3D Planet Spheres with Astronomical Radial Color Glows:** Added planet-specific radial atmospheric glows (Sun, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune) with 360° interactive drag rotation.
- **📊 Optimized Observing Hierarchy:** High-priority placement for Clear Outside Astronomical Weather Chart, Light Pollution Map, NASA APOD, and NOAA Aurora &amp; Space Weather Forecast.
- **🔭 Target Database 1:1 Parity:** 2-column card grid, dynamic constellation tabs, magnitude badges, equipment/Bortle/difficulty tags, and centered purple `Load More Targets 🔭` pagination button (12 targets per chunk).
- **📍 Standalone Responsive Location Bar:** Fixed location pill positioning so `📍 Columbus (40.10°N, 83.08°W)` never collides with logos or menus on mobile.

---

## ✨ Features

### 🌌 Astronomical Engines &amp; Live Sky Tracking
* **🔭 Target Database:** Browse 200+ deep-sky objects with dynamic magnitude filters, equipment compatibility (Seestar, DSLR, Binoculars, Telescope), and constellation tabs.
* **🪐 Planets Tonight:** Real-time 3D planetary positions, altitude/azimuth telemetry, distance, light travel time, and visual magnitude.
* **🌙 3D Moon Phase Widget:** Photorealistic 3D moon rendering with phase-driven sun lighting, illumination percentage, and lunar observation facts.
* **✨ Constellations Tonight:** Interactive 88-constellation sky viewer with live altitude progress bars, status badges (`🟢 High in sky`), and direction telemetry.
* **✨ Interactive Celestial Sky Map:** D3/Celestial sky map with `✨ Click to interact` scroll protection overlay and SIMBAD TAP object lookup.
* **🌤️ Clear Outside &amp; Seeing Forecast:** Real-time atmospheric transparency, seeing score, dew risk alerts, and Clear Outside weather charts.
* **📅 7-Day Observing Outlook:** Weekly stargazing forecast with optimal sky window badges (`🌟 Excellent`, `🟢 Good`, `🟡 Fair`, `🔴 Poor`).
* **☄️ Objects in Motion:** Track visible ISS passes, active meteor showers, comets, and NASA Near-Earth Objects (NEOs).
* **🌌 NASA APOD:** Daily Astronomy Picture of the Day with high-resolution fallback.

### 📱 Premium UX &amp; Design
* **🔴 Night Vision Mode:** One-click toggle tinting the entire UI dark red to preserve your eyes&#39; rhodopsin dark adaptation.
* **📱 Responsive Layout:** Optimized grid layouts dynamically scaled for mobile, tablet, and desktop viewports.
* **📱 Progressive Web App (PWA):** Serwist PWA service worker with offline caching.
* **🌍 100% Internationalized:** Localized in English, Spanish, and Portuguese via `next-intl`.

---

## 🏗️ Architecture

```mermaid
graph TD
    User([User Browser]) -->|HTTPS / PWA| NX[Next.js 16 — Frontend + API Routes]
    NX -->|Server-side proxy| CR[Google Cloud Run - Backend API]
    CR -->|Astrometrics| SF[(Skyfield Engine)]
    CR -->|Weather Forecast| OM[Open-Meteo API]
    CR -->|Star Scanning| SB[SIMBAD TAP Database]
    CR -.->|AI Seeing Report optional| GM[Gemini / LLM API]
    CR -->|Asteroids| NS[NASA NeoWs API]
```

### 1. Frontend (`nextjs-app/`)
* Built with **Next.js 16** (App Router), **React 19**, **TypeScript**, **Three.js**, and **Tailwind CSS 4**.
* Next.js route handlers (`src/app/api/*/route.ts`) proxy to the Python backend.
* PWA support via **Serwist**.

### 2. Backend (`api/`)
* **FastAPI** Python service with Skyfield astronomical calculations.
* Deploys on **Google Cloud Run**.

---

## 🛠️ Local Development

### 1. Run full stack with Docker Compose
```bash
docker compose up --build
```

Opens at `http://localhost:3000` (Next.js frontend) and `http://localhost:8181` (Python API).

---


---

## 🔄 Emergency Rollback Procedure

If issues ever occur in production, **StarGazer** includes an automated enterprise rollback mechanism built into the GitHub Actions pipeline:

### How to Trigger an Emergency Rollback:
1. Go to **GitHub Actions** $\rightarrow$ **Stargazer Enterprise Pipeline**.
2. Click **Run workflow**.
3. Select **Operation to run**: `rollback`.
4. Enter **Tag to rollback to**: e.g., `v2.9.34` (or any known-good tag).
5. Enter **Rollback reason**: (e.g. *Rolling back to v2.9.34 due to production incident*).
6. Click **Run workflow**.

### What Happens Automatically:
- The pipeline verifies the release tag and checks out the known-good release state.
- Creates a dedicated branch (`rollback-YYYYMMDD-v2.9.34`) and automatically opens a **Rollback PR**.
- Merging the PR resets `main` to the target tag and triggers a clean re-deployment to Google Cloud Run with automated health check verification.


## 📄 License
Distributed under the MIT License. See [LICENSE](LICENSE) for details.
