/** Client-side compression before upload — upgraded for high-res 4K mosaics and pinpoint stars. */
export const GALLERY_UPLOAD_MAX_WIDTH = 2048;
export const GALLERY_UPLOAD_JPEG_QUALITY = 0.90;

export const ASTRO_EQUIPMENT_PRESETS = [
  "DWARF 3 Telephoto",
  "DWARF 3 Wide-Angle",
  '5" SCT (1250mm)',
  "130EQ Newton (650mm)",
  "Seestar S50",
  "DSLR + 50mm Lens",
  "DSLR + 250mm Telephoto",
  "Custom Setup",
] as const;

export const ASTRO_FILTER_PRESETS = [
  "Duo-Band",
  "Astro (UV/IR-Cut)",
  "Broadband / None",
  "Dark Filter",
  "Narrowband (H-Alpha)",
  "Narrowband (OIII)",
  "Light Pollution (CLS/UHC)",
] as const;

export const ASTRO_SOFTWARE_PRESETS = [
  "Siril",
  "AstroWizard",
  "StarNet++",
  "GraXpert",
  "PixInsight",
  "Photoshop",
  "GIMP",
  "In-App / Device Stack",
] as const;

