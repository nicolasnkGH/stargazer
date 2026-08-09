export interface LocationCoords {
  lat: number;
  lon: number;
}

export interface SavedLocation extends LocationCoords {
  id: string;
  name: string;
  porchMode?: boolean;
  minAz?: number;
  maxAz?: number;
}

export interface GeocodeSuggestion {
  displayName: string;
  lat: number;
  lon: number;
}
