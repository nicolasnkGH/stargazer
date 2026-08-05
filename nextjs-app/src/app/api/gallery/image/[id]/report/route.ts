import { proxyRequest } from "@/lib/api-proxy";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyRequest(`/api/gallery/image/${id}/report`, "", false, { method: "POST" });
}
