export interface GalleryComment {
  id: number;
  author: string;
  text: string;
  created_at: string;
}

export interface GalleryEntry {
  id: number;
  target_id: string;
  target_name: string;
  author: string;
  location: string;
  gear: string;
  equipment?: string;
  comment: string;
  note: string | null;
  notes?: string | null;
  created_at: string;
  reported: number;
  has_raw_preview?: boolean;
  exposure_details?: string;
  total_integration?: string;
  gain_iso?: string;
  filter?: string;
  processing_software?: string[];
  capture_date?: string;
  comments?: GalleryComment[];
}

export type GalleryCounts = Record<string, number>;

export interface GalleryUploadPayload {
  target_id: string;
  target_name: string;
  author: string;
  location: string;
  gear?: string;
  equipment?: string;
  comment?: string;
  note?: string | null;
  notes?: string | null;
  image_data: string;
  raw_image_data?: string | null;
  exposure_details?: string;
  total_integration?: string;
  gain_iso?: string;
  filter?: string;
  processing_software?: string[];
  capture_date?: string;
  admin_key?: string;
}

