import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return Response.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const targetUrl = decodeURIComponent(urlParam);
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "StarGazer-Astronomy-Portal/3.2.0",
        Accept: "*/*",
      },
    });

    if (!res.ok) {
      return Response.json({ error: `HiPS fetch failed: ${res.status}` }, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const body = await res.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (err) {
    return Response.json({ error: "HiPS proxy request failed", details: String(err) }, { status: 502 });
  }
}
