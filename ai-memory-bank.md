# StarGazer - AI Memory Bank

## Current Architecture & State
- **Frontend**: Vanilla HTML/JS/CSS (`web/index.html`, `web/app.js`, `web/style.css`).
  - No heavy frameworks (React/Vue/Tailwind) are used, ensuring maximum performance and customizability via native DOM manipulation.
  - Localization is handled entirely client-side via `translations.js` mapping DOM attributes (`data-i18n`).
- **Backend**: FastAPI Python backend (`api/main.py`) running via Docker.
- **Data Integrations**: 
  - Weather: Open-Meteo & Clear Outside.
  - Ephemeris: Skyfield (calculating local rise/set/alt for planets and moon).
  - Constellations: D3-Celestial.
  - Targets: SIMBAD cross-referencing for deep sky objects.

## Recent Upgrades (June 2026)
### Layout & Grid Refactor
- Replaced the `.unified-scroll-list` horizontal scrolling flexboxes with a responsive **CSS Grid** (`grid-template-columns: repeat(auto-fit, minmax(320px, 1fr))`). Cards now wrap cleanly across the screen.
- Reordered the HTML flow: **Must-See & AI Picks** and **Planets Tonight** are now prioritized directly below current conditions, sitting immediately above the active constellation map.
- Fixed a major clipping bug on the D3-Celestial canvas by removing the hardcoded `height: 200px` on `#ac-map-container` and replacing it with a responsive `aspect-ratio: 1; max-height: 500px`.

### UI Simplification & Ad-Block Mitigation
- **Ad-Block Evasion**: Audited the entire codebase to replace the word "Tracker" with "Radar" or "Monitor" (e.g., Asteroid Radar, ISS Monitor) to prevent aggressive browser extensions (like uBlock Origin) from erroneously blocking application assets via `net::ERR_BLOCKED_BY_CLIENT`.
- **Favicon Resolution**: Added explicit `<link rel="icon">` tags pointing to `assets/ai_stargazer_mascot.png` to fix 404 console errors.
- **Sleek Typography Focus**: Removed the floating astronaut image entirely in favor of a clean, minimalist card header (`<div class="card-header">`) for the AI Picks section. This allows the glassmorphism grid to dominate the UI cleanly without clashing with blocky PNG assets.

## Active Developer Guidelines
1. **Performance**: Stick to pure CSS for layout and animations where possible to keep the DOM light.
2. **Localization**: Never hardcode user-facing strings in `app.js`. Always route through `window.i18n[currentLang]` or inject keys to trigger `.translate-this` listeners.
3. **Responsive Design**: Ensure any new cards conform to the global `.card` padding and grid wrapping behaviors. Avoid fixed heights on dynamic content (like maps or lists).
