export interface PlanetDef {
  name: string;
  radius: number;
  orbitRadius: number;
  speed: number;
  color: number;
  emissive: number;
  emissiveIntensity?: number;
  textureUrl?: string;
  ringInner?: number;
  ringOuter?: number;
}
