export interface WeekDay {
  date: string;
  moon_phase: string;
  moon_illumination: number;
  weather: string;
  cloud_pct: number;
  temp_c: number;
  highlights: string[];
  rating: string;
}

export interface WeeklyReport {
  week_start: string;
  days: WeekDay[];
  best_nights: Array<{ date: string; reason: string }>;
}
