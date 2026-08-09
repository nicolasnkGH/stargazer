/** Same-origin base for client components that call our own route handlers. */
export const API_BASE = "/api";

/** ISR revalidate windows (seconds) for backend proxy routes — mirrors the legacy app's refresh cadence. */
export const REVALIDATE = {
  tonight: 120,
  planets: 120,
  constellations: 120,
  constellationWindow: 120,
  targets: 120,
  weekly: 600,
  iss: 300,
  asteroids: 300,
  galleryCounts: 120,
  apod: 86400,
  spaceWeather: 10800,
  aurora: 3600,
  bortle: 3600,
  meteors: 3600,
} as const;

/** AI seeing-analysis client polling (SeeingConditions) — mirrors legacy fetchAIAnalysis(). */
export const AI_SEEING_POLL_INTERVAL_MS = 10_000;
export const AI_SEEING_MAX_POLLS = 30; // ~5 minutes

/** API health badge polling (Header). */
export const HEALTH_POLL_INTERVAL_MS = 30_000;

/** Header HUD moon/weather readout polling. */
export const HUD_POLL_INTERVAL_MS = 60_000;
