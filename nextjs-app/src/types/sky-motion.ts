export interface IssPass {
  rise: string;
  set: string;
  peak_alt: number;
  peak_az: string;
  visible: boolean;
}

export interface NeoObject {
  name: string;
  diameter_m: number;
  closest_approach_au: number;
  velocity_kms: number;
  hazardous: boolean;
  date: string;
}

export interface CometData {
  name: string;
  magnitude: number;
  constellation: string;
  visible: boolean;
  perihelion_date: string;
  description: string;
}
