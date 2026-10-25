import { proxyImage, proxyRequest } from "@/lib/api-proxy";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyImage(`/api/gallery/image/${id}`, "");
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adminKey = request.headers.get("x-admin-key") || request.headers.get("X-Admin-Key");
  return proxyRequest(`/api/gallery/image/${id}`, "", false, {
    method: "DELETE",
    headers: adminKey ? { "X-Admin-Key": adminKey } : undefined,
  });
}
