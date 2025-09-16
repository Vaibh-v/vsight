// lib/safeFetch.ts
export async function safeFetchJSON<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const ctype = res.headers.get("content-type") || "";
  const isJSON = ctype.includes("application/json");

  if (!res.ok) {
    const text = await res.text();
    const message = isJSON ? (() => {
      try { return (JSON.parse(text)?.error?.message) || text; } catch { return text; }
    })() : text.slice(0, 400);
    throw new Error(`${res.status} ${res.statusText} — ${message}`);
  }

  if (!isJSON) {
    const text = await res.text();
    throw new Error(`Expected JSON but got HTML/text. First 200 chars: ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

export const toISO = (d?: string | Date) => {
  if (!d) return undefined;
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(+dt)) return undefined;
  return dt.toISOString().slice(0, 10); // YYYY-MM-DD
};
