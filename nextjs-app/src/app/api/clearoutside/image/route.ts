import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = url.searchParams.get("lat") || "19.82";
  const lon = url.searchParams.get("lon") || "-155.47";
  const sizeParam = url.searchParams.get("size");
  const size = sizeParam === "small" ? "forecast_image_small" : "forecast_image_large";

  const targetUrl = `https://clearoutside.com/${size}/${lat}/${lon}/forecast.png`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/png,image/*;q=0.8",
        Referer: "https://clearoutside.com/",
      },
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      return new NextResponse("Failed to fetch forecast image", { status: res.status });
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
