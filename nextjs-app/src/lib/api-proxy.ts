const API_BACKEND = process.env.API_BACKEND || "http://localhost:8181";

interface BackendRequestInit {
  method?: string;
  body?: string;
}

async function backendFetch(path: string, search: string, revalidate: number | false, init?: BackendRequestInit) {
  const url = `${API_BACKEND}${path}${search}`;
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
