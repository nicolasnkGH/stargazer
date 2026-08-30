import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      comets: [
        {
          name: "C/2023 A3 (Tsuchinshan-ATLAS)",
          magnitude: 3.5,
          constellation: "Virgo",
          visibility: "Favorable at dusk / dawn",
          how_to_find: "Look low on the western horizon shortly after sunset using binoculars or wide-field eyepiece.",
        },
        {
          name: "12P/Pons-Brooks",
          magnitude: 4.8,
          constellation: "Taurus",
          visibility: "Evening sky",
          how_to_find: "Visible in small telescopes near the western horizon after twilight.",
        },
        {
          name: "13P/Olbers",
          magnitude: 6.5,
          constellation: "Ursa Major",
          visibility: "Binocular object",
          how_to_find: "Use 7x50 or 10x50 binoculars sweeping below the Big Dipper bowl.",
        },
      ],
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}
