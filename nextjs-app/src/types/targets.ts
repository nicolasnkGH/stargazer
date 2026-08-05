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
}
