/** Loosely typed — these come from CDN-loaded legacy globals (d3 v3 + d3-celestial), not an npm import. */
export interface CelestialGlobal {
  display: (config: Record<string, unknown>) => void;
  add: (layer: Record<string, unknown>) => void;
  redraw: () => void;
  mapProjection: ((coords: [number, number]) => [number, number] | null) & {
    rotate: (angles?: [number, number, number]) => [number, number, number];
    invert: (point: [number, number]) => [number, number] | null;
  };
  container: unknown;
}

export interface ConstellationWindow {
  rise_time: string;
  set_time: string;
  culmination_time: string;
  culmination_altitude_deg: number;
  current_altitude_deg: number;
  current_azimuth_deg: number;
  current_direction: string;
  status: string;
  name: string;
  abbr: string;
  emoji: string;
  best_time: string;
  ra_hours: number;
  dec_degrees: number;
}

export interface MapTarget {
  name: string;
  type: string;
  magnitude?: number;
  difficulty?: string;
  description?: string;
  ra_hours: number;
  dec_degrees: number;
  altitude_deg: number;
  azimuth_deg: number;
  direction: string;
  visible: boolean;
}

export interface StarLookup {
  name: string;
  spectral_type: string;
  distance_ly: string;
}

declare global {
  interface Window {
    /** CDN-loaded d3 v3, only used inside CelestialMap.tsx to drive the legacy Celestial API — kept as `any` on purpose, it's an untyped global, not a real dependency. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    d3?: any;
    Celestial?: CelestialGlobal;
  }
}
