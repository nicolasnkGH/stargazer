import { proxyImage } from "@/lib/api-proxy";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyImage(`/api/gallery/image/${id}`, "");
}
