import type { IconName } from "@/components/Icon";

export const TABS: { key: string; label: string; icon: IconName }[] = [
  { key: "iss", label: "ISS Passes", icon: "rocket" },
  { key: "neo", label: "Near-Earth Objects", icon: "telescope" },
  { key: "comets", label: "Comets", icon: "sparkles" },
  { key: "meteors", label: "Meteor Showers", icon: "flame" },
];
