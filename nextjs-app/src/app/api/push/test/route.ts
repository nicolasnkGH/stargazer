import { proxyRequest } from "@/lib/api-proxy";

export async function POST() {
  return proxyRequest("/api/push/test", "", false, { method: "POST" });
}
