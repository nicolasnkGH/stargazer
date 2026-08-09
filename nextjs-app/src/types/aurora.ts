export interface AuroraForecast {
  kp: number;
  probability: string;
  color: string;
  message: string;
  error?: string;
}

export interface SpaceWeatherEvent {
  type: string;
  time: string;
  note: string;
}

export interface SpaceWeatherReport {
  events: SpaceWeatherEvent[];
  period_days: number;
}
