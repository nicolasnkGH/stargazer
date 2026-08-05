export interface GalleryEntry {
  id: number;
  target_id: string;
  target_name: string;
  author: string;
  location: string;
  gear: string;
  comment: string;
  note: string | null;
  created_at: string;
  reported: number;
}

export type GalleryCounts = Record<string, number>;

export interface GalleryUploadPayload {
  target_id: string;
  target_name: string;
  author: string;
  location: string;
  gear: string;
  comment: string;
  note?: string | null;
  image_data: string;
}
