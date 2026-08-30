import type { LogEntry } from "@/types";

export const OBSERVATION_LOG_STORAGE_KEY = "stargazer_observation_log";

export const DEFAULT_ENTRIES: LogEntry[] = [
  { id: "1", date: "2026-06-20", target: "Antares (Alpha Sco)", notes: "Clear skies, excellent seeing. Scorpius well positioned.", conditions: "Excellent", equipment: "Telescope (130mm)" },
  { id: "2", date: "2026-06-18", target: "M8 - Lagoon Nebula", notes: "Sagittarius rising late. Some thin cirrus at dawn.", conditions: "Good", equipment: "Telescope (130mm) + Camera" },
  { id: "3", date: "2026-06-15", target: "Jupiter", notes: "Great Red Spot visible. Four Galilean moons aligned.", conditions: "Excellent", equipment: "Telescope (130mm)" },
];
