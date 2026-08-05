/** Same CDN URLs/version pinned by the legacy web/index.html — proven working in production. */
export const CELESTIAL_SCRIPTS = [
  "https://d3js.org/d3.v3.min.js",
  "https://d3js.org/d3.geo.projection.v0.min.js",
  "https://cdn.jsdelivr.net/npm/d3-celestial@0.7.32/celestial.min.js",
] as const;

export const CELESTIAL_CSS_URL = "https://cdn.jsdelivr.net/npm/d3-celestial@0.7.32/celestial.css";
export const CELESTIAL_DATA_PATH = "https://cdn.jsdelivr.net/npm/d3-celestial@0.7.32/data/";

export const CELESTIAL_MAP_CONTAINER_ID = "ac-map-container";
export const CELESTIAL_ROTATE_DURATION_MS = 1200;

export function buildCelestialConfig(centerRa: number, centerDec: number) {
  return {
    container: CELESTIAL_MAP_CONTAINER_ID,
    width: 0,
    projection: "stereographic",
    transform: "equatorial",
    center: [centerRa, centerDec],
    zoomlevel: 4,
    interactive: true,
    controls: false,
    datapath: CELESTIAL_DATA_PATH,
    stars: { show: true, limit: 6.0, colors: true, names: false, propername: false },
    dsos: { show: true, limit: 4, names: false },
    adaptable: true,
    constellations: {
      show: true,
      names: true,
      namesType: "la",
      lines: true,
      lineStyle: { stroke: "#60a5fa", width: 1.5, opacity: 0.5 },
      nameStyle: { fill: "#94a3b8", align: "center", baseline: "middle", font: ["12px Space Grotesk, sans-serif"] },
    },
    mw: { show: false },
    lines: { graticule: { show: false }, equatorial: { show: false } },
    background: { fill: "#0a0f1c", stroke: "#1e293b", opacity: 1 },
  };
}

export function targetMarkerColor(type: string) {
  const t = type.toLowerCase();
  if (t.includes("star")) return "#fbbf24";
  if (t.includes("cluster")) return "#38bdf8";
  if (t.includes("nebula")) return "#f472b6";
  if (t.includes("galaxy")) return "#a855f7";
  return "#cbd5e1";
}
