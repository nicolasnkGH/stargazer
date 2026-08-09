export interface SeeingData {
  seeing_score: number;
  seeing_score_raw: number;
  seeing_label: string;
  seeing_explanation: string;
  best_window: string;
  warnings: string[];
  go_nogo: string;
  tonight_cloud_pct?: number;
  tonight_wind_kmh?: number;
  tonight_precip_prob?: number;
  tonight_humidity?: number;
  tonight_dew_spread?: number;
  tonight_visibility_km?: number;
  tonight_temp_c?: number;
  ai_powered: boolean;
  moon_fact?: string;
  hourly_clouds?: number[];
}

export interface TwilightTimeline {
  sunset: string | null;
  astro_start: string | null;
  astro_end: string | null;
  sunrise: string | null;
}

export type AiSeeingResponse = SeeingData | { status: "processing" };

export interface MoonData {
  phase_name: string;
  illumination_pct: number;
  emoji?: string;
  altitude_deg?: number;
  azimuth_deg?: number;
  direction?: string;
  moonrise?: string;
  moonset?: string;
  dso_impact?: string;
}

export interface MustSeeTarget {
  title: string;
  subtitle: string;
  icon: string;
  metadata: string;
}

export interface TonightReport {
  seeing: SeeingData;
  moon: MoonData;
  best_targets_tonight: MustSeeTarget[];
  must_see: MustSeeTarget[];
  twilight_timeline?: TwilightTimeline;
}
