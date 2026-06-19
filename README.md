<div align="center">
  <h1>✨ StarGazer</h1>
  <p><strong>A personal, distraction-free stargazing dashboard for beginners.</strong></p>

  [![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-00a393.svg)](https://fastapi.tiangolo.com)
  [![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-f7df1e.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
  [![Cloudflare Pages](https://img.shields.io/badge/Deployed_on-Cloudflare-f38020.svg)](https://pages.cloudflare.com)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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
- **🌤 Live Weather & Seeing**: Aggregates cloud cover, wind, rain probability, and astronomical seeing conditions (via Open-Meteo & ClearOutside) to give a definitive "GO" or "NO GO" rating for the night.
- **🎯 Curated Target Database**: Focuses only on "Must-See" targets (like the Orion Nebula or Andromeda Galaxy) specifically chosen for beginners with small telescopes or binoculars.
- **🪐 Planet Tracker & Moon Phases**: Live altitude and azimuth coordinates for the naked-eye planets.
- **🛰 ISS Tracker**: Calculates exactly when the International Space Station will fly over your specific coordinates in the next 10 days.
- **🌍 Multi-Language Support**: Fully localized in English, Spanish, and Portuguese.
- **🧭 Interactive Product Tour**: A guided onboarding tour using `Driver.js` to help new users navigate the dashboard.

---

## 🏗 Architecture

StarGazer is built with a strictly decoupled architecture, optimizing for speed, simplicity, and low hosting costs.

### 1. Backend API (Python / FastAPI)
The `api/` directory contains a lightning-fast Python API built on **FastAPI**.
It acts as an engine that calculates ephemerides (using `skyfield`), scrapes seeing conditions, calculates ISS passes, and serves pre-computed target databases.

### 2. Frontend Dashboard (Vanilla JS / HTML / CSS)
The `web/` directory contains a 100% build-free Vanilla JS frontend.
No React, no Webpack, no node_modules. Just pure HTML, CSS, and JS. It is extremely fast, fully responsive, and utilizes modern CSS concepts like glassmorphism.

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
