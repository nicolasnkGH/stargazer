import { proxyRequest } from "@/lib/api-proxy";
import { REVALIDATE } from "@/lib/constants";

export async function GET() {
  return proxyRequest("/nasa/space-weather", "", REVALIDATE.spaceWeather);
}
