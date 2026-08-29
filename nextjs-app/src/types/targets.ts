export interface CatalogTarget {
  id: string;
  name: string;
  type: string;
  constellation: string;
  magnitude?: number;
  size?: string;
  distance?: string;
  best_month?: string;
  notes?: string;
  emoji?: string;
  description?: string;
  difficulty?: string;
  equipment?: string;
  visible?: boolean;
  altitude_deg?: number;
  azimuth_deg?: number;
  bortle_min?: number;
  bortle_class?: number;
  ra_hours?: number;
  dec_degrees?: number;
  is_daytime?: boolean;
}
