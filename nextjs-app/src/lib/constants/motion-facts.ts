import type { MotionFact, MotionFactType } from "@/types";

export const MOTION_FACTS: Record<MotionFactType, MotionFact[]> = {
  iss: [
    { icon: "⚡", text: "The ISS travels at 7.66 km/s (17,150 mph) — fast enough to circle the entire Earth in just 92 minutes." },
    { icon: "🌍", text: "Astronauts on the ISS witness approximately 15–16 sunrises and sunsets every single day." },
    { icon: "📅", text: "The ISS has been continuously inhabited since November 2, 2000 — over 24 years of unbroken human presence in space." },
    { icon: "🏟️", text: "The ISS is larger than a American football field: 109 m × 73 m, with a pressurised volume of 916 m³." },
    { icon: "💰", text: "At ~$150 billion USD, the ISS is the most expensive object ever built by humanity." },
    { icon: "✨", text: "The ISS can reach magnitude −5.9 at its brightest — outshining Venus and visible in full daylight if you know where to look." },
    { icon: "🚀", text: "The ISS has hosted over 270 individuals from 21 countries, spending a combined 130+ person-years in orbit." },
    { icon: "🔬", text: "Over 3,000 research experiments have been conducted aboard the ISS across biology, physics, astronomy, and medicine." },
    { icon: "🌐", text: "The ISS orbits at an altitude of roughly 400 km — just high enough for the curvature of Earth to be clearly visible." },
    { icon: "🛸", text: "It took 42 flights and over 13 years (1998–2011) to fully assemble the ISS in orbit." },
  ],
  comet: [
    { icon: "☄️", text: "Comets are ancient time capsules — most formed 4.6 billion years ago when the solar system was born, preserving pristine primordial material." },
    { icon: "🌊", text: "Some scientists believe comets may have delivered water and complex organic molecules to early Earth, seeding the conditions for life." },
    { icon: "💨", text: "A comet's tail always points away from the Sun, not behind it. There are actually two tails: a dust tail and an ion (plasma) tail." },
    { icon: "❄️", text: "Comets are sometimes called 'dirty snowballs' — their nuclei are typically dark, frozen masses of ice, rock, and organic compounds just a few km across." },
    { icon: "🌠", text: "Most meteor showers are caused by Earth passing through trails of debris left by comets. The Perseids come from comet Swift-Tuttle; the Leonids from Tempel-Tuttle." },
    { icon: "🔭", text: "Edmond Halley realised in 1705 that comets seen in 1531, 1607, and 1682 were all the same object returning on a 75-year orbit — proving comets follow predictable paths." },
    { icon: "🌡️", text: "Comet surfaces can reach temperatures of +90 °C near the Sun but their nuclei remain at around −273 °C — just 1 degree above absolute zero." },
    { icon: "🧪", text: "The Rosetta mission found the amino acid glycine on comet 67P — one of the building blocks of proteins — providing tantalising hints at the cosmic origins of life." },
    { icon: "📡", text: "The Oort Cloud, a theoretical shell of trillions of comet nuclei at the very edge of our solar system, extends up to 100,000 AU (1.6 light-years) from the Sun." },
    { icon: "🎇", text: "The Great Comet of 1882 was so bright it was visible in full daylight and cast shadows at night — rivalling the full Moon in brightness." },
  ],
};

export const MOTION_FACT_ROTATE_INTERVAL_MS = 8000;
