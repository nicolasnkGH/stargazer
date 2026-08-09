import { proxyRequest } from "@/lib/api-proxy";

export async function POST(request: Request) {
  const body = await request.text();
  return proxyRequest("/api/push/subscribe", "", false, { method: "POST", body });
}
