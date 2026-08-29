export interface AtmosphereComponent {
  gas: string;
  formula: string;
  percentage: number;
  color: string;
}

export interface TemperatureInfo {
  average: string;
  high: string;
  low: string;
}

export interface PlanetData {
  id: string;
  name: string;
  tagline: string;
  type: 'star' | 'terrestrial' | 'gas_giant' | 'ice_giant' | 'moon';
  radius: number; // visual scale size
  realRadiusKm: number;
  distanceFromSunAU: number; // position multiplier
  orbitSpeed: number;
  rotationSpeed: number;
  color: string;
  textureType: 'sun' | 'mercury' | 'venus' | 'earth' | 'moon' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';
  hasRings?: boolean;
  ringInnerRadius?: number;
  ringOuterRadius?: number;
  atmosphere: AtmosphereComponent[];
  temperature: TemperatureInfo;
  distanceFromEarth: string;
  distanceFromSun: string;
  orbitalPeriod: string;
  rotationPeriod: string;
  moonsCount: number;
  moonsList?: string[];
  gravity: string;
  description: string;
  observationTip: string;
  bortleRecommended: string;
}

export type CameraViewMode = 'system' | 'focused' | 'top_down' | 'cinematic';
