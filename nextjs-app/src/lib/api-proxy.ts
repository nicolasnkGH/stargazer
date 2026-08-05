const API_BACKEND = process.env.API_BACKEND || "http://localhost:8181";

export async function proxyRequest(path: string, search: string, method: string = "GET") {
  const url = `${API_BACKEND}${path}${search}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Origin": "http://localhost:3000",
        "Accept": "application/json",
      },
      cache: "no-store",
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch {
    return Response.json({ error: `Failed to fetch ${path}` }, { status: 502 });
  }
}
