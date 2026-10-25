import { proxyRequest } from "@/lib/api-proxy";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id, commentId } = await params;
  const adminKey = request.headers.get("x-admin-key") || request.headers.get("X-Admin-Key");
  return proxyRequest(`/api/gallery/image/${id}/comment/${commentId}`, "", false, {
    method: "DELETE",
    headers: adminKey ? { "X-Admin-Key": adminKey } : undefined,
  });
}
