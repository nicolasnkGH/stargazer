export interface ConstellationData {
  name: string;
  abbr: string;
  emoji: string;
  altitude_deg: number;
  azimuth_deg: number;
  direction: string;
  visible: boolean;
  rising?: boolean;
  setting?: boolean;
}

export interface ConstellationsResponse {
  constellations: ConstellationData[];
}
