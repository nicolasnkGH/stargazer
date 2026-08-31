import type { IconType } from "react-icons";
import {
  FiAlertTriangle,
  FiArrowUp,
  FiArrowUpRight,
  FiBarChart2,
  FiCalendar,
  FiCamera,
  FiCheckCircle,
  FiCheckSquare,
  FiChevronRight,
  FiClock,
  FiCompass,
  FiCopy,
  FiCrosshair,
  FiDatabase,
  FiDownload,
  FiEdit2,
  FiExternalLink,
  FiEye,
  FiFileText,
  FiFlag,
  FiImage,
  FiInfo,
  FiMap,
  FiMapPin,
  FiMaximize,
  FiMenu,
  FiMoon,
  FiPlus,
  FiSquare,
  FiStar,
  FiSun,
  FiSunrise,
  FiSunset,
  FiTag,
  FiTrash2,
  FiUser,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import {
  LuBinoculars,
  LuCalendarDays,
  LuCloudSun,
  LuClock3,
  LuFlame,
  LuFlashlight,
  LuGithub,
  LuGlobe,
  LuLinkedin,
  LuNotebookPen,
  LuOrbit,
  LuRocket,
  LuScan,
  LuSparkles,
  LuTelescope,
  LuZap,
} from "react-icons/lu";

/**
 * Icon names match web/index.html's `data-lucide="..."` values wherever legacy has
 * an equivalent, so this table doubles as a cross-reference back to the source markup.
 * A few names (marked below) don't exist in legacy and are named descriptively instead.
 */
const ICONS: Record<string, IconType> = {
  "alert-triangle": FiAlertTriangle,
  "arrow-up": FiArrowUp,
  "arrow-up-right": FiArrowUpRight,
  "bar-chart-2": FiBarChart2,
  binoculars: LuBinoculars, // no legacy data-lucide equivalent (Target Database card icon)
  calendar: FiCalendar,
  "calendar-days": LuCalendarDays,
  camera: FiCamera, // no legacy data-lucide equivalent (Observation Log entries)
  "check-circle": FiCheckCircle, // no legacy equivalent (GalleryModal approve state)
  "check-square": FiCheckSquare,
  "chevron-right": FiChevronRight,
  clock: FiClock,
  "clock-3": LuClock3, // no legacy equivalent (Plan My Night card icon)
  "cloud-sun": LuCloudSun,
  compass: FiCompass,
  copy: FiCopy,
  crosshair: FiCrosshair,
  database: FiDatabase,
  download: FiDownload,
  "external-link": FiExternalLink,
  eye: FiEye,
  "file-text": FiFileText,
  flag: FiFlag, // no legacy equivalent (GalleryModal report state)
  flame: LuFlame, // no legacy equivalent (Meteor Showers tab)
  flashlight: LuFlashlight,
  github: LuGithub,
  globe: LuGlobe,
  image: FiImage,
  info: FiInfo,
  linkedin: LuLinkedin,
  map: FiMap,
  "map-pin": FiMapPin,
  maximize: FiMaximize,
  menu: FiMenu,
  moon: FiMoon,
  "notebook-pen": LuNotebookPen,
  orbit: LuOrbit,
  pencil: FiEdit2,
  plus: FiPlus, // no legacy equivalent (ObservationLog "New Entry")
  rocket: LuRocket, // no legacy equivalent (Sky Objects in Motion / ISS tab)
  scan: LuScan,
  sparkles: LuSparkles,
  square: FiSquare, // unchecked-checkbox state, pairs with check-square
  star: FiStar,
  sun: FiSun,
  sunrise: FiSunrise,
  sunset: FiSunset,
  tag: FiTag, // no legacy equivalent (Footer release-version badge)
  telescope: LuTelescope,
  "trash-2": FiTrash2,
  user: FiUser, // no legacy equivalent (GalleryModal attribution)
  x: FiX,
  "x-circle": FiXCircle, // no legacy equivalent (GalleryModal reject state)
  zap: LuZap,
};

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  className?: string;
}

/** Renders one of the icons above by legacy-matching name, mirroring web/'s `<i data-lucide="name">`. */
export default function Icon({ name, className }: IconProps) {
  const Component = ICONS[name];
  if (!Component) return null;
  return <Component className={className} />;
}
