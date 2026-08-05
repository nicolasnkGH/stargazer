const API_BACKEND = process.env.API_BACKEND || "http://localhost:8181";

async function backendFetch(path: string, search: string, revalidate: number | false) {
  const url = `${API_BACKEND}${path}${search}`;
  return fetch(url, {
    headers: {
      Origin: "http://localhost:3000",
      Accept: "application/json",
    },
    ...(revalidate === false ? { cache: "no-store" as const } : { next: { revalidate } }),
  });
}

/** Browser-facing route handler helper — always returns a Response. */
export async function proxyRequest(path: string, search: string, revalidate: number | false = false) {
  try {
    const res = await backendFetch(path, search, revalidate);
    const data = await res.json();
    return Response.json(data, { status: res.status });
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
