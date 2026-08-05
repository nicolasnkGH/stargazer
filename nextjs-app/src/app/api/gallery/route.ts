import { proxyRequest } from "@/lib/api-proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return proxyRequest("/api/gallery", url.search, false);
}

export async function POST(request: Request) {
  const body = await request.text();
  return proxyRequest("/api/gallery", "", false, { method: "POST", body });
}
