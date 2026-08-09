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

export interface MeteorShower {
  name: string;
  code: string;
  peak_date: string;
  days_until_peak: number;
  zhr: number;
  parent_body: string;
  activity_period: string;
  hemisphere: string;
  notes: string;
}
