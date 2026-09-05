export const PLANET_TEXTURES: Record<string, string> = {
  mercury: "/assets/mercury.jpg",
  venus: "/assets/venus.jpg",
  earth: "/assets/2k_earth_daymap.jpg",
  mars: "/assets/mars.jpg",
  jupiter: "/assets/jupiter.jpg",
  saturn: "/assets/saturn.jpg",
  uranus: "/assets/uranus.jpg",
  neptune: "/assets/neptune.jpg",
};

/** Normalizes localized planet names (English, Portuguese, Spanish) to standard canonical keys. */
export function normalizePlanetKey(name: string): string {
  if (!name) return "jupiter";
  const n = name.toLowerCase().trim();
  if (n.includes("merc")) return "mercury";
  if (n.includes("vê") || n.includes("ve")) return "venus";
  if (n.includes("ear") || n.includes("terr")) return "earth";
  if (n.includes("mar")) return "mars";
  if (n.includes("júp") || n.includes("jup")) return "jupiter";
  if (n.includes("sat")) return "saturn";
  if (n.includes("uran") || n.includes("ura")) return "uranus";
  if (n.includes("nep") || n.includes("net")) return "neptune";
  if (n.includes("sun") || n.includes("sol")) return "sun";
  if (n.includes("moon") || n.includes("lua")) return "moon";
  return n;
}
