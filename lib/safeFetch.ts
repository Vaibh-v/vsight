// /lib/safeFetch.ts
export async function safeJson<T = any>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const r = await fetch(input, init);
  const text = await r.text();
  if (!r.ok) {
    throw new Error(`HTTP ${r.status}: ${text.slice(0, 400)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`HTTP ${r.status}: Expected JSON but got: ${text.slice(0, 400)}`);
  }
}
