import { proxyRequest } from "@/lib/api-proxy";
import { REVALIDATE } from "@/lib/constants";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return proxyRequest("/constellation_window", url.search, REVALIDATE.constellationWindow);
}
