import { NextRequest } from "next/server";

const ALLOWED_HIPS_HOSTS = new Set([
  "alasky.cds.unistra.fr",
  "hips2fits.strasbg.fr",
  "skies.esac.esa.int",
]);

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return Response.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(urlParam);
    } catch {
      return Response.json({ error: "Invalid url parameter" }, { status: 400 });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return Response.json({ error: "Unsupported URL protocol" }, { status: 400 });
    }

    if (!ALLOWED_HIPS_HOSTS.has(parsedUrl.hostname)) {
      return Response.json({ error: "URL host is not allowed" }, { status: 400 });
    }

    if (parsedUrl.username || parsedUrl.password) {
      return Response.json({ error: "URL must not include credentials" }, { status: 400 });
    }

    if (parsedUrl.port) {
      return Response.json({ error: "URL port is not allowed" }, { status: 400 });
    }

    const safeUrl = new URL(parsedUrl.pathname + parsedUrl.search, `${parsedUrl.protocol}//${parsedUrl.hostname}`);

    const res = await fetch(safeUrl.toString(), {
      redirect: "error",
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
