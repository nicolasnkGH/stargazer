"use client";

import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const STEP_TAB_MAP: Record<string, string> = {
  "#card-active-const": "sky",
  "#card-constellations": "sky",
  "#card-targets": "sky",
  "#card-ai-targets": "ai",
  "#card-planets": "planets",
  "#card-solar-system-scope": "planets",
  "#card-plan-my-night": "plan",
  "#card-preflight": "plan",
  "#card-log": "plan",
  "#card-weekly": "tools",
  "#card-light-pollution": "tools",
  "#card-space-weather": "tools",
  "#card-optics": "tools",
};

export function startOnboardingTour(t?: (key: string) => string) {
  const tr = (key: string, fallback: string) => (t ? t(key) : fallback);

  const driverObj = driver({
    showProgress: true,
    animate: true,
    smoothScroll: true,
    onHighlightStarted: (element, step) => {
      const selector = typeof step?.element === "string" ? step.element : "";
      if (selector && STEP_TAB_MAP[selector]) {
        window.dispatchEvent(new CustomEvent("sg-navigate-tab", { detail: { tab: STEP_TAB_MAP[selector] } }));
      }
    },
    steps: [
      {
        popover: {
          title: tr("tour_step1_title", "Welcome to StarGazer! ✨"),
          description: tr(
            "tour_step1_desc",
            "Your complete observatory dashboard for amateur astronomy and night sky planning. Let's take a quick 1-minute tour of all the features!"
          ),
          align: "center",
        },
      },
      {
        element: "#btn-location",
        popover: {
          title: tr("tour_step2_title", "📍 Location & Horizon Setup"),
          description: tr(
            "tour_step2_desc",
            "Click here to switch or add custom observing spots, GPS location, and Porch Mode (custom horizon headings to block trees and buildings)."
          ),
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#card-tonight",
        popover: {
          title: tr("tour_step3_title", "🌤 Real-Time Sky Conditions"),
          description: tr(
            "tour_step3_desc",
            "Live astronomical seeing score, lunar illumination, twilight windows, and atmospheric humidity/dew point alerts."
          ),
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#card-weather",
        popover: {
          title: tr("tour_step4_title", "🔭 Clear Outside Cloud Forecast"),
          description: tr(
            "tour_step4_desc",
            "Hour-by-hour visual breakdown of high, mid, and low clouds, fog risk, and wind speed tailored for telescope sessions."
          ),
          side: "top",
          align: "start",
        },
      },
      {
        element: "#card-active-const",
        popover: {
          title: tr("tour_step5_title", "🗺 3D Sky Map & Active Constellations"),
          description: tr(
            "tour_step5_desc",
            "Interactive 3D celestial sphere and constellations currently above your horizon. Click any star to query the SIMBAD astronomical database!"
          ),
          side: "top",
          align: "start",
        },
      },
      {
        element: "#card-targets",
        popover: {
          title: tr("tour_step6_title", "🔭 Tonight's Deep-Sky Target Database"),
          description: tr(
            "tour_step6_desc",
            "Curated galaxies, nebulae, and star clusters visible tonight with altitude curves, eyepiece FOV simulation, and one-click planner queueing."
          ),
          side: "top",
          align: "start",
        },
      },
      {
        element: "#card-ai-targets",
        popover: {
          title: tr("tour_step7_title", "✨ AI Observational Briefing & Must-See"),
          description: tr(
            "tour_step7_desc",
            "AI-synthesized nightly observing advice tailored to current seeing, moon interference, and top celestial highlights of the night."
          ),
          side: "top",
          align: "start",
        },
      },
      {
        element: "#card-planets",
        popover: {
          title: tr("tour_step8_title", "🪐 Planet Tracker & 3D Orrery"),
          description: tr(
            "tour_step8_desc",
            "Real-time planetary positions, rising/setting times, and an interactive 3D solar system simulation with customizable speeds."
          ),
          side: "top",
          align: "start",
        },
      },
      {
        element: "#card-plan-my-night",
        popover: {
          title: tr("tour_step9_title", "📅 Plan My Night, Checklist & Log"),
          description: tr(
            "tour_step9_desc",
            "Build your nightly observing timetable, run through equipment pre-flight checks, and record your observations in the Observation Log!"
          ),
          side: "top",
          align: "start",
        },
      },
      {
        element: "#card-motion",
        popover: {
          title: tr("tour_step10_title", "🚀 Sky Objects in Motion"),
          description: tr(
            "tour_step10_desc",
            "Live tracking for ISS passes, near-Earth asteroids, upcoming comets, and active meteor shower radiant peaks."
          ),
          side: "top",
          align: "start",
        },
      },
      {
        element: "#card-weekly",
        popover: {
          title: tr("tour_step11_title", "🛠 Astronomy Tools & Light Pollution"),
          description: tr(
            "tour_step11_desc",
            "7-day astronomical forecast, interactive light pollution maps (Bortle scale), aurora geomagnetic activity, and eyepiece optics calculator."
          ),
          side: "top",
          align: "start",
        },
      },
      {
        element: "#quick-nav-dock",
        popover: {
          title: tr("tour_step12_title", "⚡ Quick-Nav Dock & Red Light Mode"),
          description: tr(
            "tour_step12_desc",
            "Fast always-on utility dock! Toggle red-light night vision to preserve dark adaptation, jump to the planner, or open the checklist instantly."
          ),
          side: "left",
          align: "center",
        },
      },
      {
        element: "#btn-menu",
        popover: {
          title: tr("tour_step13_title", "🔔 Notifications & Offline Settings"),
          description: tr(
            "tour_step13_desc",
            "Access data settings, export your observation logs, configure push notifications for clear sky windows, and manage offline data."
          ),
          side: "left",
          align: "start",
        },
      },
      {
        popover: {
          title: tr("tour_step14_title", "📱 Install StarGazer as an App"),
          description: tr(
            "tour_step14_desc",
            "StarGazer is a full PWA! Install it from your browser for instant offline access in dark fields and push alerts when skies clear. Clear skies and happy observing!"
          ),
          align: "center",
        },
      },
    ],
  });
  driverObj.drive();
}
