import { proxyRequest } from "@/lib/api-proxy";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxyRequest(`/api/gallery/image/${id}/comment`, "", false, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}
