import { proxyRequest } from "@/lib/api-proxy";

export async function GET(request: Request) {
  const { search } = new URL(request.url);
  return proxyRequest("/api/gallery/challenge", search, false);
}
