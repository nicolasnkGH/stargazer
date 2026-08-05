import { proxyRequest } from "@/lib/api-proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return proxyRequest("/tonight", url.search);
}
