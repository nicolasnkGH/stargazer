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
  bortle_min?: number;
}
