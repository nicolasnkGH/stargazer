import { cookies } from "next/headers";

const API_BACKEND = process.env.API_BACKEND || "http://localhost:8181";

interface BackendRequestInit {
  method?: string;
  body?: string;
}

async function getLocaleLang(search: string): Promise<string> {
  if (search.includes("lang=")) {
    const match = search.match(/[?&]lang=([^&]+)/);
    if (match) return match[1];
  }
  try {
    const cookieStore = await cookies();
    const locale = cookieStore.get("NEXT_LOCALE")?.value;
    if (locale && ["pt", "es", "en"].includes(locale)) {
      return locale;
    }
  } catch {
    // context without headers/cookies
  }
  return "en";
}

async function backendFetch(path: string, search: string, revalidate: number | false, init?: BackendRequestInit) {
  const lang = await getLocaleLang(search);
  let finalSearch = search;
  if (!search.includes("lang=")) {
    const sep = search ? (search.includes("?") ? "&" : "?") : "?";
    finalSearch = `${search}${sep}lang=${lang}`;
  }
  const url = `${API_BACKEND}${path}${finalSearch}`;
  return fetch(url, {
    method: init?.method ?? "GET",
    headers: {
      Origin: "http://localhost:3000",
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body,
    ...(revalidate === false ? { cache: "no-store" as const } : { next: { revalidate } }),
  });
}

/** Browser-facing route handler helper — always returns a Response. */
export async function proxyRequest(
  path: string,
  search: string,
  revalidate: number | false = false,
  init?: BackendRequestInit
) {
  try {
    const res = await backendFetch(path, search, revalidate, init);
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch {
    return Response.json({ error: `Failed to fetch ${path}` }, { status: 502 });
  }
}

/** Browser-facing helper for binary (non-JSON) backend responses, e.g. gallery images. */
export async function proxyImage(path: string, search: string) {
  try {
    const res = await backendFetch(path, search, false);
    if (!res.ok) {
      return Response.json({ error: "Not found" }, { status: res.status });
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = await res.arrayBuffer();
    return new Response(buffer, { status: 200, headers: { "Content-Type": contentType } });
  } catch {
    return Response.json({ error: `Failed to fetch ${path}` }, { status: 502 });
  }
}

/** Server Component helper — calls the backend directly, no self-HTTP round trip. */
export async function fetchBackend<T>(path: string, search: string, revalidate: number | false): Promise<T | null> {
  try {
    const res = await backendFetch(path, search, revalidate);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
