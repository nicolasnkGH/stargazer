"use client";

import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function startOnboardingTour() {
  const driverObj = driver({
    showProgress: true,
    steps: [
      {
        popover: {
          title: "Welcome to StarGazer! ✨",
          description:
            "Your personal dashboard for stargazing and astronomy planning. Let's take a quick tour of all the features!",
          align: "center",
        },
      },
      {
        element: "#btn-location",
        popover: {
          title: "📍 Location Setup",
          description:
            "Your location is set! You can add more observing spots here any time, including a porch mode to restrict visibility angles.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#card-tonight",
        popover: {
          title: "🌤 Live Sky Conditions",
          description: "Real-time weather, astronomical seeing, and moon phase for your location.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#card-active-const",
        popover: {
          title: "🗺 Active Constellation",
          description:
            "Interactive sky map of constellations currently above you. Click any star to look it up in the SIMBAD database!",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#card-targets",
        popover: {
          title: "🔭 Tonight's Targets",
          description:
            "Galaxies, nebulae, and planets visible tonight, ranked by altitude. Filtered automatically to your sky darkness (Bortle class).",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#card-motion",
        popover: {
          title: "🚀 Sky Objects in Motion",
          description: "Track the ISS, near-Earth asteroids, comets, and meteor showers — all calculated for your exact location.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#btn-menu",
        popover: {
          title: "🔔 Push Notifications & Settings",
          description:
            'Click this menu → then "💾 Data & Settings" to enable native push alerts for ISS passes, auroras, and clearing skies. Also set your Bortle Class and back up your data here!',
          side: "left",
          align: "start",
        },
      },
      {
        element: "#btn-night-mode",
        popover: {
          title: "🔴 Night Vision Mode",
          description: "Enable the red overlay to preserve your dark-adapted eyes while observing. Essential for real sessions!",
          side: "left",
          align: "end",
        },
      },
      {
        popover: {
          title: "📱 Install StarGazer as an App",
          description:
            'Get the full PWA experience! In Chrome: tap the install icon (⭳) in the address bar. On iOS Safari: tap Share → "Add to Home Screen". Once installed, you\'ll get native push notifications directly on your device!',
          align: "center",
        },
      },
    ],
  });
  driverObj.drive();
}
