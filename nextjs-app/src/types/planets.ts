export interface PlanetData {
  name: string;
  altitude_deg: number;
  azimuth_deg: number;
  direction: string;
  distance_au: number;
  distance_mkm: number;
  light_time_minutes: number;
  constellation: string;
  visible_tonight: boolean;
  magnitude_approx: string | number;
  naked_eye: boolean;
  emoji: string;
  obs_time: string;
  rise_time: string;
  set_time: string;
  how_to_find: string;
}

export interface PlanetsResponse {
  planets: PlanetData[];
}
