/** Same CDN URLs pinned by the legacy web/index.html — proven working in production. */
export const ALADIN_JS_URL = "https://aladin.u-strasbg.fr/AladinLite/api/v2/latest/aladin.min.js";
export const ALADIN_CSS_URL = "https://aladin.u-strasbg.fr/AladinLite/api/v2/latest/aladin.min.css";

export const ALADIN_CONTAINER_ID = "aladin-lite-div";

export const FOV_PRESETS = [
  { value: "seestar", label: "Seestar S50 (Smart Telescope)" },
  { value: "wide_50", label: "DSLR + 50mm Lens (Wide Field)" },
  { value: "tele_250", label: "DSLR + 250mm Telephoto" },
  { value: "visual_25", label: "Visual: 130mm Scope + 25mm Eyepiece (1.2°)" },
  { value: "visual_10", label: "Visual: 130mm Scope + 10mm Eyepiece (0.48°)" },
  { value: "custom_visual", label: "Custom Eyepiece Setup..." },
  { value: "custom_sensor", label: "Custom Camera Sensor Setup..." },
] as const;

export type FovPreset = (typeof FOV_PRESETS)[number]["value"];

export const FOV_CUSTOM_VISUAL_DEFAULTS = { scopeFl: 650, epFl: 25, epAfov: 52 };
export const FOV_CUSTOM_SENSOR_DEFAULTS = { scopeFl: 650, sensorW: 23.5, sensorH: 15.6 };

export interface FovFrame {
  fovDegrees: number;
  isRectangular: boolean;
  rectWidthDeg: number;
  rectHeightDeg: number;
}

/** Ports the preset math from legacy web/app.js updateFovDrawing() 1:1. */
export function computeFovFrame(
  preset: FovPreset,
  custom: { scopeFl: number; epFl: number; epAfov: number; camScopeFl: number; sensorW: number; sensorH: number }
): FovFrame {
  switch (preset) {
    case "seestar":
      return { fovDegrees: 1.5, isRectangular: true, rectWidthDeg: 1.29, rectHeightDeg: 0.73 };
    case "wide_50":
      return { fovDegrees: 30.0, isRectangular: true, rectWidthDeg: 27.0, rectHeightDeg: 18.0 };
    case "tele_250":
      return { fovDegrees: 6.0, isRectangular: true, rectWidthDeg: 5.4, rectHeightDeg: 3.6 };
    case "visual_10":
      return { fovDegrees: 0.48, isRectangular: false, rectWidthDeg: 0, rectHeightDeg: 0 };
    case "custom_visual": {
      const mag = custom.scopeFl / (custom.epFl || 1);
      return { fovDegrees: custom.epAfov / (mag || 1), isRectangular: false, rectWidthDeg: 0, rectHeightDeg: 0 };
    }
    case "custom_sensor": {
      const rectWidthDeg = (custom.sensorW * 57.3) / (custom.camScopeFl || 1);
      const rectHeightDeg = (custom.sensorH * 57.3) / (custom.camScopeFl || 1);
      return {
        fovDegrees: Math.max(rectWidthDeg, rectHeightDeg) * 1.2,
        isRectangular: true,
        rectWidthDeg,
        rectHeightDeg,
      };
    }
    case "visual_25":
    default:
      return { fovDegrees: 1.2, isRectangular: false, rectWidthDeg: 0, rectHeightDeg: 0 };
  }
}
