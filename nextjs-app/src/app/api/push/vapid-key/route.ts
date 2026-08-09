import { proxyRequest } from "@/lib/api-proxy";

export async function GET() {
  return proxyRequest("/api/push/vapid-key", "");
}
