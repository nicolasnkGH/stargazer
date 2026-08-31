/** Loosely typed — comes from the CDN-loaded Aladin Lite v2 global, not an npm import. */
export interface AladinOverlay {
  add: (shape: unknown) => void;
}

export interface AladinInstance {
  gotoRaDec: (ra: number, dec: number) => void;
  setFoV: (degrees: number) => void;
  addCatalog: (overlay: AladinOverlay) => void;
  removeCatalog: (overlay: AladinOverlay) => void;
}

export interface AladinGlobal {
  init?: Promise<unknown>;
  aladin: (selector: string, options: Record<string, unknown>) => AladinInstance;
  graphicOverlay: (options: { color: string; lineWidth: number }) => AladinOverlay;
  polygon: (points: [number, number][]) => unknown;
  circle: (ra: number, dec: number, radiusDeg: number) => unknown;
}

declare global {
  interface Window {
    /** CDN-loaded Aladin Lite v2, only used inside FovModal.tsx — kept loosely typed on purpose. */
    A?: AladinGlobal;
  }
}
