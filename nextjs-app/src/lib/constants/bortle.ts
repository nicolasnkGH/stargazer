export interface BortleClassInfo {
  desc: string;
  equip: string;
  shortDesc: string;
}

export const BORTLE_CLASSES: Record<string, BortleClassInfo> = {
  "1": {
    desc: "Class 1 (Excellent Dark Sky): Zodiacal light, gegenschein, and Scorpius-Sagittarius Milky Way cast obvious shadows. M31 displays spiral arms to naked eye.",
    equip: "Naked Eye, Binoculars, All Telescopes (Ultimate Deep-Sky)",
    shortDesc: "Excellent Dark Sky",
  },
  "2": {
    desc: "Class 2 (Typical Dark Sky): Airglow is visible near horizon. Milky Way is highly detailed. Globular clusters like M13 and M22 are visible to naked eye.",
    equip: "Naked Eye, Binoculars, All Telescopes",
    shortDesc: "Typical Dark Sky",
  },
  "3": {
    desc: "Class 3 (Rural Sky): Milky Way still appears complex with dark rifts. M31 and M33 are easily visible with naked eye. Great for all deep-sky objects.",
    equip: "Binoculars, All Telescopes, DSLR Astro-imaging",
    shortDesc: "Rural Sky",
  },
  "4": {
    desc: "Class 4 (Rural/Suburban Transition): Light pollution domes visible in several directions. Milky Way well above horizon. M31 is easily visible; M33 is difficult.",
    equip: "Binoculars, Small to Medium Telescopes",
    shortDesc: "Rural/Suburban Transition",
  },
  "5": {
    desc: "Class 5 (Suburban Sky): Milky Way is weak near horizon and washed out by light domes. Andromeda (M31) is a faint patch to naked eye. Telescopes show nebulae well.",
    equip: 'Binoculars (bright targets), 4"+ Telescopes',
    shortDesc: "Suburban Sky",
  },
  "6": {
    desc: "Class 6 (Bright Suburban): Milky Way is only visible near zenith on clear nights. M31 is barely visible to naked eye. Best for star clusters, planets, and bright nebulae.",
    equip: 'Telescopes (6"+ for deep sky), Binoculars for open clusters',
    shortDesc: "Bright Suburban",
  },
  "7": {
    desc: "Class 7 (Suburban/Urban Transition): Entire sky background has a grayish-white hue. Milky Way is completely invisible. M31 and M44 require binoculars.",
    equip: "Telescopes with narrowband/LP filters, Seestar S50",
    shortDesc: "Suburban/Urban Transition",
  },
  "8": {
    desc: "Class 8 (City Sky): Sky glows white or orange. Only bright stars (Mag 2-3) and planets are naked-eye. Scopes limited to planets, moon, double stars, and bright cores.",
    equip: "Planetary/Lunar scopes, Seestar S50 / Smart Scopes",
    shortDesc: "City Sky",
  },
  "9": {
    desc: "Class 9 (Inner-City Sky): Entire sky is brightly lit. Only the Moon, major planets, and around 20-30 of the brightest stars are visible. Requires GoTo scopes or Seestar imaging.",
    equip: "Smart Scopes (Seestar/Vespera), Lunar/Planetary scopes",
    shortDesc: "Inner-City Sky",
  },
};

export const BORTLE_STORAGE_KEY = "stargazer_bortle";
