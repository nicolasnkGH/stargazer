export const OPTICS_TARGET_TYPES = [
  { value: "planets", label: "Planets (Jupiter, Saturn, Mars)" },
  { value: "moon", label: "The Moon" },
  { value: "clusters", label: "Star Clusters (Globular & Open)" },
  { value: "nebulae", label: "Wide Nebulae (Orion, Andromeda)" },
] as const;

export const OPTICS_RECOMMENDATIONS: Record<string, string> = {
  planets: "Planets are small and bright — use your shortest focal-length eyepiece for high magnification. A 3-5mm exit pupil keeps detail sharp without the image going too dim.",
  moon: "The Moon is bright and forgiving of high power. A mid-range eyepiece (10-15mm) balances detail with a comfortable field of view — add a moon filter if it's too dazzling.",
  clusters: "Star clusters look best at low-to-medium magnification with a wide true field of view, so the whole cluster fits in the eyepiece. Favor a longer focal-length eyepiece.",
  nebulae: "Wide nebulae need your widest true field of view and largest exit pupil to gather as much faint light as possible — use your longest focal-length eyepiece.",
};

export const OPTICS_DEFAULTS = {
  scopeFocalLength: 650,
  scopeAperture: 130,
  eyepieceFocalLength: 25,
  eyepieceApparentFov: 52,
};
