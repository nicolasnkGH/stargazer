<div align="center">
  <h1>✨ StarGazer</h1>
  <p><strong>A personal, distraction-free stargazing dashboard for beginners.</strong></p>

  [![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-00a393.svg)](https://fastapi.tiangolo.com)
  [![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-f7df1e.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
  [![Cloudflare Pages](https://img.shields.io/badge/Deployed_on-Cloudflare-f38020.svg)](https://pages.cloudflare.com)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Release](https://img.shields.io/github/v/release/nicolasnkGH/stargazer)](https://github.com/nicolasnkGH/stargazer/releases)
  [![CI](https://img.shields.io/github/actions/workflow/status/nicolasnkGH/stargazer/deploy.yml?label=CI)](https://github.com/nicolasnkGH/stargazer/actions)

  <p>
    <a href="https://stargazer.nick-t.net">View Live Demo</a>
    ·
    <a href="#features">Features</a>
    ·
    <a href="#architecture">Architecture</a>
    ·
    <a href="#local-development">Local Development</a>
  </p>
</div>

---

## 🔭 Why StarGazer?
Getting started with astronomy can be overwhelming. Standard astronomy apps are packed with so much complex data that beginners often don't know where to look.

**StarGazer cuts through the noise.** It is a simple, elegant dashboard that tells you exactly what matters most:
1. Is it a good night to go outside?
2. What are the easiest, brightest targets in the sky right now?
3. Where are the planets and the International Space Station?

---

## ✨ Features

- **🔴 Night Vision Mode**: A built-in toggle that turns the entire UI red to preserve your eyes' dark adaptation while out in the field.
- **🌤 Live Weather & AI Seeing Analysis**: Aggregates cloud cover, wind, rain probability, and astronomical seeing conditions (via Open-Meteo & ClearOutside). Uses a **multi-tiered AI analysis system** (Google Gemini 2.5 Flash + Local Qwen Fallback via ROCm) to evaluate the atmosphere and give a definitive "GO" or "NO GO" rating.
- **🎯 Curated Target Database**: Focuses only on "Must-See" targets (like the Orion Nebula or Andromeda Galaxy) specifically chosen for beginners with small telescopes or binoculars. AI Recommendations include smart badges (Equipment, Distance, Magnitude), contextual Star-Hopping Guides, and **Target Thumbnails** downloaded natively.
- **🔭 Telescope Optics & Eyepiece Guide**: An interactive calculator that instantly computes Magnification, True Field-Of-View (FOV), and Maximum Useful Magnification based on your specific telescope's aperture and focal length, helping you pick the perfect eyepiece for the Moon vs. Planets vs. Deep Sky.
- **🪐 Planet Tracker & Moon Phases**: Live altitude and azimuth coordinates for the naked-eye planets, enriched with live Constellation Tracking, Apparent Magnitude, and precise Distance calculations (including light travel time). Features a **3D interactive Solar System** rendered with Three.js showing the Moon and planets, which you can rotate and zoom.
- **☄️ Asteroid Tracker**: Uses the NASA NeoWs API to display Near-Earth Objects (NEOs) flying by tonight, highlighting any that are potentially hazardous. Includes cached results and fun asteroid facts.
- **🛰 ISS Tracker**: Calculates exactly when the International Space Station will fly over your specific coordinates in the next 10 days.
- **🌌 Interactive Planetarium**: Includes a fullscreen dynamic star map using D3-Celestial. Click on any star to instantly scan it via the professional SIMBAD astronomical database to pull live Spectral and Distance data. Features a **Constellation Explorer** with drag-to-rotate planet cards and an **Interactive FOV Simulator** powered by Aladin Lite (DSS2 imagery) to simulate a realistic field-of-view.
- **🧭 City Search**: Type any city name (e.g. "Tokyo") to automatically geocode your exact latitude, longitude, and profile name via OpenStreetMap Nominatim — no manual GPS entry needed.
- **📋 Pre-Flight Checklist & Observation Log**: A visual pre-observation checklist and a LocalStorage-powered observation log to track what you've seen.
- **🌍 Multi-Language Support**: Fully localized in English, Spanish, and Portuguese with 100% i18n coverage across all tooltips, dropdowns, and dynamic content.
- **🧭 Interactive Product Tour**: A guided onboarding tour using `Driver.js` to help new users navigate the dashboard.

---

## 🏗 Architecture

StarGazer is built with a strictly decoupled architecture, optimizing for speed, simplicity, and low hosting costs.

### 1. Backend API (Python / FastAPI / Local LLMs)
The `api/` directory contains a lightning-fast Python API built on **FastAPI**.
It acts as an engine that calculates ephemerides (using `skyfield`), scrapes seeing conditions, calculates ISS passes, and serves pre-computed target databases.
- **AI Integration**: The backend employs a highly resilient AI pipeline to analyze weather data. It defaults to the **Google Gemini API** for ultra-fast reasoning, but seamlessly falls back to a **local Qwen LLM** running on AMD ROCm (`llama.cpp`) if the cloud API is unavailable. It gracefully degrades to a deterministic math algorithm if all AI services are unreachable.

### 2. Frontend Dashboard (Vanilla JS / HTML / CSS)
The `web/` directory contains a 100% build-free Vanilla JS frontend.
No React, no Webpack, no node_modules. Just pure HTML, CSS, and JS. It is extremely fast, fully responsive, and utilizes modern CSS concepts like glassmorphism. It is strictly optimized for Mobile PageSpeed (90+ score) with asynchronous CSS and deferred JavaScript execution.

---

## 🚀 Local Development

### 1. Run the Backend API
The backend requires Python 3.11+ and several astronomy libraries (`skyfield`, `sgp4`).

```bash
cd api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8181 --reload
```
The API will be available at `http://localhost:8181`. You can view the interactive Swagger documentation at `http://localhost:8181/docs`.

### 2. Run the Frontend
Since the frontend uses pure HTML/JS without any bundler, you can serve it with any standard HTTP server.

```bash
cd web
python3 -m http.server 8000
```
Open `http://localhost:8000` in your browser. The frontend logic (`app.js`) will automatically detect that you are running on `localhost` and route API calls to `http://localhost:8181`.

---

## ☁️ Deployment
This repository is pre-configured for deployment on **Cloudflare**.

- **Frontend**: The `web/` folder can be directly connected to **Cloudflare Pages** for global edge-network hosting.
- **Backend**: The API can be Dockerized or deployed to a VPS. The live version runs behind an Nginx proxy.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
