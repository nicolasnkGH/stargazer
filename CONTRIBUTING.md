# Contributing to StarGazer 🔭

First off, thank you for considering contributing to StarGazer! It's people like you that make the open-source community such an incredible place to learn, inspire, and create.

StarGazer is a personal, distraction-free stargazing dashboard and interactive astronomical portal for amateur astronomers and skywatchers.

---

## 🤝 Code of Conduct
By participating in this project, you agree to abide by our Code of Conduct. Be respectful, be kind, and help us foster a welcoming environment for everyone.

---

## 🚀 How to Contribute

### 1. Find an Issue
Check the **Issues** tab. We specifically tag issues with **`good first issue`** or **`help wanted`** labels.
If you have a new feature idea or bug report, please open an Issue to discuss it before submitting code!

### 2. Fork and Clone
```bash
git clone https://github.com/YOUR-USERNAME/stargazer.git
cd stargazer
```

---

## 🛠️ Local Development Setup (v3.x.x)

StarGazer v3.x.x consists of a **Next.js 16 / React 19 / TypeScript** frontend (`nextjs-app/`) and a **Python FastAPI / Skyfield** backend engine (`api/`).

### Step 1: Start the Backend Service (FastAPI)
```bash
cd api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8181 --reload
```
*The backend runs on `http://localhost:8181`.*

### Step 2: Start the Frontend Application (Next.js)
In a second terminal window:
```bash
cd nextjs-app
npm install
npm run dev
```
*Open `http://localhost:3000` in your browser. The Next.js frontend will proxy API requests to your local backend on port 8181.*

*Tip: You can also start both services simultaneously from the project root using `npm run dev:all`.*

---

## 🎨 Architecture & Technical Guidelines

### 1. Frontend (`nextjs-app/`)
- **Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, TailwindCSS v4, Three.js / React Three Fiber / `@react-three/drei`.
- **3D Solar System Orrery:** Built with Three.js custom procedural shaders and OrbitControls. Mobile interaction supports `touchMode` scrolling toggle (`"scroll"` vs `"orbit"`).
- **Telescope Eyepiece & Sky Simulator:** Aladin Lite survey integration with custom high-magnification optical eyepiece aperture ring and atmospheric seeing shimmer simulation.

### 2. Backend (`api/`)
- **Tech Stack:** FastAPI, Skyfield astronomical engine, JPL DE421 ephemeris, Open-Meteo, 7Timer!, NOAA SWPC.

---

## 🌍 Mandatory Internationalization (i18n)

StarGazer fully supports multi-language localization (**English (`en`)**, **Portuguese (`pt`)**, and **Spanish (`es`)**) via `next-intl`.

> [!IMPORTANT]
> **CI/CD Translation Checks**:
> - Any new user-facing UI text **MUST** be added to all three translation message files:
>   - `nextjs-app/messages/en.json`
>   - `nextjs-app/messages/pt.json`
>   - `nextjs-app/messages/es.json`
> - Run the translation validation script before committing:
>   ```bash
>   cd nextjs-app && npm run check:i18n
>   ```
> - The GitHub Actions CI/CD pipeline runs `npm run check:i18n` on every Pull Request and will fail if any key is missing across supported languages.

---

## 📦 Versioning & CI/CD Release Policy

- Release versions (`v3.x.x`) are automatically derived and tagged by the automated GitHub Actions CI/CD release workflow upon merging into `main`.
- **Do not manually increment** the `"version"` field in `package.json` inside feature PRs.
- The dynamic version badge in the footer automatically references `process.env.NEXT_PUBLIC_APP_VERSION` or latest GitHub release tags.

---

## ✅ Pre-PR Checklist

Before opening a Pull Request:
1. Run TypeScript type checks: `cd nextjs-app && npx tsc --noEmit`
2. Run ESLint checks: `cd nextjs-app && npm run lint`
3. Validate i18n translation key sync: `cd nextjs-app && npm run check:i18n`
4. Test production build: `cd nextjs-app && npm run build`

Happy stargazing and coding! 🌌
