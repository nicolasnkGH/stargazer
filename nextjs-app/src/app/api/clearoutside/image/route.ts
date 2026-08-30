import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = url.searchParams.get("lat") || "40.13";
  const lon = url.searchParams.get("lon") || "-83.04";

  const targetUrl = `https://clearoutside.com/forecast_image/large/${lat}/${lon}/forecast.png`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/png,image/*;q=0.8",
      },
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      return new NextResponse("Failed to fetch forecast image", { status: 502 });
    }

    const imageBuffer = await res.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=1800, s-maxage=1800",
      },
    });
  } catch {
    return new NextResponse("Clear Outside image proxy error", { status: 500 });
  }
}
