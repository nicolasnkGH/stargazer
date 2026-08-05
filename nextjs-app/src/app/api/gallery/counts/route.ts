import { proxyRequest } from "@/lib/api-proxy";
import { REVALIDATE } from "@/lib/constants";

export async function GET() {
  return proxyRequest("/api/gallery/counts", "", REVALIDATE.galleryCounts);
}
